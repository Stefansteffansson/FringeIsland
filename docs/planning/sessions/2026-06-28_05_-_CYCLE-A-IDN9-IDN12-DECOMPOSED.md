# Session bridge — Cycle A (IDN-9 / IDN-12) decomposed to 4-ready, merged

**Date:** 2026-06-28 (decompose session; follows `2026-06-28_04` which authored the Phase-3 Identity-completion plan)
**Session type:** Decomposition (`ecosystem-decomposition`, L4 feature-spec authoring). No feature code.
**Status:** **Cycle A is authored, paired-platform-first, all four specs at `4-ready`, and merged to `main`.** No A-IDN code started — that is the next (build) session.
**Branch/PR:** `docs/cycle-a-idn9-idn12-decomposition` → [PR #15](https://github.com/Stefansteffansson/FringeIsland/pull/15) (merged, `--delete-branch`). `main` synced (`ff092fb`).
**Participants:** Stefan + Claude

---

## What this session produced

Authored **Cycle A of the Phase-3 Identity-completion plan** (account lifecycle), platform-half-first, all at `4-ready`:

| Spec | Owner | Capability | Consumes |
|---|---|---|---|
| **FEAT-PC004** — account-state read | `platform/core/identity` | IDN-9 platform half | PC-2 substrate (existing) |
| **FEAT-PC005** — self-service reactivation (carries the ADR-U016 cascade spec) | `platform/core/identity` | IDN-12 platform half | PC-4 audit primitive (existing) |
| **FEAT-H006** — render account state (active / deactivated / decommissioned) | `hub` | IDN-9 | FEAT-PC004 (API-first) |
| **FEAT-H007** — self-service reactivation (ConfirmModal-gated) | `hub` | IDN-12 | FEAT-PC005 + FEAT-PC004 |

**L4 reconciliation (same commit):** both `features/README.md` indexes (hub + platform core) and both §L4 feature-inventory summaries (`hub/SPECIFICATION.md`, `identity-specification.md`) updated. All cross-links verified resolving; the `identity-specification.md` §L4 "capabilities without specs" note now scopes the account-lifecycle state machine down to its still-unspecced slices (admin-transition RPCs + the IDN-10 exit/deletion seam).

## How it was anchored (delegated-fact discipline)

Canonical authority = `hub/SPECIFICATION.md` §L3 (IDN-9, IDN-12 rows) for the Hub derivation; `supabase/migrations/` + `supabase/seeds/` (disk) for "realized." Three research sub-agents disk-verified the platform substrate (cited `file:line`; indexed under ctx source labels `pc2-account-state-research`, `pc4-audit-research`):

- `public.users.is_active` / `is_decommissioned` booleans **exist** (3 states: active `t,f` / deactivated `f,f` / decommissioned `t` via `is_decommissioned`); **no** transition timestamp/reason columns; consistency by `enforce_decommission_invariant()`.
- RLS `users_select_active` (`USING is_active = true`) **hides deactivated/decommissioned rows from the member themselves** → IDN-9 read **must** be a `SECURITY DEFINER` own-row read that bypasses the filter (net-new).
- Every state-transition RPC is **admin-gated** (`manage_all_groups`); there is **zero** self-service path on disk → IDN-12 is net-new (owner-gated `SECURITY DEFINER` RPC; decommissioned stays terminal; idempotent when already active).
- Audit table `admin_audit_log` (6 cols) + the **inline-INSERT-via-`SECURITY DEFINER`** write pattern (as `admin_exit_user_from_platform`) **exist and are reused** — no new audit table/column. (Consent store `consent_records` also confirmed present — for Cycle B, not touched here.)

**Net-new at build:** new `SECURITY DEFINER` funcs + additive `/api/v1/account/state` (GET) and `/api/v1/account/reactivate` (POST). **No schema touched in this PR — specs only.**

## Resume HERE — next session (build) does Cycle A

**Goal:** build Cycle A red-first → `6-done`, platform-first through the schema gate.

1. Load `feature-development`.
2. **Platform first:** FEAT-PC004 then FEAT-PC005. Both add substrate → **schema gate applies** (migrations land task status `review`, not `done`; the fuller-auto schema carve-out → prepare, then wait for the explicit merge nod). Use the bash `supabase-cli.sh` migration workflow (`docs/platform/CLAUDE.md` §Database migrations).
3. **Then Hub:** FEAT-H006 then FEAT-H007 (FEAT-H007 has an internal dep on FEAT-H006 — it hosts the affordance). Run `next build` before `6-done` (the type gate — ts-jest/eslint don't full-type-check).
4. Red-first throughout (demonstrated-red, BDD-first, full pyramid: platform integration tests + Hub E2E/Playwright).

**Read order for the build session:** root `CLAUDE.md` → `AGENTS.md` → `PROCESS.md` → `feature-development` skill → `docs/platform/CLAUDE.md` + `docs/platform/core/CLAUDE.md` → this bridge → the four Cycle-A specs (PC004/PC005/H006/H007) → the FEAT-PC003 build (PR #10/#11) as the freshest schema-gate exemplar.

## Open decision for the build session (flagged in FEAT-PC005)

**Audit surface for self-service reactivation:** reuse `admin_audit_log` (admin-named, RLS bypassed via `SECURITY DEFINER`) with a self-service `action` namespace (`'self_reactivate_account'`), **vs** a distinct member-audit surface. Left as a **schema-review decision** — the stories are behavioural ("recorded to the platform audit trail with actor/action/timestamp/before-after"), so it does not block `4-ready`. Two smaller build-time confirms also flagged in PC005: the self-confirmation notification (V3), and re-auth posture for a deactivated session calling the contract.

## Carry-forward reminders

- **IDN-10 forward-seam is still pending and was NOT touched this session** (it is Cycle F, blocked on DS-3/DS-5 in the later Journeys/Communication areas). Its four hooks (parked spec + ADR-U016 cascade spec + re-entry triggers + `gaps.md` G-NN) belong to a later cycle — see `phase-3-identity-completion-plan.md` §"IDN-10 forward-seam — tracking."
- **Cycle-label judgment call:** §L4 summaries + READMEs reference "Cycle A/B…" as *pointers to the planning doc*, not as derivation drivers (consistent with the existing "Phase 2/3" note style). Stefan was asked whether to keep horizontal-axis labels out of the ecosystem tree entirely — no objection raised this session; revisit if it becomes drift.
- **Decommissioned is terminal** — self-service can never reverse it (No-go in both PC005 and H007); only the existing admin hard-paths exist, and even those do not "un-decommission."
- **Still later in A-IDN after Cycle A:** GDPR cluster (IDN-6/7 consent, IDN-8 export — Cycles B/C), private Journal (IDN-5 — Cycle D, **confirm at decomposition** whether the PC-2 Journal substrate exists or is net-new), session edges (IDN-11 — Cycle E, **feasibility-gate** Supabase per-device sessions first), then the IDN-10 seam (Cycle F).

## Close-ritual notes

`main` synced at `ff092fb`. No `doc-health-check` full run needed (no cross-cutting rename/deletion/migration/restructure — additive spec authoring + in-place §L4 reconciliation only; links verified resolving in-session). `npm run dashboard` not refreshed this session (docs-only, no maturity-6 transitions) — refresh at the start of the build session if a current snapshot is wanted. This bridge is the entry point for the build session.
