# FringeIsland

**Version:** 0.2.37 | **Updated:** April 2026 | **Wave 1 (Ferd):** 95% complete

An edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences — Stewards lead, Guides facilitate, Members participate, and Observers watch.

FringeIsland is a sub-project within the **FringeIsland World** — an Alternative Reality Edutainment platform where people can Live, Grow, and Matter. See [VISION.md](docs/old_universe/vision/VISION.md) for the full vision.

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

Documentation is organized in three tiers: **Universe** (shared foundations) > **Products** (product-specific) > **Implementation** (live code state). See [docs/old_INDEX.md](docs/old_INDEX.md) for full navigation.

| What | Where |
|------|-------|
| Current state & blockers | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |
| AI assistant context | [CLAUDE.md](CLAUDE.md) |
| Documentation hub | [docs/old_INDEX.md](docs/old_INDEX.md) |
| **Ecosystem (new tree)** | |
| Ecosystem vision | [docs/ecosystem/VISION.md](docs/ecosystem/VISION.md) |
| Hub product description | [docs/products/hub/DESCRIPTION.md](docs/products/hub/DESCRIPTION.md) |
| Ferd capability map | [docs/planning/waves/FERD-CAPABILITY-MAP.md](docs/planning/waves/FERD-CAPABILITY-MAP.md) |
| Analysis reference docs | [docs/planning/reference/](docs/planning/reference/) |
| Session records | [docs/planning/sessions/](docs/planning/sessions/) |
| **Universe (legacy — source of truth until Phase 4)** | |
| Vision & intent (legacy) | [docs/old_universe/vision/VISION.md](docs/old_universe/vision/VISION.md) |
| Manifesto | [docs/old_universe/vision/MANIFESTO.md](docs/old_universe/vision/MANIFESTO.md) |
| Products & platform strategy | [docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md](docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md) |
| Architecture anatomy (primary) | [docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md](docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md) |
| Architecture decisions (ADRs) | [docs/old_universe/decisions/](docs/old_universe/decisions/) |
| Research | [docs/old_universe/research/](docs/old_universe/research/) |
| **Ferd (Wave 1)** | |
| Product specification | [docs/old_products/ferd/specification/PRODUCT_SPEC.md](docs/old_products/ferd/specification/PRODUCT_SPEC.md) |
| Requirements (100 items) | [docs/old_products/ferd/specification/REQUIREMENTS.md](docs/old_products/ferd/specification/REQUIREMENTS.md) |
| Wave roadmap | [docs/old_products/ferd/planning/ROADMAP.md](docs/old_products/ferd/planning/ROADMAP.md) |
| Deferred decisions | [docs/old_products/ferd/planning/DEFERRED.md](docs/old_products/ferd/planning/DEFERRED.md) |
| Feature docs | [docs/old_products/ferd/development/features/](docs/old_products/ferd/development/features/) |
| Behavior specs | [docs/old_products/ferd/development/specs/](docs/old_products/ferd/development/specs/) |
| TDD workflow | [docs/old_products/ferd/development/WORKFLOW.md](docs/old_products/ferd/development/WORKFLOW.md) |
| Journey Designer sessions | [docs/old_products/ferd/sessions/](docs/old_products/ferd/sessions/) |
| **All Waves (6-wave saga arc)** | |
| Products index (all waves) | [docs/old_products/INDEX.md](docs/old_products/INDEX.md) |
| Hamn product docs (Wave 3) | [docs/old_products/hamn/INDEX.md](docs/old_products/hamn/INDEX.md) |
| Wave redistribution (pending) | [docs/old_products/WAVE_REDISTRIBUTION.md](docs/old_products/WAVE_REDISTRIBUTION.md) |
| **Implementation** | |
| Database schema | [docs/old_implementation/shared/DATABASE_CURRENT.md](docs/old_implementation/shared/DATABASE_CURRENT.md) |
| Architecture baseline (live) | [docs/old_implementation/ferd/baseline/BASELINE.md](docs/old_implementation/ferd/baseline/BASELINE.md) |

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
