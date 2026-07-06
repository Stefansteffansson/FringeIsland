# FEAT-H018: Group-of-groups & acting as a group

---
id: FEAT-H018
title: Group-of-groups & acting as a group
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

MEM-10 (Hub §L3:223 — an engagement group joins another engagement group) has full substrate and zero surface: the act-as selector is honestly locked to one context (`hub/components/groups/MyPermissionsPanel.tsx:38`, the FEAT-H014 shell built "so G-F extends it"), no affordance can invite a group or answer for one, member lists render a group or system member indistinguishably from a person (`GroupMemberEntry`, `hub/lib/groups/queries.ts:43-56` — no kind field), the nominate pick-list offers DeusEx post-fallback (`GroupDetailPanel.tsx:205-213`, the FEAT-H017:139 rider), and the Close affordance keys on raw `member_count` (`GroupDetailPanel.tsx:221`) so a lone human sharing a group with the caretaker never sees it. ADR-U041 decided all of this; FEAT-PC015 lands the contracts. This feature is the Surface half.

## Solution sketch

API-first over the paired FEAT-PC015 contracts; **no migration of its own** (house pattern). Five surface moves:

- **The selector becomes real (ADR-U041 §1).** `MyPermissionsPanel`'s hardcoded single option becomes `"Myself"` + the `get_acting_contexts()` list. Selecting group A re-reads effective permissions as `get_user_permissions(A, context)` — pure substitution rendered honestly ("Acting as {A} — these are {A}'s powers here"). The v1 no-op copy retires.
- **Inviting a group.** In a group's detail, alongside the member invitations panel (FEAT-H015), an "Invite a group" affordance — gated on the already-fetched effective-permissions read (`invite_members`), target picked via `search_invitable_groups` typeahead (cap 8, the D3/DS-6-seam pattern). Refusals (cycle, duplicate, self) render the contract's honest copy.
- **The wielded group's own panel.** On A's detail page, visible only to `act_as_group` holders (from the acting-contexts read — no fake doors): a "Memberships of this group" panel over `get_group_memberships_of(A)` — where A belongs (active), pending invitations with **Accept/Decline as {A}** (destructive-styled confirm naming the wielding: "You are answering for {A}"), and **Withdraw from {B}** via `leave_group_as_group` with the last-Steward refusal rendered honestly.
- **Member lists tell kinds apart (ADR-U041 §5).** Member rows badge by `member_group_type`: engagement members get a "Group" badge, system members get a "FringeIsland" badge (never hidden — a sitting caretaker Steward stays visible). Count copy and the Close affordance key on `non_system_member_count` (=== 1 for Close) instead of raw `member_count`.
- **The pick-list stops offering non-persons (ADR-U041 §4).** The nominate flow filters to `member_group_type === 'personal'` — the substrate refuses anyway (PC015 STORY-6); the surface simply never renders the door.

## Appetite

One focused Hub session after the PC015 gate passes. First cut if it swells: the invite-a-group flow (STORY-2) ships behind the selector + honest panels; withdraw can fast-follow.

## Rabbit holes

- **No session-wide acting state.** The selector scopes the permissions panel and the wielding confirms name the group per act; do not build a global "you are now group A" mode across the app — that's an impersonation UX and a scope trap.
- **Don't link group-member rows to their group pages v1** — visibility rules for non-members are the group-search/discovery surface's concern; render name + badge only.
- **No optimistic membership state.** Wielded accepts re-read (`fetchGroupDetail` / acting reads) — the D8 durable-state + re-read posture.

## No-gos

- No group-as-actor journey enrolment (JRN-4 — Journeys area). No request-to-join surface (PC015 Open Q1). No chained wielding contexts — the selector lists only groups where *my personal group* holds the key (ADR-U041 §2d). No transitive displays (OQ-6). No notification dispatch (V3 seam).

## Stories

