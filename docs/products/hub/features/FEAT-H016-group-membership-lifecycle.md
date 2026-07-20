# FEAT-H016: Group membership lifecycle surfaces — pause, reactivate, remove, and leave

---
id: FEAT-H016
title: Group membership lifecycle surfaces — member-row pause/reactivate/remove affordances on the group page (permission-gated, Paused badge), and the member's own Leave affordance with the G-E refusals rendered honestly (MEM-4/5/6)
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

After Cycle G-C a group can grow — but membership is a one-way door. Nobody can step back without being expelled (MEM-4), a Steward has no removal affordance (MEM-5), and a member who wants out has no way to leave (MEM-6). The member list renders a fabric nobody can tend past invitation.

The platform half is [FEAT-PC013](../../../platform/core/features/FEAT-PC013-group-membership-lifecycle-contracts.md): pause/activate contracts over the already-seeded permission keys, removal with its full cascade, `leave_group` narrowed to the honest regular exit, and the detail payload's `membership_status` amendment. This is the Surface consuming it API-first (ADR-U009/U038): render, relay, gate nothing client-side.

## Solution sketch

Three affordance sets on surfaces that already exist — no new page, no new read:

- **Member-row lifecycle actions on `/groups/[id]`** — the member list (already carrying `member_group_id` + role chips from G-B) gains per-row actions keyed off the caller's already-fetched effective permissions: **Pause** (`pause_members`), **Reactivate** (`activate_members`, on paused rows), **Remove** (`remove_members`) — each ConfirmModal-gated (Remove styled destructive), each riding the page's one refresh path. Paused rows render with a **Paused badge** from the payload's `membership_status` — they appear at all only when the contract includes them (management-permission viewers, PC013 Open Q3); no client-side filtering either way. Refusals (last-active-Steward, already-paused, ghost) surface the mapped message in place.
- **Leave group on `/groups/[id]`** — a self-affordance visible to any active member, ConfirmModal-gated. On success, navigate to `/groups` (the group may no longer be visible to the ex-member; no dead-end render). The two G-E refusals render their honest copy in place: the sole active Steward is told leadership transfer arrives later (MEM-7); the last member is told closure arrives later (MEM-8) — the Surface never pre-empts these, it relays the contract's refusal.
- **BFF routes** — `POST /api/groups/[id]/members/[memberGroupId]/pause`, `POST .../members/[memberGroupId]/activate`, `DELETE /api/groups/[id]/members/[memberGroupId]` (remove), `POST /api/groups/[id]/leave` (self). All mutations (no Edge pinning — the hot-read convention is for reads); SQLSTATE→HTTP per house map (42501→403, P0002→404, P0001→409, 22023→400, messages passed through); **id-only telemetry** — display names never in events. No new reads: `membership_status` rides the existing detail payload, gating rides the existing my-permissions read.

The paused member's own experience is substrate-truth rendered by existing surfaces: the group drops out of `/groups`, a private group's detail page shows the not-found view, and the durable `participation_paused` notification row waits for A-NTF to render it. This feature adds no paused-member surface — and asserts that experience honestly in E2E.

## Appetite

