# FEAT-H049: Sanction communication surfaces — the ceremonies collect the reason, the wall and the label say why, the bell says it happened

---
id: FEAT-H049
title: Sanction communication surfaces — the admin hold ceremonies and the Steward's Rest/Wake control collect a member-facing reason; the held-group wall and label and the suspended-account surface render it; the bell renders the six hold kinds as plain notices; the preferences console shows Holds & sanctions locked on (GRP-10 / IDN-13; ADM-3 / ADM-9 gain the reason)
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A member whose group was rested or suspended, or whose account was suspended, finds out by bumping into a wall that says the state and nothing else — `SuspendedGroupShell` ("no why", `SuspendedGroupShell.tsx:8`), the *Resting* / *Suspended* label in `GroupDetailPanel.tsx:78-85`, and the account surface's "contact support" (`AccountStateView.tsx:80-88`). The admin ceremonies (`AdminGroupDetail.tsx:210-248`: Rest / Wake / Suspend / Reactivate; `AdminMemberDetail.tsx:310-421`: Suspend / Reactivate) and the Steward's Rest/Wake control (`GroupDetailPanel.tsx:418-443`) collect no reason, because no contract took one. [FEAT-H038](./FEAT-H038-suspension-integrity-and-state-honesty.md) filed this as the Eid deferral; Stefan ruled it into Ferd ([TASK-DB4-01](../../../planning/backlog/tasks/TASK-DB4-01-sanction-communication-pulled-into-ferd.md), 2026-09-03). The platform half is [FEAT-PC030](../../../platform/core/features/FEAT-PC030-sanction-communication-contracts.md) (the reason on the transitions, the notices, the reads) over [FEAT-PD021](../../../platform/domain/features/FEAT-PD021-sanction-notification-kinds.md) (the kinds). This is the Surface consuming them API-first: collect, relay, render — decide nothing.

## Solution sketch

