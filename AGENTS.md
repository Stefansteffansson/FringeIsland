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
- `docs/products/hub/` — The Hub (web platform) specs and features
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
- Use `proxy.ts` not `middleware.ts` (Next.js 16)
- `users.full_name` not `display_name`
- Use ConfirmModal, never browser alerts
- Conventional commits: `feat(hub): ...`, `fix(platform): ...`
- Feature IDs: PC=Platform Core, PD=Platform Domain, H=Hub, G=Gimbal, JS=Journey Studio, US=Universe Studio, AS=Arc Studio, DS=Design System, V=Verticals

## Boundaries

### Always do
- Run lint and type-check before committing
- Check the relevant feature spec in the ecosystem tree before implementing
- Follow API-first principle (ADR-U009)
- Update CHANGELOG.md for user-visible changes
- Read the product/service CLAUDE.md before touching that area
- Complete the Vertical Impact section in every feature spec — no vertical left blank
- Verify extensibility — no hardcoded enums, sealed type systems, or closed permission sets in new features

### Ask first
- Database schema changes (new tables, columns, RLS)
- Changes to `docs/platform/core/` code
- Adding new npm dependencies
- Modifying or superseding ADRs

### Never do
- Delete migration files
- Modify production environment variables
- Change API contracts without updating dependent feature specs
- Skip RLS policies on new tables
- Populate content in ecosystem tree without a locked feature spec
