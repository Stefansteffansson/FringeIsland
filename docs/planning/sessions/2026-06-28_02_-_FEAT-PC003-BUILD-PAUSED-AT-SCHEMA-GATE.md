# Session bridge — FEAT-PC003 built and **paused at the schema-review gate**; FEAT-H005 not yet started

**Date:** 2026-06-28 (build session; follows `2026-06-28_01` which authored both specs to `4-ready`)
**Session type:** Feature implementation (`feature-development`) — the platform half of Hub IDN-4, red-first
**Status:** **FEAT-PC003 contract is built, committed, and green except the one schema-gated red.** Stopped mid-session (machine reboot) **at the schema-review gate** — the `bio` CHECK migration is **authored but NOT applied**. **FEAT-H005 (the Hub half) has not been started.**
**Branch:** `feat/pc003-self-service-profile` (off `main`; pushed). **No PR opened yet. Nothing merged. Migration not applied.**
**Participants:** Stefan + Claude

> Picks up the `2026-06-28_01` bridge's "Decided next" block (build PC003 first, then H005, red-first, platform-first). The only human decision taken this session: **harden bio with a DB CHECK** *and* contract validation (Stefan chose the belt-and-suspenders option, citing likely future bio-page work).

---

## Where we are — resume HERE

We are **at the schema-review gate**, awaiting the human nod to apply the migration. The next session should re-confirm the gate with Stefan, then proceed.

**Commits on the branch (newest first):**
- `b125788` feat(platform): FEAT-PC003 self-service profile contract (lib + route + tests + unapplied migration)
- `ee7f0d5` chore(planning): open FEAT-PC003 — tasks + maturity 5-in-cycle

**Test state (real DB, run via `npx jest … --runInBand` from `hub/`):**
- Unit: **23/23 green** — `tests/unit/lib/profile/validation.test.ts`, `tests/unit/app/api/profile-me-route.test.ts`.
- Integration: **read 3/3 + update 5/5 green** — `tests/integration/profile/profile-read-path.test.ts`, `…/profile-update-path.test.ts`.
- Integration: **`…/profile-bio-constraint.test.ts` — 1 red, 1 green.** The over-long-bio test is **red by design** until the migration applies; the exactly-500 test is green. This is the only red.

## The gate — exact next steps (on Stefan's nod)

1. Apply the migration via the platform workflow (bash form):
   - `node scripts/apply-migration-temp.js 20260628120000_feat_pc003_bio_max_length.sql`
   - `bash supabase-cli.sh migration repair --status applied 20260628120000`
   - `bash supabase-cli.sh migration list` (verify applied)
