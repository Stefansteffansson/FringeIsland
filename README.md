# FringeIsland

**Version:** 0.2.37 | **Updated:** April 2026 | **Wave 1 (Ferd):** 95% complete

An edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences — Stewards lead, Guides facilitate, Members participate, and Observers watch.

FringeIsland is a sub-project within the **FringeIsland World** — an Alternative Reality Edutainment platform where people can Live, Grow, and Matter. See [VISION.md](docs/universe/vision/VISION.md) for the full vision.

---

## 🚀 Tech Stack

- **Framework:** Next.js 16.1 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Database:** 19 tables with RLS on every table
- **Testing:** Jest (659 tests: integration + unit) + Playwright (7 E2E tests)
- **Methodology:** Test-Driven Development (TDD) — behaviors first, then failing tests, then implementation

---

## 🔒 Security

- **Row Level Security (RLS)** on all 19 tables — users can only access data they're authorized for
- **Supabase Auth** with email/password and session management
- **Protected routes** via `proxy.ts` (Next.js 16 pattern, not middleware)
- **RBAC** — 4 roles (Steward, Guide, Member, Observer), 31 permissions, `has_permission()` SQL function
- **Admin isolation** — `is_platform_admin()` SECURITY DEFINER function for admin-level RLS checks

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Stefansteffansson/FringeIsland.git
   cd FringeIsland
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**
   ```bash
   # Apply migrations in order using the Supabase CLI
   bash supabase-cli.sh migration list        # See what needs applying
   node scripts/apply-migration-temp.js <migration_file>  # Apply one
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 🧪 Testing

```bash
# Domain-specific tests (fast, during development)
npm run test:integration:auth
npm run test:integration:groups
npm run test:integration:journeys
npm run test:integration:rls
npm run test:integration:rbac
npm run test:integration:admin
npm run test:integration:communication
npm run test:integration:security

# Full integration suite (~8 min)
npm run test:integration

# Quick regression check (stops on first failure)
npm run test:integration:quick

# E2E tests (requires dev server on localhost:3000)
npm run test:e2e
```

---

## 📍 Where to Find Things

Documentation is organized in three tiers: **Universe** (shared foundations) > **Products** (product-specific) > **Implementation** (live code state). See [docs/INDEX.md](docs/INDEX.md) for full navigation.

| What | Where |
|------|-------|
| Current state & blockers | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |
| AI assistant context | [CLAUDE.md](CLAUDE.md) |
| Documentation hub | [docs/INDEX.md](docs/INDEX.md) |
| **Universe** | |
| Vision & intent | [docs/universe/vision/VISION.md](docs/universe/vision/VISION.md) |
| Manifesto | [docs/universe/vision/MANIFESTO.md](docs/universe/vision/MANIFESTO.md) |
| Products & platform strategy | [docs/universe/strategy/PRODUCTS_AND_PLATFORM.md](docs/universe/strategy/PRODUCTS_AND_PLATFORM.md) |
| Architecture anatomy (primary) | [docs/universe/architecture/ARCHITECTURE_ANATOMY.md](docs/universe/architecture/ARCHITECTURE_ANATOMY.md) |
| Architecture decisions (ADRs) | [docs/universe/decisions/](docs/universe/decisions/) |
| Research | [docs/universe/research/](docs/universe/research/) |
| **Ferd (Wave 1)** | |
| Product specification | [docs/products/ferd/specification/PRODUCT_SPEC.md](docs/products/ferd/specification/PRODUCT_SPEC.md) |
| Wave roadmap | [docs/products/ferd/planning/ROADMAP.md](docs/products/ferd/planning/ROADMAP.md) |
| Deferred decisions | [docs/products/ferd/planning/DEFERRED.md](docs/products/ferd/planning/DEFERRED.md) |
| Feature docs | [docs/products/ferd/development/features/](docs/products/ferd/development/features/) |
| Behavior specs | [docs/products/ferd/development/specs/](docs/products/ferd/development/specs/) |
| TDD workflow | [docs/products/ferd/development/WORKFLOW.md](docs/products/ferd/development/WORKFLOW.md) |
| Journey Designer sessions | [docs/products/ferd/sessions/](docs/products/ferd/sessions/) |
| **Hamn (Wave 2)** | |
| Hamn product docs | [docs/products/hamn/INDEX.md](docs/products/hamn/INDEX.md) |
| **Implementation** | |
| Database schema | [docs/implementation/shared/DATABASE_CURRENT.md](docs/implementation/shared/DATABASE_CURRENT.md) |
| Architecture baseline (live) | [docs/implementation/ferd/baseline/BASELINE.md](docs/implementation/ferd/baseline/BASELINE.md) |

---

## 🤝 Contributing

This is a private project. For questions or suggestions, contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

- **Stefan Steffansson** - Project Lead & Developer

---

## 📧 Contact

For questions or support, contact: [Your contact information]

---

**Built with ❤️ using Next.js, TypeScript, and Supabase**
