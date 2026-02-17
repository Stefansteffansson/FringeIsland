# Deusex Admin Foundation

**Status:** Active
**Phase:** 1.6 — Admin Foundation
**Last Updated:** February 17, 2026

---

## Overview

The Deusex system group exists with all 42 permissions (Tier 1 resolution) but has **no members** and no management infrastructure. This feature builds the minimal admin system: bootstrapping the first member, protecting against losing all admins, auto-granting future permissions, an audit log, and a basic admin panel.

**Key Capabilities:**
- Bootstrap `deusex@fringeisland.com` as first Deusex member
- Auto-grant new permissions to Deusex role via DB trigger
- Last-member protection (same pattern as Steward)
- Immutable admin audit log
- Admin panel with platform stats dashboard
- Deusex member management (add/remove by email)
- Route protection for `/admin/*`

---

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Auto-grant new permissions to Deusex | DB trigger on `INSERT INTO permissions` | Deusex must always have ALL permissions — manual adds are error-prone |
| 2 | Bootstrap first member | `deusex@fringeisland.com` via migration | Deterministic, auditable, no manual SQL |
| 3 | Last-member protection | DB trigger (same pattern as Steward) | Proven pattern, consistent enforcement |
| 4 | Admin panel | Minimal `/admin` now (Phase 1.6) | Enough to manage the platform; grows later |
| 5 | Deusex member management | In the admin panel | Self-service for Deusex members |
| 6 | Tiered admin access | Deferred to Phase 2+ | One tier (Deusex = full access) is sufficient now |

---

## Behaviors

| Code | Name | Sub-Sprint |
|------|------|------------|
| B-ADMIN-001 | Admin Route Protection | 2 (UI) |
| B-ADMIN-002 | Admin Dashboard | 2 (UI) |
| B-ADMIN-003 | Deusex Member Management | 2 (UI) |
| B-ADMIN-004 | Auto-Grant Permissions | 1 (DB) |
| B-ADMIN-005 | Last Deusex Member Protection | 1 (DB) |
| B-ADMIN-006 | Deusex Bootstrap | 1 (DB) |
| B-ADMIN-007 | Admin Audit Log | 1 (DB) |

Full specs: `docs/specs/behaviors/admin.md`

---

## Sub-Sprints

### Sub-Sprint 1: Deusex Foundation (DB Only)

**Migrations:**
- A: `auto_grant_permissions_to_deusex` — trigger on `permissions` INSERT
- B: `deusex_bootstrap` — add `deusex@fringeisland.com` to Deusex group
- C: `deusex_last_member_protection` — triggers on role/membership DELETE
- D: `admin_audit_log` — table + RLS policies

**Tests:** `tests/integration/admin/`
- `deusex-auto-grant.test.ts`
- `deusex-last-member.test.ts`
- `deusex-bootstrap.test.ts`
- `admin-audit-log.test.ts`

### Sub-Sprint 2: Admin Panel (UI)

**New Files:**
- `app/admin/layout.tsx` — permission gate
- `app/admin/page.tsx` — dashboard with stats
- `app/admin/deusex/page.tsx` — member management
- `components/admin/AdminStatCard.tsx`
- `components/admin/DeusexMemberList.tsx`

**Modified Files:**
- `components/Navigation.tsx` — conditional Admin link

**Tests:** `tests/integration/admin/`
- `admin-route-access.test.ts`
- `deusex-member-management.test.ts`

---

## Key Patterns

| Pattern | Source |
|---------|--------|
| Last-leader protection trigger | `supabase/migrations/20260216140506_rbac_role_management.sql` |
| Adding user to Deusex | `tests/integration/rbac/deusex-permissions.test.ts:30-65` |
| `has_permission()` RPC call | `lib/hooks/usePermissions.ts` |
| `ConfirmModal` for destructive actions | `components/ui/ConfirmModal.tsx` |
| Navigation conditional links | `components/Navigation.tsx` |

---

## Verification Checklist

- [ ] `deusex@fringeisland.com` is active Deusex member after bootstrap migration
- [ ] INSERT new permission → Deusex role auto-receives it
- [ ] Remove last Deusex member → blocked by trigger
- [ ] Log in as `deusex@fringeisland.com` → can access `/admin`
- [ ] Log in as normal user → `/admin` shows "Access Denied"
- [ ] Dashboard shows accurate platform stats
- [ ] Add user to Deusex by email → appears in member list
- [ ] Remove a Deusex member (when not last) → success, audit log entry
- [ ] All integration tests pass
