# FEAT-PC021: Member administration contracts — the platform learns to administer its members

---
id: FEAT-PC021
title: Member administration contracts — platform-scope member enumeration + detail, the audited-and-typed re-issue of the sanction family, the admin platform exit re-derived, targeted group removal, and platform-administrator grant/revoke
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

ADM-C's platform half (ADM-2/3/4/5/6/12/18). The contract-walk at decomposition (2026-08-01, cumulative-forward over the 99 live migrations + seeds) found the substrate weaker than the area board assumed — five findings, each verified at file:line:

1. **No admin member read exists in any form** — zero hits for `admin_get_users`/list/search/detail across live *and* archive migrations. PC020's group reads are the only precedent. ADM-2 is greenfield.
2. **The two sanction contracts write no audit rows.** `admin_update_user_status` (`20260730210000:45`) and `admin_decommission_user` (`:111`) — including their COR-C W1 re-issues — never touch `admin_audit_log`. Only hard-delete, force-logout, and self-delete are audited. B-ADMIN-008's "audit-logged" expectation and the area's V1 obligation are unmet; a real gap, not a doc error.
3. **The legacy write family refuses untyped.** Every admin write raises bare `RAISE EXCEPTION` (P0001 prose) — unauthorized is indistinguishable by SQLSTATE from not-found, so the admin plane's `42501`→404 existence-hiding shape (H034/H035) cannot be applied to the member mutations without contract work. Only the PC020 reads are typed.
4. **No admin platform exit exists.** `admin_exit_user_from_platform` was DROPped at C-F (`20260721161500:611`); its three-scenario membership walk survives only inside the **self-only** `delete_own_account()` (`20260721170000:18`), which takes no target parameter. ADM-6 must re-derive the walk, not delegate.
5. **ADM-12 has no contract substrate at all** — DeusEx membership is written directly against the tables under two RLS policies (`20260222000000:1587,1598`); the only UI ever built is the legacy page. Under ADR-U038 ("a rule enforced only in a route is not enforced") and the Hub's no-table-writes law, grant/revoke need real contracts.

The governance spec §L4 names two slices ADM-C's: the **member-operations orchestration slice** and the **admin-action audit-write slices** — this feature is both.

### Why Platform Core (PC-4)

Same ruling as PC020: no new tables; the contracts are admin-plane orchestration composing PC-2's identity/sanction substrate and PC-3's membership fabric, platform-admin-gated and audit-writing; the `admin_*` naming binds them to the mechanical PC-4 manifest pin.

## Solution sketch

Two migrations, two schema gates, serial (the ADM-B shape): the read family first, the operations family second. All functions SECURITY DEFINER, `SET search_path = ''`, `is_platform_admin()`-gated with typed `42501`, `REVOKE` anon.

### Gate 1 — the member read family

- **`admin_get_users(p_filter text DEFAULT 'default')`** — the ADM-2 list. Filters (open TEXT namespace, unknown → `22023`, PC020 discipline): `default` (active + inactive, **hides decommissioned** — B-ADMIN-002's rule), `active`, `inactive`, `decommissioned`, `platform_admins`, `all`. **Temporary users (Mists) never appear under any filter** — Mist lifecycle is the reaper's (ADR-U033), not this console's; a future `mists` filter can join the open namespace if a row ever asks. Row payload (walked below): `id`, `display_name` (the personal group's name — the B-DISP display identity), `email` (admin-tier; nullable since the Mist substrate made it so, but Mists are excluded so rows carry it), `account_state`, `is_platform_admin`, `created_at`. `account_state` is derived **server-side** — the one home for the `20260721161500:571-574` derivation: `decommissioned` | `paused` (off, origin `member`) | `suspended` (off, any other origin) | `active`; an open vocabulary, never a CHECK. **Amended at first contact (2026-08-01, migration `20260801180000`):** the list returns a **jsonb array**, not SETOF — PostgREST db-max-rows silently truncated the set-returning shape at 1000 rows against the dev DB's 1,918 non-Mist users (red 3/12 demonstrated post-gate-1; the "no pagination — PC020 precedent" premise was sized for groups, not members). Row-cap honesty is now structural; keyset paging joins when a measurement asks about **payload** size (~300 KB at today's scale).
- **`admin_get_user_detail(p_user_id uuid) → jsonb`** — the row keys plus `deactivation_origin` (ceremony copy names what it lifts — a self-pause vs an admin hold) and `memberships[]`: the target's **active engagement-group memberships** — `{group_id, group_name, status, removal_scenario}` — the ADM-18 removal picker's source. `removal_scenario` (`regular_leave` | `steward_handover` | `group_closure`) is computed server-side by the same classifier the operations use, so the ceremony names the platform's own prediction (advisory at read time; the contract re-classifies at execution). Refusals: `42501`, `P0002` not-found (also for temporary users — existence-hidden).

