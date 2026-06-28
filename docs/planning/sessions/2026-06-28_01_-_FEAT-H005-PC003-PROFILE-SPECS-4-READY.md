# Session bridge — FEAT-H005 (member profile + sign-out) + paired FEAT-PC003 authored to `4-ready`

**Date:** 2026-06-28 (decomposition / L4 spec-authoring session; follows `2026-06-27_03` which closed FEAT-H004 `6-done` and handed off FEAT-H005)
**Session type:** L4 feature specification (`ecosystem-decomposition`) — the Hub IDN-4 slice + its platform half
**Status:** **FEAT-H005 (hub) and FEAT-PC003 (platform/core/identity) authored fresh to `4-ready`.** L4 reconciliation done (both `features/README` indexes + both §L4 summaries). **PR [#9](https://github.com/Stefansteffansson/FringeIsland/pull/9) open on branch `idn-4-h005-pc003-specs` — held for the merge nod (touches `docs/platform/core/`, a fuller-auto carve-out).** No code, no migration in this PR.
**Participants:** Stefan + Claude

> Picks up the FEAT-H004 bridge's "Decided next" block. That block pre-decided the entry (L4, fresh from §L3 — not from `hub-legacy` code), pre-flagged the load-bearing call (does a profile-write route/RPC exist? → paired PC-2 spec if not), and recommended deferring avatar upload. This session ran the recon, confirmed those calls, and wrote both specs.

---

## What was done

- **Recon of the profile-write substrate** (sandboxed; migrations + seeds + `hub/` + `hub-legacy/`).
- **Wrote `FEAT-H005`** (`docs/products/hub/features/FEAT-H005-member-profile-and-sign-out.md`) — IDN-4 (render/edit profile) + the IDN-3 sign-out tail, `4-ready`, `requires-equipment: none`, no migration.
- **Wrote the paired `FEAT-PC003`** (`docs/platform/core/features/FEAT-PC003-self-service-profile.md`) — the own-profile read + identity-scope-gated update contract, `4-ready`.
- **L4 reconciliation (same commit):** Hub + Platform-Core `features/README.md` indexes; Hub `SPECIFICATION.md` §L4 (row + Coverage-note tail); `identity-specification.md` §L4 (row + intro note + the two "without specs" lines).

## Recon findings (the substrate — carry forward)

- **`public.users` already carries every profile text field.** `full_name` (NOT NULL), `nickname` (NOT NULL, CHECK `char_length >= 1`), `display_preference` (`'real_name' | 'nickname'`, CHECK), `show_real_name` (bool), `bio`, `avatar_url` — added by migration **`20260227095615_add_display_name_system`** (over the rebuild `20260222000000`). `public.users` **is** the profile table (identity-spec adjudication **C2-1** — no separate `profiles` table). So FEAT-H005 needs **no migration**.
- **The display-name → personal-group-name coupling is automatic, DB-side.** Trigger **`sync_display_name_to_personal_group`** (SECURITY DEFINER `sync_personal_group_display_name()`, same migration) fires AFTER UPDATE on `users` for `nickname` / `full_name` / `display_preference` and rewrites the personal group `name` per preference. **The Hub writes no group name** — the trigger is the contract (resolves identity-spec §8 Q9). PC-3 coupling = no Hub work.
- **No profile route/RPC exists.** No `update_my_profile`-style function on disk; identity-spec §3 confirms *"today, no PC-2-owned API routes exist."* → **the paired platform spec was required** (same shape as H004↔PC002).
- **Sign-out:** `AuthContext.signOut()` exists (`hub/lib/auth/AuthContext.tsx` ~line 229) but is **wired to no UI** — IDN-3's confirmed gap. New shell home: `hub/components/shell/AppShell.tsx`.
- **PC-2 §L3 already inventories the capability** ("Update the authenticated user's own identity-scope profile fields"; `identity_scope_fields` = `full_name, nickname, display_preference, show_real_name, bio, avatar_url`; own-row UPDATE RLS posture *not enforced today*; directional `PATCH /api/v1/profile/me`) — so FEAT-PC003 is a **clean L4 derivation**, no new L3 work.
- **Oracle (copy-with-correction, ADR-U032):** `hub-legacy/components/profile/ProfileEditForm.tsx` (the form + validation) and `hub-legacy/components/Navigation.tsx` (user menu / sign-out).

## Key decomposition decisions

- **Paired spec written, not just H005.** H005 cannot honestly be `4-ready` with an unspecified platform write path — so FEAT-PC003 was authored alongside it (products-tier "paired specs" rule + the "platform specified before product" checklist). Both reference each other in Platform-dependencies / Cross-product-impact.
- **Avatar upload deferred** to a forward seam (needs a Supabase **Storage** bucket + storage RLS + upload — a materially bigger lift). `avatar_url` is **read-only** this slice; the text fields ship now.
- **Read + write are both API-first.** Profile read and write go through the Platform API / FEAT-PC003 contract (ADR-U009; Hub narrow-exception rule) — only sign-out uses the auth SDK.
- **PC003 runs as the authenticated caller (own-row RLS), not `SECURITY DEFINER`/`service_role`** — contrast the admin RPCs. Identity-scope **column gating at the route** is the security boundary (RLS authorises the row, not the column set).

## Open seams / deferred (by design)

- Avatar upload (Storage); consent history / granular sharing / re-consent (IDN-6/7); per-device sessions + remote sign-out (IDN-11, PC-2 reciprocation routed to G-29); account state / self-service exit / reactivation (IDN-9/10/12); admin/cross-user profile editing (A-ADM).
- **PC-1 telemetry sink** — profile-updated / session-ended V4 events bind to the in-memory seam (routed to G-29, as H001..H004).
- **Build-detail questions** (in FEAT-PC003 §"Open spec questions"): (1) does an own-row UPDATE RLS policy on `public.users` already exist? verify `pg_policies`, add if absent; (2) pick the `bio` length bound (oracle used 500 client-side; no DB CHECK exists); (3) identity-scope vs domain-scope boundary (identity-spec §8 Q2) stays open — this contract is identity-scope only.

---

## Decided next (build session) — build FEAT-PC003 then FEAT-H005

Merge PR #9 first (if not already on `main`). Build red-first (full pyramid), **platform half first** (platform specified-and-built before the product that consumes it), per `feature-development`.

**Order & gate.** Build **FEAT-PC003 first** — it is the **only schema touch**: an own-row UPDATE RLS policy on `public.users` (`auth.uid() = auth_user_id`) + route-level identity-scope column gating, possibly a `bio` CHECK. **Recon first:** does an own-row UPDATE policy already exist (`pg_policies`)? Choose the `bio` bound. Schema work → **schema-review gate** (status `review`, human approval — a fuller-auto carve-out).

**FEAT-PC003 (platform/core/identity).** Own-profile **read** + **identity-scope-gated update** over `public.users` (`full_name`, `nickname`, `display_preference`, `show_real_name`, `bio`, `avatar_url`) via `/api/v1/profile/me` (`Authorization: Bearer <jwt>`). Runs as the **authenticated caller** under own-row RLS — *not* `SECURITY DEFINER`/`service_role`. The existing `sync_display_name_to_personal_group` trigger **is** the PC-3 cascade contract — confirm, don't rebuild. Watch the UPDATE…RETURNING dual-policy trip (own-row SELECT must let the row read back). Integration tests against real Postgres + RLS.

**FEAT-H005 (hub).** No migration. FIM-only account menu in `hub/components/shell/AppShell.tsx` → **Profile** + **Sign out**; `/profile` reads via the Platform API (no direct table reads, ADR-U009) and edits via the PC003 contract; sign-out wires the existing `AuthContext.signOut()` → `/`. After a display-name edit, fire `refreshNavigation` only — the trigger renames the group. **Oracle (copy-with-correction, ADR-U032):** `hub-legacy/components/profile/ProfileEditForm.tsx` + `hub-legacy/components/Navigation.tsx`. Mark profile/menu components `'use client'` (Hub gotcha). Playwright E2E for the journeys.

**Read order for the build session:** this bridge → FEAT-H005 (Problem → Stories) → FEAT-PC003 (Solution sketch → Stories → §"Open spec questions") → migration `20260227095615_add_display_name_system` (the columns + the sync trigger) → `hub/lib/auth/AuthContext.tsx` (`signOut`) + `hub/components/shell/AppShell.tsx` → the `hub-legacy` oracle pair. Then build red-first per `feature-development`.

**Close ritual:** `npm run dashboard`; a session bridge; a `doc-health-check` if it's a cycle boundary or after cross-cutting changes.
