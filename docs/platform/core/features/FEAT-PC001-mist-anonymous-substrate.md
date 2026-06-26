# FEAT-PC001: Mist anonymous-identity substrate (arrival) — is_temporary + handle_new_user Mist branch + Visitor→Mist rename

---
id: FEAT-PC001
title: Mist anonymous-identity substrate (arrival) — the platform half of IDN-1
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

PC-2's §L3 inventory commits the **Mist lifecycle** capability (identity-specification.md §9, ADR-U031), but **no substrate realises it**: `public.users` has no `is_temporary` flag, `handle_new_user` assumes a credentialed insert (and would **null-crash on an anonymous insert** — an anon auth user has no `email` and no `display_name`, so today's `COALESCE(raw_user_meta_data->>'display_name', NEW.email)` resolves to `NULL`), no anonymous session is ever materialised, and the only Mist-adjacent shell on disk is the **vestigial pre-canon "Visitor" system group / "Guest" role** (`supabase/seeds/04_system_groups.sql`). The Hub's **FEAT-H003 (IDN-1)** needs the platform to *provide* this arrival substrate so the surface can *consume* it — products consume the Platform substrate, they never define it (ADR-U009). This feature builds the **arrival slice** of the §9 lifecycle (stages **1 Entry** + **2 Access**); §9 stage-3 ephemerality (TTL erasure) and stage-4 transcendence are deferred to **FEAT-PC002** (the platform half of IDN-2).

### Why Platform Core, not a Domain Service (sub-tier authoring bar)

Anonymous identity, the `public.users` profile materialisation, and the `handle_new_user` trigger are **foundational PC-2 Identity / PC-3 Organisation primitives** — the auth-and-user-row substrate every surface and service depends on. This cannot be modelled in a Domain Service without inverting the one-way dependency rule (Domain → Core, never reverse): a Domain Service cannot own the `auth.users`-triggered profile materialisation. It is an **additive extension of an existing PC-2 capability** (the §9 Mist lifecycle) amending the existing PC-2/PC-3 seam-trigger — not a new Core surface invented for convenience.

## Solution sketch

Three additive substrate changes, aligned to §9 stages 1-2 and Q2 = status-driven access (locked with the Hub):

1. **`users.is_temporary boolean not null default false`** — the Mist identity-state flag. Existing FIM rows backfill to `false`.
2. **Amend `handle_new_user`** (live def in `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql`), additively, preserving the FIM path:
   - set `is_temporary => COALESCE(NEW.is_anonymous, false)` on the Step-1 profile insert (single-sourced from the Supabase-set `auth.users.is_anonymous`, never from app code);
   - **name fallback** `COALESCE(display_name, email, 'Mist')` in Steps 1 & 2 (fixes the null-crash for the nameless Mist);
   - **branch Step 4**: for an anonymous insert, **skip** the "FringeIsland Members" enrolment (a Mist is not a Member) — the proto personal group + self-membership + zero-perm "Myself" role still materialise via the existing seam.
3. **Seed rename** `'Visitor'` system group → `'Mist'`, `'Guest'` role → `'Mist'` (ADR-U031 canonical rename; housekeeping — no Mist *enrols* in it, access is status-driven).

The Mist's near-side access is by **status** (`is_temporary`), not by a permission set — honouring §9 stage 2 ("intrinsic limits, not a fence") and ADR-U025. The proto personal group exists because `get_current_personal_group_id()` is the repo's actor primitive — without it the Mist cannot act.

## Appetite

The **arrival substrate only** — one migration + one seed edit, behind the schema-review gate. Fixed: the `is_temporary` state, the trigger Mist-branch (flag + name fallback + skip-Members), and the Visitor→Mist rename, all green against the integration suite with the FIM path unregressed. **Out of appetite:** the TTL/erasure reaper, pg_cron, consent substrate, and transcendence — all **FEAT-PC002**.

## Rabbit holes

