# Session bridge — FEAT-H002 credentialed FIM sign-up complete (6-done); Phase-3 Identity underway

**Date:** 2026-06-25 (follows session `2026-06-24_03`)
**Session type:** build
**Status:** Closed — FEAT-H002 is `6-done` and committed (`e8ed79b`), **not pushed** (Stefan gates pushes). Next: FEAT-H003 (Mist identity + Mist→FIM transcendence), the net-new-substrate half of the identity foundation.
**Participants:** Stefan + Claude

> Durable handoff so the next session can start cold. The first Phase-3 area (sign-up) is built, tested, and committed on top of the FEAT-H001 spine.

---

## Session summary

Opened **Phase-3 Identity/Onboarding** (the area after the FEAT-H001 walking skeleton). Used `ecosystem-decomposition` to scope capability **A-IDN**, then `feature-development` to build **TDD test-first** to `6-done`.

The pivotal scoping decision: a literal "IDN-1/IDN-2 first" (Mist → transcendence) would lead with the one part of A-IDN that has **no substrate and no oracle**. Substrate + oracle are both **ready** for credentialed FIM sign-up (the `handle_new_user` path), so we built that first and deferred Mist to FEAT-H003. Stefan confirmed ("Sign-up first, Mist next").

FEAT-H002 was authored at `4-ready`, then built reusing the FEAT-H001 spine (app shell, design-system layer, auth context, `/groups` read path, harness, seam libs) — copy-with-correction, no re-scaffold.

## What was decided / locked

- **A-IDN build order.** FEAT-H002 = **credentialed FIM sign-up** (realises the IDN-3 sign-up surface + the FIM outcome of IDN-2). FEAT-H003 = **Mist identity + Mist→FIM transcendence** (IDN-1/IDN-2) — net-new substrate, no oracle — **next**. IDN-4..IDN-12 later. *Locked.*
- **FEAT-H002 → `6-done`** (commit `e8ed79b`). The first Phase-3 area's gate is met (feature DoD + vertical checklist + tests green). *Locked.*
- **Design: sign-up goes through a real hub API route.** `POST /api/auth/signup` enforces the consent gate **server-side** and performs the Supabase auth `signUp` (auth stays the narrow client/SDK exception); the client `setSession`s the returned tokens so `AuthContext` stays coherent. Chosen over a client-only call because it honours the spec's "through the API route / server-side consent" and Hub `CLAUDE.md`'s "business logic behind the API". *Locked.*
- **No migration written.** Sign-up rides the existing `handle_new_user` (FIM path was already conformant). *Locked.*

## What was produced

- commit **`e8ed79b`** — `feat(hub): FEAT-H002 credentialed FIM sign-up` (15 files): the slice under `hub/` + the 4 task files + FEAT-H002 spec (`6-done` with Implementation notes) + Hub `SPECIFICATION` §L4 row + features README + CHANGELOG.
- **Code (under `hub/`):**
  - `lib/auth/signup.ts` — `signUpFim(supabase, {email,password,displayName,consentAccepted})` (consent gate + `signUp` with `display_name` metadata + normalised duplicate/pending result).
  - `app/api/auth/signup/route.ts` — `POST`: server-side consent gate, `signUpFim`, `account.created` audit (V1) + telemetry (V4), returns session tokens / `pendingConfirmation`.
  - `lib/auth/AuthContext.tsx` — `signUp` facade (POSTs the route, then `supabase.auth.setSession`).
  - `app/signup/page.tsx` — form + un-prechecked consent gate + confirm-email state; `app/login/page.tsx` — login↔signup cross-link.
  - Tests: `tests/integration/auth/signup.test.ts` (3), `tests/e2e/signup.spec.ts` (4).
- **Verification:** `npm run test:integration -w hub` **8/8** (3 new) · `npm run test:e2e -w hub` **9/9** (4 new) · `npm run lint -w hub` + `npm run build -w hub` clean. Tests mint fresh unique emails and tear users down (shared-Supabase hygiene).

## Build-informed findings (recorded in the spec Implementation notes + §L4)

