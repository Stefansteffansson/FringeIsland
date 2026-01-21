# FringeIsland

An educational and training platform for personal development, leadership training, and team/organizational development.

## 🎯 Vision

FringeIsland enables users to embark on transformative "journeys" - structured learning experiences that can be taken solo, in pairs, or in groups. Like physical travel, these journeys combine exploration, exercise, and experience to foster growth and skill development.

## 📦 Current Status

**Phase**: Phase 1 Foundation ✅ Complete → Phase 2 Core Platform  
**Stack**: Next.js 16.1 (App Router) + TypeScript + React + Tailwind CSS + Supabase  
**Version**: 0.1.2 (See [CHANGELOG.md](CHANGELOG.md) for detailed version history)

Phase 1 is complete! The database is fully deployed, Next.js is configured, and Supabase integration is working. Ready to begin building authentication and core features.

## 📚 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

### Architecture Documentation
- [Architecture Overview](docs/architecture/ARCHITECTURE.md) - System design and core concepts
- [Database Schema](docs/architecture/DATABASE_SCHEMA.md) - Supabase schema and RLS policies
- [Authorization System](docs/architecture/AUTHORIZATION.md) - Permission and role management
- [Domain Entities](docs/architecture/DOMAIN_ENTITIES.md) - Core business entities

### Planning Documentation
- [Roadmap](docs/planning/ROADMAP.md) - Implementation phases and milestones
- [Deferred Decisions](docs/planning/DEFERRED_DECISIONS.md) - Architectural decisions postponed to later phases

### Database Migrations
- [Initial Schema](supabase/migrations/20260120_initial_schema.sql) - Complete database setup script with tables, indexes, RLS policies, and seed data

### Project Management
- [CHANGELOG.md](CHANGELOG.md) - Version history and detailed change log

## 🚀 Key Features (Planned)

### Phase 1: Foundation
- Predefined journey templates (A→B paths)
- Flexible group system (teams, organizations, cohorts)
- Role-based permissions with templates
- Basic forum and messaging

### Phase 2: User-Generated Content
- User-created journey marketplace
- Journey customization and publishing
- Enhanced collaboration tools

### Phase 3: Dynamic Journeys
- Adaptive journey paths based on user actions
- Context-aware content delivery

### Phase 4: Developer Platform
- API for advanced journey components
- Custom tool/method integrations

## 🏛️ Core Concepts

### Journeys
Structured learning experiences that users can complete solo or collaboratively. Journeys are content templates that groups or individuals enroll in.

### Groups
Flexible organizational units (teams, companies, cohorts) with customizable membership and permissions. Groups can contain users and other groups ("member of" relationships).

### Roles & Permissions
- **Role Templates**: System-level blueprints (Admin, Group Leader, Travel Guide, Member, Observer)
- **Group Roles**: Instance of a role within a specific group with customizable permissions
- **Permissions**: Atomic capabilities (e.g., `invite_members`, `view_journey_content`)

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, React
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Real-time)
- **Repository**: [github.com/Stefansteffansson/FringeIsland](https://github.com/Stefansteffansson/FringeIsland)

## 🏁 Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm or yarn
- Supabase account

### Database Setup

1. **Create Supabase Project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

2. **Run Initial Migration**
   - Open the Supabase SQL Editor
   - Copy the contents of [`supabase/migrations/20260120_initial_schema.sql`](supabase/migrations/20260120_initial_schema.sql)
   - Execute the script to create all tables, indexes, RLS policies, and seed data

3. **Verify Setup**
   - Check that all 13 tables are created
   - Verify RLS policies are enabled
   - Confirm seed data is present (40 permissions, 5 role templates, 4 group templates)

### Local Development

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
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Get these from Supabase Dashboard → Settings → API

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You should see the database connection test page

## 🤝 Contributing

This is a private project currently in the planning phase.

## 📄 License

TBD

---

**Built with care for transformative learning experiences** 🌊
