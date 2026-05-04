# Session openers

Bootstrap prompts for resuming FringeIsland program work after a session break. Each file contains a prompt template to paste at the START of a new Claude.ai chat or ClaudeCode CLI terminal.

These are tooling artifacts, not canonical architecture documentation. They capture the methodology state of the program (bridges to read, A-candidate ledger, tripwires armed, watch flags, discipline carry-forwards) so a fresh session can resume without losing context.

## How to use

Identify what session you're starting:

- **PC-3 Organisation L1→L3 derivation, normal bouncing-partner methodology (no experiment):**
  - Open Claude.ai chat → paste `claude-ai-pc3-normal.md`
  - Open one CC terminal → paste `cc-pc3-normal.md`

- **Experiment B: parallel autonomous-agent + bouncing-partner runs on PC-3 L1→L3:**
  - Open Claude.ai chat → paste `claude-ai-experiment-b.md`
  - Open CC terminal 1 (paired with Claude.ai, manual run on main) → paste `cc-experiment-b-manual.md`
  - Open CC terminal 2 (autonomous agent, fresh session, on experiments/B-pc3-full) → paste `cc-experiment-b-agent.md`

## Updating

These openers reference specific bridge filenames, A-candidate counts, and watch flags. After each entity completes (PC-3, PC-4) and after each experiment, the openers should be updated to reflect the new state. The bridge files themselves are authoritative; openers are convenience wrappers.

Last updated: 2026-05-04 (after Experiment A close).
