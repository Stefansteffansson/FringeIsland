# Session bridge — 2026-07-22 (02): discovery worktree protocol landed — Claude.ai write surface split from the dev checkout

**Session span:** Stefan's question (Claude.ai discovery sessions leave uncommitted .md edits on whatever branch the dev checkout has open — collision with the git workflow at merge time) → three options laid out (dedicated worktree / in-place sweep discipline / out-of-repo notes) → **Option A chosen: dedicated worktree, scoped to `docs/ecosystem/`** → `discovery` branch + permanent worktree created → the stray whisp KB edit relocated off `feat/a-com-area-gate` → protocol codified in AGENTS.md + SESSION-OPENER.md (PR **#236**, steering carve-out, named nod given, merged) → **first sweep executed** (PR **#237**) → Claude Desktop dual-root config + two-project split on the Claude.ai side, smoke-tested end-to-end → this bridge. A learning-heavy session by design: Stefan walked every git concept (branch, commit, worktree, root, merge, PR) before each decision.

**Previous bridge:** `2026-07-22_01_-_A-COM-AREA-GATE-EXECUTED-HELD-FOR-WALK-AND-VERDICT.md` (the a-com session, sibling, still open on its own carries).

## Decisions landed

1. **Discovery worktree is canonical:** `D:\WebDev\GitHub\FringeIsland-discovery`, a permanent git worktree pinned to the long-lived `discovery` branch — the ONLY write surface for Claude.ai / Claude Desktop discovery sessions, writes confined to `docs/ecosystem/` by instruction (full worktree access accepted; the boundary is guarded convention + sweep gate, not a hard wall — Stefan's explicit call). Claude Code owns all git. Canonical text: AGENTS.md **"Discovery worktree (Claude.ai write surface)"** (merged in #236).
2. **The sweep runs at every session boundary** (opener updated): commit dirty `docs/ecosystem/` files as `docs(discovery):` → merge `discovery` → `main` when ahead (routine fuller-auto; the branch is never deleted) → merge `main` back into `discovery` and push. Out-of-bounds dirty files are surfaced, never auto-committed.
3. **Claude Desktop `fringeisland` filesystem MCP is now dual-root** (dev checkout + worktree). Claude.ai side split into two projects: **"FringeIsland"** (live-repo work, unchanged) and **"FringeIsland - Discovery"** (worktree, strict write instructions); three existing discovery chats moved over. Smoke test passed: both roots visible, writes correctly self-scoped.
4. **First sweep executed:** whisp & universe foundations findings (+84 lines, `docs/ecosystem/thinking/`) merged to `main` via #237; `discovery` fast-forwarded to main and pushed.

## Carry resolved from bridge 01

Bridge 01's standing carry **"Stefan's uncommitted KB edit stays on the working tree, deliberately untouched" is RESOLVED**: that edit (the whisp KB additions) was relocated to the `discovery` branch (`f43b6f4`), landed on `main` via #237, and the `feat/a-com-area-gate` working tree is clean of it. The a-com session should drop the carry on next resume.

## Close-ritual state (this session)

- **Sweep:** run — nothing to sweep (worktree clean, `discovery` level with `main`).
- **Dashboard:** refreshed (output is gitignored; regenerated in both the ritual worktree and the dev checkout without touching the sibling branch's tree).
- **doc-health-check:** skipped — no cross-cutting changes (additive steering sections only; no renames, deletions, or schema).

## Ops notes worth keeping

- **Claude Desktop reads MCP config only at startup, and closing its window does NOT quit it** — it lives on in the tray with old MCP processes (config-change symptoms: tools report stale roots). Tray-quit (or kill `claude` processes + orphaned `server-filesystem` helpers) then relaunch; verify via `Win32_Process` command lines. Also mirrored in Claude Code auto-memory.
- **Worktrees have no `node_modules`** — `scripts/dashboard/generate.js` needs one; a directory junction to the dev checkout's `node_modules` works (NODE_PATH does not — the script uses ESM imports).

## Open at close

Nothing new from this session. The a-com opens (live walk, W3 tail-FAIL verdict, #235 named nod, then retro → A-NTF) stand unchanged per bridge 01.
