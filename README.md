# FringeIsland

**Version:** 0.2.5  
**Last Updated:** January 26, 2026

Educational and training platform for personal development, leadership training, and team/organizational development.

---

## 🚀 Current Status

**Phase 2: Core Platform - 65% Complete**

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
- ✅ Public/private group settings
- ✅ Custom group labels
- ✅ Member list visibility controls

#### Member Management (NEW in v0.2.5)
- ✅ **Invite members by email** (leaders only)
- ✅ **Accept/decline invitations** (`/invitations`)
- ✅ **Leave groups** (all members)
- ✅ **Remove members** (leaders only)
- ✅ **Last leader protection** (database trigger)
- ✅ Real-time member count updates
- ✅ Smooth animations (no browser alerts)

#### Navigation & UX (NEW in v0.2.5)
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
- Role assignment interface (promote to leader)
- Journey browsing and enrollment
- Permissions and roles UI
- Dashboard/home page
- Activity feed and notifications

---

## 🏗️ Tech Stack

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
│   │   │   └── page.tsx          # Group detail page
│   │   ├── create/
│   │   │   └── page.tsx          # Create group
│   │   └── page.tsx              # Groups list
│   ├── invitations/
│   │   └── page.tsx              # Invitations page (NEW)
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
│   │   └── InviteMemberModal.tsx # Invite members modal (NEW)
│   ├── profile/
│   │   ├── AvatarUpload.tsx      # Avatar upload component
│   │   └── ProfileEditForm.tsx   # Profile edit form
│   ├── ui/
│   │   └── ConfirmModal.tsx      # Reusable modal (NEW)
│   └── Navigation.tsx            # Global navigation bar (NEW)
├── lib/
│   ├── auth/
│   │   └── AuthContext.tsx       # Auth context provider
│   └── supabase/
│       ├── client.ts             # Supabase client
│       └── server.ts             # Server-side Supabase
├── supabase/
│   └── migrations/               # SQL migration files (NEW)
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

## 📝 Recent Changes (v0.2.5)

### Member Management System
Complete member management with invite, accept/decline, leave, and remove functionality. Leaders can invite members by email, users can accept or decline invitations, and members can leave groups. Leaders can remove members with automatic last-leader protection.

### Navigation System
Global navigation bar with real-time updates. Shows invitation count badge, user avatar dropdown, and active page indicators. Automatically refreshes when profile or invitations change.

### UI/UX Improvements
Replaced all browser alerts with beautiful confirmation modals. Added smooth animations, loading states, and error handling throughout the app.

See [CHANGELOG.md](./CHANGELOG.md) for complete version history.

---

## 🗺️ Roadmap

### Phase 2: Core Platform (Current - 65% complete)
- ✅ Authentication system
- ✅ Profile management
- ✅ Group creation
- ✅ Member management
- ✅ Navigation system
- ⏳ Permissions & roles UI
- ⏳ Journey browsing

### Phase 3: Journey System
- Journey creation and editing
- Content management
- Enrollment workflows
- Progress tracking

### Phase 4: Advanced Features
- Marketplace for user-created journeys
- Dynamic/adaptive journeys
- Analytics and reporting
- Team collaboration tools

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