- **The null-crash is real (verified).** An anon insert with no `email`/`display_name` crashes today's trigger. The `'Mist'` fallback is load-bearing, not cosmetic — test the nameless-Mist path explicitly.
- **`handle_new_user` is a shared PC-2/PC-3 seam — amend, don't factor.** The trigger does PC-2 (user row) + PC-3 (personal group, memberships, Myself role) work in one transaction; the ADR-U016 factoring is a **separately-queued PC-3 pickup** (identity-spec §L3 carry-forward), not this feature. Add the anon branch additively; do not refactor the seam here.
- **Don't add TTL-marker columns.** No `is_temporary_created_at` / retention-clock columns here — the retention clock + sweep are FEAT-PC002 (§8 Q10). Adding them now is scope-creep into the deferred ephemerality work.
- **Migrations run in timestamp order — new migration, never rewrite `20260222000000`.** Add a corrective migration via the supabase-CLI workflow.
- **RLS on `is_temporary`.** No new table → no new policy, but the Mist must read its **own** profile under the existing own-row policy (an anon user has an `auth.uid()`). Assert the Mist's own-row read works; confirm the column is not over-exposed.

## No-gos

- **No TTL / inactivity erasure / explicit-erase / pg_cron** — §9 stage 3, **FEAT-PC002**. (pg_cron is not installed.)
- **No transcendence / consent capture / atomic Mist→FIM migration** — §9 stage 4 + §8 Q8/X4, **FEAT-PC002**.
- **No `handle_new_user` factoring per ADR-U016** — the queued PC-3 pickup, kept separate; this feature only adds the anon branch.
- **No Mist system-group enrolment** (Q2 = status-driven access) — the Visitor→Mist rename is housekeeping; the Mist gets the proto personal group only.
- **No new table** (so no new RLS table); **no Internal API signature change** (the contract is SDK-shape anon sign-in per ADR-U004 — no `/api/v1/...` change, so no ADR-U015 version bump and no contract ADR beyond the U004/U031 clarifications already landed).
- **No Mist-erasure cascade** — only the Mist-**creation** cascade is in scope (below); the erasure cascade is FEAT-PC002.

## Stories

### STORY-1: `is_temporary` identity state on profile materialisation
As the platform, I want an anonymous auth insert to produce a profile flagged `is_temporary`, so the Mist is a recognisable identity state distinct from a FIM.

**Acceptance criteria:**
- Given an **anonymous** auth insert (`is_anonymous = true`), when `handle_new_user` runs, then a `public.users` profile is created with **`is_temporary = true`** and a **non-null `personal_group_id`** (proto personal group).
- Given a **credentialed** auth insert, when `handle_new_user` runs, then `is_temporary = false` and the **FIM path is byte-for-byte unchanged** (profile, personal group, "Myself" role, FringeIsland Members enrolment, display defaults — FEAT-H002 contract green).
- Given existing FIM rows at migration time, when the column is added, then they **backfill to `false`**.

### STORY-2: Nameless Mist materialises without error (name fallback)
As the platform, I want a Mist with no display name or email to materialise cleanly, so anonymous entry never fails.

**Acceptance criteria:**
- Given an anonymous insert with **no `display_name` and no `email`**, when `handle_new_user` runs, then the profile + proto personal group materialise with a **`'Mist'` display default** — no null-constraint crash, no error.

### STORY-3: Proto personal group, no Members enrolment (status-driven access)
As the platform, I want a Mist to get its actor (proto personal group) but not the FIM baseline membership, so near-side access is by status, not a permission set.

**Acceptance criteria:**
- Given an anonymous insert, when the trigger runs, then **exactly one proto personal group** is created (the Mist its sole member, zero-permission "Myself" role) and the Mist is **not enrolled in "FringeIsland Members"**.
- Given the Mist's session, when it reads its **own** `public.users` row, then the existing own-row RLS policy permits it (the anon `auth.uid()` resolves through the actor chain); no broader exposure.

### STORY-4: Visitor→Mist canonical rename
As the platform, I want the vestigial pre-canon "Visitor"/"Guest" identifiers renamed to "Mist", so the substrate matches canon (ADR-U031).

**Acceptance criteria:**
- Given `supabase/seeds/04_system_groups.sql`, when applied, then the system group **'Visitor' → 'Mist'** and the role **'Guest' → 'Mist'**, with no dangling references elsewhere in seeds/migrations.

### STORY-5: Mist-creation cascade is specified and observable (ADR-U016 / V4)
As the platform, I want Mist creation specified as a cascade and emitted as an event, so the lifecycle is complete and traceable.

**Acceptance criteria:**
- Given the Mist-creation cascade specification (below), when reviewed, then it documents the effect at every layer (PC-2 profile, PC-3 proto group, each vertical) — DoR for platform lifecycle work (ADR-U016).
- Given a Mist is created, when materialisation completes, then a **Mist-session-creation observability event** (actor + outcome) is emitted/enabled at the platform path (V4), failures included.