Medium — narrower than G-C (row actions + one self-affordance + 4 handlers), with every mechanism established (permission gating from my-permissions, mutation-re-read, ConfirmModal, SQLSTATE mapping). First cut if it swells: the **pause/reactivate affordances** (paired with PC013's own first cut — MEM-4 moves whole to a fast-follow); the exits are the core.

## Rabbit holes

- **Don't build G-E UI.** No transfer wizard, no successor picker, no closure confirmation flow — the sole-Steward and last-member refusals render as messages, not as alternate flows.
- **Don't gate client-side.** Affordance visibility comes from the my-permissions payload; paused-row visibility comes from the contract's payload; every refusal is relayed, never predicted. The Leave affordance renders for every active member — including the sole Steward, who learns the honest answer from the refusal, not from a hidden button.
- **Don't build a paused-member surface.** No "your membership is paused" banner, no paused-groups section on `/groups` — the substrate makes the group invisible to them; A-NTF renders the notification later. Asserting that absence in E2E is this feature's whole paused-member obligation.
- **Don't conflate the row actions.** Pause/Reactivate/Remove are three affordances with three permission keys — a viewer may hold any subset (custom roles); each renders independently.
- **Don't touch the invitations panel.** Cancel-invitation stays G-C's affordance; the lifecycle actions apply to members (active/paused rows), never to invited rows.

## No-gos

- No leadership transfer or nominated succession (MEM-7 — G-E); no last-member closure (MEM-8 — G-E); no group deletion (GRP-9 — G-E).
- Former-member attribution rendering (MEM-9) landed 2026-07-20 in [FEAT-H026](./FEAT-H026-group-forum-and-attribution.md) (Cycle C-B, over the FEAT-PD009 COM-14 ladder — ADR-U021 display law). The G-D `pending-DS-5` disposition is discharged.
- No admin sweep or platform-scope removal surfaces (ADM-6/ADM-18 — A-ADM).
- No self-pause of the account (IDN-12, parked) — group-scope pause targets others via the contract's rules.
- No bulk selection, no notification UI (durable rows exist substrate-side; A-NTF renders and pushes later — D8), no realtime (ADR-U039).

## Stories

### STORY-1: Pause and reactivate from the member list (MEM-4)
As a `pause_members` / `activate_members` holder, I want to rest and restore a member's participation from the member list, so stepping back doesn't mean expulsion.

**Acceptance criteria:**
- Given a holder of `pause_members`, when they confirm Pause on an active member's row via ConfirmModal, then the refresh shows the row with the Paused badge (payload `membership_status`, not client state).
- Given a holder of `activate_members`, when they confirm Reactivate on a paused row, then the refresh shows the row active again (badge gone).
- Given a viewer holding neither key, then neither affordance renders on any row; given a viewer holding one, then exactly that affordance renders.
- Given the contract refuses (last-active-Steward, already-paused, ghost), then the mapped message shows in place and the list state survives.

### STORY-2: Remove a member (MEM-5)
As a `remove_members` holder, I want to remove a member deliberately, so the group's boundary is tendable.

**Acceptance criteria:**
- Given a `remove_members` holder, when they confirm Remove (destructive ConfirmModal) on a member's row, then the refresh no longer carries the row — active or paused rows alike.
- Given the target is the last active Steward, then the 409 refusal surfaces in place and nothing changes.
- Given a viewer without `remove_members`, then the Remove affordance does not render.
- Given the removed member's own next visit, then the group is absent from their `/groups` (asserted E2E; their durable `member_removed` notification row exists substrate-side).

### STORY-3: Leave the group (MEM-6)
As an active member, I want to leave a group by my own decision, so my participation is mine to end.

**Acceptance criteria:**
- Given any active member on `/groups/[id]`, when they confirm Leave via ConfirmModal, then they land on `/groups` and the group is gone from their list in the same visit.
- Given the sole active Steward, when they attempt Leave, then the honest refusal copy renders in place — leadership transfer arrives later (MEM-7/G-E); no mutation, no hidden affordance.
- Given the last remaining member, when they attempt Leave, then the honest closure refusal renders (MEM-8/G-E).
- Given the leaver had active enrolments in the group's non-public journeys, then those are frozen platform-side (exercised by the paired contract's suite; the Surface asserts the flow, not the freeze).

### STORY-4: The paused member's honest experience (MEM-4)
As a paused member, I want the platform to tell me one consistent story, so my state is legible even while my participation rests.

**Acceptance criteria:**
- Given a member paused in a private group, when they visit `/groups`, then the group is absent from their list; when they deep-link to its detail page, then the not-found view renders (substrate truth — no special paused rendering).
- Given the member is reactivated, when they next visit `/groups`, then the group is back and its detail page opens (the round trip asserted E2E across two FIMs).
- Given the pause and the reactivation, then durable notification rows addressed to the member exist substrate-side (asserted via the integration suite; rendering waits for A-NTF).

### STORY-5: Meaningful actions leave a trace (V4)
As the platform, I want every lifecycle operation observable, content-free.

**Acceptance criteria:**
- Given any pause/activate/remove/leave via the BFF, when the route completes, then a structured event fires (actor, group id, member id, operation, outcome) — display names never in events.
- Given any refusal (403/404/409/400), then a failure-variant event fires with the mapped status.

## Platform dependencies

- **[FEAT-PC013](../../../platform/core/features/FEAT-PC013-group-membership-lifecycle-contracts.md)** — all four contracts + the `membership_status` detail-payload amendment. Schema gate lands platform-side; this feature carries no migration.
- **FEAT-H014 surfaces** — the member list (already rendering `member_group_id` + role chips) and the my-permissions read this feature gates its affordances on; the one refresh path extended by G-C stays four reads (no new read).
- **FEAT-H013 / FEAT-H001** — the group detail page and `/groups` list this feature extends.

