# Email Change Gap Analysis — "change a member's email address"

**Date:** 2026-09-11
**Scope:** Whether a member's email address can be changed today by anyone (admin or the member), what stands in the way, and the plan to add an admin-side capability.
**Status:** Investigation complete. The plan below is **proposed, not ruled** — §7 carries the decision board.

---

## 1. The finding — no, it cannot be changed. By anyone.

Verified on disk and against the test project (`spxitjjiawxatwmyjmsp`, ADR-U053).

| Path | Exists? | Evidence |
|---|---|---|
| Admin changes a member's email | **No** | The nine admin user routes under `hub/app/api/admin/users/[id]/` are `decommission`, `force-logout`, `grant-admin`, `hard-delete`, `platform-exit`, `reactivate`, `remove-from-group`, `revoke-admin`, `suspend`. No email route. |
| Admin UI offers it | **No** | `hub/components/admin/AdminMemberDetail.tsx:294` renders the email **read-only** in the member header. No control, no dialog. |
| Member changes their own email | **No** | `hub/app/profile/page.tsx` contains no occurrence of the string `email`, and the contract behind it refuses the field **by name**: `update_own_profile(p_patch jsonb)` gates writable keys to six identity-scope fields and raises `22023` on anything else (`supabase/migrations/20260702130000_feat_pc003_own_profile_contract.sql:81-88`). |
| A platform contract does it | **No** | No `admin_*` RPC in `supabase/migrations/` writes `users.email`. |
| The Auth Admin API does it | **No** | The only `auth.updateUser` call in the whole Hub is `hub/lib/auth/AuthContext.tsx:206`, and it is the Mist transcendence conversion (anonymous to permanent) — it *sets* an email on an account that had none. There is no `auth.admin.*` usage and no service-role key anywhere in the Hub. |

**The email a member signs up with is, today, permanent for the life of the account.** The only way out is hard delete and re-signup, which destroys their groups, journeys and authored content.

### It is a deliberate exclusion, not an oversight

Two places say so in writing.

`docs/platform/core/features/FEAT-PC003-self-service-profile.md:57` — the self-service profile contract lists `email` among the columns that are *never* writable through the profile path, and adds that "auth-surface / lifecycle changes are **ADR-gated, separate capabilities**."

`supabase/migrations/20260702120000_api_boundary_users_column_privileges.sql` (ADR-U038 tranche 1, S1/S2) hardened this at the grant level. Client roles hold `UPDATE` on exactly six columns — `full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`, `avatar_url` — and `SELECT` on every column *except* `email`. The column comment is explicit:

> 'FIM email. Client roles have NO column privilege on this column (ADR-U038 S2): own email reaches the client via the auth session; cross-user email requires a SECURITY DEFINER contract. Do not GRANT SELECT(email) to authenticated/anon.'

So the capability was carved out and parked. Building it is picking up a deferred decision, not patching a bug.

---

## 2. What an email change actually has to touch

This is the part that makes it more than a form field. Five stores hold the address or key off it.

### 2a. `auth.users.email` — the login identity

The real one. `UNIQUE` via `users_email_partial_key` (`WHERE is_sso_user = false`), and that index is **case-sensitive**; only the non-unique `users_instance_id_email_idx` is on `lower(email)`. GoTrue normalises to lowercase in application code, so a contract that writes the column directly must lowercase first or it can seat two accounts that differ only by case.

Also on the row: `email_confirmed_at`, and the change-flow columns `email_change`, `email_change_token_new`, `email_change_token_current`, `email_change_sent_at`, `email_change_confirm_status`.

### 2b. `auth.identities.identity_data` — the provider record

The `provider = 'email'` identity row carries the address inside `identity_data` jsonb. Its `email` column is **generated** — `GENERATED ALWAYS AS (lower(identity_data ->> 'email')) STORED` — so updating `identity_data` updates it for free. Leaving `identity_data` stale is the classic half-done email change: the user signs in, but the identity record disagrees with the user record.

### 2c. `public.users.email` — the mirror, and it has no sync

Populated once by `handle_new_user()`, the `AFTER INSERT` seam-trigger on `auth.users`. There are only two triggers on `auth.users` in the whole migration history, `AFTER INSERT` and `AFTER DELETE` (`supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql:1317,1321`). **There is no `AFTER UPDATE` sync.** Change the auth side alone and the mirror silently goes stale — and the mirror is what every admin read returns (`admin_get_user_detail` selects `u.email`, `20260801170000_adm_c_pc021_member_read_family.sql`). The admin list would keep showing the old address indefinitely.

