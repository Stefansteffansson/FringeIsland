# Session bridge — FEAT-H001 walking skeleton complete; Hub v2 Phase-2 gate met

**Date:** 2026-06-24 (follows session `2026-06-24_02`)
**Session type:** build
**Status:** Closed — FEAT-H001 is `6-done`; the Phase-2 walking-skeleton gate is met (sign-in -> `/groups`, DB->API->frontend, vertical seams wired, tests green). Committed (`f796fb4`), **not pushed** (Stefan gates pushes). Next: Phase-3 Identity, in a fresh session.
**Participants:** Stefan + Claude

> Durable handoff so the next session can start cold. The slice is built, tested, and committed; a throwaway dev login is seeded and the dev server pattern is proven.

---

## Session summary

Resumed FEAT-H001 from the `2026-06-24_02` kickoff. Settled the process debt first (per the feature-development skill's pre-implementation step), then built the slice **TDD test-first** end-to-end and took it to `6-done`. The harness, the RLS-scoped read path, and the full sign-in -> `/groups` spine are all green against the live shared Supabase.

The build is faithful to the non-negotiables: **API-first** (the frontend only `fetch`es `/api/groups` — zero direct table calls), the **design-system layer extracted** (`hub/components/ui/`), and a **wired seam for each of the five verticals**. The read path is a copy-with-correction of the `hub-legacy/` oracle's two-phase query, moved server-side behind the API boundary.

## What was decided / locked

- **FEAT-H001 -> `6-done`.** The Phase-2 slice gate (README Part 2) is met: one thin slice runs end-to-end DB->API->frontend, vertical obligations (seams) met, tests green. *Locked.*
- **Process-debt resolution (the `2026-06-24_02` open item).** FEAT-H001 went `4-ready` -> `5-in-cycle` -> `6-done`; tasks `TASK-H001-01..05` created; the Hub `SPECIFICATION` §L4 feature-inventory was **seeded** (it had been "Pending"). The §L4-deferral tension from the prior bridge is resolved: §L4 now holds exactly the one shipped feature, with a coverage note that the rest of §L3 stays forward-commitment until Phase 3 reaches each area.
- **Key-format check (prior open item): confirmed clean.** `hub/.env.local` already uses the `sb_publishable_*` format — not a legacy `eyJ…` JWT. No change needed.
- **Seam vs deep-build line held.** V1 audit + V4 telemetry are real, wired seams (structured records), **not yet bound** to the PC-4 audit substrate / PC-1 telemetry sink — that deep build is Phase-3 Identity, by design (the vertical-readiness split).

## What was produced

- commit `f796fb4` — `feat(hub): FEAT-H001 walking skeleton` (37 files): the slice under `hub/` + the 5 task files + FEAT-H001 `6-done` (with Implementation notes) + Hub `SPECIFICATION` §L4 seed + features index + CHANGELOG.
- **Code (all under `hub/`):**
  - Read path: `lib/groups/queries.ts` (`fetchMemberGroups`) behind `app/api/groups/route.ts` (`GET`); page `app/groups/page.tsx`.
  - Auth/login: `app/login/page.tsx` over the existing `lib/auth/AuthContext`; client guard `/groups` -> `/login` (destination preserved).
  - Design system: `components/ui/{LoadingState,EmptyState,InlineError,Button,TextField,NotificationBell}.tsx` + `components/shell/AppShell.tsx`.
  - Seams: V1 `app/api/auth/audit/route.ts` + `lib/audit/audit.ts`; V4 `lib/observability/telemetry.ts`.
  - Harness: `jest.config.js` (unit jsdom + integration node), `playwright.config.ts` (storageState auth + auto dev server), `tests/helpers/supabase.ts`, `tests/e2e/helpers/auth.ts`, setup files.
  - Tests: `tests/integration/{auth/signin,groups/groups-read-path}.test.ts` (5) + `tests/e2e/{auth,groups}.spec.ts` (5).
- **Verification:** `npm run test:integration -w hub` (5 green) · `npm run test:e2e -w hub` (5 green) · `npm run lint -w hub` clean · `npm run build -w hub` clean.
- **Throwaway dev login (seeded into the shared Supabase, for test drives):** `dev-login@fringeisland.test` / `DevLogin123!`, owns a "Dev Test Cohort" engagement group so `/groups` renders a card. Delete when done (it's just a dev convenience; not part of any test). Seed script: `scratchpad/seed-dev-login.js`.

## What is still open

- **Phase 3 — Identity/Onboarding (the next build area).** Dependency order: Identity -> Groups -> Journeys -> Communication -> Notifications -> Platform-Ops. Identity is first. The deep Privacy/GDPR + PC-4 audit / PC-1 telemetry binding (the seams' real implementations) live here.
- **CQ-016 framing slice** — runnable now, still unrun. **Blocks nothing** in the next build (see below); worth doing soon as cheap insurance before many Phase-3 specs anchor on the DESCRIPTION's framing.
- **No `tests/unit` suite yet** — the slice is covered by integration + E2E; component unit tests can be added as the UI grows.
- **Carried hygiene:** the stray untracked `hub-legacy/tests/e2e/.auth/user.json` (gitignore gap from the relocation) — left as-is; trivial to ignore. Per-app `package.json` split still deferred. Cascade-wide growing-count sweep still deferred.

## How much of CQ-016 is needed before building more

Grounded in `OPEN_QUESTIONS.md` CQ-016 (*"Blocks: Nothing in Ferd directly"*):

- **Strictly required before the next build: none.** The Phase-3 early areas (Identity -> ... -> Platform-Ops) have **no** CQ-016 dependency.
- **The only hard gate is far off:** the DESCRIPTION / §L3 / ROADMAP reconcile (output of CQ-016 part **B**, the full trajectory design) must land **before Phase 3 reaches the experiential areas** — A-COI (Companion/Insight) and A-DIS (Discovery) — which come **last**, and A-COI is independently blocked on DS-7/DS-1 (not-yet-consumed). Long runway.
- **Do part A (framing slice) opportunistically:** one focused session, not blocked; reframes the DESCRIPTION's ambition (a doorway into a world, not "just a utility"). Cheaper to apply the earlier it lands.
- **Defer part B** until the build approaches the experiential areas and its blocking inputs (World Model, Narrative DS, Whisp specs; CQ-010/012/014) exist.

## For the next session

- **Read order:** `hub-v2/README.md` (Phase 3) -> the Hub `SPECIFICATION` §L3 A-IDN rows -> `behaviour-inventory.md` (identity behaviours) -> `substrate-audit.md` (identity/auth tags) -> PC Identity spec -> this bridge.
- **Immediate focus:** open **Phase-3 Identity/Onboarding** via `ecosystem-decomposition` (author the area's `FEAT-H###` spec) then `feature-development` (TDD). The walking-skeleton spine + harness + design-system layer are now the base to build on — reuse, don't re-scaffold.
- **Orientation:** `hub/` is the new Hub (boots, auth + `/groups` slice live); `hub-legacy/` is the frozen oracle (read-only, copy-with-correction). Run with `npm run dev` from root. Live Supabase is wired (`hub/.env.local`, `sb_publishable_*`).
- **Locked vs open:** FEAT-H001 `6-done` + the Phase-2 gate are locked. Phase-3 Identity is unstarted; the CQ-016 framing slice is unrun (parallel, non-blocking).

---

## Open items

### Immediate
- [ ] Start **Phase-3 Identity/Onboarding** (decompose -> `FEAT-H###` -> TDD), reusing the skeleton's harness + design-system + seam libs.
- [ ] Decide whether to **push** `f796fb4` (Stefan's call).

### Near-term
- [ ] **CQ-016 framing slice** (runnable now, non-blocking) — does the DESCRIPTION convey the ambition?
- [ ] Deep Privacy/GDPR + bind the V1 audit / V4 telemetry seams to PC-4 / PC-1 (lands inside Phase-3 Identity).
- [ ] Tidy the stray `hub-legacy/tests/e2e/.auth/user.json`; per-app `package.json` split.

### Deferred
- [ ] **CQ-016 full trajectory design (part B)** — before Phase 3 reaches A-COI / A-DIS; blocked on World Model / Narrative DS / Whisp + CQ-010/012/014.
- [ ] Cascade-wide growing-count sweep (pointer-not-snapshot).
