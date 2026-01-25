# FringeIsland

An educational and training platform for personal development, leadership training, and team/organizational development.

## 🎯 Vision

FringeIsland enables users to embark on transformative "journeys" - structured learning experiences that can be taken solo, in pairs, or in groups. Like physical travel, these journeys combine exploration, exercise, and experience to foster growth and skill development.

## 📦 Current Status

**Phase**: Phase 2 Core Platform (45% Complete)  
**Stack**: Next.js 16.1 (App Router) + TypeScript + React + Tailwind CSS + Supabase  
**Version**: 0.2.3 (See [CHANGELOG.md](CHANGELOG.md) for detailed version history)

### ✅ Recently Completed

**Group Creation** (January 25, 2026):
- Create groups from templates (Small Team, Large Group, Organization, Learning Cohort)
- Set group name, description, and custom label
- Control visibility (public/private) and member list settings
- Automatic group leader assignment
- View all groups in "My Groups" page
- Complete RLS policies for group security

**Avatar Upload** (January 24, 2026):
- Upload profile pictures to Supabase Storage
- Circular avatar display with borders
- Replace and delete avatar functionality
- File validation and error handling

**User Profile Management** (January 24, 2026):
- Profile editing with full name and bio
- Form validation and character limits
- Enhanced profile display

**Authentication System** (January 23, 2026):
- User signup, login, and logout
- Session management with protected routes
- Soft delete user lifecycle management
- Row Level Security enabled
- Auth context and hooks for state management

### 🚀 Ready for Development
The foundation is complete, authentication is working, users can manage their profiles with avatars, and groups can be created! Next up: group detail pages and member management.

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
- Supabase integration (database + auth + storage)

### ✅ Phase 2: Authentication & Profile (In Progress - 45% Complete)

**Completed:**
- ✅ User signup with email/password and display name
- ✅ User login and logout
- ✅ Protected routes with automatic redirects
- ✅ Session persistence across page refreshes
- ✅ Soft delete (users marked inactive, not deleted)
- ✅ Auth context and hooks for global state
- ✅ Profile editing (full name and bio)
- ✅ Form validation and error handling
- ✅ Enhanced profile display
- ✅ Avatar upload to Supabase Storage
- ✅ Avatar display (circular, bordered)
- ✅ Replace and delete avatar
- ✅ File validation (type, size)
- ✅ Default placeholder when no avatar
- ✅ Group creation from templates
- ✅ Group visibility and member list settings
- ✅ Automatic group leader assignment
- ✅ My Groups page with group cards
- ✅ Complete RLS policies for groups

**Next Up:**
- 🔄 Group detail page (view individual group)
- Member management (invite, remove members)
- Role assignment interface
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

**Group Templates:**
- **Small Team** - For teams of 2-10 people
- **Large Group** - For groups of 10+ people
- **Organization** - For companies and institutions
- **Learning Cohort** - For learning groups going through journeys together

### Roles & Permissions
Fine-grained authorization system with role templates and group-specific instances. Permissions are context-based and customizable per group.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Image Optimization**: Next.js Image component with remote patterns
- **Deployment**: Vercel (planned)
- **Version Control**: Git + GitHub

## 📋 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Stefansteffansson/FringeIsland.git
   cd FringeIsland
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up Supabase Storage** (for avatars):
   - Create an `avatars` bucket (public)
   - Set up RLS policies (see documentation)

5. **Configure Next.js for images:**
   Update `next.config.ts` to include your Supabase domain in `remotePatterns`

6. **Run the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Current Features

**Authentication:**
- Sign up at `/signup`
- Sign in at `/login`
- View profile at `/profile` (protected)

**Profile Management:**
- Edit profile at `/profile/edit`
- Update full name and bio
- Upload profile picture
- Replace or delete avatar
- View profile information with avatar

**Groups:**
- View groups at `/groups`
- Create group at `/groups/create`
- Select from 4 group templates
- Set group properties and visibility
- Automatic group leader role assignment

## 📖 Project Structure

```
FringeIsland/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage
│   ├── layout.tsx                # Root layout with AuthProvider
│   ├── globals.css               # Global styles
│   ├── login/
│   │   └── page.tsx             # Login page
│   ├── signup/
│   │   └── page.tsx             # Signup page
│   ├── profile/
│   │   ├── page.tsx             # Profile display page (with avatar)
│   │   └── edit/
│   │       └── page.tsx         # Profile edit page (with avatar upload)
│   └── groups/
│       ├── page.tsx             # My Groups list page
│       └── create/
│           └── page.tsx         # Create group page
├── components/                   # Reusable components
│   ├── auth/
│   │   └── AuthForm.tsx         # Auth form component
│   ├── profile/
│   │   ├── ProfileEditForm.tsx  # Profile edit form component
│   │   └── AvatarUpload.tsx     # Avatar upload component
│   └── groups/
│       └── GroupCreateForm.tsx  # Group creation form component
├── docs/                         # Documentation
│   ├── architecture/            # Architecture docs
│   ├── planning/                # Planning docs
│   └── implementation/          # Implementation guides
├── lib/                         # Utilities
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Session helper
│   └── auth/
│       └── AuthContext.tsx     # Auth context and hooks
├── supabase/
│   └── migrations/             # Database migrations
├── .env.local                   # Environment variables (gitignored)
├── CHANGELOG.md                 # Version history
├── CLAUDE.md                    # Claude context file
├── next.config.ts               # Next.js configuration (with image domains)
└── README.md                    # This file
```

## 🤝 Contributing

This is a personal project currently in active development. Once the MVP is complete, contributions will be welcome!

## 📄 License

TBD - License to be determined

## 🔗 Links

- **Repository**: https://github.com/Stefansteffansson/FringeIsland
- **Supabase Project**: FringeIslandDB
- **Documentation**: [docs/](docs/)

## 📞 Contact

Stefan Steffansson - Project Creator & Developer

---

**Status**: Phase 2 in progress (45% complete) - Group creation working, group detail page next  
**Last Updated**: January 25, 2026
