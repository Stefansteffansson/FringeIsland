# FringeIsland - Claude Context File

**Last Updated:** 2026-01-25  
**Project Version:** 0.2.4  
**Current Phase:** Phase 2 Core Platform (48% Complete)

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

### Phase 2: Core Platform (In Progress - 45% Complete)

#### ✅ Authentication System (v0.2.0 - January 23, 2026)
**Completed:**
- ✅ User signup with email, password, and display name
- ✅ User login with session management
- ✅ User logout functionality
- ✅ Protected routes with automatic redirects
- ✅ Auth context (`AuthContext`) and `useAuth()` hook
- ✅ Session persistence across page refreshes
- ✅ Database triggers for user lifecycle (auto profile creation, soft delete)
- ✅ Row Level Security on users table
- ✅ Migration: `20260123_fix_user_trigger_and_rls.sql`

#### ✅ User Profile Management (v0.2.1 - January 24, 2026)
**Completed:**
- ✅ Profile editing functionality (full name and bio)
- ✅ Profile edit page at `/profile/edit`
- ✅ Form validation with character limits (name: 2-100, bio: 500)
- ✅ Enhanced profile display with better styling
- ✅ Success messages and automatic redirect
- ✅ ProfileEditForm component created

#### ✅ Avatar Upload (v0.2.2 - January 24, 2026)
**Completed:**
- ✅ Image upload to Supabase Storage (`avatars` bucket)
- ✅ File validation (JPG/PNG/WebP, max 2MB)
- ✅ Real-time image preview
- ✅ Circular avatar display (96px on profile, 128px on edit page)
- ✅ Replace and delete avatar functionality
- ✅ Default placeholder (👤 emoji)
- ✅ Next.js Image component configuration
- ✅ Supabase Storage RLS policies
- ✅ AvatarUpload component created

#### ✅ Group Creation (v0.2.3 - January 25, 2026)
**Completed:**
- ✅ Group creation from templates (Small Team, Large Group, Organization, Learning Cohort)
- ✅ Group creation form with validation
  - Group name (required, 3-100 chars)
  - Description (optional, max 500 chars)
  - Custom label (optional, max 50 chars)
  - Visibility settings (public/private, show member list)
- ✅ Automatic 5-step workflow:
  1. Create group record
  2. Add creator as member
  3. Fetch "Group Leader" role template
  4. Create group role instance
  5. Assign creator as group leader
- ✅ My Groups page (`/groups`) with group cards
- ✅ Group creation page (`/groups/create`)
- ✅ Complete RLS policies (12 policies across 5 tables)
- ✅ Migration: `20260125_group_rls_policies.sql`
- ✅ GroupCreateForm component created
- ✅ Empty state, loading states, error handling

#### ✅ Group Detail Page (v0.2.4 - January 25, 2026)
**Completed:**
- ✅ Dynamic route at `/groups/[id]` for viewing individual groups
- ✅ Display group information (name, description, label, visibility)
- ✅ Show user's role badges in the group
- ✅ Member list with avatars and roles (if enabled or user is leader)
- ✅ "Edit Group" button (leaders only)
- ✅ Access control (members can view their groups, public groups visible to all)
- ✅ Error page for unauthorized access or non-existent groups
- ✅ Fixed RLS policy conflicts (combined two SELECT policies into one)
- ✅ Improved error handling with `.maybeSingle()`
- ✅ Migration: `20260125_fix_groups_rls_policy.sql`

**Current State:**
- Authentication, profiles, avatars, group creation, and group detail page all fully working
- 48% of Phase 2 complete
- Group Management Step 2 of 4 complete
- Production-ready code
- All changes committed to GitHub

### Phase 2: Remaining Tasks

**Group Management (Steps 3-4):**
- [ ] Step 3: Member management (invite, remove members, leave group)
- [ ] Step 4: Role assignment (assign roles to members)