### Gate 2 — the operations family

**Re-issues (same signatures; deltas named):**
- **`admin_update_user_status`** + **`admin_decommission_user`** — gain the missing `admin_audit_log` writes (actions `member.suspend` / `member.reactivate` / `member.decommission` — the dotted namespace extended per the PC020 ruling) and typed refusals (`42501` unauthorized, `P0002` not-found; state refusals stay P0001 with their existing messages). `FOR UPDATE` serialisation and the `deactivation_origin` CASE logic (`20260730210000:86-90`) unchanged.
- **`admin_hard_delete_user`** — typed `42501`/`P0002`; audit action renamed to `member.hard_delete` (existing rows keep their old string — append-only); the audit-before-delete ordering (`20260720120000:469`) and the full cascade unchanged.
- **`admin_force_logout`** — typed `42501`; audit action `member.force_logout`; mechanism unchanged (the `auth.refresh_tokens` + `auth.sessions` DELETE pair — the same pair `delete_own_account` uses at `20260721170000:272-273`, so it is current). **Honesty note carried to the surface:** revocation acts at the refresh/session layer; an already-issued access JWT lives until its own expiry — B-ADMIN-019's "invalidates session" is true at the refresh layer, not instantaneously at the JWT layer.
- **Sibling-assertion discipline (the three-times-bitten rule):** the re-issue migration header must list every suite assertion naming these four functions — the COR-C W1/GC-10 producer suites and any test asserting the old audit action strings or untyped refusal shapes — each marked adapted or deliberately left.

