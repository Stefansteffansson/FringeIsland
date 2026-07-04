# Invitations panel + my-invitations section + page integration (red-first component units)

---
id: TASK-H015-02
title: InvitationsPanel on /groups/[id] (typeahead + email invite + pending list + cancels) and MyInvitations on /groups (accept/decline) + red-first component/page units
status: done
assigned_to: claude
priority: high
feature: FEAT-H015
owner: hub
wave: ferd
cycle: Groups G-C
depends_on: [TASK-H015-01]
estimated_hours: 5
---

## Description

Two surface pieces (spec Solution sketch):
- **InvitationsPanel** on `/groups/[id]` — rendered iff `invite_members` ∈ the page's already-fetched my-permissions read (no new flag plumbing). Debounced member-search typeahead (results show display name; already-member/already-invited disabled from the payload's `membership_status`); invite-by-email input with **honest undispatched copy** ("the invitation waits at sign-up — no email is sent"); pending list (both kinds, distinct; Expired badge from the payload's `expired` flag, no client date math); cancels via ConfirmModal. Mutations ride the page's one refresh path (detail + fabric + permissions + invitations together); refusals surface in place; panel failures stay panel-local.
- **MyInvitations** on `/groups` — section above the list from `GET /api/me/invitations`: group name/description, inviter, when; Accept (list re-reads, group appears) / Decline (ConfirmModal). Section absent when empty.

## Acceptance criteria

- [ ] Panel invisible without `invite_members` in the permissions payload (STORY-1 AC-4)
- [ ] Typeahead: 2+ chars, debounced, cap rendered as returned; disabled states from `membership_status`; pick → confirm → pending list re-reads (STORY-1)
- [ ] Email invite: success shows the honest waiting copy; 409/400 surfaced in place with form state kept; converted existing-FIM invites just render as member invitations on re-read (STORY-2)
- [ ] Pending list: both kinds distinct; Expired badge payload-driven; cancel ConfirmModal → re-read drops the row; read failure → panel-local error, page stands (STORY-3)
- [ ] MyInvitations: renders invitation context only; Accept moves the group into the list in the same refresh; Decline removes the entry; empty → no section (STORY-4)
- [ ] All component/page units demonstrated RED (components absent) → GREEN

## Technical notes

Follow `RolesPanel` / `GroupDetailPanel` / `MyPermissionsPanel` composition and test patterns (H014). ConfirmModal for destructive paths; `refreshNavigation` not needed (same-page refresh). Feature components live alongside their routes under `app/`.

## Verification

`npx jest tests/unit/components` (new specs) red then green; `npm run lint` clean.
