# FringeIsland - Claude Context File

**Last Updated:** 2026-01-23  
**Project Version:** 0.2.0  
**Current Phase:** Phase 2 Core Platform (20% Complete)

---

## 🎯 Project Overview

FringeIsland is an educational and training platform for personal development, leadership training, and team/organizational development. Users embark on transformative "journeys" - structured learning experiences that can be taken solo, in pairs, or in groups.

**Repository:** https://github.com/Stefansteffansson/FringeIsland  
**Tech Stack:** Next.js 16.1 (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL)

---

## 📦 Current Status

### Phase 1: Foundation ✅ COMPLETE (January 21, 2026)

**Completed:**
- ✅ Architecture planning and documentation (32,000+ words)
- ✅ Database schema design with proper dependency ordering
- ✅ Supabase project created: FringeIslandDB
- ✅ Database deployed: 13 tables, 40 permissions, 5 role templates, 4 group templates
- ✅ All RLS policies and triggers implemented
- ✅ Next.js 16.1 initialized with TypeScript, Tailwind CSS, App Router
- ✅ Supabase integration complete (client/server utilities)
- ✅ Database connection verified and working
- ✅ Documentation updated

### Phase 2: Core Platform - Authentication ✅ COMPLETE (January 23, 2026)

**Completed:**
- ✅ **Authentication System** - Fully functional
  - User signup with email, password, and display name
  - User login with session management
  - User logout functionality
  - Protected routes with automatic redirects
  - Auth context (`AuthContext`) and `useAuth()` hook
  - Session persistence across page refreshes
- ✅ **Database Triggers** - User lifecycle management
  - Automatic user profile creation on signup
  - Soft delete trigger (users marked `is_active = false`, not deleted)
  - Fixed constraint: `users.auth_user_id` from CASCADE to SET NULL
  - Changed related constraints to RESTRICT (preserves data integrity)
- ✅ **Security Implementation**
  - Row Level Security (RLS) enabled on users table
  - RLS policies: users can view/update only their own profile
  - Secure authentication flow
- ✅ **UI Components**
  - Reusable `AuthForm` component for login/signup
  - Login page (`/login`)
  - Signup page (`/signup`)
  - Protected profile page (`/profile`)
  - Updated homepage with auth-aware navigation
- ✅ **Migration Files**
  - `20260120_initial_schema.sql` - Initial database setup
  - `20260123_fix_user_trigger_and_rls.sql` - User lifecycle and security

**Current State:**
- Authentication fully working and tested
- Soft delete verified (users marked inactive, not deleted)
- No console errors
- Production-ready code
- All changes committed to GitHub

### Phase 2: Remaining Tasks

**Upcoming:**
- [ ] User profile editing functionality
- [ ] Avatar upload
- [ ] Group creation and management UI
- [ ] Journey browsing and enrollment flows
- [ ] Basic permissions and roles UI

---

## 🗂️ Project Structure

```
FringeIsland/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage with auth-aware navigation
│   ├── layout.tsx                # Root layout with AuthProvider
│   ├── globals.css               # Global styles with Tailwind
│   ├── login/
│   │   └── page.tsx             # Login page
│   ├── signup/
│   │   └── page.tsx             # Signup page
│   ├── profile/
│   │   └── page.tsx             # Protected profile page
│   └── favicon.ico               # Site icon
├── components/                   # Reusable components
│   └── auth/
│       └── AuthForm.tsx         # Auth form component
├── docs/                         # Architecture documentation
│   ├── architecture/
│   │   ├── ARCHITECTURE.md       # System design (8,500 words)
│   │   ├── DATABASE_SCHEMA.md    # Complete schema v2.0 (9,000 words)
│   │   ├── AUTHORIZATION.md      # Permission system (7,000 words)
│   │   └── DOMAIN_ENTITIES.md    # Business entities (4,000 words)
│   ├── planning/
│   │   ├── ROADMAP.md            # Implementation phases (3,500 words)
│   │   └── DEFERRED_DECISIONS.md # Postponed decisions (1,500 words)
│   └── implementation/
│       ├── AUTH_IMPLEMENTATION.md # Auth system docs
│       └── INSTALLATION.md        # Auth installation guide
├── lib/
│   ├── supabase/                 # Supabase utilities
│   │   ├── client.ts             # Client-side Supabase client
│   │   ├── server.ts             # Server-side Supabase client
│   │   └── middleware.ts         # Session management helper
│   └── auth/                     # Authentication
│       └── AuthContext.tsx       # Auth context and hooks
├── public/                       # Static assets
├── supabase/
│   └── migrations/
│       ├── 20260120_initial_schema.sql          # Initial DB setup
│       └── 20260123_fix_user_trigger_and_rls.sql # User lifecycle & RLS
├── .env.local                    # Environment variables (gitignored)
├── .gitignore                    # Git ignore rules
├── CHANGELOG.md                  # Version history (v0.2.0)
├── CLAUDE.md                     # This file - Claude context
├── README.md                     # Project overview
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies
├── package-lock.json             # Locked dependencies
├── postcss.config.mjs            # PostCSS configuration
├── proxy.ts                      # Next.js 16 proxy middleware
└── tsconfig.json                 # TypeScript configuration
```

---

## 🔑 Important Information

