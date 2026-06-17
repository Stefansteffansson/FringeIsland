# Hub v2 — behaviour inventory (the oracle)

**Status:** v1, 2026-06-17 (Phase 1, deliverable 3). Living — corrected by the build-informed spec-evolution loop ([PROCESS §9](../PROCESS.md)).
**Plan:** [Hub v2 README](./README.md) · **Decision:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md) · **Companion deliverables:** the refreshed [Hub SPECIFICATION](../../products/hub/SPECIFICATION.md) (deliverable 1) and [`substrate-audit.md`](./substrate-audit.md) (deliverable 2).

> **What this is.** ADR-U030 keeps the old Hub MVP frozen as a **read-only oracle**: its tests are "what v2 must still do." This document catalogues the *behavioural guarantees* the existing suite encodes, organized so each area's Phase-3 rebuild can seed its TDD from the ported guarantees — and, just as important, names where the oracle is **silent**, so those behaviours get specified fresh from canon rather than assumed.

---

## Method, scale & provenance

- **Source:** the existing suite under `tests/` — **~650 test cases across ~69 files** (the plan's "~69 tests" = test *files*). By area: rbac 171 · admin 106 · unit 105 · groups 80 · journeys 57 · communication 50 · auth 29 · users 28 · security 19 · rls 7 · e2e 7.
- **How it was read:** the suite was digested area-by-area; the `describe(...)`/`it(...)` description strings are the behaviour statements. Raw test code stays in the oracle (the frozen MVP) — this doc carries the *synthesis*. Test-ID tags (`B-RBAC-001`, `B-GRP-009`, …) are the suite's own identifiers, kept for traceability.
- **Reconciliation with the substrate audit:** every group-keyed-authorship / four-hop-actor / last-X-invariant guarantee below is consistent with [`substrate-audit.md`](./substrate-audit.md). Divergences and silences are called out in **Cross-cutting findings**.

### The oracle contract (how Phase 3 uses this)

For each area: **STRONG** = port the guarantees as failing tests first, then build to green. **PARTIAL** = port what exists; specify the rest from canon. **NONE** = no oracle; specify fresh from the refreshed Hub §L3 + canon (do **not** infer behaviour from the old code's absence). The **Coverage map** at the end is the index.

---

## Permission model, RLS & security

### RBAC / three-layer permission model (PC-3)

**Permission catalog integrity (B-RBAC-001/018/023)** — Guarantees the catalog holds exactly **44 permissions** in fixed category counts (15 group_management, 10 journey_management, 6 journey_participation, 5 communication, 3 feedback, 5 platform_admin); every permission has a description; the picker query returns them grouped by category; authenticated users **cannot INSERT** into the catalog (immutable to end users).

**Three-tier resolution (B-RBAC-008/009/010, B-D15-003)** — Guarantees `has_permission()` is true when an active member's role carries the permission, false otherwise; multi-role users get the **union**; Tier-1 system group "FringeIsland Members" grants baseline permissions (create_group, browse_journey_catalog) but never engagement-group permissions; resolution is **additive** across system + context groups; false for non-members and for `invited`/`removed`/`paused` status (only `active` resolves); graceful false (not error) on NULL/non-existent inputs. **Canon — group-keyed actor:** an engagement group can be the active, permission-bearing actor in another group (four-hop, not raw user).

**Role assignment & custom roles (B-RBAC-019–022/025)** — Guarantees only a Steward (RLS) can create/rename/delete custom roles and add/remove permissions; role names unique per group; a role may have zero permissions; deleting a role cascades its assignments.

**Auto-grants on signup (B-RBAC-017)** — Guarantees signup auto-creates exactly one personal group (named after nickname, user as sole member) with a **"Myself" role carrying zero permissions** (self-check returns false — personal group is not a permission surface), and auto-enrolls the user into "FringeIsland Members" (Tier-1 baseline).

**DeusEx superuser (B-RBAC-012/006)** — Guarantees a DeusEx user resolves true for **all 44** permissions in any group; a normal user never resolves platform_admin; system groups are hidden from normal listings and undeletable by regular users.

**Template → role copy (B-RBAC-004/005/007)** — Guarantees exactly **4 role templates** (Steward, Guide, Member, Observer — after renaming "Group Leader"→"Steward", "Travel Guide"→"Guide", and removing "Platform Admin"); instantiating a role **copies** its template permissions (Steward 31, Guide 15, Member 12, Observer 7) and is thereafter **independent** of the template (edits don't propagate either way); existing groups were backfilled.

**Invariants** — **Last-Steward** cannot be removed (survives the role rename); template-originated roles cannot be deleted; **anti-escalation** (B-RBAC-024): an actor cannot grant a permission they do not themselves hold.

**UI gating (B-RBAC-013–016)** — Guarantees role-correct permission sets drive UI (Steward alone holds edit_group_settings/invite/remove/assign_roles/delete_group/moderate_forum; all roles hold view_member_list); enrollment gating (enroll_group_in_journey only Steward/Guide; enroll_self universal via Tier-1).

**Maps to Hub §L3:** A-GRP (membership, roles, group-as-actor enrollment), A-IDN (signup auto-provisioning, Myself role), A-ADM (role/permission admin, DeusEx, templates). **Strength: VERY STRONG.**

### Row-Level Security (V4)

**Group visibility (B-GRP-003)** — Guarantees members view private groups they belong to; non-members blocked; public groups viewable by anyone; list queries filtered to authorized groups; **direct-ID queries cannot bypass** (no UUID-guessing); access revoked **immediately** on membership-status change; `invited` (not-yet-active) users cannot view private groups.

**Maps to Hub §L3:** A-GRP, A-IDN. RLS is the enforcement floor — visibility derives from active membership at the data layer, not client-side filtering. **Strength: STRONG** (also woven through every other suite).

### Security

**Frozen-enrollment immutability (B-SEC-003/004)** — Guarantees RLS **blocks all UPDATEs** on frozen enrollments (progress_data, status — no self-unfreeze, last_accessed_at); active/completed/paused remain updatable (no regression); frozen rows **stay readable** (review access preserved); only the service role can unfreeze. *(This is where frozen-state read-only semantics ARE oracled — the journeys suite only declares the status enum.)*

**Non-public journey access (B-SEC-001/002)** — Guarantees public published journeys are visible to any authenticated user; non-public ones are hidden from non-members (incl. **direct-UUID** access) and shown only to owning-group members or active enrollees; unpublished hidden from everyone; enrollment gated identically.

**Maps to Hub §L3:** A-JRN (freeze enforcement, service-role override), A-GRP (group-scoped journey visibility). **Strength: STRONG.**

---

## Platform operations & user lifecycle

### Admin / DeusEx operations (A-ADM, PC-4)

**Audit log (B-ADMIN-007)** — Guarantees the `admin_audit_log` exists with fixed shape; only DeusEx can INSERT/SELECT; **append-only** (UPDATE/DELETE blocked even for DeusEx); every privileged action writes an entry (force-logout, invite, join, message, remove, DeusEx add/remove, hard-delete written *before* deletion, platform-exit with metadata).

**Force logout (B-ADMIN-019)** — admin-only RPC; invalidates session, works on inactive users, supports batch, audit-logged.

**Admin notifications & DM (B-ADMIN-011/015)** — `admin_send_notification` fans out to multiple users (returns 0 on empty list); admin DM creates/reuses one conversation **per recipient** (never a group chat), audit-logged.

**Group visibility & management (B-ADMIN-012/016/017/018)** — admins see all group types they don't belong to; pickers surface **engagement groups only**; already-active members skipped; direct-add assigns Member role; **last-Steward protection holds even for admin removals**; remove cascades `user_group_roles`; multi-user ops compute the common-group intersection.

**Route access & auto-grant (B-ADMIN-001/004/006)** — `manage_all_groups` granted to DeusEx, absent for normal users; **auto-grant** attaches every new permission to the DeusEx role idempotently; admin auth chain resolves `auth_user_id → personal_group_id → DeusEx → permissions`.

**DeusEx membership (B-ADMIN-003/005)** — add/remove with email lookup, audit-logged; **last-DeusEx protection** (final DeusEx role/membership cannot be removed — the platform-admin floor cannot be emptied).

**Admin users API (B-PERF-001)** — `service_role` endpoint: admin-only, paginated, searchable by name/email, ordered by `created_at` desc, excludes decommissioned by default.

**Maps to Hub §L3:** A-ADM. **U028:** audit-viewing, force-logout, admin notifications, the users API, and `manage_all_groups`-gated ops are **universe-scope** (route to the Console); group invite/join/remove are in-place-per-group overrides. **Strength: STRONG.**

### User lifecycle (A-IDN / PC-2)

**Activate/deactivate (B-ADMIN-010)** — admins deactivate/reactivate; reactivating a **decommissioned** user is blocked; non-admins can always update their own profile only.

**Decommission (B-ADMIN-008)** — `is_decommissioned` column; admin-only; **decommission invariant**: memberships *preserved* (history intact), user *hidden* from normal queries but visible to admins.

**Hard delete (B-ADMIN-009)** — admin-only RPC; **true cascade** removal (memberships, roles); audit entry written *before* deletion; errors on non-existent target.

**Platform exit / self-service (B-EXIT)** — admin flow rejects non-admin/self/already-decommissioned/DeusEx targets; per-group cascade in three scenarios: **L1** regular leave, **L2** sole-Steward exit → DeusEx `steward_handover`, **L3** last-member exit → group closure; mixed multi-group exits resolve independently; no-membership users simply decommissioned.

**Profile / display name (B-DISP-001..011)** — signup defaults nickname = first word of `full_name`, personal-group name = nickname, `show_real_name`=**false**; display-preference toggle syncs personal-group name bidirectionally; nickname can't be blank; **real-name RLS**: `full_name` hidden from others when `show_real_name=false`, always visible to self and to admins (service_role); **author/display identity resolves from the personal-group name, not `full_name`**.

**Maps to Hub §L3:** A-IDN, PC-2. Decommission/hard-delete/platform-exit are **universe-scope (U028)**; profile/display-name is in-place self-service. **Strength: STRONG** (except consent/export/Journal — see silences). **Sentinel-author reassignment of orphaned content is NOT oracled** — hard-delete is a true cascade here; v2 sources reassignment from canon.

---

## Groups, belonging & authentication

### Groups & memberships (A-GRP, PC-3)

**Lifecycle/status** — new groups default `status=active` (valid: closed/archived/suspended; invalid rejected by CHECK); Stewards edit name/description/label/visibility (revoked instantly on demotion); Stewards delete (cascades memberships + enrollments); default engagement type; regular users can't promote to `system`. (B-GRP-004/005/007, B-D15-001)

**Group-to-group membership (B-D15-002/003)** *(canon invariant)* — an engagement group can be an active member of another group; `has_permission()` accepts a **group as actor**; signup creates the zero-permission "Myself" personal-group role.

**Invitations — FIM (B-GRP-002)** — Stewards create `status=invited` invites (direct `active` insert blocked); invitees see their own pending; duplicates for active members blocked; re-invite after decline allowed; accept (`invited→active`) / decline (deletes).

**Invitations — email (B-INV-001)** — Steward invites a non-existent email (token UUID, 30-day expiry); duplicates per group+email blocked; on signup with matching email, pending invites **auto-claim** across multiple groups (case-insensitive); expired not claimed; Steward can view/cancel.

**Voluntary leave (B-GRP-008/009/011)** — active member leaves an engagement group (roles cascade; non-public enrollments **freeze**, public don't); leaving personal group rejected; Stewards notified. **Leadership transfer:** sole-Steward leave transfers stewardship + pending invites to DeusEx; nomination flow (nominate valid members; reject non-Steward/non-member/self/duplicate; accept grants Steward + original leaves; all-decline → DeusEx fallback).

**Removal & closure (B-GRP-001/010, B-ROL-001)** — roles cascade on removal; **last-member closure** sets `status=closed`, freezes enrollments, transfers non-public journeys to DeusEx (public don't), notifies DeusEx; **last-leader protection** (cannot remove/cascade-delete the last Steward; resists repeats).

**Roles & search (B-ROL-001/003, B-GRP-006)** — Steward assigns roles to active members (others blocked by RLS); creator bootstraps first Steward role when none exists; active members see role assignments (non-members see empty); member-search typeahead matches partial name/email (ilike, caps at 8).

**Maps to Hub §L3:** GRP-1/2 (lifecycle/edit/delete), MEM-1/2 (invitations + claim), MEM-3 (leave + transfer/nomination), MEM-4 (removal + closure), GRP-3 (group-to-group + group-keyed actor), ROL-1/2 (assignment/visibility), member search. **Strength: STRONG.**

### Authentication & sessions (A-IDN, PC-2)

**Sign-up/sign-in (B-AUTH-001/002)** — signup creates auth user + FK-linked profile with defaults and a **non-null personal_group_id**; duplicate-email prevented; sign-in succeeds with valid creds + active profile, blocked for `is_active=false` and invalid/non-existent credentials.

**Protected routes & sessions (B-AUTH-003/004/005)** — authenticated users access own profile + their groups; can update only their own profile; can search others by email; access blocked after sign-out; session persists across requests, carries an expiry, clears fully on sign-out (token invalidated; already-signed-out handled).

**Maps to Hub §L3:** IDN-3 (auth/session) + the auth contract underpinning GRP/MEM. **Strength: STRONG** for the FIM path. **Shadow/anonymous: NONE** — the auth oracle assumes a credentialed user with an active profile; no guest/anonymous/Shadow entry exists.

---

## Journeys, communication & end-to-end

### Journeys (A-JRN, DS-3)

**Catalog & detail (B-JRN-001/002)** — published journeys visible to authenticated users (unpublished hidden even on direct-ID; unauthenticated blocked by RLS); detail returns the full row incl. the **inline `content` JSONB** (steps array); null for unpublished/non-existent.

**Enrollment (B-JRN-003)** — individual enroll creates correct initial `progress_data` (duplicates rejected; can't enroll as another user); group enroll by Steward (duplicates rejected); **dual-enrollment** (individual + group same journey) detected; `group_id` required.

**Progress/resume (B-JRN-004/005/006)** — step navigation persists position (can't modify another's; `last_accessed_at` updates); completion accumulates, is idempotent, derives a percentage, identifies required steps; resume distinguishes not-started/in-progress/completed and handles missing `current_step_id` defensively.

**Status/complete (B-JRN-007/008)** — status CHECK-constrained to `active|completed|paused|frozen`; completion sets `completed_at` once and is readable from "My Journeys" (can't complete another's); 8 predefined journeys owned by the public **"FI Journeys"** engagement group (DeusEx Steward); ownership migration preserves enrollments. *Frozen read-only semantics live in the **security** suite (B-SEC-003/004), not here; pause/leave have no dedicated lifecycle tests.*

**Maps to Hub §L3:** JRN catalog/detail/enroll/progress/resume/complete/publish. **Strength: STRONG** (frozen via security suite). **Shadow→FIM in-flight carry-over (JRN-5): NONE.** **Canon signal:** content is inline JSONB (`version`, `structure:"linear"`, `steps[]` of types content/activity/assessment) — matches the substrate **adapt** (inline → DS-4 blocks).

### Communication (A-COM, DS-5)

**Direct messages (B-MSG-001..006)** — participants send/read (empty rejected); **authorship group-keyed** (`sender_group_id` = personal group; RLS prevents impersonation); non-participants can't read/send; conversations unique per user-pair; inbox sorted by `last_message_at` (updates per message); **DMs create no notifications** — unread tracked via a Messages badge using per-participant `last_read_at`.

**Forum (B-COMM-004..007)** — authorship group-keyed (`author_group_id`); active members + Stewards post top-level; **flat threading trigger-enforced** (`enforce_flat_threading` blocks reply-to-reply); Steward soft-deletes any post (`is_deleted`), author edits own; non-members can't view/post (RLS).

**Notifications (B-COMM-001..003, B-NOTIF-001/003)** — invitation INSERT → `group_invitation`; acceptance → `invitation_accepted`; users read only own (no direct INSERT; can't UPDATE others'); read-state accurate; **smart/actionable** notifications (action_type/action_data with a passive-vs-smart consistency constraint; the action-handler RPC rejects acting on another's/passive/already-actioned/expired/invalid).

**Maps to Hub §L3:** COM (DM, conversations/inbox, forum post/reply/moderate), NTF (delivery/privacy/read-state/smart). **Strength: STRONG.** **Silences:** **former-member attribution (COM-14/MEM-9): NONE**; **real-time push: NONE** (approximated by `last_message_at` ordering + badge polling, not websocket-tested). **Canon signal:** group-keyed authorship + soft-delete moderation match the substrate.

### End-to-end (Playwright)

Two specs (`auth.spec.ts`, `journeys.spec.ts`): guarantees the login page, invalid-credential error, **redirect of unauthenticated users to login**, post-login landing on **`/groups`**, journey catalog loads with seeded data, card→detail navigation, My Groups accessible. **Strength: thin but real** (browser-level auth gate + landing route + catalog navigation).

---

## Unit-level guarantees

The `tests/unit/` suite is **three pure-logic admin modules** (no DB/network) for the user-management surface:

- **Action-bar logic (B-ADMIN-014)** — exactly **10 bulk actions in 3 categories** (communication: message/notify; account: deactivate/activate/delete_soft/delete_hard/logout; group: invite/join/remove); state-machine enablement against selected users' lifecycle (active/inactive/**decommissioned** = terminal, non-reactivatable); group actions gated by `commonGroupCount`; every disabled action carries a reason; `isDestructiveAction` = exactly {deactivate, delete_soft, delete_hard, logout, remove}; selection clears only after the 3 state-mutating destructive account actions.
- **Selection model (B-ADMIN-013)** — toggle/range/select-all-visible with **cross-page selection preserved**, **immutability** (original Set never mutated), survives page/filter/search changes.
- **User filter (B-ADMIN-002)** — stat label "Users"; default shows active+inactive, **hides decommissioned**; three independent lifecycle toggles; visible-count respects toggles.

**Maps to Hub §L3:** primarily **A-ADM**; secondary A-COM/A-NTF (message/notify as action types) and A-GRP (invite/join/remove). **Strength: STRONG for A-ADM bulk-management UI logic.** **Canon flags:** the **decommissioned = terminal** guarantee; `notify` is a distinct non-destructive action (keep separate from `message`); the lifecycle vocabulary (active/inactive/decommissioned, soft vs hard delete, logout = session-only) is load-bearing. **Not unit-oracled:** four-hop actor resolution and display-name/privacy logic (those live in integration).

---

## Cross-cutting findings

1. **The Shadow lifecycle has NO oracle and only a vestigial substrate shell.** No test exercises an anonymous/Shadow actor or anonymous sign-in (confirmed across the auth, groups, and journeys suites). The substrate carries a `Visitor` **system group** + a `Guest` group role (pre-canon Shadow naming) but **no `is_temporary`, no ephemerality, no pg_cron** ([substrate-audit](./substrate-audit.md)). → IDN-1, IDN-2, JRN-5 (Shadow→FIM carry-over) are **build-new from canon** (U004/U027); do not infer from the old code.
2. **Group-keyed authorship / four-hop actor is the suite's spine** — DMs (`sender_group_id`), forum (`author_group_id`), `has_permission(p_acting_group_id, …)`, display identity from the personal-group name. This is heavily oracled and matches the substrate; v2 must preserve it byte-for-byte.
3. **Hard invariants the oracle locks** (port these as guard tests): last-Steward protection (survives rename), last-DeusEx floor, append-only audit log, frozen-enrollment immutability (read-preserving, self-unfreeze-proof, service-role-only unfreeze), template-copy independence, anti-escalation, decommission-preserves-history, RLS direct-ID-access prevention, instant membership-status-driven access revocation, flat-threading trigger.
4. **Vocabulary drift (data layer vs canon)** — `Visitor`/`Guest` → **Shadow**; role template `Member` → **Participant** (already ratified in §L2 §3); "Group Leader"/"Travel Guide" → Steward/Guide (already renamed in-suite). v2 build should rename consistently (an **adapt**, not a behaviour change).
5. **Oracle silences (specify fresh from canon, NOT from code):** consent state/history + granular consent + data export (IDN-6/7/8); private Journal (IDN-5); **sentinel-author reassignment** of orphaned content (hard-delete is a true cascade in the oracle); **former-member attribution** (COM-14/MEM-9); **real-time push** delivery (polling-approximated only); per-device session **inventory** (IDN-11 — force-logout exists, member-facing inventory doesn't); all of A-COI and A-DIS recommendations/DS-6.
6. **Inline journey content** is oracled as the live model (`content` JSONB) — Phase 3 must decide the inline→DS-4 externalisation deliberately (the substrate **adapt**), and re-point the progress/step tests accordingly.

---

## Coverage map — oracle strength per Hub §L3 area

| Area | Oracle strength | Notes |
|---|---|---|
| **Permission model (PC-3)** | **VERY STRONG** | 44-permission catalog, 4 templates, three-tier additive, group-as-actor, anti-escalation, last-X. Port wholesale. |
| **RLS (V4)** | **STRONG** | Visibility, direct-ID prevention, status-driven revocation; woven through all suites. |
| **A-GRP Groups & belonging** | **STRONG** | Lifecycle, membership, invitations, leave/transfer/nomination, removal, closure, roles, search. *Gap: former-member attribution.* |
| **A-ADM Platform operations** | **STRONG** | Audit, force-logout, admin notify/DM, user lifecycle, DeusEx, platform-exit, bulk-action UI logic. *U028 routing applies.* |
| **A-COM Communication** | **STRONG** | DM, conversations/inbox, forum, moderation, notifications. *Gaps: former-member attribution, real-time push.* |
| **A-NTF Notifications** | **STRONG** | Delivery, privacy, read-state, smart/actionable. |
| **A-JRN Journeys** | **STRONG** | Catalog, enroll (indiv+group), progress, resume, complete, frozen (security suite), publish. *Gaps: Shadow carry-over (JRN-5); inline→DS-4 decision; pause/leave lifecycle thin.* |
| **A-IDN Identity** | **PARTIAL** | Auth/session/profile/display-name/account-state STRONG; **consent/export/Journal NONE; Shadow NONE; per-device session inventory NONE.** |
| **A-DIS Discovery** | **PARTIAL** | Journey catalog + member search oracled; recommendations/DS-6 NONE. |
| **A-COI Companion & Insight** | **NONE** | No substrate, no tests — post-Ferd (DS-1/DS-7). |

---

## Handoff to Phase 2 / Phase 3

- **Phase 2 walking skeleton** (sign-in → land on `/groups`): the e2e specs already define the contract (auth gate + `/groups` landing); the auth/session/RLS guarantees are STRONG and portable. Identity bootstrap can stand on the conformant substrate immediately.
- **Phase 3 per area:** seed TDD from the STRONG/PARTIAL guarantees above (by test-ID), build to green over the conformant substrate, and treat every **NONE/silence** as a fresh specification task against the refreshed Hub §L3 + canon. The **Shadow lifecycle is the one area that is simultaneously a substrate gap and an oracle silence** — it gets the most deliberate fresh design (U004/U027), and nothing about it should be back-derived from the frozen MVP.

---

*Behaviour synthesis produced 2026-06-17 by reading `tests/` area-by-area; vocabulary facts grounded against `jveybknjawtvosnahebd`. Re-derive by re-reading the suites if they change before cutover.*
