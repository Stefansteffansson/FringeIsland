# Feature Agent Context

**Purpose:** Context for implementing complete features end-to-end
**For:** Full-stack feature development from database to UI
**Last Updated:** February 4, 2026

---

## 🎯 Quick Reference

**Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase
**Pattern:** Database → API/Logic → UI → Testing → Documentation
**Always read:** `PROJECT_STATUS.md` + `CLAUDE.md` + relevant feature docs

---

## 📋 Feature Development Workflow

### 1. Planning Phase
**Before writing code:**

1. Read `PROJECT_STATUS.md` - Understand current state
2. Read `CLAUDE.md` - Learn technical patterns
3. Read relevant feature docs in `docs/features/implemented/`
4. Check `docs/planning/ROADMAP.md` - Understand feature priorities
5. Review similar existing features - Follow established patterns

**Ask questions:**
- What problem does this solve?
- Who is the user?
- What are the edge cases?
- Does this fit the existing architecture?
- Are there security implications?

### 2. Database Phase
**If feature needs data storage:**

**Read:** `docs/agents/contexts/database-agent.md`

**Tasks:**
1. Design schema (tables, columns, relationships)
2. Create migration file (`supabase/migrations/YYYYMMDD_feature_name.sql`)
3. Add RLS policies for security
4. Create indexes for performance
5. Test migration in Supabase dashboard
6. Update `docs/database/schema-overview.md`
7. Add migration entry to `docs/database/migrations-log.md`

**Example:** Adding notifications feature
```sql
-- Create table
CREATE TABLE notifications (...);

-- Add RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON notifications ...;

-- Add indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

### 3. TypeScript Types Phase
**Define interfaces:**

**Location:** `lib/types/[feature].ts` or add to existing type file

```typescript
export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface NotificationWithUser extends Notification {
  users: {
    full_name: string;
    avatar_url: string | null;
  };
}
```

### 4. Backend/Logic Phase
**Data fetching and business logic:**

**Pattern:**
- Use Supabase client (`lib/supabase/client.ts` or `server.ts`)
- RLS handles authorization automatically
- Handle errors gracefully
- Return typed data

```typescript
// In page.tsx or component
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Fetch data
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error fetching notifications:', error);
  // Handle error
}
```

### 5. UI Phase
**Build user interface:**

**Read:** `docs/agents/contexts/ui-agent.md`

**Components to create:**
1. **Page component** (`app/[feature]/page.tsx`)
2. **Feature-specific components** (`components/[feature]/`)
3. **Modals** (if needed)
4. **Forms** (if needed)

**Follow patterns:**
- Use Tailwind CSS (see ui-agent.md for design system)
- Use ConfirmModal for confirmations (NEVER browser alerts)
- Show loading states during async operations
- Handle empty states gracefully
- Responsive design (mobile-first)

### 6. Integration Phase
**Connect everything:**

1. **Add navigation link** (if user-facing feature)
   - Update `components/Navigation.tsx`
   - Add icon and label
   - Add active state detection

2. **Add route** (if new page)
   - Create `app/[feature]/page.tsx`
   - Add metadata export

3. **Trigger navigation refresh** (if state changes)
   ```typescript
   if (typeof window !== 'undefined') {
     window.dispatchEvent(new CustomEvent('refreshNavigation'));
   }
   ```

4. **Test user flow** end-to-end

### 7. Testing Phase
**Manual testing checklist:**

- ✅ Feature works as intended
- ✅ Loading states show correctly
- ✅ Errors handled gracefully
- ✅ RLS policies prevent unauthorized access
- ✅ Mobile responsive
- ✅ Empty states handled
- ✅ Navigation updates correctly
- ✅ Edge cases covered
- ✅ Browser console clean (no errors)

**Test as different users:**
- Regular member
- Group leader
- Non-member
- Unauthenticated user

### 8. Documentation Phase
**Update documentation:**

1. **Feature doc** - Create `docs/features/implemented/[feature].md`
   - Overview
   - Features list
   - Database schema
   - API patterns
   - UI components
   - User flows
   - Known issues

2. **CHANGELOG.md** - Add entry for version

3. **CLAUDE.md** - Update if new patterns introduced

4. **PROJECT_STATUS.md** - Update current status

5. **README.md** - Update if major feature (optional)

---

## 🏗️ Architecture Patterns

### Feature Structure
```
app/
  [feature]/
    page.tsx              # Main feature page
    [id]/
      page.tsx            # Detail view
      edit/
        page.tsx          # Edit view
    create/
      page.tsx            # Create view

