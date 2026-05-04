I'm running a session in ClaudeCode CLI. I want our current session in here (Claude.ai chat that is) to serve as a "bounce-back" session where I discuss the ClaudeCodes outputs, questions and requests with you. This means that when I paste text into this Claude.ai chat session your task is to read it, analyze it and then come with a short and concrete answer back to me. You have quite a bit of autonomy to select a preferred way forward based on your knowledge about our FringeIsland project and what I paste from ClaudeCode CLI. Whenever possible you will come back to me in here with a preferred prompt that I easily can copy and paste back to ClaudeCode CLI (you give me the prompt in a window with the copy-icon up to the right). We want this bouncing-back session and the work in ClaudeCode CLI to be as effective as possible and run as quickly as possible.

---

Resuming the FringeIsland program work. We are running Experiment B today: parallel runs of PC-3 Organisation L1→L3 derivation — bouncing-partner manual run on main, autonomous agent run on experiments/B-pc3-full branch.

You are the bouncing partner for the manual run only. The autonomous agent runs in its own CC terminal without your intervention. We compare both outputs at the end.

State on main at session-open:
- PC-1 Infrastructure L1→L3: complete
- PC-2 Identity L1→L3: complete (with substance findings deferred for amendment per Experiment A; main is intentionally un-amended as Experiment B starting state)
- PC-3 Organisation L1→L3: starting now (manual run on main)
- PC-4 Governance L1→L3: not yet started

Required state-read documents (in order):
1. docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md (PC-1 entity bridge)
2. docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md (PC-2 entity bridge — primary read for PC-3 priors, contains the verbatim PC-3 carry-forward block)
3. docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md (Experiment A program-level bridge)

Experiment B specifics:
- Manual run target: docs/platform/core/organisation-specification.md (canonical path, on main)
- Autonomous agent target: experiments/B-pc3-full/organisation-specification.md (experiment branch)
- Two CC terminals running simultaneously; this Claude.ai chat coordinates ONLY the manual run
- Neither run sees the other's output until both are complete
- Compare end-to-end after both runs land

Modified evaluation criteria (added based on Experiment A learnings — applied at comparison phase):
- Did the agent surface schema-predates-partition pattern at PC-3? (PW-1 promotion-watch)
- Did the agent surface speculative-shape findings? (PW-2 promotion-watch)
- Did the agent reach meta-altitude observations comparable to A-candidate methodology refinements?
- Did the agent's cold derivation in Step 1 drift toward Supabase-canonical patterns? (P-O1 prediction)

Carry-forward into PC-3 manual run (from PC-2 entity bridge):
1. handle_new_user is a PC-2/PC-3 seam-trigger — PC-3 decides accept-seam vs factor vs ADR-escalate
2. public.users carries personal_group_id UUID — structural inversion of §4 chain
3. The four FringeIsland role names live in PC-3, not PC-2 — TEXT in role_templates, no PG ENUM
4. has_permission() does not exist on disk; ADR-U007 pattern latent in PC-3

Two phase-wide promotion-watches at PC-3:
- PW-1 (schema-predates-partition) — promotion expected at PC-3
- PW-2 (speculative as third shape beyond latent/delta) — promote if PC-3 surfaces same shape

Plus from Experiment A:
- P-O1 prior: the actor primitive in this repo is get_current_personal_group_id(), NOT auth.uid() directly. PC-3 cold derivation may drift toward auth.uid() per Supabase-canonical assumption; flag and correct at Step 2 stress-test.
- D7 prior: role-name vocabulary canonical artifact is named-constant-table, not PG ENUM.
- ADR-U007 has stale signature on disk (X3 from Experiment A); document at PC-3 §6 and route to gaps.md.

Discipline posture (durable):
- Bouncing-partner cycle, surface-draft, candidate ledger, tripwire-at-1
- State-read at session-open and after permission gates / tool-result clusters
- Verify-before-asserting (durable rule)
- No Greek characters as labels (durable rule)
- Discipline-stack altitude-aware: on for L-level / architectural commits, off for sub-question grinding
- Move-and-correct disposition
- Three-day fitness function for ecosystem; phase-level
- Print-batch-before-gate at L-level surface drafts
- Sub-batch-of-1 multi-Edit cadence default
- Experimental artifacts stay on experiment branches; canonical specs on main amended only via deliberate commits with explicit provenance

A-candidate ledger (5 candidates, all carrying forward):
1. Latent-vs-delta distinction (compounded by PW-2)
2. Tier-shape escalation channel
3. Database-shaped L2 framing assumption
4. Schema-predates-partition (provisional at PC-2; promotion expected at PC-3)
5. Multi-Edit gate UI sequencing + emission discipline (provisional at PC-2)

Tripwires armed:
- #4 disk-of-record verification (durable, bilateral) — ACTIVE
- #6 discipline-as-deferral (durable) — ACTIVE

Watch flags for PC-3 manual run:
- L2-line altitude pre-stress-test ("Groups, memberships, roles, permissions" — does any item read as domain-scope?)
- PW-1 promotion-watch
- PW-2 promotion-watch
- A-candidate #5 promotion-watch
- Finding #4 carry-forward (secrets/credentials adjacency)
- handle_new_user factoring decision
- P-O1 (Supabase-canonical drift toward auth.uid())
- ADR-U007 staleness (X3) at §6

Posture: analysis-only, identify contamination risks, surface tripwire status, take architectural-altitude decisions when asked. When CC's plan-back arrives from the manual-run terminal, bounce.

Before we begin: Stefan should confirm both CC terminals are running and on the right branches before pasting CC's first plan-back.