2. Re-run `npx jest tests/integration/profile --runInBand` → the bio over-long test flips **green**.
3. Run the **full** integration suite (`npm run test:integration`, background — it hits the real DB) for no-regression (FEAT-PC001/PC002/H001..H004 unchanged — STORY-4 AC).
4. Flip `TASK-PC003-01` + `TASK-PC003-02` `review → done`; bump **FEAT-PC003 `5-in-cycle → 6-done`** in the spec frontmatter, `docs/platform/core/features/README.md`, and the `identity-specification.md` §L4 row — **same commit**. Update the spec's Implementation notes (red→green evidence; bound = `char_length` at DB vs JS `.length` at contract — note the minor non-BMP discrepancy).
5. Commit, push, **open PR, merge `--delete-branch`** (this is a schema/`platform/core/` carve-out → that merge is the gated step; Stefan's gate approval covers it), pull `main`.
6. Then build **FEAT-H005** (see plan below) on a fresh branch.

**The migration awaiting approval** — `supabase/migrations/20260628120000_feat_pc003_bio_max_length.sql`:
```sql
ALTER TABLE public.users
  ADD CONSTRAINT bio_max_length CHECK (bio IS NULL OR char_length(bio) <= 500) NOT VALID;
ALTER TABLE public.users
  VALIDATE CONSTRAINT bio_max_length;
```
Live data verified clean before authoring: **0 rows with bio over 500 (all bios null)** → `VALIDATE` will pass.

---

## Recon findings (live `pg_policies` / triggers / constraints on `public.users` — carry forward)

- **`users_update_own` UPDATE policy ALREADY EXISTS** — `qual` and `with_check` both `(auth_user_id = auth.uid())`. So Open Spec Q1 is answered: **the own-row UPDATE posture is already enforced; no new RLS policy / migration needed for it.** (This shrank the planned schema work.)
- **`users_select_active` SELECT policy is broad** — `(is_active = true)`, role `authenticated`. Members can read each other's active rows (needed for group display names). **Do NOT tighten it** (high blast radius, out of scope). Consequences: (a) own-row *read* for the profile contract is enforced by **route-scoping** — `fetchMyProfile` only ever resolves the caller's own row; (b) the `UPDATE…RETURNING` readback is safe (no dual-policy trip).
- **`sync_display_name_to_personal_group` trigger confirmed intact** — `AFTER UPDATE OF nickname, full_name, display_preference`, SECURITY DEFINER `sync_personal_group_display_name()`. This **is** the PC-3 cascade contract; confirmed by integration test, **not rebuilt**.
- **CHECK constraints:** `nickname_not_empty` (`char_length(nickname) >= 1`) and `users_display_preference_check` (`real_name | nickname`) exist. **No `bio` CHECK** — that gap is what the gated migration closes (gives bio parity).
- **Other BEFORE UPDATE triggers** on `users`: `set_users_updated_at`, `enforce_decommission_invariant`, `enforce_personal_group_id_immutability` (the sync trigger is AFTER UPDATE to avoid interfering with these).

## Key build decisions (this session)

- **Route path is `/api/profile/me`** (`GET` + `PATCH`), matching the shipped `/api/<resource>` convention (`/api/groups`, `/api/auth/*`). The spec's `/api/v1/profile/me` is **"directional"** — no `/api/v1/...` route exists anywhere in the new Hub yet. (If a v1 sweep happens later it moves all routes together.)
- **Identity-scope gating at the contract is the security boundary** (RLS authorises the row, not the column set). `validateProfilePatch` allow-lists `IDENTITY_SCOPE_FIELDS` and **rejects** any other key (e.g. `is_temporary`, `personal_group_id`) with `ProfileValidationError` → route 400. `avatar_url` is included as a writable text field (Storage upload still out of scope).
- **Bio hardened both layers** (Stefan's call): DB CHECK (gated migration) **+** contract validation. Bound `PROFILE_BIO_MAX_LENGTH = 500` is the single source of truth; the SQL literal mirrors it. `PROFILE_FULL_NAME_MIN_LENGTH = 2`.
- **No audit (V1) on profile edit** — self-service edit is not an admin action (PC003 cascade table = Administration: None). Only V4 telemetry (`profile.read` / `profile.updated` / `profile.update_rejected` / `profile.update_failed`, actor + outcome, failures included).
- **Runs as the authenticated caller** via the cookie-based `createClient()` (`@supabase/ssr`), same as `/api/groups` and `/api/auth/transcend` — RLS applies as the user. No `service_role`, no `SECURITY DEFINER`.

## Files created/changed (all committed)

- `hub/lib/profile/queries.ts` — constants, `validateProfilePatch`, `fetchMyProfile`, `updateMyProfile`, `ProfileValidationError`.
- `hub/app/api/profile/me/route.ts` — `GET` + `PATCH`.
- `hub/tests/unit/lib/profile/validation.test.ts`, `hub/tests/unit/app/api/profile-me-route.test.ts`.
- `hub/tests/integration/profile/{profile-read-path,profile-update-path,profile-bio-constraint}.test.ts`.
- `supabase/migrations/20260628120000_feat_pc003_bio_max_length.sql` — **authored, NOT applied**.
- `docs/planning/backlog/tasks/TASK-PC003-01-*.md` (`review`), `TASK-PC003-02-*.md` (`review`, schema gate).
- Maturity `4-ready → 5-in-cycle`: PC003 spec frontmatter, Platform Core `features/README.md`, `identity-specification.md` §L4 row.

---

## FEAT-H005 (the Hub half) — NOT STARTED; plan for after PC003 merges

No migration. FIM-only account menu in `hub/components/shell/AppShell.tsx` → **Profile** + **Sign out**. `/profile` reads via the **PC003 read contract** (`GET /api/profile/me`) and edits via **`PATCH /api/profile/me`** — no direct table reads (ADR-U009). Sign-out wires the existing `AuthContext.signOut()` → `/`. After a display-name edit, fire **`refreshNavigation` only** (the trigger renames the group; the Hub never writes the group name). Gate the menu/profile on **FIM identity status** (not a role string) — a Mist gets neither. Mark profile/menu components `'use client'` (Hub gotcha: `useAuth()` no-ops in a server component). **Oracle (copy-with-correction, ADR-U032):** `hub-legacy/components/profile/ProfileEditForm.tsx` + `hub-legacy/components/Navigation.tsx`. Playwright E2E for the journeys (view / edit + cascade / sign-out + gating). 5 stories.

**Read order for the H005 build session:** this bridge → FEAT-H005 (Problem → Stories) → `hub/components/shell/AppShell.tsx` + `hub/lib/auth/AuthContext.tsx` (signOut + identity status) → how a client component fetches the Hub API (the groups page) → the `hub-legacy` oracle pair → existing E2E specs under `hub/tests/e2e/`.

## Deferred (by design — do NOT build)

Avatar upload (Supabase Storage); consent history / granular sharing / re-consent (IDN-6/7); per-device sessions + remote sign-out (IDN-11); account state / self-service exit / reactivation (IDN-9/10/12); admin/cross-user profile editing (A-ADM); PC-1 telemetry sink (events bind to the in-memory seam, routed to G-29).

## Close-ritual note

`npm run dashboard` was **not** run (stopped mid-build for a reboot; nothing is `6-done` yet). Run it when PC003 closes. No `doc-health-check` needed yet (no cross-cutting change has landed — the migration is unapplied).
