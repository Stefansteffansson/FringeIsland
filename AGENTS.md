# AGENTS.md — FringeIsland

## Project
FringeIsland is an edutainment platform built around three questions:
Who am I? What do I want? How do I get there?

## Stack
Next.js 16.1 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL

## Build & test
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint · `npm run typecheck` — app + tests (both CI gates)
- `npm run test:unit` — the unit tier (CI) · `npm run test:integration` — the integration tier against the one shared database (local; one consumer at a time — see below)
- `npm run test:integration:platform` — the platform conformance family: ownership, internal API, exposure, lockdowns, retention — the anatomy's mechanical gates (local until ADR-U053; there is no pgTAP suite)

## Project structure
- `docs/` — all documentation, split into ecosystem (what) and planning (how)
- `docs/products/hub/` — The Hub (canvas-surface equipment profile, ADR-U025) shell specs and features
- `docs/platform/` — shared platform infrastructure
- `docs/planning/` — waves, cycles, backlog, sessions
- `hub/` — the Hub application (`hub/app/`, `hub/components/`, `hub/lib/`; its tests under `hub/tests/`). The root holds no application source since the Phase-4 cutover (ADR-U032; root is tooling-only)
- `supabase/migrations/` — database migrations (`REPLAY-EXCEPTIONS.json` beside them: the migrations a fresh project records-not-executes, and the seeds at their historical point); `supabase/ownership.manifest.json` — the ownership, exposure, retention and client-access registers the conformance family enforces; `supabase/projects.json` — the production and test project refs the fuse reads
- `scripts/`, `hub/scripts/` — repository tooling; every script is a row in `scripts/README.md` (gate-enforced)
- `.agents/skills/` — vendored Supabase agent skills (`skills-lock.json`), reference material only; FringeIsland's own skills live in `.claude/skills/`

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

### The test project has one consumer at a time; production has one kind of consumer

Since 2026-09-05 (ADR-U053) there are **two** Supabase projects, one migration history. `supabase/projects.json` names them. **Production** (`FringeIslandDB`, the project behind `fringe-island.vercel.app`) carries members only: no suite, probe, walk or dev server ever points at it, and the code fuse (`scripts/lib/target.js`, `hub/tests/helpers/target.ts`) refuses its ref unless `ALLOW_PRODUCTION=1` names the intent — the schema gate's production leg and the ADR-U043 performance pass are the two legitimate cases. **The test project** (`FringeIsland-test`) carries every integration suite, every E2E fleet run, every probe, the standing walk cast and the local dev server; `.env.local` (root and `hub/`) points there. It has no isolation between consumers, so the old rule moves with it:

- **Never run two integration suites concurrently** against the test project — the reds are real-looking, non-reproducible, and land on whoever runs next.
- **Destructive data operations count as a consumer** there too — debris deletes, fixture purges, consented erasures, and admin cleanups mutate the substrate a running suite is asserting against. Wait for the sweep to finish, or do the deletes first.
- **Check for a live sibling session** before starting a suite, a fleet run, or a branch switch — more than one session can share this checkout.
- **Stefan may be walking manually** — on a Vercel Preview wired to the test project or the local dev server. That collides on the dev server, the auth rate limit and cookie state. Ask before starting a long run if a walk might be in progress.
- **A fixture-domain account on production after the cutover is an alarm, not residue.** The teardown census stays as defence in depth.

When a run comes back red and something else was touching the test project, **establish that first** — before diagnosing the diff. The control run is cheaper than the investigation. The management API throttles under volume (a replay plus a full tier in one hour): a 60-second timeout on a plain catalog read is the throttle, not a defect — re-run the suite alone.

### File operations on the repository

When writing, editing, or reading files in this repository from Claude.ai or Claude Desktop, **always use the `fringeisland` MCP tools**:

- `fringeisland:write_file` — create or overwrite a file at an absolute repo path.
- `fringeisland:edit_file` — apply line-based edits (supports `dryRun: true` for preview before apply).
- `fringeisland:read_text_file` / `fringeisland:read_multiple_files` — read repo files.
- `fringeisland:list_directory` / `fringeisland:directory_tree` — inspect repo structure.

**Never use the Anthropic computer-use file tools (`create_file`, `view`, `str_replace`, `bash_tool`) for repository files.** Those tools write to an ephemeral sandbox at `/home/claude` (or the platform equivalent), not to the repository on disk. They will report success and the file will appear to exist, but it will not be present in the repo, will not show up in `git status`, and will not survive the session. The `fringeisland:` MCP tools are the only path to durable repo writes.

This rule was surfaced when an autonomous session reached for `create_file` to author a session bridge late in a long session. The failure was caught by `git_status` showing the file untracked, but the recovery cost tool calls and attention. The rule prevents recurrence: name-shape confusion ("create a new file" → `create_file`) is real under cognitive load, and the explicit prohibition gives a discipline to invoke when the wrong tool feels natural.

The Anthropic computer-use tools have legitimate uses for sandbox-side analysis, intermediate transformations, or dry-run staging — but anything that needs to land in the repo goes through `fringeisland:`.

## Discovery worktree (Claude.ai write surface)

`D:\WebDev\GitHub\FringeIsland-discovery` is a permanent git worktree of this repo, pinned to the long-lived `discovery` branch. It exists so Claude.ai / Claude Desktop discovery sessions and Claude Code development never write into the same checkout.

- **Discovery sessions (Claude.ai / Claude Desktop):** write only in the worktree, and only under `docs/ecosystem/`. Never run git there; never write to the main checkout at `D:\WebDev\GitHub\FringeIsland`.
- **Claude Code owns all git for `discovery`.** The sweep — run at session start and again in the close ritual:
  1. In the worktree: commit any dirty files under `docs/ecosystem/` as `docs(discovery): ...` and push.
  2. If `discovery` is ahead of `main`: open a PR `discovery` → `main` and merge it (docs-only under `docs/ecosystem/` is routine → fuller-auto; **never delete the `discovery` branch**).
  3. Sync back: merge `main` into `discovery` and push, so discovery sessions always see current ecosystem docs.
- **Anomalies — surface to Stefan, don't auto-commit:** a dirty file outside `docs/ecosystem/` in the worktree; the worktree checked out on anything other than `discovery`; unexplained dirty `docs/ecosystem/` files in the main checkout (suspect a mispointed Claude.ai session).
- Feature commits in the main checkout must never bundle discovery-tree edits.

## Boundaries

### Always do
- Run lint (`npm run lint`) and type-check (`npm run typecheck` — app + tests) before committing
- Check the relevant feature spec in the ecosystem tree before implementing
- Follow API-first principle (ADR-U009)
- Update the CHANGELOG(s) for user-visible changes — there are **three**, and one change can owe more than one: root `CHANGELOG.md` (the cycle entry — always), `hub/CHANGELOG.md` (Hub-surface changes, member-facing register), `docs/platform/core/CHANGELOG.md` (Core substrate). Canonical rule and registers: [`docs/planning/PROCESS.md`](docs/planning/PROCESS.md) DoD
- Read the product/service CLAUDE.md before touching that area
- Complete the Vertical Impact section in every feature spec — no vertical left blank
- Complete the Performance budget section in every feature spec with a user-facing surface (ADR-U043: budget class + data-boot path); platform-only features write "N/A (no surface)". Specs authored before ADR-U043 (2026-07-07) are grandfathered until their next amendment (Audit V R-11, 2026-09-05)
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
