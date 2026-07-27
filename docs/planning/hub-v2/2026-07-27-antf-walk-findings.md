# A-NTF live-walk findings — 2026-07-27

Running record of Stefan's live walk of the [A-NTF walk script](./2026-07-26-antf-live-walk-script.md).
Feeds the gate verdict in the [area retrospective](../retrospectives/retro-2026-07-26-notifications-area.md) §"Gate — to be completed".

**Environment:** `fringe-island.vercel.app` (production stable domain), 2026-07-27.
**Scenario 1 skipped** — measurements taken headlessly, see [`2026-07-27-antf-gate-measurements.md`](./2026-07-27-antf-gate-measurements.md).

> **Status: walk in progress.** Findings are appended as they are observed. No fixes applied — all remediation goes through the normal red-first path after the walk.

---

## Finding W-01 — inbox rows are inert; clicking a notification does nothing

**Scenario:** 2 (extended probe) · **Grade: DEFECT** — violates a written acceptance criterion.

**Observed.** On `/notifications`, clicking any non-actionable notification row produces no response at all — no navigation, no mark-read, no visual feedback. Stefan: *"It's like there is nothing to click on."* The same rows carry the unread dot and bold title, so the affordance reads as interactive.

**Acceptance criterion violated.** [`FEAT-H030`](../../products/hub/features/FEAT-H030-notification-bell-and-inbox.md) line 88:

> Given an unread row, when I click it **(dropdown or inbox)**, then it is marked read via `/api/notifications/[id]/read` and stays read on reload (server state, not local).

The criterion names both surfaces explicitly. Only the dropdown implements it.

**Evidence.**

| Surface | Wiring |
|---|---|
| Bell dropdown | `hub/components/notifications/NotificationBell.tsx:276-281` — wraps `NotificationItem` in `<button onClick={() => activate(row)}>` |
| Inbox page | `hub/app/notifications/page.tsx:186` — renders `<NotificationItem row={row} />` bare; no wrapper, no handler |

`hub/components/notifications/NotificationItem.tsx` is purely presentational — it carries no click logic in any of its 90 lines, by design (it is the shared kind-agnostic renderer). Interaction is the parent's job, and the inbox page never supplies it. Only *actionable* rows get any interaction on the page, via `NotificationActions` (`page.tsx:187`), which is why Scenario 6's Accept/Decline path is unaffected.

**Scope note.** Beyond navigation, this also means there is **no way to mark a single notification read from the inbox page** — mark-all is the only read control the page offers.

---

## Finding W-02 — mark-all on the inbox page leaves the bell badge stale

**Scenario:** 2, step 5 · **Grade: DEFECT** — violates a written acceptance criterion.

**Observed.** With 7 unread seeded, pressing **mark all read** on `/notifications`: every row correctly re-rendered as read (unread dots cleared, titles de-emphasised), but the header bell badge stayed at `7`. A reload cleared it. The server write lands correctly — the DB went `7 → 0` unread — so this is purely client-side state propagation.

**Isolated by a two-round test.** The same action from the **bell dropdown** works perfectly (badge clears at once; single-row click decrements `7 → 6` immediately). Only the page-side control fails.

**Acceptance criterion violated.** [`FEAT-H030`](../../products/hub/features/FEAT-H030-notification-bell-and-inbox.md) line 72:

> Given unread rows, when I click "Mark all read", then `/api/notifications/read-all` is called, all rows render read, and **the badge clears**.

**Root cause.** The cross-component sync contract exists and the page does not honour it:

- `NOTIFICATIONS_CHANGED_EVENT` is defined at `hub/lib/realtime/notifications-tenant.ts:33`.
- The bell subscribes at `hub/components/notifications/NotificationBell.tsx:105`.
- It is dispatched from **exactly one place** — `hub/lib/realtime/notifications-tenant.ts:80`, the realtime hint path.
- `hub/app/notifications/page.tsx` `markAll` applies an optimistic `setRows(... is_read: true)` and calls `markAllNotificationsRead()`, but never dispatches the event.

---

## Finding W-03 — an answered actionable row still commands the action, and hides the outcome

**Scenario:** 3, step 3 · **Grade: SEAM** — the mechanism works; the join between server copy and surface state reads wrong.