components/
  [feature]/
    FeatureList.tsx       # List component
    FeatureCard.tsx       # Card component
    FeatureModal.tsx      # Modal component
    FeatureForm.tsx       # Form component

lib/
  types/
    [feature].ts          # TypeScript types

supabase/
  migrations/
    YYYYMMDD_[feature].sql  # Database migration
```

### Data Flow
```
Database (PostgreSQL)
    ↓ (RLS policies enforce security)
Supabase Client
    ↓ (typed queries)
Page/Component
    ↓ (props)
Child Components
    ↓ (render)
User Interface
```

### State Management
```typescript
// Component-local state
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Global state (AuthContext)
const { user } = useAuth();

// Cross-component communication
window.dispatchEvent(new CustomEvent('refreshNavigation'));
```

---

## 🔐 Security Checklist

**For every feature:**

- ✅ RLS policies on all tables
- ✅ Check user authentication before data access
- ✅ Validate user permissions (leader, member, etc.)
- ✅ Sanitize user input
- ✅ No SQL injection vectors (use parameterized queries)
- ✅ No XSS vectors (React escapes by default)
- ✅ Sensitive data not exposed in client
- ✅ Test as unauthorized user

**Common security patterns:**
```typescript
// Check authentication
if (!user) {
  router.push('/login');
  return;
}

// Check authorization (leader only)
const { data: roles } = await supabase
  .from('user_group_roles')
  .select('group_roles(name)')
  .eq('user_id', userData.id)
  .eq('group_id', groupId);

const isLeader = roles?.some(r => r.group_roles?.name === 'Group Leader');

if (!isLeader) {
  alert('Only group leaders can perform this action');
  return;
}
```

---

## 🎨 UI/UX Patterns

### User Feedback
```typescript
// Success
alert('Success message');  // Or use toast notification

// Error
alert('Error message');  // User-friendly, not technical

// Confirmation
<ConfirmModal
  title="Confirm Action?"
  message="This action cannot be undone"
  variant="danger"
  onConfirm={handleAction}
  onCancel={handleCancel}
/>
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
  } finally {
    setLoading(false);
  }
};

<button disabled={loading}>
  {loading ? 'Processing...' : 'Submit'}
</button>
```

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from('table').insert(data);
  if (error) throw error;

  // Success
  alert('Action completed successfully!');
  await refetchData();
} catch (err: any) {
  console.error('Error:', err);

  // User-friendly error message
  if (err.message.includes('unique constraint')) {
    alert('This item already exists.');
  } else {
    alert(err.message || 'Failed to complete action. Please try again.');
  }
}
```

---

## 📊 Common Feature Patterns

### CRUD Operations

**Create:**
```typescript
const { error } = await supabase
  .from('table')
  .insert({
    ...data,
    created_by_user_id: userData.id,
  });
```