`public.users.email` is also `UNIQUE` (`users_email_key`) and **nullable** — a Mist has none. (The column was `NOT NULL` in the original 2026-02 table definition; the Mist substrate work relaxed it. Nullability confirmed against the live schema, not the migration text.)

**A stale mirror would corrupt erasure, not just display.** `erase_fim_account` reads `lower(email)` from `public.users` and uses it to `DELETE FROM public.pending_email_invitations WHERE lower(invited_email) = v_target_email` — the Art. 17 step that removes unclaimed offers carrying the person's address. If the mirror still held the pre-change address, erasure would scrub invitations to an address the member no longer uses and **leave invitations to their current address in place as orphaned PII**. This raises the mirror sync from a display concern to a correctness one, and it is the strongest single argument for writing all three stores in one transaction.

### 2d. `pending_email_invitations.invited_email`

Invitations are addressed to a literal string and claimed at signup by `LOWER(invited_email) = LOWER(NEW.email)` (`20260223140126_enhanced_member_invitations.sql:167`). An outstanding invitation to the member's *old* address is orphaned by the change. Whether to re-point it is a scope call, not an accident to discover later.

### 2e. Sessions

The member's live sessions survive an email change by default. Whether they should is §7 D4.

---

## 3. The architecture this has to fit

Three constraints already decided, which together determine most of the shape.

**The Hub's application code holds no service-role key.** Every privileged admin mutation is the admin's *own* session calling a `SECURITY DEFINER` RPC that gates on `public.is_platform_admin()` (defined in `20260223171200_fix_rc7_admin_user_ops.sql`; eleven guards in the member-operations family alone). Verified: across `hub/`, `SUPABASE_SERVICE_ROLE_KEY` appears **only** under `hub/tests/` and `hub/scripts/` — test fixtures, teardown and the perf harness. Every file under `hub/app/` and `hub/lib/` reads exactly two variables, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `hub/lib/profile/queries.ts:6` states the posture in words.

So `supabase.auth.admin.updateUserById()` is **not** available to this codebase without introducing a service-role key to the Surface, which ADR-U038 exists to prevent.

**Writing the auth schema from a definer function is already in-family.** This is the decisive precedent. `admin_hard_delete_user` does `delete from auth.users` (`20260801190000_adm_c_pc021_member_operations_family.sql:379`), and force-logout deletes from `auth.sessions` and `auth.refresh_tokens` (lines 426-427). Six more migrations do the same. An `admin_update_user_email` RPC that writes `auth.users` and `auth.identities` is the same move, one notch more careful.

**The contract shape is fixed by its nine siblings.** From `admin_update_user_status` (`20260801190000...:142-211`), every member-administration contract does: `is_platform_admin()` guard raising `42501` → `SELECT ... FOR UPDATE` on the target → `P0002` if absent → invariant checks raising `P0001` → the mutation → an `admin_audit_log` INSERT → `jsonb_build_object('success', true)`. The route maps `42501`/`P0002` to 404, `P0001` to 409, `22023` to 400 (`hub/app/api/admin/users/[id]/hard-delete/route.ts:16-21`). Since DB-4 these contracts also take `p_reason text` and write an in-app notice.

**Notice titles are Core literals, never registry reads.** `20260903130000_db4_pc030_notice_titles_are_core_literals.sql` re-issued the whole family for exactly this: a Core contract must not `SELECT label FROM notification_kinds`. The title is a literal in the function; the registry row is the cross-check. An email-change notice must follow suit.

---

## 4. Where a notice would land

`notification_kinds` already has an `account` category holding four kinds — `participation_paused` and `participation_activated` from the base registry (`20260723120000_n_a_notification_registry_and_contracts.sql:78`), plus `account_suspended` and `account_reinstated` added by DB-4 (`20260903120000_db4_pc030_pd021_sanction_communication.sql:155-156`). Verified against the live registry. An `account_email_changed` kind joins them with no new machinery.

Seeding it is **mandatory, not optional**: `notifications.type` carries a foreign key to the registry (`notifications_type_fkey REFERENCES notification_kinds(kind)`, verified live), so a bespoke unregistered kind is structurally impossible. Use the family's `on conflict (kind) do nothing` seed pattern. The dispatcher writes to `public.notifications` keyed on the member's `personal_group_id`; a Mist has none and yields no row.

Note the ceiling: these are **in-app** notices. The platform has no outbound mail of its own — `supabase/` carries no `config.toml`, so auth mail is dashboard-configured, and the org is on the Supabase Free tier, whose built-in mailer is rate-limited to a handful of messages per hour. **A design that depends on emailing the old address to warn it, or the new address to confirm it, is gated on a Supabase Pro decision and custom SMTP.** That is the same gate the leaked-password toggle sits behind.

---

## 5. The privacy angle worth raising

