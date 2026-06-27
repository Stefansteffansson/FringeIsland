# Session bridge — FEAT-H004 (Hub half of IDN-2): Mist→FIM transcendence + the farewell, `6-done`

**Date:** 2026-06-27 (build session; follows `2026-06-27_02` which closed FEAT-PC002)
**Session type:** build (Hub product, TDD red-first) — the Hub half of IDN-2
**Status:** **FEAT-H004 built, fully green, and flipped `4-ready → 5-in-cycle → 6-done`.** All 3 tasks `done`. No migration (consumes the merged FEAT-PC002 substrate). Branch `idn-2-h004` — fuller-auto commit/PR/merge carried (routine: no schema, no core, no ADR, no deps).
**Participants:** Stefan + Claude

> Picks up `2026-06-27_02`. Since that bridge, PC002 (PRs #4–#6) merged to `main`, so the transcendence/reaper/consent + explicit-erase + FIM-account-erasure RPCs are live. This session built the Hub surface that consumes them.

---

## What was built (TDD red → green, demonstrated red first)

Three tasks, reusing the FEAT-H001/H002/H003 spine — no re-scaffold, **no migration**.

| Task | Stories | What |
|---|---|---|
| **H004-01** | S1, S2, S5 | In-place transcendence + consent gate. `lib/auth/transcendence.ts` (`finaliseTranscendence` → `finalise_transcendence` RPC) behind `POST /api/auth/transcend` (server consent gate + audit/telemetry + welcome-trigger seam); `AuthContext.transcend` (client `updateUser` anon→permanent **then** the route — convert-then-finalise); new `/become-a-fim` page (reuses FEAT-H002 fields + required consent, Mist-gated); `/mist` CTA `/signup`→`/become-a-fim`. |
| **H004-02** | S3, S4 | The farewell. New `ConfirmModal` design-system primitive (copy-with-correction from the `hub-legacy` oracle; named export + `data-testid` + `busy`); `lib/auth/farewell.ts` (`explicitEraseMist` → `explicit_erase_mist` RPC) behind `POST /api/auth/farewell`; `AuthContext.sayGoodbye` (route → `signOut` → sessionless); Mist-only "say goodbye" affordance on `/mist`. |
| **H004-03** | S1 (continuity), S4 | `tests/e2e/transcendence.spec.ts` (transcendence + consent-gate + farewell journeys); stale `entry.spec.ts` CTA assertion `/signup`→`/become-a-fim`; consent-aware E2E cleanup helper. |

**Test evidence:** 27 new Jest unit + 4 new integration + 3 new Playwright E2E, all red-first. **Full suite green: 54 unit + 31 integration + 15 E2E**; `npm run lint -w hub` + `npm run build -w hub` clean.

## Key design decisions

- **Conversion client-side (auth SDK), finalisation server-side (route → RPC).** The anon→permanent `updateUser` is the narrow auth exception (browser, as H001/H002/H003); the `finalise_transcendence` RPC is a data call, so it goes through `POST /api/auth/transcend` — never a browser `supabase.rpc()` (Hub CLAUDE.md narrow-exception rule / ADR-U009). Same split for the farewell.
- **Convert THEN finalise (spec order).** `AuthContext.transcend` gates consent → `updateUser` (preserves `auth.users.id`) → posts the route. On finalisation failure the error is surfaced and the flow does **not** navigate (`router.push('/groups')` only on success); the platform RPC is atomic, so the caller stays a domain-Mist (`is_temporary` still true) — proven at integration. Identity flips Mist→FIM via `onAuthStateChange` (`is_anonymous` flips), never queried in the listener.
- **Continuity is platform-side.** The Hub copies no rows — integration asserts the same `personal_group_id` after transcendence; E2E asserts the journey lands on `/groups` (empty-state, not a "new user" reset).
- **`ConfirmModal` built fresh.** The new `hub/` tree had no confirmation primitive; built it (the farewell is destructive — `ConfirmModal`, never `confirm()`).

## What is still open / not built (forward seams, by design)

- **Founding-questions assessment + the metamorphosis-completion gate (ball / Beyond unlock)** — out of scope (fundamentals before experience design); the completion gate wires to the assessment when built.
- **FIM self-service account-erasure** — the `erase_fim_account` RPC exists (admin/ops, service-role) but no Hub UX; named as a forward seam in FEAT-H004 (the future "delete my account" affordance would route through that privileged path).
- **Consent withdrawal / history / re-consent UI (IDN-6/7)** — substrate supports it (open purpose, append-only); only the transcendence consent gate is built.
- **PC-1 telemetry sink** — transcendence/farewell V4 events bind to the in-memory seam (the PC-1 sink stays routed to G-29, as H001/H002/H003).

## For the next session

- **Read order:** this bridge → FEAT-H004 (Implementation notes + Stories) → `lib/auth/transcendence.ts` + `app/api/auth/transcend/route.ts` → `lib/auth/farewell.ts` + the farewell route → `app/become-a-fim/page.tsx` + `app/mist/page.tsx` → the FEAT-PC002 migrations (`20260626205932` transcendence, `20260626202215` explicit-erase).
- **Orientation (tests, from repo root):** `npm test -w hub -- --selectProjects unit`; `npm test -w hub -- --selectProjects integration --runInBand`; `npm run test:e2e -w hub` (auto-starts the dev server via the Playwright `webServer` config).
- **Next Hub area:** Identity continues — session edges (IDN-11) and the rest of A-IDN (IDN-4..IDN-12), then GRP-4 group surfaces. A **doc-health-check** at the cycle boundary remains the formal sweep (verifies §L4 vs `features/`, cascade integrity, the inline-count discipline).

---

## Decided next (2026-06-28) — FEAT-H005: member profile (IDN-4) + the sign-out affordance

Stefan chose this as the next Hub slice: the **account menu** — view/edit your profile, plus a real **sign-out** (both live in the shell's user menu, so they pair). **Start a fresh session for it** (clean L4 derivation; this bridge's session was saturated with H004 build detail).

**Where to enter the decomposition.** IDN-4 already exists in the **§L3 capability inventory** (`docs/products/hub/SPECIFICATION.md` §L3, A-IDN row: *"Render and edit member profile (full name, avatar, bio, display name)"* — depends IDN-3; external PC-2, PC-3 *(display name ↔ personal-group name coupling)*; founding question "Who am I?"; V2, V4). So **enter at L4** (`ecosystem-decomposition` skill): write **FEAT-H005** fresh from §L3 + DESCRIPTION + §L2 §3/§4 — do **not** source it from H004 code. Sign-out is the **IDN-3 tail**; fold it into FEAT-H005 (the user-menu is its natural home).

**The load-bearing decomposition call — a paired platform spec.** The Hub cannot write `public.users` directly (ADR-U009 / API-first). Profile **read** can ride the groups pattern, but profile **WRITE** (display name, show-real-name, bio, …) needs a **Platform API route → PostgREST RPC**. **First recon (do it in the new session):** does an `update_my_profile`-style RPC / a profile route already exist? If **not**, FEAT-H005 needs a **paired PC-2 Identity spec** (`FEAT-PC0xx`) for the write path — same paired-spec shape as H004↔PC002. The four-hop actor (`auth.uid()` → `users.personal_group_id`) and `has_permission` resolution apply.

**Scope flags to settle while speccing:**
- **Avatar = Supabase Storage** (bucket + storage RLS + upload) — a **bigger lift**; recommend **deferring avatar upload** and shipping text fields first (real/full name, display name, `show_real_name` toggle, bio). **Recon must confirm which columns even exist** on `public.users` (is there a `bio`? an `avatar_url`? or only auth `user_metadata.display_name`?) — that decides what's buildable now vs. forward seam.
- **Sign-out is the confirmed gap:** `AuthContext.signOut` exists but is **wired to no UI** (grep: only `hub/lib/auth/AuthContext.tsx`). Add a user-menu in `hub/components/shell/AppShell.tsx` → Sign out → `signOut()` → `/`. Small, but it's the first thing a member currently *can't* do.
- **`display_name` ↔ personal-group name (PC-3 coupling)** — editing the display name may need to update the personal-group name; the §L3 row flags the PC-3 dependency. Decide in the spec.
- **Behavioural oracle:** the old profile screen + user-menu/sign-out in **`hub-legacy/`** (copy-with-correction, ADR-U032).

**Read order for the fresh session:** this "Decided next" block → `docs/products/hub/SPECIFICATION.md` §L3 (IDN-4 row) + §L2 §3/§4 → `ecosystem-decomposition` skill (L4) → `docs/templates/feature-spec.md` → `docs/platform/core/identity-specification.md` (the profile-write path / paired-spec check) → the `hub-legacy` profile oracle. Then build red-first per `feature-development` once 4-ready (any new table/storage → RLS + the schema-review gate).

**Loose end (not needed for H005):** the 8 H004 walkthrough screenshots are in the session scratchpad (`…/scratchpad/feat-h004-screens/`) — ephemeral; copy into `docs/` only if a permanent record is wanted.
