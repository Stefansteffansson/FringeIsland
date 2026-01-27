# CLAUDE.md - AI Context Documentation

**Version:** 0.2.9  
**Last Updated:** January 27, 2026  
**Purpose:** Technical context for AI assistants working on FringeIsland

---

## 🎯 Project Overview

FringeIsland is an educational platform for personal development, leadership training, and organizational development. The platform uses a "journey" metaphor where users take structured learning experiences solo, in pairs, or groups.

**Current Phase:** Phase 1 - 75% Complete  
**Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase  
**Database:** PostgreSQL via Supabase (13 tables with RLS)  
**Repository:** https://github.com/Stefansteffansson/FringeIsland

---

## 🗂️ Architecture Decisions

### Authentication Pattern
- **Client-side auth** using AuthContext + useAuth() hook
- **Session management** via Supabase Auth
- **Protected routes** with middleware (proxy.ts)
- **Default landing:** /groups (My Groups page after login/signup)
- **Note:** Next.js 16 uses `proxy.ts` instead of `middleware.ts`

### Component Structure
- **App Router** (Next.js 16.1 convention)
- **Client components** marked with `'use client'`
- **Server components** for data fetching where possible
- **Reusable UI components** in `/components/ui/`

### State Management
- **React Context** for global auth state (AuthContext)
- **Local state** for component-specific data
- **Custom events** for cross-component communication (refreshNavigation)
- **Critical:** Update both member list AND user role state after role changes

### Database Access
- **Supabase client** for browser components
- **Server client** for server components
- **RLS policies** for all security
- **Triggers** for business logic (last leader protection)

---

## 🗄️ Database Schema (Key Tables)

### users
```sql
- id (uuid, primary key)
- auth_user_id (uuid, foreign key to auth.users)
- email (text, unique)
- full_name (text)
- avatar_url (text, nullable)
- bio (text, nullable)
- is_active (boolean, default true)  # Soft delete
- created_at (timestamp)
- updated_at (timestamp)
```

### groups
```sql
- id (uuid, primary key)
- name (text)
- description (text, nullable)
- label (text, nullable)
- is_public (boolean, default false)
- show_member_list (boolean, default true)
- settings (jsonb, default {})
- created_by_user_id (uuid, foreign key)
- created_at (timestamp)
```

### group_memberships
```sql
- id (uuid, primary key)
- group_id (uuid, foreign key)
- user_id (uuid, foreign key)
- member_group_id (uuid, foreign key, nullable)  # For subgroups (Phase 2)
- added_by_user_id (uuid, foreign key)
- status (text: 'active', 'invited', 'paused', 'removed')
- added_at (timestamp)
- status_changed_at (timestamp)
```

**Important:** Status values are enforced by CHECK constraint

### journeys (NEW in v0.2.8)
```sql
- id (uuid, primary key)
- title (text)
- description (text)
- created_by_user_id (uuid, foreign key to users)
- is_published (boolean, default false)
- is_public (boolean, default false)
- journey_type (text: 'predefined', 'user_created', 'dynamic')
- content (jsonb)  # Stores structured journey steps
- estimated_duration_minutes (integer, nullable)
- difficulty_level (text: 'beginner', 'intermediate', 'advanced', nullable)
- tags (text array, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- published_at (timestamp, nullable)
```

**Content Structure (JSONB):**
```json
{
  "version": "1.0",
  "structure": "linear",
  "steps": [
    {
      "id": "step_1",
      "title": "Step Title",
      "type": "content" | "activity" | "assessment",
      "duration_minutes": 30,
      "required": true
    }
  ]
}
```

**Important:** Journey content is stored as JSONB for flexibility

### group_roles
```sql
- id (uuid, primary key)
- group_id (uuid, foreign key)
- name (text, e.g., 'Group Leader', 'Travel Guide', 'Member')
- description (text)
- created_from_role_template_id (uuid, foreign key)
- created_at (timestamp)
```

