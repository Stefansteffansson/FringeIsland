# Changelog — The Hub

User-visible changes to the Hub (the canvas surface of FringeIsland). The Hub is being rebuilt fresh under `hub/` ([ADR-U032](../docs/architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)); entries below track the Phase-3 rebuild. Each entry links the feature spec, which carries the full implementation notes.

## 2026-08-05 — Group invitations answer right in the bell ([FEAT-H042](../docs/products/hub/features/FEAT-H042-invitation-bell-answers-and-groups-landing-focus.md))

- **Accept or decline where you read it.** An invitation notice in the bell or inbox now carries Accept and Decline, exactly like a stewardship nomination — each confirmed before it acts, and the letter then states its outcome durably, even after reload.
- **The letter lands you on the invitation.** Clicking the notice body still takes you to your groups page — and now the invitation card scrolls into view with a brief highlight, so the landing never reads as "nothing happened".
- **Two doors, one truth.** The invitations card on the groups page stays. Answer in the bell and the page beneath updates at once — the new group appears in your list without a reload; answer on the card and the bell letter settles too.
- **A withdrawn invitation says so.** If an invitation is taken back while your letter stands, it reads "Withdrawn" — no dead buttons, and no one's name attached to the withdrawal.
- **Held groups refuse honestly.** An invitation into a suspended group can't be answered while the hold stands; the reason appears on the letter itself, and the ask stays open rather than pretending to settle.

## 2026-08-04 — A suspended group can finally be stepped inside ([FEAT-H041](../docs/products/hub/features/FEAT-H041-suspended-group-admin-content-view.md))

- **The group administration page grows a content wing — for suspended groups only.** When a group is suspended, its admin page now shows the group's members (with emails), forum, announcements, and conversations — including message bodies in group conversations — below the existing controls. A banner names what this is: the admin view of a suspended group's content, with every access audited. For any group that isn't suspended, the page is unchanged and the platform refuses the reads anyway.
- **Cleaning up wrongdoing is now a lived affordance.** Each forum post offers Moderate: the confirmation names the author and the group, requires a written reason, and says what happens — the post is removed for every member, and the act lands in the audit log. Each member row offers Remove: the confirmation echoes the member's name *and email* beside the group's name, requires a reason, and states the consequence before anything happens.
- **Direct messages stay private.** Admin sight covers group conversations in suspended groups only — never DMs, never groups in any other state.
- **No surprises when the state changes underneath.** If the group is reactivated while the wing is open, the next read collapses the wing back to the ordinary page instead of showing stale affordances.

## 2026-08-04 — Role templates learn clone, draft, preview, apply — and the audit log names its targets ([FEAT-H040](../docs/products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md))

- **A new Roles area on the admin dashboard.** `/admin/roles` lists every role template — the four seeded ones badged — with its default version, version count, which group templates carry it, and how many live group roles it has instantiated, beside a read-only permission catalogue grouped by category with protected permissions marked. Nothing in the catalogue can be edited; permissions are platform atoms.
- **Seeded templates are immutable — cloning is the door.** A seed's page offers exactly one action: Clone. The confirmation says out loud what cloning means: the new template appears in every member's group-creation options, and every future group created without choosing a template carries its role.
- **Editing is drafting; nothing changes until Apply.** On a cloned template, edit the name, description, and permission checkboxes and save — that's a new version in the history, changing nothing live. Applying a version is a danger ceremony showing exactly what is added and removed, any rename, and the blast radius: existing group roles keep their snapshot; future groups instantiate the new set. Rolling back is the same ceremony pointed at an older version.
- **The audit log names its targets.** Rows about a member now show the member's full name and email instead of a raw id (the id moves into the expandable detail); rows about a group show the group's name; erased targets render the raw value honestly.
- **Force sign-out reaches the device in seconds — and now says so.** The ceremony no longer hedges about tokens and minutes: every session ends now, and open tabs sign themselves out within seconds. Verified end-to-end on a live signed-in browser before the copy changed.
- **Hard delete now works on the members it exists for.** A member with recorded consent decisions can be hard-deleted through the console — the operation used to die in a generic error on exactly those members. Their consent record survives with the personal link anonymised: proof retained, person gone.

## 2026-08-03 — The members console: pages, real search, and acting on many at once ([FEAT-H039](../docs/products/hub/features/FEAT-H039-bulk-member-actions-and-bounded-list.md))

