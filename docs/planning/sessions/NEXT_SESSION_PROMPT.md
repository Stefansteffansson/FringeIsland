We are continuing the FringeIsland documentation restructuring. Please read these files first to get context:

1. `docs/planning/sessions/2026-04-12_-_LEGACY-REVIEW-UNIVERSE.md` — what we did last session
2. `docs/README.md` — current documentation map
3. `CLAUDE.md` — project conventions

Our task this session is to migrate the last two legacy directories:

**1. `docs/old_products/`** — contains 6 wave directories (ferd, eid, hamn, heim, brim, urd). The ferd directory is the most complex with specification, development (boot-up, close-down, workflow, agents, features, specs), planning (roadmap, deferred, research, studies), sessions, and architecture. The other wave directories are mostly scaffolding with study docs.

**2. `docs/old_implementation/`** — contains shared database/auth docs and ferd-specific baseline, status, and changelog docs.

Key constraints:
- CLAUDE.md §Session Management still points to old_products paths for BOOT_UP.md, CLOSE_DOWN.md, WORKFLOW.md, and sprint-agent.md. These are actively used — any migration must update all references or the development workflow breaks.
- The `old_products/ferd/sessions/` directory has 35 session records that should move to `docs/planning/sessions/`
- Feature docs, behavior specs, and agent contexts are actively referenced by the development workflow
- Study docs across all waves contain early research and thinking that may belong in `docs/ecosystem/universe/`, `docs/research/`, or `docs/planning/reference/`
- Some content is purely scaffolding (.gitkeep files, empty INDEX.md files) that can be deleted

I'd like to approach this methodically:
1. First, inventory and categorise: what's active/authoritative vs scaffolding vs historical
2. Then discuss migration destinations before moving anything
3. Finally execute the migration with all cross-references updated

Don't migrate or delete anything without my confirmation.
