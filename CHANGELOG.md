# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Role assignment interface (promote to leader, assign roles)
- Journey browsing and enrollment flows
- Basic permissions and roles UI
- Dashboard/home page
- Activity feed and notifications

---

## [0.2.5] - 2026-01-26

### Added - Member Management System
- **Invite Members Feature** (Step 3A)
  - Email-based invitation system for group leaders
  - User lookup by email with validation
  - Duplicate invitation prevention
  - Invitation modal with clean UI
  - Success/error messages with icons
  - Real-time member count updates
  - RLS policy: Users can search other users by email
  - RLS policy: Group leaders can create invitations

- **Accept/Decline Invitations** (Step 3B)
  - Dedicated invitations page at `/invitations`
  - View all pending group invitations
  - Display group name, label, inviter name, and invitation date
  - Accept invitation → changes status to 'active'
  - Decline invitation → deletes invitation record
  - Smooth fade-out animations (no ugly browser alerts)
  - Empty state with helpful message
  - Loading states and error handling
  - RLS policy: Users can accept their own invitations
  - RLS policy: Users can decline their own invitations

- **Leave & Remove Members** (Step 3C)
  - Leave Group functionality for all members
  - Remove Member functionality for group leaders
  - Last leader protection (prevents removing/leaving if only leader)
  - Database trigger: `prevent_last_leader_removal()`
  - Confirmation dialogs before destructive actions
  - Real-time member list updates after removal
  - Loading states per action ("Leaving...", "Removing...")
  - RLS policy: Users can leave groups
  - RLS policy: Group leaders can remove members

### Added - UI/UX Improvements
- **Global Navigation Bar**
  - Persistent navigation at top of all pages
  - Logo/brand with click to home
  - Main nav buttons: My Groups, Invitations, Profile
  - Real-time invitation count badge (red circle with number)
  - User menu dropdown with avatar, name, and email
  - Active page indicator (blue highlight)
  - Sticky positioning (stays at top while scrolling)
  - Responsive design (hides labels on mobile)
  - Auto-hides on login/signup pages
  - Auto-closes dropdown on navigation or logout

- **Real-Time Navigation Updates**
  - Navigation refreshes when profile is updated
  - Invitation badge updates when invites are accepted/declined
  - Avatar updates immediately after upload
  - Name updates immediately after profile edit
  - Custom event system for triggering refreshes
  - No page refresh needed for updates

- **Confirmation Modal System**
  - Beautiful reusable `ConfirmModal` component
  - Three variants: danger (red), warning (yellow), info (blue)
  - Icon support with emoji
  - Backdrop blur effect
  - Keyboard support (Escape to close)
  - Smooth animations (fade-in, zoom-in)
  - Replaced all ugly browser `alert()` and `confirm()` calls

### Changed
- **Invitations Page**: Complete redesign with smooth UX
  - No more browser alert() popups
  - Success animation with checkmark
  - Card fade-out on accept/decline
  - Professional, polished interface

- **Group Detail Page**: Enhanced with member management
  - Added "Invite Members" button (leaders only)
  - Added "Leave Group" button (all members)
  - Added "Remove Member" buttons (leaders only, per member)
  - Integrated InviteMemberModal
  - Integrated ConfirmModal for confirmations
  - Real-time updates after member changes

- **Profile Edit**: Triggers navigation refresh
  - Updates navigation bar immediately after save
  - Shows updated name/avatar without page refresh

### Fixed
- **Database Constraints**: Updated group_memberships status check
  - Added 'invited' status to allowed values
  - Previous constraint only allowed 'active' and 'frozen'
  - Now allows: 'active', 'invited', 'frozen'

- **User Menu Dropdown**: Auto-close behavior
  - Closes when user logs out
  - Closes when different user logs in
  - Closes when navigating to different page
  - Closes when clicking outside (already worked)

- **Console Errors**: Reduced noise
  - Only log unexpected errors, not validation errors
  - Better error categorization
  - Cleaner development experience

### Technical
- **RLS Policies Added** (6 new policies):
  1. Users table SELECT: Search users by email
  2. Group_memberships INSERT: Create invitations
  3. Group_memberships UPDATE: Accept invitations
  4. Group_memberships DELETE: Decline invitations
  5. Group_memberships DELETE: Leave groups
  6. Group_memberships DELETE: Remove members
  
- **Database Functions**:
  - `prevent_last_leader_removal()`: Trigger function to ensure groups always have at least one leader
  - Runs before DELETE on group_memberships
  - Checks if user being removed is a leader
  - Counts remaining leaders
  - Raises exception if last leader

- **Event System**:
  - Custom `refreshNavigation` event for real-time updates
  - Dispatched from profile edit, invitations page
  - Listened to by Navigation component
  - Triggers data refetch on event

- **Component Structure**:
  - `Navigation.tsx`: Global navigation bar
  - `ConfirmModal.tsx`: Reusable confirmation modal
  - `InviteMemberModal.tsx`: Invite members by email
  - Updated: ProfileEditForm, InvitationsPage, GroupDetailPage

### Database Changes
- Updated `group_memberships` table:
  - Status constraint now includes 'invited'
  - Added trigger: `check_last_leader_removal`
  - Added function: `prevent_last_leader_removal()`