- **The members list loads a page, not the whole platform.** `/admin/members` used to fetch every member (~1,900 rows) behind each paint; it now loads 50 at a time with Previous/Next, and shows *As of* with a Refresh button so you know how fresh what you're looking at is.
- **Search asks the platform.** The search box used to narrow only the rows already fetched; it now searches every member by name or email, server-side.
- **Act on several members at once.** Select members on the page (checkboxes; the selection deliberately never spans pages) and Suspend, Reactivate, or Force sign-out the whole selection. The confirmation lists every selected member by name **and email**, and the result reports each member separately — what succeeded, and the platform's exact words for anything refused. Partial success is reported honestly, never rolled together.
- **Every member ceremony now names the email.** Suspend, reactivate, decommission, force sign-out, platform exit, remove-from-group, grant/revoke administrator, and hard delete all echo the member's email beside the display name — so acting on the wrong same-named member is a mistake the confirmation itself catches.

## 2026-08-03 — Suspension tells the truth while you're signed in, and a group can rest ([FEAT-H038](../docs/products/hub/features/FEAT-H038-suspension-integrity-and-state-honesty.md) · [FEAT-H035](../docs/products/hub/features/FEAT-H035-group-administration-view.md))

- **If your account is suspended, you find out now — not at your next reload.** Suspension used to stay invisible until you happened to reload the page; you could keep browsing on stale "active" indefinitely. The session now re-checks your account state in the background as you move around, and a refused save demands the truth immediately — the suspension notice appears where you are, without a reload.
- **The way out of the suspended wall is written on it.** The wall's button now reads *"Sign out to use another account"* and actually takes you to the sign-in page. Before, signing out from the wall left you parked on the same screen, and the button read like part of the error.
- **A refused profile save tells you why.** A save refused by the platform used to come back as *"Failed to update profile"* no matter the reason. The real reason now comes through — including when the reason is that your account was just suspended.
- **The admin menu entry no longer follows the previous person on this computer.** Whether the "Administration" entry appeared could be decided by whoever used this browser tab before you. Each account now gets its own answer, and it's cleared on every sign-in and sign-out.
- **A steward can rest their group.** *Rest this group* pauses activity visibly: everyone still reads everything, nothing can change, and the steward can wake it anytime. Resting groups carry a "Resting" label on your groups list and on the group itself, and members see in plain words that the group is read-only until it wakes.
- **A suspended group says so — and says nothing else.** Opening a suspended group now shows its name, the "Suspended" label, and one sentence. No content, no actions, not even Leave; deep links land on the same honest shell. Before, suspension was a label over a fully working group.
- **A refused group action gives its reason.** Trying to change something in a held group now answers *"group is resting"* or *"group is suspended"* instead of a generic failure — in the forum, announcements, messages, invitations, roles, and settings alike.
- **Platform administrators choose the mode of a hold.** The group administration page now offers *Rest* alongside *Suspend* on an active group, *Wake* alongside *Suspend* on a resting one — with the consequences of each named before anything happens.

## 2026-07-30 — Two sentences that were telling you the wrong thing ([FEAT-H033](../docs/products/hub/features/FEAT-H033-notification-preferences-and-operator-nudge-console.md))

- **"Questions waiting for your answer" no longer claims to be about your account.** Two kinds of notification can't be switched off, and both were explained with the same line — *"these tell you about your own account and access"* — which is true of notices about your account and simply false of questions someone has asked you. The explanation now says the one thing that's true of both: it can't be switched off. Why a *particular* kind can't be is worth saying too, and that belongs with the notification itself rather than being written into the page, so it's recorded as the next step rather than guessed at here.
- **A preference that fails to save now says what happened.** If your connection dropped as you flipped a switch, the page put the switch back — correctly — and then showed you the words *"Failed to fetch"*. It now tells you we couldn't reach the server, that your change wasn't saved and has been put back, and to try again. When the server *does* answer with a reason, you still get that reason in its own words, unchanged.

## 2026-07-30 — Your notifications page keeps up on its own, and a group says who's looking after it ([FEAT-H030](../docs/products/hub/features/FEAT-H030-notification-bell-and-inbox.md) · [FEAT-H018](../docs/products/hub/features/FEAT-H018-group-of-groups-and-acting-as-a-group.md))

- **The Notifications page now updates as things arrive.** The bell kept up with new notifications; the full page did not — anything that landed while you were reading simply wasn't there, and only a reload would show it. Worse, the page *told the bell* about its own changes while never listening for anyone else's, so the two could disagree about what you had. The page now hears the same signal the bell does, and new arrivals appear at the top without touching anything. If you'd already pressed "load more", the older rows you'd pulled in stay exactly where they were.
- **A group held by FringeIsland now says so under its name.** When a group's last Steward hands it over, FringeIsland looks after it until someone takes it on. That caretaker showed up in the member list but was deliberately never counted as a member — so the page could read *"1 member"* directly above a list of two, with nothing explaining the difference. The count still means people, because that's what it's for, and the line now names the caretaker instead of leaving you to work it out.

