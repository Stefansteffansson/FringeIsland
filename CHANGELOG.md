# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Journey enrollment (individual and group)
- Journey content delivery system
- Progress tracking
- Communication features (forums, messaging)

---

## [0.2.9] - 2026-01-27

### Added
- **Error Handling System** (Complete implementation)
  - ErrorBoundary component (`components/ui/ErrorBoundary.tsx`)
  - Route error page (`app/error.tsx`) with "Try Again" functionality
  - Global error handler (`app/global-error.tsx`) for critical errors
  - Custom 404 page (`app/not-found.tsx`) with branded messaging
  - Integrated ErrorBoundary into root layout
  - Development mode shows detailed error information
  - Production mode shows user-friendly messages
  - Recovery options: "Try Again", "Go Home", "Reload App"

### Changed
- **Navigation Component** - Now displays for logged-out users
  - Shows "Sign In" and "Get Started" buttons on homepage
  - Consistent navigation UI across entire application
- **Homepage** - Removed duplicate navigation component
  - Cleaner code structure
  - Relies on global Navigation component

### Fixed
- Duplicate navigation code eliminated
- Improved error resilience across the app
- Better user experience when errors occur

### Technical Details
- Error boundaries catch component-level errors
- Next.js error pages handle route and global errors
- All error pages are client components
- Ready for error tracking service integration (Sentry, LogRocket, etc.)

---

## [0.2.8] - 2026-01-27

### Added
- **Journey System - Catalog & Browsing** (Phase 1.4 Part 1)
  - Journey catalog page (`/journeys`) with grid layout
  - Search functionality (title and description)
  - Filter by difficulty level (beginner, intermediate, advanced)
  - Filter by topic/tags
  - Results counter and clear filters option
  - Journey detail page (`/journeys/[id]`) with comprehensive layout:
    - Hero section with gradient background
    - Breadcrumb navigation
    - Two-tab interface (Overview and Curriculum)
    - Expandable step list with step details
    - Sticky sidebar with journey metadata
    - "Enroll in Journey" CTA button (placeholder)
- **Database Migration #9**: Seed 8 predefined journeys
  - Leadership Fundamentals (180 min, Beginner)
  - Effective Communication Skills (240 min, Beginner)
  - Building High-Performance Teams (300 min, Intermediate)
  - Personal Development Kickstart (150 min, Beginner)
  - Strategic Decision Making (270 min, Advanced)
  - Emotional Intelligence at Work (210 min, Intermediate)
  - Agile Team Collaboration (200 min, Intermediate)
  - Resilience and Stress Management (180 min, Beginner)
- **TypeScript Types**: Complete journey type definitions (`lib/types/journey.ts`)
  - Journey, JourneyContent, JourneyStep interfaces
  - JourneyEnrollment, JourneyFilters types
  - Type guards and utility types
- **Navigation Update**: Added "Journeys" link (🗺️) to global navigation bar

### Technical Details
- Migration file: `20260127_seed_predefined_journeys.sql` (uses first active user as creator)
- Journey content stored as JSONB with structured steps
- All journeys marked as published and public
- Responsive design works on mobile, tablet, and desktop
- Error handling for missing or unpublished journeys
- Loading states for async data fetching

### Implementation Stats
- **New Files**: 4 (migration, types, 2 pages)
- **Modified Files**: 1 (Navigation.tsx)
- **Lines of Code**: ~1200
- **Database Records**: 8 journeys with complete metadata and content

---

## [0.2.7] - 2026-01-26

### Added
- **Edit Group Page** (`/groups/[id]/edit`)
  - Edit group name, description, label
  - Toggle public/private visibility
  - Toggle show member list setting
  - Authorization check (Group Leaders only)
  - Responsive form with validation
- **Invite Member Modal Integration**
  - Connected InviteMemberModal to Edit Group page
  - "Invite Members" button on edit page
  - Modal shows member invitation form
  - Real-time invitation count updates

### Changed
- **Navigation Component**: Added invitation badge refresh on custom events
- **Edit Group Page**: Full implementation with all group settings

### Fixed
- Invitation count now updates when members are invited
- Navigation refreshes automatically after group changes

### Technical Details
- Phase 1.3 Group Management: 100% COMPLETE
- All core group management features implemented
- Ready for Phase 1.4: Journey System

---

## [0.2.6.2] - 2026-01-26

### Added
- **Role Assignment UI** (Complete implementation)
  - Promote member to Group Leader button
  - Assign/remove role modal (AssignRoleModal component)
  - Role badge display on member list
  - Multiple roles per member support
  - Last leader protection (cannot remove last leader)

### Changed
- Member list shows role badges for all assigned roles
- Role management integrated into group detail page
- State updates properly after role changes

### Fixed
- Last leader × button now completely hidden (not just disabled)
- Role state synchronization after changes
- isLeader state properly updated after role assignments