### Security
- All member management actions protected by RLS
- Last leader protection at database level (trigger)
- User can only manage their own invitations
- Leaders can only remove members from their groups
- Invitation validation (duplicate checks)

### Files Added
- `components/Navigation.tsx`
- `components/ui/ConfirmModal.tsx`
- `components/groups/InviteMemberModal.tsx`
- `app/invitations/page.tsx`
- `supabase/migrations/20260125_enable_member_invitations.sql`
- `supabase/migrations/20260125_enable_accept_decline_invitations.sql`
- `supabase/migrations/20260125_enable_leave_remove_members.sql`

### Documentation
- Created comprehensive READMEs for each step
- Added navigation implementation guide
- Added navigation refresh guide
- Documented RLS policies
- Created installation instructions

---

## [0.2.4] - 2026-01-25

### Added
- **Group Detail Page**: Complete individual group viewing functionality
  - Dynamic route at `/groups/[id]` for viewing individual groups
  - Display group information (name, description, custom label)
  - Show public/private status badge
  - Display user's role(s) in the group with badges
  - Show member count and creation date
  - Member list display (if enabled or user is group leader)
    - Member avatars with circular crop
    - Member names and roles
    - Responsive grid layout (1/2/3 columns)
    - Placeholder for users without avatars
  - "Edit Group" button (visible to group leaders only)
  - Back to My Groups navigation
  - Access control (members can view their groups, public groups visible to all)
  - Error page for unauthorized access or non-existent groups
  - "Coming Soon" placeholders for future actions (Invite Members, Manage Roles, Start Journey)

### Fixed
- **RLS Policy Issue**: Fixed conflicting SELECT policies on groups table
  - Combined two separate policies into one with OR logic
  - Now allows viewing public groups OR groups user is member of
  - Resolves 406 errors when trying to view groups
- **Error Handling**: Improved error messages for group not found
  - Use `.maybeSingle()` instead of `.single()` to avoid errors on missing groups
  - Better error messages ("Group not found" vs generic errors)
  - Proper handling of RLS policy restrictions

### Changed
- Updated group cards in My Groups list to be clickable (navigate to detail page)
- Improved error handling throughout group viewing flow

---

## [0.2.3] - 2026-01-25

### Added
- **Group Creation Feature**: Complete workflow for creating new groups
  - Form at `/groups/create` with all group properties
  - Name, description, custom label fields
  - Public/private visibility toggle
  - Member list visibility toggle
  - Success/error states
  - Automatic redirection after creation
  - Creator automatically becomes "Group Leader"
  - Database integration with proper error handling
  
### Technical
- Created GroupCreateForm component
- Integrated with Supabase groups and group_memberships tables
- Added RLS policy for group creation
- Proper user role assignment on group creation

---

## [0.2.2] - 2026-01-25

### Added
- **Profile Management**: Complete CRUD operations for user profiles
  - View profile at `/profile` with all user information
  - Edit profile at `/profile/edit` with form validation
  - Update full name and bio
  - Display creation date
  - Success/error states

- **Avatar Upload Feature**: Profile picture management
  - Upload avatar from profile page
  - Image preview before upload
  - File type validation (PNG, JPG, JPEG, GIF, WEBP)
  - File size validation (max 5MB)
  - Automatic image optimization (800x800px)
  - Supabase Storage integration
  - Public URL generation
  - Database record update
  - Real-time UI update

### Technical
- Created ProfileEditForm component
- Created AvatarUpload component
- Set up Supabase Storage bucket: `avatars`
- Implemented RLS policies for avatar storage
- Image processing with canvas API

---

## [0.2.1] - 2026-01-25

### Fixed
- **Authentication Flow**: Complete overhaul of auth system
  - Fixed infinite redirect loops
  - Implemented proper session management
  - Created AuthContext for global auth state
  - Protected routes with middleware
  - Proper loading states

### Technical
- Migrated from server-side auth checks to client-side AuthContext
- Created custom hooks: useAuth()
- Implemented proper TypeScript types for auth
- Added session persistence

---

## [0.2.0] - 2026-01-25

### Added
- **Groups List Page**: View all user's groups
  - Display groups at `/groups` route
  - Show group name, description, label
  - Member count display
  - Public/private badges
  - "Create New Group" button
  - Empty state for new users

### Technical
- Created groups list page component
- Integrated with group_memberships table
- Added RLS policies for group viewing

---

## [0.1.2] - 2026-01-24

### Added
- **Initial Authentication System**
  - Sign up page with email validation
  - Login page with remember me option
  - Basic session handling
  - Supabase Auth integration

### Technical
- Set up Supabase client configuration
- Created auth pages and forms
- Basic user table structure

---

## [0.1.1] - 2026-01-24

### Added
- **Database Schema**: Complete initial database design
  - 13 tables with relationships
  - Row Level Security (RLS) policies
  - Seed data for development
  - Foreign key constraints

### Technical
- PostgreSQL schema deployed to Supabase
- Comprehensive RLS policies for all tables
- Seed data includes users, groups, roles

---

## [0.1.0] - 2026-01-24

### Added
- **Project Initialization**
  - Next.js 16.1 with App Router
  - TypeScript configuration
  - Tailwind CSS setup
  - Project structure
  - Git repository initialization

### Technical
- Created base project structure
- Configured build tools
- Set up development environment
