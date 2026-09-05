# Session opener — read this first

You are starting a session on **FringeIsland**. (This text is injected at session start by the `SessionStart` hook in `.claude/settings.json`. Edit this file to change the opener.)

- **Way of working:** load [`docs/planning/PROCESS.md`](./PROCESS.md), plus `AGENTS.md` and the root `CLAUDE.md`. Follow it.
- **Discovery sweep (session start):** `D:\WebDev\GitHub\FringeIsland-discovery` (worktree pinned to the `discovery` branch) is Claude.ai's write surface. Sweep it per AGENTS.md "Discovery worktree": commit dirty `docs/ecosystem/` files as `docs(discovery):`, merge `discovery` → `main` if ahead (never delete the branch), then merge `main` back into `discovery` and push.
- **Current focus — read the front door first:** [`docs/planning/cycles/cycle-current.md`](./cycles/cycle-current.md) names the running cycle, its dated plan, the latest bridge and what is next (the hook injects it right after this opener). The **Hub v2 rebuild** ([`docs/planning/hub-v2/README.md`](./hub-v2/README.md)) completed Phase 4 on 2026-08-12 — the build is done; the **Ferd close** is the horizon. **The most recent bridge in [`docs/planning/sessions/`](./sessions/)** is the live state — what's `6-done`, what's next, any open decisions. Don't infer progress from this line; the front door and the bridge are the sources of truth, and a front door that names a closed plan is a defect (repoint it — PROCESS.md §3).
- **Orient with the dashboard:** `npm run dashboard` to refresh the snapshot, then `npm run dashboard:serve` and open `docs/dashboard/index.html`.
- **Before wrapping the session (close ritual):**
  - `npm run dashboard` — refresh the overview
  - run the `doc-health-check` skill if it's a cycle boundary or after cross-cutting changes (renames, deletions, schema migrations, restructures)
  - write a session bridge under `docs/planning/sessions/` if the session made decisions
  - run the discovery sweep again (AGENTS.md "Discovery worktree") so Claude.ai findings land on `main` and the worktree is synced
  - commit / push / PR / merge is **fuller-auto** (see `AGENTS.md` Boundaries): for routine low-risk changes, carry the full branch → commit → push → PR → merge (`--delete-branch`) → pull-`main` cycle without pausing. Pause only for the fuller-auto carve-outs (schema/RLS + the schema-review gate, `platform/core/`, ADRs, deps, destructive ops, and edits to steering files).