## Cascade specification (ADR-U016) — Mist creation (Entry stage)

| Layer | Effect on Mist creation |
|---|---|
| **PC-2 Identity** | `public.users` row with `is_temporary = true`, no PII (email/name null → `'Mist'` default), `auth_user_id` FK to the anon `auth.users` row. |
| **PC-3 Organisation** | Proto personal group (sole member, "Myself" zero-perm role) via the shared seam; **no** FringeIsland Members enrolment. |
| **Privacy (V2)** | Data minimisation: no PII captured; **no trait-profile computed** (no pre-consent inference). Unlinkable-presence + TTL erasure are **FEAT-PC002**. |
| **Observability (V4)** | Mist-session-creation event (actor + outcome). |
| **Administration (V1)** | Mist creation is a lifecycle event; the **erasure** cascade is deferred to FEAT-PC002. |
| **Notifications / Transactions** | None — a Mist holds no durable address and no entitlements. |

*The Mist-**erasure/transcendence** cascade is out of scope (FEAT-PC002) — named here so the omission is explicit, not silent.*

## Platform dependencies

- **PC-1 Infrastructure** — the anonymous connection-role substrate (ADR-U004); SECURITY DEFINER + `search_path = ''` discipline for `handle_new_user` (the amendment preserves both); migration discipline (timestamp order, never rewrite applied).
- **PC-3 Organisation** — proto personal-group materialisation, which happens **inside** the shared `handle_new_user` seam (accepted per identity-spec §6; the factoring is a separate ADR-U016 pickup).
- Strict-chain note: PC-2 depends on PC-1; the PC-3 work is in the shared seam, documented bilaterally — no downward dependency introduced.

## Cross-product impact

Consumed by **Hub FEAT-H003** (IDN-1) — the entry UI + lazy materialisation + status gating. The **Gimbal** (senses surface, native) will consume the **same** substrate for its own Mist entry; only the platform-side arrival semantics are shared. Surfaces consume via the **SDK anon sign-in** (ADR-U004) — there is no Internal/Platform API signature change, so no consumer migration and no ADR-U015 version bump.

## Stability posture (Platform Core §7)

- **What triggered the change:** the §9 Mist lifecycle capability entering active development via FEAT-H003 (ADR-U031). Additive — extends an existing capability, removes no contract.
- **Review escalation:** schema-review gate (human approval) per the platform tier rule — the migration, its RLS impact, and the cascade spec are reviewed before merge; the schema task is `review`, not `done`.
- **Deprecation pathway:** none required — purely additive (`is_temporary` column + anon trigger branch + seed rename). No Internal API signature changes, so no version bump / consumer migration.

## Vertical impact

- **Privacy/GDPR:** the data-minimisation case — the anon profile carries **no PII** (no email/name) and **no pre-consent trait-profile**. `is_temporary` flags ephemerality-eligibility; the actual TTL erasure + unlinkable-presence *guarantee* are **FEAT-PC002**. RLS: `is_temporary` rides the existing own-row policy on `public.users` (no new policy); the Mist reads only its own row.
- **Notifications:** **None** — a Mist holds no durable address.
- **Administration:** Mist creation is a lifecycle event with the cascade spec above (ADR-U016); the erasure/cleanup cascade is FEAT-PC002. No DeusEx surface here.
- **Observability:** Mist-session-creation event (actor + outcome), failures included; the trigger path is traceable.
- **Transactions:** **None** — a Mist holds no entitlements.
- **Extensibility:** `is_temporary` is a boolean identity-state flag, **not a sealed enum** — later identity states extend without a breaking change. The "Mist" system group replaces "Visitor" via seed, not code (ADR-U018 — no sealed sets).

## Open spec questions

1. **TTL/inactivity threshold + sweep mechanism** (identity-spec §8 Q10) — value, config home, pg_cron-vs-alternative, explicit-erase + mid-migration guard → **FEAT-PC002** (paired with FEAT-H004; Stefan's steer: build the reaper robustly, to industry standard).
2. **Consent substrate** (§8 Q8 / X4) — captured at transcendence → **FEAT-PC002** / Privacy-vertical adjudication.
3. **`handle_new_user` factoring per ADR-U016** — the PC-2-emission / PC-3-cascade split is a queued PC-3 pickup, independent of this feature.
