# Cycle COR-D — corrections from Anatomy-Conformance Audit IV

**Date:** 2026-08-10 · **Status:** PLANNED — held for Stefan's dispositions (rulings R-7/R-8/R-9 + the decision board below). Nothing executes until the board is settled.
**Source register:** [`ANATOMY-CONFORMANCE-AUDIT-4.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-4.md) (findings AC4-1..11, AC4-O1..O4, GC-15..23).
**Shape:** same as COR-A/B/C — named workstreams, each mapped to finding IDs and a gate. Behavior-preserving unless a ruling says otherwise. Every workstream that touches substrate runs the platform conformance family before merge (ruling C checklist line).

---

## Decision board (settle before execution)

| # | Decision | Owner call | Recommendation |
|---|---|---|---|
| 1 | **R-7** — ratify the admin-plane composition class (ADR-U047 Amendment 3) or relocate the four moderation calls | ruling | **Ratify with bounds**; declaration home = manifest entries + W3 test reads them + ADR defines the class only (pointer-not-snapshot) |
| 2 | **R-8** — one write home for consent | ruling | Relocate DS-3's insert to `record_consent_decision` (behavior-preserving, schema-gated) |
| 3 | **R-9** — Extension System representation + owner token timing | ruling | Keep box as chartered-future + interim-shape note; token lands with first real substrate |
| 4 | AC4-1 severity at execution: fix now (this cycle) vs slot at Phase-4 planning | priority call | **Fix now** — small, S3-precedented, and the exposure window closes before any policy bump can be scheduled |
| 5 | CI posture (GC-16's second half): GitHub Actions for the conformance family, or recorded local-first non-goal | posture call | Minimum: the npm script ships now (W8); CI itself = record as deliberate non-goal *or* schedule at Phase-4 cutover planning, where deploy posture is already on the table |
| 6 | AC4-7 rider: does `Storage` stay in the PC-1 box | editorial | Stays (it is real Supabase substrate underneath, unlike `email`); `email` goes |

## Workstreams

### W1 — ADR-U047 Amendment 3: the declared-composition class (AC4-2, AC4-3, AC4-5 · R-7)
Draft A3 defining the bounded class per R-7: declared-by-name; wrapper is an admin/vertical-obligation contract (client-facing wall); body is DS-owned, sealed (EXECUTE revoked from client roles), touches only its own service's tables; mutation permitted only inside the declaring vertical's obligation; one canonical declaration home. Populate declarations: the four `ds5_moderation_*` calls (Administration) + `ds3_stats_snapshot` (Observability) + regularise the five-entry `get_own_data_export` composes set (Privacy/GDPR). **Gate:** ADR carve-out — Stefan's named nod. If R-7 = relocate instead, W1 becomes the relocation design note and W2's allowlist shrinks accordingly.

### W2 — GC-15: the invocation-axis conformance check (root-cause gate)
Extend the W3 family (`hub/tests/helpers/ownership.ts` + `internal-api-conformance.test.ts`): after comment-strip, match callee names (`\b<fn>\s*\(`) of every DS-owned function inside every core-class function body; allow exactly (a) `ds*_lifecycle_*` from core and (b) W1's declared compositions, each entry cited. Note the dynamic-SQL caveat in-test. **Demonstrated red first** against today's substrate (the four moderation calls + stats call must trip it before W1's declarations land), then green with the declarations. **Gate:** test-only PR, fuller-auto after the red/green run is recorded; merges after or with W1.

### W3 — AC4-1: server-side policy-version resolution in `finalise_transcendence`
Migration: resolve `current_policy_version` (`consent_purposes`, `key='transcendence'`) inside the function; caller parameter ignored (kept in signature for compatibility) or dropped (B8 change) — recommend **ignored + COMMENT**, no signature churn. Hub cleanup: retire `TRANSCENDENCE_POLICY_VERSION` and the pass-through. Red test first: direct RPC call stamping an arbitrary version must yield a row stamped with the catalog version. **Gate:** schema gate (named approval; PR ships held with red test + apply commands per standing rule) + conformance family + `next build`.

### W4 — AC4-3 declaration (rides W1)
`ds3_stats_snapshot` composition declared (Observability, ADR-U052 statistics posture cited). No code change. Folded into W1's declaration commit; listed separately so the finding closes by name.

### W5 — AC4-4/AC4-5: one living registry for the fact vocabulary and compositions
Manifest becomes the registry (facts + compositions), W3 family asserts against it, ADR-U047 A3 carries only the class definitions and a pointer. `ds5_lifecycle_user_hard_deleted` gains its ADR-grade declaration inside A3 (it is a fact, not a composition). **Gate:** rides W1's nod (same ADR text); manifest/test halves fuller-auto.

### W6 — AC4-6: consent write-home relocation (R-8)
`set_journey_progress_sharing` calls `record_consent_decision` (or the ruled contract) instead of inserting `consent_records` directly. Behavior-preserving; characterization test pins the written row shape first. **Gate:** schema gate (named approval) + conformance family.

### W7 — anatomy-pair refresh (AC4-7, AC4-8, AC4-10, AC4-O2, AC4-O3)
One editing pass, AB-6 precedent (in-place, caption/desc bumped, v2.6 → v2.7): PC-1 box drops `email` (Storage stays per board #6); Extension System interim-shape note per R-9; "route group" → "route segment" in the anatomy + AB-7 register row annotation; one-line `hub-legacy/` pointer in Products (editor's discretion, AC4-O2); stamp line records this audit. **Gate:** fuller-auto (docs; no core/ADR/steering files touched) — flagged here so the nod on this plan covers the diagram edit explicitly.

### W8 — gate patches (GC-16 script half, GC-17, GC-18, GC-19, GC-21)
`test:integration:platform` npm script; table gate widens past `relkind='r'`; `prokind` filters aligned across the two function gates; mechanical `ds{N}_`→DS-{N} pin; `admin_*`→PC-4 table-name pin. All test/config-only. **Gate:** fuller-auto; each patch's before/after recorded in the PR body. CI itself per board #5.

### W9 — hygiene (AC4-9, AC4-11)
`is_platform_admin` manifest move PC-1→PC-4 with note (gate-neutral, verified); COR-B plan annotation (path (a) landed — annotate at `:88`, never rewrite); ADR-U047 filename cite fix in `anatomy-correction-plan.md:43`. **Gate:** fuller-auto.

## Order and dependencies

Board settles → **W2 red demonstrated** (against un-amended substrate — the register's proof the gate works) → W1+W4+W5 (one ADR nod) → W2 green lands → W3, W6 (schema-gated, named approvals, can run parallel to W1's drafting) → W7, W8, W9 (fuller-auto, any order). Every substrate PR runs the conformance family + `next build` before merge.

## Definition of done

- [ ] All three rulings recorded (in the ADR amendment / this plan's board, per kind)
- [ ] Every AC4 finding closed by name with a per-finding annotation in the register (AC-7 lesson: same-day closure notes)
- [ ] W2's red run recorded before any declaration lands; green after
- [ ] GC-15..21 each either patched or explicitly dispositioned (GC-22/23 recorded as observation-grade)
- [ ] Anatomy stamp + diagram caption moved (v2.7), doc-health anatomy-freshness section green
- [ ] Conformance family green at close; `next build` clean; CHANGELOGs per register (root + platform-core for substrate work)
- [ ] The audit's own gate-conversion rule satisfied: GC-15's invocation check is the audit's shipped gate
