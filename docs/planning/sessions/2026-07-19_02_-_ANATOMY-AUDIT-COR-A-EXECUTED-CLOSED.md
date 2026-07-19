# Session bridge — 2026-07-19 (02): Anatomy audit → Cycle COR-A executed and closed

**Session span:** one day — full-codebase anatomy-conformance audit → rulings → correction plan → complete execution (W1–W12) → cycle close.
**Previous bridge:** `2026-07-19_01_-_J-O3-AREA-GATE-EXECUTED-PASSED-JOURNEYS-CLOSED.md` (Journeys area closed; A-COM next — still true; A-COM now starts on the corrected pattern).

---

## What happened

1. **Anatomy-conformance audit** (five parallel dimensions vs `ECOSYSTEM_ANATOMY_V6.svg` + `ARCHITECTURE_ANATOMY.md`): outer API ring CLEAN (52 routes, zero frontend DB access); ADR-U038 substrate-first HONORED (S1–S3/F1–F2 verified landed); **headline deviation = inner ring** — core RPCs authoring DS-3 cascades inline at 10 sites (the audit counted 9; the gate later found the 10th). Register: [`../reference/ANATOMY-CONFORMANCE-AUDIT.md`](../reference/ANATOMY-CONFORMANCE-AUDIT.md) — **all findings AC-1..AC-9 now dispositioned/closed.**
2. **Rulings (Stefan):** R-1 `notifications` = vertical delivery substrate (→ ADR-U048); R-2 consent tables = PC-2; R-3 `content_families` = DS-3; Tranche I before A-COM; W12 DoD row adopted.
3. **Cycle COR-A executed in full** — plan: [`../hub-v2/anatomy-correction-plan.md`](../hub-v2/anatomy-correction-plan.md) (status EXECUTED, full PR trail #182–#192); retro: [`../retrospectives/retro-2026-07-19-cor-a.md`](../retrospectives/retro-2026-07-19-cor-a.md).
   - **ADR-U047** (+A1 fourth fact, +A2 vertical-obligation composition) + **ADR-U048** ratified.
   - **Migrations applied at the schema gate** (named approvals): `20260719190205` (4 `ds3_lifecycle_*` handlers; 10 core functions relocated behavior-preservingly) and `20260719201718` (GDPR export composite — completeness is the platform's contract).
   - **The conformance gate** `hub/tests/integration/platform/internal-api-conformance.test.ts` is live in every suite run: no core function may reference a DS-owned table (schema-qualified matching; DS + vertical-composition allowlists).
   - Characterization tests A–E; W9 cache-invalidation registry (AuthContext no longer imports area modules); steering caveats (ADR-U038 scoping); charter scoping notes; W12 per-RPC gate row in the Phase-3 area-gate DoD.
4. **Close verification:** final full integration **43 suites / 480 tests green**; `next build` clean; dashboard refreshed; doc-health-check (scoped) run — summary in the retro-adjacent block below.

## Open at close

- **PR #197 held** (FEAT-PC008 W8 amendment — core-tree carve-out; pure record-keeping of the #191 nod). Awaits Stefan's named "ok merge 197".
- **Follow-ups F-1..F-5** (retro §Follow-ups): F-1 GDTarget unique-query test fix (Groups); F-2 durable audit recorder + F-3 admin-exit surface question (Platform-Ops); F-4 pc015 freeze-predicate alignment (parked product decision); F-5 recorded-only.
- **Suspended-member export asymmetry** — open spec question flagged in FEAT-PC008 amendment + migration header (suspended members hit 42501 on the walks section, at odds with PC008's right-of-access posture).
- **Next area: A-COM (Communication)** — unchanged from bridge 01, now inheriting: the `ds*_lifecycle_*` seam (ADR-U047; pc014's pending-DS-5 tags become `ds5_lifecycle_*`), the delivery-substrate/routing split (ADR-U048), the conformance gate, and the W12 DoD row.

## Doc-health check (scoped, this session)

Sections run: 2 (schema→spec: FEAT-PC008 amendment drafted, PR #197), 3 (2 README index rows, PR #196), 9 (platform CLAUDE.md caveats — clean), 11 (stamp = U048 = newest; diagram v2.4 assertions not falsified by U047/U048; pointers resolve). All other sections untriggered. No critical findings.

## Notable session learnings (detail in the retro)

- **The gate out-audited the audit:** the W3 conformance test found the 10th core→domain site (`admin_hard_delete_user`) that five audit agents missed — on its first red run.
- **Test-debris flake class:** 17 stale `GDTarget` users overflowed a LIMIT-8 search and flipped a test permanently red (erased via the sanctioned erasure sequence; durable fix F-1). Keep integration runs serialized against the shared dev DB.
- **Worktree jest gotcha:** `testMatch` silently matches zero tests under `.claude/`-pathed worktrees (micromatch reads `\.claude` as an escape) — worktree agents need explicit `--testMatch` overrides.
- **PR trail this session:** #179–#197 (audit, plan, ADRs, tests, migrations, docs; #193/#194 were Stefan's parallel knowledge-base work).
