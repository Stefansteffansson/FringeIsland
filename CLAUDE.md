# FringeIsland - Claude Context File

**Last Updated:** 2026-01-21  
**Project Version:** 0.1.2  
**Current Phase:** Phase 1 Complete → Phase 2 Beginning

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
- ✅ Documentation updated (CHANGELOG v0.1.2, README with setup guide)

**Current State:**
- Development server runs successfully on http://localhost:3000
- Database connection test page displays permissions correctly
- All files committed to GitHub (22 commits total)

### Phase 2: Core Platform (Next - Planned for February-March 2026)

**Upcoming Tasks:**
- [ ] Implement authentication system (signup, login, logout)
- [ ] Build user profile management
- [ ] Create group creation and management UI
- [ ] Develop journey browsing and enrollment flows
- [ ] Implement basic permissions and roles UI

---

## 🗂️ Project Structure

```
FringeIsland/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page with DB connection test
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── favicon.ico               # Site icon
├── docs/                         # Architecture documentation
│   ├── architecture/
│   │   ├── ARCHITECTURE.md       # System design (8,500 words)
│   │   ├── DATABASE_SCHEMA.md    # Complete schema v2.0 (9,000 words)
│   │   ├── AUTHORIZATION.md      # Permission system (7,000 words)
│   │   └── DOMAIN_ENTITIES.md    # Business entities (4,000 words)
│   └── planning/
│       ├── ROADMAP.md            # Implementation phases (3,500 words)
│       └── DEFERRED_DECISIONS.md # Postponed decisions (1,500 words)
├── lib/
│   └── supabase/                 # Supabase utilities
│       ├── client.ts             # Client-side Supabase client
│       ├── server.ts             # Server-side Supabase client
│       └── middleware.ts         # Session management helper
├── public/                       # Static assets
├── supabase/
│   └── migrations/
│       └── 20260120_initial_schema.sql  # Complete DB setup (13 tables)
├── .env.local                    # Environment variables (gitignored)
├── .gitignore                    # Git ignore rules
├── CHANGELOG.md                  # Version history (v0.1.2)
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
- **Users:** Extended from Supabase auth.users with display_name, avatar_url, etc.
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

---

## 🛠️ Technical Notes

### Critical Learnings
1. **PostgreSQL Constraint Limitation:** PostgreSQL does not allow subqueries in CHECK constraints. Use triggers instead for validation requiring subqueries.
2. **Next.js 16 Middleware:** Changed from `middleware.ts` to `proxy.ts` - export must be `export async function proxy()` not `middleware`
3. **Supabase New API Keys:** New publishable key format `sb_publishable_...` instead of old JWT format `eyJ...`
4. **File Structure:** Next.js App Router uses `app/` directory, not `src/`

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
2. **Check CHANGELOG.md** for latest changes
3. **Review Phase 2 tasks** in the roadmap
4. **Ask user** what they want to work on next

### Suggested Next Steps (Phase 2)
1. **Authentication Setup** (2-3 hours)
   - Set up Supabase Auth
   - Create login/signup pages
   - Implement protected routes
   - Add auth context/hooks

2. **User Profile** (1-2 hours)
   - Create profile page
   - Edit profile functionality
   - Avatar upload

3. **Group Management** (3-4 hours)
   - Group creation UI
   - Group listing/browsing
   - Member management
   - Role assignment

---

## 🔄 Version History

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

### Development Practices
- Follow the established patterns in `lib/supabase/` for Supabase integration
- Use TypeScript strict mode
- Follow existing code style (ESLint configuration)
- Test database connections before implementing new features
- Always verify RLS policies are working as expected

---

**End of Claude Context File**  
*This file should be updated regularly to maintain accurate project context*
