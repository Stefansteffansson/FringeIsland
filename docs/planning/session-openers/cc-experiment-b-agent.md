You are running a full L1→L3 derivation for PC-3 Organisation Platform Core area, autonomously, per the ecosystem-decomposition skill flow. This is Experiment B.

Phase 2 entity 3 of the FringeIsland ecosystem decomposition. Same three-step shape used at PC-1 and PC-2: cold derivation → code-informed stress-test → adjudication.

Branch setup:
1. git checkout main
2. git pull origin main
3. git checkout -b experiments/B-pc3-full
4. mkdir -p experiments/B-pc3-full
5. git status (confirm clean working tree on the new branch)

Read first (in this order):
1. Root CLAUDE.md
2. docs/platform/CLAUDE.md
3. docs/platform/core/CLAUDE.md (note temporary anchor for the four roles + has_permission() — slated for migration to PC-3 if your derivation supports that placement)
4. docs/platform/core/README.md (PC-3 L2 line: "Groups, memberships, roles, permissions")
5. ADR-U023 (Platform Core / Domain Services decomposition)
6. ADR-U007 (three-layer permission model)
7. ADR-U016 (cascade specification discipline)
8. docs/templates/platform-core-spec.md (template)
9. docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md (PC-2 entity bridge — read the "PC-3-specific carry-forward" section carefully)
10. docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md (Experiment A program-level bridge — note that PC-2 spec on main is intentionally un-amended; the substance findings the previous experiment surfaced are documented in this bridge but not yet folded in)

Carry-forward from PC-2 (read carefully — these are Step 1 inputs for PC-3):
- handle_new_user is a PC-2/PC-3 seam-trigger; PC-3 takes a position: accept-seam / factor per ADR-U016 / ADR-escalate
- public.users carries personal_group_id UUID (structural inversion of dependency chain)
- The four FringeIsland role names live in PC-3 (TEXT in role_templates), not PC-2
- has_permission() does not exist on disk; ADR-U007 pattern latent in PC-3
- Two phase-wide watches: PW-1 (schema-predates-partition), PW-2 (speculative as third shape beyond latent/delta)

From Experiment A bridge:
- The actor primitive in this repo is get_current_personal_group_id() (a four-hop chain through users/groups), NOT auth.uid() directly. Cold derivation may drift toward auth.uid() per Supabase-canonical assumption; flag and correct at Step 2.
- Role-name vocabulary canonical artifact is named-constant-table, not PG ENUM.
- ADR-U007 has stale signature on disk (has_permission(p_acting_group_id, p_context_group_id, p_permission_name) — not the user_id-shaped ADR text).

Output target: experiments/B-pc3-full/organisation-specification.md (NOT the canonical docs/platform/core/organisation-specification.md path).

Three-step methodology:
- Step 1 (cold derivation): Read L1, L2 inventory line, sub-tier CLAUDE.md, ADR-U023, template, PC-2 carry-forward only. Do NOT read supabase/migrations/, lib/, app/, or any FEAT-PC* files. Author §1-§8 + §L3 capabilities/dependencies/external/sources-status.
- Step 2 (code-informed stress-test): State-read against disk: supabase/migrations/, lib/supabase/, app/api/, docs/platform/core/features/. Classify findings (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity). Surface phase-wide observations.
- Step 3 (adjudication): Apply Step 2 findings to the spec. Author §L3 Step 3 outputs: pickup lists per receiving entity (PC-4, Domain Services, program-level), items not in pickup, carry-forward to receiving entity authors.

Constraints:
- Run autonomously through all three steps. Permission gates only for actual Write/Edit calls.
- Document reasoning visible in chat as you go.
- Do NOT read docs/platform/core/organisation-specification.md (canonical path) — that's where the bouncing-partner manual run will write; your output goes to the experiment path.
- Do NOT read or modify experiments/A-step2-stress-test/ — that's the previous experiment's artifacts.
- Watch flags: L2-line altitude pre-stress-test; PW-1 promotion-watch; PW-2 promotion-watch; A-candidate #5 promotion-watch (multi-Edit gate emission); Finding #4 carry-forward (secrets/credentials adjacency); handle_new_user factoring decision.
- If you produce findings that would route to PC-2 or PC-1, document them as pickup but do NOT modify those entities' specs.

When complete, summarize:
- §L2 framing decision (any altitude-mix concern surfaced?)
- §L3 capability count
- Step 2 findings classified by class
- Step 3 adjudications and dispositions
- Pickup lists per receiving entity (counts)
- Phase-wide observations (PW-1 / PW-2 promotion-watches: confirmed or not?)
- Methodology surfacings during the run
- Top three most consequential findings

After Step 3 lands and the spec file is written, commit the work to experiments/B-pc3-full:
git add experiments/B-pc3-full/
git commit -m "experiment(B): autonomous agent PC-3 L1→L3 derivation full run

Full L1→L3 derivation by autonomous CC agent without bouncing-partner.
Output written into experiments/B-pc3-full/organisation-specification.md.

[Add summary of finding counts and top findings here]"

Then push:
git push -u origin experiments/B-pc3-full

Begin with the branch setup, then state-read, then Step 1 cold derivation.
