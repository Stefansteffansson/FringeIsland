# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Journey browsing and enrollment flows
- Advanced permissions and roles UI

---

## [0.2.7] - 2026-01-26

### Added
- **Edit Group Functionality**: Group Leaders can now edit group settings
  - Edit group page at `/groups/[id]/edit` route
  - Edit group name (required, max 100 characters)
  - Edit description (optional, max 500 characters)
  - Edit label (optional, max 50 characters)
  - Toggle public/private visibility
  - Toggle show member list setting
  - Form validation with user-friendly error messages
  - Authorization check (only Group Leaders can access)
  - Success redirect back to group page after save
  - Loading states during save operation

- **Invite Members Integration**: Connected existing InviteMemberModal to group detail page
  - "Invite Now" button in Quick Actions section (replaces "Coming Soon")
  - Email-based invitation system
  - Validation checks:
    - Valid email format
    - User exists in database
    - Not already a member
    - No pending invitation
  - Success messages with automatic modal close
  - Member list auto-refresh after successful invite

### Changed
- Updated group detail page (`app/groups/[id]/page.tsx`)
  - Added InviteMemberModal import and state management
  - Stored userData for invite modal usage
  - Changed "Invite Members" button from "Coming Soon" to functional "Invite Now"
  - Added invite modal rendering at end of page
  - Quick Actions section now only visible to Group Leaders

### Fixed
- Edit Group button was linking to non-existent route
  - Button existed but `/groups/[id]/edit` route was never implemented
  - Created complete edit group page with full functionality

### Technical Details
- Edit group form updates `groups` table with `updated_at` timestamp
- Invitation creates `group_memberships` record with status='invited'
- RLS policies handle authorization for both features
- Modal-based UI for better user experience
- Immediate UI updates after successful operations

---

## [0.2.6.2] - 2026-01-26

### Added
- **Role Assignment UI**: Complete interface for managing member roles
  - AssignRoleModal component for assigning/removing roles
  - Promote to Group Leader functionality
  - Assign multiple roles to members
  - Remove roles from members
  - Real-time role updates in member list

### Fixed
- **Last Leader Protection UI**: Hide × button when member is the last Group Leader
  - Previous: Button visible but disabled (confusing)
  - Now: Button hidden completely with explanatory text
- **Immediate State Updates**: Role changes now update UI instantly
  - Fixed: Role buttons showing stale state after changes
  - Solution: Update both members array AND userRoles state
  - Pattern: `setMembers(...)` + `setUserRoles(...)` + `setIsLeader(...)`

### Changed
- Default landing page changed from `/profile` to `/groups`
  - AuthForm redirect updated for better UX
  - Users land on groups list after login/signup

### Technical Details
- Member data fetching enhanced to include role IDs for filtering
- State management pattern established for role changes
- Component: `components/groups/AssignRoleModal.tsx`

---

## [0.2.5] - 2026-01-25

### Added
- **Member Management System**: Complete member lifecycle management
  - Invite members by email (Group Leaders only)
  - Accept/decline invitations (`/invitations` page)
  - Leave groups (all members)
  - Remove members (Group Leaders only)
  - Last leader protection via database trigger
  - Real-time member count updates
  - InviteMemberModal component (`components/groups/InviteMemberModal.tsx`)

- **Global Navigation Bar**: Persistent navigation across all pages
  - Navigation component (`components/Navigation.tsx`)
  - Real-time invitation badge (shows pending count)
  - User menu dropdown with avatar
  - Active page indicators
  - Auto-updating on data changes
  - Responsive design (mobile & desktop)

- **Beautiful Confirmation Modals**: Replaced all browser alerts
  - ConfirmModal component (`components/ui/ConfirmModal.tsx`)
  - Reusable modal for all confirmations
  - Smooth animations and loading states
  - Consistent UX across the app

- **Database Trigger**: Automatic last leader protection
  - Migration: `20260125_6_prevent_last_leader_removal.sql`
  - Prevents deletion of last Group Leader role
  - Database-level enforcement for data integrity

### Changed
- Updated root layout (`app/layout.tsx`) with Navigation component
- Replaced all `window.alert()` and `window.confirm()` with ConfirmModal
- Enhanced group detail page with member management actions
- Improved invitations page with accept/decline functionality

### Technical Details
- Custom events for navigation refresh (`refreshNavigation`)
- RLS policies updated for invitation management
- Database trigger for last leader protection
- Modal-based UI pattern established

---

## [0.2.1] - 2026-01-24

### Added
- **User Profile Management**: Complete profile editing functionality
  - Profile edit page at `/profile/edit` route
  - Edit full name (required, min 2 characters, max 100 characters)
  - Edit bio (optional, max 500 characters)
  - Character counter for bio field
  - Form validation with user-friendly error messages
  - Success messages with automatic redirect after save
  - Cancel button to return to profile without saving