## 2026-07-28 — A notification that says what you decided, and a page that keeps up ([FEAT-H031](../docs/products/hub/features/FEAT-H031-notification-typed-actions.md) · [FEAT-H033](../docs/products/hub/features/FEAT-H033-notification-preferences-and-operator-nudge-console.md) · [FEAT-PC014](../docs/platform/core/features/FEAT-PC014-leadership-transfer-and-closure-contracts.md))

- **Your answer is now written on the letter.** A notification you'd answered said only *"Handled"* — the same word whether you had accepted or declined. So the platform's record of a real decision was invisible to the person who made it, and you had no way to check what you'd said. It now says **Accepted** or **Declined**, and where several people could answer for a group, it names both: *"Declined by Bruno"*, not just *"Answered by Bruno"*.
- **Declining is no longer coloured like a celebration.** A handled notification rendered green whichever way you'd answered, so a refusal came back to you looking like congratulation. A decline now reads neutral — it's a legitimate answer, not a lesser one — while an accept stays green and something you let run out stays grey.
- **A nomination stops telling you to act after the moment has passed.** *"You have been nominated as Steward of X. Accept or decline within 7 days."* was written into the letter itself and frozen there, so weeks after the window closed it still gave you an instruction, and only a small label further down admitted the deadline was long gone. The letter now states the fact, and the deadline lives where it can actually expire — you see **"Respond by"** with a date for exactly as long as you can still respond. Notifications already sent are untouched: we don't go back and edit something we already told you.
- **The page under the bell keeps up with what you just did.** Accepting a stewardship from the bell while standing on that group's page left the page showing the old truth — a member you'd just removed still listed, the role you'd just been given still missing — until you reloaded. It now updates itself. If your answer is refused, the page is deliberately left alone rather than repainted to show a change that didn't happen.
- **The email line on your preferences page stops pointing at a setting that isn't there.** It promised *"your choice will apply as soon as it is"* — but there was nothing to switch, so there was no choice to apply, and it read as though an email setting existed somewhere you couldn't find. It now says what's actually true: the switches on that page cover every channel, so they'll apply to email the day it arrives.

## 2026-07-27 — Signing out signs out this browser, not all your devices ([FEAT-H012](../docs/products/hub/features/FEAT-H012-per-device-sessions.md))

- **"Sign out" now ends this browser only.** It used to end every device you were signed in on — so signing out on a shared computer also signed you out on your phone, with nothing to tell you it had happened. Now your other devices are left alone, which is what "sign out" means nearly everywhere else.
- **If you do want to end everything, that's coming as its own thing.** A deliberate "Sign out everywhere" will live on your Sessions page, next to the list of devices — so you can see what you're ending before you end it. In the meantime you can already sign out any single device from that page.

## 2026-07-27 — Your notifications answer a click ([FEAT-H030](../docs/products/hub/features/FEAT-H030-notification-bell-and-inbox.md))

- **Notifications on the Notifications page are things you can click again.** A notification in your inbox now opens what it's about — click the one telling you about a group and it takes you there — and clicking it marks it read. Until now the rows on that page looked interactive but did nothing at all, and there was no way to mark a single notification read from there.
- **"Mark all read" on the Notifications page now clears the bell too.** Pressing it used to tidy the list while the little number on the bell kept insisting there was unread news, until you reloaded the page. The bell now keeps up — whether you mark things read from the bell, from the page, or by answering something.

## 2026-07-27 — A moment of bad signal no longer signs you out ([FEAT-H012](../docs/products/hub/features/FEAT-H012-per-device-sessions.md))

- **A dropped connection doesn't end your session any more — anywhere.** The Hub checks now and then that you're still signed in. If it couldn't reach the server to ask, it used to assume the worst and sign you out — **and not just on the device that lost signal: on every device you were signed in on.** You'd come back to "Welcome Back" with no explanation and have to find your password again. Now a failed check is treated as what it is — *no answer* — and your session is left exactly as it was. The Hub simply asks again shortly after.
- **When you really are signed out from elsewhere, only that one device is affected.** Signing a device out from your Sessions page ends that device, and leaves your others alone.

## 2026-07-26 — You can say no: choose what reaches you ([FEAT-H033](../docs/products/hub/features/FEAT-H033-notification-preferences-and-operator-nudge-console.md) · [FEAT-PD016](../docs/platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md))

- **Turn off what you don't want to hear about.** A **Notification preferences** page now sits with your notifications: one row per kind of notification, each with a switch. Turn one off and it stops arriving — **however it was written**. There is no corner of the platform that quietly routes around your choice.
- **There's nothing to set up.** Everything starts on, and the platform only remembers where you've chosen to differ. A new member has nothing to configure, and a new kind of notification simply arrives until you say otherwise.
- **Some things can't be switched off, and the page says why.** Notices about your own account and your access stay on — they're how the platform tells you something has happened to *you*. Rather than showing you a greyed-out switch and leaving you to guess, the page explains it in a line, in place.
- **Email is listed, but not switchable yet.** Email delivery hasn't shipped, so a switch for it would be a promise we can't keep. The page says so plainly, and your choice binds the day it does ship.
- **A change that can't be saved comes back and tells you.** The switch returns to what's actually true rather than leaving you looking at a setting the platform never accepted.
- *(For those who run the platform: the platform-wide announcement nudge now has an operator panel — and it shows what switching it on actually costs, in messages, at the moment you decide.)*

