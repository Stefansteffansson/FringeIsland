# FEAT-H017: Leadership transfer, closure, and deletion surfaces — the ways a group ends or changes hands

---
id: FEAT-H017
title: Leadership transfer, closure, and deletion surfaces — the sole Steward's nominate/hand-over flow, the nominee's accept/decline, the last member's close, and the Steward's delete; the G-D honest refusals become real flows (MEM-7/8, GRP-9)
owner: hub
consumers: []
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

After Cycle G-D a member can leave — unless leaving would strand the group. The sole Steward who tries to leave hits an honest wall (*"assign another Steward first"*); the last member hits another (*"closing a group is not yet available"*). Those refusals were placeholders for the flows this feature builds. And a Steward who wants to end a group deliberately (GRP-9) has no affordance at all.

The platform half is [FEAT-PC014](../../../platform/core/features/FEAT-PC014-leadership-transfer-and-closure-contracts.md): nominated succession (`nominate_steward` + `respond_to_stewardship_nomination`), the sole-Steward DeusEx handover (`hand_stewardship_to_deusex`, ADR-U019), last-member closure (`close_group`), and deliberate deletion (`delete_group`), plus the security closure of the live sprint3 nomination hole. This is the Surface consuming it API-first (ADR-U009/U038): render the choices, relay the contract's answers, gate nothing client-side.

## Solution sketch

Three surfaces on pages that already exist — no new page, no new read beyond the nomination notification the succession flow needs:

- **The sole Steward's leave becomes a transfer choice on `/groups/[id]`.** Today Leave renders for every member and the sole Steward learns the refusal in place. This feature turns that moment into a **transfer flow**: when the contract refuses Leave with the sole-Steward reason (or the member opens a "Hand over leadership" affordance directly), the Surface offers two paths — **Nominate successors** (pick one or more members in ranked order from the existing member list; `nominate_steward`) or **Hand to FringeIsland** (`hand_stewardship_to_deusex`, the ADR-U019 last resort, styled as the deliberate fallback it is). Both are ConfirmModal-gated; nomination shows the members as an ordered pick-list, hand-over shows a plain confirm. On success, navigate to `/groups` (the ex-Steward may no longer see the group). The refusal copy is retired — the wall is now a door.
- **The nominee answers on `/groups`.** A member who has been nominated sees a **pending nomination** affordance (accept / decline, with the group named and the 7-day window shown) sourced from their notifications. Accept (`respond_to_stewardship_nomination(id, true)`) makes them the Steward and the nominator leaves; decline (`…, false`) passes the offer on. ConfirmModal-gated; the contract's outcome (you are now Steward / passed to the next nominee / passed to FringeIsland) is relayed, never predicted. Until A-NTF lands the inbox, this reads the pending nomination through a minimal own-notifications fetch scoped to the `stewardship_nomination` type (the one new read; noted as an A-NTF re-home seam, the DS-6/D3 precedent).
- **The last member closes; the Steward deletes — on `/groups/[id]` settings.** **Close group** (`close_group`) renders for the last active member as the honest terminal act (the last-member Leave refusal becomes this affordance). **Delete group** (`delete_group`) renders for `delete_group` holders as a destructive, deliberately-guarded action (typed/explicit ConfirmModal, danger-styled) — distinct from Close on intent, and distinct from Leave. Both relay the contract's cascade result and navigate to `/groups`; both show the honest "your work is preserved and reassigned" framing the contract guarantees, and neither renders DS-4/DS-5 content handling (tagged `pending-*` platform-side).
- **BFF routes** — `POST /api/groups/[id]/nominate-steward` (body: ordered `nominee_group_ids`), `POST /api/groups/[id]/hand-to-deusex`, `POST /api/notifications/[id]/nomination-response` (body: `accept`), `POST /api/groups/[id]/close`, `DELETE /api/groups/[id]` (delete — never conflated with member removal). All Node-runtime mutations; SQLSTATE→HTTP per house map (42501→403, P0002→404, P0001→409 **with the message passed through**, 22023→400, else 500 content-free); **id-only telemetry** — member display names, group names, and nominee lists never in events.

The ex-Steward's, closed-group's, and deleted-group's experiences are substrate truth rendered by existing surfaces: the group drops from `/groups`, its detail deep-link renders not-found (or the `closed`/`archived` tombstone for remaining/authorized viewers per the contract), and the durable notifications wait for A-NTF. This feature adds no post-ending surface beyond the navigation-away.

## Appetite

Large-plus — the cycle's heaviest Surface work, matching PC014. The nomination pick-list, the nominee's pending-nomination affordance (with its one scoped read), the hand-over confirm, and the close/delete settings actions, over ~5 BFF handlers. **First cut if it swells (mirrors PC014):** the **nomination + accept/decline flow (MEM-7)** is the core and ships first (it retires the sole-Steward Leave refusal and is the highest-oracle path); **hand-to-DeusEx + Close + Delete** cut together as the fast-follow (they share the confirm-then-relay-then-navigate shape).

