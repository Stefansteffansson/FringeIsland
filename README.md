# FringeIsland

**Version:** 0.2.37 | **Updated:** April 2026 | **Wave 1 (Ferd):** 95% complete

An edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences — Stewards lead, Guides facilitate, Members participate, and Observers watch.

FringeIsland is a sub-project within the **FringeIsland World** — an Alternative Reality Edutainment platform where people can Live, Grow, and Matter. See [VISION.md](docs/ecosystem/VISION.md) for the full vision.

---

## Tech Stack

- **Framework:** Next.js 16.1 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Database:** 19 tables with RLS on every table
- **Testing:** Jest (659 tests: integration + unit) + Playwright (7 E2E tests)
- **Methodology:** Test-Driven Development (TDD) — behaviors first, then failing tests, then implementation

---

## Security

- **Row Level Security (RLS)** on all 19 tables — users can only access data they're authorized for
- **Supabase Auth** with email/password and session management
- **Protected routes** via `proxy.ts` (Next.js 16 pattern, not middleware)
- **RBAC** — 4 roles (Steward, Guide, Member, Observer), 31 permissions, `has_permission()` SQL function
- **Admin isolation** — `is_platform_admin()` SECURITY DEFINER function for admin-level RLS checks

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. `npm install`
3. Create `.env.local` with Supabase credentials
4. Apply database migrations
5. `npm run dev`
6. Open `http://localhost:3000`

---

## Testing

```bash
npm run test:integration:auth       # Auth tests
npm run test:integration:groups     # Group tests
npm run test:integration:journeys   # Journey tests
npm run test:integration            # Full suite (~8 min)
npm run test:integration:quick      # Stops on first failure
npm run test:e2e                    # E2E (requires dev server)
```

---

## Documentation

Start at [docs/README.md](docs/README.md) for the full navigation map. Key entry points:

| What | Where |
|------|-------|
| Documentation hub | [docs/README.md](docs/README.md) |
| Ecosystem vision | [docs/ecosystem/VISION.md](docs/ecosystem/VISION.md) |
| AI agent context | [AGENTS.md](AGENTS.md) |
| AI assistant context | [CLAUDE.md](CLAUDE.md) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |

---

## License

Proprietary - All rights reserved

---

**Built with Next.js, TypeScript, and Supabase**