- **GRP-4 filters to engagement groups.** `fetchMemberGroups` (`hub/lib/groups/queries.ts`) filters `group_type='engagement'`, so a brand-new FIM (only personal + "FringeIsland Members" *system* memberships) lands on the **empty state** ("No groups yet"), not a "FringeIsland Members" card. Spec STORY-2 was corrected mid-build to match. The enrolment still happens in substrate (asserted in integration).
- **`admin_audit_log` is admin-only (RLS gated to `is_platform_admin()`).** No member-facing audit sink exists, so the V1 `account.created` audit stays a **structured seam** (console + telemetry), exactly like FEAT-H001. Real persistence needs a `SECURITY DEFINER` member-lifecycle audit RPC = **net-new substrate**, deferred — routed to **G-29** with the other PC-reciprocation gaps.
- **V4 telemetry** binds to the in-memory `emitTelemetry` seam (the PC-1 sink is still not realised) — started/succeeded/failed all emit, failures included.
- **Email auto-confirm is ON** on the live project (`signUp` returns a session immediately); the `pendingConfirmation` branch is implemented and handled defensively but dormant under the current setting.

## What is still open

- **FEAT-H003 — Mist identity + Mist→FIM transcendence (IDN-1/IDN-2), the next build.** Net-new substrate: a **Mist state** on `users` (no `is_temporary`/Mist flag today), an **anonymous session** (ADR-U004), **ephemerality/TTL** (note: **pg_cron is NOT installed** — no scheduled-cleanup mechanism), and an **atomic transcendence** that hands into the FEAT-H002 sign-up path with consent capture. **No oracle** (the legacy auth oracle assumes a credentialed user — Mist = NONE) — build-new. The "Visitor/Guest" system group is a vestigial pre-canon shell to **rename to Mist** on build. Expect a migration → **ask-first schema approval** (AGENTS.md). Weigh "fundamentals before experience design": confirm ADR-U031/U004 mechanics are firm enough on paper before building the Mist experience.
- **Remaining A-IDN rows IDN-4..IDN-12** — profile edit, Journal, consent state/history (IDN-6/7), export, account state, exit/deletion, per-device sessions (IDN-11, also G-29), reactivation — later features.
- **Deferred vertical sinks** — the real PC-4 member-facing audit RPC + PC-1 telemetry sink remain seams across the Hub; bind when the substrate lands.
- **CQ-016 framing slice** — still unrun, non-blocking. The trajectory reconcile (part B) must land **before Phase 3 reaches the experiential areas** (A-COI / A-DIS — last).
- **Carried hygiene:** stray untracked `hub-legacy/tests/e2e/.auth/user.json` (gitignore gap) — left as-is. Per-app `package.json` split deferred. Cascade-wide growing-count sweep deferred.
- **Push:** `f796fb4`, `915495d`, `e8ed79b` (and this bridge) not pushed — Stefan's call.

## For the next session

- **Read order:** this bridge → `hub-v2/README.md` (Phase 3) → Hub `SPECIFICATION` §L3 A-IDN (the IDN-1/IDN-2 rows) → `substrate-audit.md` (Mist gaps: `users` state, anonymous session, pg_cron) → PC-2 Identity spec §9 (Mist lifecycle, ADR-U031) → `behaviour-inventory.md` (note: Mist/anonymous = NONE oracled).
- **Immediate focus:** **FEAT-H003 (Mist)** via `ecosystem-decomposition` (author the spec) then `feature-development` (TDD). Heavier than H002 — it carries a migration and net-new design, not a port.
- **Orientation:** `hub/` is the v2 Hub (boots; auth + sign-in + **sign-up** + `/groups` live). Reuse the spine. Run `npm run dev` from root. Live Supabase wired (`hub/.env.local`, `sb_publishable_*`). Throwaway dev login: `dev-login@fringeisland.test` / `DevLogin123!` (if still present).
- **Locked vs open:** FEAT-H001 + FEAT-H002 are `6-done`. FEAT-H003 (Mist) is unstarted; the CQ-016 framing slice is unrun (parallel, non-blocking).

---

## Addendum — testing discipline + FEAT-H003 autonomy (post-commit, 2026-06-25)

Two follow-ups landed after the main session (commits `d3039f6`, `a878613`):