## Rabbit holes

- **Don't gate client-side.** Affordance visibility comes from the my-permissions payload (`delete_group`) and the member's structural position (sole Steward / last member) as the contract reports it — every refusal is relayed, never predicted. The Leave affordance still renders for every active member; the sole Steward reaches transfer through it (or the explicit hand-over affordance), not through a hidden button.
- **Don't build the A-NTF inbox.** The nominee's pending-nomination affordance is a minimal scoped read of their own `stewardship_nomination` notifications, not a notifications centre. When A-NTF lands, the affordance re-homes into the inbox — noted as a seam, not a parallel inbox.
- **Don't pre-empt the DeusEx fallback.** The Surface never tells a nominator "this will go to FringeIsland" ahead of the contract deciding — decline routing (next nominee vs DeusEx) is the contract's, relayed from its response.
- **Don't conflate Close, Delete, Leave, and Remove.** Four distinct intents, four distinct affordances, four distinct routes: Leave (self, MEM-6), Remove (another member, MEM-5), Close (last member ends the group, MEM-8), Delete (Steward ends the group deliberately, GRP-9). Delete is the only one that is `delete_group`-gated and danger-styled with an explicit confirm.
- **Don't render DS-4/DS-5 handling.** No "your forum posts will be…" copy beyond the contract's guarantee that content is preserved/reassigned — the asset/forum dispositions are tagged platform-side, not surfaced.
- **Don't invent nomination UI state.** The ranked pick-list produces an ordered id array for the one call; the pending-nomination affordance reflects the notification row. No draft-nomination persistence, no client-side expiry countdown authority (show the window; the contract enforces it).

## No-gos

- No former-member attribution rendering (MEM-9 — forward-seam on DS-5, `pending-DS-5` per D2).
- No admin sweep or platform-scope transfer/closure surfaces (ADM-6/ADM-18 — A-ADM).
- No notifications inbox (A-NTF — the pending-nomination affordance is the minimal scoped exception, D8), no realtime (ADR-U039).
- No group-of-groups actor selection (G-F/G-29 — the act-as selector stays honestly v1).
- No DS-4/DS-5 content-handling UI; no hard-delete affordance (the contract is soft-terminal per PC014 Open Q5).

## Stories

### STORY-1: The sole Steward transfers leadership by nomination (MEM-7)
As the sole active Steward who wants to leave, I want to nominate successors, so leadership passes by consent.

**Acceptance criteria:**
- Given the sole Steward on `/groups/[id]`, when they choose to hand over leadership and pick one or more members in order, then confirming calls `nominate_steward` with the ordered ids and the nomination is sent (the first nominee is offered it); the Surface confirms the offer is out and relays any refusal (not-sole-Steward, non-member nominee, nomination-in-flight) in place.
- Given the pick-list, then it is sourced from the existing member list (active members other than the caller); no separate member fetch.
- Given a successful nomination, then the Steward remains the Steward until a nominee accepts (the Surface does not pre-empt the departure).

### STORY-2: The nominee accepts or declines (MEM-7)
As a nominated member, I want to accept or decline the stewardship offer, so succession resolves.

