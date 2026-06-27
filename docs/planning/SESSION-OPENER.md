# Session opener — read this first

You are starting a session on **FringeIsland**. (This text is injected at session start by the `SessionStart` hook in `.claude/settings.json`. Edit this file to change the opener.)

- **Way of working:** load [`docs/planning/PROCESS.md`](./PROCESS.md), plus `AGENTS.md` and the root `CLAUDE.md`. Follow it.
- **Current focus:** the **Hub v2 rebuild** — see [`docs/planning/hub-v2/README.md`](./hub-v2/README.md). It's in **Phase 3** (build area-by-area, in dependency order: Identity → Groups → Journeys → Communication → Notifications → Platform-Ops). **First read the most recent bridge in [`docs/planning/sessions/`](./sessions/)** for the live state — what's `6-done`, what's next, and any open decisions. Don't infer current progress from this line; the bridge is the source of truth.
- **Orient with the dashboard:** `npm run dashboard` to refresh the snapshot, then `npm run dashboard:serve` and open `docs/dashboard/index.html`.
- **Before wrapping the session (close ritual):**
  - `npm run dashboard` — refresh the overview
  - run the `doc-health-check` skill if it's a cycle boundary or after cross-cutting changes (renames, deletions, schema migrations, restructures)
  - write a session bridge under `docs/planning/sessions/` if the session made decisions
  - commit / push / PR / merge is **fuller-auto** (see `AGENTS.md` Boundaries): for routine low-risk changes, carry the full branch → commit → push → PR → merge (`--delete-branch`) → pull-`main` cycle without pausing. Pause only for the fuller-auto carve-outs (schema/RLS + the schema-review gate, `platform/core/`, ADRs, deps, destructive ops, and edits to steering files).
