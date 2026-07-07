# AGENTS.md — FringeIsland

## Project
FringeIsland is an edutainment platform built around three questions:
Who am I? What do I want? How do I get there?

## Stack
Next.js 16.1 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL

## Build & test
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx supabase test db` — database/RLS tests

## Project structure
- `docs/` — all documentation, split into ecosystem (what) and planning (how)
- `docs/products/hub/` — The Hub (canvas-surface equipment profile, ADR-U025) shell specs and features
- `docs/platform/` — shared platform infrastructure
- `docs/planning/` — waves, cycles, backlog, sessions
- `app/`, `components/`, `lib/` — application source code
- `supabase/migrations/` — database migrations

## Documentation navigation
Start at `docs/README.md` for the full map. Key entry points:
- Ecosystem vision: `docs/ecosystem/VISION.md`
- Products: `docs/products/README.md`
- Platform: `docs/platform/README.md`
- Current wave: `docs/planning/waves/ferd.md`
- Way of working: `docs/planning/PROCESS.md`

## Conventions
- `users.full_name` not `display_name`
- Use ConfirmModal, never browser alerts
- Conventional commits: `feat(hub): ...`, `fix(platform): ...`
- Feature IDs: PC=Platform Core, PD=Platform Domain, H=Hub shell, G=Gimbal shell, WS=World Studio, AS=Arc Studio, JS=Journey Studio, US=Universe Studio (umbrella level), DS=Design System, V=Verticals. GM is retired — the Game is a depth setting of journeys, not a product (ADR-U025). H and G cover product-shell features only; experience features carry their capability owner's prefix.

## Execution environment

This repo is worked on from two AI environments with different shell contexts:

- **Claude Code** uses its `Bash` tool — runs commands through bash (via Git for Windows `bash.exe` on Windows hosts). Unix tools (`ls`, `cat`, `grep`, `find`, `sed`, `awk`) are available. Use the `.sh` scripts: `supabase-cli.sh`, not `supabase-cli.bat`.
- **Claude Desktop** runs shell commands via the super-shell MCP server, which uses PowerShell on Windows. Only Windows-native commands are on the default whitelist — prefer `dir`, `type`, `findstr` over `ls`, `cat`, `grep`. Use the `.bat` scripts: `supabase-cli.bat`, not `supabase-cli.sh`.

For FringeIsland-specific work in Claude Desktop, prefer the dedicated MCPs over super-shell:
- `fringeisland` (filesystem MCP) — read/write/list files in the repo
- `fringeisland-git` (git MCP) — inspect commits, diffs, branches
- `super-shell` — reserve for system-level or ad-hoc commands

Developer tools (`git`, `npm`, `node`, `mmdc`) require approval when called via super-shell. Super-shell has two operational quirks worth knowing: the whitelist does not persist across Claude Desktop restarts, and commands that exit non-zero (including `grep`/`findstr` on empty searches) surface as "Command failed" with stdout discarded. Prefer the filesystem MCP or a PowerShell terminal for text searches.

### File operations on the repository

When writing, editing, or reading files in this repository from Claude.ai or Claude Desktop, **always use the `fringeisland` MCP tools**:

- `fringeisland:write_file` — create or overwrite a file at an absolute repo path.
- `fringeisland:edit_file` — apply line-based edits (supports `dryRun: true` for preview before apply).
- `fringeisland:read_text_file` / `fringeisland:read_multiple_files` — read repo files.
- `fringeisland:list_directory` / `fringeisland:directory_tree` — inspect repo structure.

**Never use the Anthropic computer-use file tools (`create_file`, `view`, `str_replace`, `bash_tool`) for repository files.** Those tools write to an ephemeral sandbox at `/home/claude` (or the platform equivalent), not to the repository on disk. They will report success and the file will appear to exist, but it will not be present in the repo, will not show up in `git status`, and will not survive the session. The `fringeisland:` MCP tools are the only path to durable repo writes.

This rule was surfaced when an autonomous session reached for `create_file` to author a session bridge late in a long session. The failure was caught by `git_status` showing the file untracked, but the recovery cost tool calls and attention. The rule prevents recurrence: name-shape confusion ("create a new file" → `create_file`) is real under cognitive load, and the explicit prohibition gives a discipline to invoke when the wrong tool feels natural.

The Anthropic computer-use tools have legitimate uses for sandbox-side analysis, intermediate transformations, or dry-run staging — but anything that needs to land in the repo goes through `fringeisland:`.

## Boundaries

### Always do
- Run lint and type-check before committing
- Check the relevant feature spec in the ecosystem tree before implementing
- Follow API-first principle (ADR-U009)
- Update CHANGELOG.md for user-visible changes
- Read the product/service CLAUDE.md before touching that area
- Complete the Vertical Impact section in every feature spec — no vertical left blank
- Complete the Performance budget section in every feature spec with a user-facing surface (ADR-U043: budget class + data-boot path); platform-only features write "N/A (no surface)"
- Verify extensibility — no hardcoded enums, sealed type systems, or closed permission sets in new features
- When a search or lookup returns a negative result (not found, no matches, empty), cross-check with a direct listing or independent method before logging it as missing, absent, or non-existent
- **Git lifecycle — fuller-auto (Stefan, 2026-06-27 standing authorization):** for routine, low-risk changes, run the whole cycle without pausing for the merge — branch off `main`, commit (conventional), push, open the PR, then merge + clean up in one step (`gh pr merge <n> --merge --delete-branch`) and `git pull main` to sync. Don't stop to ask whether to merge; Stefan steps in only if he chooses. The "Ask first" carve-outs below still pause even under this default.

### Ask first
- Database schema changes (new tables, columns, RLS)
- Changes to `docs/platform/core/` code
- Adding new npm dependencies
- Modifying or superseding ADRs
- **Fuller-auto carve-outs — prepare the PR, then wait for the explicit merge go-ahead (do NOT auto-merge):** any "Ask first" item above (schema/RLS — respect the schema-review gate: schema tasks land at `review`, not `done`; `platform/core/` code; new deps; ADRs); destructive or irreversible ops (force-push, history rewrite, branch deletion beyond merged-branch tidy, secrets, prod env); and edits to the steering/governance files themselves (`AGENTS.md`, `CLAUDE.md`, `PROCESS.md`, `SESSION-OPENER.md`).

### Never do
- Delete migration files
- Modify production environment variables
- Change API contracts without updating dependent feature specs
- Skip RLS policies on new tables
- Populate content in ecosystem tree without a locked feature spec