- **Unit tier backfilled** for FEAT-H002 (`tests/unit/lib/auth/signup.test.ts`, `tests/unit/app/signup/consent-gate.test.tsx`; 8 tests; the jest `unit` project switched to the `react-jsx` runtime so component `.tsx` specs compile). Full suite is now **8 unit + 8 integration + 9 E2E**.
- **`feature-development` skill tightened** to enforce what FEAT-H002 skipped: **BDD outside-in + TDD red-first** — map each acceptance criterion to a tier (unit/integration/E2E), write the test, **confirm it fails for the right reason**, then green → refactor. **A freshly-written test that comes up green when it should be red is an anomaly → stop and surface.** Test-after coverage must be labelled honestly.
- **FEAT-H003 autonomy (agreed):** run the red → green → refactor cycles **continuously**, surfacing only at the three gates — **anomaly** (unexpected green), **ask-first** (schema/migration, new deps, shared platform code, spec deviation), and **DoD/commit**. FEAT-H003 carries a migration, so the ask-first schema gate *will* fire.

### FEAT-H003 firmness scout (2026-06-25) — verdict: PARTIALLY-READY

Ran a "fundamentals before experience design" check before committing to the FEAT-H003 build. The Mist **lifecycle is firm**; what's missing is **substrate/config, not discovery**:

- **Locked:** ADR-U004 (Accepted) — Supabase built-in anonymous sign-in, temporary profile flagged `is_temporary: true`, convert-to-permanent API flips the flag. ADR-U031 §9 — the 4-stage lifecycle (Entry → Access → Data → Transcendence) and a **one-event atomic transcendence** (consent is a precondition, all founding questions answered, continuity preserved, mid-migration joiner not erased). Mist = the anonymous entrant (renamed from "Shadow"); Visitor/Guest→Mist rename target is set but unscheduled.
- **IDN-1 (anonymous Mist on arrival) — BUILDABLE as a thin slice:** Supabase anon session + `users.is_temporary` + near-side gating by status. Carries a migration (ask-first gate). Its full *ephemerality guarantee* depends on item 2 below.
- **IDN-2 (transcendence) — BLOCKED** until these resolve (priority order; all small ADR-amendments / FEAT-PC2 decisions, not full discoveries):
  1. **Consent substrate** — identity-spec §8 Q8/X4: zero consent/GDPR substrate on disk; no consent-state column. Needs Privacy-vertical adjudication. *Hard-blocks IDN-2.*
  2. **Ephemerality mechanism** — §8 Q10 + **pg_cron is NOT installed**. Decide the sweep (install pg_cron vs Edge-Function-scheduled vs on-request lazy-erase) and the TTL value. *Also gates IDN-1's privacy guarantee and IDN-2's mid-migration guard.*
  3. **Accretion-stage data shape** — §9 wants "stage legible, content private" but no stage column/field is specified (one-line data decision).
  4. **In-flight journey carry-over** — DS-3/JRN-5: unstated whether a Mist enrolls pre-transcendence and what migrates (scopes IDN-2's migration payload).
- **Implication:** **FEAT-H003 likely splits** — build a reduced **IDN-1** first; firm items 1–4 before **IDN-2**. The next session opens with that scoping call (items 1 & 2 likely want Stefan — consent + ephemerality are schema/ADR decisions). Sources: `ADR-U031-mist-identity-lifecycle.md`, `ADR-U004-visitor-anonymous-sign-in.md`, `identity-specification.md` §9/§8 Q8/Q10, `substrate-audit.md` Gaps, `OPEN_QUESTIONS.md`.

---

## Open items

### Immediate
- [ ] Start **FEAT-H003 — Mist identity + Mist→FIM transcendence** (decompose → `FEAT-H003` → TDD); expect a migration + ask-first schema approval.
- [ ] Decide whether to **push** `f796fb4` / `915495d` / `e8ed79b` + this bridge (Stefan's call).

### Near-term
- [ ] **CQ-016 framing slice** (runnable now, non-blocking).
- [ ] Bind the V1 audit / V4 telemetry seams to real PC-4 / PC-1 sinks when the substrate (member-facing lifecycle-audit RPC; telemetry sink) lands — routed to G-29.
- [ ] Tidy the stray `hub-legacy/tests/e2e/.auth/user.json`; per-app `package.json` split.

### Deferred
- [ ] **CQ-016 full trajectory design (part B)** — before Phase 3 reaches A-COI / A-DIS.
- [ ] Cascade-wide growing-count sweep (pointer-not-snapshot).