### Supabase Configuration
- **Project Name:** FringeIslandDB
- **Project ID:** jveybknjawtvosnahebd
- **Project URL:** https://jveybknjawtvosnahebd.supabase.co
- **Region:** Europe (eu-central-2)
- **Database:** PostgreSQL with Row Level Security enabled
- **Tables:** 13 (users, groups, group_memberships, journeys, journey_enrollments, permissions, role_templates, group_templates, role_template_permissions, group_template_roles, group_roles, group_role_permissions, user_group_roles)

### Database Schema
- **Users:** Extended from Supabase auth.users with full_name, avatar_url, bio, is_active, etc.
- **Groups:** Flexible organizational units with hierarchy support
- **Permissions:** 40 atomic capabilities (group_management, journey_management, etc.)
- **Role Templates:** 5 system blueprints (Platform Admin, Group Leader, Travel Guide, Member, Observer)
- **Group Templates:** 4 organizational templates (Small Team, Large Group, Organization, Learning Cohort)

### Key Architectural Decisions
1. **Node-based Authorization:** Flexible group/role system vs rigid hierarchies
2. **Permission Inheritance:** Customizable between parent/child groups
3. **Group Leader Requirement:** Every group must have at least one group leader
4. **RLS Policies:** All tables protected with Row Level Security
5. **Validation Approach:** Triggers used instead of CHECK constraints with subqueries (PostgreSQL limitation)
6. **Soft Delete:** Users marked `is_active = false` instead of hard deletion (preserves data integrity)

---

## 🛠️ Technical Notes

### Critical Learnings
1. **PostgreSQL Constraint Limitation:** PostgreSQL does not allow subqueries in CHECK constraints. Use triggers instead for validation requiring subqueries.
2. **Next.js 16 Middleware:** Changed from `middleware.ts` to `proxy.ts` - export must be `export async function proxy()` not `middleware`
3. **Supabase New API Keys:** New publishable key format `sb_publishable_...` instead of old JWT format `eyJ...`
4. **File Structure:** Next.js App Router uses `app/` directory, not `src/`
5. **Column Naming:** Users table uses `full_name` not `display_name`
6. **Soft Delete Implementation:** Required changing `users.auth_user_id` constraint from CASCADE to SET NULL, and related table constraints to RESTRICT
7. **Auth Trigger Timing:** Database triggers on `auth.users` must fire AFTER operations to work correctly

### Environment Variables
Located in `.env.local` (gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=https://jveybknjawtvosnahebd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_1bqcWtIr7whPTvEwXmIj3g_RNxxDAia
```

### Development Commands
```bash
npm install              # Install dependencies
npm run dev             # Start development server (localhost:3000)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
```

### Git Workflow
```bash
git add .                           # Stage all changes
git commit -m "message"             # Commit with message
git push                            # Push to GitHub
```

---

## 📋 Next Session Checklist

When starting the next session, Claude should:

1. **Read this file** to get up to speed
2. **Check CHANGELOG.md** for latest changes (v0.2.0)
3. **Review Phase 2 remaining tasks**
4. **Ask user** what they want to work on next

### Suggested Next Steps (Phase 2 Remaining)

1. **User Profile Management** (2-3 hours)
   - Profile editing functionality
   - Avatar upload with Supabase Storage
   - Update profile form
   - Profile page enhancements

2. **Group Management** (4-5 hours)
   - Group creation UI
   - Group listing/browsing
   - Member management (add/remove)
   - Role assignment interface
   - Group settings

3. **Journey Browsing** (3-4 hours)
   - Journey catalog/listing
   - Journey detail pages
   - Enrollment functionality
   - View enrolled journeys

4. **Permissions & Roles UI** (2-3 hours)
   - Display user roles
   - Permission-based UI elements
   - Role management interface

---

## 🔄 Version History

- **v0.2.0** (2026-01-23): Phase 2 Authentication complete - signup, login, logout, soft delete, RLS
- **v0.1.2** (2026-01-21): Phase 1 complete - Next.js setup and Supabase integration working
- **v0.1.1** (2026-01-20): Database successfully implemented and deployed to Supabase
- **v0.1.0** (2026-01-20): Initial architecture and database schema design

---

## 📝 Notes for Claude

### Memory Management
- Use this file instead of relying on Claude's limited memory system
- Update this file at the end of major work sessions
- Read this file at the start of each new session

### Documentation Guidelines
- Always update root README.md when important files are added, deleted, or renamed
- Alert user when README.md needs to be committed to git after updates
- Update CHANGELOG.md for all significant changes
- Update this CLAUDE.md file when major milestones are reached

### Development Practices
- Follow the established patterns in `lib/supabase/` for Supabase integration
- Use TypeScript strict mode
- Follow existing code style (ESLint configuration)
- Test database connections before implementing new features
- Always verify RLS policies are working as expected
- Test soft delete functionality when modifying user-related code

### Authentication Notes
- Auth context is in `lib/auth/AuthContext.tsx`
- Use `useAuth()` hook to access user state in components
- Protected routes should check `user` and `loading` states
- Soft delete preserves user data with `is_active = false`
- User profile automatically created on signup via database trigger

---

## 🎯 Current Focus

**Just Completed:** Full authentication system with soft delete ✅  
**Progress:** Phase 2 - 20% complete  
**Next Up:** User profile management OR group management (user's choice)

---

**End of Claude Context File**  
*Last major update: Authentication system completion (v0.2.0)*