## 2026-07-25 — The bell goes live: news finds you where you are ([FEAT-H032](../docs/products/hub/features/FEAT-H032-live-notification-bell-and-reconnect-reconciliation.md) · [FEAT-PD015](../docs/platform/domain/features/FEAT-PD015-notification-realtime-hint-and-reconnect-reconciliation.md))

- **Notifications arrive while you're looking at something else.** Sitting on any page, your bell updates within about a second of something being written for you — no refresh, no navigating away and back. Messages and forums have been live since earlier in this area; notifications, whose whole job is telling you things, now are too.
- **A dropped connection costs you time, never news.** If the connection goes, or you leave the tab, anything that arrived while you were away is picked up when you return or when the page next loads. Nothing is lost by not watching.
- **And it tells you when it isn't live.** Rather than looking up to date while quietly being stale, the bell says so, quietly, while it reconnects.
- **Nothing about a notification travels over the live connection.** The signal says only *something changed*; the notification itself is fetched through the same door as always — so what you see is always what you're allowed to see.
- **Your groups page got lighter.** It had been fetching nominations on every load for a section that no longer exists. That work is gone.

## 2026-07-24 — Answer where you were asked ([FEAT-H031](../docs/products/hub/features/FEAT-H031-notification-typed-actions.md) · [FEAT-PD014](../docs/platform/domain/features/FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md))

- **Notifications you can answer.** A notification that asks something of you now carries the answer with it: **Accept** and **Decline** sit right on the letter, in the bell and in your notifications page alike. Each asks you to confirm, then applies immediately — and if it can't go through, it says why and puts the buttons back, rather than quietly pretending.
- **Nominations moved home.** Being nominated to lead a group used to appear in its own section above your groups. That section is gone: the nomination is a notification like everything else, deadline included — *Respond by* the date it runs out — and you answer it where you read it.
- **Your group's invitations, answered in the same place.** When a group you lead is invited to join another, the invitation now reaches **everyone who can answer for that group**, not just one person. The group's page shows the invitation but no longer asks there — it points you to your notifications.
- **Your co-leaders can see who answered.** Whoever gets there first answers for the group, and the others' copies stop asking and read **"Answered by [name]"**. No double answers, no wondering whether someone already handled it — and it stays true even when the answer was a decline.
- **Answered stays answered, and expired stops asking.** A letter you've responded to shows its outcome and drops its buttons; one whose window has passed reads *Expired* and asks nothing. Reload and it's still true — this is the platform's memory, not your browser's.

## 2026-07-23 — The bell arrives: notifications you can find again ([FEAT-H030](../docs/products/hub/features/FEAT-H030-notification-bell-and-inbox.md) · [FEAT-PD013](../docs/platform/domain/features/FEAT-PD013-notification-routing-contracts-and-category-registry.md))

- **A bell in the header, with a count.** It shows how many notifications you haven't read — capped at *9+* — and the count drops the moment you read one.
- **Open it for your latest fifteen, unread first.** Clicking one marks it read and takes you where it points, or leaves you where you are when there's nowhere to go. *Mark all* is there for when you simply want it clear.
- **A notifications page that keeps your history.** Until now, anything that scrolled out of view was gone for good. There's now a full page you can page back through, as far back as it goes.
- **Letters that expect something of you show their state** — *Awaiting*, *Handled* or *Expired* — so you can see what still wants you. *(Answering them where you read them arrives in the entry above.)*
- **A kind of notification the page doesn't recognise still shows up** rather than vanishing. The platform would rather tell you something arrived than silently drop it.
- **Your data download now includes your notifications.**

## 2026-07-20 — A place that keeps what's said: the group forum, and names that stay honest ([FEAT-H026](../docs/products/hub/features/FEAT-H026-group-forum-and-attribution.md) · [FEAT-PD009](../docs/platform/domain/features/FEAT-PD009-forum-and-attribution-contracts.md))

