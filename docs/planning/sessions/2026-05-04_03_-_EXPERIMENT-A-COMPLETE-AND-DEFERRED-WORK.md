# Session bridge: 2026-05-04 (3) — Experiment A complete; PC-2 substance findings deferred to post-Experiment-B amendment

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-04 (third bridge of 2026-05-04)
**Session type:** Program-level methodology bridge. Captures Experiment A outcome and deferred work that must be visible to PC-3 state-read.
**Chronological predecessor:** `2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` (PC-2 entity bridge).

---

## What this bridge is

This is not an entity-bridge (PC-1, PC-2, PC-3 chain). It documents a methodology experiment that ran AFTER PC-2 closed but BEFORE PC-3 begins, and captures decisions deferred for PC-3+ work.

PC-3 derivation should read this bridge AFTER reading the PC-2 entity bridge. Both are required state-read input.

---

## Experiment A — autonomous agent Step 2 stress-test on PC-2

**Question tested:** Does an autonomous CC agent (no bouncing-partner cycle) produce a Step 2 stress-test pass comparable to the manual bouncing-partner methodology?

**Method:** Reconstructed PC-2 post-Step-1 / pre-Step-2 spec; gave it to a fresh autonomous CC session with no bouncing-partner; let it run; compared output against canonical PC-2 §L3 Step 2 block.

**Artifacts on `experiments/agent-comparison` branch (pushed to origin):**
- `experiments/A-step2-stress-test/identity-specification-step1-only.md` — agent input + agent's authored §L3 Step 2 block
- `experiments/A-step2-stress-test/COMPARISON.md` — scored comparison artifact, full content

**Verdict:** MIXED, leaning STRONG.

Agent went deeper on substance — caught 7 substance findings the manual run missed (most consequential: D1+X2 actor primitive correction, D2 FK target implication, X3 ADR-U007 staleness). Agent missed meta-altitude observations — F-Q4b research-spike candidate, PW-1 schema-predates-partition abstraction, PW-2 speculative-as-third-shape methodology refinement.

**Pattern observation:** The bouncing-partner cycle is *partially* load-bearing. It protects meta-altitude work; it adds friction to substance-altitude work. Optimal shape may be hybrid — agent for substance phases, bouncing-partner for meta-altitude work.

**Single data point.** Pattern requires Experiment B to confirm.

---

## Substance findings deferred for amendment to PC-2 canonical spec

The agent surfaced 7 substance findings + 1 ADR-maintenance finding + 2 phase-wide observations that are not yet in canonical PC-2 spec. **Decision deferred:** amend PC-2 spec only after Experiment B replicates or contradicts the pattern. This protects against committing to a methodology workflow ("experiments feed back into canonical specs") based on a single data point.

**Triage (priority order for eventual amendment):**

### Group A — Material substance corrections (PC-2 §3, §5, §6, §L3 wrong as currently written):

1. **D1 + X2 — Actor primitive is `get_current_personal_group_id()`, not `auth.uid()`.** RLS policies resolve through a four-hop chain: `auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`. PC-2 spec currently names `auth.uid()` as canonical SQL-side projection; this is *correct as a Supabase primitive* but *incomplete as a description of how this repo identifies actors*. Affects §3, §5, §6, §L3 capabilities + dependency chain.

2. **D2 — FK target across codebase is `public.users.id`, not `auth.users.id`.** PC-2 §3 says "every other tier reads `user_id` via FK to `auth.users(id)`"; disk-dominant FK target is `public.users.id`. Single `REFERENCES auth.users(id)` use is the bridge column `users.auth_user_id`. Affects §3 schema-level contracts + downstream consumers' contract-surface understanding.

3. **D4 — Profile attribute set differs from cold partition.** Disk has `bio` (not in cold list), `nickname` as derivation (not free attribute), no `locale`, no `handle/slug`, no typed `account_status` enum. Affects §2 Concepts + §5 Storage column list.

### Group B — Substantive content adds:

4. **C1.6 — Account lifecycle reified on disk.** `admin_decommission_user` and `admin_hard_delete_user` RPCs; `[Deleted User]` system group as `COALESCE` reassignment target. PC-2 §8 Q7 should move from "latent" to "partially-implemented; cascade-spec-template-fill at FEAT-PC2 maturity."

5. **X3 — ADR-U007 has stale signature.** Documentation says `has_permission(user_id, group_id, permission_name)`; disk has `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)`. Routes to ADR-U007 amendment, separate from PC-2 spec.

6. **X4 — No consent/GDPR substrate.** Cold spec assumes; disk has nothing. Adds new question to PC-2 §8, plus FEAT-PC2 candidate, plus Privacy-vertical adjudication routing.

7. **X5 — Service-role escalation open-coded in five business-domain routes.** Each instantiates its own service-role client with raw `process.env.SUPABASE_SERVICE_ROLE_KEY`. Routes via PC-1 Finding #4 channel — adds to Phase-2 close-out work.

### Group C — Methodology / pattern observations:

8. **P-O1 — Cold derivation drifts toward Supabase-canonical actor primitive where this repo overrides.** Build a carry-forward prior into PC-3 / PC-4 Step 1: "the actor primitive in this repo is the personal group, not `auth.uid()`."