**Other Features:**
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
│   │   ├── page.tsx             # Profile display (with avatar)
│   │   └── edit/
│   │       └── page.tsx         # Profile edit (with avatar upload)
│   ├── groups/
│   │   ├── page.tsx             # My Groups list
│   │   ├── create/
│   │   │   └── page.tsx         # Create group
│   │   └── [id]/
│   │       └── page.tsx         # Group detail page
│   └── favicon.ico               # Site icon
├── components/                   # Reusable components
│   ├── auth/
│   │   └── AuthForm.tsx         # Auth form component
│   ├── profile/
│   │   ├── ProfileEditForm.tsx  # Profile edit form
│   │   └── AvatarUpload.tsx     # Avatar upload component
│   └── groups/
│       └── GroupCreateForm.tsx  # Group creation form
├── docs/                         # Architecture documentation
│   ├── architecture/
│   │   ├── ARCHITECTURE.md       # System design (8,500 words)
│   │   ├── DATABASE_SCHEMA.md    # Complete schema v2.0 (9,000 words)
│   │   ├── AUTHORIZATION.md      # Permission system (7,000 words)
│   │   └── DOMAIN_ENTITIES.md    # Business entities (4,000 words)
│   ├── planning/
│   │   ├── ROADMAP.md            # Implementation phases (3,500 words)
│   │   └── DEFERRED_DECISIONS.md # Postponed decisions (1,500 words)
│   ├── implementation/
│   │   ├── AUTH_IMPLEMENTATION_SUMMARY.md
│   │   └── INSTALLATION.md
│   └── README.md                 # Documentation index
├── lib/
│   ├── supabase/                # Supabase utilities
│   │   ├── client.ts             # Client-side Supabase client
│   │   ├── server.ts             # Server-side Supabase client
│   │   └── middleware.ts         # Session management helper
│   └── auth/                     # Authentication
│       └── AuthContext.tsx       # Auth context and hooks
├── public/                       # Static assets
├── supabase/
│   └── migrations/
│       ├── 20260120_initial_schema.sql          # Initial DB setup
│       ├── 20260123_fix_user_trigger_and_rls.sql # User lifecycle & RLS
│       ├── 20260125_group_rls_policies.sql      # Group RLS policies
│       └── 20260125_fix_groups_rls_policy.sql   # Fix group viewing RLS
├── .env.local                    # Environment variables (gitignored)
├── .gitignore                    # Git ignore rules
├── CHANGELOG.md                  # Version history (v0.2.4)
├── CLAUDE.md                     # This file - Claude context
├── README.md                     # Project overview
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration (with image domains)
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
- **Storage:** Avatars bucket configured with RLS policies
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

#### Database & PostgreSQL
1. **PostgreSQL Constraint Limitation:** PostgreSQL does not allow subqueries in CHECK constraints. Use triggers instead for validation requiring subqueries.
2. **CASCADE Constraints:** Can prevent soft delete triggers from working. Use SET NULL and RESTRICT instead.
3. **Column Naming:** Users table uses `full_name` not `display_name`
4. **Auth Trigger Timing:** Database triggers on `auth.users` must fire AFTER operations to work correctly

#### Next.js & Frontend
5. **Next.js 16 Middleware:** Changed from `middleware.ts` to `proxy.ts` - export must be `export async function proxy()` not `middleware`
6. **File Structure:** Next.js App Router uses `app/` directory, not `src/`
7. **Image Configuration:** Must add Supabase domain to `next.config.ts` remotePatterns for avatar images
8. **Supabase New API Keys:** New publishable key format `sb_publishable_...` instead of old JWT format `eyJ...`

#### Group Creation & RLS (v0.2.3)
9. **RLS Requirements:** Must both ENABLE RLS *and* create policies (two separate steps)
10. **group_roles Schema:** Table requires `name` field (not `custom_name`) and uses `created_from_role_template_id` (not `role_template_id`)
11. **user_group_roles Schema:** Requires `assigned_by_user_id` field for audit trail
12. **RLS Policy Complexity:** Simplified policies work better for initial workflows. Complex permission checks can be added later.
13. **Error Debugging:** Browser Network tab → Response tab shows detailed database error messages (crucial for debugging RLS issues)
14. **Query Performance:** Use two-step queries (get IDs, then fetch data) instead of nested Supabase queries for better reliability

