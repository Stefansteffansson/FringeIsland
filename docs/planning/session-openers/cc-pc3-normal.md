PC-3 Organisation L1→L3 derivation, bouncing-partner manual methodology. Phase 2 entity 3.

Branch confirmation:
1. git checkout main
2. git pull origin main
3. git status (must be clean)
4. git log --oneline -3 (confirm tip is the Experiment A bridge commit a1f3c4b — or later if intermediate work has happened)

State-read pass against disk:
1. docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md (PC-1 bridge)
2. docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md (PC-2 bridge — primary read for PC-3 priors)
3. docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md (Experiment A program-level bridge — un-amended PC-2 spec is intentional starting state per this bridge)
4. docs/platform/core/identity-specification.md (PC-2 canonical spec — un-amended)

Authority chain for PC-3 cold derivation:
- L1: root CLAUDE.md + docs/platform/CLAUDE.md
- Sub-tier: docs/platform/core/CLAUDE.md
- L2 inventory: docs/platform/core/README.md ("PC-3 Organisation — Groups, memberships, roles, permissions")
- ADR-U023, ADR-U007, ADR-U016
- Template: docs/templates/platform-core-spec.md
- PC-2 carry-forward block (PC-2 entity bridge → "PC-3-specific carry-forward" section)
- Experiment A findings as carry-forward priors (P-O1 actor-primitive, D7 named-constant-table, X3 ADR-U007 staleness)

Output target: docs/platform/core/organisation-specification.md (canonical path on main).

Cold-derivation discipline: do NOT read supabase/migrations/, lib/, app/, or any FEAT-PC* files during Step 1. Step 2 stress-test runs after cold draft lands.

Three-step methodology, bouncing-partner cycle:
- Step 1: cold derivation, surface-draft printed for review before first Write gate
- Step 2: code-informed stress-test pass, findings classified into Class 1 / 2 / 3 + phase-wide observations
- Step 3: adjudication, §L3 Step 3 outputs (pickup lists, items not in pickup, carry-forward)

Discipline carry-forwards:
- Print-batch-before-gate at L-level surface drafts
- Sub-batch-of-1 multi-Edit cadence default
- Verify-before-asserting; state-read at session-open and after permission gates / tool-result clusters
- No Greek characters as labels

Watch flags for PC-3:
- L2-line altitude pre-stress-test ("Groups, memberships, roles, permissions")
- PW-1 promotion-watch (schema-predates-partition)
- PW-2 promotion-watch (speculative as third shape)
- A-candidate #5 promotion-watch (multi-Edit gate emission)
- Finding #4 carry-forward (secrets/credentials adjacency, plus X5 service-role pattern from Experiment A)
- handle_new_user factoring decision: §6 / §5 take a position (accept-seam / factor per ADR-U016 / ADR-escalate)
- P-O1 prior (actor primitive is get_current_personal_group_id, not auth.uid())
- ADR-U007 staleness (X3) at §6

Phase-2 close-out arrives after PC-4 lands. At close-out: revisit Finding #4, F-Q4b spike, PW-1/PW-2/A-candidate #5 promotion candidates, fitness-check three-day turnaround at phase level.

Begin with branch confirmation, then state-read, then Step 1 cold derivation surface-draft.
