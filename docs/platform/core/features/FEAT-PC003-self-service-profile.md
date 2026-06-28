# FEAT-PC003: Self-service profile — own-row read + identity-scope update contract — the platform half of IDN-4

---
id: FEAT-PC003
title: Self-service profile read + update — the authenticated user's own identity-scope profile contract
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The PC-2 Identity §L3 inventory names the capability *"Update the authenticated user's own identity-scope profile fields"* — but **no Surface-facing read/update contract realises it**. The substrate exists; the contract does not:

1. **The columns are present.** `public.users` carries the identity-scope profile fields — `full_name`, `nickname`, `display_preference` (`real_name | nickname`), `show_real_name`, `bio`, `avatar_url` (migration `20260227095615_add_display_name_system`; the rebuild `20260222000000` for `full_name`/`bio`/`avatar_url`). `public.users` **is** the profile table (identity-spec adjudication **C2-1** — no separate `profiles` table).
2. **No own-profile API contract exists.** Identity-spec §3 records it plainly: *"Today, no PC-2-owned API routes exist."* There is no API-first way for a Surface to read or update a member's own profile; the directional `PATCH /api/v1/profile/me` was named (§7) but not built. The own-row UPDATE RLS posture (`auth.uid() = auth_user_id`) and column-level identity-scope gating are **not enforced today** (identity-spec §L3 RLS-posture note).
3. **The display-name cascade already works — and must be confirmed as the contract.** The `sync_display_name_to_personal_group` trigger (`sync_personal_group_display_name()`, migration `20260227095615`) already cascades `nickname` / `full_name` / `display_preference` changes to the PC-3 personal-group name. It must be **named as the contract** so Surfaces never double-write the group name (identity-spec §8 Q9 disposition).

The Hub's **[FEAT-H005](../../../products/hub/features/FEAT-H005-member-profile-and-sign-out.md) (IDN-4 + IDN-3 sign-out tail)** needs this contract. This feature builds the **platform half**: the own-profile read/update contract, its RLS, and the confirmed cascade.

### Why Platform Core, not a Domain Service (sub-tier authoring bar)

The profile fields live on `public.users` — the **auth-and-user-row substrate every surface depends on** — and the actor is resolved through the PC-2 actor primitive (`auth.uid()` → `users.auth_user_id`). A Domain Service cannot own own-row mutation of `public.users` or the RLS over it without inverting the one-way dependency rule (Domain → Core, never reverse). This is an **additive realisation of the existing PC-2 §L3 profile-update capability** — not a new Core surface invented for convenience.

## Solution sketch

An additive, own-scope profile contract over the existing `public.users` columns. No new table; the change surface is an RLS policy (+ the API route), not new schema state.

1. **Own-profile read contract.** An authenticated FIM can read **their own** identity-scope fields (`full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`, `avatar_url`) via the Platform API (directional `GET /api/v1/profile/me`, `Authorization: Bearer <jwt>`), resolved to the caller's row through the PC-2 actor primitive. RLS permits **own-row only**.

2. **Own-profile update contract, identity-scope gated.** The same authenticated FIM can update **only** their identity-scope fields (directional `PATCH /api/v1/profile/me`). Enforcement is two-layered: an **own-row UPDATE RLS policy** (`auth.uid() = auth_user_id`) — verify it exists against current policies and **add it if absent** (new tables/policies → RLS, platform-tier rule) — **and** identity-scope **column gating at the route**, so identity-state and ownership columns (`is_temporary`, `email`, `auth_user_id`, `personal_group_id`, `is_active`, `is_decommissioned`) are **never** writable through the profile path. The caller acts on **their own row under RLS** — no `SECURITY DEFINER` elevation is required (contrast the admin RPCs, which must pass an explicit target actor under `service_role`).

3. **Display-name cascade confirmed as the contract.** Changes to `nickname` / `full_name` / `display_preference` are cascaded to the PC-3 personal-group name by the **existing** `sync_display_name_to_personal_group` trigger — **atomic** with the update. No Surface writes the group name; the trigger is the contract. (This realises the §8 Q9 disposition: the cross-entity sync is platform-owned and trigger-driven.)

