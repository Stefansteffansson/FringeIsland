# FEAT-H041: The suspended-group admin content view — /admin/groups/[id] grows a content wing so the admin can finally step inside

---
id: FEAT-H041
title: The suspended-group admin content view (WF-2 per the settled G-board — members / forum / announcements / conversations sections on the admin group detail, suspended-only, read-audited, with the moderate and remove ceremonies as honest admin-plane acts)
owner: hub
consumers: []
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

ADM-G's surface half. At the HYG-A walk the admin opened a suspended group's member-plane URL and got the honest 404 — correct law, but it left the WF-2 mandate unmet: when a group is suspended for wrongdoing, the admin must be able to step inside, inspect, clean forums, and remove members. The G-board settled the shape ([substrate dossier](../../../planning/hub-v2/2026-08-04-admg-substrate-dossier.md), 2026-08-04): G-1 = a **dedicated admin content view** on `/admin/groups/[id]` (the member-plane 404 law stays untouched); G-3 = journeys out; G-4 = message bodies in, group-kind only. The dossier's surface facts ground the build:

1. **The entry point is already paid for.** `AdminGroupsList` ships a `suspended` filter tab linking straight to `/admin/groups/[id]`; `AdminGroupDetail` already loads suspended groups (Reactivate gates on `status === 'suspended'`) and already fetches `members[]` — rendered today only as reassign candidates.
2. **The four-step admin guard convention is the whole registration.** No middleware, no admin layout: RPC self-gates → `lib/admin/*` wrapper translates SQLSTATE to flags → BFF collapses `refused || notFound` to the admin 404 shape → component renders the 404 body. Every new route and section reproduces it.
3. **The member content sections are `({groupId})`-shaped but carry member-plane posture** — member-BFF fetch paths, module-level session caches (`peekForum`, `peekGroupAnnouncements`) violating the admin never-session-cached rule (H034), realtime subscriptions, and a `useRouter` push to member-plane messages. The dossier's F6: the two planes have deliberately opposite conventions.
4. **The platform half ([FEAT-PC026](../../../platform/core/features/FEAT-PC026-suspended-group-admin-access-contracts.md)) arms exactly the doors this view reads** — announcements, conversations, conversation detail (group-kind), the forum pass pinned, `members[]` gaining `email`, and the audited acts (`admin_moderate_group_forum_post` new; `admin_remove_member_from_group` composed from PC021).
5. **Admin acts must read as admin acts.** The dossier's corrected fact 3: an admin holds every permission in every context group (`get_user_permissions`' context-free system tier), so member-plane affordances would render *unlabelled* — the reason G-1 chose the dedicated view, where the plane is explicit and every read is audited.

## Solution sketch

No migration of its own — consumes FEAT-PC026 API-first. The content wing lands on the existing admin group detail page under the four-step guard convention, fresh-per-mount, honest-repaint, durable-telemetry-on-read.

### The wing (state honesty both directions)

`AdminGroupDetail` gains a **content wing** rendered **only when `status === 'suspended'`** — for active/resting/closed/archived groups the page is byte-identical to today (the surface never offers what the contracts will refuse). The wing opens with a plane banner naming what this is: admin view of a suspended group's content, access audited. Four sections, each a named landmark (`aria-label`), each fetch-on-mount with a B6-conformant skeleton, none session-cached, none realtime:

- **Members** — renders the detail read's `members[]` (display name, email, steward badge) — data already in hand, now shown — with a per-row **Remove** ceremony.
- **Forum** — a lean read-only rendering of the `get_group_forum` payload (threads/posts as the member surface structures them, tombstones honest), with a per-post **Moderate** ceremony.
- **Announcements** — read-only rendering of `get_group_announcements`.
- **Conversations** — the `get_group_conversations` list; opening one renders `get_conversation_detail` bodies read-only (group-kind only — the contract enforces it; the surface renders what returns).

**New lean admin components, not member-section reuse:** the member sections' session caches, realtime tenancy, member-BFF paths, and router coupling (fact 3) make reuse-with-props costlier and riskier than thin read-only renders over the same payloads — and it keeps the member plane's components untouched (zero regression surface). Shared UI primitives (`ConfirmModal`, badges, skeletons) are reused as-is.

### The BFF routes (admin posture over the armed member doors)

Four GET routes — `/api/admin/groups/[id]/forum`, `/announcements`, `/conversations`, `/conversations/[conversationId]` — each: identity via `getVerifiedUserId` (route-policy conformant), server-side call of the same outer-ring query functions the member BFF uses (one implementation of each read — the PC026 arms decide access), the admin-plane 404 collapse (`refused || notFound` → 404), and `emitDurableTelemetry` on success (`admin.group_forum_read`, `admin.group_announcements_read`, `admin.group_conversations_read`, `admin.group_conversation_detail_read` — actor + group id + conversation id where applicable, **never content**, matching the member-plane telemetry law). Two POST routes for the acts — `/api/admin/groups/[id]/forum/[postId]/moderate` and `/api/admin/groups/[id]/members/[memberGroupId]/remove` — `getUser()` on mutation, calling the PC026 wrapper / the PC021 remove contract; platform-side `admin_audit_log` rows are the audit record (the BFF adds no second authority — ADR-U038).

