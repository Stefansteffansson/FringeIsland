# Session bridge — Cycle B (Consent & privacy / GDPR) built to 6-done

**Date:** 2026-06-30 (build session; follows `2026-06-29_02` which decomposed Cycle B to 4-ready)
**Session type:** Build (`feature-development`). Platform-half-first, red-first, full pyramid. + cycle-boundary `doc-health-check` + the carried `deactivated` rename pass.
**Status:** **Cycle B consent half COMPLETE** — FEAT-PC006 / PC007 / H008 / H009 all `6-done` and merged. Doc-health run (cycle boundary). The `deactivated → suspended/paused` rename pass done.
**Branches/PRs (all merged):** #23 PC006, #24 PC007, #25 H008, #26 H009, #27 docs (rename + §L4 fix). `main` synced.
**Participants:** Stefan + Claude

---

## What was built

The PC-4 Governance consent contracts + the Hub consent surfaces, platform-first and API-first, over a new **granular-consent substrate** on the existing `consent_records` ledger.

| Spec | What shipped | Tests (all red-first) | PR |
|---|---|---|---|
| **FEAT-PC006** (IDN-6) | `decision` column on `consent_records` + seeded `consent_purposes` catalog (RLS: authenticated-read, no client write) + `get_own_consent_state()` SECURITY DEFINER (effective-per-purpose + drift + full history) + `GET /api/account/consent`. **ADR-U034 Amendment 1**. | 12 integration + 3 route-unit | #23 |
| **FEAT-PC007** (IDN-7 consent half) | `record_consent_decision()` SECURITY DEFINER — own-subject, append-only, withdrawability-gated, idempotent, server-stamped `policy_version` + `POST /api/account/consent` (typed refusals 22023→422 / 42501→409 / 28000→403). ADR-U016 cascade. | 7 integration + 7 route-unit | #24 |
| **FEAT-H008** (IDN-6) | `/consent` surface (FIM-only gate) + AccountMenu entry; `ConsentPanel` (fetch/loading/error) → pure `ConsentView` (effective rows + drift hint + full history), read-only. | 8 ConsentView-unit + 4 E2E | #25 |
| **FEAT-H009** (IDN-7 consent half) | grant/withdraw controls (opt-in on `ConsentView`); non-withdrawable locked; ConfirmModal → POST → **re-read** (no optimistic flip); failure-safe. | 6 controls-unit + 5 panel-orchestration-unit + 3 E2E | #26 |

Full unit **148/148**, consent integration **19** (read 12 + write 7), consent E2E **6**; `next build` + `eslint` clean throughout. Combined user-visible **CHANGELOG** entry added with H009.

### Schema (ADR-U034 Amendment 1 — schema-review gate + ADR carve-out, applied on Stefan's nod)
- `consent_records.decision text NOT NULL DEFAULT 'granted'` (open text; transcendence rows backfilled `granted`; trigger + RLS untouched — append-only intact).
- `consent_purposes` (new table → RLS): seeded `transcendence` (`withdrawable=false`, `v1`) + `product_analytics` (`withdrawable=true`, `v1`). `current_policy_version='v1'` matches the live `TRANSCENDENCE_POLICY_VERSION`, so existing FIMs read `needs_reconsent=false`.
- Migrations `20260629211504` (PC006) + `20260630062757` (PC007), both applied + repaired. PC007's function rode the PC006 schema nod (one schema gate for the consent family).

## Decisions / notes from the build

- **API convention** — realized `GET`/`POST /api/account/consent` + `@supabase/ssr` cookie auth (the shipped Hub house style, per PC003/PC004). The `/api/v1/` + Bearer form stays directional (carried open question, not a blocker).
- **`product_analytics` label** — confirmed as seed data, member-facing label "Product analytics" (freely changeable; not canon).
- **Test teardown** — seeded consent rows must be purged under `app.consent_erasure_in_progress` before deleting a test user (append-only FK is `ON DELETE RESTRICT`); the consent test helpers + the H009 E2E afterAll do this.
- **H008→H009 surface evolution** — the H008 "read-only surface" *E2E* was removed when H009 made the surface interactive; the read-only invariant stays unit-guarded on `ConsentView` without `onRequestChange`.