**New contracts:**
- **`admin_exit_user_from_platform(p_target_user_id uuid) → jsonb`** — the ADM-6 full exit (the board's CB-3 ruling), re-derived against `delete_own_account`'s walk (`20260721170000:87-246`): the same per-group classification over the target's active engagement memberships — `regular_leave` (DS-3 departure + row deletes) / `steward_handover` (DeusEx steps in as caretaker; `stewardship_transferred` to remaining members + `stewardship_required` to DeusEx — the **existing** notification kinds, composed) / `group_closure` (`status='closed'`, DS-3/DS-5 closure legs, `group_closed` to DeusEx) — then terminal decommission (`is_active=false, is_decommissioned=true, deactivation_origin='admin'`), session revocation (the same two-table pair), audit `member.platform_exit` with the per-group scenario detail. **Deliberately NOT composed:** the F-2 private-erasure legs and the profile scrub (steps 9–11 of the self walk) — the sweep ends participation; erasure remains the member's own right (`delete_own_account`) or hard-delete's cascade. Guards: admin gate `42501`; target not found / temporary → `P0002`; already terminally closed → P0001. An admin hold does **not** block (the self walk's hold guard exists to stop the *member* — here the admin is the actor).
- **`admin_remove_member_from_group(p_group_id uuid, p_target_user_id uuid) → jsonb`** — ADM-18: the same classifier applied to exactly one membership, routing through the MEM-5/7/8 semantics (walls composed, never reimplemented — if composition refuses where the story needs an override, that is a finding to surface). Refusals: `42501`; `P0002` group/member not found or not an active member; P0001 state.
- **`admin_grant_platform_admin(p_target_user_id uuid)`** / **`admin_revoke_platform_admin(p_target_user_id uuid)`** — the ADM-12 contracts over what was RLS-only substrate. Grant: upsert an **active** DeusEx membership **and** the DeusEx role row explicitly — the `auto_assign_deusex_role` trigger fires only on the invited→active UPDATE flip (`20260222000000:1363`), so a direct active INSERT must not rely on it (verify at build); the grant fires `notify_role_assigned` (the new admin's durable notification, free); audit `platform_admin.grant`. Revoke: delete role + membership rows — the two last-admin floor triggers (`prevent_last_deusex_role_removal`, `prevent_last_deusex_membership_removal`) refuse on the final admin and their messages surface **verbatim**; audit `platform_admin.revoke`. Targets are existing active members — no email-invite flow (the legacy invite ceremony is not carried).

**Riders:** every mutation writes `admin_audit_log` pattern (a) with `FOR UPDATE` on the target row; all ten functions born classified PC-4 via the `admin_*` pin; no new tables — no export-classification change. The pre-existing trigger-bypass asymmetry (the membership floor trigger never gained the `app.hard_delete_in_progress` bypass the role trigger got at `20260224205639:78`) is recorded, out of scope — it binds hard-deleting the last DeusEx member, which no story here performs.

## Appetite

The largest platform half of the area — ten functions across two serial gates. The risk concentrates in the exit-walk re-derivation (transactional, three scenarios, Domain lifecycle legs composed) and in the re-issue blast radius (the sibling-assertion grep is mandatory, not optional). Generous but bounded; the reads are cheap.

## Rabbit holes

- **Don't reimplement the MEM walls or the walk's notification writes.** The classifier, the DeusEx caretaker step-in, and the existing notification kinds are the law delete_own_account already follows; compose them. Refusal-where-the-story-needs-more is a finding, never a bypass.
- **Don't extend the exit into erasure.** The F-2 legs belong to self-delete and hard-delete. An admin exit that scrubs profiles is a different (unasked) capability.
- **Don't seal the open vocabularies.** `account_state`, `deactivation_origin`, and `p_filter` are open namespaces — `deactivation_origin` has no CHECK **by design** (`20260721161500:44-49`); no contract or consumer may bake a sealed enum.
- **Don't build search ranking.** DS-6 stays unconsumed (recorded); platform member counts are small; filtering beyond `p_filter` is the surface's client-side concern until a measurement asks.

## No-gos

No new tables. No bulk operations (ADM-7, deferred). No Mist administration (the reaper's, ADR-U033). No email-invite admin flow. No moderation contracts (ADM-D). No audit read surface (ADM-16, ADM-D). No pagination scaffolding. No new notification kinds (the CB-1 ruling — dated deferral below).

## Stories

### STORY-1: Enumeration with honest filters
- Given active, paused, suspended, decommissioned, platform-admin, and temporary (Mist) users, when a platform admin calls `admin_get_users` with each filter, then each returns exactly the walked-payload rows its name promises, `default` hides decommissioned rows, Mists never appear under any filter, and `account_state` reads the derived vocabulary.
- Given a non-admin or anon caller, then `42501` / EXECUTE refused respectively — for every contract in this feature.
- Given an unknown filter, then `22023`.

### STORY-2: Detail with the removal picker's source
- Given a member holding active engagement memberships as regular member, sole steward, and sole member (three groups), when the admin reads detail, then `memberships[]` carries each group with its platform-computed `removal_scenario`, and the identity/state keys match the list row plus `deactivation_origin`.
- Given an unknown or temporary target, then `P0002`.

### STORY-3: The sanction family, audited and typed
- Given an active member, when suspended (deactivate), then `is_active=false`, `deactivation_origin='admin'`, an audit row `member.suspend` exists; when reactivated, origin clears to NULL and `member.reactivate` is written; re-running the same transition refuses P0001 and writes nothing.
- Given a decommissioned member, when reactivation is attempted, then the existing refusal holds; when decommissioned, `member.decommission` is written and memberships are **preserved** (B-ADMIN-008's invariant — history intact).
- Given an unknown target, then `P0002`; given a non-admin, `42501` — for all three re-issued mutations.

### STORY-4: Force-logout and hard-delete re-issues
- Given a member with live sessions, when force-logged-out, then the refresh/session rows are gone and audit carries `member.force_logout`; inactive targets are still valid targets (B-ADMIN-019).
- Given hard-delete, then the audit row `member.hard_delete` is written **before** deletion, the sentinel reassignment cascade holds unchanged (forum + journeys to `[Deleted User]`, the inline attribution updates), and the target's `users` + `auth.users` rows are gone.

### STORY-5: The admin platform exit (the ADM-6 walk)
- Given a target who is a regular member of one group, sole steward of a second, and sole member of a third, when the admin exits them from the platform, then: the first membership ends with the DS-3 departure leg; the second hands to the DeusEx caretaker with `stewardship_transferred` notifications to remaining members and `stewardship_required` to DeusEx; the third closes with the closure legs; the account reads decommissioned with `deactivation_origin='admin'`; sessions are revoked; **the profile is NOT scrubbed and no F-2 erasure leg runs**; one audit row `member.platform_exit` carries the per-group scenarios; the return payload names them.
- Given a Mist or unknown target, `P0002`; an already-terminal target, P0001; a member under an admin hold is a **valid** target.
- Given any mid-walk refusal, then no partial state (transactional).

### STORY-6: Targeted removal (ADM-18)
- Given each of the three scenarios on a single named group, when the admin removes the member from that group, then the outcome matches the classifier (leave / caretaker handover / closure) with the same composed legs, and audit carries `member.remove_from_group` with the group and scenario.
- Given a member not active in the named group, `P0002`.

### STORY-7: Platform-administrator grant and revoke (ADM-12)
- Given an active non-admin member, when granted, then the DeusEx membership + role rows exist, `is_platform_admin` flips true in the reads, the new admin receives the `role_assigned` notification, and audit carries `platform_admin.grant`.
- Given a platform admin who is not the last, when revoked, then both rows are gone, the reads flip, and audit carries `platform_admin.revoke`; given the **last** admin, then the floor trigger's refusal surfaces verbatim and nothing is written.

### STORY-8: Producer-driven audit proof
- Given every mutation in this feature exercised through the real contracts, then each has its named `admin_audit_log` row and append-only holds against the post-change catalog.

## Decomposition verification walk — payload ↔ consumer (FEAT-H036)

| Key | FEAT-H036 consumer |
|---|---|
| list `id` | row identity → detail link; every mutation route's path param |
| list/detail `display_name` | list rows, detail header, every ceremony's "acting on {name}" copy |
| list/detail `email` | list rows + detail (admin identification — the B-ADMIN-003 lookup basis, realized client-side over the fetched set) |
| list/detail `account_state` | state badge (list + detail) + the state-honest action rail derivation |
| list/detail `is_platform_admin` | admin chip; Grant vs Revoke affordance |
| list/detail `created_at` | "joined" column + detail |
| detail `deactivation_origin` | Reactivate ceremony copy naming what it lifts (self-pause vs admin hold) |
| detail `memberships[{group_id, group_name, status, removal_scenario}]` | memberships panel (name + status badge) + the ADM-18 Remove picker; `removal_scenario` drives the consequence copy; the platform-exit ceremony aggregates the same array ("exits N groups, M close, K hand to FringeIsland") |
| exit/removal return payloads (`scenario` detail) | success rendering naming what actually happened |

Every key has a consumer; every rendered field traces to a key. Dropped at the walk (no consumer): `personal_group_id` (mutations key on user id), raw `is_active`/`is_decommissioned` booleans (fully carried by `account_state` + `deactivation_origin`), per-membership steward flags and counts (folded into `removal_scenario`), last-sign-in (no story renders it).

## Platform dependencies

PC-2 (the `users` sanction/identity substrate incl. nullable-email since the Mist migration; `auth.refresh_tokens`/`auth.sessions`), PC-3 (memberships/roles fabric, DeusEx system-group identity, the floor triggers, `has_permission`), PC-4 own (`is_platform_admin`, `admin_audit_log` pattern (a)), and the same DS-3/DS-5 lifecycle routines `delete_own_account` composes (`ds3_lifecycle_member_departed`, `ds3/ds5_lifecycle_group_closed`, the COR-A inversion pattern) for the walk legs.

## Cross-product impact

Hub consumes via FEAT-H036 (BFF-wrapped). Gimbal inherits the contracts. Member-facing surfaces untouched — a suspended member sees IDN-9's existing render with zero surface change.

## Vertical impact

- **Privacy/GDPR:** admin-tier reads expose member identity (display name, email) and account state to platform admins only (`42501`-walled; V1's realization per the governance L3 row "admin-tier FIM data access requires platform-admin"); no new stores (nothing to classify); the exit deliberately does **not** erase — erasure remains member-initiated or hard-delete's cascade, keeping the ADR-U034 posture intact.
- **Notifications:** **no new kinds — the CB-1 board ruling, recorded as a dated V3 deferral (2026-08-01):** affected-member sanction communication is deferred to the ADM-D DS-5 kind family (or Eid), activation named there. *(Resolved at the ADM-D board, DB-4, 2026-08-01: ADM-D ships only the `report_resolved` resolution kind — [FEAT-PC022](./FEAT-PC022-moderation-and-audit-read-contracts.md); sanction-communication kinds are deferred to Eid.)* The slice composes only **existing** kinds: `notify_role_assigned` on grant; `stewardship_transferred`/`stewardship_required`/`group_closed` inside the walks — exactly as the self walk fires them.
- **Administration:** this *is* ADM-3/4/5/6/12/18's contract layer and closes the audit gap (finding 2); reversible where the state machine is (suspend↔reactivate); terminal acts escalate (decommission → exit → hard-delete).
- **Observability:** typed refusals across the whole family (finding 3 resolved); every mutation audited; surface telemetry rides FEAT-H036.
- **Transactions:** none.
- **Extensibility:** open filter namespace; `account_state`/`deactivation_origin` open vocabularies; audit actions namespaced (`member.*`, `platform_admin.*`), never enumerated in a consumer.

## Performance budget

N/A (no surface). Reads are admin-only over platform-scale member counts (small pre-launch); FEAT-H036 carries the page budgets.

## Implementation notes (built 2026-08-01, Cycle ADM-C)

- **Closed 6-done 2026-08-01:** all three migrations applied on named approvals (PR #368 → `20260801170000` and PR #369 → `20260801180000` — gate 1 + the jsonb-array row-cap amendment, documented in §Solution; PR #372 → `20260801190000` — gate 2), history repaired. Post-apply: gate-1 suite **12/12**, gate-2 suite **28/28** (red 26/28 pre-apply — the two greens are the labelled-green invariants S3g/S8c), admin integration domain **72/72**, account domain **83/83** with the two adapted siblings flipped green, platform conformance **23/23** — all ten functions declared PC-4, gate 2's manifest entries riding the gate PR (the gate-1 lesson applied). Consumed by FEAT-H036 the same day.
- **Gate 2 (the operations family), `20260801190000`:** four re-issues + four new contracts in one migration. The re-issue gate moved `has_permission(manage_all_groups)` → `is_platform_admin()` typed `42501` family-wide (every sibling caller elevates via DeusEx, so nothing broke); `get_current_personal_group_id()` is retained for the pattern-(a) audit actor. The STORY-3 **no-op guard compares the flag AND the would-be origin**, so the COR-C W1 pause→hold *conversion* (origin `member`→`admin` on an already-off row) still proceeds — the guard refuses only a write that would change nothing.
- **Audit vocabulary landed:** `member.suspend` / `member.reactivate` / `member.decommission` / `member.force_logout` / `member.hard_delete` / `member.platform_exit` / `member.remove_from_group` · `platform_admin.grant` / `platform_admin.revoke`. Existing rows keep their legacy snake_case strings — the log is append-only.
- **Sibling-assertion sweep — the fourth catch:** the C-F suite's S8a pinned `admin_exit_user_from_platform`'s NON-existence (the retirement) and would have gone red at apply unseen; adapted in the gate PR together with W1f's `/manage_all_groups|Unauthorized/i` refusal pin. Every other naming site verified and deliberately left — the full list lives in the migration header.
- **Exit boundaries proven producer-driven:** the target's journal entry and display identity survive the exit (no F-2 legs, no scrub, no sentinel reassignment); sessions die via the same two-table pair; an admin-held target is a valid target; already-terminal refuses P0001 writing nothing.
- **Grant path verified at build (the AC criterion):** `auto_assign_deusex_role` fires only on the invited→active UPDATE flip (`20260222000000:1363`) — the contract inserts the role row **explicitly**; that INSERT fires `notify_role_assigned` (the durable notification, composed free); revoke's role DELETE fires `notify_role_removed` (existing kind, also free).
- **Last-admin floor technique (recorded):** the shared dev DB's founding admins cannot be thinned for real, so the STORY-7 floor cell arranges the last-admin state inside a **rolled-back forged-claims transaction** driving the real contract — the trigger's message surfaces verbatim and the rollback restores the founders, which also demonstrates the family's no-partial-state property end-to-end.
- **Consent-FK note:** hard-delete of a consented FIM stays 23503-blocked (erase_fim_account's anonymise-then-delegate path is unchanged and composes the re-issued function transparently); the suite's fixture purges its consent rows via the trigger's sanctioned controlled-teardown setting.
