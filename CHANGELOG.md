# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Group creation and management interfaces
- Journey browsing and enrollment flows
- Basic permissions and roles UI

---

## [0.2.2] - 2026-01-24

### Added
- **Avatar Upload Feature**: Complete profile picture functionality
  - Upload images (JPG, PNG, WebP) up to 2MB
  - Real-time image preview before upload
  - Upload to Supabase Storage (`avatars` bucket)
  - Circular avatar display on profile page (96px)
  - Avatar preview on edit page (128px)
  - Replace existing avatar with new image
  - Delete avatar functionality
  - Default placeholder (👤 emoji) when no avatar set
  - File validation (type and size)
  - Progress indicators during upload
  - Error handling with user-friendly messages
- **Supabase Storage Integration**:
  - Created `avatars` storage bucket
  - Row Level Security policies for upload, update, delete, and public read
  - User-specific folder structure (`{user_id}/avatar.{ext}`)
  - Upsert functionality (replaces old avatar automatically)
- **Next.js Configuration**:
  - Added Supabase domain to `remotePatterns` for Image component
  - Configured image optimization for avatar display

### Changed
- Updated profile display page (`app/profile/page.tsx`)
  - Added circular avatar with 4px gray border
  - Avatar positioned next to user name in header
  - Improved layout with flex positioning
  - Default placeholder if no avatar
- Updated profile edit page (`app/profile/edit/page.tsx`)
  - Added "Profile Picture" section at top
  - Separated "Profile Picture" and "Profile Information" into distinct cards
  - Integrated AvatarUpload component
  - Real-time avatar preview updates
- Updated `next.config.ts`
  - Added Supabase storage domain to allowed image sources
  - Configured remote patterns for avatar images

### Technical Details
- Avatar storage: Supabase Storage bucket with RLS policies
- Image optimization: Next.js Image component with proper configuration
- File structure: `avatars/{user_id}/avatar.{ext}` for organization
- Security: Users can only upload/delete their own avatars
- **Phase 2: Core Platform** - Avatar Upload ✅ COMPLETE (40% of Phase 2)

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
- **Phase 2: Core Platform** - Profile Management ✅ COMPLETE (30% of Phase 2)

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
- **Phase 2: Core Platform** - Authentication ✅ COMPLETE (20% of Phase 2)

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

### Phase 2: Core Platform (In Progress - 40% Complete)
**Timeline**: February - March 2026

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

- [x] **Avatar upload** ✅ COMPLETE
  - [x] Image upload to Supabase Storage
  - [x] Avatar display on profile
  - [x] Delete/replace avatar
  - [x] File validation

- [ ] **Group management** (Next Up)
  - [ ] Group creation
  - [ ] Member invitation
  - [ ] Role assignment
  - [ ] Group settings

- [ ] **Journey browsing**
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