### user_group_roles
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- group_id (uuid, foreign key)
- group_role_id (uuid, foreign key)
- assigned_by_user_id (uuid, foreign key)
- assigned_at (timestamp)
```

**Important:** Users can have multiple roles in the same group

---

## 🔒 Security & RLS Policies

### Key RLS Policies (v0.2.6.2)

**Users Table:**
- SELECT: Users can search other users by email (for invitations)
- UPDATE: Users can update their own profile

**Groups Table:**
- SELECT: Users can view public groups OR groups they're members of
- INSERT: Authenticated users can create groups
- UPDATE: Group leaders can update their groups

**Group_Memberships Table:**
- SELECT: Users can view memberships in their groups
- INSERT: Group leaders can create invitations (status='invited')
- UPDATE: Users can accept their own invitations (invited→active)
- DELETE: Users can decline their own invitations (status='invited')
- DELETE: Users can leave groups (status='active')
- DELETE: Group leaders can remove members (status='active')

**User_Group_Roles Table:**
- SELECT: Users can view role assignments in groups they belong to
- INSERT: Group leaders can assign roles
- DELETE: Group leaders can remove roles

**Important Triggers:**

```sql
-- Prevents removing the last leader from a group
CREATE TRIGGER check_last_leader_removal
BEFORE DELETE ON user_group_roles
FOR EACH ROW
EXECUTE FUNCTION prevent_last_leader_removal();

-- Automatically creates user profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_profile();

-- Soft deletes user on account deletion
CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_user_deletion();
```

---

## 🎨 UI/UX Patterns

### Confirmation Pattern
**Always use ConfirmModal, never browser confirm()/alert()**

```typescript
import ConfirmModal from '@/components/ui/ConfirmModal';

// State
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
});

// Show modal
setConfirmModal({
  isOpen: true,
  title: 'Confirm Action?',
  message: 'Are you sure you want to do this?',
  onConfirm: async () => {
    // Do action
    setConfirmModal({ ...confirmModal, isOpen: false });
  },
});

// Render
<ConfirmModal
  isOpen={confirmModal.isOpen}
  title={confirmModal.title}
  message={confirmModal.message}
  onConfirm={confirmModal.onConfirm}
  onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
  variant="danger" // or "warning" or "info"
/>
```

### Modal Pattern (Assign Role)
**Use dedicated modal components for complex forms**

```typescript
import AssignRoleModal from '@/components/groups/AssignRoleModal';

const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
const [selectedMember, setSelectedMember] = useState<{
  id: string;
  name: string;
  roleIds: string[];
} | null>(null);

// Open modal
const handleOpenAssignRole = (member: Member) => {
  setSelectedMember({
    id: member.user_id,
    name: member.full_name,
    roleIds: member.roleData.map(r => r.role_id),
  });
  setAssignRoleModalOpen(true);
};

// Render
{selectedMember && (
  <AssignRoleModal
    isOpen={assignRoleModalOpen}
    onClose={() => {
      setAssignRoleModalOpen(false);
      setSelectedMember(null);
    }}
    groupId={groupId}
    memberId={selectedMember.id}
    memberName={selectedMember.name}
    currentRoleIds={selectedMember.roleIds}
    onSuccess={refetchMembers}
  />
)}
```

### Navigation Refresh Pattern
**Trigger navigation updates after data changes**

```typescript
// After updating profile, accepting invitation, etc.
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('refreshNavigation'));
}
```

This triggers Navigation.tsx to refetch user data and invitation count.

### State Update Pattern (Critical for Role Management)
**Always update BOTH member list AND current user's state**

```typescript
const refetchMembers = async () => {
  // ... fetch members data
  setMembers(membersWithRoles);

  // CRITICAL: Also update current user's roles and isLeader state
  const currentUserRoles = allRolesData
    .filter((r: any) => r.user_id === userData.id)
    .map((r: any) => ({
      role_name: r.group_roles?.name || 'Unknown'
    }));
  
  setUserRoles(currentUserRoles);
  
  const hasLeaderRole = currentUserRoles.some(
    r => r.role_name === 'Group Leader'
  );
  setIsLeader(hasLeaderRole);
};
```

Without this, buttons will show stale state after role changes.

### Loading States
**Always show loading indicators**

```typescript
const [loading, setLoading] = useState(false);

// During action
<button disabled={loading}>
  {loading ? (
    <span className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      Processing...
    </span>
  ) : (
    'Submit'
  )}
</button>
```

### Error Handling
**Use try-catch with user-friendly messages**

```typescript
try {
  const { error } = await supabase.from('table').insert(data);
  if (error) throw error;
  
  // Success handling
  await refetchData();
} catch (err: any) {
  console.error('Error:', err);
  
  // Show user-friendly error (not technical details)
  if (err.message.includes('last leader')) {
    alert('Cannot remove the last leader from the group.');
  } else {
    alert(err.message || 'Failed to complete action. Please try again.');
  }
}
```

### Error Boundaries (NEW in v0.2.9)
**Wrap components to catch errors gracefully**

```typescript
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Wrap any component that might error
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Custom fallback UI
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

