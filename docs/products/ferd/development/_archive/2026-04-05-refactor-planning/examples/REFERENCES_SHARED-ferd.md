# Ferd References to Shared Infrastructure

**Location:** `/docs/implementation/ferd/baseline/REFERENCES_SHARED.md`

**Purpose:** Document how Ferd-specific code integrates with shared backend infrastructure.

**Last Updated:** 2026-04-04

---

## Overview

Ferd is built on **shared infrastructure** that all FringeIsland products use. This document maps Ferd-specific implementation to shared backend components.

**Shared infrastructure location:** `/docs/implementation/shared/`

---

## Database Integration

### Shared Schema
**Location:** [/docs/implementation/shared/DATABASE_CURRENT.md](../../shared/DATABASE_CURRENT.md)

**Tables Ferd uses:**
- ✅ `users` — User profiles
- ✅ `groups` — Groups and personal groups
- ✅ `user_roles` — Role assignments
- ✅ `roles` — Role definitions with permissions
- ✅ `journeys` — Journey catalog
- ✅ `journey_steps` — Journey content
- ✅ `enrollments` — User/group journey enrollments
- ✅ `profile_data` — Flexible user data storage

**Ferd-specific queries:**
Located in: [API_ROUTES_CURRENT.md](./API_ROUTES_CURRENT.md)

**Example Ferd usage:**
```typescript
// Ferd queries shared database
const { data: groups } = await supabase
  .from('groups')  // Shared table
  .select('*')
  .filter('members.user_id', 'eq', userId);
```

---

## Authentication Integration

### Shared Auth System
**Location:** [/docs/implementation/shared/AUTH_SYSTEM.md](../../shared/AUTH_SYSTEM.md)

**Ferd implements:**
- Registration form → calls shared Supabase Auth
- Login form → calls shared Supabase Auth
- Session management → uses shared auth state
- Email verification → shared Supabase flow

**Ferd-specific implementation:**
- **Registration:** `/src/app/api/auth/register/route.ts`
- **Login:** `/src/app/api/auth/login/route.ts`
- **Session:** `/src/contexts/AuthContext.tsx`

**Example Ferd code:**
```typescript
// Ferd registration (uses shared auth)
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName }  // Ferd-specific: collect full name
  }
});

// Trigger on shared auth.users table creates public.users profile
```

