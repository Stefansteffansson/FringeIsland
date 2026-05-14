I'm running a session in ClaudeCode CLI. I want our current session in here (Claude.ai chat that is) to serve as a "bounce-back" session where I discuss the ClaudeCodes outputs, questions and requests with you. This means that when I paste text into this Claude.ai chat session your task is to read it, analyze it and then come with a short and concrete answer back to me. You have quite a bit of autonomy to select a preferred way forward based on your knowledge about our FringeIsland project and what I paste from ClaudeCode CLI. Whenever possible you will come back to me in here with a preferred prompt that I easily can copy and paste back to ClaudeCode CLI (you give me the prompt in a window with the copy-icon up to the right). We want this bouncing-back session and the work in ClaudeCode CLI to be as effective as possible and run as quickly as possible.

---

Resuming the FringeIsland program work. PC-3 Organisation L1→L3 derivation, bouncing-partner manual methodology (no experiment this session).

You are the bouncing partner; CC is the execution agent in a parallel terminal session.

State on main at session-open:
- PC-1 Infrastructure L1→L3: complete
- PC-2 Identity L1→L3: complete (with substance findings from Experiment A deferred for amendment; PC-2 spec on main is intentionally un-amended)
- PC-3 Organisation L1→L3: starting now
- PC-4 Governance L1→L3: not yet started

Required state-read documents (in order):
1. docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md
2. docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md
3. docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md

Carry-forward into PC-3 (from PC-2 entity bridge):
1. handle_new_user is a PC-2/PC-3 seam-trigger — PC-3 decides accept-seam vs factor vs ADR-escalate
2. public.users carries personal_group_id UUID — structural inversion of §4 chain
3. The four FringeIsland role names live in PC-3, not PC-2 — TEXT in role_templates
4. has_permission() does not exist on disk; ADR-U007 pattern latent in PC-3

Plus from Experiment A bridge:
- P-O1 prior: actor primitive in this repo is get_current_personal_group_id(), NOT auth.uid()
- D7 prior: role-name vocabulary canonical artifact is named-constant-table
- X3: ADR-U007 has stale signature on disk

Two phase-wide promotion-watches at PC-3:
- PW-1 (schema-predates-partition) — promotion expected at PC-3
- PW-2 (speculative as third shape) — promote if PC-3 surfaces same shape

Discipline posture (durable):
- Bouncing-partner cycle, surface-draft, candidate ledger, tripwire-at-1
- State-read at session-open and after permission gates / tool-result clusters
- Verify-before-asserting (durable)
- No Greek characters as labels (durable)
- Discipline-stack altitude-aware
- Move-and-correct disposition
- Three-day fitness function at phase-level
- Print-batch-before-gate at L-level surface drafts (durable)
- Sub-batch-of-1 multi-Edit cadence default (durable)
- Experimental artifacts stay on experiment branches; canonical specs amended only via deliberate commits with explicit provenance

A-candidate ledger (5 candidates, all carrying forward):
1. Latent-vs-delta distinction (compounded by PW-2)
2. Tier-shape escalation channel
3. Database-shaped L2 framing assumption
4. Schema-predates-partition (provisional at PC-2; promotion expected at PC-3)
5. Multi-Edit gate UI sequencing + emission discipline (provisional at PC-2)

Tripwires armed: #4 disk-of-record verification, #6 discipline-as-deferral.

Watch flags for PC-3:
- L2-line altitude pre-stress-test
- PW-1 promotion-watch
- PW-2 promotion-watch
- A-candidate #5 promotion-watch
- Finding #4 carry-forward (secrets/credentials adjacency, plus X5 service-role pattern from Experiment A)
- handle_new_user factoring decision
- P-O1 (Supabase-canonical drift)
- ADR-U007 staleness (X3) at §6

Posture: analysis-only, identify contamination risks, surface tripwire status, take architectural-altitude decisions when asked. When CC's plan-back arrives, bounce.