4. **Avatar upload is out of scope.** `avatar_url` is a readable/updatable text field, but the **Storage** path (bucket + storage RLS + upload) is a separate, later feature — named as a forward seam, not built here.

## Appetite

The **own-profile contract** — the read + identity-scope-gated update over `public.users`, its own-row RLS (added if not already present), the route-level column gating, and the confirmation of the existing display-name sync trigger as the cross-entity cascade — behind the schema-review gate, green against the integration suite with the FIM and Mist-arrival paths unregressed. Fixed: own-row read, own-row identity-scope update, the cascade contract, and observability. **Out of appetite:** avatar upload (Storage), the broader consent / granular-sharing substrate (IDN-6/7 → PC-4), admin profile editing (A-ADM), domain-scope profile fields (identity-spec §8 Q2 — Profiles depth boundary, later).

## Rabbit holes

- **Identity-scope gating is the security boundary — do not rely on RLS column-set discipline alone.** The own-row UPDATE policy authorises *which row*; it does not by itself stop a caller from writing `is_temporary` or `personal_group_id` on their own row. Gate the **column set** at the route (allow-list the identity-scope fields), so the profile path can never mutate identity state or ownership. Test the rejected-column path explicitly.
- **The cascade trigger already exists — confirm, don't rebuild.** `sync_display_name_to_personal_group` (migration `20260227095615`) fires AFTER UPDATE on `users` for `nickname` / `full_name` / `display_preference`. Don't add a second cascade; verify the trigger still covers the contract and name it. A new write to `groups` from the contract would double-write.
- **INSERT…RETURNING / UPDATE…RETURNING dual-policy trip.** If the update returns the row (PostgREST default), the row must pass both the UPDATE policy and the SELECT policy — ensure the own-row SELECT policy lets the caller read their own row back (platform-tier gotcha), or the update "succeeds but can't read back."
- **Own-row, not `service_role`.** This contract runs as the **authenticated** caller (their JWT), so the actor primitive resolves normally; do **not** reach for `SECURITY DEFINER` / `service_role` (that path is for admin RPCs acting on a target actor and would bypass the very own-row RLS that is the point here).
- **Bio length is a contract validation, not yet a DB constraint.** The `hub-legacy` oracle bounded bio at 500 chars client-side; there is no DB CHECK for it. Decide the bound and enforce it at the contract (and/or add a CHECK) — don't assume the DB rejects an over-long bio.
- **Migrations run in timestamp order — never rewrite `20260227095615` or the rebuild.** If an own-row UPDATE policy or a bio CHECK is needed, add a **new** additive migration via the supabase-CLI workflow.
- **`SECURITY DEFINER` + `search_path = ''` only if a helper function is introduced.** If the read/update is realised via a helper SQL function rather than direct RLS-gated PostgREST, keep its body narrow and set `search_path = ''` (platform-tier discipline) — but prefer plain RLS-gated access for an own-row contract.

## No-gos

- **No avatar upload / Storage** — `avatar_url` is a text field in scope; the bucket + storage RLS + upload pipeline is a separate later feature.
- **No admin / cross-user profile editing** — own-row only; editing another member's profile is an A-ADM admin path (explicit target actor, `service_role`), not this contract.
- **No identity-state or ownership mutation via the profile path** — `is_temporary`, `email`, `auth_user_id`, `personal_group_id`, `is_active`, `is_decommissioned` are **never** writable here (auth-surface / lifecycle changes are ADR-gated, separate capabilities).
- **No consent / granular-sharing substrate (IDN-6/7)** — `show_real_name` and `display_preference` are the only visibility controls realised; the broader consent surface is PC-4-owned, later.
- **No domain-scope profile fields** — identity-spec §8 Q2 (Profiles depth boundary) stays open; this contract is **identity-scope** only.
- **No breaking change to existing contracts** — the auth surface (sign-in/sign-up/session-refresh, FEAT-PC001/PC002) is untouched; this is an **additive** new route under `/api/v1` + an additive RLS policy. No ADR-U015 version bump (new route, not a signature change).