**Error Pages:**
- `app/error.tsx` - Catches route-level errors
- `app/global-error.tsx` - Catches root layout errors
- `app/not-found.tsx` - Custom 404 page

**Best Practices:**
- Error boundaries catch component errors only
- Use try-catch for async operations and event handlers
- Always provide recovery options (Try Again, Go Home)
- Show error details in development mode only
- Log errors for tracking (ready for Sentry integration)

---

## 📁 File Organization

### Page Files (App Router)
```
app/
  groups/
    [id]/
      page.tsx          # Dynamic route for group detail
      edit/
        page.tsx        # Edit group settings (NEW in v0.2.7)
    create/
      page.tsx          # Static route for creation
    page.tsx            # Groups list
  invitations/
    page.tsx            # Invitations page
  profile/
    page.tsx            # Profile page
    edit/
      page.tsx          # Edit profile
```

### Component Files
```
components/
  ui/                   # Reusable UI components
    ConfirmModal.tsx    # Confirmation modal
    Navigation.tsx      # Global navigation
  groups/               # Group-specific components
    InviteMemberModal.tsx   # Invite members modal
    AssignRoleModal.tsx     # Assign role modal
  auth/                 # Auth components
    AuthForm.tsx        # Login/signup form
```

### Supabase Utilities
```
lib/
  supabase/
    client.ts           # Browser client
    server.ts           # Server client
  auth/
    AuthContext.tsx     # Auth context provider
```

**Usage:**
```typescript
// In client components
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// In server components
import { createClient } from '@/lib/supabase/server';
const supabase = createClient();
```

---

## 🔧 Common Patterns

### Fetching User Data
```typescript
// Get authenticated user
const { user } = useAuth();

// Get user's database record
const { data: userData } = await supabase
  .from('users')
  .select('id, full_name, avatar_url')
  .eq('auth_user_id', user.id)
  .single();
```

### Checking User Roles
```typescript
// Check if user is group leader
const { data: roles } = await supabase
  .from('user_group_roles')
  .select(`
    group_roles (
      name
    )
  `)
  .eq('user_id', userData.id)
  .eq('group_id', groupId);

const isLeader = roles?.some(r => r.group_roles?.name === 'Group Leader');
```

### Fetching Members with Role Data
```typescript
// Get member list with full role information (including IDs)
const { data: allRolesData } = await supabase
  .from('user_group_roles')
  .select(`
    id,
    user_id,
    group_role_id,
    group_roles (
      id,
      name
    )
  `)
  .eq('group_id', groupId)
  .in('user_id', userIds);

// Map to include role IDs for management
const roleData: RoleData[] = userRoleData.map((r: any) => ({
  user_group_role_id: r.id,           // For deletion
  role_id: r.group_roles?.id || '',   // For filtering
  role_name: r.group_roles?.name || 'Unknown',
}));
```

### Creating Invitations
```typescript
// Leader invites member
const { error } = await supabase
  .from('group_memberships')
  .insert({
    group_id: groupId,
    user_id: invitedUserId,
    added_by_user_id: currentUserId,
    status: 'invited',  // Important!
  });
```

### Editing Groups (v0.2.7)
```typescript
// Update group settings (Group Leaders only)
const { error } = await supabase
  .from('groups')
  .update({
    name: formData.name.trim(),
    description: formData.description.trim() || null,
    label: formData.label.trim() || null,
    is_public: formData.is_public,
    show_member_list: formData.show_member_list,
    updated_at: new Date().toISOString(),
  })
  .eq('id', groupId);

// Authorization check done via RLS + UI check for isLeader
```

### Accepting Invitations
```typescript
// Update status from 'invited' to 'active'
const { error } = await supabase
  .from('group_memberships')
  .update({ status: 'active' })
  .eq('id', invitationId);
```

### Assigning Roles
```typescript
// Assign role to member
const { error } = await supabase
  .from('user_group_roles')
  .insert({
    user_id: memberId,
    group_id: groupId,
    group_role_id: selectedRoleId,
    assigned_by_user_id: currentUserId,
  });

// After assigning, refresh members AND update isLeader state
await refetchMembers();
```

### Removing Roles
```typescript
// Remove role from member
const { error } = await supabase
  .from('user_group_roles')
  .delete()
  .eq('id', userGroupRoleId);

// Database trigger will prevent removing last Group Leader
// After removing, refresh members AND update isLeader state
await refetchMembers();
```