**Shared triggers:**
- `on_auth_user_created` — Creates profile in `users` table
- Located in: [AUTH_SYSTEM.md](../../shared/AUTH_SYSTEM.md#triggers)

---

## Row Level Security Integration

### Shared RLS Policies
**Location:** [/docs/implementation/shared/RLS_POLICIES.md](../../shared/RLS_POLICIES.md)

**How Ferd benefits from RLS:**
- Users automatically can only see their own data
- Group members automatically see group data
- Stewards automatically have elevated permissions

**Ferd doesn't need to check permissions manually** — RLS enforces at database level.

**Example:**
```typescript
// Ferd queries — RLS automatically filters results
const { data: myGroups } = await supabase
  .from('groups')
  .select('*');
  // RLS ensures only user's groups returned (no WHERE clause needed)
```

**Shared function Ferd uses:**
```typescript
// Check permission via shared has_permission() function
const canInvite = await supabase.rpc('has_permission', {
  user_uuid: userId,
  group_uuid: groupId,
  permission_name: 'groups.invite'
});
```

**See:** [Shared RLS Policies](../../shared/RLS_POLICIES.md)

---

## Storage Integration

### Shared Storage Buckets
**Location:** [/docs/implementation/shared/STORAGE_BUCKETS.md](../../shared/STORAGE_BUCKETS.md)

**Buckets Ferd uses:**
- `avatars` — User and group avatars
- `journey_assets` — Journey thumbnails (future)

**Ferd-specific upload logic:**
```typescript
// Ferd avatar upload component
const uploadAvatar = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('avatars')  // Shared bucket
    .upload(`${userId}/${Date.now()}.jpg`, file);
  
  if (data) {
    // Update user.avatar_url in shared users table
    await supabase
      .from('users')
      .update({ avatar_url: data.path })
      .eq('id', userId);
  }
};
```

**Shared bucket policies:**
- RLS controls who can upload/download
- See: [STORAGE_BUCKETS.md](../../shared/STORAGE_BUCKETS.md)

---

## Backend API Integration

### Shared Edge Functions
**Location:** [/docs/implementation/shared/BACKEND_API.md](../../shared/BACKEND_API.md)

**Currently:** Ferd doesn't use shared Edge Functions (uses Next.js API routes)

**Future:** When Hamn, iOS, Android need backend logic, shared Edge Functions will be created.

**Example future shared function:**
- `send-invite-email` — Send group invite emails (all products need this)

**Ferd-specific API routes:**
- Located in: [API_ROUTES_CURRENT.md](./API_ROUTES_CURRENT.md)
- These are Next.js routes, not shared Edge Functions

---

## Supabase Configuration

### Shared Supabase Project
**Location:** [/docs/implementation/shared/SUPABASE_CONFIG.md](../../shared/SUPABASE_CONFIG.md)

**Ferd connects to shared Supabase:**
```typescript
// Ferd Supabase client configuration
const supabase = createClientComponentClient({
  supabaseUrl: 'https://jveybknjawtvosnahebd.supabase.co',  // Shared
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,    // Shared
});
```

**Environment variables (Ferd-specific):**
- `.env.local` contains Supabase keys
- Same keys used by Hamn, iOS, Android

**See:** [SUPABASE_CONFIG.md](../../shared/SUPABASE_CONFIG.md)

---

## Impact of Shared Changes

### When Shared Database Changes

**Scenario:** Backend team adds `users.timezone` column

**Impact on Ferd:**
1. Database types auto-regenerated (`types/database.ts`)
2. Profile edit form can add timezone field (optional)
3. No breaking changes (additive)

**Migration needed:** No (unless Ferd wants to use new column)

---

### When Shared RLS Policies Change

**Scenario:** Backend team adds new permission `journeys.create`

**Impact on Ferd:**
1. Ferd can check permission via `has_permission()` function
2. Ferd UI can conditionally show "Create Journey" button
3. No code changes required (optional feature)

**Migration needed:** No (unless Ferd exposes feature)

---

### When Shared Auth Changes

**Scenario:** Backend team enables Google OAuth

**Impact on Ferd:**
1. Ferd can add "Login with Google" button (optional)
2. Existing email/password still works
3. No breaking changes

**Migration needed:** No (additive)

---

## Ferd-Specific vs Shared

### What's Shared (Backend)
✅ Database schema  
✅ Authentication system  
✅ RLS policies  
✅ Storage buckets  
✅ Supabase configuration

**Maintained by:** Backend Team  
**Location:** `/docs/implementation/shared/`

### What's Ferd-Specific (Frontend)
✅ React components  
✅ Next.js pages and routes  
✅ Next.js API routes (backend-for-frontend)  
✅ Frontend state management  
✅ Tailwind styling  

**Maintained by:** Ferd Team (Stefan)  
**Location:** `/docs/implementation/ferd/baseline/`

---

## Cross-Product Coordination

### Changes Requiring Coordination

**Database schema changes:**
- Must coordinate with all product teams (Ferd, Hamn, iOS, Android)
- Breaking changes require migration plan across all products

**RLS policy changes:**
- Test impact on all products
- May affect query performance

**Auth flow changes:**
- Update all product login/registration flows consistently

**See:** [Cross-Product Dependencies](../../cross-product/DEPENDENCIES.md)

---

## Quick Reference

| Shared Component | Ferd Integration | Documentation |
|------------------|------------------|---------------|
| Database | Supabase JS queries | [DATABASE_CURRENT.md](../../shared/DATABASE_CURRENT.md) |
| Auth | Registration/login forms | [AUTH_SYSTEM.md](../../shared/AUTH_SYSTEM.md) |
| RLS | Automatic enforcement | [RLS_POLICIES.md](../../shared/RLS_POLICIES.md) |
| Storage | Avatar uploads | [STORAGE_BUCKETS.md](../../shared/STORAGE_BUCKETS.md) |
| Supabase | Client configuration | [SUPABASE_CONFIG.md](../../shared/SUPABASE_CONFIG.md) |

---

## Related Documentation

**Shared Infrastructure:**
- [Index](../../shared/INDEX.md)
- [Database](../../shared/DATABASE_CURRENT.md)
- [Auth](../../shared/AUTH_SYSTEM.md)
- [RLS](../../shared/RLS_POLICIES.md)

**Ferd-Specific:**
- [Ferd Frontend](./FRONTEND_CURRENT.md)
- [Ferd API Routes](./API_ROUTES_CURRENT.md)
- [Ferd Baseline](./BASELINE.md)

**Product Docs:**
- [Ferd Architecture](/docs/products/ferd/architecture/ANATOMY.md)
- [Ferd Requirements](/docs/products/ferd/specification/REQUIREMENTS.md)

---

**Maintained by:** Ferd Team (Stefan)  
**Update trigger:** When shared infrastructure changes  
**Last reviewed:** 2026-04-04