- **Your group has a forum now.** The group's page holds a Forum section: threads newest-first, each with its replies beneath, in the order they were written. If it ever can't load, the rest of the group page still works.
- **Post, reply, moderate — as your role allows.** If your role lets you post, a composer is there; if it lets you reply, top-level posts offer a Reply; if you steward the group, each post carries a Remove. What you can do is the group's permission fabric answering — the button only appears when the platform says yes.
- **Posting feels instant and stays honest.** A post or reply appears the moment you send it and is quietly confirmed behind it; a failure says so, with a retry, never a silent loss.
- **Removed means removed, in place.** A moderator's Remove leaves the thread intact — the post becomes a plain "Removed by a group moderator" where it stood, its content gone. The thread still reads as a conversation, not a page full of holes.
- **Names tell the current truth.** A post shows its author by who they are in the group *now*: a current member by name; someone who has left as **"Former member"** — and if they rejoin, their name comes back on its own. Nothing you wrote is ever rewritten; only how it's shown. A hard-deleted author reads as "Unknown". The same honest naming now shows in your messages, too.

## 2026-07-20 — Talk to each other: messages arrive ([FEAT-H025](../docs/products/hub/features/FEAT-H025-messages-dm-and-group-conversations.md) · [FEAT-PD008](../docs/platform/domain/features/FEAT-PD008-conversation-and-message-contracts.md))

- **Message a fellow member.** Every member on a group's roster now carries a *Message* button. One click opens the one conversation the two of you share — your history if you've talked before, a fresh page if not. There is exactly one conversation per pair, always.
- **A Messages home.** *Messages* now sits in the header: your conversations in one list — direct and group alike — newest activity first, with a quiet dot on anything unread and a badge counting the conversations waiting for you. Unread is about what *you've* read, nothing more; messages create no notifications.
- **Sending feels instant and stays honest.** Your message appears the moment you press Send and is quietly confirmed behind it. If a send fails, it says so — visibly, with a retry — never a silent loss.
- **Group conversations.** A group's page now has a *Conversations* section. Those who steward or guide the group can open one; any member can step in, speak, step out, and return — your words stay yours and stay put across your absence. *(Whether someone can open one is the group's permission fabric asking the platform — roles can grant it.)*
- **Only members, only through the door.** Conversations are for members (a Mist sees none of this), every read and write goes through the platform's contracts, and nobody outside a conversation — however they knock — can see into it.
- *(Live updates — messages appearing without a refresh — arrive with the real-time cycle later in this area.)*

## 2026-07-18 — The Ask starts collecting: your words, and the author's takeaways ([FEAT-H024](../docs/products/hub/features/FEAT-H024-ask-capture-and-review-substance.md))

- **Steps that ask can now hear your answer.** A step built to ask — reflect, note, decide — offers a place for your words, labelled by its own verb. Answering is always optional: skipping costs nothing, and completing a step never demands words first.
- **Your words save themselves, honestly.** Responses save quietly in the background; if a save fails it says so and offers retry — never a silent loss. While the walk lives, your words stay yours to change: come back any time and edit.
- **Review gains substance from both directions.** Reviewing a journey now shows your own responses beside the steps that asked — and the author's takeaways: per-step once a step is complete, and the journey's own takeaway on the completion panel and at the head of review. The richer review door returns — now there's something behind it.
- **Frozen walks keep your words too** — readable, never editable, like everything else behind the freeze.
- **Your data download now includes your walks.** The "download my data" export gains a journeys section: your enrolments, the steps you walked, and the words you left in them.
- **Private, full stop.** Nothing you write in a step ever reaches the group progress view or anyone else — progress sharing covers completion marks only, exactly as its copy has always said.

## 2026-07-10 — The front door opens itself: arriving is a journey, and it survives becoming a member ([FEAT-H023](../docs/products/hub/features/FEAT-H023-onboarding-arrival-and-carry-over.md))

- **Your first arrival walks you in.** Arriving at FringeIsland for the first time — anonymously as a Mist, or as a brand-new member's first sign-in — now enrols you in the onboarding journey and opens the player at its welcome. No hunting for a start button: having no enrolment yet *is* the signal that you're new, and the platform meets you there.
- **A door, never a wall.** You can leave any step freely, nothing is walled behind finishing the walk, and once you've arrived it never launches at you again.
- **Becoming a member keeps your place.** If you start the walk as a Mist and then transcend — sign up, become a FIM — the journey comes with you: you resume exactly where you left off, never restarted.

## 2026-07-08 — What froze is still yours; progress is shared only by choice ([FEAT-H022](../docs/products/hub/features/FEAT-H022-frozen-mode-and-group-progress.md))

