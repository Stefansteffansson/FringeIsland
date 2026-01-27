# FringeIsland

**Version:** 0.2.8  
**Last Updated:** January 27, 2026

Educational and training platform for personal development, leadership training, and team/organizational development.

---

## 🚀 Current Status

**Phase 1: Foundation - 75% Complete**

### ✅ Completed Features

#### Authentication & User Management
- ✅ User signup with email validation
- ✅ User login with session management
- ✅ Protected routes with middleware
- ✅ AuthContext for global auth state
- ✅ Logout functionality

#### Profile Management
- ✅ View user profile (`/profile`)
- ✅ Edit profile (name, bio) (`/profile/edit`)
- ✅ Avatar upload with image optimization
- ✅ Profile picture display throughout app

#### Group Management
- ✅ Create new groups (`/groups/create`)
- ✅ View all user's groups (`/groups`)
- ✅ View group details (`/groups/[id]`)
- ✅ **Edit group settings** (`/groups/[id]/edit`) - v0.2.7
- ✅ Public/private group settings
- ✅ Custom group labels
- ✅ Member list visibility controls

#### Member Management
- ✅ **Invite members by email** (leaders only)
- ✅ **Accept/decline invitations** (`/invitations`)
- ✅ **Leave groups** (all members)
- ✅ **Remove members** (leaders only)
- ✅ **Last leader protection** (database trigger)
- ✅ Real-time member count updates
- ✅ Smooth animations (no browser alerts)

#### Role Management (v0.2.6.2)
- ✅ **Assign roles to members** (via AssignRoleModal)
- ✅ **Promote to Group Leader**
- ✅ **Remove roles** with last leader protection
- ✅ **Multiple roles per member**
- ✅ Real-time role updates in UI

#### Journey System (NEW in v0.2.8) 🎉
- ✅ **Journey catalog page** (`/journeys`)
  - Search by title and description
  - Filter by difficulty (beginner, intermediate, advanced)
  - Filter by topic/tags
  - Responsive grid layout
  - Results counter
- ✅ **Journey detail page** (`/journeys/[id]`)
  - Beautiful hero section with gradient
  - Two-tab interface (Overview & Curriculum)
  - Expandable step list with details
  - Sticky sidebar with metadata
  - Breadcrumb navigation
- ✅ **8 predefined journeys**
  - Leadership Fundamentals (180 min, Beginner)
  - Effective Communication Skills (240 min, Beginner)
  - Building High-Performance Teams (300 min, Intermediate)
  - Personal Development Kickstart (150 min, Beginner)
  - Strategic Decision Making (270 min, Advanced)
  - Emotional Intelligence at Work (210 min, Intermediate)
  - Agile Team Collaboration (200 min, Intermediate)
  - Resilience and Stress Management (180 min, Beginner)
- ✅ **TypeScript types** (`lib/types/journey.ts`)
- ✅ **Navigation link** (Journeys 🗺️)

#### Navigation & UX
- ✅ **Global navigation bar** (persistent across pages)
- ✅ **Real-time invitation badge** (shows pending count)
- ✅ **User menu dropdown** (avatar, profile, logout)
- ✅ **Active page indicators**
- ✅ **Auto-updating navigation** (refreshes on data changes)
- ✅ **Beautiful confirmation modals** (replaced all alerts)
- ✅ **Responsive design** (mobile & desktop)

### 🚧 In Progress
- Journey enrollment (individual + group)

### 📋 Upcoming Features
- View enrolled journeys
- Journey content delivery
- Progress tracking
- Travel Guide views
- Communication features (forums, messaging)

---

## 🗃️ Tech Stack

- **Framework:** Next.js 16.1 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** (TBD)

---

## 📂 Project Structure

```
FringeIsland/
├── app/
│   ├── groups/
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Group detail page
│   │   │   └── edit/
│   │   │       └── page.tsx      # Edit group
│   │   ├── create/
│   │   │   └── page.tsx          # Create group
│   │   └── page.tsx              # Groups list
│   ├── invitations/
│   │   └── page.tsx              # Invitations page
│   ├── journeys/                 # NEW in v0.2.8
│   │   ├── [id]/
│   │   │   └── page.tsx          # Journey detail page
│   │   └── page.tsx              # Journey catalog
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── profile/
│   │   ├── edit/
│   │   │   └── page.tsx          # Edit profile
│   │   └── page.tsx              # View profile
│   ├── signup/
│   │   └── page.tsx              # Signup page
│   ├── layout.tsx                # Root layout with Navigation
│   └── page.tsx                  # Home page
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx       # Authentication context
│   │   └── AuthForm.tsx          # Login/signup forms
│   ├── groups/
│   │   ├── GroupCreateForm.tsx   # Group creation form
│   │   ├── InviteMemberModal.tsx # Invite members modal
│   │   └── AssignRoleModal.tsx   # Assign roles modal
│   ├── profile/
│   │   ├── AvatarUpload.tsx      # Avatar upload component
│   │   └── ProfileEditForm.tsx   # Profile edit form
│   ├── ui/
│   │   └── ConfirmModal.tsx      # Reusable modal
│   └── Navigation.tsx            # Global navigation bar
├── lib/
│   ├── auth/
│   │   └── AuthContext.tsx       # Auth context provider
│   ├── supabase/
│   │   ├── client.ts             # Supabase client
│   │   └── server.ts             # Server-side Supabase
│   └── types/
│       └── journey.ts            # Journey types (NEW in v0.2.8)
├── supabase/
│   └── migrations/               # SQL migration files (9 total)
├── public/                       # Static assets
├── CHANGELOG.md                  # Version history
├── CLAUDE.md                     # AI context documentation
└── README.md                     # This file
```

