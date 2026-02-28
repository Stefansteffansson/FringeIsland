# FringeIsland - Session Bridge Document

**Version:** 0.2.8  
**Date:** January 27, 2026  
**Status:** Phase 1.4 Journey Catalog COMPLETE (Phase 1: 75% complete)

---

## 🎯 **Quick Context**

Educational platform for personal development using "journey" metaphor. Users take structured learning experiences solo or in groups.

**Tech:** Next.js 16.1 + TypeScript + Tailwind + Supabase  
**Database:** 13 tables, 9 migrations, full RLS  
**Repository:** https://github.com/Stefansteffansson/FringeIsland  
**Supabase:** https://jveybknjawtvosnahebd.supabase.co

---

## ✅ **What's Complete (v0.2.8)**

### Authentication & Profile
- ✅ Signup, login, logout (Supabase Auth)
- ✅ Profile editing (full_name, bio)
- ✅ Avatar upload (Supabase Storage)
- ✅ Soft delete (is_active flag)

### Group Management (Phase 1.3 - 100%)
- ✅ Create groups from templates
- ✅ View groups (list + detail pages)
- ✅ Edit groups (`/groups/[id]/edit`)
- ✅ Invite members by email
- ✅ Accept/decline invitations (`/invitations`)
- ✅ Leave/remove members
- ✅ Role assignment (promote/assign/remove)
- ✅ Last leader protection (DB trigger)

### Journey System - Browsing (Phase 1.4 Part 1 - 100%) 🎉 **NEW!**
- ✅ **Journey catalog page** (`/journeys`) - v0.2.8
  - Search by title/description
  - Filter by difficulty (beginner, intermediate, advanced)
  - Filter by topic/tags
  - Grid layout with journey cards
  - Results counter
- ✅ **Journey detail page** (`/journeys/[id]`) - v0.2.8
  - Hero section with gradient
  - Breadcrumb navigation
  - Two tabs: Overview and Curriculum
  - Expandable step list
  - Sticky sidebar with metadata
  - "Enroll in Journey" button (placeholder)
- ✅ **8 Predefined journeys seeded** - Migration #9
  - Leadership Fundamentals (180 min, Beginner)
  - Effective Communication Skills (240 min, Beginner)
  - Building High-Performance Teams (300 min, Intermediate)
  - Personal Development Kickstart (150 min, Beginner)
  - Strategic Decision Making (270 min, Advanced)
  - Emotional Intelligence at Work (210 min, Intermediate)
  - Agile Team Collaboration (200 min, Intermediate)
  - Resilience and Stress Management (180 min, Beginner)
- ✅ **TypeScript types** (`lib/types/journey.ts`)
- ✅ **Navigation updated** (Journeys link added)

### Navigation & UX
- ✅ Global navigation bar
- ✅ Invitation badges (real-time count)
- ✅ User menu dropdown (avatar)
- ✅ **Journeys link** 🗺️ (NEW v0.2.8)
- ✅ ConfirmModal (replaced all alerts)
- ✅ Responsive design

---

## 🚧 **What's Next: Phase 1.4 Journey System (Part 2)**

**Not Started:**
- Journey enrollment (individual + group) 🎯 **IMMEDIATE NEXT**
- View enrolled journeys page
- Journey content delivery
- Progress tracking
- Travel Guide views

---

## 🔑 **Critical Patterns**

### Code Patterns
- Default landing: `/groups` (not `/profile`)
- After role changes: Update `members` + `userRoles` + `isLeader` states
- Use `ConfirmModal` component, never `window.alert()` or `window.confirm()`
- Check `isLeader` for Group Leader-only actions
- Use `maybeSingle()` instead of `single()` to avoid errors on null
- **Journey types**: Import from `lib/types/journey.ts`
- **Journey content**: Stored as JSONB with steps array

### Database
- Table: `users` uses `full_name` (not `display_name`)
- Status values: 'active', 'invited', 'paused', 'removed'
- PostgreSQL: No subqueries in CHECK constraints, use triggers
- Last leader protection: Database trigger in migration #8
- **Journey enrollment status**: 'active', 'completed', 'paused', 'frozen'
- **Journey content**: JSONB with version, structure, steps

### Next.js 16
- Use `proxy.ts` (not `middleware.ts`)
- App Router structure
- Client components: `'use client'` at top
- Dynamic routes: `[id]/page.tsx` for detail pages

---

## 📁 **Key Files**

