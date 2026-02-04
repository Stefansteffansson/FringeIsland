# Authentication System

**Status:** ✅ Implemented
**Version:** 0.2.1
**Last Updated:** January 23, 2026

---

## Overview

Complete authentication system using Supabase Auth with email/password, session management, and protected routes.

---

## Features

### User Signup
- Email and password registration
- Email validation
- Automatic profile creation
- Immediate sign-in after signup
- Default redirect to /groups page

### User Login
- Email and password authentication
- Session persistence
- Remember me functionality (via Supabase)
- Error handling with user-friendly messages
- Redirect to originally requested page

### User Logout
- Clear session
- Redirect to homepage
- Clean state reset

### Session Management
- AuthContext for global state
- useAuth() hook for components
- Automatic session refresh
- Session persistence across page reloads

### Protected Routes
- Middleware-based protection (proxy.ts)
- Automatic redirect to /login for unauthenticated users
- Preserves intended destination
- Public routes: /, /login, /signup

---

## Architecture

### AuthContext
**Location:** `lib/auth/AuthContext.tsx`
**Purpose:** Global authentication state management

**Provides:**
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

**Usage:**
```typescript
import { useAuth } from '@/lib/auth/AuthContext';

function Component() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.email}</div>;
}
```

### Supabase Integration
**Client:** `lib/supabase/client.ts` (browser)
**Server:** `lib/supabase/server.ts` (SSR/API routes)

**Authentication flow:**
1. User submits credentials
2. Supabase validates and creates session
3. AuthContext updates with user data
4. Trigger fires to create/update user profile
5. Navigation refreshes

### User Profile Creation
**Trigger:** `create_user_profile()`
**Fires on:** INSERT auth.users
**Creates:** Record in users table

**Links:**
- auth.users.id → users.auth_user_id
- Copies email from auth to users.email
- Sets default full_name from email
- Enables profile management

### User Deletion Handling
**Trigger:** `handle_user_deletion()`
**Fires on:** DELETE auth.users
**Action:** Sets users.is_active = false (soft delete)

**Preserves:**
- User's historical data
- Group memberships (historical)
- Created groups (ownership record)
- Journey enrollments (progress record)

---

## Components

### AuthForm
**Location:** `components/auth/AuthForm.tsx`
**Purpose:** Unified login/signup form component

**Features:**
- Toggle between login and signup modes
- Form validation
- Error handling
- Loading states
- Smooth transitions

**Props:**
```typescript
interface AuthFormProps {
  mode: 'login' | 'signup';
}
```

### Navigation Authentication State
**Location:** `components/Navigation.tsx`
**Shows:**
- Logged in: User avatar + dropdown menu
- Logged out: Sign In + Get Started buttons

---

## Database Schema

### auth.users (Supabase managed)
- id (uuid, primary key)
- email (text, unique)
- encrypted_password (text)
- email_confirmed_at (timestamp)
- created_at (timestamp)
- last_sign_in_at (timestamp)

### users (Application table)
- id (uuid, primary key)
- auth_user_id (uuid, foreign key to auth.users)
- email (text, unique)
- full_name (text)
- avatar_url (text, nullable)
- bio (text, nullable)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)

---

## Security

### RLS Policies (users table)
**SELECT:**
- Users can view their own profile
- Users can search others by email (for invitations)

**UPDATE:**
- Users can only update their own profile
- Cannot change email or auth_user_id

**INSERT/DELETE:**
- Handled by triggers only
- Application cannot directly insert/delete

### Password Security
- Handled entirely by Supabase Auth
- Encrypted at rest
- Bcrypt hashing
- No password exposure to application

### Session Security
- HTTP-only cookies (via Supabase)
- Secure flag in production
- Automatic expiration
- Refresh token rotation

---

## Routes

### Public Routes
- `/` - Homepage
- `/login` - Login page
- `/signup` - Signup page

### Protected Routes
- `/groups` - My Groups (default landing after auth)
- `/groups/[id]` - Group detail
- `/groups/create` - Create group
- `/profile` - User profile
- `/profile/edit` - Edit profile
- `/journeys` - Journey catalog
- `/my-journeys` - Enrolled journeys
- `/invitations` - Pending invitations

---

## User Flows

### Signup Flow
1. User visits /signup
2. Enters email + password
3. Submits form
4. Supabase creates auth.users record
5. Trigger creates users record
6. User automatically signed in
7. Redirect to /groups

### Login Flow
1. User visits /login (or redirected from protected route)
2. Enters email + password
3. Submits form
4. Supabase validates credentials
5. Session created and stored
6. AuthContext updated
7. Redirect to original destination or /groups

### Logout Flow
1. User clicks Logout in navigation
2. signOut() called from AuthContext
3. Supabase session cleared
4. AuthContext updated (user = null)
5. Navigation refreshes
6. Redirect to homepage

---

## Error Handling

### Common Errors
- Invalid credentials → "Invalid email or password"
- Email already exists → "Email already registered"
- Network error → "Connection failed. Please try again."
- Session expired → Automatic redirect to /login

### User-Friendly Messages
- Never expose technical details
- Clear actionable messages
- Links to relevant help

---

## Testing

### Test Cases
- ✅ Signup with new email works
- ✅ Signup with existing email shows error
- ✅ Login with correct credentials works
- ✅ Login with wrong password shows error
- ✅ Protected routes redirect to login
- ✅ Logout clears session
- ✅ Session persists across page reloads
- ✅ User profile created automatically
- ✅ Account deletion soft-deletes profile

---

## Future Enhancements

### Phase 2 (Planned)
- Social authentication (Google, GitHub)
- Two-factor authentication
- Password reset via email
- Email verification requirement
- Magic link authentication

### Phase 3 (Planned)
- SSO for organizations
- SAML integration
- Role-based access control at auth level
- Session management UI

---

## Technical Details

### Next.js 16 Middleware
**File:** `proxy.ts` (not middleware.ts in Next.js 16)
**Export:** Named export `proxy` (not default)

**Pattern:**
```typescript
export const proxy = async (request: NextRequest) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
};
```

### AuthContext Pattern
**Wraps entire app** in layout.tsx
**Provides global state** via React Context
**Custom hook** for easy access

---

## Related Documentation

- **Full implementation:** `docs/implementation/AUTH_IMPLEMENTATION.md`
- **Database schema:** `docs/database/schema-overview.md`
- **User profile feature:** `docs/features/implemented/profile-management.md`

---

## Changelog

**v0.2.1** (Jan 23, 2026)
- Fixed user profile creation trigger
- Added soft delete on account deletion
- Updated RLS policies for email search

**v0.2.0** (Jan 20, 2026)
- Initial authentication system
- Login and signup pages
- AuthContext and useAuth hook
- Protected route middleware