---

## 🛠 Known Issues & Solutions

### Issue 1: Next.js 16 Middleware
**Problem:** Next.js 16 deprecated middleware.ts  
**Solution:** Use proxy.ts with named export `proxy` instead of `middleware`

### Issue 2: Missing Closing Tags
**Problem:** JSX structure errors with missing `</div>`  
**Solution:** Always verify opening and closing tags match

### Issue 3: RLS Policy Conflicts
**Problem:** Multiple SELECT policies can conflict  
**Solution:** Combine into one policy with OR logic

### Issue 4: Stale State After Role Changes
**Problem:** Buttons still show after user removes their own leader role  
**Solution:** Update both `members` and `isLeader` state in refetchMembers()

### Issue 5: Last Leader Protection
**Problem:** UI shows × button even for last leader  
**Solution:** Count group leaders and hide × button when count === 1

### Issue 6: CASCADE vs RESTRICT
**Problem:** CASCADE constraints can interfere with soft delete triggers  
**Solution:** Use SET NULL for nullable foreign keys, RESTRICT for required ones

---

## 🚀 Development Workflow

### Adding New Features
1. **Design database changes** (if needed)
   - Create SQL migration file
   - Add RLS policies
   - Test in Supabase dashboard

2. **Create components**
   - Start with TypeScript interfaces
   - Build UI with Tailwind
   - Add loading/error states

3. **Integrate with backend**
   - Use Supabase client
   - Handle errors gracefully
   - Test RLS policies work

4. **Update navigation** (if needed)
   - Add nav link
   - Dispatch refresh events

5. **Document changes**
   - Update CHANGELOG.md
   - Update this file (CLAUDE.md)
   - Update README.md if needed

### Testing Checklist
- [ ] Authentication flows work
- [ ] RLS policies prevent unauthorized access
- [ ] Loading states show appropriately
- [ ] Errors handled gracefully (no browser alerts)
- [ ] Navigation updates in real-time
- [ ] State updates immediately (no stale buttons)
- [ ] Mobile responsive
- [ ] Browser console clean (no errors)
- [ ] Last leader protection works (UI + database)

---

## 📚 Key Learnings

### TypeScript
- Always define interfaces for component props
- Use `'use client'` for client components
- Import types from React: `FormEvent`, `ChangeEvent`
- Define RoleData interface for role management

### Supabase
- Use `.maybeSingle()` when record might not exist
- Use `.single()` when record must exist
- Always check for errors after queries
- RLS policies are crucial for security
- Triggers provide server-side business logic

### Next.js 16
- App Router uses file-based routing
- Server components are default
- Client components need `'use client'` directive
- Metadata is export in layout/page files
- Use proxy.ts instead of middleware.ts

### State Management
- Update ALL related state when data changes
- After role changes: update members, userRoles, AND isLeader
- Use custom events for cross-component updates
- Local state for component-specific data

### CSS/Tailwind
- Use gradient backgrounds for modern look
- Sticky navigation: `sticky top-0 z-40`
- Responsive design: `sm:` `md:` `lg:` prefixes
- Loading spinners: `animate-spin`
- Modal backdrop: `backdrop-blur-sm`

### UI/UX Best Practices
- Never use browser alert() or confirm()
- Always use ConfirmModal for destructive actions
- Show loading states during async operations
- Hide buttons that won't work (e.g., × for last leader)
- Update UI immediately without page reloads

---

## 🎯 Current State (v0.2.8)

### Completed Features
- ✅ Full authentication system (signup, login, logout)
- ✅ Profile management with avatar upload
- ✅ Group creation with templates
- ✅ Group viewing (list and detail pages)
- ✅ **Group editing (name, description, visibility settings)** - v0.2.7
- ✅ Member management (invite, accept, decline, leave, remove)
- ✅ **Email-based member invitations with validation** - v0.2.7
- ✅ **Role assignment UI (promote, assign, remove)** - v0.2.6.2
- ✅ **Journey catalog with search and filters** - v0.2.8
- ✅ **Journey detail pages with expandable curriculum** - v0.2.8
- ✅ **8 predefined journeys seeded** - v0.2.8
- ✅ Global navigation with real-time updates
- ✅ Beautiful modal system (no browser alerts)
- ✅ Last leader protection (UI + database trigger)
- ✅ Immediate state updates (no stale buttons)