`docs/verticals/privacy/SPECIFICATION.md:36-37` enumerates the member's rights as *access* (Art. 15, export) and *erasure* (Art. 17, delete). **Art. 16, the right to rectification, is not in the list.** Correcting a wrong email address is the textbook rectification case, and the platform currently cannot honour it at all.

This is a genuine gap in the Privacy vertical's obligation inventory, independent of whether the admin feature gets built. The Administration vertical's specification is equally silent on an administrator acting on a member's behalf. Both should be raised at the Eid kickoff whatever is decided here.

**An adjacent gap, still open.** `docs/planning/waves/FERD-CAPABILITY-MAP.md` rows 15 and 16, flagged CRITICAL at line 188, record that decommission and platform exit set the flags but scrub neither `public.users.email` nor the `auth.users` record. That map is an April 2026 snapshot and several of its neighbouring rows have since shipped, so treat it as a register rather than current truth — but these two rows are **still accurate**: no function in the live schema nulls `public.users.email`, and only full erasure removes the auth row. The address therefore outlives the account in both non-erasure paths. Rectification and scrubbing are two faces of the same unowned column, and are worth dispositioning together.

---

## 6. The proposed plan

Two feature specs plus one ADR, following Model A. Sequenced so nothing is written before the decision it depends on.

### Step 0 — the ADR (blocking) — **DONE, [ADR-U054](../../architecture/decisions/ADR-U054-admin-email-rectification.md)**

`FEAT-PC003:57` already ruled that auth-surface changes are ADR-gated. So an ADR comes first, not a spec. It settles one question: **may a platform administrator change the login identity of an account they do not own, and under what ceremony?** The answer decides everything downstream. Draft it; Stefan rules it.

This is a fuller-auto carve-out (ADRs pause for the nod) and it is also the honest security question — the capability lets an administrator point an account at an address they control. Audit trail and member notice are the counterweights, and the ADR is where that trade is written down.

### Step 1 — `FEAT-PC031 — member email rectification contract` (Platform Core, Identity)

The contract `admin_update_user_email(target_user_id uuid, p_new_email text, p_reason text)`, `SECURITY DEFINER`, `SET search_path = ''`, in a new migration under `supabase/migrations/`. Stories, in the family's idiom:

1. **Guard.** Non-admin caller raises `42501`. Target absent raises `P0002`.
2. **Normalise and validate.** Lowercase and trim; reject a malformed address with `22023`; reject an address equal to the current one with `P0001` (the no-op guard the family already has).
3. **Collision.** Reject with `P0001` when the address is taken, checked against **both** `auth.users` (case-insensitively, since its unique index is not) and `public.users`.
4. **Refuse a Mist.** An anonymous account has no email identity to rectify; `P0001`.
5. **Write all three stores in one transaction.** `auth.users.email` (+ `email_confirmed_at`, and clear the five `email_change*` columns so no half-open GoTrue change flow survives), `auth.identities.identity_data` for the `provider = 'email'` row, and the `public.users.email` mirror. Target read `FOR UPDATE`.
6. **Audit.** `admin_audit_log` action `member.email_change`, metadata carrying old address, new address and the reason. The old address must survive in the trail — it is the only record that the account was ever reachable there.
7. **Notify.** Seed `account_email_changed` in the `account` category; insert the notice with a **literal** title.
8. **Grants.** `revoke all ... from public, anon`, matching line 687 of the DB-4 migration. Register the function in `supabase/ownership.manifest.json` or two conformance suites go red.

Schema change, so it lands at task status `review` behind the schema-review gate, not `done`.

### Step 2 — `FEAT-H0xx — admin member email rectification` (Hub)

- `hub/app/api/admin/users/[id]/email/route.ts`, POST, mirroring the hard-delete route's shape: authenticate, `emitDurableTelemetry`, call the lib, map refusals.
- `updateAdminUserEmail(client, userId, email, reason)` in `hub/lib/admin/users.ts`, alongside its nine siblings.
- A control in `AdminMemberDetail.tsx` beside the address already rendered at line 294. Confirmation dialog naming both addresses and requiring a reason, following the existing ceremony.

### Step 3 — decide the two riders

What to do with `pending_email_invitations` addressed to the old address (§2d, §7 D5 — now recommended as a delete, because erasure cannot reach them afterwards) and whether to force-logout on change (§7 D4). Both are a few lines in the RPC if ruled in; both are scope creep if ruled in silently.

### Step 4 — tests, red first

Per the standing TDD rule: integration tests against the contract for each refusal code and the three-store write, a unit test for the lib, and an E2E walk of the admin dialog. The E2E fixture needs a single-token display name, and the small-population race on the test project applies — assert exact fixture counts before any page-scoped action.