### Documentation (Always Update!)
- `CHANGELOG.md` (root) - Version history ✅ UPDATED v0.2.8
- `README.md` (root) - Project overview ✅ UPDATED v0.2.8
- `CLAUDE.md` (root) - AI context ✅ UPDATED v0.2.8
- `docs/planning/ROADMAP.md` - Phase tracking ⚠️ NEEDS UPDATE
- `docs/planning/DEFERRED_DECISIONS.md` - Deferred features

### Migrations
9 files in `supabase/migrations/`:
1. Initial schema (13 tables)
2. User trigger + RLS
3-7. Group RLS policies + invitations
8. Last leader protection trigger
9. **Seed 8 predefined journeys** (NEW v0.2.8)

### Key Components
- `components/Navigation.tsx` - Global nav (updated v0.2.8)
- `components/groups/InviteMemberModal.tsx` - Invite modal
- `components/groups/AssignRoleModal.tsx` - Role assignment
- `components/ui/ConfirmModal.tsx` - Reusable confirmation

### Key Pages
- `app/groups/page.tsx` - Groups list
- `app/groups/[id]/page.tsx` - Group detail
- `app/groups/[id]/edit/page.tsx` - Edit group
- `app/groups/create/page.tsx` - Create group
- `app/invitations/page.tsx` - Invitations
- **`app/journeys/page.tsx` - Journey catalog** (NEW v0.2.8)
- **`app/journeys/[id]/page.tsx` - Journey detail** (NEW v0.2.8)

### Key Types
- **`lib/types/journey.ts` - Journey TypeScript types** (NEW v0.2.8)

---

## 🎓 **Important Learnings**

1. **PostgreSQL:** Can't use subqueries in CHECK constraints → use triggers
2. **Next.js 16:** Changed from `middleware.ts` to `proxy.ts`
3. **Supabase Keys:** New format `sb_publishable_...` (not JWT)
4. **State Updates:** After role changes, must update ALL related states
5. **Last Leader:** Hide × button completely (not just disable)
6. **Default Redirect:** After login/signup → `/groups` (not `/profile`)
7. **JSX Strings:** Use double quotes for strings containing apostrophes (NEW v0.2.8)
8. **Journey Migration:** Auto-detects first active user as creator (NEW v0.2.8)

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

- **Lines of Code:** ~16,200+ (estimate)
- **Components:** 22+
- **Pages:** 14
- **Database Tables:** 13
- **Migrations:** 9 (NEW)
- **Permissions:** 40 seeded
- **Role Templates:** 5 seeded
- **Group Templates:** 4 seeded
- **Predefined Journeys:** 8 seeded (NEW)

---

## 🚀 **Commands**

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build           # Build for production
npm run lint            # Run ESLint

# Git
git add .
git commit -m "feat: Add journey catalog and browsing (v0.2.8)"
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
**Journey Types:** Import from `lib/types/journey.ts`

---

**Last Session:** Journey Catalog & Browsing implementation (v0.2.8)  
**Next Session:** Journey Enrollment functionality  
**Documentation:** CHANGELOG, README, CLAUDE updated ✅ | ROADMAP needs update ⚠️

---

## 📝 **For Next Claude Session**

1. Read this bridge document first
2. Check CLAUDE.md for detailed patterns
3. Review ROADMAP.md Phase 1.4 requirements
4. **Next task:** Implement journey enrollment
   - Individual enrollment (any user can enroll)
   - Group enrollment (Group Leaders only)
   - Check for existing enrollments
   - Create enrollment records in `journey_enrollments` table
   - Show enrolled journeys somewhere (dashboard or separate page)
5. Remember: Use TypeScript types from `lib/types/journey.ts`

**Phase 1.4 Part 1 is COMPLETE! Time to build enrollment! 🎉**

---

## 🔍 **What Was Built Today (v0.2.8)**

### Files Created (4 new)
1. `supabase/migrations/20260127_seed_predefined_journeys.sql` - Migration with 8 journeys
2. `lib/types/journey.ts` - Complete TypeScript types
3. `app/journeys/page.tsx` - Journey catalog page
4. `app/journeys/[id]/page.tsx` - Journey detail page

### Files Modified (1)
1. `components/Navigation.tsx` - Added Journeys link

### Implementation Stats
- **Lines Added:** ~1,200
- **Time to Implement:** ~2 hours
- **Tests Passed:** All manual test cases successful ✅
- **Ready for:** Journey enrollment implementation

---

**Session Complete! Ready for enrollment feature development! 🚀**
