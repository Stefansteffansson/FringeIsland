# FringeIsland

**Version:** 0.2.7  
**Last Updated:** January 26, 2026

Educational and training platform for personal development, leadership training, and team/organizational development.

---

## 🚀 Current Status

**Phase 2: Core Platform - 70% Complete**

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
- ✅ **Edit group settings** (`/groups/[id]/edit`) - NEW in v0.2.7
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

#### Role Management (NEW in v0.2.6.2)
- ✅ **Assign roles to members** (via AssignRoleModal)
- ✅ **Promote to Group Leader**
- ✅ **Remove roles** with last leader protection
- ✅ **Multiple roles per member**
- ✅ Real-time role updates in UI

#### Navigation & UX
- ✅ **Global navigation bar** (persistent across pages)
- ✅ **Real-time invitation badge** (shows pending count)
- ✅ **User menu dropdown** (avatar, profile, logout)
- ✅ **Active page indicators**
- ✅ **Auto-updating navigation** (refreshes on data changes)
- ✅ **Beautiful confirmation modals** (replaced all alerts)
- ✅ **Responsive design** (mobile & desktop)

### 🚧 In Progress
- None (ready for next phase)

### 📋 Upcoming Features
- Journey browsing and enrollment
- Journey content delivery
- Permissions dashboard
- Activity feed and notifications
- Advanced group features (subgroups, etc.)

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
│   │   │       └── page.tsx      # Edit group (NEW in v0.2.7)
│   │   ├── create/
│   │   │   └── page.tsx          # Create group
│   │   └── page.tsx              # Groups list
│   ├── invitations/
│   │   └── page.tsx              # Invitations page
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
│   │   └── AssignRoleModal.tsx   # Assign roles modal (NEW)
│   ├── profile/
│   │   ├── AvatarUpload.tsx      # Avatar upload component
│   │   └── ProfileEditForm.tsx   # Profile edit form
│   ├── ui/
│   │   └── ConfirmModal.tsx      # Reusable modal
│   └── Navigation.tsx            # Global navigation bar
├── lib/
│   ├── auth/
│   │   └── AuthContext.tsx       # Auth context provider
│   └── supabase/
│       ├── client.ts             # Supabase client
│       └── server.ts             # Server-side Supabase
├── supabase/
│   └── migrations/               # SQL migration files
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

**Journeys:**
- `journeys` - Journey definitions
- `journey_enrollments` - User journey participation
- `journey_content` - Journey structure and content

**Other:**
- `group_journey_links` - Groups connected to journeys
- `tags` - Tag definitions
- `journey_tags` - Journey tagging
- `user_preferences` - User settings

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
   - Run SQL files in `supabase/migrations/` in order
   - Or use Supabase CLI: `supabase db push`

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

### v0.2.6.2 - Role Assignment UI (January 26, 2026)

**Role Management:**
- AssignRoleModal for managing member roles
- Promote members to Group Leader
- Assign/remove multiple roles
- Last leader protection in UI
- Immediate state updates after role changes

### v0.2.5 - Member Management & Navigation (January 25, 2026)

**Member Management System:**
- Complete member lifecycle (invite, accept/decline, leave, remove)
- InviteMemberModal component
- Last leader protection via database trigger
- Real-time member count updates

**Navigation System:**
- Global navigation bar with real-time updates
- Invitation count badge
- User avatar dropdown menu
- Active page indicators

**UI/UX Improvements:**
- ConfirmModal component (replaced all browser alerts)
- Smooth animations and loading states
- Consistent modal pattern throughout app

See [CHANGELOG.md](./CHANGELOG.md) for complete version history.

---

## 🗺️ Roadmap

### Phase 2: Core Platform (Current - 70% complete)
- ✅ Authentication system
- ✅ Profile management
- ✅ Group creation & editing
- ✅ Member management
- ✅ Role management
- ✅ Navigation system
- ⏳ Journey browsing
- ⏳ Journey enrollment

### Phase 3: Journey System
- Journey creation and editing
- Content management
- Enrollment workflows
- Progress tracking
- Facilitator tools

### Phase 4: Advanced Features
- Marketplace for user-created journeys
- Dynamic/adaptive journeys
- Analytics and reporting
- Team collaboration tools
- Communication features (forums, messaging)

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