- **The ceremonies gain the reason.** The four admin hold ceremonies on `/admin/groups/[id]` and the two member ceremonies on `/admin/members/[id]` take a **required** reason in the existing `ConfirmModal` with the `ceremony-reason` field the H041 remove/moderate ceremonies established (`AdminSuspendedContentWing.tsx:96`) — confirm disabled until non-blank, the field labelled *"Shown to the group's members"* / *"Shown to the member"*. The Steward's Rest/Wake control gains an **optional** note in its `ConfirmModal` (*"A note to your members — optional"*). The BFF routes pass `reason` through to the contracts; a `22023` maps to `400` with the message (the H041 mapping).
- **The wall and the label say why.** `SuspendedGroupShell` renders the reason beneath its sentence when `hold_reason` is present ("Reason given: …"); the held-group label in `GroupDetailPanel` (resting) shows the reason as a line under the status; both render from `get_group_detail.hold_reason` — present for members only, null otherwise, so a non-member's view is unchanged. `AccountStateView`'s suspended surface renders `suspension_reason` from the account-state read ("The reason given: …"), keeping "contact support" as the way out.
- **The bell says it happened.** The six kinds render through the existing `NotificationItem` as plain notices (title = the kind's label, body = the reason, no action); the `sanctions` category gets an icon in `CATEGORY_ICON` (falls back to the bell otherwise — `NotificationItem.tsx:44`). The preferences console renders *Holds & sanctions* locked-on with a reason by its existing rule (`NotificationPreferencesPanel.tsx:167`) — pinned, not built.
- **Types + payloads.** `GroupDetail` / `GroupDetailShell` gain `hold_reason?: string | null`; the account-state type gains `suspension_reason?: string | null`; the admin lib functions (`lib/admin/groups.ts` hold calls, `lib/admin/users.ts:138-153`) gain the reason parameter.

## Appetite

Medium — six ceremonies touched (reuse the reason field), one optional note, three render sites, one icon, the BFF pass-through; no new page, no new read. Rides FEAT-PC030's gate.

## Rabbit holes

- **Don't validate the reason's content client-side** beyond non-blank; the contract owns `22023`.
- **Don't invent an internal-note field.** One field, labelled member-facing; anything else is Eid.
- **Don't re-word the notice.** Title and body are the platform's; the surface renders them (V3 surfaces law).
- **Don't gate the reason's render on role strings.** It renders when the payload carries it; the platform decides who gets it.

## No-gos

- No reason on closure, deletion or removal ceremonies (their kinds and copy stand).
- No reason edit after the fact.
- No new notification affordance — nothing to answer; the typed-action family (FEAT-H031) is untouched.

## Stories

### STORY-1: The admin ceremonies require the reason (ADM-3 / ADM-9)
As a platform admin, I want every hold ceremony to ask me why in words the member will see, so the act is complete before I confirm it.

**Acceptance criteria:**
- Given the Suspend / Reactivate / Rest / Wake ceremony on a group, when the modal opens, then a reason field labelled *Shown to the group's members* renders and Confirm is disabled until it is non-blank; when confirmed, then the route sends the reason and the state renders on re-read.
- Given the member Suspend / Reactivate ceremony, the same with the label *Shown to the member*.
- Given the contract refuses `22023` (a race, or an empty reason past the client check), then the modal shows the refusal in place and stays open.

### STORY-2: The Steward may leave a note (GRP-10)
As a Steward, I want to add a note when I rest or wake my group, so my members hear it from me.

**Acceptance criteria:**
- Given the Rest / Wake control's ConfirmModal, when it opens, then an optional note field renders (*A note to your members — optional*) and Confirm is enabled with or without it; when confirmed, then the route sends the note (or omits it) and the state renders on re-read.

### STORY-3: The wall and the label say why (GRP-10 / IDN-13)
As a member, I want the held group's wall and label, and my own suspended-account surface, to show the reason I was given, so the state is legible.

**Acceptance criteria:**
- Given a suspended group and a member, when the shell renders and `hold_reason` is present, then the reason renders beneath the shell's sentence (`data-testid="hold-reason"`); when null, then the shell renders exactly as today.
- Given a resting group and a member, when the detail renders, then the reason line renders under the *Resting* label when present; a non-member (payload null) sees no reason line.
- Given a suspended member, when the account surface renders and `suspension_reason` is present, then "The reason given: …" renders above the sign-out exit; when null, the surface renders as today.

### STORY-4: The bell says it happened (NTF-1)
As a member, I want a hold or a reinstatement to appear in my bell as a plain notice, so I hear about it where everything else arrives.

**Acceptance criteria:**
- Given a `group_suspended` (or any of the six) row, when the bell/inbox renders it, then the title is the kind's label and the body is the reason, with no action affordance; the `sanctions` category shows its icon.
- Given the preferences console, then *Holds & sanctions* renders locked-on with a reason and no toggle — a labelled pin of the FEAT-H033 rule.

### STORY-5: Wired, gated, observable (the H038 STORY-7 shape)
- Given the six touched routes, then the route-policy conformance test stays green with zero new exceptions (mutations → `getUser()`); the reason is never in telemetry — durable events carry ids only.
- Given the E2E journey, then an admin suspends a group with a reason → the member's shell shows it → the member's bell holds `group_suspended` with it → reactivation clears it; and the member-suspension arc on the account surface.

## Platform dependencies

FEAT-PC030 (the reason on the contracts + the reads; the notices) and FEAT-PD021 (the kinds) — both **4-ready** in the same decomposition; nothing here ships before their gate applies. Existing: the H041 ceremony pattern, the bell (FEAT-H030/H032), the console (FEAT-H033).

## Cross-product impact

The **Gimbal** inherits the reason and the notices by consuming the same reads and rows; nothing here is Hub-only except the ceremony chrome.

## Vertical impact

- **Privacy/GDPR:** the reason renders only where the platform delivers it (members' own detail read and notification rows; the member's own account read); the ceremony field is labelled member-facing so the admin writes it as such; the reason never enters telemetry.
- **Notifications:** the six kinds render as plain notices; the locked-on category is visible in the console — nothing new authored here (V3 surfaces law).
- **Administration:** the ceremonies gain the required reason — the admin plane says why, every time; the Steward's note is optional.
- **Observability:** durable events on the six routes carry ids only; refusals (`22023`, the existing family) render in place, never swallowed.
- **Transactions:** None.
- **Extensibility:** vocabulary-tolerant rendering (an unknown category falls back to the bell icon); no role-string branching; the reason is free text.

## Performance budget

No new first-paint read: `hold_reason` and `suspension_reason` ride reads the pages already make (B2/B3 unchanged); the ceremonies are B5 interactions.

## Open spec questions

None open. The DB-4 board rulings 5 and 8 (bridge `2026-09-03_04`) are adopted as defaults; reversing either reopens STORY-1/3.

## Implementation notes

**Built 2026-09-03 (TASK-DB4-01) on the applied FEAT-PC030 / FEAT-PD021 gate (migrations `20260903120000` + `20260903130000`).** Collect, relay, render — the Surface decides nothing: the contract owns `22023`, the platform decides who receives `hold_reason` / `suspension_reason`, the bell renders what arrives.

- **What landed:** the H041 reason field lifted to a token-only primitive (`components/ui/CeremonyReasonField.tsx` — `ceremony-reason` by default, `ceremony-note` for the Steward); the four group ceremonies in `AdminGroupDetail` and the two member ceremonies in `AdminMemberDetail` take the **required** reason (*Shown to the group's members* / *Shown to the member*; Confirm disabled until non-blank); the Steward's Rest/Wake `ConfirmModal` in `GroupDetailPanel` takes the **optional** note (*A note to your members — optional*; Confirm enabled regardless, the key omitted when blank); `SuspendedGroupShell` renders "Reason given: …" (`hold-reason`) beneath its sentence, the *Resting* label in `GroupDetailPanel` a reason line, `AccountStateView` "The reason given: …" (`suspension-reason`) above the sign-out exit — each absent when the payload carries null, byte-identical to before; `NotificationItem` gains a `sanctions` icon (Gavel), the six kinds render as plain notices. Types: `GroupDetail` / `GroupDetailShell.hold_reason`, `AccountState.suspension_reason`. Lib: the four admin hold calls and the two member calls take the reason as `p_reason`; the Steward's rest/wake take the note. BFF: the four admin group hold routes, the two admin member routes, the two Steward routes — the reason parsed from the body (`lib/admin/reason.ts`), a blank admin reason refused 400 before the lib (defense-in-depth; the contract's `22023` is the rule), `22023 → 400` with the message (the H041 mapping), durable telemetry ids-only. Mutations keep `getUser()`; no runtime or region exports; the route-policy conformance test is green with zero new exceptions.
- **A decomposition gap found at build — the bulk bar (H039):** the spec names six ceremonies, but the admin members list's bulk Suspend / Reactivate compose `admin_update_user_status` too and would have refused every row post-migration. Shaped as **one required reason per batch**, labelled *Shown to each member*, relayed by `lib/admin/bulk-route.ts` to `bulkAdminUserAction`; force sign-out is unchanged (no field). Recorded here as the seventh ceremony; the spec's story list is not rewritten.
- **The refusal split in the ceremonies:** a `400` (the contract's `22023`, or the route's blank check) keeps the modal open and renders `ceremony-error` in place (STORY-1's third criterion); every other refusal keeps the H035 close-and-page-error shape — pinned, so the new behaviour widens nothing.
- **Test-first at the unit tier (jsdom), red run at HEAD 39 failed across 9 suites, green 1616/1616:** STORY-1 — `admin-group-sanction-ceremonies` (four ceremonies, the 400-stays-open cell, the 409-keeps-H035 pin) and `admin-member-sanction-ceremonies` red on `Unable to find an element by: [data-testid="ceremony-reason"]`; `sanction-routes` (ten routes) red on the lib called without the reason and `Expected: 400 Received: 200` for blank reasons; `sanction-reason-libs` red on the rpc pins without `p_reason`. STORY-2 — `GroupDetailPanel.sanction` red on `[data-testid="ceremony-note"]` absent and the transport called with the id alone. STORY-3 — `SuspendedGroupShell`, `AccountStateView.sanction`, the panel's reason line red on `hold-reason` / `suspension-reason` absent. STORY-4 — `sanction-notices` red on the icon (`/lucide-bell/` fallback still matched). Labelled green by design, never claimed red: null-reason renders unchanged (shell, account, panel); a plain notice row carries no affordance; an unknown category falls back to the bell; `sanctions-locked-on-pin` (the H033 console renders *Holds & sanctions* locked-on with no toggle — STORY-4's second criterion, FEAT-PD021 STORY-2); force sign-out and the non-hold member ceremonies carry no field. Sibling unit pins adapted, labelled `FEAT-PC030 adapted (DB-4)`: `admin-group-detail` (four confirm flows type a reason), `admin-member-detail` (two), `admin-members-list` (the bulk body + loop), `users-page-and-bulk` (`p_reason` in the rpc pins). The `CeremonyReasonField` primitive first tripped the design-system token gate (raw palette in `components/ui/`) and was converted to tokens.
- **Gates:** `npm run lint` 0, `npm run typecheck` 0, `npm run build` 0 (Proxy + routes emitted).
- **Performance:** no new first-paint read — `hold_reason` and `suspension_reason` ride reads the pages already make; the ceremonies are B5 interactions. No deep-cold measurement owed (no request added or rerouted on a first paint).
