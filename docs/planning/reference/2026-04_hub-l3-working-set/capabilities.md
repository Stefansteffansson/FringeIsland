# Capabilities — what the platform supports today

**Source:** Synthesized from `docs/TMP/OLDFEAT/*` (16 feature docs covering Ferd: 10× FR-, 5× AR-, 1× NF-).
**Date:** 2026-04-28.
**Scope:** What is *implemented* (or has implementation status documented) — not what is planned for later waves. Where a sub-capability is partial or has known gaps, it is annotated.

---

## 1. Identity, accounts, and sessions
- **Account creation & sign-in** (email/password via Supabase Auth; signup, signin, signout).
- **Session refresh on every request** via Next.js 16 `proxy.ts` (cookie-based; no redirects in proxy — route protection is component-level via `useAuth()`).
- **User profile** with full name + display name / nickname. The personal group's `name` is the public-facing identity; nickname propagates to forums, messages, member lists, navigation.
- **Admin-managed account lifecycle:**
  - Activate / Deactivate (reversible) — `admin_update_user_status`.
  - Decommission (irreversible flag) — `admin_decommission_user`.
  - Hard-delete (reassign content to `[Deleted User]` sentinel, cascade-delete personal group, remove `auth.users`) — `admin_hard_delete_user`.
- **Force-logout** (Realtime broadcast + 10s polling fallback; server-side session deletion).
- **Known gaps:** no self-service account deletion, no per-device session management, no self-service reactivation page.

## 2. Universal group model (D15 foundation)
- **Three group tiers:**
  - *System* (Visitor, FringeIsland Members, Deusex) — permissions always active.
  - *Personal* (1 per user, auto-created on signup) — identity + "My Home"; user is sole member with the `Myself` role.
  - *Engagement* (user-created) — collaborative containers; **groups can join groups** (transitive access).
- **Group status lifecycle:** `active` · `closed` · `archived` · `suspended`.
- **No `user_id` columns in domain tables** — everything (enrollments, forum posts, messages, notifications) addresses the personal group as the user's stand-in.

## 3. Dynamic permissions (RBAC)
- **42 seeded permissions** across categories: group management, journey, journey participation, communication, profile, admin.
- **Four engagement-group role templates:** Steward, Guide, Member, Observer (default permission grid resolved in D18a).
- **Custom roles & permission sets:** Deusex can CRUD role templates and per-group roles.
- **Two-tier permission resolution:** `effective = system group permissions + context group permissions` — additive, no override logic. Implemented via `has_permission()` (`SECURITY DEFINER`, `STABLE`).
- **Auto-grant trigger:** new permissions added to the catalog are automatically granted to the Deusex role.

## 4. Group management
- Create / edit / delete engagement groups.
- Visibility (public vs private) and member-list visibility controls (Steward-only).
- Member operations: invite, remove, pause, activate, assign role, remove role.
- View members & member profiles (all four roles can view; permission-gated).
- Browse public groups (`browse_public_groups`).

## 5. Invitations
- **User-search typeahead** in `InviteMemberModal` (300 ms debounce, 8 results, excludes self + current members).
- **Pending email invitations for non-users** — stored in `pending_email_invitations`; `handle_new_user()` trigger auto-claims on signup, materializing a `group_memberships` row with `status='invited'`.
- **Accept / decline** flow on Invitations page.

## 6. Group exit & lifecycle (four tracks, all implemented)
- **L1 Regular leave** — member exits; non-public enrollments frozen (`frozen_reason='left_group'`).
- **L2 Sole-Steward handover (DeusEx fallback)** — DeusEx receives membership + Steward role; pending invitations transferred; original Steward then exits.
- **L3 Last-member closure** — group `status → 'closed'`, all enrollments frozen, non-public journeys reassigned to DeusEx.
- **L4 Stewardship nomination** — sole Steward submits a ranked nominee list; smart notification chain with 7-day expiry per nominee; on accept → L1; on all-decline/timeout → L2.
- **Admin platform exit** — `admin_exit_user_from_platform` sweeps every engagement group (auto-routing each through L1/L2/L3), decommissions the user, force-logs-out, writes audit log.

