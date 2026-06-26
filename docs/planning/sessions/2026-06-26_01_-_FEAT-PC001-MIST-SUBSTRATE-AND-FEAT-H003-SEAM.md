# Session bridge — FEAT-PC001 Mist substrate landed (green); FEAT-H003 (Mist arrival) underway

**Date:** 2026-06-26 (follows session `2026-06-25_01`)
**Session type:** decompose + build
**Status:** Open — the Mist **platform substrate (FEAT-PC001) is applied + green + committed**; the Hub Mist **seam is committed**; the FEAT-H003 **UI + E2E increment** and both features' **6-done finalizes** remain. **Not pushed** (Stefan gates pushes).
**Participants:** Stefan + Claude

> Durable cold-start handoff. A-IDN's IDN-1 (the Mist, anonymous entrant) was split from IDN-2, decomposed formally across tiers (paired specs), and the substrate half built TDD to green on the live DB.

---

## Session summary

Opened FEAT-H003 (the IDN-1 Mist arrival). The big shape decisions: **split IDN-1 from IDN-2**, adopt a **three-tier identity model** (sessionless / Mist / FIM) with **lazy Mist materialisation**, lock a **manifesto-aligned continuity posture**, and — at Stefan's direction — **honour the formal cross-tier workflow** (a paired platform spec provides the substrate; the Hub consumes it) over the faster shortcut. Then built the platform substrate (FEAT-PC001) and the Hub seam TDD red→green. Full Hub suite **26/26 green**.

## What was decided / locked

- **A-IDN split + naming.** **FEAT-H003 = IDN-1** (Mist arrival), **FEAT-H004 = IDN-2** (Mist→FIM transcendence). Flat `FEAT-H{NNN}` IDs (not `a`/`b`). The platform halves mirror: **FEAT-PC001 ↔ FEAT-H003** (IDN-1), later **FEAT-PC002 ↔ FEAT-H004** (IDN-2). *Locked.*
- **Three-tier identity + lazy Mist.** *Sessionless visitor* (public **FringeIsland entry**, no session, no rows) → *Mist* (anon session + proto group, materialised **lazily on the first act that enters the shared near-side world**) → *FIM*. Per ADR-U031 stage 1, perceiving the shared near-side world requires the session, so the **sessionless tier is the entry only**. *Locked.*
- **Continuity posture (manifesto-aligned).** Cross-session return = a **fresh Mist** (unlinkable — already canon, ADR-U031 "forms anew"); **durable memory is the FIM reward**; same-device-within-TTL resume is incidental live-session persistence, not a guarantee. No anonymous fingerprinting / re-identification. *Locked.*
- **Q3 = "(b)-done-right".** "Look around" **is** the real enter-as-a-Mist act → lands on a **minimal-but-real Mist-presence state** (identity-level; NOT a fake stub, NOT the pre-designed town). *Locked.*
- **Q4 = paired platform spec (formal workflow).** FEAT-PC001 (Platform Core Identity) owns the substrate; FEAT-H003 (Hub) consumes it. *Locked.*
- **Q2 = status-driven access.** A Mist gets the proto personal group **only**; near-side access by `is_temporary` status, not a permission set / system-group enrolment (ADR-U031 "intrinsic, not a fence"). *Locked.*
- **Migration scope (Q1 + email-nullable (a)).** `users.is_temporary` + `handle_new_user` Mist branch (`'Mist'` name fallback + skip-Members for anon) + **`users.email` made nullable** (a Mist has no PII; UNIQUE still holds for FIMs) + Visitor→Mist rename. *Approved + applied.*
- **ADR clarifications appended** to ADR-U031 + ADR-U004 (sessionless entry / lazy Mist / cross-session = fresh / hard-retention-clock → FEAT-PC002). *Locked.*
- **Stefan working directive (saved to memory `feedback_quality_workflow_over_speed`):** quality + correct formal workflow **before speed**; never skip formal steps; speed is not a constraint.

## What was produced

- **Commit `bf34e9e`** — `feat(platform): FEAT-PC001 Mist anonymous-identity substrate + Mist decomposition` (18 files): FEAT-PC001 spec, FEAT-H003 spec, migration `20260626120000_mist_anonymous_substrate.sql` (**applied + repaired in history**), seed rename, `mist-substrate.test.ts`, ADR-U004/U031 clarifications, identity-spec §L4, Hub SPECIFICATION §L3/§L4, feature READMEs, 7 task files.
- **Commit `adb1906`** — `feat(hub): FEAT-H003 Mist seam` (3 files): `hub/lib/auth/mist.ts` (`beginMistSession` + `deriveIdentity`) + unit + integration tests.
- **Live environment (not in git):** **anonymous sign-in ENABLED** on project `jveybknjawtvosnahebd` (precondition, ADR-U004 — was disabled); migration applied to the live DB.
- **Verification:** `npm --prefix hub test` → **26/26 green, 8 suites**. FEAT-PC001 substrate red→green demonstrated (3 contract tests); the Mist seam red→green (6 unit + 1 integration); **FIM path unregressed** (FEAT-H001/H002 still green — the `CREATE OR REPLACE` preserved the live trigger).

## Build-informed findings (recorded in specs / here)

