# FEAT-H015: Group invitations & joining surfaces — invite by search or email, tend the pending list, answer your invitations

---
id: FEAT-H015
title: Group invitations & joining surfaces — the invitations panel (member-search typeahead, invite-by-email, pending list with cancel), and the invitee's my-invitations accept/decline on the groups page (MEM-1/2/3)
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

After Cycle G-B a group has structure — but **no way in**: nobody can be invited (MEM-1/2), and nobody can see or answer an invitation (MEM-3). The Steward the bootstrap created can shape roles for members who cannot arrive.

The platform half is [FEAT-PC012](../../../platform/core/features/FEAT-PC012-group-invitation-and-joining-contracts.md): scoped member search (the D3 / DS-6 re-home seam), FIM invitation, durable email invitation (no dispatch — the D4 / V3 seam), the pending-invitations read/cancel, and the invitee's reads + accept/decline. This is the Surface consuming it API-first (ADR-U009/U038): render, relay, gate nothing client-side.

## Solution sketch

Two surface pieces — one on the group page, one on the groups list — plus BFF plumbing:

- **Invitations panel on `/groups/[id]`** — rendered iff `invite_members` is in the caller's already-fetched effective permissions (the H014 my-permissions read; no new flag plumbing). Two invite affordances: **find a member** (debounced typeahead over `search_invitable_members` — results show display name with already-member / already-invited states disabled; picking one invites via `invite_member`) and **invite by email** (input → `invite_by_email`; the honest copy states the person will find the invitation when they sign up — **no email is sent in v1**, the D4 seam). Below: the **pending list** (`get_group_invitations`) — membership invitations (invitee, inviter, when) and email invitations (address, expiry, an **Expired** badge from the payload's predicate-based flag), each cancellable via ConfirmModal. Every mutation rides the page's one refresh path (detail + fabric + permissions + invitations re-read together); refusals surface the contract's message in place.
- **My invitations on `/groups`** — a section above the groups list (`get_my_invitations`): each pending invitation shows the group's name/description, who invited them, and when — deliberately the invitation context only, not group detail (an invited FIM cannot view a private group). **Accept** joins (list re-reads; the group appears — `get_member_groups` only shows active memberships); **Decline** removes the entry via ConfirmModal. Invitations that arrived via **signup auto-claim** render and answer identically — the newcomer who was email-invited sees their waiting invitations on first arrival at `/groups`.
- **BFF routes** — `GET /api/groups/[id]/invitations` + `GET /api/me/invitations` (reads; Edge+`dub1` per the hot-read convention, ADR-U036/U037), `GET /api/groups/[id]/member-search?q=` (Edge+`dub1`, debounced client-side), `POST /api/groups/[id]/invitations` (body: `member_group_id` XOR `email` — mixed/empty 400), `DELETE /api/groups/[id]/invitations/...` (both cancel shapes), `POST /api/me/invitations/[groupId]/accept`, `DELETE /api/me/invitations/[groupId]` (decline). SQLSTATE→HTTP per house map (23505/P0001 → 409); **id-only telemetry — email addresses and search queries never in events**.

## Appetite

Medium — narrower than G-B's surface (one panel, one list section, ~5 handlers), with every mechanism established (capability gating from my-permissions, mutation-re-read, ConfirmModal, Edge reads, debounced input). First cuts if it swells: the Expired badge (render expired rows undecorated first) and inviter display on my-invitations.

## Rabbit holes

- **Don't build a member directory.** The typeahead is invitation-scoped (cap 8, per the contract); no browse-all-FIMs view, no search page, no pagination (DS-6's territory when it activates).
- **Don't fake email dispatch.** No "invitation sent!" copy — the honest v1 copy says the invitation *waits* for them at sign-up. No mailto fallbacks, no copy-invite-link affordance (the token/link flow is explicitly not built — PC012 no-go).
- **Don't gate client-side.** Already-member/already-invited disabling comes from the search payload's `membership_status`, panel visibility from the effective-permissions read; every wall lives in the substrate — the UI maps refusals, it never predicts them beyond what payloads state.
- **Don't drag G-D in.** No remove/pause affordances near the pending list; cancel applies to *invitations* only.
- **Mind the two invitation kinds.** Membership invitations key on `(group, member_group_id)`, email invitations on an id — the cancel affordances and DELETE routes must not conflate them.

## No-gos

