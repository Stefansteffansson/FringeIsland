# FringeIsland - Session Bridge Document

**Version:** 0.2.7  
**Date:** January 26, 2026  
**Status:** Phase 1.3 COMPLETE (Phase 1: 70% complete)

---

## 🎯 **Quick Context**

Educational platform for personal development using "journey" metaphor. Users take structured learning experiences solo or in groups.

**Tech:** Next.js 16.1 + TypeScript + Tailwind + Supabase  
**Database:** 13 tables, 8 migrations, full RLS  
**Repository:** https://github.com/Stefansteffansson/FringeIsland  
**Supabase:** https://jveybknjawtvosnahebd.supabase.co

---

## ✅ **What's Complete (v0.2.7)**

### Authentication & Profile
- ✅ Signup, login, logout (Supabase Auth)
- ✅ Profile editing (full_name, bio)
- ✅ Avatar upload (Supabase Storage)
- ✅ Soft delete (is_active flag)

### Group Management (Phase 1.3 - 100%)
- ✅ Create groups from templates
- ✅ View groups (list + detail pages)
- ✅ **Edit groups** (`/groups/[id]/edit`) - v0.2.7
- ✅ **Invite members by email** - v0.2.7
- ✅ Accept/decline invitations (`/invitations`)
- ✅ Leave/remove members
- ✅ **Role assignment** (promote/assign/remove) - v0.2.6.2
- ✅ Last leader protection (DB trigger)

### Navigation & UX
- ✅ Global navigation bar
- ✅ Invitation badges (real-time count)
- ✅ User menu dropdown (avatar)
- ✅ ConfirmModal (replaced all alerts)
- ✅ Responsive design

---

## 🚧 **What's Next: Phase 1.4 Journey System**

**Not Started:**
- Journey catalog/browsing
- Journey details page
- Enrollment (individual + group)
- Progress tracking
- Content delivery

---

## 🔑 **Critical Patterns**

### Code Patterns
- Default landing: `/groups` (not `/profile`)
- After role changes: Update `members` + `userRoles` + `isLeader` states
- Use `ConfirmModal` component, never `window.alert()` or `window.confirm()`
- Check `isLeader` for Group Leader-only actions
- Use `maybeSingle()` instead of `single()` to avoid errors on null

### Database
- Table: `users` uses `full_name` (not `display_name`)
- Status values: 'active', 'invited', 'paused', 'removed'
- PostgreSQL: No subqueries in CHECK constraints, use triggers
- Last leader protection: Database trigger in migration #8

### Next.js 16
- Use `proxy.ts` (not `middleware.ts`)
- App Router structure
- Client components: `'use client'` at top

---

## 📁 **Key Files**

### Documentation (Always Update!)
- `CHANGELOG.md` (root) - Version history
- `README.md` (root) - Project overview
- `CLAUDE.md` (root) - AI context
- `docs/planning/ROADMAP.md` - Phase tracking
- `docs/planning/DEFERRED_DECISIONS.md` - Deferred features

### Migrations
8 files in `supabase/migrations/`:
1. Initial schema (13 tables)
2. User trigger + RLS
3-7. Group RLS policies + invitations
8. Last leader protection trigger

### Key Components
- `components/Navigation.tsx` - Global nav
- `components/groups/InviteMemberModal.tsx` - Invite modal
- `components/groups/AssignRoleModal.tsx` - Role assignment
- `components/ui/ConfirmModal.tsx` - Reusable confirmation

### Key Pages
- `app/groups/page.tsx` - Groups list
- `app/groups/[id]/page.tsx` - Group detail
- `app/groups/[id]/edit/page.tsx` - Edit group (NEW v0.2.7)
- `app/groups/create/page.tsx` - Create group
- `app/invitations/page.tsx` - Invitations

---

## 🎓 **Important Learnings**

1. **PostgreSQL:** Can't use subqueries in CHECK constraints → use triggers
2. **Next.js 16:** Changed from `middleware.ts` to `proxy.ts`
3. **Supabase Keys:** New format `sb_publishable_...` (not JWT)
4. **State Updates:** After role changes, must update ALL related states
5. **Last Leader:** Hide × button completely (not just disable)
6. **Default Redirect:** After login/signup → `/groups` (not `/profile`)

---

## ⏭️ **Deferred to Phase 2**

- Subgroups (database supports, UI deferred)
- Custom role permissions
- Pause/activate members
- Journey creation by users
- Forums and messaging
- Advanced analytics

---

## 📊 **Project Stats**

- **Lines of Code:** ~15,000+ (estimate)
- **Components:** 20+
- **Pages:** 12
- **Database Tables:** 13
- **Migrations:** 8
- **Permissions:** 40 seeded
- **Role Templates:** 5 seeded
- **Group Templates:** 4 seeded

---

## 🚀 **Commands**

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build           # Build for production
npm run lint            # Run ESLint

# Git
git add .
git commit -m "message"
git push origin main

# Database
# Migrations in supabase/migrations/ run in order
```

---

## 💡 **Quick Reference**

**Supabase Project ID:** jveybknjawtvosnahebd  
**Default User Landing:** /groups  
**Auth Context:** `useAuth()` hook  
**Protected Routes:** Check `user` and `loading` states  
**Modal Pattern:** Use `ConfirmModal` component  
**Role Check:** `isLeader` state from fetched roles

---

**Last Session:** Edit Group + Invite Members implementation (v0.2.7)  
**Next Session:** Begin Phase 1.4 - Journey System  
**Documentation:** All files updated and committed

---

## 📝 **For Next Claude Session**

1. Read this bridge document first
2. Check CLAUDE.md for detailed patterns
3. Review ROADMAP.md for Phase 1.4 requirements
4. Start with journey catalog/browsing UI
5. Remember: No new migrations needed unless schema changes

**Phase 1.3 is COMPLETE! Time to build the Journey System! 🎉**