## Close ritual — doc-health-check (cycle boundary, 2026-06-30)

Run because the cycle had a schema migration + new specs (cross-cutting). Sections run + outcomes:
- **§2 schema / §5 maturity / §8 inventory** — consent specs clean. **Caught + fixed:** Hub `SPECIFICATION.md` §L4 had H008/H009 at `4-ready` (governance §L4 + both READMEs were updated at build, the Hub §L4 was missed) → corrected to `6-done` (in PR #27).
- **§4 parked** — PC005 / H007 still validly parked (IDN-12 deferred; `parked_reason` current).
- **§1 terminology** — the `deactivated` drift (carried item) → executed the rename pass (below).
- §1.5 / 3.5 / 3.6 / 3.7 / 6 / 7 / 9 / 10 — skipped (nothing triggered: no concept retirements, archiving, deletions, snapshots, new entities, CLAUDE.md edits, or universe cores this cycle).

## `deactivated → suspended/paused` rename pass (carried item — DONE, PR #27)

The canonical record is [`account-lifecycle-states-decision.md`](../hub-v2/account-lifecycle-states-decision.md): **"deactivated" retired** (it did two opposite jobs) → split into **`suspended`** (admin hold, realized in IDN-9) + **`paused`** (member self-pause, deferred with IDN-12). Stefan chose the **full-cleanup** treatment.

Per-referent (not a flat swap — a flat swap would have falsely implied a `suspended` account can self-reactivate):
- **IDN-9 realized** (FEAT-PC004 / FEAT-H006) + the **ADM-3** admin action → `suspended`; reframed the sentences/ACs that conflated the off-state with self-reactivation (matches H006's Impl notes: "no reactivation this cycle"); colloquial "paused" → "on hold".
- **IDN-12 deferred** (FEAT-PC005 / FEAT-H007 parked) → `paused`; reactivation prose stays correct. Kept **`deactivation-origin`** (the field name the decision doc proposes).
- Coupled rows: hub `SPECIFICATION.md` §L3 (IDN-9, ADM-3) + §L4 (H006/H007); both `features/README`; `identity-specification.md` §L4; the two tours; the phase-3 plan + phase-1 findings.
- **Deliberately left:** the two task files (glossary mention *naming* the retired term) + the legacy behaviour-oracle records (`behaviour-inventory.md`, `FERD-CAPABILITY-MAP.md` — literal hub-legacy action names). These are the only `deactivat*` left in the active tree (besides `deactivation-origin`).

## Resume HERE — next session

Per the [phase-3 plan](../hub-v2/phase-3-identity-completion-plan.md): **Cycle C — IDN-8 (request + receive complete data export)**, platform half (PC-4 export RPC) first. Decompose to 4-ready if not already, then build platform-first / red-first. (Cycles D Journal / E sessions / F exit-seam follow.)

## Carry-forward

- **G-34 sharing-controls slice** (IDN-7's other half — per-audience visibility, PC-3-coupled, no substrate yet) — author when Cycle B's consumers (COI-1 Whisp-consent, DIS-6 discoverability) first need it.
- **G-35** — narrowed: the consent-state row is enumerated in PC-4 §L3; the **data-export (IDN-8, Cycle C) + feature-flag** capabilities §L3:366 attributes to PC-4 remain attributed-but-unenumerated until their own derivation (export lands in Cycle C).
- **`paused` state is not yet encoded** — when self-pause is built (IDN-10 seam) it needs a `deactivation-origin` field + an ADR (Platform Core contract change); collision-check `paused` against membership/enrollment status sets first.
- **IDN-12 (FEAT-PC005/H007) stays parked**; **IDN-10 forward-seam untouched** (Cycle F).
- **API-convention reconciliation** (`/api/v1/` + Bearer vs the realized `/api/account/*` + cookie) — still a directional open question across the new Hub.