**Acceptance criteria:**
- Given a member with a pending `stewardship_nomination`, when they visit `/groups`, then a pending-nomination affordance shows the group and the accept/decline choice within the 7-day window.
- Given they confirm Accept, then `respond_to_stewardship_nomination(id, true)` runs and the Surface relays the outcome (they are now the group's Steward; the previous Steward has left); the group now shows their Steward role on next read.
- Given they confirm Decline, then the offer passes on (to the next nominee or to FringeIsland — the contract decides; the Surface relays "passed on" without naming which).
- Given an expired or already-answered nomination, then the mapped 409 refusal shows and the affordance resolves.

### STORY-3: The sole Steward hands the group to FringeIsland (MEM-7 / ADR-U019)
As the sole Steward with no one to nominate, I want to hand the group to the platform and leave, so it is never left headless.

**Acceptance criteria:**
- Given the sole Steward, when they choose "Hand to FringeIsland" and confirm, then `hand_stewardship_to_deusex` runs and they land on `/groups` with the group gone from their list; members are told (durable rows, A-NTF renders later).
- Given they are the last member (no one to keep the group for), then the 409 points them to Close instead — relayed in place.
- Given the affordance, then it is styled as a deliberate last resort, not a primary action.

### STORY-4: The last member closes the group (MEM-8)
As the last active member, I want to close the group deliberately, so it ends cleanly with its work preserved.

**Acceptance criteria:**
- Given the last active member on `/groups/[id]`, when they confirm Close (the last-member Leave refusal now offers this), then `close_group` runs, they land on `/groups`, and the group is gone from their list; its work is frozen and reassigned platform-side (the Surface asserts the flow, not the cascade).
- Given a member who is not the last one, then the Close affordance does not offer itself (they see Leave; the contract still guards).
- Given the honest framing, then the confirm copy states the group will close and its work will be preserved — no DS-4/DS-5 detail.

### STORY-5: The Steward deletes the group deliberately (GRP-9)
As a Steward with `delete_group`, I want to end a group that has run its course, its members told and its work reassigned.

**Acceptance criteria:**
- Given a `delete_group` holder on `/groups/[id]` settings, when they confirm Delete through a danger-styled explicit ConfirmModal, then `DELETE /api/groups/[id]` runs, they land on `/groups`, and the group is gone; the remaining members receive their durable `group_deleted` notification (asserted substrate-side).
- Given a viewer without `delete_group`, then the Delete affordance does not render.
- Given the confirm, then it is distinct from Leave, Remove, and Close in copy and placement, and danger-styled with an explicit confirmation step.
- Given a remaining member's next visit, then the group is absent from their `/groups` (asserted E2E; the archived tombstone and their notification exist substrate-side).

### STORY-6: Meaningful endings leave a trace (V4)
As the platform, I want every transfer/closure/deletion observable, content-free.

**Acceptance criteria:**
- Given any nominate/respond/hand-over/close/delete via the BFF, when the route completes, then a structured event fires (actor, group id, operation, outcome) — member display names, group names, and nominee id lists never in events.
- Given any refusal (403/404/409/400), then a failure-variant event fires with the mapped status.

## Platform dependencies

- **[FEAT-PC014](../../../platform/core/features/FEAT-PC014-leadership-transfer-and-closure-contracts.md)** — `nominate_steward` (replaced-in-place), `respond_to_stewardship_nomination`, `hand_stewardship_to_deusex`, `close_group`, `delete_group`, and the sprint3 security closure. Schema gate lands platform-side; this feature carries no migration.
- **FEAT-H016 surfaces** — the member list (member ids + roles), the my-permissions read this feature gates Delete on, and the Leave affordance whose sole-Steward/last-member refusals this feature turns into the transfer/close flows; the one refresh path is extended, not replaced.
- **FEAT-H013 / FEAT-H001** — the group detail page + settings and the `/groups` list this feature extends; the pending-nomination affordance mounts on `/groups`.
- **A-NTF seam (D8):** the pending-nomination affordance is a minimal scoped own-notifications read today; it re-homes into the inbox when A-NTF lands (durable rows exist now; ping-then-fetch later, ADR-U039).

## Cross-product impact

The Gimbal consumes the same contracts and refusal semantics; only composition differs. This feature **retires the placeholder G-D refusal copy** — the sole-Steward and last-member Leave refusals become the transfer and close flows. The durable succession/closure/deletion notification rows are A-NTF inventory the inbox will render later (ADR-U039 — durable rows today, ping-then-fetch later). E2E note: nomination-accept and the DeusEx fallback span multiple FIMs — specs use dedicated spec-created FIMs in their own contexts (the G-B suite-isolation default).

## Vertical impact

- **Privacy/GDPR:** the pending-nomination affordance reads only the caller's own notifications; nominee lists, member display identity, and group names render as the payload provides and never enter telemetry; nothing new collected. The ex-member/closed/deleted experiences are substrate truth (absence), not a special render.
- **Notifications:** None authored here — succession offers, transfer/closure/deletion notices, and the DeusEx `stewardship_required` are durable rows written substrate-side (PC014); this surface reads the pending nomination (the scoped A-NTF seam) and otherwise neither sends nor renders notifications (A-NTF later, D8).
- **Administration:** transfer, closure, and deletion are permission- or position-gated affordances inside named flows; the destructive ones (hand-over, close, delete) are ConfirmModal-gated (delete danger-styled with an explicit confirm); refusals surfaced verbatim, never pre-empted; the DeusEx hand-over is styled as the deliberate last resort it is (ADR-U019).
- **Observability:** STORY-6 — id-only structured events on every operation and refusal.
- **Transactions:** None.
- **Extensibility:** affordances key off the my-permissions payload (`delete_group`) and the contract-reported structural position (sole Steward / last member) — never a role-name check; the nomination pick-list produces an arbitrary-length ordered id array the one contract accepts; Close/Delete copy is driven by the contract's guarantee, so DS-4/DS-5's later content-handling enriches copy, not plumbing; the pending-nomination affordance is built to re-home into the A-NTF inbox without a rewrite.

## Implementation notes

*(Filled at 6-done.)*

---

*Derived fresh from `hub/SPECIFICATION.md` §L3 (MEM-7, MEM-8, GRP-9) under current authority, API-first over the paired [FEAT-PC014](../../../platform/core/features/FEAT-PC014-leadership-transfer-and-closure-contracts.md). Retires the FEAT-H016 G-D refusal-copy seams.*