- **A frozen journey opens — read-only — and says why.** When a group closes, is archived, or you leave or are removed, the journeys you walked through it freeze rather than vanish. Opening one now shows your whole walk — every step readable, your marks and times beside them — with a banner naming what happened and when. Nothing is recorded while you look; nothing can be changed. Frozen journeys say *View* where active ones say *Continue*.
- **Your record survives the goodbye.** Even after your membership ends, a frozen walk still lists on your journeys page and opens for you — what you lived through a group doesn't disappear with the group. (Rejoining still restores everything else, exactly as before.)
- **Your progress is yours until you say otherwise.** On a group journey, a new control in the player lets you share your step completion marks with the group's Stewards and Guides — marks only, never your times, never anything you write. Off by default; one flip to share; one flip to take it back, effective immediately.
- **Group leads get an honest window, never a leaderboard.** On the group's page, Stewards and Guides can open a journey's progress view: how far the walk has come, counted only across members who chose to share — and labelled so ("of 2 sharing · 5 members"). Members who haven't shared show a quiet "not shared" and contribute nothing, not even to the counts. Everyone is listed alphabetically; nobody is ranked, compared, or timed.
- *(Same-day follow-up from live testing:)* **The sharing checkbox now always shows the truth.** It could briefly show your *previous* choice after you navigated away and came back — the sharing itself was always correct (the group page never lied), only the checkbox display lagged. Fixed: the control now follows the server-confirmed state wherever you re-enter from.

## 2026-07-08 — Finishing means something: completion, review, and your time ([FEAT-H021](../docs/products/hub/features/FEAT-H021-journey-completion-and-review.md))

- **The arrival is marked.** Completing your last required step now concludes the journey — a quiet completion panel appears with the date and the time you gave it, and the step rail shows the whole walk done. It appears the moment the platform confirms it — never before.
- **Two honest numbers, not one.** The panel tells you your *engagement time* (what you actually spent in the steps) and the *calendar span* (enrolled → completed) as two different things. Steps you never spent time in show a dash — never a fake "0 min".
- **Completed journeys stay open.** Opening a finished journey gives you *review*: every step readable, your marks and times beside them, nothing recorded just for looking. Optional and repeatable steps still offer their invitation, if you want to go again — finishing is a milestone, not a lock.
- **Review is a door, not a hunt.** Wherever your enrolments show — the journeys page, a journey's page — finished ones now say *Review* where active ones say *Continue*.
- **Your milestone is remembered.** Completing a journey writes a durable notification for you — it will surface when the notification centre arrives in a later area.
- *(Same-day follow-ups from live testing:)* **The "Review your journey" button was first fixed (it could sit clickable-but-dead), then removed on the product read behind it:** review isn't a place you enter — it's what the player already is once you've finished, and Previous/Next walks it. The completion panel is now purely the arrival's summary. A richer review — with your own step responses or per-step conclusions to return to — is a recorded open question (J-O6) awaiting its design session; the door returns when there's something behind it.

## 2026-07-07 — Walk your journeys: the player arrives ([FEAT-H020](../docs/products/hub/features/FEAT-H020-journey-player.md))