## Cross-product impact

The Gimbal consumes the same contracts and refusal semantics; only composition differs. The honest G-E refusal copy is the placeholder G-E's transfer/closure flows will replace — same affordance, richer answer. The durable pause/removal notification rows are A-NTF inventory the inbox will render later (ADR-U039 — durable rows today, ping-then-fetch later). E2E note: the pause round-trip and the removal arc span two FIMs — specs use dedicated spec-created FIMs in their own contexts (the G-B suite-isolation default).

## Vertical impact

- **Privacy/GDPR:** paused state renders only where the contract includes it (management-permission viewers — PC013 Open Q3); nothing new collected; member display identity rendered as the payload provides; ids only in telemetry.
- **Notifications:** None new — pause/activate/leave/remove durable rows are written substrate-side (PC013); this surface neither sends nor renders them (A-NTF later, D8).
- **Administration:** all four operations are permission-gated affordances inside named flows; destructive and state-changing paths ConfirmModal-gated (Remove destructive-styled); refusals surfaced verbatim, never pre-empted; reversibility visible (Reactivate sits where Pause left the row).
- **Observability:** STORY-5 — id-only structured events on every operation and refusal.
- **Transactions:** None.
- **Extensibility:** row affordances key off the payload's `membership_status` and the open permission catalog (three independent keys — any custom role holding a subset gets exactly that subset of affordances; never a role-name check); a future lifecycle state renders as a new badge value, not a rebuild; the Leave refusal rendering is copy-driven, so G-E's richer flows replace copy, not plumbing.

## Implementation notes (6-done — Cycle G-D, 2026-07-04)

Built TDD red-first, after the FEAT-PC013 schema-gate nod + merge (PR #71). **No migration of its own.**

- **BFF (4 handlers, 3 new route files):** `POST /api/groups/[id]/members/[memberGroupId]/pause` + `POST .../activate` (two files — method semantics per verb), `DELETE /api/groups/[id]/members/[memberGroupId]` (remove — never conflated with the `/invitations/` cancels), `POST /api/groups/[id]/leave` (relays the contract's `{group_id, group_name}` payload). All Node-runtime mutations; SQLSTATE→HTTP per house map (42501→403, P0001→409 **with the message passed through — it carries the honest G-E copy**, P0002→404, else 500 content-free); id-only telemetry (`membership.pause/activate/remove/leave` + refusal variants) — member display data and the leave payload's group name never in events, canary-asserted. Transports in `lib/groups/client.ts`; contract wrappers in `lib/groups/queries.ts`; `GroupMemberEntry` gains optional `membership_status` (absent = active, tolerant).
- **Surface:** `GroupDetailPanel` gains `permissions` + `onLeft` props. Member rows: **Pause / Reactivate / Remove** affordances gated on the three independent catalog keys from the already-fetched my-permissions read (any subset renders exactly that subset — unit-asserted per key); the **Paused badge** renders from the payload's `membership_status` (paused rows arrive only for management-key viewers — the contract decided, the panel renders). One lifecycle ConfirmModal (Remove danger-variant) + the existing member-error line for in-place refusals (row stays). **Leave group** renders for every member on the detail card — never hidden client-side; a sole Steward learns the honest answer from the 409 copy, rendered by a dedicated error line; success hands navigation to the page (`onLeft` → `router.replace('/groups')`). The page passes `permissions` into the panel; mutations ride the existing one-refresh-path (four reads, unchanged).
- **Red→green evidence:** 34 unit tests demonstrated RED → GREEN: 13 route-units (`group-membership-routes.test.ts`, modules absent at collection) + 10 new `GroupDetailPanel` cases (affordances/badge/Leave absent; all 15 prior H013/H014 panel cases stayed green throughout). E2E: **5 new journeys** on dedicated spec-created FIMs in their own contexts (the G-B suite-isolation default) — the **pause round-trip** (the paused member's private group honestly vanishes from `/groups`, the deep link renders not-found, reactivation brings it back and it opens), the **sole-active-Steward leave refusal** (copy in place, nothing mutates), **removal** (row leaves both sides), the **regular leave** (lands on `/groups`, group gone), and the **last-member closure refusal** (the MEM-8 seam's copy). Memberships seeded substrate-side — the invitation arc is FEAT-H015's covered journey.
- **Gates:** full unit **341/341** (52 suites); integration **210/210** (29 suites — the PC013 session run, no substrate change since); full E2E **48/48**; `next build` clean (the type gate); lint 0 errors (one pre-existing warning).
