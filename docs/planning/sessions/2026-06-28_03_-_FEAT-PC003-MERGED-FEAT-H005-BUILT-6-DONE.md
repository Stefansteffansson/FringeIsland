# Session bridge — FEAT-PC003 schema gate cleared + merged; FEAT-H005 built to 6-done + merged (IDN-4 complete)

**Date:** 2026-06-28 (build + close session; follows `2026-06-28_02` which paused PC003 at the schema-review gate)
**Session type:** Feature implementation (`feature-development`) — clearing the PC003 gate, then the Hub half of IDN-4, red-first
**Status:** **DONE. Both FEAT-PC003 (platform) and FEAT-H005 (hub) are `6-done` and merged to `main`. IDN-4 is fully delivered (platform read/update contract + Hub surface), plus the IDN-3 sign-out tail.** Nothing paused.
**Branches:** `feat/pc003-self-service-profile` (PR #10, merged, deleted) and `feat/h005-member-profile-and-sign-out` (PR #11, merged, deleted). `main` synced at `e5fdf9e`.
**Participants:** Stefan + Claude

---

## What happened (in order)

1. **PC003 schema-review gate cleared (Stefan's nod).** Applied `supabase/migrations/20260628120000_feat_pc003_bio_max_length.sql` (the `bio_max_length` CHECK) via the platform workflow (`apply-migration-temp.js` → `migration repair --status applied` → verified in `migration list`). Live data was clean (0 bios > 500), so `VALIDATE` passed.
2. **PC003 closed.** The over-long-bio integration test flipped green; full integration suite **15 suites / 41 tests** green (no regression). Flipped PC003 `5-in-cycle → 6-done` (spec frontmatter + Platform Core `features/README` + identity-spec §L4 row), tasks → done, Implementation notes added. **PR #10 merged `--delete-branch`** (the gated step).
3. **FEAT-H005 built red-first (the Hub half).** Opened the feature (3 tasks, `5-in-cycle`), then built:
   - `hub/lib/profile/client.ts` — `fetchProfile` / `updateProfile` over `/api/profile/me` + pure `displayLabel`.
   - `hub/components/profile/ProfileEditForm.tsx` — copy-with-correction from the `hub-legacy` oracle (ADR-U032): same fields/validation, **corrected** to the PC003 API (no direct table write), dropped `userId`/`personalGroupId`/`updated_at`.
   - `hub/app/profile/page.tsx` — `/profile`, FIM-gated (Mist→`/`, sessionless→`/login`), loading state, avatar read-only.
   - `hub/components/shell/AccountMenu.tsx` (+ mounted in `AppShell`) — FIM-only; Profile + Sign out; label from the read contract, refreshes on `refreshNavigation`.
   - V4 telemetry: `profile.updated` / `profile.update_failed` / `session.ended`.
   - **Unit 103/103** (26 new), **E2E 18/18** (3 new journeys), **`next build` green**. Flipped H005 → `6-done` (spec + Hub §L4 row + coverage-note prose + README), CHANGELOG entry, tasks done. **PR #11 merged `--delete-branch`.**

## Key finding — `main` was build-broken since PR #10 (PC003)

FEAT-PC003's `hub/lib/profile/queries.ts` cast a **supabase-js string-`.select()`** result (a union that includes `GenericStringError`) directly **`as Profile`** in `fetchMyProfile` / `updateMyProfile`. `next build`'s type-check rejects that conversion. **It slipped the PC003 gate because the integration suite (ts-jest) and `npm run lint` (eslint) do not full-type-check — only `next build` does.** So PC003 merged green-by-its-own-gate but `next build` failed on `main`. Fixed in this session by narrowing through `unknown` (`data as unknown as Profile`). `next build` is green again. **Process consequence: `next build` must be part of the 6-done DoD for any Hub feature** — see [[feedback_next_build_is_the_type_gate]].

## Decisions taken

- **Sign-out navigation order (STORY-4 AC1).** Sign-out navigates to `/` **before** `await signOut()`, so the protected surface unmounts before auth flips and its own sessionless-guard can't race the menu to `/login?redirect=...`. Found via a red E2E; the fix made it deterministic.
- **One `/profile` page doubles as view + editor** (the prefilled form is the view) — matches the appetite (a focused slice), satisfies STORY-1 (view) and STORY-2 (edit) without a separate `/profile/edit` route (the oracle had two).
- **Merge nod for PR #11** was requested and given despite H005 being product-tier, because the PR carried the PC003 (`core`) build-fix.

## Where we are / what's next

- **IDN-4 complete** (platform FEAT-PC003 + Hub FEAT-H005). The IDN-3 sign-out tail is done. Hub identity now covers: sign-in (H001), sign-up (H002), Mist arrival (H003), Mist→FIM transcendence + farewell (H004), profile + sign-out (H005).
- **Candidates for next** (Phase 3 order: Identity → Groups → …): remaining A-IDN edges — session management / remote sign-out (IDN-11), account state / self-service exit / reactivation (IDN-9/10/12), consent history / granular sharing (IDN-6/7) — **or** move to the **Groups** area (GRP-4: group detail / create-edit / membership surfaces, currently forward-commitment, unspecced at L4). Not decided.
- **Deferred (unchanged):** avatar upload (Supabase Storage) — the forward seam named in both PC003 and H005.

## Close-ritual notes

- `npm run dashboard` run (553 files indexed). `next build` + full unit + full E2E green on the merged code.
- **doc-health-check not run.** A single additive CHECK constraint + maturity flips is not a rename/deletion/restructure; all PC003/H005 maturity references were updated consistently and grep-verified (no lingering `4-ready`/`5-in-cycle` outside the frozen `_01` bridge). Run it at the next cycle boundary or if a cross-cutting change lands.
- **Minor pre-existing gap noted:** `hub/CHANGELOG.md` has no FEAT-H004 entry (transcendence + farewell). Left as-is (out of this feature's scope); worth backfilling in a docs pass.