### Phase Completion
- ✅ **Phase 1.1:** Foundation (100%)
- ✅ **Phase 1.2:** Authentication (100%)
- ✅ **Phase 1.3:** Group Management (100%)
- 🔄 **Phase 1.4:** Journey System (50% - browsing complete, enrollment next)

### Ready for Next Steps
- ⏳ Journey enrollment (individual + group) - NEXT
- ⏳ View enrolled journeys
- ⏳ Journey content delivery
- ⏳ Progress tracking
- ⏳ Communication system (Phase 1.5)

---

## 🔮 Future Considerations

### Deferred to Phase 2
- **Subgroups:** Groups as members of other groups (complex)
- **Dynamic journeys:** AI-powered adaptive content
- **Journey marketplace:** User-created journeys
- **Advanced permissions:** Custom role creation

### Possible Enhancements
- **Real-time subscriptions:** Use Supabase Realtime for live updates
- **Search functionality:** Add search for groups/users/journeys
- **Notifications system:** Email/in-app notifications
- **Activity feed:** Show recent group activities
- **Mobile app:** React Native version

### Technical Debt
- Add unit tests (Jest + React Testing Library)
- Add E2E tests (Playwright)
- Set up CI/CD pipeline
- Add error tracking (Sentry)
- Optimize image loading (Next/Image)

---

## 📖 References

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/trigger-definition.html)

---

## 📝 Version-Specific Notes



### v0.2.8 Changes (January 27, 2026)
- **Journey System - Part 1** (catalog and browsing)
- Added journey catalog page at `/journeys`
  - Search by title and description
  - Filter by difficulty level (beginner, intermediate, advanced)
  - Filter by topic/tags
  - Responsive grid layout with journey cards
  - Results counter and clear filters button
- Added journey detail page at `/journeys/[id]`
  - Hero section with gradient background
  - Breadcrumb navigation (Journeys > Journey Title)
  - Two-tab interface (Overview and Curriculum)
  - Expandable step list showing all journey steps
  - Sticky sidebar with journey metadata
  - "Enroll in Journey" button (placeholder for enrollment feature)
- **8 predefined journeys seeded** via Migration #9
  - Leadership Fundamentals (180 min, Beginner)
  - Effective Communication Skills (240 min, Beginner)
  - Building High-Performance Teams (300 min, Intermediate)
  - Personal Development Kickstart (150 min, Beginner)
  - Strategic Decision Making (270 min, Advanced)
  - Emotional Intelligence at Work (210 min, Intermediate)
  - Agile Team Collaboration (200 min, Intermediate)
  - Resilience and Stress Management (180 min, Beginner)
- Added TypeScript types for journeys in `lib/types/journey.ts`
- Updated Navigation component with Journeys link (🗺️)
- Journey content stored as JSONB with structured steps

### Key Files Added in v0.2.8
- `app/journeys/page.tsx` (NEW - journey catalog)
- `app/journeys/[id]/page.tsx` (NEW - journey detail)
- `lib/types/journey.ts` (NEW - TypeScript types)
- `supabase/migrations/20260127_seed_predefined_journeys.sql` (NEW - Migration #9)

### Key Files Modified in v0.2.8
- `components/Navigation.tsx` (added Journeys link)

### v0.2.7 Changes (January 26, 2026)
- Added edit group page at `/groups/[id]/edit`
- Group Leaders can edit name, description, label, visibility settings
- Connected InviteMemberModal to group detail page
- "Invite Now" button functional (replaces "Coming Soon")
- Email-based member invitations with validation checks
- Authorization checks ensure only Group Leaders can edit/invite
- Modal-based UI for better user experience

### v0.2.6.2 Changes
- Added role assignment UI with promote/assign/remove capabilities
- Fixed last leader UI protection (hide × button)
- Fixed immediate state updates after role changes
- Changed default landing page to /groups
- Added AssignRoleModal component
- Enhanced member data fetching to include role IDs

### Key Files Modified in v0.2.7
- `app/groups/[id]/page.tsx` (added invite modal integration)
- `app/groups/[id]/edit/page.tsx` (NEW - edit group page)
- `components/groups/InviteMemberModal.tsx` (already existed, now connected)

### Key Files Modified in v0.2.6.2
- `components/groups/AssignRoleModal.tsx` (NEW)
- `app/groups/[id]/page.tsx` (role management UI)
- `components/auth/AuthForm.tsx` (default redirect)

---

**This document should be updated with each significant change to the project.**  
**Last major update:** Journey Catalog & Browsing (v0.2.8) - January 27, 2026
