# FringeIsland

An educational and training platform for personal development, leadership training, and team/organizational development.

## 🎯 Vision

FringeIsland enables users to embark on transformative "journeys" - structured learning experiences that can be taken solo, in pairs, or in groups. Like physical travel, these journeys combine exploration, exercise, and experience to foster growth and skill development.

## 📦 Current Status

**Phase**: Phase 2 Core Platform (20% Complete)  
**Stack**: Next.js 16.1 (App Router) + TypeScript + React + Tailwind CSS + Supabase  
**Version**: 0.2.0 (See [CHANGELOG.md](CHANGELOG.md) for detailed version history)

### ✅ Recently Completed
**Authentication System** (January 23, 2026):
- User signup, login, and logout
- Session management with protected routes
- Soft delete user lifecycle management
- Row Level Security enabled
- Auth context and hooks for state management

### 🚀 Ready for Development
The foundation is complete and authentication is working. Ready to build user profiles, groups, and journeys!

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
- [Initial Schema](supabase/migrations/20260120_initial_schema.sql) - Complete database setup script
- [User Lifecycle & RLS](supabase/migrations/20260123_fix_user_trigger_and_rls.sql) - Authentication triggers and security

### Project Management
- [CHANGELOG.md](CHANGELOG.md) - Version history and detailed change log

## 🚀 Key Features

### ✅ Phase 1: Foundation (Complete)
- Complete database schema with 13 tables
- Row Level Security on all tables
- Flexible node/group-based authorization system
- Next.js 16.1 with TypeScript and Tailwind CSS
- Supabase integration (database + auth)

### ✅ Phase 2: Authentication (Complete)
- User signup with email/password and display name
- User login and logout
- Protected routes with automatic redirects
- Session persistence across page refreshes
- Soft delete (users marked inactive, not deleted)
- Auth context and hooks for global state

### 🔄 Phase 2: In Progress (Next Features)
- User profile editing and avatar upload
- Group creation and management
- Journey browsing and enrollment
- Basic permissions and roles UI

### 🔮 Phase 3: Journey Experience (Planned)
- Journey content delivery system
- Progress tracking
- Facilitator tools
- Group journey features

### 🔮 Phase 4: Enhanced Features (Planned)
- User-created journey marketplace
- Communication features (forums, messaging)
- Feedback and review systems
- Advanced analytics

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

- **Frontend**: Next.js 16.1 with App Router, TypeScript, React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Real-time)
- **Authentication**: Supabase Auth with email/password
- **Database**: PostgreSQL with Row Level Security
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

2. **Run Migrations**
   - Open the Supabase SQL Editor
   - Run migrations in order:
     1. `supabase/migrations/20260120_initial_schema.sql` - Initial setup
     2. `supabase/migrations/20260123_fix_user_trigger_and_rls.sql` - User lifecycle

3. **Verify Setup**
   - Check that all 13 tables are created
   - Verify RLS policies are enabled
   - Confirm seed data is present (40 permissions, 5 role templates, 4 group templates)
   - Test triggers: Sign up a user and verify profile is created automatically

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
   - Try creating an account at `/signup`
   - Log in at `/login`
   - View your profile at `/profile`

## 🧪 Testing Authentication

### Sign Up Flow
1. Go to http://localhost:3000/signup
2. Enter email, password, and display name
3. Click "Sign Up"
4. Should redirect to `/profile`
5. Profile should show your information

### Sign In Flow
1. Go to http://localhost:3000/login
2. Enter your credentials
3. Should redirect to `/profile`

### Protected Routes
1. While signed out, try to access http://localhost:3000/profile
2. Should automatically redirect to `/login`

### Soft Delete
1. Sign up a test user
2. Go to Supabase Dashboard → Authentication → Users
3. Delete the user
4. Go to Table Editor → users table
5. User should still exist with `is_active = false`

## 📊 Database Structure

### Core Tables
- `users` - User profiles and authentication data
- `groups` - Organizational units (teams, companies, cohorts)
- `group_memberships` - User-to-group relationships
- `journeys` - Learning experience templates
- `journey_enrollments` - User journey participation

### Authorization Tables
- `permissions` - Atomic capabilities (40 seeded)
- `role_templates` - System-level role blueprints (5 seeded)
- `group_templates` - Organizational templates (4 seeded)
- `role_template_permissions` - Template-to-permission mappings
- `group_template_roles` - Template default roles
- `group_roles` - Group-specific role instances
- `group_role_permissions` - Role-specific permissions
- `user_group_roles` - User role assignments

## 🔐 Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Soft Delete**: Users marked inactive instead of deleted
- **Auth Triggers**: Automatic profile creation and lifecycle management
- **Protected Routes**: Client-side auth state checks
- **Session Management**: Automatic persistence and refresh

## 🤝 Contributing

This is a private project currently in active development. Contribution guidelines will be added when the project reaches a stable state.

## 📄 License

TBD

---

**Built with care for transformative learning experiences** 🌊

**Current Progress**: Phase 2 - Authentication Complete ✅ (20% of Core Platform)