- No member removal, pause, or leave (G-D); no leadership transfer (G-E); no group-to-group invitations (G-F).
- No email dispatch or notification UI (durable rows exist substrate-side; A-NTF renders and sends later — D4/D8).
- No claim-by-link flow, no invitation deep links.
- No Mist surface (the pages are FIM-only already; a Mist's path to a waiting invitation is transcendence — ADR-U031).
- No realtime (ADR-U039 — the invitee discovers invitations by visiting `/groups`; ping-then-fetch arrives with A-NTF).

## Stories

### STORY-1: Invite a member you found (MEM-1)
As an `invite_members` holder, I want to find a FIM by name (or exact email) and invite them in two clicks, so growing the group is frictionless.

**Acceptance criteria:**
- Given the invitations panel, when the holder types 2+ characters, then matching FIMs render (display name; capped) with already-member and already-invited entries visibly disabled.
- Given a result is picked and confirmed, when the invite completes, then the pending list re-reads and shows the invitation; the invitee does not appear in the member list (they are not active yet).
- Given the contract refuses (duplicate, ghost target), then the mapped message shows in place and the panel state survives.
- Given a viewer without `invite_members`, then the invitations panel does not render at all.

### STORY-2: Invite someone by email (MEM-2)
As an `invite_members` holder, I want to invite a person who isn't on FringeIsland yet, so the group can reach beyond the platform.

**Acceptance criteria:**
- Given a well-formed email, when submitted, then the pending list shows the email invitation with its expiry — and the confirmation copy honestly states the invitation waits at sign-up (no email is sent in v1).
- Given the same email again, then the 409 refusal surfaces in place; given a malformed email, then the 400 does.
- Given the email belongs to an existing FIM, then the result renders as a **membership invitation** in the pending list (the contract's server-side conversion — the Surface just renders what the re-read returns).
- Given an email invitation past its expiry, when the pending list renders, then it carries the Expired badge (payload flag, not client-side date math).

### STORY-3: Tend the pending list
As an `invite_members` holder, I want to see and cancel outstanding invitations, so admission stays deliberate.

**Acceptance criteria:**
- Given the pending list, when it renders, then both kinds appear distinctly: membership invitations (invitee + inviter display names, when) and email invitations (address, expiry state).
- Given cancel via ConfirmModal on either kind, when it completes, then the re-read no longer carries the row.
- Given the read fails, then the panel shows a non-destructive error and the rest of the page stands.

### STORY-4: See and answer my invitations (MEM-3)
As an invited FIM, I want my pending invitations visible where my groups live, and joining to be my explicit choice.

**Acceptance criteria:**
- Given pending invitations, when `/groups` loads, then each renders with the group's name/description, inviter, and when — and no group-detail access before accepting.
- Given Accept, when it completes, then the invitation leaves the section and the group appears in the groups list in the same refresh.
- Given Decline via ConfirmModal, then the invitation is gone and the groups list is unchanged.
- Given no pending invitations, then the section does not render (no empty-state noise on the primary page).

### STORY-5: The email-invited newcomer arrives (MEM-2 → MEM-3 arc)
As a person invited by email, I want my invitation waiting after I sign up, so the promise the inviter made is kept.

**Acceptance criteria:**
- Given a pending email invitation and a sign-up with the matching email (case-insensitive), when the new FIM first visits `/groups`, then the invitation appears in my-invitations (the substrate auto-claim — exercised end-to-end, not re-implemented) and accepting joins the group.
- Given the invitation had expired before sign-up, then nothing appears (and the E2E asserts the absence).

### STORY-6: Meaningful actions leave a trace (V4)
As the platform, I want every invitation operation observable, content-free.

**Acceptance criteria:**
- Given any invite/cancel/accept/decline via the BFF, when the route completes, then a structured event fires (actor, group id, invitation/member ids, outcome) — **email addresses, search queries, and display names never in events**.
- Given any refusal (403/404/409/400), then a failure-variant event fires with the mapped status.

## Platform dependencies

- **[FEAT-PC012](../../../platform/core/features/FEAT-PC012-group-invitation-and-joining-contracts.md)** — all nine contracts. Schema gate lands platform-side; this feature carries no migration.
- **FEAT-H014 surfaces** — the group page composition (one refresh path, extended to include the invitations read) and the my-permissions read this feature gates its panel on.
- **FEAT-H013 / FEAT-H001** — the group detail page and `/groups` list this feature extends.

## Cross-product impact

The Gimbal consumes the same contracts and refusal semantics; only composition differs. The my-invitations section is the pattern the A-NTF inbox will later deep-link into (durable rows today, ping-then-fetch later — ADR-U039). E2E note: the invitation arc spans two users and a fresh sign-up — specs use dedicated spec-created FIMs in their own contexts (the G-B suite-isolation finding, adopted as default for session-sensitive journeys).

## Vertical impact

- **Privacy/GDPR:** renders third-party emails only inside the `invite_members`-gated pending list; search results carry no emails; nothing new collected; email addresses never enter telemetry (STORY-6).
- **Notifications:** None new — received/accepted/declined durable rows are written substrate-side (PC012); this surface neither sends email (D4 seam) nor renders notification rows (A-NTF later).
- **Administration:** invite/cancel are permission-gated affordances inside named flows; destructive paths (cancel, decline) ConfirmModal-gated; refusals surfaced verbatim, never pre-empted.
- **Observability:** STORY-6 — id-only structured events on every operation and refusal.
- **Transactions:** None.
- **Extensibility:** the panel renders whatever invitation kinds the payload carries (a future claim-by-link kind adds a row shape, not a rebuild); search-result affordances key off the payload's `membership_status`, not client enums; panel visibility keys off the open permission catalog (`invite_members`), never a role name.