### Technical Details
- New component: `components/groups/AssignRoleModal.tsx`
- Updated: Group detail page with role management
- Full integration of role assignment with existing permissions

---

## [0.2.6.1] - 2026-01-26

### Fixed
- **AssignRoleModal**: Fixed role assignment logic
  - Now correctly checks for existing roles before adding
  - Prevents duplicate role assignments
  - Improved state management after role changes

---

## [0.2.6] - 2026-01-26

### Added
- **Role Assignment Modal** (Initial implementation)
  - Modal component for assigning/removing roles
  - Displays available roles for the group
  - Shows which roles member currently has
  - Assign/remove functionality
  - Database integration with user_group_roles table

### Changed
- Group detail page now includes "Assign Role" button for leaders
- Member state updates after role changes

### Technical Details
- New component: `components/groups/AssignRoleModal.tsx`
- Uses Supabase RPC or direct queries for role management

---

## [0.2.5] - 2026-01-26

### Added
- **Member Management System**
  - Invite members by email (stores as 'invited' status)
  - Accept/decline invitations (dedicated `/invitations` page)
  - Leave groups (with last leader protection)
  - Remove members (Group Leaders only)
  - InviteMemberModal component for email invitations
- **Global Navigation Bar**
  - `components/Navigation.tsx` with sticky header
  - Real-time invitation count badge
  - User avatar dropdown menu
  - Active route highlighting
  - Responsive design
- **Confirmation Modal System**
  - Reusable `ConfirmModal` component
  - Replaced all browser `alert()` and `confirm()` calls
  - Consistent UX for destructive actions
  - Custom titles and messages
- **Database Trigger**: Last leader protection
  - Prevents removing last Group Leader from a group
  - Migration #8: `20260126_last_leader_protection.sql`
  - Automatically reverts changes that would leave group without leader
- **New RLS Policies** (6 total):
  - View invitations policy
  - Accept invitations policy
  - Decline invitations policy
  - Leave groups policy
  - Remove members policy
  - Invite members policy

### Changed
- Replaced all `window.alert()` with ConfirmModal
- Replaced all `window.confirm()` with ConfirmModal
- Member status now includes 'invited' state
- Group detail page shows invitation status
- Invitation page shows pending invitations with accept/decline buttons

### Fixed
- Last leader can no longer be removed from group
- Member status transitions properly enforced
- Authorization checks for member management actions

### Technical Details
- Migration #8 added to prevent last leader removal
- Navigation uses Next.js Image component for avatars
- Real-time invitation count using Supabase count queries
- Modal system uses React portals for proper rendering

---

## [0.2.4] - 2026-01-25

### Added
- **Group Detail Page** (`/groups/[id]`)
  - Dynamic route for viewing individual group details
  - Shows group name, description, label, visibility settings
  - Member list with user avatars and names
  - Role display for each member
  - Group metadata (created date, member count)
  - Breadcrumb navigation (Groups > Group Name)
  - Responsive card-based layout

### Changed
- Groups page now links to individual group detail pages
- Improved group card UI with hover effects

### Technical Details
- Fetches group data with member information from Supabase
- Uses Next.js dynamic routing with `[id]` parameter
- Displays user avatars from Supabase Storage
- Shows role information from user_group_roles junction table

---

## [0.2.3] - 2026-01-25

### Added
- **Group Creation Page** (`/groups/create`)
  - Form to create new groups
  - Select from group templates
  - Set group name, description, and label
  - Configure visibility (public/private)
  - Configure member list visibility
  - Automatic Group Leader role assignment
- **Groups List Page** (`/groups`)
  - View all groups user belongs to
  - Filter by user's groups
  - Create new group button
  - Group cards with metadata
- **RLS Policies**: Group creation and viewing
  - Users can create groups
  - Users can view groups they belong to
  - Group creators automatically get Group Leader role

### Changed
- Default landing page after login: `/groups` (not `/profile`)
- Navigation structure updated to prioritize groups

### Technical Details
- Creates group with selected template
- Automatically creates default roles from template
- Assigns creator as Group Leader
- Uses Supabase RLS for authorization
- Responsive design with Tailwind CSS

---

## [0.2.2] - 2026-01-25

### Added
- **User Profile Editing** (`/profile/edit`)
  - Edit full name
  - Edit bio
  - Update profile data
  - Validation and error handling
- **Avatar Upload**
  - Upload profile pictures to Supabase Storage
  - Image preview before upload
  - Automatic resize/optimization
  - Stored in `avatars` bucket
  - URL saved in `users.avatar_url`
- **Enhanced Profile Page** (`/profile`)
  - Display avatar (or initials if no avatar)
  - Show full name and bio
  - Edit profile button
  - User metadata display
  - Improved layout and styling

### Technical Details
- Supabase Storage bucket: `avatars` (public, 2MB limit)
- Avatar upload uses `createClient` from client-side
- Image handling with browser FileReader API
- Profile updates use optimistic UI patterns
- Soft delete preserves avatar URLs