- **Walk a journey, step by step.** Every journey you're enrolled in now has a *Continue* button that opens the player: the step you're on, front and centre, with the whole route visible in a rail beside it — what's required, what's done, where you are.
- **Every kind of step knows how to ask.** A reading asks you to *Read*, a journal step to *Write an entry*, a checklist to *Check off* — each step's own invitation, straight from the platform. Step kinds added in the future render out of the box.
- **Progress saves itself.** Moving between steps and completing them is instant on screen; saving happens quietly behind you. If a save ever fails, a small "not saved — retry" note appears — nothing blocks, nothing is lost silently.
- **Leave anytime, resume where you left.** Closing the player costs nothing: next time, it opens exactly where you stopped.
- **Locked steps say why.** A step that needs an earlier required step first tells you which one — no mystery buttons, no silent refusals.
- **Withdrawing keeps your history — and coming back keeps your place.** Leaving a journey no longer erases the record of the steps you walked, and if you re-enrol, you resume exactly where you were — completed steps stay completed. *(The resume-on-return half landed as a same-day fix after Stefan's read-through caught the gap.)*

## 2026-07-07 — Journeys arrive: browse, start one, take your group travelling ([FEAT-H019](../docs/products/hub/features/FEAT-H019-journey-catalogue-and-enrolment.md))

- **Browse the journeys.** A new "Journeys" page (account menu) shows every published journey — what it's about, how hard, how long, and an **Enrolled** badge on the ones you're already travelling.
- **See one whole before committing.** Each journey's page lists its steps (what kind, how long) so enrolling is an informed act. The walkable player arrives next cycle.
- **Start alone or take a group.** *Start this journey* enrols you; *Enrol a group* appears only for groups you may actually enrol — the confirmation names the group, and every active member is notified.
- **Withdraw deliberately.** Leaving a journey asks you to confirm; a held (frozen) enrolment says so honestly instead of offering buttons that would fail.
- **Your group's page tells its journeys.** A new section on each group page lists what the group is travelling — and if that section ever can't load, the rest of the page still works.

## 2026-07-06 — Small fixes from live testing (acting as a group)

- **You can visit before you answer, and visit where your group belongs.** Group names are links now — in your invitations and in your group's memberships panel. And the platform opens the group's front page to you in both cases: an invitation or an admission means the group has already revealed itself, so you're no longer deciding blind or locked out of a group your own group belongs to. (Member lists and everything else keep their existing rules.)
- **The "Acting as" list only offers hats that fit.** It used to show every group you represent on every page — including the very group you were looking at, and groups with no membership there. Now it offers a group only where that group actually belongs (and never on its own page — a group doesn't act as itself).
- **The empty state tells the truth.** "…can view this group" could appear for a group with no standing at all. The panel now says exactly what the platform answered: a member with no special grants, or nothing.

## 2026-07-06 — Group-of-groups: a group can join a group, and act through its people ([FEAT-H018](../docs/products/hub/features/FEAT-H018-group-of-groups-and-acting-as-a-group.md))

- **Invite a whole group.** Stewards who can invite members can now invite another group by search — it joins as one member, with its own voice.
- **Act as your group.** If your group has empowered you (a new permission its Steward holds out of the box), its page shows where it belongs and its pending invitations — you accept, decline, or withdraw *as the group*, and every confirmation says so plainly. The "Acting as" selector is real now: pick a group you represent and see exactly its powers — nothing of your own mixed in.
- **Member lists tell kinds apart.** Group members wear a "Group" badge and the FringeIsland caretaker wears its own — visible, never hidden.
- **The last human can always close.** Counts and the Close affordance now ignore the caretaker: if you're alone in a group FringeIsland stewards, Close is yours.
- **Only people can inherit stewardship.** The successor picker offers members who are persons — never the platform, never a group (and the platform now refuses it too).

## 2026-07-05 — Small fixes from live testing (leadership transfer)

- **"Hand over leadership" only shows for those who could use it.** Plain members no longer see a transfer door the platform would always refuse — the affordance follows the role-granting permission, and the platform keeps guarding regardless.
- **The nomination copy tells the whole story.** The confirmation and the "offer is out" notice now say what happens if every nominee declines: the group passes to FringeIsland stewardship and you leave. That outcome was always by design (a group is never left headless) — now it's never a surprise.

## 2026-07-05 — Leadership transfer, closure & deletion ([FEAT-H017](../docs/products/hub/features/FEAT-H017-leadership-transfer-and-closure.md))

- **The walls became doors.** The only working Steward who tries to leave is no longer stuck at "assign another Steward first" — the same moment now opens the hand-over choice. The last member is no longer told closing "isn't available" — the Close affordance is right there on the group page.
- **Pass leadership on, by consent.** "Hand over leadership" lets the Steward nominate one or more members *in order* — picked straight from the member list. The first nominee gets the offer (seven days to answer); nothing changes hands until someone accepts. You stay the Steward while the offer is out.
- **Answer where your groups live.** A nominated member finds the offer at the top of My Groups with the group named and the response window shown. Accept (through a confirmation) and you are the Steward — the previous one leaves as you take over. Decline and the offer passes on; the platform decides where, and tells no tales.
- **Never headless.** With no one to nominate, "Hand to FringeIsland" (a deliberate last resort, clearly styled as such) gives the group to FringeIsland stewardship and you leave. If every nominee declines, the same safety net catches the group automatically.
- **Close a group that ran its course.** The last member can close the group deliberately: its work is preserved and reassigned, and the group ends cleanly.
- **Delete a group deliberately.** Anyone holding the delete permission gets a clearly-danger-styled Delete with an explicit confirmation, distinct from Leave, Remove, and Close — members are told, the group's work is preserved and reassigned, and the group is gone from everyone's list.

## 2026-07-04 — Small fixes from live testing

- **"My groups" in the account menu.** Sign-in landed on your groups, but no menu item led back there — now the menu's first entry does.
- **Creating a group makes you a participant, not just the Steward.** The creator now also receives the participation role (so they can, for example, enrol themselves in the group's journeys) — and it stays removable for the facilitator-only case ([FEAT-PC010 amendment](../docs/platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md)).

## 2026-07-04 — Group membership lifecycle ([FEAT-H016](../docs/products/hub/features/FEAT-H016-group-membership-lifecycle.md))

- **Rest without expulsion.** Anyone allowed to pause members can pause a member from the member list (through a confirmation): the paused member keeps their roles but all their powers in the group go dark, and the group steps out of their view until someone reactivates them. Paused members wear a Paused badge — visible only to people who manage membership.
- **Reactivation is one click.** A paused member comes back exactly as they were — same roles, same standing — and the group reappears for them.
- **Removal now tidies up.** Removing a member (a distinct permission, destructive confirmation) also freezes their unfinished work in the group's private journeys and cleans up their roles — nothing orphans.
- **Leave on your own terms.** Every member has a Leave group button. Leaving freezes your own unfinished private-journey work in that group and you land back on My Groups.
- **Honest refusals instead of hidden buttons.** The only working Steward can't be paused, removed, or allowed to leave — the screen says why ("assign another Steward first"). The very last member is told closing a group isn't available yet. Both flows arrive properly in a later cycle; until then the answer is a clear sentence, not a missing button.

## 2026-07-04 — Group invitations & joining ([FEAT-H015](../docs/products/hub/features/FEAT-H015-group-invitations-and-joining.md))

- **Invite people in.** Group pages now carry an Invitations panel for anyone allowed to invite: find a member by typing part of their name (or their exact email address) and invite them in two clicks, or invite someone who isn't on FringeIsland yet by email.
- **Honest about email.** The email invitation is saved and waits for the person at sign-up — and the screen says exactly that: no email is sent yet. When notifications arrive as an area, sending plugs into the same seam.
- **Tend the pending list.** Outstanding invitations — people and email addresses alike — are listed with who invited them and when; email invitations show their expiry and wear an Expired badge when past it. Any of them can be taken back through a confirmation.
- **Answer where your groups live.** Pending invitations appear in a "You are invited" section at the top of My Groups, showing the group's name, description, and who asked. Accept and the group joins your list right there; decline through a confirmation and it's gone — they can always ask again.
- **The newcomer's promise is kept.** Someone invited by email finds the invitation waiting the first time they visit their groups after signing up with that address — accepting joins them like any other member, default role included.

## 2026-07-04 — Group roles & permissions ([FEAT-H014](../docs/products/hub/features/FEAT-H014-group-roles-and-permissions.md))

- **See the role fabric.** Every group page now carries a Roles panel: each role with its template-or-custom badge, how many members hold it, and exactly what it allows — legible to every member, purely informative for those without management permissions.
- **Shape the roles.** Stewards (and anyone granted `manage_roles`) add a role from a foundational template or define a custom one from a permission checklist, flip individual grants role-by-role, and delete custom roles nobody holds — every destructive step through a confirmation, every refusal shown in the platform's own words.
- **Give and take roles.** The member list wears role chips; role-granters assign from a per-member picker and remove with a confirm. Removing the group's last Steward is refused — the message shows in place and the chip stays.
- **No way to over-reach.** You cannot define a role granting what you don't hold, and you cannot hand out a role granting what you lack — both walls live in the platform, not the browser, and the Hub simply shows their refusals honestly.
- **Know what you can do here.** A "What I can do here" view lists your effective permissions in the group as readable chips, under an acting-as control that today offers exactly one honest context — "Myself" (acting *as a group* arrives with group-of-groups).

## 2026-07-04 — Create and steward your groups ([FEAT-H013](../docs/products/hub/features/FEAT-H013-group-creation-and-stewardship.md))

- **Create a group.** A "Create group" flow on *My Groups* — name it, describe it, choose its visibility — and land inside it as its Steward.
- **See a group whole.** Every group in your list opens to a detail page: description, lifecycle status, member count, and the member list exactly as the group's settings allow (hidden lists say so honestly).
- **Steward the settings.** Stewards edit the name, description, and label in place — and control the two visibilities independently: who can find the group, and who can see its member list.
- **Private stays private.** A group you can't see is indistinguishable from one that doesn't exist.

## 2026-06-28 — Member profile + sign-out ([FEAT-H005](../docs/products/hub/features/FEAT-H005-member-profile-and-sign-out.md))

- **Your profile.** A `/profile` surface where a member views and edits who they are — full name, display name / nickname, display preference (nickname vs real name), an "allow others to see my real name" control, and a bio. Avatar is shown if set (upload is not in this slice).
- **Consistent display name.** Changing your display name flows through to how you appear across the surface automatically.
- **Account menu + sign out.** A member-only account menu in the header opens your profile and signs you out, returning you to the public entry.

## 2026-06-26 — Mist identity on arrival ([FEAT-H003](../docs/products/hub/features/FEAT-H003-mist-identity-on-arrival.md))

- **The FringeIsland entry.** A public landing reachable with no account and no session — *Sign in* / *Sign up* / **Look around**. Looking around leaves no trace (no session, no rows).
- **Enter as a Mist.** "Look around" begins an anonymous session just-in-time and lands on a minimal Mist-presence state, with a "become a FIM to keep your journey" path to sign-up.
- **Three-state identity.** The app distinguishes sessionless / Mist / FIM and shows each only the doors that are theirs (no Mist chrome for a FIM).

## 2026-06-25 — Credentialed FIM sign-up ([FEAT-H002](../docs/products/hub/features/FEAT-H002-credentialed-fim-sign-up.md))

- Create an account (email + password + consent) and your personal group, landing authenticated on your groups.

## 2026-06-24 — Walking skeleton: sign in ([FEAT-H001](../docs/products/hub/features/FEAT-H001-walking-skeleton-sign-in-and-groups.md))

- Sign in as an existing FIM and land on your groups — the first Phase-3 slice (architecture proof + the five vertical seams).
