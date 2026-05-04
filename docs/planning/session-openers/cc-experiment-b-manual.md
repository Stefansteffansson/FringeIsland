PC-3 Organisation L1→L3 derivation, bouncing-partner manual run. This is the manual side of Experiment B; the autonomous agent runs in a separate CC terminal on a different branch.

Branch confirmation:
1. git checkout main
2. git pull origin main
3. git status (must be clean)
4. git log --oneline -3 (confirm tip is the Experiment A bridge commit a1f3c4b — or later if amendment work has happened in between)

State-read pass against disk:
1. docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md (PC-1 bridge)
2. docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md (PC-2 bridge — primary read for PC-3 priors)
3. docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md (Experiment A bridge)
4. docs/platform/core/identity-specification.md (PC-2 canonical spec — un-amended; the actor primitive on disk is get_current_personal_group_id() per Experiment A finding, but PC-2 spec still says auth.uid())

Authority chain for PC-3 cold derivation:
- L1: root CLAUDE.md + docs/platform/CLAUDE.md
- Sub-tier: docs/platform/core/CLAUDE.md
- L2 inventory: docs/platform/core/README.md ("PC-3 Organisation — Groups, memberships, roles, permissions")
- ADR-U023, ADR-U007, ADR-U016
- Template: docs/templates/platform-core-spec.md
- PC-2 carry-forward block (PC-2 entity bridge → "PC-3-specific carry-forward" section)
- Experiment A findings (P-O1 actor-primitive prior, D7 named-constant-table pin, X3 ADR-U007 staleness)

Cold-derivation discipline: do NOT read supabase/migrations/, lib/, app/, or any FEAT-PC* files during Step 1. Step 2 stress-test runs after cold draft lands.

Output target: docs/platform/core/organisation-specification.md (canonical path on main).

Three-step methodology, bouncing-partner cycle:
- Step 1 (cold derivation): cold-derive the spec, print surface-draft for review BEFORE first Write gate. Bouncing-partner work via Claude.ai chat.
- Step 2 (code-informed stress-test): state-read disk after Step 1 commits. Classify findings. Bouncing-partner reviews findings before §L3 Step 2 block writes.
- Step 3 (adjudication): apply findings to spec, author §L3 Step 3 outputs (pickup lists, items not in pickup, carry-forward). Bouncing-partner cycle on plan-back, sharpenings, gate cadence.

Discipline carry-forwards:
- Print-batch-before-gate at L-level surface drafts (durable from PC-2)
- Sub-batch-of-1 multi-Edit cadence default
- Verify-before-asserting; state-read at session-open and after permission gates / tool-result clusters
- No Greek characters as labels

Watch flags for PC-3:
- L2-line altitude pre-stress-test ("Groups, memberships, roles, permissions" — does any item read as domain-scope?)
- PW-1 promotion-watch (schema-predates-partition; PC-3 schema highly likely to recur the pattern)
- PW-2 promotion-watch (speculative as third shape)
- A-candidate #5 promotion-watch (multi-Edit gate emission)
- Finding #4 carry-forward (secrets/credentials adjacency — and by extension X5 service-role escalation pattern from Experiment A)
- handle_new_user factoring decision: §6 / §5 take a position
- P-O1 prior (actor primitive is get_current_personal_group_id, not auth.uid())
- ADR-U007 staleness (X3) at §6
- handle_new_user is a known PC-2/PC-3 seam-trigger; PC-3 §5 documents what PC-2 said + adds PC-3 perspective

After Step 3 lands and all three commits are landed (spec, README revision if needed, bridge), this completes the manual side of Experiment B. The autonomous agent's run on experiments/B-pc3-full will be compared against this canonical PC-3 spec at Phase 3 of Experiment B.

Begin with branch confirmation, then state-read, then Step 1 cold derivation. Print the cold-derivation surface-draft for bouncing-partner review BEFORE the first Write gate.