## 7. Journey system
- **Catalog browse** (public/published; visitor-accessible).
- **Two enrollment modes:**
  - *Individual* — `enroll_self` via personal group.
  - *Group* — Steward/Guide enrolls an engagement group.
- **JourneyPlayer** — linear step navigation, required-step gating, progress autosave to `progress_data` JSONB, resume via `current_step_id`, completion detection.
- **Per-step tracking:** `completed_at`, `time_spent_minutes`, running total, `last_checkpoint`.
- **Frozen enrollments** — RLS-enforced read-only mode, amber banner, "Mark Complete" hidden, navigation limited to already-completed steps; `frozen_reason ∈ {left_group, group_closed}`.
- **Review mode** for completed journeys (free navigation).
- **Bootstrapped content:** "FringeIsland Journeys" engagement group owns 8 predefined public journeys.

## 8. Communication
- **1:1 direct messaging** — conversation inbox at `/messages`, detail view at `/messages/[id]`, real-time via Supabase Realtime, per-conversation unread tracking, unread count in nav.
- **Group forums** — `view_forum`, `post_forum_messages`, `reply_to_messages`, `moderate_forum`. Authored as `author_group_id` (personal group), so display name flows through.

## 9. Notifications
- **Passive notifications** — Realtime push (Supabase channel) with REST fallback on reconnect; unread badge; mark-read.
- **Smart notifications** (Sprint 3) — `action_type` (e.g., `accept_decline`), `action_data`, `expires_at`; in-bell Accept/Decline UI; consistency constraint between action fields.
- **RPCs:** `handle_notification_action`, `nominate_steward`, `_handle_stewardship_nomination_action`.
- **Lazy expiry** — expired pending actions auto-decline on next view.
- **Notification types implemented:** `stewardship_nomination` (smart), `stewardship_accepted`, `stewardship_declined_all`, `stewardship_transferred`, `stewardship_required`, `group_closed`, plus passive types from earlier sprints.

## 10. Admin / DeusEx
- **Bootstrap** of `deusex@fringeisland.com` as first DeusEx member; **last-member protection** (cannot remove the only DeusEx).
- **Route gating** for `/admin/*` (layout-level permission check).
- **Platform stats dashboard** (AdminStatCard tiles).
- **Users panel** with cross-page selection persistence, decommissioned-user toggle, status badges, and a 10-button action bar (selection-aware, context-sensitive disabling).
- **DeusEx member management** page (add/remove by email).
- **Immutable admin audit log** for all admin RPCs.

## 11. Cross-cutting & non-functional
- **Performance optimizations** in admin panel: inline-count single query, two-tier loading (skeleton vs subtle overlay), 300 ms debounced search, adjacent-page prefetch, shared `buildQuery()` helper.
- **Supabase singleton client** (browser) for stable React effect dependencies.
- **RLS-first security** — every domain table; `is_platform_admin()` SECURITY DEFINER for admin policies; frozen-state enforcement at RLS, not just UI.

---

## Capability inventory at a glance

| # | Capability area | Status |
|---|---|---|
| 1 | Identity, accounts, sessions | Implemented (with documented gaps) |
| 2 | Universal group model (D15) | Implemented (foundation) |
| 3 | Dynamic permissions (RBAC) | Implemented |
| 4 | Group management | Implemented |
| 5 | Invitations (user + email) | Implemented |
| 6 | Group exit & lifecycle (L1–L4 + admin exit) | Implemented |
| 7 | Journey system (browse, enroll, play, freeze) | Implemented |
| 8 | Direct messaging + group forums | Implemented |
| 9 | Notifications (passive + smart) | Implemented |
| 10 | Admin / DeusEx | Implemented |
| 11 | Performance optimizations | Implemented (admin panel scope) |

---

## Method note
This file was generated by indexing every document under `docs/TMP/OLDFEAT/` into a BM25 knowledge base and querying for each capability cluster. Source labels (e.g., `[FR-journey-system]`, `[AR-dynamic-permissions]`) trace each statement back to its originating doc; consult those files for full technical detail (schemas, RPCs, RLS policies, sprint history).