**Read:**
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*, related_table(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Update:**
```typescript
const { error } = await supabase
  .from('table')
  .update({ ...updates })
  .eq('id', id);
```

**Delete:**
```typescript
// Soft delete (preferred)
const { error } = await supabase
  .from('table')
  .update({ is_active: false })
  .eq('id', id);

// Hard delete (use sparingly)
const { error } = await supabase
  .from('table')
  .delete()
  .eq('id', id);
```

### Membership Checks
```typescript
// Check if user is group member
const { data: membership } = await supabase
  .from('group_memberships')
  .select('id')
  .eq('group_id', groupId)
  .eq('user_id', userData.id)
  .eq('status', 'active')
  .maybeSingle();

const isMember = !!membership;
```

### Role Checks
```typescript
// Check if user has specific role
const { data: roles } = await supabase
  .from('user_group_roles')
  .select('group_roles(name)')
  .eq('user_id', userData.id)
  .eq('group_id', groupId);

const hasRole = roles?.some(r => r.group_roles?.name === 'Group Leader');
```

---

## 🧪 Testing Strategies

### Manual Testing Flow
1. Create test user accounts (member, leader)
2. Test happy path (feature works as intended)
3. Test error cases (what if it fails?)
4. Test edge cases (empty data, max length, etc.)
5. Test unauthorized access (RLS working?)
6. Test on mobile (responsive?)
7. Check browser console (no errors?)

### Common Test Scenarios
- ✅ Feature works for authorized user
- ✅ Feature blocked for unauthorized user
- ✅ Empty state handled
- ✅ Loading state shown
- ✅ Error state handled
- ✅ Form validation works
- ✅ Success message shown
- ✅ Data refreshes after action

---

## 📝 Documentation Template

**Use this template for feature docs:**

```markdown
# Feature Name

**Status:** ✅ Implemented / 🚧 In Progress / 📋 Planned
**Version:** X.Y.Z
**Last Updated:** Date

---

## Overview
[Brief description of feature and purpose]

---

## Features
- Feature 1
- Feature 2

---

## Database Schema
[Relevant tables and relationships]

---

## TypeScript Types
[Interfaces used]

---

## User Flows
[Step-by-step user interactions]

---

## API Patterns
[Common query patterns]

---

## UI Components
[Components created]

---

## Testing
[Test cases and scenarios]

---

## Known Issues
[Current limitations or bugs]

---

## Related Documentation
[Links to related docs]
```

---

## 🚨 Common Mistakes

1. **Skipping planning** → Design before coding
2. **No RLS policies** → Security vulnerability
3. **Complex queries in UI** → Move logic to backend
4. **Not testing as different users** → RLS bugs in production
5. **Forgetting loading states** → Poor UX
6. **Using browser alerts** → Use ConfirmModal
7. **Not updating documentation** → Future confusion
8. **Inconsistent patterns** → Read CLAUDE.md first
9. **Over-engineering** → Keep it simple (YAGNI)
10. **Not refetching data** → Stale state after actions

---

## 💡 Pro Tips

### Speed Up Development
- **Copy similar features** - Don't start from scratch
- **Use existing patterns** - Consistency is good
- **Read CLAUDE.md first** - Avoid known issues
- **Test incrementally** - Don't wait until the end

### Maintain Quality
- **Follow the design system** - Use ui-agent.md patterns
- **Write clear error messages** - Help users understand
- **Handle edge cases** - Empty states, errors, loading
- **Document as you go** - Don't wait until the end

### Avoid Pitfalls
- **Don't bypass RLS** - It's there for a reason
- **Don't use browser dialogs** - They're ugly and blocking
- **Don't forget mobile** - Test responsive design
- **Don't skip testing** - You'll regret it later

---

## 📚 Related Documentation

- **Technical patterns:** `CLAUDE.md`
- **Current status:** `PROJECT_STATUS.md`
- **Database context:** `docs/agents/contexts/database-agent.md`
- **UI context:** `docs/agents/contexts/ui-agent.md`
- **Feature examples:** `docs/features/implemented/`
- **Schema docs:** `docs/database/schema-overview.md`
- **Roadmap:** `docs/planning/ROADMAP.md`

---

## 🎯 Example: Complete Feature Implementation

**Feature:** Notification System

### 1. Database
```sql
-- Create table, RLS, indexes
-- Update schema docs
```

### 2. Types
```typescript
// lib/types/notification.ts
export interface Notification { ... }
```

### 3. Backend
```typescript
// Fetch notifications
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId);
```

### 4. UI
```typescript
// components/notifications/NotificationList.tsx
// app/notifications/page.tsx
```

### 5. Integration
```typescript
// Add to Navigation.tsx
// Add notification badge with count
```

### 6. Testing
- Test as different users
- Test read/unread states
- Test mobile view
- Check RLS policies

### 7. Documentation
```markdown
# Notification System
[Complete feature doc in docs/features/implemented/]
```

---

**For feature development, load this context + CLAUDE.md + relevant existing feature docs. Don't load everything at once - stay focused.**
