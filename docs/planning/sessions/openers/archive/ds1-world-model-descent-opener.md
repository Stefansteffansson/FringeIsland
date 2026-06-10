# Opener — DS-1 World Model descent (with Phase 0: PC re-check)

Continue the FringeIsland capability descent. This session: Phase 0 (PC re-check) then the DS-1
World Model L1->L3 derivation. DS-1's pause was lifted at reconciliation Session B (2026-06-10);
Phase 0 was folded in at Stefan's direction so DS-1 derives against validated dependencies.

Read first, in order:
1. docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md
   - Section 3 (descent-impact view: the PC-1..PC-4 verdicts and the DS-1 constraint row)
     and Section 6 (execution record + handoff). This is the session's work order.
2. docs/ecosystem/universe/cosmology/README.md
   - DS-1's GROUND TRUTH: the worlds topology, balls/branches/crown, seeds/anchors/cord,
     the tendable world, the access map. Every DS-1 capability traces here.
3. docs/ecosystem/universe/roles/README.md and docs/ecosystem/universe/beings/README.md
   - role gates (World Studio scope tiers) and the Whisp boundary (see Phase 1 decision).
4. .claude/skills/ecosystem-decomposition/SKILL.md - the methodology (this is an L1->L3 session).
5. docs/templates/domain-service-spec.md - the L2 spec shape.
6. ADR-U023 (anatomy), ADR-U025/U026 (entities), ADR-U027/U028 (identity, governance by scope).
7. The four PC specs under docs/platform/core/ (for Phase 0), and docs/platform/domain/README.md
   + docs/platform/domain/CLAUDE.md (sub-tier rules; verify the DS-1 spec's target filename on disk).

Precedence (hard): the canonical cores (cosmology, roles, beings) and the universe-discovery file
are the single source of truth; the PC specs were corrected to them at Session B (batch G-3) but
their L3 inventories have NOT been re-validated - that is Phase 0's job. Ratify each judgment
call with Stefan before any canonical edit. Commit at phase gates.

Mission - in this order:

PHASE 0 - PC re-check (gated; complete and ratify before Phase 1 starts):
1. PC-2 Identity + PC-3 Organisation (the two DS-1 leans on): re-walk their L3 capability
   inventories against the register's Section 3 rows. Decide and ratify:
   - whether the Shadow lifecycle decomposes into further capability rows (TTL config,
     atomic transcendence migration, ball-grant linkage) beyond the seed row added in G-3;
   - whether the Dreamineer authority templates become PC-3 capability rows NOW or
     demand-driven when the studios decompose;
   - the S43 per-region home-sharing SEAM: walk it once, deliberately, across
     PC-2 / PC-3 / DS-1 / Privacy and record which area owns what. DS-1's derivation
     consumes this decision.
2. PC-1 Infrastructure: confirm-skim only (touchpoints: the pg_cron TTL sweep mechanics,
   feature-flag consumer routing to the Console).
3. PC-4 Governance: verify the Console's decomposition is explicitly marked pending /
   demand-driven; do NOT decompose it this session.
4. Output: a short ratified delta record; spec edits land only on ratification.

PHASE 1 - DS-1 World Model derivation (only after Phase 0 is ratified):
1. FIRST DECISION, before deriving anything around it: the Whisp's L2 owner - DS-1 World Model,
   DS-7 Intelligence, or cross-cutting. This is the long-flagged cascade gap (named in
   01-decomposition-cascade.svg and deliberately absent from DS-1's box in ECOSYSTEM_ANATOMY_V5).
   Ratify with Stefan; record the decision (likely a PENDING.md ADR candidate if structural).
2. Derive the DS-1 L2 specification + L3 capability inventory from the cosmology core and the
   register's DS-1 row: places/topology state; balls + branches + the crown; seeds, anchors,
   and cord state (incl. stuck/dead outcomes); the tendable world (grown/receded, gardening-
   not-guarding); per-region home permissions (consume the Phase 0 seam decision); World Studio
   scope tiers and its write-path (World Studio writes -> DS-1, ADR-U026); the equal-ball /
   no-rankings guardrails as service-level invariants.
3. Respect the platform discipline: dependency direction Core <- Domain only; Internal API
   contract surfaces named; capabilities at consistent grain; consumers noted (World Studio
   writes; the Hub/Gimbal surfaces read; equipment-keying is feature-grain at the surfaces,
   not on platform capabilities).

Carry forward: CODE stays set aside as a correction target. ASCII only, no Greek/non-ASCII
labels. Trust disk over memory; re-read state at session open. Sessions are append-only.
docs/planning/reference/2026-04_hub-l3-working-set/ is NOT derivation input (superseded model -
its README says so). Any new assertion-bearing diagram joins the doc-health-check registry in
the same session. Close with a session bridge.