---

## [0.2.1] - 2026-01-24

### Fixed
- **Supabase Integration**: Verified database connection working
- **Environment Variables**: Confirmed `.env.local` properly configured
- **Build Process**: Ensured Next.js builds successfully
- **TypeScript**: Resolved any type errors

### Technical Details
- Database connection tested and verified
- All Supabase client/server utilities working correctly
- Ready for feature development

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
  - Changed related table constraints to RESTRICT for data integrity
- **Security Enhancements**:
  - Enabled Row Level Security (RLS) on users table
  - Added RLS policies for user data access (view and update own profile)
  - Users can only access their own profile data
- **Documentation**:
  - Complete authentication implementation guide
  - Migration file: `20260123_fix_user_trigger_and_rls.sql`

### Changed
- Updated `app/layout.tsx` to wrap app with AuthProvider
- Modified homepage to show different content for logged-in vs logged-out users
- Profile page now fetches and displays user data from database

### Fixed
- User creation trigger now correctly handles `full_name` field
- Soft delete properly preserves user data instead of deleting records
- Auth state management prevents race conditions during page loads

### Technical Details
- Authentication: Supabase Auth with email/password
- Session: Stored in browser, auto-refreshes on page load
- Database: PostgreSQL with RLS policies enforced
- Phase: Authentication ✅ Complete (Phase 2 - 20%)

---

## [0.1.2] - 2026-01-21

### Added
- **Next.js Project Setup**:
  - Initialized Next.js 16.1 with App Router
  - Configured TypeScript
  - Set up Tailwind CSS
  - Created basic project structure
- **Supabase Integration**:
  - Created Supabase client utilities (`lib/supabase/client.ts` and `lib/supabase/server.ts`)
  - Configured environment variables
  - Tested database connection
- **.gitignore**: Comprehensive ignore rules for Node.js, Next.js, and common editors

### Changed
- Project moved from planning phase to implementation phase
- Updated README with current status

### Technical Details
- Next.js 16.1 with App Router
- TypeScript strict mode enabled
- Tailwind CSS configured
- Supabase connection working
- Phase: Foundation ✅ Complete

---

## [0.1.1] - 2026-01-20

### Added
- **Complete Database Schema Deployment**:
  - Successfully deployed complete database schema to Supabase
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
  - `.gitignore`: Git ignore rules
- **Supabase Project**: Created FringeIslandDB database instance

### Changed
- Reorganized database table creation order to resolve foreign key dependency issues
- Updated documentation structure for better clarity and navigation

### Technical Details
- Stack: Next.js 16.1, TypeScript, React, Supabase (PostgreSQL)
- Database: PostgreSQL with Row Level Security
- Authorization: Flexible node/group-based permission system
- Phase: Architecture & Planning → Database Implementation

---

## Project Phases

### Phase 1: Foundation ✅ 75% COMPLETE
**Timeline**: January 2026

- [x] Complete architecture planning
- [x] Design database schema
- [x] Implement database
- [x] Set up development environment
- [x] Initialize Next.js project
- [x] Implement authentication system
- [x] User profile management
- [x] Group management (create, edit, members, roles)
- [x] **Journey catalog and browsing** ✅ NEW (v0.2.8)
- [ ] Journey enrollment and content delivery
- [ ] Communication features

### Phase 2: User-Generated Content 
**Timeline**: Q2 2026
- User-created journeys
- Journey marketplace
- Advanced customization

### Phase 3: Dynamic Journeys
**Timeline**: Q3 2026
- Adaptive learning paths
- AI-powered recommendations

### Phase 4: Developer Platform
**Timeline**: Q4 2026
- Public API
- SDK and integrations

---

## Notes

### Versioning Strategy
- **0.x.x**: Pre-release development versions
- **1.0.0**: First production-ready release with core features
- **x.y.z**: Major.Minor.Patch following semantic versioning

### Contributing
Currently in early development phase. Contribution guidelines will be added when the project reaches a stable state.

### Database Migrations
- Each database schema change documented with migration scripts
- Migration files located in `supabase/migrations/` directory
- **Migrations**:
  - ✅ `20260120_initial_schema.sql` - Initial database setup
  - ✅ `20260123_fix_user_trigger_and_rls.sql` - User lifecycle and RLS
  - ✅ `20260126_group_rls_policies.sql` - Group viewing and creation
  - ✅ `20260126_member_invitation_rls.sql` - Member invitation system
  - ✅ `20260126_member_management_rls.sql` - Accept/decline/leave/remove
  - ✅ `20260126_last_leader_protection.sql` - Last leader protection trigger
  - ✅ `20260127_seed_predefined_journeys.sql` - 8 predefined journeys (v0.2.8)

---

**Project**: FringeIsland  
**Repository**: https://github.com/Stefansteffansson/FringeIsland  
**Maintainer**: Stefan Steffansson  
**License**: TBD