#### Group Detail Page & RLS (v0.2.4)
15. **RLS Policy Conflicts:** Multiple SELECT policies with conflicting logic can interfere with each other. Use single policy with OR logic instead.
16. **maybeSingle() vs single():** Use `.maybeSingle()` when a query might return no results (e.g., checking if group exists). Use `.single()` only when exactly one result is guaranteed.
17. **406 Errors:** Usually indicate RLS policy blocking the query, not a database error
18. **Combined RLS Policies:** For viewing resources, combine "view own" and "view public" into one policy with OR logic for better performance and fewer conflicts

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
2. **Check CHANGELOG.md** for latest changes (v0.2.4)
3. **Review Phase 2 remaining tasks**
4. **Ask user** what they want to work on next

### Suggested Next Steps (Phase 2 Remaining)

1. **Member Management** (3-4 hours) - RECOMMENDED NEXT
   - Invite members by email
   - Accept/decline invitations
   - Remove members (leaders only)
   - Leave group (members)
   - Member list with roles

2. **Role Assignment** (2-3 hours)
   - View available roles for group
   - Assign roles to members (leaders only)
   - Change member roles
   - View member permissions

4. **Journey Browsing** (3-4 hours)
   - Journey catalog/listing
   - Journey detail pages
   - Enrollment functionality
   - View enrolled journeys

5. **Permissions & Roles UI** (2-3 hours)
   - Display user roles
   - Permission-based UI elements
   - Role management interface

---

## 🔄 Version History

- **v0.2.4** (2026-01-25): Group detail page complete - view groups, member list, role badges, RLS fix (48% Phase 2)
- **v0.2.3** (2026-01-25): Group creation complete - create groups, My Groups page, 12 RLS policies (45% Phase 2)
- **v0.2.2** (2026-01-24): Avatar upload complete - Supabase Storage integration, image upload/delete (40% Phase 2)
- **v0.2.1** (2026-01-24): Profile management complete - edit name/bio, form validation (30% Phase 2)
- **v0.2.0** (2026-01-23): Authentication complete - signup, login, logout, soft delete, RLS (20% Phase 2)
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
- Create migration files for all RLS policy changes

### Development Practices
- Follow the established patterns in `lib/supabase/` for Supabase integration
- Use TypeScript strict mode
- Follow existing code style (ESLint configuration)
- Test database connections before implementing new features
- Always verify RLS policies are working as expected
- Check browser Network tab for detailed database errors
- Test with actual data, not just empty states
- Use simplified RLS policies initially, can be made more complex later

### Authentication Notes
- Auth context is in `lib/auth/AuthContext.tsx`
- Use `useAuth()` hook to access user state in components
- Protected routes should check `user` and `loading` states
- Soft delete preserves user data with `is_active = false`
- User profile automatically created on signup via database trigger

### Group Management Notes (v0.2.3-v0.2.4)
- Group creation uses 5-step automated workflow
- Creator automatically becomes group leader
- RLS policies enable self-assignment for initial setup
- group_roles requires both `name` and `created_from_role_template_id`
- user_group_roles requires `assigned_by_user_id` for audit
- Always enable RLS AND create policies (two separate steps)
- **Group viewing:** Use combined RLS policy with OR logic to avoid conflicts
- **Dynamic routes:** `[id]` directory creates Next.js dynamic route
- **Error handling:** Use `.maybeSingle()` when results might be empty
- **RLS conflicts:** Multiple SELECT policies can interfere; combine into one policy

---

## 🎯 Current Focus

**Just Completed:** Group detail page with RLS fix ✅  
**Progress:** Phase 2 - 48% complete  
**Next Up:** Member management (Step 3 of Group Management)

---

**End of Claude Context File**  
*Last major update: Group detail page completion (v0.2.4)*
