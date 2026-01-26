# CLAUDE.md - AI Context Documentation

**Version:** 0.2.5  
**Last Updated:** January 26, 2026  
**Purpose:** Technical context for AI assistants working on FringeIsland

---

## 🎯 Project Overview

FringeIsland is an educational platform for personal development, leadership training, and organizational development. The platform uses a "journey" metaphor where users take structured learning experiences solo, in pairs, or groups.

**Current Phase:** Phase 2 - Core Platform (65% complete)  
**Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase  
**Database:** PostgreSQL via Supabase (13 tables with RLS)

---

## 🏗️ Architecture Decisions

### Authentication Pattern
- **Client-side auth** using AuthContext + useAuth() hook
- **Session management** via Supabase Auth
- **Protected routes** with middleware (proxy.ts)
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
- show_member_list (boolean, default false)
- created_by_user_id (uuid, foreign key)
- created_at (timestamp)
```

### group_memberships
```sql
- id (uuid, primary key)
- group_id (uuid, foreign key)
- user_id (uuid, foreign key)
- added_by_user_id (uuid, foreign key)
- status (text: 'active', 'invited', 'frozen')
- added_at (timestamp)
```

**Important:** Status values are enforced by CHECK constraint

### group_roles
```sql
- id (uuid, primary key)
- name (text, e.g., 'Group Leader', 'Member')
- description (text)
- created_at (timestamp)
```

### user_group_roles
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- group_id (uuid, foreign key)
- group_role_id (uuid, foreign key)
- assigned_at (timestamp)
```

---

## 🔒 Security & RLS Policies

### Key RLS Policies (v0.2.5)

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

**Important Trigger:**
```sql
CREATE TRIGGER check_last_leader_removal
BEFORE DELETE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION prevent_last_leader_removal();
```
This prevents removing the last leader from a group.

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

### Navigation Refresh Pattern
**Trigger navigation updates after data changes**

```typescript
// After updating profile, accepting invitation, etc.
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('refreshNavigation'));
}
```

This triggers Navigation.tsx to refetch user data and invitation count.

### Loading States
**Always show loading indicators**

```typescript
const [loading, setLoading] = useState(false);

// During action
<button disabled={loading}>
  {loading ? 'Processing...' : 'Submit'}
</button>
```

### Error Handling
**Use try-catch with user-friendly messages**

```typescript
try {
  const { error } = await supabase.from('table').insert(data);
  if (error) throw error;
  
  // Success handling
} catch (err) {
  console.error('Error:', err);
  // Show error modal, not alert()
  setConfirmModal({
    isOpen: true,
    title: 'Error',
    message: 'Failed to complete action. Please try again.',
    onConfirm: () => setConfirmModal({ ...confirmModal, isOpen: false }),
  });
}
```

---

## 📁 File Organization

### Page Files (App Router)
```
app/
  groups/
    [id]/
      page.tsx          # Dynamic route for group detail
    create/
      page.tsx          # Static route for creation
    page.tsx            # Groups list
```

### Component Files
```
components/
  ui/                   # Reusable UI components
    ConfirmModal.tsx    # Modal component
  groups/               # Group-specific components
    InviteMemberModal.tsx
  profile/              # Profile-specific components
    AvatarUpload.tsx
  Navigation.tsx        # Global navigation
```

### Supabase Utilities
```
lib/
  supabase/
    client.ts           # Browser client
    server.ts           # Server client
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

### Accepting Invitations
```typescript
// Update status from 'invited' to 'active'
const { error } = await supabase
  .from('group_memberships')
  .update({ status: 'active' })
  .eq('id', invitationId);
```

---

## 🐛 Known Issues & Solutions

### Issue 1: Next.js 16 Middleware
**Problem:** Next.js 16 deprecated middleware.ts  
**Solution:** Use proxy.ts with named export `proxy` instead of `middleware`

### Issue 2: Missing Closing Tags
**Problem:** JSX structure errors with missing `</div>`  
**Solution:** Always verify opening and closing tags match

### Issue 3: RLS Policy Conflicts
**Problem:** Multiple SELECT policies can conflict  
**Solution:** Combine into one policy with OR logic

### Issue 4: Logout Function
**Problem:** AuthContext may not export `logout` function  
**Solution:** Use `await supabase.auth.signOut()` directly

### Issue 5: Static Navigation
**Problem:** Navigation doesn't update after data changes  
**Solution:** Dispatch `refreshNavigation` custom event

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
   - Update README.md
   - Update CLAUDE.md

### Testing Checklist
- [ ] Authentication flows work
- [ ] RLS policies prevent unauthorized access
- [ ] Loading states show appropriately
- [ ] Errors handled gracefully (no alerts)
- [ ] Navigation updates in real-time
- [ ] Mobile responsive
- [ ] Browser console clean (no errors)

---

## 📚 Key Learnings

### TypeScript
- Always define interfaces for component props
- Use `'use client'` for client components
- Import types from React: `FormEvent`, `ChangeEvent`

### Supabase
- Use `.maybeSingle()` when record might not exist
- Use `.single()` when record must exist
- Always check for errors after queries
- RLS policies are crucial for security

### Next.js 16
- App Router uses file-based routing
- Server components are default
- Client components need `'use client'` directive
- Metadata is export in layout/page files

### CSS/Tailwind
- Use gradient backgrounds for modern look
- Sticky navigation: `sticky top-0 z-40`
- Responsive design: `sm:` `md:` `lg:` prefixes
- Loading spinners: `animate-spin`

---

## 🎯 Current State (v0.2.5)

### Completed
- ✅ Full authentication system
- ✅ Profile management with avatar upload
- ✅ Group creation and viewing
- ✅ Member management (invite, accept, leave, remove)
- ✅ Global navigation with real-time updates
- ✅ Beautiful modal system (no browser alerts)
- ✅ Last leader protection (database trigger)

### Ready for Next Steps
- ⏳ Role assignment UI (promote to leader)
- ⏳ Journey browsing system
- ⏳ Permissions UI
- ⏳ Dashboard/home page

---

## 🔮 Future Considerations

### Possible Enhancements
- **Real-time subscriptions:** Use Supabase Realtime for live updates
- **Search functionality:** Add search for groups/users
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

---

**This document should be updated with each significant change to the project.**