### STORY-1: The act-as selector offers real contexts
As a member empowered by my group, I want to switch my acting context to that group, so that I can see and use its powers where it belongs (ADR-U041 §1-2).

**Acceptance criteria:**
- Given `act_as_group` in A, when I open a group's permissions panel, then the selector offers "Myself" and A; selecting A renders A's effective permissions in that context with copy naming the substitution.
- Given no key anywhere, when the panel renders, then the selector shows "Myself" alone with the existing honest copy — no fake contexts.

### STORY-2: A Steward invites a group
As a Steward, I want to invite another group into mine, so that group-of-groups membership is reachable from the Hub.

**Acceptance criteria:**
- Given `invite_members` in the effective-permissions read, when I open the detail, then "Invite a group" renders with a typeahead (≤8 public engagement groups); without the key, no affordance.
- Given a cycle/duplicate/self refusal from the contract, when I submit, then the honest reason renders verbatim-faithful (no generic error).
- Given a sent invitation, when the panel re-reads, then the pending group-invitation is visible alongside member invitations (FEAT-H015 tending pattern).

### STORY-3: Answering and withdrawing for a wielded group
As an `act_as_group` holder in A, I want A's memberships panel on A's page, so that I can answer invitations and withdraw membership on A's behalf.

**Acceptance criteria:**
- Given my key in A and a pending invitation from B, when I open A's detail, then the memberships panel lists it with Accept/Decline as A behind a confirm that names the wielding; accept re-reads to `active`, decline removes it.
- Given A active in B, when I withdraw, then the confirm names the act; the last-Steward refusal renders the contract's honest copy pointing at transfer.
- Given no key in A, when I open A's detail, then no memberships panel renders (member list and roles panels unchanged).

### STORY-4: Member lists distinguish persons, groups, and the platform
As a member, I want honest member rows and counts, so that non-person members are visible for what they are (ADR-U041 §5).

**Acceptance criteria:**
- Given a group containing a person, an engagement-group member, and DeusEx, when the member list renders, then the group member carries a "Group" badge, DeusEx a "FringeIsland" badge, and neither is hidden.
- Given that group, when counts render, then copy reflects `non_system_member_count`; given I am the last non-system member, then Close renders for me (the Gracy case: 1 human + caretaker → Close visible).

### STORY-5: The nominate pick-list offers only persons
As a Steward transferring leadership, I want the successor picker limited to people, so that the platform or a group is never a pickable heir (ADR-U041 §4).

**Acceptance criteria:**
- Given a group whose members include DeusEx (post-fallback) or an engagement group, when the nominate flow renders, then only `member_group_type === 'personal'` members are pickable.
- Given the substrate refusal (defense-in-depth), when a stale client submits a non-person, then the contract's `22023` copy renders honestly.

## Platform dependencies

FEAT-PC015 entirely (the key + seeds, `invite_group`, `search_invitable_groups`, `respond_to_group_invitation`, `get_acting_contexts`, `get_group_memberships_of`, `leave_group_as_group`, the hardened `nominate_steward`, the additive `member_group_type` + `non_system_member_count` payload). Built only after its schema gate passes.

## Cross-product impact

The selector-context pattern and the kind-badges are the reference implementation for any future surface (Gimbal) rendering the same contracts. No sibling changes.

## Vertical impact

- **Privacy/GDPR:** No new personal data client-side; group names only. Wielding confirms name the group, not other humans.
- **Notifications:** Pending group-invitations render from durable rows via the acting reads; no dispatch (V3 seam).
- **Administration:** The FringeIsland badge makes caretaker presence legible to members; no DeusEx affordances added.
- **Observability:** Id-only telemetry (house V4 posture); wielded acts carry no extra client logging — the audit trace is platform-side (PC015 Open Q4).
- **Transactions:** None.
- **Extensibility:** Badges map from the open-set `member_group_type` with a default rendering for unknown values (no sealed switch); selector contexts render whatever the read returns.