## Stories

### STORY-1: Read my own profile (own-row)
As the platform, I want an authenticated user to read only their own identity-scope profile, so Surfaces can render a profile API-first without direct table access.

**Acceptance criteria:**
- Given an authenticated FIM, when they request their own profile, then the contract returns their **identity-scope fields** (`full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`, `avatar_url`) resolved to the caller's row via the actor primitive.
- Given any authenticated caller, when they attempt to read **another** user's profile through this contract, then it returns **nothing** (own-row RLS; no broad exposure).
- Given an unauthenticated / `service_role`-less anonymous caller, when they call the contract, then it does not resolve a profile (no own row to read).

### STORY-2: Update my own identity-scope fields, gated
As the platform, I want an authenticated user to update only their own identity-scope fields, so profile edits are self-service and cannot mutate identity state.

**Acceptance criteria:**
- Given an authenticated FIM, when they submit changes to `full_name` / `nickname` / `display_preference` / `show_real_name` / `bio`, then the contract updates **their own row** under the own-row UPDATE RLS policy (`auth.uid() = auth_user_id`).
- Given a caller attempts to update a **non-identity-scope** column (`is_temporary`, `email`, `auth_user_id`, `personal_group_id`, `is_active`, `is_decommissioned`) through this contract, then the write is **rejected/ignored** — the profile path cannot change identity state or ownership.
- Given a caller attempts to update **another** user's row, then it is **denied** (own-row RLS).
- Given invalid input (empty `full_name`, empty `nickname`, `display_preference` outside `{real_name, nickname}`, over-long `bio`), when submitted, then it is **rejected** by the existing DB constraints (`nickname_not_empty`, the `display_preference` CHECK) and the contract's length validation.

### STORY-3: Display-name change cascades to the personal-group name (existing trigger as contract)
As the platform, I want a display-name change to update the member's personal-group name automatically, so the member appears consistently without any Surface writing the group name.

**Acceptance criteria:**
- Given a profile update changes `nickname` / `full_name` / `display_preference`, when it commits, then the `sync_display_name_to_personal_group` trigger updates the member's **personal-group `name`** per `display_preference` (`nickname` → `nickname`, `real_name` → `full_name`) — **atomic** with the update.
- Given the cascade, when reviewed, then **no Surface and no application code** writes the personal-group name — the trigger is the sole writer (the cross-entity contract).

### STORY-4: Profile contract is observable; no regression
As the platform, I want profile reads/updates instrumented and existing identity contracts unchanged, so IDN-4 adds without breaking.

**Acceptance criteria:**
- Given a profile update, when it succeeds or fails, then a **structured event** (actor + outcome, **failures included**) is emitted (V4); RLS denials are recorded, not silently returned as empty (observability).
- Given the auth surface (FEAT-PC001 anon sign-in, FEAT-PC002 transcendence/reaper/consent), when this feature lands, then those contracts are **unchanged** — additive only, no ADR-U015 version bump.

## Cascade specification (ADR-U016) — display-name change (PC-2 → PC-3)

| Layer | Effect of a display-name / display-preference change |
|---|---|
| **PC-2 Identity** | The member's own `public.users` row updated (identity-scope fields only) under own-row RLS; identity state and ownership columns untouched. |
| **PC-3 Organisation** | The member's **personal-group `name`** updated by `sync_display_name_to_personal_group` (trigger-owned, atomic with the update); no membership or role change. |
| **Privacy (V2)** | `show_real_name` / `display_preference` govern what other members see (real name vs nickname); the change is own-scope and self-initiated. |
| **Observability (V4)** | Profile-updated event (actor + outcome, failures included); RLS denials recorded. |
| **Administration (V1) / Notifications (V3) / Transactions** | None — self-service edit; no admin action, no notification trigger, no entitlement. |

## Platform dependencies

