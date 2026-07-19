# Cycle retro — COR-A (anatomy corrections), 2026-07-19

**Cycle:** COR-A — the corrective cycle from the anatomy-conformance audit, run before A-COM per Stefan's scheduling decision.
**Span:** one day (audit → rulings → plan → execution → close, 2026-07-19).
**Plan:** [`../hub-v2/anatomy-correction-plan.md`](../hub-v2/anatomy-correction-plan.md) · **Evidence base:** [`../reference/ANATOMY-CONFORMANCE-AUDIT.md`](../reference/ANATOMY-CONFORMANCE-AUDIT.md).

---

## What shipped

- **ADR-U047** (internal-API inversion: lifecycle facts) + **Amendment 1** (fourth fact, `user_hard_deleted`) + **Amendment 2** (vertical-obligation composition) — all ratified same-day.
- **ADR-U048** (notifications = vertical delivery substrate; DS-5 routing above) — records ruling R-1.
- **Migration `20260719190205`**: four `ds3_lifecycle_*` handlers; ten core functions relocated behavior-preservingly. **Migration `20260719201718`**: platform-side GDPR export composite.
- **The conformance gate** (`internal-api-conformance.test.ts`): red before, green after, permanent — no core function may reference a DS-owned table; runs in every suite.
- **Characterization tests A–E** (platform-exit ×3 scenarios + guards, pc015 paused-freeze pin, erasure journey-delete, decline-fallback freeze, hard-delete sentinel reassignment) — green-before/green-after proof of behavior preservation.
- **W9 cache-invalidation registry** (AuthContext no longer imports area modules; DS-7 leaf clean in TS), **W12 DoD row** (per-RPC gate verification at area gates, from A-COM), steering caveats, charter scoping notes, register bookkeeping.
- Verification: full integration 477/477 post-inversion; post-composite targeted suites 15/15 + units 9/9 + `next build` clean; final full-suite confirmation run at close.

## What worked

1. **The gate out-audited the audit.** The W3 conformance test found a tenth core→domain site (`admin_hard_delete_user`) that five audit agents had missed — on its first red run. Mechanical gates beat point-in-time audits for boundary rules; this is the strongest argument for W12's standing row.
2. **Characterization-first relocation.** Pinning current behavior (including the pc015 `<> 'frozen'` quirk and the sentinel COALESCE asymmetry) before moving code made "behavior-preserving" a proved property, not a claim. The two quirks were preserved verbatim and *documented as decisions deferred*, not silently normalized.
3. **One-nod review moments.** Bundling ADR + schema + red/green evidence into single held PRs (#188, #191) kept the named-approval protocol intact without ceremony inflation. Both amendments rode the PR that motivated them.
4. **Honest agents.** Sub-agents stopped and reported when reality diverged from instructions (dead sprint3 site; the un-covered tenth site; the W3×W8 collision; classifier denials worked around transparently with equivalent evidence, never bypassed).

## What to fix / learnings

1. **Test-data debris can permanently flip LIMIT-capped assertions.** The `search_invitable_members` test went red because 17 stale `GDTarget` users (best-effort teardown accumulation) overflowed the LIMIT-8 search. Debris erased via the sanctioned erasure sequence; durable fix is **F-1**.
2. **Worktree jest gotcha:** jest's `testMatch` silently matches zero tests when the worktree path contains `.claude` (rootDir normalization leaves `\.claude`, which micromatch reads as an escape). Workaround: explicit `--testMatch` overrides. Affects any agent running jest in `.claude/worktrees/*`.
3. **Concurrent integration runs against the shared dev DB are mutually contaminating** — serialized deliberately this cycle (worktree agents drafted; verification ran sequentially). Keep that discipline.
4. **Audit undercount, honestly recorded:** AC-1 said nine sites; the truth was ten. The register and ADR both carry the correction with provenance.

## Follow-ups (homed outside COR-A)

| ID | Home | Item |
|---|---|---|
| F-1 | Groups area | `membership-lifecycle.test.ts` search test: unique-per-run query so LIMIT-8 can't be overflowed by debris |
| F-2 | Platform-Ops | Durable auth-audit recorder (`recordAuditEntry` → `admin_audit_log`) — AC-6's re-homed half |
| F-3 | Platform-Ops | `admin_exit_user_from_platform` has no hub caller — confirm its intended surface (Console) at decomposition |
| F-4 | DS-3 / product | pc015 `<> 'frozen'` freeze-predicate divergence — preserved verbatim; aligning to active-only is an explicit product decision, parked |
| F-5 | none (recorded) | Sentinel COALESCE asymmetry unified in the handler — unreachable-state delta, documented in ADR-U047 A1 + test E |

## Decisions taken this cycle

R-1 (notifications = vertical substrate) · R-2 (consent tables PC-2) · R-3 (`content_families` DS-3) · Tranche I before A-COM · A1 fourth fact over allowlist exception · A2 vertical-obligation composition over gate weakening · **W12 adopted** (per-RPC gate row in the Phase-3 area-gate DoD, from A-COM).

## What A-COM inherits

The `ds*_lifecycle_*` seam is the documented way DS-5 will consume core lifecycle facts (pc014's pending-DS-5 disposition tags become `ds5_lifecycle_*` handlers); `notifications` is the delivery substrate DS-5 builds routing above (ADR-U048); the conformance gate and the W12 DoD row are in force from day one.
