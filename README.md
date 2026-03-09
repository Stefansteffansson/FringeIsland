# FringeIsland

**Version:** 0.2.36 | **Updated:** March 2026 | **Phase 1:** 95% complete

An edutainment platform for group-based personal development through structured learning journeys. Users travel solo or in groups on predefined journeys guided by role-based experiences — Stewards lead, Guides facilitate, Members participate, and Observers watch.

FringeIsland is a sub-project within the **FringeIsland World** — an Alternative Reality Edutainment platform where people can Live, Grow, and Matter. See [VISION.md](docs/vision/VISION.md) for the full vision.

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

| What | Where |
|------|-------|
| Current state & blockers | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |
| Phase roadmap | [docs/planning/ROADMAP.md](docs/planning/ROADMAP.md) |
| Vision & intent | [docs/vision/VISION.md](docs/vision/VISION.md) |
| Manifesto | [docs/vision/MANIFESTO.md](docs/vision/MANIFESTO.md) |
| Contribution architecture | [docs/vision/CONTRIBUTION_ARCHITECTURE.md](docs/vision/CONTRIBUTION_ARCHITECTURE.md) |
| AI assistant context | [CLAUDE.md](CLAUDE.md) |
| All documentation | [docs/INDEX.md](docs/INDEX.md) |
| Product specification | [docs/planning/PRODUCT_SPEC.md](docs/planning/PRODUCT_SPEC.md) |
| Architecture baseline | [docs/architecture/ARCHITECTURE_BASELINE.md](docs/architecture/ARCHITECTURE_BASELINE.md) |
| Deferred decisions | [docs/planning/DEFERRED_DECISIONS.md](docs/planning/DEFERRED_DECISIONS.md) |

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