---

## 7. The decision board — RULED 2026-09-11

> **Stefan ruled the board on 2026-09-11.** D1 is **yes**, explicitly; D2 through D7 were delegated to the recommendations below, which therefore all stand as ruled. The decision is recorded in [ADR-U054](../../architecture/decisions/ADR-U054-admin-email-rectification.md). Section 6's Step 0 is discharged; the two feature specs are now unblocked. The recommendation column is preserved unedited as the record of what was put to him.


| # | Decision | Options | Recommendation |
|---|---|---|---|
| **D1** | Does an admin get this power at all? | (a) Yes, admin-set, no member confirmation. (b) Admin proposes, member confirms by mail. (c) No — build self-service instead. (d) No — not now. | **(a)**, with hard audit and an in-app notice. (b) needs outbound mail the platform does not have and cannot drive from an admin session. It is the only option that fits the no-service-role architecture. |
| **D2** | Is the new address marked confirmed? | (a) Yes, `email_confirmed_at = now()` — admin vouches. (b) No — member must confirm before sign-in works. | **(a)**. (b) locks the member out with no way back, since the confirmation mail cannot be reliably sent on Free tier. |
| **D3** | Self-service email change too? | (a) Admin only now. (b) Both. (c) Self-service only. | **(a)**. Self-service is the larger and better feature, but it needs the confirmation mail, so it is Pro-gated. Ship the admin path, register self-service as an Eid candidate. |
| **D4** | Force-logout on change? | (a) Yes — treat it as a credential change. (b) No — leave sessions alone. | **(a)**. `admin_force_logout` already exists and the change is a security event; if the address was changed because the old one was compromised, live sessions are the thing you want cut. |
| **D5** | Outstanding invitations to the old address? | (a) Re-point them to the new address. (b) Leave them orphaned. (c) Delete them. | **Revised to (c)** — see below. Originally (b); §2c's erasure finding rules that out. |
| **D6** | Does it go into Eid? | (a) Bet on it in the first Eid build cycle. (b) A kickoff candidate, ruled with the rest. (c) Later wave. | **(b)**. The Eid wave file is still a stub and the kickoff has not run. This belongs on the candidate list, not in front of it. |
| **D7** | Raise Art. 16 rectification as a Privacy gap? | (a) Yes, at the kickoff. (b) No. | **(a)**. §5. It is true whatever D1 is. |

**Why D5 moved from "leave them" to "delete them."** The first pass reasoned that an invitation is addressed to a person at an address, so silently redirecting it would surprise the sender. That still holds against option (a). But leaving them orphaned is worse than it looked: `erase_fim_account` finds invitations by matching the member's *current* mirrored address, so after an email change an invitation to the old address becomes unreachable by the erasure path and survives an Art. 17 request as permanent PII residue. Deleting them at change time is the only option that leaves no orphan and tells no lie. It costs the inviter a re-send, which is visible and recoverable, rather than leaving an invisible record that erasure cannot reach.

---

## 8. What this document did not settle

_Updated 2026-09-11 after the ruling._

- ~~No ADR is drafted. D1 has to be ruled first.~~ **Settled** — the board is ruled and [ADR-U054](../../architecture/decisions/ADR-U054-admin-email-rectification.md) records it.
- No spec is written, and nothing is at 4-ready. The two specs in §6 Steps 1 and 2 are unblocked but unwritten.
- No code, no migration, no test.
- The Supabase mailer configuration was not inspected — there is no `config.toml` in the repo, so auth mail settings live in the dashboard and were not read. This matters for the deferred self-service path (D3) and for the outbound-notice limitation ADR-U054 names, not for the admin path itself.
- The Privacy vertical amendment naming Art. 16 (D7) is not written. ADR-U054 records it as a separate item on purpose.

---

## 9. Sources

Code and schema as of 2026-09-11 on `main` at `3b446541`. Schema facts verified by read-only introspection of the test project `spxitjjiawxatwmyjmsp` (`auth.users` columns, `auth.identities.email` generation expression, unique indexes on both `auth.users` and `public.users`, `public.users.email` nullability, the `notification_kinds` rows in the `account` and `platform` categories, `notifications_type_fkey`, and the bodies of `erase_fim_account` and `admin_exit_user_from_platform`). Production was not touched.

A second reviewer pass confirmed the central finding independently and contributed §2c's erasure consequence, the registry foreign key, the `update_own_profile` refusal citation and the capability-map cross-reference. Two of its claims were corrected against the live schema and are recorded here in their corrected form: `public.users.email` is nullable today despite its original `NOT NULL` definition, and the `account` notification category holds four kinds rather than two.