### The ceremonies (honest admin-plane acts)

- **Moderate post:** `ConfirmModal` (danger) naming the post's author display name and the group name in quotes, a required reason field, and the consequence stated before the click (the post is tombstoned for every member; the act lands in the audit log). Honest repaint: on confirm, re-read the forum section.
- **Refuse-honesty on reactivation race:** if the group is reactivated while the wing is open, the next read or act surfaces the contract's refusal honestly (the wing collapses back to the metadata page on the repaint — no zombie affordances).
- **Remove member:** `ConfirmModal` (danger) echoing display name **and email** (the W-4 echo law, served by PC026's payload re-issue) plus the group name, required reason, consequence stated (removal cascade; the member loses access; audit row). Honest repaint of detail + members.

### E2E journey (the J-B narrative shape)

Suspend a seeded group (existing ceremony) → the content wing appears → read all four families (forum posts, announcement, conversation bodies, members with emails) → moderate a post (tombstone verified on the member plane by a second context) → remove a member (membership gone member-side) → `/admin/audit` shows both act rows with WA-2 target honesty → Reactivate → the wing is gone; the member plane is restored. Leak check 0→0; a non-admin gets the 404 body on every new route.

### Payload walk (decomposition verification — every rendered field to a named key)

| Story renders / act sends | Payload key | Source contract |
|---|---|---|
| Wing gate | `status` | `admin_get_group_detail` (existing) |
| Members rows + remove ceremony echo | `members[].{personal_group_id, display_name, email, is_steward}` | `admin_get_group_detail` (PC026 re-issue adds `email`) |
| Forum threads/posts, tombstones, moderate target | the `get_group_forum` payload as the member surface renders it (post id, author display, content, created_at, moderation state) | `get_group_forum` (pinned pass) |
| Announcements rows | the `get_group_announcements` payload | `get_group_announcements` (PC026 arm) |
| Conversations list | the `get_group_conversations` payload | `get_group_conversations` (PC026 arm) |
| Message bodies | the `get_conversation_detail` payload | `get_conversation_detail` (PC026 arm, group-kind) |
| Moderate act | `(p_post_id, p_reason)` | `admin_moderate_group_forum_post` (PC026) |
| Remove act | the FEAT-PC021 `admin_remove_member_from_group` signature (verified at build against its live definition) | PC021 |

Every key the wing renders traces to a served payload; every served key has a consumer or is deliberately unrendered (metadata the detail page already shows). The one cross-feature payload (the J-D rider rule): the wing rides `admin_get_group_detail`, whose non-members keys are already consumed by the existing page.

## Appetite

The surface half of one rider-scale cycle (ADM-G): one wing on an existing page, four lean read components, six BFF routes, two ceremonies, the E2E journey.

## Rabbit holes

- **Don't re-plumb the member sections** — no props surgery on `GroupForumSection`/`GroupAnnouncementsSection`/`GroupConversationsSection`; the wing's renders are new and lean.
- **No realtime on the admin plane** — fresh-per-mount reads only; a Refresh affordance per section is enough.
- **No pagination inventions** — render what the contracts return (their existing shapes); if a suspended group's forum exceeds the payload, that's the contract's existing law, not this cycle's problem.
- **The remove-contract signature** — verify PC021's live definition at build (cumulative-forward read), don't assume the parameter shape.

## No-gos

- **The member plane is untouched** — `/groups/[id]` keeps its 404 for non-member admins and its shell for members of suspended groups; `SuspendedGroupShell` unchanged; no member-plane admin affordances (the G-1 verdict).
- **No journeys/progress section** — the G-3 verdict, dated deferral (2026-08-04).
- **No conversation composition, no message-level acts, no announcement retraction** — read-only beyond the two named acts; message takedowns ride the reports plane.
- **No admin sight of non-suspended groups' content** — the wing never mounts; the contracts refuse anyway (two independent honesties).
- **No content in telemetry** — read-audit events carry ids only.

## Stories

### STORY-1: The wing appears for suspended groups only
As a platform admin, I want the group detail page to grow a content wing exactly when the group is suspended, so that admin sight tracks the admin plane's own acts.

**Acceptance criteria:**
- Given a suspended group, when the admin opens `/admin/groups/[id]`, then the plane banner and the four content sections render below the existing metadata/actions anatomy.
- Given an active or resting group, when the admin opens the same page, then the page is unchanged from pre-H041 (no wing, no banner).
- Given the wing is open and the group is reactivated elsewhere, when any section refreshes or an act is attempted, then the refusal surfaces honestly and the repaint collapses the wing (no zombie affordances).
- Given a non-admin, when they request any new BFF route, then the admin-plane 404 shape returns; the pages render the 404 body.

### STORY-2: The members section and the remove ceremony
As a platform admin, I want to see who is in the suspended group and remove a member with a fully-named ceremony, so that clearing out wrongdoing is precise and auditable.

**Acceptance criteria:**
- Given the wing, when it renders, then every member row shows display name, **email**, and a steward badge where applicable — from the detail read already in hand.
- Given a Remove click, when the ceremony opens, then it echoes the member's display name and email and the group's name, requires a reason, and states the consequence before the click.
- Given confirmation, when the act completes, then the BFF has called `admin_remove_member_from_group`, the page repaints from a fresh read (the member is gone), and the audit row is visible in `/admin/audit` with WA-2 target honesty.

### STORY-3: The forum section and the moderate ceremony
As a platform admin, I want to read the suspended group's forum and moderate offending posts in place, so that "clean forums" is a lived affordance, not a promise.

**Acceptance criteria:**
- Given the wing, when the forum section loads, then threads and posts render read-only with honest tombstones for already-moderated content.
- Given a Moderate click on a post, when the ceremony opens, then it names the author and group, requires a reason, and states the tombstone consequence; on confirm the section repaints with the tombstone.
- Given a second browser context signed in as a group member, when the moderation lands, then the member-plane forum shows the tombstone (the one law, both planes).

### STORY-4: Announcements, read-only
As a platform admin, I want to read the suspended group's announcements, so that inspection covers every communication channel.

**Acceptance criteria:**
- Given the wing, when the announcements section loads, then the group's announcements render read-only with no compose/retract affordances.

### STORY-5: Conversations and message bodies, read-only
As a platform admin, I want to open the suspended group's conversations and read the messages, so that evidence of bullying — which lives in messages — is inspectable.

**Acceptance criteria:**
- Given the wing, when the conversations section loads, then the group's conversation list renders; when the admin opens one, then its message bodies render read-only.
- Given the list or detail view, when rendered, then no compose, reply, or leave affordances exist.

### STORY-6: The plane is honest and audited
As the platform, I want every read and act on the wing to carry the admin plane's posture, so that admin access to member content is labelled, fresh, and accountable.

**Acceptance criteria:**
- Given the wing, when it renders, then the plane banner states this is the admin view of a suspended group and that access is audited.
- Given any successful section read, when the BFF responds, then a durable telemetry event (`admin.group_*_read` family) has been emitted with ids only — asserted in the route suites.
- Given any wing fetch, when a remount occurs, then data is re-read fresh (never session-cached); no realtime subscription exists on any admin route.
- Given the two acts, when they complete, then their `admin_audit_log` rows exist platform-side (the BFF added no second authority).

## Platform dependencies

[FEAT-PC026](../../../platform/core/features/FEAT-PC026-suspended-group-admin-access-contracts.md) (every sight arm + the wrapper + the members email), FEAT-PC021 (`admin_remove_member_from_group`), FEAT-PC020 (`admin_get_group_detail`), FEAT-PC022/ADR-U047 (the moderation law the wrapper composes), ADR-U038 (BFF posture), ADR-U043 (budgets).

## Cross-product impact

None member-facing (the No-gos pin the member plane). The Gimbal's future admin surface inherits the same contracts API-first. Paired platform spec: FEAT-PC026 (both reference each other).

## Vertical impact

- **Privacy/GDPR:** The surface renders member content to an admin — bounded by the platform's suspended-only arms and by the wing's own state gate (two independent honesties); the plane banner labels the access; reads are audited; telemetry is content-free. No new storage; nothing rendered exceeds what the contracts return.
- **Notifications:** None — no member-facing notice of admin reads (deliberate, matching PC026); the acts surface member-side through existing honest renders (tombstone, membership change).
- **Administration:** Is the feature — the WF-2 mandate's lived surface.
- **Observability:** Durable telemetry on every section read (the four named events); act audit rows platform-side; refusals render honestly (never swallowed); the E2E journey asserts the audit trail end-to-end.
- **Transactions:** None.
- **Extensibility:** Sections are additive — a future journeys section (G-3's deferral) or further content families slot into the wing without reshaping it; no role-string branching anywhere (`is_platform_admin` decides platform-side; the surface renders payload facts).

## Performance budget

- **First-paint class:** `/admin/groups/[id]` stays in its measured A-ADM admin-plane class (B2 cold nav / B3 warm nav) — the wing's sections are independent fetch-on-mount reads below the already-rendered metadata (justified standalone reads per ADR-U042 guardrail 3; the admin plane has no overview bundle). Deep-cold rides the standing provisioning exception; the next full ADR-U043 pass lands at AB-6 (the recorded `/admin/roles` precedent).
- **Interaction class:** ceremony opens and section Refresh are B5 (feedback within 100 ms — modal opens immediately with `busy` state on confirm).
- **Loading states:** each section shows a skeleton per B6 (1–3 s class); the wing never blocks the metadata anatomy above it.