**Observed.** Grace's `stewardship_nomination` row renders correctly and carries a green **Handled** chip — matching the DB exactly (`action_taken='declined'`, expired 2026-07-12). The chip mechanism passes. But the row reads as two contradictory statements at once:

- **Body (server-authored, frozen at emit):** *"You have been nominated as Steward of Nya gruppen #3. Accept or decline within 7 days."*
- **Chip (current state):** *Handled*

Reading order is title → body → chip, so a member is instructed to act and only then learns, from a small pill, that the window closed three weeks ago.

**Three distinct problems, in severity order.**

1. **The imperative cannot expire.** Copy is server-authored and never re-worded by the surface (the V3 surfaces law, cited in `hub/components/notifications/NotificationItem.tsx`'s header comment). So any actionable notification whose **body embeds a call-to-action and a deadline** ages badly *by construction* — the surface has no licence to soften it. This is a consequence of the copy law, not a Hub defect.

2. **`Handled` is outcome-blind and in the wrong register.** Accepted and declined render identically, so the platform's record of a meaningful choice — whether you agreed to steward a group — is invisible to the person who made it. "Handled" is queue vocabulary; a member thinks *"I said no."* Note `notificationStatusChip` (`hub/lib/notifications/format.ts:37-42`) already reaches for `Answered by <name>` and falls back to bare `Handled` for want of data — the intent to say more exists.

3. **Green is a claim.** `tone: 'done'` renders green (`NotificationItem.tsx:49-52`). Applied to a *decline*, green reads as congratulation. Accept → green, decline → neutral, expired → grey would be honest.

**Suggested direction (not a prescription).** Keep actionable bodies factual — *"You have been nominated as Steward of Nya gruppen #3"* — and let `expires_at` carry the deadline. The surface already renders it as "Respond by" **only while the row is actionable** (`NotificationItem.tsx:45-46`), so the machinery exists; the body copy duplicates it in a form that can never expire.

**Why it matters at gate level.** The likely user reaction is not a bug report. A member clicks a row, nothing happens (W-01), shrugs, stops clicking rows, then stops opening the page. The failure mode is quiet abandonment, which never surfaces as feedback — so a gate walk is the only place it gets caught.

---

## Why W-01 and W-02 escaped the suites

The N-A E2E journey (`hub/tests/e2e/notifications.spec.ts`, described in [`FEAT-H030`](../../products/hub/features/FEAT-H030-notification-bell-and-inbox.md) line 23) drives: Steward invites → invitee's bell badge → dropdown → mark-all → inbox history → read-state survives reload.

It reaches the inbox page only to assert *history rendering*. It never clicks an inbox row, and it never asserts the badge after a **page-side** mark-all. The journey walks around both gaps. Any fix should extend this journey rather than add a parallel one.

---

## Shared shape

Both findings are the same underlying omission: **the inbox page was built as a display surface over the shared row component and never wired to the bell's interaction contract.** They are small and localised, but they sit in N-A — the area's headline cycle — and each contradicts an explicit acceptance criterion.

---

## Test-data note

Dev Login's unread count was manipulated to run the two-round isolation: the 7 most recent existing notifications were flipped back to unread (`is_read = false, read_at = null`) rather than inserting synthetic rows, so **no residue was created**. Final state verified: `unread 0, total 46` — identical to the pre-walk state.

---

## Walk progress

| Scenario | State |
|---|---|
| 1 measurements | Skipped — taken headlessly 2026-07-27 |
| 2 bell & count | **Walked.** Dropdown path PASS. Page path → **W-01**, **W-02** |
| 3 inbox & history | **PASS.** Step 2 keyset pagination clean across all 60 rows — no duplicates, no skips at page boundaries. Step 3 chip correct → **W-03**. Step 4 every row rendered |
| 4 live delivery | **PASS.** Grace's bell rose 4 → 5 (role removed) → 6 (role assigned), **under 1 s**, no reload and no navigation. N-C's realtime hint behaving as specified |
| 5 reconnect & degraded notice | **PARTIAL.** Hidden-tab reconciliation **PASS** — Grace's count rose 8 → 10 on tab-return, no reload, no navigation. **Degraded notice UNTESTED — blocked by W-05**, which ejects the session before any notice can render. Offline-path reconciliation also untested for the same reason (the post-sign-out count came from a fresh sign-in, not reconciliation) |
| 6 typed actions | **PASS**, walked via a substitute path — the scripted premise is a script error (resolved below), so a fresh **stewardship nomination** was used instead. Accept/Decline rendered on the letter, **ConfirmModal shown and required**, outcome chip replaced the buttons, answered state survived reload, and the full consequence landed (Grace holds Steward; the nominator was removed from the group entirely; steward-only affordances appeared). → **W-07**. Outstanding: confirm no pending-nominations panel on `/groups` |
| 7 mute → silence → unmute | **PASS — the strongest result of the walk.** Every switch ON at first visit (matching zero preference rows); page loaded fast with no indicator, correct per B6. Muted → **no rows written at all** (DB-verified: `NONE - nothing written` across the muted window, while the role changes demonstrably occurred). Unmuted → the suppressed events stayed permanently absent, and the next remove/assign arrived normally (badge 0 → 2, matching exactly two rows at `15:52:23` / `15:52:27`). Only the muted category wrote a preference row, so "absence means allowed" held throughout. Preference toggles update without a reload — the **W-02/W-07 stale-view family does not reach them** |
| 8 non-suppressible & email | **PASS on steps 1-3.** "Account & participation state" carries no switch, reads `On` with *"Always on — these tell you about your own account and access."* — an explanation, not a greyed-out toggle. Email listed as not-switchable in one line with no clickable toggle → copy seam **W-08**. **Step 4 BLOCKED by W-05** (forcing a save failure requires going offline, which ejects the session) |
| 9 operator console & cost line | **PASS as reported**, with two items unanswered: whether window A (non-admin) was checked for the operator panel, and the actual cost-line figure plus whether it induced hesitation. Toggle confirmed left **OFF** (`ds5_config.realtime_hint_platform_announcements = false` after the walk) |
| 10 suppression costs no realtime | **PASS.** Observed directly with eyes on the bell: no flicker, no transient count, no arrive-and-vanish. Consistent with the mechanism — `ds5_apply_notification_preference` returns `NULL` **before** insert, so the `AFTER INSERT` hint trigger cannot fire |

## Scenario 6 — RESOLVED: the walk script is wrong, the code is correct

**Verdict: script error, not a defect.** The implementation matches its specification exactly.

[`FEAT-PD014`](../../platform/domain/features/FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md) line 40, verbatim:

> **Personal invitation** (invited member is a personal group) → keep emitting `invitation_received` to the invitee, **unchanged (the MyInvitations path)**.

[`FEAT-H031`](../../products/hub/features/FEAT-H031-notification-typed-actions.md) line 15 names precisely the two answerable events N-B brought into the inbox: **stewardship nominations** (from the `PendingNominations` panel) and **group-of-groups acting-invitations** (from `GroupMembershipsPanel`). Personal group invitations were **never in scope** — they remain on the MyInvitations path, which still exists.

**The script's error is a conflation.** *Nominations* moved into the inbox; *personal invitations* did not. Two script lines need correcting before this scenario can be walked:

| Script line | Status |
|---|---|
| "Grace has a real pending invitation to Nya gruppen #2" | True — but it is a **personal** invitation, so it will never carry Accept/Decline in the inbox |
| "⚑ EXPECT … the Nya gruppen #2 invitation as a notification with **Accept** and **Decline** on the letter itself" | **Wrong expectation** — remove |
| "⚑ EXPECT nowhere in the app still shows a separate 'pending nominations' panel" | **Correct** — `PendingNominations` was deleted (`FEAT-H031:41`, `:82`) |

**Correction to an earlier claim in this document.** An earlier revision stated no notification existed for the Nya gruppen #2 invitation, and attributed it to the invitation predating N-B's migration. **That was wrong** — it rested on a query filtered to `action_type IS NOT NULL`. The `invitation_received` row exists, created `2026-07-23 20:39:49.611605+00`, exactly matching the membership's `added_at`. The trigger fired correctly and there is no historical gap. The invitation is **not stranded**: MyInvitations remains its answering surface.

**To actually walk Scenario 6**, a live unresolved actionable row is needed, and neither walk account has one. The two kinds N-B delivers are `stewardship_nomination` and `acting_invitation`; the simplest generator is a **fresh stewardship nomination for Grace**, created through the UI so the real dispatch path is exercised.

---

## Finding W-09 — muting a category can strand an obligation the member never learns about

**Raised by:** Stefan, during Scenario 7 · **Grade: DESIGN CONCERN** — mechanism DB-verified; the worst-case consequence is a **strong inference, not yet tested**.

**The mechanism, verified.** `ds5_apply_notification_preference` is a `BEFORE INSERT` trigger on `public.notifications` only — it returns `NULL`, dropping the notification row. It does not touch `group_memberships`. So when a member mutes a category, the underlying events still happen and are still recorded; only the telling is suppressed. For invitations specifically: the `group_memberships` row lands as `status='invited'` exactly as normal, and the member is simply never informed.

**What the `membership` category actually contains** (verified against `notification_kinds`):

`invitation_received, acting_invitation, invitation_accepted, invitation_declined, member_left, member_removed, role_assigned, role_removed` (plus the `na_test_kind_mrzenort` residue).

**The concern.** `acting_invitation` is one of only **two** actionable kinds in the system, and N-B deliberately moved its Accept/Decline *out of* `GroupMembershipsPanel` and *into* the notification — the panel now asserts "pointer present, buttons absent" (`FEAT-H031:27`). If a member mutes *"Group membership & invitations"*, the actionable notification is never written, so the only surface that can answer an acting invitation does not exist. The panel would point at an inbox row that was never created.

**Not yet tested.** Reproducing this needs an engagement group with `act_as_group` holders invited into a context group — real setup that was out of scope mid-walk. **Do not record this as confirmed.** What *is* confirmed: the category membership, the suppression mechanism, and that the answering surface moved into the notification.

**Why it matters beyond the edge case.** A preference switch labelled *"Group membership & invitations"* reads as controlling **noise**. It in fact also controls **whether a member can act on real obligations**. Muting notifications about invitations silently becomes muting the ability to respond to them, and there is no indication anywhere that this trade is being made. Related to **W-04**, which found the same split from the other direction: personal invitations arrive as letters that cannot be answered where they appear.

### Decision — 2026-07-27 (Stefan): fix it properly, not surgically

**The root problem is the category, not the switch.** `membership` currently mixes two kinds of message that members feel completely differently about:

- **News** — *Alice joined*, *Bob left*, *your role changed*, *your invitation was accepted*. Something happened; nothing is owed by you.
- **Asks** — *you have been invited*, *your group has been invited, accept or decline*. Something is owed **by you**, and only you can give it.

A member who mutes *"Group membership & invitations"* means *"stop pinging me about routine churn."* Nobody means *"make me unable to answer questions addressed to me."* One bucket, one switch, both consequences.

**The rule adopted**, phrased so a member can understand it in one sentence, and mirroring what the page already says for *"Account & participation state"*:

> Notices about your own account and access always reach you — **and so do questions that only you can answer.**

This **strengthens** the "you can say no" promise rather than weakening it: what is switched off is unambiguously noise, and what always arrives is unambiguously a decision that belongs to the member. A second blanket "you cannot turn this off" category would have read as a loophole; this does not.

**Implementation: split the axis in the registry — *asks* versus *news* — so the preference surface offers control over the news and never over the asks.**

**The surgical alternative was considered and REJECTED.** Exempting `action_type IS NOT NULL` from suppression in `ds5_may_deliver` is a small safe change that handles `acting_invitation` — but **`invitation_received` carries no `action_type`**, so a muted member could still be invited to a group and never told. That is the *common* case; acting invitations are the rare one. The workable rule is **"anything that asks something of you"**, which is broader than "carries buttons". Rationale for the call: the build must be robust and serve end users, not take the cheap path.

**One wording change regardless of implementation.** *"Group membership & invitations"* reads as though it might govern **whether you get invited**. It governs only **whether you are told**. A label naming the telling — *"Membership news"*, *"Updates about members and roles"* — removes the ambiguity.

**Handle with [[W-04]] as one conversation.** Making asks non-suppressible guarantees a member is *told* about an invitation; W-04 means a personal invitation still cannot be answered where it appears. Fixing W-09 alone yields a letter that reaches you and still goes nowhere.

**Home:** the **DS-5 spec advance**, already owed at the gate. Not a defect patch, and not a condition of gate closure.

---

## Finding W-08 — the email-deferral line promises to honour a choice the member was never offered

**Scenario:** 7 part 1 / 8 step 3 · **Grade: SEAM** — copy only; the behaviour it describes is correct.

**Observed.** The foot of `/notifications/preferences` reads:

> *"Email delivery is not live yet, so there is nothing to switch here — your choice will apply as soon as it is."*

The sentence refutes itself inside one clause: there is **nothing to switch**, and then a **choice** is promised forward. The member has made no email choice, so the referent is empty. The likely intent is that the category switches above will also govern email once email ships — a genuinely reassuring thing to say — but the sentence never says it, and "your choice" reads as pointing at an email setting the member cannot find.

**Why it is worth a line rather than a shrug.** This is the one sentence in the area that explains a deferred capability, and the walk script singles it out as a judged item (Scenario 8 step 3: *"⚑ EXPECT email to be mentioned as listed-but-not-switchable, in one line"*). The line exists and is correctly placed; only the referent is wrong. Naming what carries forward — the category choices — would fix it without restructuring anything.

**Related:** the email-deferral **recording** is already an open item carried on the A-NTF gate list. This finding is about the member-facing sentence, not that record.

---

## Finding W-07 — answering a notification does not refresh the page whose data it just changed

**Scenario:** 6, step 4 · **Grade: SEAM** — no acceptance criterion covers it, but it contradicts the codebase's own established convention and leaves the screen displaying facts that are no longer true.

**Observed.** Grace, standing on `/groups/46190553-…` ("Nya gruppen 1"), accepted the stewardship nomination from the bell dropdown. The transfer succeeded server-side. The page did not change until a manual reload.

The same screen then contradicted itself: the open dropdown read *"Role Assigned — You have been assigned the 'Steward Role Template' role in 'Ny…'"*, while the **Members** panel beneath it listed Gracy with only Guide / Member / Observer and **still listed Dev Login as a member** — of a group the accept had just removed him from. Header still read "2 members".

After reload, everything was correct: "1 member", Gracy carrying Guide / Member / Observer / **Steward**, Dev Login gone, and the steward-only affordances present (Edit settings, Pause/Remove, "End of this group" with Close/Delete).

**The convention exists and notifications don't use it.** `refreshNavigation` is the house mechanism for exactly this, named as such in `hub/lib/auth/session-guard.ts:34` and `hub/lib/realtime/notifications-tenant.ts:18`:

| Dispatches it | Listens for it |
|---|---|
| `hub/lib/messages/client.ts:83` (every messages mutation) | `NotificationBell.tsx:104` |
| `hub/components/profile/ProfileEditForm.tsx:87` (profile edit) | `MessagesLink.tsx:67` |
| — **no notification response dispatches it** — | `AccountMenu.tsx:42` |

So a notification response — the one mutation class whose whole purpose is to change something elsewhere in the app — is the one that never announces it.

**Why this is the most consequential instance of the stale-view family** (with **W-02**): the other cases leave a count briefly wrong. This one renders a **membership that no longer exists** and withholds a role the member has just been granted. A steward who has just accepted is shown a page telling her she is not a steward.

**Related observation, cause not established.** The bell badge read **8** at the moment of the accept and **9+** only after reload, despite new notifications having arrived (visible in the open dropdown). Live delivery demonstrably works (Scenario 4 passed cleanly), so the difference may be that Grace herself caused these writes. **Not investigated — do not treat the cause as known.**

---

## Finding W-06 — a stale comment claims a permission gate that the code correctly enforces

**Grade: TRIVIAL, doc hygiene** · **Out of area** (Groups / FEAT-H017) · **No behaviour change needed.**

`hub/components/groups/GroupDetailPanel.tsx:368-371` comments the "Hand over leadership" button with:

> *"Any member may open it; the contracts refuse non-sole-Stewards honestly (relayed in the flow, never predicted here)."*

The code twenty lines earlier says otherwise, and is correct — `canTransfer` (`:227-230`) requires the `assign_roles` permission, carrying its own note: *"Live-testing finding 2026-07-05: a plain member was offered a door that always refuses."* The gate was added then; the older comment was never removed.

**Why it is worth a line:** the stale comment asserts the absence of an access-control gate that exists. It caused exactly one wrong conclusion during this walk — a reviewer reading it concluded the button was ungated and proposed fixing an already-fixed defect. A comment that misdescribes an access-control decision is worse than no comment.

---

## Finding W-05 — a transient network failure signs the member out of every device

**Scenario:** 5, step 1 · **Grade: DEFECT, high severity** · **NOT an A-NTF defect** — session guard (PC-2 / Identity), surfaced by this walk. **Blocks Scenario 5.**

**Observed.** Grace, signed in and idle on `/notifications`, was put offline via DevTools → Network → Offline. Instead of a degraded notice, the app **signed her out and redirected to `/login`**. The network log shows the sequence plainly: `user` (fetch, failed) → `logout?scope=global` (fetch, failed) → `login` (document).

**Root cause.** `hub/lib/auth/session-guard.ts:69-89`:

```js
try {
  const { error } = await supabase.auth.getUser();
  if (error) {
    // The auth server refused the session — it was revoked or expired.
    emitTelemetry('sessions.guard_signed_out', { via });
    await supabase.auth.signOut();
    replaceLocation('/login');
  }
} catch {
  // Network failure is NOT a refusal — never sign out on a hiccup.
}
```

The hazard was anticipated and the guard written — but placed in `catch`. `supabase.auth.getUser()` does not throw on a network failure; it **returns** the failure in `error`. The observed sign-out is proof the `catch` never ran: a hiccup takes the `if (error)` branch and is handled identically to a revoked or expired session.

**Compounding factor — the blast radius.** `supabase.auth.signOut()` with no argument defaults to **`scope: 'global'`**, matching the observed `logout?scope=global`. So one device's momentary connectivity loss terminates that member's sessions on **every** device. The codebase demonstrates the distinction is understood: `hub/app/farewell/page.tsx:26` deliberately passes `scope: 'local'`.

**Real-world impact.** Any commuter passing through a tunnel, any laptop resuming from sleep, any flaky wifi moment logs the member out everywhere. The guard runs on `focus`, `interval` and `hint`, so it does not require an in-flight user action to fire.

**The ejection is silent and unexplained.** Restoring the network confirmed the sign-out is durable, not a transient UI state — the member lands on `/login` reading *"Welcome Back — Sign in to continue your journey."* No notice that a session ended, no reason given, and copy that reads as though the member chose to leave. Whatever the fix to the branch itself, a member removed from their session involuntarily should be told that it happened and why.

**Direction for the fix (not a prescription).** The branch must distinguish an *auth refusal* from a *transport failure* — the retryable-fetch error class, and/or an `navigator.onLine` check — before signing out. The exact discriminator should be confirmed against the Supabase JS contract rather than assumed. Separately, consider whether the guard's sign-out should be `scope: 'local'`: revoking every device is a heavy response to one device's stale token.

**Note for triage.** This sits outside A-NTF and should not be folded into the A-NTF remediation; it belongs to the session/identity area and is arguably a launch blocker in its own right.

---

## Finding W-04 — a personal invitation arrives as a letter with no way to answer it and no pointer to where you can

**Scenario:** 6 (surfaced while resolving the above) · **Grade: SEAM** — by design per `FEAT-PD014:40`; the design is the thing worth questioning.

**Observed.** Grace's inbox carries *"Group Invitation — You have been invited to join "Nya gruppen #2" by Stefan."* It has no chip, no buttons, and — per **W-01** — cannot even be clicked. The answering surface (MyInvitations) is elsewhere and the letter does not say so.

**Why it matters.** Same family as **W-03**: the notification announces something that expects a decision from you, then offers neither the decision nor directions to it. A member who has learned that *some* letters carry Accept/Decline will reasonably conclude this one is broken. The split is defensible architecturally — it is a deliberate scope line — but it is invisible to the person reading the inbox, and the inbox is where N-B taught them to answer things.

**Cheapest remediation** is a pointer, not a re-architecture: give `invitation_received` rows a link to their answering surface. Note this is currently impossible from the surface side — copy is server-authored and never re-worded (see W-03) — so it belongs at emit time or in the row's navigation target.

## Script preconditions found stale

- **Grace already holds the Observer Role Template** in Nya gruppen #1 (verified: Guide, Member, Observer). Scenarios 4, 5, 7 and 10 all instruct "assign her Observer — she does not have it." Sequence must start with a **remove**, then assign.
- Confirmed intact: **zero `notification_preferences` rows platform-wide**, so the "absence means allowed" default holds and every switch should read ON (Scenarios 7 and 8). Dev Login is Steward of Nya gruppen #1, so the role assign/remove path is available. Grace: 4 unread; Nya gruppen #2 membership still `invited`.