- **Enhanced Profile Display**:
  - Improved profile page layout with better styling
  - Display full name, email, bio, and account creation date
  - "Edit Profile" button for easy access to editing
  - Placeholder sections for upcoming features (avatar, groups, journeys)
  - Empty state message when bio is not set
- **New Components**:
  - `ProfileEditForm` component (`components/profile/ProfileEditForm.tsx`)
  - Reusable form component with validation and error handling
  - Loading states during save operation
  - Disabled form fields while saving to prevent double submission

### Changed
- Updated profile page (`app/profile/page.tsx`) with enhanced UI
  - Better visual hierarchy and spacing
  - Gradient background matching app theme
  - Improved button styling and layout
  - Added "Coming Soon" feature preview section

### Technical Details
- Profile data persisted to Supabase `users` table
- Client-side validation before database update
- Automatic timestamp update (`updated_at`) on profile save
- Uses existing RLS policies (users can only edit their own profile)

---

## [0.2.0] - 2026-01-23

### Added
- **Complete Authentication System**: Full Supabase Auth integration
  - User registration (signup) with email, password, and display name
  - User login with email/password authentication
  - User logout functionality
  - Session management with automatic persistence
  - Protected routes (profile page with redirect logic)
  - Auth context (`AuthContext`) for global state management
  - `useAuth()` hook for accessing auth state in components
- **Auth UI Components**:
  - Reusable `AuthForm` component for login and signup
  - Login page at `/login` route
  - Signup page at `/signup` route
  - Profile page at `/profile` route (protected)
  - Updated homepage with auth-aware navigation
- **Database Triggers for User Lifecycle**:
  - Automatic user profile creation trigger on signup
  - Soft delete trigger when user account is deleted
  - Users marked as `is_active = false` instead of hard deletion
- **Database Schema Fixes**:
  - Fixed user creation trigger to use `full_name` column (not `display_name`)
  - Changed `users.auth_user_id` constraint from CASCADE to SET NULL
  - Changed related table constraints (user_group_roles, group_memberships, journey_enrollments) from CASCADE to RESTRICT
- **Security Enhancements**:
  - Enabled Row Level Security (RLS) on users table
  - Added RLS policies for user data access (view and update own profile)
  - Users can only access their own profile data
- **Documentation**:
  - Complete authentication implementation guide
  - Migration file: `20260123_fix_user_trigger_and_rls.sql`

### Changed
- Updated `app/layout.tsx` to wrap app with AuthProvider
- Updated `app/page.tsx` with auth-aware navigation and welcome messages
- Updated `lib/auth/AuthContext.tsx` - removed automatic profile creation (now handled by database trigger)

### Technical Details
- Authentication: Supabase Auth with email/password
- User lifecycle: Database triggers for creation and soft deletion
- Protected routes: Client-side redirect logic with useAuth hook

---

## [0.1.2] - 2026-01-21

### Added
- **Next.js Project Setup**: Complete Next.js 14+ initialization with App Router
  - TypeScript configuration with strict mode
  - Tailwind CSS for styling
  - ESLint for code quality
  - Project structure organized in repository root
- **Supabase Integration**: Full client/server integration
  - Client-side Supabase client (`lib/supabase/client.ts`)
  - Server-side Supabase client with cookie handling (`lib/supabase/server.ts`)
  - Proxy middleware for session management (`proxy.ts`)
  - Environment variables configured (`.env.local`)
- **Database Connection**: Verified and tested
  - Successfully fetching data from Supabase
  - RLS policies working correctly
  - Test page displaying permissions from database

### Changed
- Updated `.gitignore` with Next.js-specific entries
  - Added `.next`, `out`, `build` directories
  - Added environment variable files
  - Added TypeScript build info
- Migrated from `middleware.ts` to `proxy.ts` (Next.js 16 convention)
- Updated home page (`app/page.tsx`) with database connection test

### Technical Details
- Next.js: 16.1.4 with Turbopack
- Supabase packages: `@supabase/supabase-js`, `@supabase/ssr`
- Development server: Running on http://localhost:3000
- **Phase 1: Foundation** ✅ **COMPLETE**

---

## [0.1.1] - 2026-01-20

### Added
- **Database Implementation**: Successfully deployed complete database schema to Supabase
  - 13 tables created (all core and authorization tables)
  - 40 permissions seeded into database
  - 5 role templates seeded (Platform Admin, Group Leader, Travel Guide, Member, Observer)
  - 4 group templates seeded (Small Team, Large Group, Organization, Learning Cohort)
  - All indexes, triggers, and RLS policies successfully deployed
  - Validation trigger added for user_group_roles to ensure role-group consistency