---

## 📊 Database Schema

### Core Tables (13 total)

**Users & Authentication:**
- `users` - User profiles and metadata
- `auth.users` - Supabase authentication (managed)

**Groups & Memberships:**
- `groups` - Group information
- `group_memberships` - User-group relationships (with status: active/invited/frozen)
- `group_roles` - Available roles (Group Leader, Member, etc.)
- `user_group_roles` - User role assignments per group

**Journeys:** (NEW in v0.2.8)
- `journeys` - Journey definitions with JSONB content
- `journey_enrollments` - User journey participation

**Other:**
- `permissions` - System permissions (40 seeded)
- `role_templates` - Role blueprints (5 seeded)
- `group_templates` - Group blueprints (4 seeded)
- `role_template_permissions` - Role-permission mappings
- `group_template_roles` - Template-role mappings
- `group_role_permissions` - Role permissions

**Database Migrations:** 9 total
1. `20260120_initial_schema.sql` - Initial setup
2. `20260123_fix_user_trigger_and_rls.sql` - User lifecycle
3-7. Group RLS policies and member management
8. Last leader protection trigger
9. **`20260127_seed_predefined_journeys.sql` - 8 journeys (NEW)**

---

## 🔒 Security

### Row Level Security (RLS)
All tables have comprehensive RLS policies:
- Users can only see their own data
- Group members can view their groups
- Public groups visible to all
- Leaders can manage their groups
- Invitations protected per user
- Last leader protection via database trigger

### Authentication
- Supabase Auth with email/password
- Session management with AuthContext
- Protected routes via middleware
- Automatic redirect for unauthenticated users

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

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
   Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**
   - Run SQL files in `supabase/migrations/` in order (1-9)
   - Or use Supabase CLI: `supabase db push`
   - **NEW Migration #9:** `20260127_seed_predefined_journeys.sql` (v0.2.8)

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📝 Recent Changes

### v0.2.8 - Journey Catalog & Browsing (January 27, 2026)

**Journey System - Part 1:**
- Journey catalog page at `/journeys` with grid layout
- Search functionality (title and description)
- Filter by difficulty (beginner, intermediate, advanced)
- Filter by topic/tags with results counter
- Journey detail page at `/journeys/[id]` with:
  - Hero section with gradient background
  - Breadcrumb navigation
  - Two tabs: Overview and Curriculum
  - Expandable step list showing all journey steps
  - Sticky sidebar with journey metadata
  - "Enroll in Journey" button (placeholder for now)

**8 Predefined Journeys:**
- Leadership Fundamentals (180 min, Beginner)
- Effective Communication Skills (240 min, Beginner)
- Building High-Performance Teams (300 min, Intermediate)
- Personal Development Kickstart (150 min, Beginner)
- Strategic Decision Making (270 min, Advanced)
- Emotional Intelligence at Work (210 min, Intermediate)
- Agile Team Collaboration (200 min, Intermediate)
- Resilience and Stress Management (180 min, Beginner)

**Technical:**
- New migration #9: `20260127_seed_predefined_journeys.sql`
- TypeScript types in `lib/types/journey.ts`
- Navigation link added (Journeys 🗺️)
- Journey content stored as JSONB with structured steps
- All journeys marked as published and public
- Responsive design with Tailwind CSS

### v0.2.7 - Edit Group & Invite Members (January 26, 2026)

**Edit Group Functionality:**
- New edit page at `/groups/[id]/edit` for Group Leaders
- Edit group name, description, label
- Toggle public/private and member list visibility
- Form validation with error handling
- Authorization checks (Group Leaders only)

**Invite Members Integration:**
- Connected InviteMemberModal to group detail page
- "Invite Now" button (replaces "Coming Soon")
- Email-based invitations with validation
- Automatic member list refresh

See [CHANGELOG.md](./CHANGELOG.md) for complete version history.

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current - 75% complete)
- ✅ Authentication system
- ✅ Profile management
- ✅ Group creation & editing
- ✅ Member management
- ✅ Role management
- ✅ Navigation system
- ✅ **Journey catalog & browsing (NEW in v0.2.8)**
- ⏳ Journey enrollment
- ⏳ Journey content delivery

### Phase 2: Journey Experience
- Journey progress tracking
- Facilitator/Travel Guide tools
- Group journey features
- Completion tracking

### Phase 3: Advanced Features
- User-created journeys
- Journey marketplace
- Dynamic/adaptive journeys
- Analytics and reporting

### Phase 4: Communication & Community
- Forums and messaging
- Notifications
- Team collaboration tools
- Feedback systems

---

## 🤝 Contributing

This is a private project. For questions or suggestions, contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

- **Stefan Steffansson** - Project Lead & Developer

---

## 📧 Contact

For questions or support, contact: [Your contact information]

---

**Built with ❤️ using Next.js, TypeScript, and Supabase**