9. **D7 — ENUM vs named-constant-table disambiguation for role names.** Pin "named-constant table over ENUM." Already moved to PC-3 per C3-3; adds sharpness to PC-3 carry-forward.

10. **P-O4 — Independent cold derivations converged on the PC-1/PC-2 seam.** Methodology-validating observation. Worth recording in program-level methodology notes.

---

## Experiment B plan

**Goal:** Run autonomous agent on FULL PC-3 L1→L3 derivation (Steps 1, 2, 3) in parallel with bouncing-partner manual run. Compare end-to-end. Test whether Experiment A's pattern (agent deep on substance, misses meta) replicates at PC-3.

**Setup:**
- Autonomous agent works on `experiments/B-pc3-full/organisation-specification.md` (NOT canonical path)
- Bouncing-partner manual run works on `docs/platform/core/organisation-specification.md` (canonical path)
- Both runs see the same starting state — PC-2 bridge, PC-2 spec on main (un-amended; agent's substance findings NOT yet folded in), authority chain
- Neither sees the other's output until both are complete

**Modified evaluation criteria (added based on Experiment A learnings):**
- Did the agent surface schema-predates-partition pattern at PC-3? (PW-1 promotion-watch — Experiment A's manual run pre-staged this; PC-3's existing schema is the most likely site for recurrence)
- Did the agent surface speculative-shape findings? (PW-2 promotion-watch)
- Did the agent reach meta-altitude observations comparable to A-candidate methodology refinements?
- Did the agent's cold derivation in Step 1 drift toward Supabase-canonical patterns? (P-O1 prediction — the agent's own Experiment A output predicts cold derivations under-weight personal-group abstraction; testing whether the autonomous agent itself avoids this drift in its Step 1 work)

**Sequencing decision:** Run Experiment B BEFORE amending PC-2 with Experiment A findings. Reasons:
- Tests whether the substance-vs-meta pattern is durable
- Avoids committing to "experiments feed back into canonical specs" workflow on a single data point
- If pattern replicates: amendments to PC-2 + methodology refinement happen as one integrated piece of work
- If pattern contradicts: rethink the methodology question with two data points

**Cost:** ~6-10 hours wall-clock (manual side is the limiting factor; agent runs in parallel)

---

## Decisions still open

1. **Citation approach for amendments.** When PC-2 is eventually amended with experiment findings, do we cite Experiment A explicitly in the spec text ("Surfaced via Experiment A autonomous agent run on 2026-05-04") or treat the corrections as if they were always part of the analysis? Recommendation: cite explicitly. Honest provenance over narrative cleanliness; supports program-level retrospective work.

2. **Amendment scope.** Amend only Group A (material corrections) initially, or all 10 findings in one batch? Recommendation: all 10 in one focused amendment session, with separate commits for spec amendments / bridge update / gaps register / ADR-U007 amendment.

3. **Experiment B shape.** Confirmed B1-modified (parallel autonomous + manual on PC-3 with revised evaluation criteria). Open: do we additionally try the hybrid shape Experiment A's verdict suggests — autonomous agent for substance steps + bouncing-partner for meta-altitude? Recommendation: not yet. Test the cleaner B1-modified comparison first; if hybrid is needed, that's a third experiment with cleaner motivation.

---

## Discipline carry-forwards (durable from Experiment A)

The disciplines from PC-2 still apply (print-batch-before-gate, sub-batch-of-1 multi-Edit cadence, state-read at session-open, verify-before-asserting, no Greek characters as labels, etc.). Two additions specific to experiment work:

1. **Experimental artifacts stay on experiment branches.** Canonical specs on main are not modified by experiment runs. Findings fold back into main only via deliberate amendment commits with explicit provenance.

2. **Multi-CC-session contamination discipline.** Autonomous agent runs require fresh CC sessions with no prior conversation history. The reconstruction CC and the autonomous agent CC must be separate processes. Verified at Experiment A by opening a new terminal.

---

## What PC-3 derivation should know

PC-3 cold derivation begins from main as it stands at this bridge — PC-2 canonical spec is un-amended, the agent's substance findings are NOT yet folded in. This is deliberate: the un-amended PC-2 spec is the starting state for Experiment B's parallel runs.

PC-3 derivation will likely encounter the substance gaps directly (e.g., when asking "what's the actor primitive PC-2 publishes," the answer in PC-2 spec says `auth.uid()`, but disk evidence in PC-3 RLS policies will show `get_current_personal_group_id()`). This is itself useful experimental data — does PC-3's derivation (whether autonomous or bouncing-partner) catch the discrepancy and flag it for amendment?

The PC-2 carry-forward block in the PC-2 entity bridge (`docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`) is still authoritative for cross-entity findings to PC-3. This bridge supplements but does not replace the entity bridge.

---

## State at end of this session

- Branch `main` unchanged from PC-2 close (commits: spec, README, bridge, plus this bridge to-be-committed)
- Branch `experiments/agent-comparison` exists on origin with 3 commits documenting Experiment A
- Two tags on origin: `pre-pc2-baseline` (commit b75342f) and `pc2-manual-reference` (PC-2 close commit on main)
- Open work items: Experiment B (next experiment), PC-2 amendment commits (deferred until after B), ADR-U007 amendment (deferred)
- Open decision items: citation approach for amendments, amendment scope, Experiment B hybrid-shape question