### Fixed
- Replaced CHECK constraint with trigger in `user_group_roles` table (PostgreSQL doesn't support subqueries in CHECK constraints)
- Updated migration script with corrected user_group_roles validation approach

### Technical Details
- Database: Fully operational with 13 tables, RLS enabled on all tables
- Seed Data: 40 permissions, 5 role templates, 4 group templates
- Phase: Database Implementation ✅ Complete

---

## [0.1.0] - 2026-01-20

### Added
- **Database Schema v2.0**: Complete PostgreSQL schema with proper dependency ordering
  - Core tables: users, groups, group_memberships, journeys, journey_enrollments
  - Authorization tables: permissions, role_templates, group_templates, role_template_permissions, group_template_roles, group_roles, group_role_permissions, user_group_roles
  - Row Level Security (RLS) policies for all tables
  - Comprehensive indexes for performance optimization
  - Seed data for permissions, role templates, and group templates
- **Migration Script**: `fringeisland_migration.sql` for automated database setup
- **Architecture Documentation**:
  - `ARCHITECTURE.md`: Overall system design and core concepts
  - `DATABASE_SCHEMA.md`: Complete database schema with RLS policies
  - `AUTHORIZATION.md`: Detailed permission system design
  - `DOMAIN_ENTITIES.md`: Core business entities and relationships
  - `ROADMAP.md`: Implementation phases and milestones
  - `DEFERRED_DECISIONS.md`: Architectural decisions postponed to later phases
- **Project Documentation**:
  - `README.md`: Project overview, vision, and current status
  - `CHANGELOG.md`: Version history and changes tracking
  - `.gitignore`: Git ignore rules for Node.js and common editor files
- **Supabase Project**: Created FringeIslandDB database instance

### Changed
- Reorganized database table creation order to resolve foreign key dependency issues
  - Moved `permissions`, `role_templates`, and `group_templates` before `groups`
  - Ensured all referenced tables are created before tables that reference them
- Updated documentation structure for better clarity and navigation

### Technical Details
- Stack: Next.js 14+, TypeScript, React, Supabase (PostgreSQL)
- Database: PostgreSQL with Row Level Security
- Authorization: Flexible node/group-based permission system
- Phase: Architecture & Planning → Database Implementation

---

## Project Phases

### Phase 1: Foundation ✅ COMPLETE
**Status**: Complete  
**Timeline**: January 2026

- [x] Complete architecture planning
- [x] Design database schema
- [x] Document authorization system
- [x] Create comprehensive roadmap
- [x] Set up Supabase project
- [x] Implement database schema
- [x] Verify RLS policies
- [x] Set up development environment
- [x] Initialize Next.js project
- [x] Configure Supabase integration
- [x] Test database connection

### Phase 2: Core Platform (In Progress - 70% Complete)
**Timeline**: January - February 2026

- [x] **Implement authentication system** ✅ COMPLETE
  - [x] User signup with email/password
  - [x] User login functionality
  - [x] User logout functionality
  - [x] Session management
  - [x] Protected routes
  - [x] Auth context and hooks
  - [x] Database triggers for user lifecycle

- [x] **User profile management** ✅ COMPLETE
  - [x] Profile editing functionality
  - [x] Edit full name and bio
  - [x] Form validation
  - [x] Enhanced profile display
  - [x] Avatar upload (v0.2.5)

- [x] **Group management** ✅ COMPLETE
  - [x] Group creation
  - [x] View groups (list and detail)
  - [x] Edit group settings (v0.2.7)
  - [x] Invite members by email (v0.2.5 + v0.2.7 UI connection)
  - [x] Accept/decline invitations (v0.2.5)
  - [x] Leave groups (v0.2.5)
  - [x] Remove members (v0.2.5)
  - [x] Role assignment UI (v0.2.6.2)
  - [x] Last leader protection (v0.2.5)

- [x] **Navigation & UX** ✅ COMPLETE
  - [x] Global navigation bar (v0.2.5)
  - [x] Invitation badges (v0.2.5)
  - [x] User menu dropdown (v0.2.5)
  - [x] Confirmation modals (v0.2.5)
  - [x] Responsive design (v0.2.5)

- [ ] **Journey browsing** (Next)
  - [ ] Journey catalog
  - [ ] Journey details
  - [ ] Enrollment

- [ ] **Basic permissions UI**
  - [ ] Display user roles
  - [ ] Permission-based UI elements

### Phase 3: Journey Experience (Planned)
**Timeline**: Q2 2026

### Phase 4: Enhanced Features (Planned)
**Timeline**: Q3-Q4 2026
