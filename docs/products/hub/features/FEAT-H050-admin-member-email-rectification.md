# FEAT-H050: Admin member email rectification — the address on the member console stops being read-only

---
id: FEAT-H050
title: Admin member email rectification — a reasoned, consequence-naming ceremony on the member detail page that corrects a member's login identity
owner: hub
consumers: [hub]
wave: eid
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

The member console already shows an administrator a member's email address, in the detail header beside the join date (`hub/components/admin/AdminMemberDetail.tsx:294`). It is the only identifying field on the page that cannot be acted on. Every other attribute of a member — their account state, their group memberships, their administrator grant, their existence — has a control. The address just sits there.

So when a member writes in saying they mistyped their address at signup or lost their mailbox, the administrator looking straight at the wrong value has nothing to click. [ADR-U054](../../../architecture/decisions/ADR-U054-admin-email-rectification.md) ruled that they should. This is the surface half; [FEAT-PC031](../../../platform/core/features/FEAT-PC031-member-email-rectification-contract.md) is the contract.

## Solution sketch

Three pieces, each mirroring a sibling that already exists.

1. **A control in the member detail header**, beside the rendered address. It opens a ceremony rather than an inline edit, because the action cuts sessions and deletes invitations and those consequences have to be read before they are accepted. The ceremony is built from the two primitives `AdminMemberDetail.tsx` already imports — `ConfirmModal` (`hub/components/ui/ConfirmModal.tsx`, the Hub's mandatory confirmation primitive; browser `confirm()` is forbidden at this entity) and `CeremonyReasonField` (`hub/components/ui/CeremonyReasonField.tsx`, the reason input the DB-4 ceremonies already use) — plus one new address input. No new UI primitive is introduced.
2. **A BFF route** at `hub/app/api/admin/users/[id]/email/route.ts`, POST, shaped like the suspend route: authenticate, read the body with `readJsonBody` / `requiredReason`, emit durable telemetry, call the lib, map refusals.
3. **`updateAdminUserEmail(client, userId, email, reason)`** in `hub/lib/admin/users.ts`, alongside its nine siblings, calling the contract by RPC.

**The ceremony names the consequences before the click, not after.** The dialog states both addresses in full, requires a reason, and says plainly that the member's sessions will end and that pending invitations to the old address will be deleted. On success the confirmation reports what actually happened, using the counts the contract returns rather than restating what was promised.

### Payload walk

Every field this surface renders, traced to a key in FEAT-PC031's returned payload. Run per the decomposition discipline; the copy check is included because two acceptance criteria below quote user-facing strings.

| Rendered by this surface | Key it comes from | Note |
|---|---|---|
| The address in the detail header, after the change | `new_email` | Rendered from the payload, not from a refetch, so the header cannot show a stale value while a refetch is in flight. |
| "Changed <old> to <new>" in the confirmation | `previous_email`, `new_email` | Both come back from the contract. The surface does not reconstruct the old address from the state it happened to be holding. |
| "N sessions ended" | `sessions_revoked` | A count, not a promise. If it is zero the confirmation says so. |
| "N pending invitations to the old address deleted" | `invitations_deleted` | Same. |
| The refusal message on a collision or invalid address | the mapped HTTP status and the contract's message | Per the family's mapping; see STORY-5. |

**Keys with no consumer:** none. **Rendered fields with no key:** none. The dialog's pre-action warning text is static copy, not payload-derived, and is listed here so its absence from the table is deliberate rather than an omission.

## Appetite

One build cycle, sharing the cycle with FEAT-PC031. The route and lib function are near-mechanical against nine siblings; the design work is entirely in the dialog's copy, because this is the one admin ceremony whose consequences are invisible to the administrator performing it.

## Rabbit holes

- **Do not build an inline-editable field.** The address is not a profile attribute here; it is a credential. An inline edit invites a mistyped save with no confirmation step, and a mistyped save points a real person's account at an address nobody holds.
- **Do not add an email-change column to the members list.** The list is bounded and already carries the fields FEAT-H039 settled. This action belongs on the detail page only.
- **Do not reuse the bulk-action machinery.** The safe subset is deliberate.
- **Do not let the dialog offer to "notify the member by email."** There is no mailer. Offering it would be a lie in the interface.

## No-gos

- No self-service email change anywhere in the Hub. Not on `/profile`, not in account settings. ADR-U054 point 3.
- No email rectification from the members list, the bulk bar, or any group surface.
- No undo affordance. A correction is another rectification, which is itself audited; a one-click undo would write a second audit row that looks like a reversal but is a fresh change.
- No display of the member's previous addresses on the surface. The audit log is where that history lives, and it is already rendered by the audit view.

## Stories

### STORY-1: The address on the member console becomes actionable
As a platform administrator, I want a control beside the member's address, so that I can correct it where I am already looking at it.

**Acceptance criteria:**
- Given a platform administrator on `/admin/members/[id]` viewing an active member, when the detail header renders, then a rectification control appears beside the email address.
- Given a member whose address is absent (a Mist, or a row with no email), when the header renders, then no control appears — the contract refuses these and the surface does not offer an action that cannot succeed.
- Given a non-administrator, when they reach the route by any means, then the page does not render the control, and the BFF route refuses independently of the UI.

### STORY-2: The ceremony states the consequences before they are accepted
As a platform administrator, I want to read what this action does before I commit it, so that I do not discover the session cut afterwards.

**Acceptance criteria:**
- Given the rectification control is activated, when the dialog opens, then it shows the member's current address and an input for the new one.
- Given the dialog is open, when it renders, then it states that the member's active sessions will end and that pending invitations to the old address will be deleted.
- Given the dialog is open, when it renders, then it states that the member will be told in the Hub and that **no email is sent to either address** — the limitation ADR-U054 accepted, said plainly rather than omitted.
- Given the dialog is open, when the administrator has not entered a reason, then the confirm action is unavailable.
- Given the administrator has typed a new address, when the confirm action is shown, then both the old and the new address are visible in the dialog at the moment of confirming, so the two are read against each other.

### STORY-3: A successful rectification reports what actually happened
As a platform administrator, I want the confirmation to report the real counts, so that I can see the action's reach.

**Acceptance criteria:**
- Given a successful rectification, when the confirmation renders, then it names the previous address and the new address, both taken from the contract's payload.
- Given a successful rectification returning `sessions_revoked` and `invitations_deleted`, when the confirmation renders, then it reports both counts, including when either is zero.
- Given a successful rectification, when the detail header re-renders, then it shows the new address, taken from `new_email` in the payload.
- Given a successful rectification, when the administrator opens the platform audit view, then a `member.email_change` entry for that member is present.

### STORY-4: The reason reaches the platform and is never logged by the surface
As a member, I want the administrator's reason recorded and shown to me, so that a change to my sign-in identity is explained.

**Acceptance criteria:**
- Given the dialog is confirmed with a reason, when the BFF route handles the request, then it reads the reason with `requiredReason` from `hub/lib/admin/reason.ts` and passes it verbatim to the contract.
- Given the route emits telemetry for the action, when the telemetry is written, then the reason is **not** included in it — matching the existing rule that the reason is never logged or placed in telemetry.
- Given a request body with a missing or blank reason, when the route handles it, then it refuses without a round-trip to the platform, and the contract's own `22023` remains the authority.

### STORY-5: Refusals surface as the family maps them
As a platform administrator, I want a refused rectification to tell me why, so that a collision reads as a collision rather than a failure.

**Acceptance criteria:**
- Given the contract raises `42501` or `P0002`, when the route maps it, then the response is `404` and the surface renders a not-found message — the admin-plane existence-hiding convention the family already uses.
- Given the contract raises `P0001` (collision, no-op, Mist, or no address), when the route maps it, then the response is `409` and the surface renders the contract's message so the administrator learns which condition fired.
- Given the contract raises `22023` (malformed address or blank reason), when the route maps it, then the response is `400` and the surface renders the validation message against the input.
- Given any refusal, when it renders, then the dialog stays open with the administrator's input intact, so a collision does not cost them the typed address.

### STORY-6: The member finds the notice in the Hub
As a member, I want to see that my sign-in address changed, so that a change I did not request is visible to me.

**Acceptance criteria:**
- Given a successful rectification against a member with a personal group, when that member next opens their notifications, then an `account_email_changed` notice is present carrying the administrator's reason as its body.
- Given the member's notification preferences suppress the `account` category, when the notice is dispatched, then it honours that preference exactly as the category's other kinds do — this notice gets no special forcing.

## Platform dependencies

| Capability | Feature | Verified at |
|---|---|---|
| `admin_update_user_email(uuid, text, text)` | [FEAT-PC031](../../../platform/core/features/FEAT-PC031-member-email-rectification-contract.md) | Specified; not yet built. This surface cannot ship before it. |
| Member detail read returning `email` | FEAT-PC021 `admin_get_user_detail` | `supabase/migrations/20260801170000_adm_c_pc021_member_read_family.sql:119-236` |
| The platform audit view that renders the new action | FEAT-PC022 / FEAT-H034 | `hub/components/admin/AdminAuditLog.tsx` |
| The `account` notification category and its preferences | FEAT-PD021 / N-D preferences | `20260726120000_n_d_notification_preferences_and_dispatcher.sql` |

## Cross-product impact

None. The Gimbal carries no administration surface — it has no feature specs at all today, and nothing under `docs/products/gimbal/` mentions administration. No studio renders member administration. This feature is Hub-only in both directions: nothing else consumes it, and it consumes nothing from a sibling surface. Whether administration ever reaches the Gimbal is an equipment-profile question under ADR-U025 and is not decided here.

## Vertical impact

- **Privacy/GDPR:** The surface renders and mutates a member's personal data. It renders the address that is already on the page and adds no new exposure — the previous address appears in the confirmation and then only in the audit log, never in a list or a search result. The surface never logs the administrator's reason. This is the interface through which the platform honours Art. 16 rectification.
- **Notifications:** Triggers `account_email_changed` through the contract. The surface itself dispatches nothing; it states in the dialog that the notice is in-app only so the administrator does not assume the member was emailed.
- **Administration:** This is an administration surface. It joins the member console's existing ceremonies and follows their established shape — reason required, consequences named before the click, outcome reported after.
- **Observability:** The route emits durable telemetry before the mutation, matching the hard-delete route's ordering, with actor and target and **without** the reason. The audit row itself is the contract's.
- **Transactions:** None.
- **Extensibility:** No new type, enum or permission scope on the surface. The control is gated by the existing platform-administrator check the page already performs.

## Performance budget

- **First-paint class:** No new page. The control and dialog mount inside `/admin/members/[id]`, which already carries its budget from the member-console work and boots from the existing detail read. No new data-boot path — the surface needs nothing the page has not already fetched.
- **Interaction class:** The rectification itself is a multi-store write plus a session sweep and is expected to exceed B5 (200 ms to next paint). The dialog therefore shows a pending state within 100 ms of the confirm action and disables the confirm control so the write cannot be double-submitted. Opening and closing the dialog are pure client interactions and sit inside B5.
- **Loading states:** The confirm action's pending state is the only wait. Under B6 it needs nothing extra below 1 s and a skeleton is inappropriate here (it is a button state, not a region); if the write is observed above 3 s in a measured pass, that is a defect against the contract, not a loading state to dress.