- **The current `handle_new_user` is in `20260227095615_add_display_name_system.sql`, NOT `20260222000000`** (cumulative-forward read, A#8). It carries nickname/avatar/display-defaults + pending-invite claim. A blind `CREATE OR REPLACE` from the older body would have regressed FEAT-H002 — the amendment was built over the *live* body.
- **`users.email` is `UNIQUE NOT NULL`** — a Mist has no email → null-crash ("Database error creating anonymous user"). Fixed by making `email` nullable (Postgres UNIQUE permits many NULLs); `full_name` / `groups.name` nulls fixed by the `'Mist'` fallback.
- **Three-state needs no DB query** — the Supabase `User.is_anonymous` flag drives `deriveIdentity`, so it's listener-safe (no `onAuthStateChange` deadlock).

## What is still open

- **FEAT-H003 UI + E2E increment (next, one coherent E2E-driven chunk):**
  - **AuthContext three-state** — add `identity` (= `deriveIdentity(user)`) + a `beginMist` facade + **mist-entered telemetry** (V4, STORY-5). `deriveIdentity` logic is already unit-tested; the glue is best driven red by the STORY-3 E2E.
  - **Sessionless entry page** (STORY-1) — public `FringeIsland entry` (Sign in / Sign up / **Look around**), no rows.
  - **Minimal Mist-presence landing** (STORY-2) — where "Look around" lands; identity-level only (no town, no accretion visuals — fundamentals before experience design).
  - **Status gating + become-a-FIM CTA** (STORY-3) — branch on `is_temporary`, not role strings; FIM-only affordances closed by status; no FIM regression.
  - **Continuity framing** (STORY-4) + **privacy/telemetry** (STORY-5).
  - **E2E** (`hub/tests/e2e/entry.spec.ts`, needs `npm run dev`) + unit/component tests for the pages.
- **Finalizes to 6-done:** **FEAT-PC001** (TASK-PC001-02 — Mist-creation cascade verification + observability event + identity-spec §L4 + Core README + CHANGELOG); **FEAT-H003** (TASK-H003-06 — §L4/README/CHANGELOG).
- **Task statuses:** `TASK-PC001-01` = **review** (substrate applied + green; → done at the 6-done finalize). `TASK-H003-03` partially done (the seam lib is built; the Look-around→Mist-presence UI + idempotency-in-UI remain). `TASK-H003-02/04/05/06`, `TASK-PC001-02` = todo.
- **Accumulation gap is now LIVE** — anonymous sign-in is on with no reaper; Mist rows accumulate until **FEAT-PC002** (the robust, industry-standard reaper — Stefan's steer: do it properly even if backend-heavy). Cleanup of test anon users is manual via `cleanupTestUser`.
- **doc-health-check recommended** (cross-cutting this session: schema migration, ADR edits, **Visitor→Mist rename**, new specs). Watch for stray `Visitor`/`Guest` references and cascade integrity.
- **Push:** `bf34e9e` + `adb1906` (and this bridge) **not pushed** — Stefan's call.
- **FEAT-PC002 ↔ FEAT-H004 (IDN-2, later):** the robust ephemerality reaper + TTL + GDPR erasure, **consent substrate** (PC-2 §8 Q8/X4), and atomic Mist→FIM transcendence.

## For the next session

- **Read order:** this bridge → `docs/products/hub/features/FEAT-H003-mist-identity-on-arrival.md` (revised: consumes FEAT-PC001, Q3 b-done-right) → `docs/platform/core/features/FEAT-PC001-mist-anonymous-substrate.md` → the H003 task files (`TASK-H003-02..06`) → `hub/lib/auth/mist.ts` (the seam) → `hub/lib/auth/AuthContext.tsx` (to extend) → `hub/app/login/page.tsx` (mirror for the new pages) → `hub/components/ui/` (primitives).
- **Immediate focus:** the FEAT-H003 UI + E2E increment via `feature-development` (TDD; the STORY-3 E2E drives AuthContext + UI red→green). No further ask-first schema gates — it's frontend + tests. Then the two 6-done finalizes.
- **Orientation:** anon sign-in is ON; live Supabase wired (`hub/.env.local`, `sb_publishable_*`); root `.env.local` has `SUPABASE_ACCESS_TOKEN`/service key (apply-migration-temp.js reads root). Tests: `npm --prefix hub test` (all), `... test:integration`/`test:unit`/`test:e2e`. Throwaway dev login `dev-login@fringeisland.test` / `DevLogin123!` (if still present).
- **Locked vs open:** FEAT-PC001 substrate + the Mist seam are green/committed. The Hub UI surface, E2E, and both 6-done finalizes are unstarted/partial.

## Open items

### Immediate
- [ ] Build the **FEAT-H003 UI + E2E increment** (AuthContext three-state · entry page · Mist-presence · status gating · continuity/telemetry · E2E).
- [ ] **Finalize FEAT-PC001 → 6-done** (TASK-PC001-02) and **FEAT-H003 → 6-done** (TASK-H003-06).

### Near-term
- [ ] Run **doc-health-check** (cross-cutting changes: schema migration, ADR edits, Visitor→Mist rename).
- [ ] Decide whether to **push** `bf34e9e` / `adb1906` + this bridge (Stefan's call).

### Deferred
- [ ] **FEAT-PC002 ↔ FEAT-H004 (IDN-2):** robust ephemerality reaper + TTL + GDPR erasure, consent substrate, Mist→FIM transcendence. The accumulation gap is live until the reaper lands.
- [ ] Tidy the stray `hub-legacy/tests/e2e/.auth/user.json` (gitignore gap); cascade-wide growing-count sweep.