- **PC-1 Infrastructure** — `Authorization: Bearer <jwt>` route convention; migration discipline (timestamp order, never rewrite applied); `SECURITY DEFINER` + `search_path = ''` discipline **only** if a helper function is introduced (the own-row path prefers plain RLS); telemetry path for the profile-updated event (V4 seam, PC-1 sink unrealised, routed to G-29).
- **PC-3 Organisation** — the personal-group `name` is PC-3-owned; the `sync_display_name_to_personal_group` trigger (already on disk, migration `20260227095615`) writes it. This is the **existing bilateral seam** — no new downward dependency is introduced (Core does not import Domain; the trigger lives in the shared substrate).
- Strict-chain note: PC-2 depends on PC-1; the PC-3 personal-group name is written by a pre-existing trigger in the shared substrate — no new Core→Domain or upward dependency.

## Cross-product impact

Consumed by **Hub [FEAT-H005](../../../products/hub/features/FEAT-H005-member-profile-and-sign-out.md)** (IDN-4 + IDN-3 sign-out tail) — the profile surface and account menu. The **Gimbal** (senses surface, native) will consume the **same** contract for its own profile/account UX; only the platform-side semantics are shared. Surfaces consume via the additive **`/api/v1/profile/me`** route (`Authorization: Bearer <jwt>`, ADR-U015) — no breaking change, no version bump. Avatar **capture** (camera) is the senses-surface affordance when avatar upload lands — named, not built.

## Stability posture (Platform Core §7)

- **What triggered the change:** PC-2 §L3 profile-update capability entering active development via FEAT-H005 (IDN-4). Additive — realises an existing inventoried capability, removes no contract.
- **Review escalation:** schema-review gate (human approval) — any new RLS policy (own-row UPDATE, and the SELECT-readback check) and any new CHECK/migration, plus the cascade spec, are reviewed before merge; schema tasks are `review`, not `done`. The route-level identity-scope gating is reviewed for completeness (no identity-state column writable).
- **Deprecation pathway:** none — purely additive (new route, additive RLS policy, no signature change). No Internal/Platform API contract removed, so no version bump / consumer migration.

## Vertical impact

- **Privacy/GDPR:** the **core** of this feature. Access is **own-row only** (RLS `auth.uid() = auth_user_id`); the profile path is **identity-scope gated** so it cannot mutate identity state or ownership; `show_real_name` / `display_preference` are the member's visibility controls over what others see. Consent state and data export/erasure are **distinct** capabilities (PC-4 / IDN-8/10) — not inferred here. Profile data is authoritative in Platform Core; other tiers ask, they don't infer.
- **Notifications:** **None** — a self-service own-profile edit is not a notification trigger; no other party is addressed.
- **Administration:** **None here** — own-scope self-service only; admin/cross-user profile operations are A-ADM admin RPCs (explicit target actor, `service_role`), a separate capability. No raw admin primitive exposed.
- **Observability:** profile read/update events (actor + outcome, **failures included**); **RLS denials recorded**, never silently returned as empty (platform-tier rule). Any new `SECURITY DEFINER` helper's privilege surface documented in the migration comment.
- **Transactions:** **None** — profile read/update involves no payment, subscription, or entitlement.
- **Extensibility:** `identity_scope_fields` is a **defined, growable** set (data/config, not a sealed enum); `display_preference` is the existing **open value set** (`real_name | nickname`) — extended as data, not a schema change (ADR-U018 spirit). Avatar **upload** (Storage) is a forward seam, left open. `is_temporary` remains a boolean identity-state flag, never writable via this contract.

## Open spec questions

1. **Own-row UPDATE RLS policy presence** — verify whether an own-row UPDATE policy on `public.users` already exists; if absent, add it (additive migration, schema-review-gated). Identity-spec §L3 records the posture as *not enforced today*.
2. **Bio length constraint** — choose the bound (oracle used 500 chars, client-side) and decide contract-validation vs DB CHECK. Build detail; named so the omission is explicit.
3. **Identity-scope vs domain-scope boundary** (identity-spec §8 Q2) — stays open; this contract is identity-scope only. The route-level column gating is the directional realisation of the gating §7 named.
