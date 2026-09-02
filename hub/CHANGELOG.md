# Changelog — The Hub

User-visible changes to the Hub (the canvas surface of FringeIsland). The Hub is being rebuilt fresh under `hub/` ([ADR-U032](../docs/architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)); entries below track the Phase-3 rebuild. Each entry links the feature spec, which carries the full implementation notes.

## 2026-09-02 — platform admins can see a closed group's preserved threads ([FEAT-H041](../docs/products/hub/features/FEAT-H041-suspended-group-content-wing.md) · TASK-SEAL-01)

- **When a group has closed, its group conversations are preserved — and now a platform admin can see that they exist.** Open a closed group in the admin area and a "Preserved threads" section lists each group thread with how many messages it holds and when it was last active. A thread that was sealed when its author departed is labelled *Sealed* with the date, and nothing about it is live: there is no way to open it, reply to it, or mistake it for an ongoing conversation. This is where evidence of bullying lands when someone leaves, so the admin plane should at least know it is there.
- **What it deliberately does not do:** the contents of a sealed thread are not readable from the admin area. The section says so plainly. Direct messages are never shown.

## 2026-09-02 — a stale Mist session no longer strands you ([FEAT-H003](../docs/products/hub/features/FEAT-H003-mist-identity-on-arrival.md) · TASK-MIST-01)

- **If your look-around identity was cleared on the server while your browser still remembered it, the Hub now notices and starts you fresh.** A Mist (the anonymous look-around identity) expires after 72 hours, and saying goodbye on one device cannot reach another device's memory of it. Before, that other browser could sit on the Mist page as a ghost — remembered locally, gone on the server, every door quietly refusing. Now the first refusal ends the stale session and you land on the entry page; the next "Look around" gives you a brand-new Mist and the front door opens as on a first visit.
- Nothing changes for a live Mist or for a signed-up member; saying goodbye works exactly as before.

## 2026-08-21 — your own forum posts: fix them or withdraw them, whenever (TASK-EDT-01)

- **The 15-minute clock on editing and deleting your own forum posts is gone.** Edit and Delete now stay on your own posts for good — a typo found next week is as fixable as one found now, and a post you regret can be withdrawn whenever (it leaves the same neutral tombstone as before, so replies keep their place).
- **Honesty moved from the clock to a label.** An edited post says *"(edited)"* beside its timestamp — except when the edit lands within three minutes of posting, which stays silent so a quick typo fix doesn't wear a badge forever. Any later edit turns the label on.
- Nothing else moved: moderation, reporting, group-authored posts (still editable by no one), and direct messages (still immutable) are exactly as they were.

## 2026-08-21 — a group can now speak from its host's announcement board ([FEAT-H048](../docs/products/hub/features/FEAT-H048-wielded-announcement-affordances.md))

- **Wearing a group's hat now opens the host community's announcements too.** With the hat selected on the host group's page, the Announcements panel shows the board through the group's own standing — *"Viewing as …"* — and if the hat doesn't reach, the panel says so plainly, naming the hat, instead of pretending something broke.
- **Announcing and retracting as the group each ask once, by name.** An announcement is said to everyone at once, so before it goes the page asks: *"You are announcing as … — the board will carry the group's name, not yours, and everyone in this group is told."* Taking one back asks the same way. There is no steady label on the box here, unlike the message composer — a board is not a chat.
- **The powers are the group's, not yours.** The compose box and the Retract buttons appear only if the *group* may announce in that community — whatever you may do there under your own name changes nothing while the hat is on. Announcements written by a group carry the group's name with the **Group** badge, for every reader.

## 2026-08-20 — the group can now sit in its host's conversations ([FEAT-H047](../docs/products/hub/features/FEAT-H047-wielded-conversation-affordances.md))

- **Wearing a group's hat now opens the host community's conversations too.** With the hat selected on the host group's page, the Conversations panel shows the threads through the group's own standing — *"Viewing as …"* — and Join, Leave, and New conversation each ask once, naming the group ("You are joining as …"), before they act. The group itself takes the seat: every representative shares it, and one representative reading marks the thread read for the group.
- **Inside a thread, the address carries the hat.** Opening a conversation from the hatted panel lands on the thread *as the group* — banner at the top, and a steady **"Sending as …"** label right on the message box instead of a pop-up per message. Messages sent land under the group's name with the **Group** badge, for everyone. Reloading keeps the hat; opening the same thread from your own Messages inbox shows your normal view.
- **Group voices are badged everywhere.** Any message sent by a group now carries the Group badge beside its name in every thread, whoever is reading.

## 2026-08-16 — acting for a group now opens real doors ([FEAT-H046](../docs/products/hub/features/FEAT-H046-wielded-content-affordances.md))

- **Wearing a group's hat now lets you read and write its host community's forum.** If a group has empowered you to act for it, choosing it under "Acting as" on the host group's page now opens the forum with that group's own powers — before, the selector showed you what the group could do, and every door stayed shut. A banner says *"Viewing as …"* while you look, and posting first asks you to confirm: *"You are posting as …"* — because the post is signed by the group, not by you.
- **Posts written by a group are visibly a group's.** A group-authored post carries the group's name with a **Group** badge wherever the forum shows authors. A group that has since left shows as *"Former member"*, exactly like a person who left. While acting for a group you can read, post, and reply — editing, moderation, and reporting wait until you switch back to "Myself".
- **If the group's membership is paused while you're on the page, the hat withdraws by itself.** The delivered notice reaches you personally (that's the 2026-08-15 delivery change working), the hat leaves the "Acting as" selector without a reload, and a note says the page has returned to your own view.

## 2026-08-15 — mail addressed to a group reaches the people who answer for it ([FEAT-PD020](../docs/platform/domain/features/FEAT-PD020-group-addressed-notification-delivery.md))

- **When something happens to a group your group placed inside another group, the people who answer for it now hear about it personally.** Announcements from the host community, a pause or reactivation of the group's membership, a role it was given — these used to be addressed to the group itself, where no one's bell could ever ring. They now arrive in the inboxes of everyone who can act for the group (its representatives and Stewards), each copy respecting that person's own notification preferences. The handful of older notices stranded this way are re-delivered, dated as they were.

## 2026-08-15 — deleting your account now comes with a way back ([TASK-IDN-01](../docs/planning/backlog/tasks/TASK-IDN-01-self-deletion-grace-period-completion.md) / [TASK-DM-02](../docs/planning/backlog/tasks/TASK-DM-02-erased-author-renders-forbidden-literal.md))

- **"Delete my account" now schedules the permanent deletion instead of leaving your sign-in in limbo forever.** What it erases, it still erases immediately — your journal, your journey record, your places in groups. But your account itself now gets a stated deletion date about a month out, and until that date, signing back in offers to restore it: your name and profile return whole. After the date, an automatic sweep erases everything for good — credentials included, which previously lingered indefinitely. The ceremony's wording tells this truth before you confirm.
- **What a deleted member's conversation partners see now says "Unknown" — never "[Deleted User]".** The old label quietly told the other person what you did with your account; the display law always said it shouldn't. Thread titles, message bylines, and the inbox now all say "Unknown".

## 2026-08-15 — "Roles & permissions" now means your roles, and preferences got a door

- **The notification switch that says "Roles & permissions" now governs role changes that happen to you.** Being assigned or losing a role used to ride the "Group & membership updates" switch — so muting the one you'd never guess silenced the news you were looking for, and ticking "Roles & permissions" didn't bring it back. Personal role news now lives where every member looks first, alongside role-catalogue news. Joins, leaves and removals stay under "Group & membership updates".
- **Notification preferences are now reachable from the app.** The preferences page existed, but no link led to it — you had to know the address. The Notifications page header now carries a **Preferences** link.

## 2026-08-14 — A group page you're not a member of stops looking broken

- **Visiting a group you don't belong to no longer shows error messages.** The Forum, Announcements, and Conversations sections used to greet a non-member with *"…can't be shown right now"* — wording that reads like something is broken, when the platform was simply (and correctly) saying these areas are for members. Each section now says so plainly: *"The forum is for members of this group."* A genuine failure still shows the failure wording — the two states are no longer conflated.

## 2026-08-13 — Becoming a FIM keeps the name you signed up with ([TASK-TRX-01](../docs/planning/backlog/tasks/TASK-TRX-01-transcendence-drops-entered-identity.md) / [TASK-TRX-02](../docs/planning/backlog/tasks/TASK-TRX-02-post-transcendence-read-race-poisons-session.md))

- **The name and email you enter when you become a FIM are now actually yours.** Signing up from a look-around visit used to leave your profile reading **"Mist"** — the anonymous visitor's placeholder — with no email on file, so email invitations addressed to you could never find you. The platform now carries the name and address you entered into your profile (and your personal group) the moment you become a FIM, and the one account this had already happened to has been repaired.
- **The first page after signing up no longer shows broken panels.** Right after becoming a FIM, the groups page could greet you with *"Failed to load your invitations."* and *"Platform announcements can't be shown right now."* — and keep saying it until you signed out. That was the app asking for member things a beat before the platform had finished making you a member, then remembering the refusal. The app now waits until the platform agrees you're a FIM, and starts your member session with a clean slate.

## 2026-08-10 — The role catalogue stops saying "Not found" about templates you can see ([TASK-RDC-03](../docs/planning/backlog/tasks/TASK-RDC-03-refusal-audit-rows-are-dead-code.md))

- *Admin:* **two refusals now tell you why, instead of claiming the template isn't there.** Trying to retire one of the four seeded roles, or to offer a retired template to a group, used to come back as **"Not found"** — about a template sitting in the list you were looking at. They now answer in the platform's own words: *"a system role template cannot be retired"* and *"a retired role template cannot be published"*.
- **Nothing about who can do what changed.** A genuine permission failure still refuses exactly as before, and still declines to confirm whether the template exists — that part was always right, and is deliberately untouched. What changed is that a *rule* refusal stopped borrowing the *permission* refusal's answer.
- This is the same fix already made for delete on 2026-08-10, now carried to the two places it had not reached.

## 2026-08-10 — A mistake in the role catalogue can finally be thrown away ([FEAT-H045](../docs/products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md))

- *Admin:* **a retired template nobody was ever offered can now be deleted for good.** Until now a clone made by mistake was a permanent catalogue entry — retiring it only stopped it being offered. Delete sits inside the Retired section, where the retired things already are, so you don't have to open the template first.
- **It only appears where it can actually work.** Deletion is offered on templates the platform confirms were never offered to any group and have no copies anywhere. Everywhere else there's no button at all — just a plain sentence saying why not ("this role template was offered to groups and cannot be deleted"). A greyed-out button you can't press is still a button.
- **A live template never offers delete.** Retire it first; that's always the first act.
- **The confirmation says what it means before you press it:** that it's permanent and cannot be undone, that this template was never offered to any group and has no copies, and which template you're about to remove, by name. Cancel does nothing at all.
- **If the answer changes while you're looking at it** — someone offers the template between the page loading and your click — you're told in the platform's own words, you stay where you are, and the page refreshes to show how things actually stand now.

## 2026-08-09 — The role catalogue stops being the place everything accumulates ([FEAT-H045](../docs/products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md))

- *Admin:* **the template list now shows what's actually on offer.** Retired templates have moved out of the working list and sit behind a `Retired (3)` disclosure that says how many there are. Retiring already meant "this is no longer offered" — the list was just carrying on as if it didn't know. Nothing is hidden that isn't one click away, and nothing was deleted.
- **Unretire is still right there.** Open the section and the retired templates look exactly as they did, with the same button to put one back on offer. The section says plainly that these aren't offered to any group and that copies already in groups are untouched.
- **When nothing is retired, there's no control at all** — not an empty `Retired (0)` sitting there as a permanent reminder of an empty drawer. And if *everything* is retired, the list says so in words instead of rendering an empty box.

## 2026-08-09 — Two buttons that now tell you the truth before you press them ([FEAT-H044](../docs/products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md))

- *Admin:* **publishing now tells you how many people it's about to notify** — *"This will notify 223 stewards across 425 groups. Those notices cannot be withdrawn."* Publishing sends a notice to every steward it reaches, and unpublishing later takes back the offer but not the notices. You should know that before you click, not after.
- **Removing a role that people still hold no longer lets you click through to an error.** The confirmation always warned you it would fail; now the Remove button is simply disabled, with the reason still shown. Cancel works as always.

## 2026-08-08 — The available-roles section gets out of its own way ([FEAT-H044](../docs/products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md))

Changes from walking yesterday's release end to end.

- **The section now shows only what you can actually do something about.** It used to open with your four built-in roles listed as "copied and up to date" — true, but four rows of nothing-to-do before anything you could act on. Those are gone; the roles you already hold still say where they came from, on the role card itself. When there's nothing new on offer, the section says so plainly.
- **A notice about a role now takes you to the roles.** Clicking "a role is now available to copy into your group" used to drop you at the top of the group page, with the roles panel far below and this section closed. Now it opens the section, scrolls to it, and highlights it for a moment.
- **A resting group no longer half-freezes.** You could still add a role and edit its permissions by hand, but not copy one or take an update — the same permission, two different answers, in one panel. Now it behaves consistently.
- **The confirmation stops saying odd things about nobody.** A role nobody holds used to read "0 members hold this role. They keep the role, and their permissions change with it."
- *Admin:* **you can now publish a role to specific groups**, not only to every group at once — which was the point of all this, and was missing. Search, tick the groups, publish; groups that already have it are shown as such rather than offered again.
- **The bell notices now name the group they're about.** They all used to say "your group", which was no help at all if you steward several — five groups meant five identical notices. Now each one names its own, including the retirement notice, which still says plainly that that group's existing copy is unaffected.

## 2026-08-07 — See what's available to your group, and take an update on your own terms ([FEAT-H044](../docs/products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md))

- **The roles panel now shows what's available to your group.** Open "Show available roles" and you'll see the roles offered to this group — the ones you haven't copied yet, the ones you have and are up to date on, and the ones where the template has moved on since you copied it. It's tucked behind that one click rather than loading with the page, so opening a group is no slower than before.
- **A role that's fallen behind can finally be brought up to date.** Until now, a panel that told you your copy was five versions old gave you nothing to do about it — your only route was deleting the role and starting again, which lost every local change and unbound everyone holding it. Now there's "Review update".
- **Nothing is merged silently, ever.** Reviewing an update shows exactly what it would do: a list of permissions that will be **added** and a list that will be **removed**, in plain names rather than internal codes. It names how many members hold the role and says they keep it while their permissions change with it. You see all of that before you decide, and cancelling does nothing at all.
- **It tells you when an update would undo your own change.** If you deliberately removed a permission from a role and the template still grants it, the update would put it back — so the ceremony says so, in those words. That's the whole point: a change to what people can do should never happen quietly.
- **If the update can't be applied, you're told why, in the platform's own words**, and the review stays open so nothing is lost. A group that's resting shows all of this read-only, like every other action does.
- **Permission names now read as words** throughout the roles panel — "Manage roles" rather than `manage_roles`.
- **Three new notices in the bell**, under a new "Roles & permissions" heading: a role became available to your group, a role you hold has an update, or a template you hold a copy of is no longer offered. Each names which group it's about, and each is news rather than a question — nothing to accept or decline, because the action lives in the roles panel. The retirement notice says plainly that your group's existing copy is unaffected.
- *Admin:* a role template's detail page now states who it's for — published to all groups, to named groups, or not published — and can publish and unpublish. Withdrawing an offer never reaches into a group; copies already adopted keep working, and the page says so where the action is taken. Built-in roles have no reach section at all, and a retired template says why it can't be published.

## 2026-08-07 — Role templates are offered to groups, not to everyone ([FEAT-PC028](../docs/platform/core/features/FEAT-PC028-role-template-publication-scoped-offer-and-diff-on-copy-contracts.md))

- **The add-from-template picker now lists only the roles offered to your group.** Until now every role template on the platform appeared in every group's picker, including one-off clones made for somebody else. A group sees the four built-in roles plus whatever has actually been made available to it.
- **A role that isn't offered can no longer be added**, even by someone who knows its name from elsewhere. The same is true of a template that has been retired — it used to disappear from the picker while still being addable behind it.
- Nothing already in your group changed. Roles your group adopted before this keep working exactly as they were, whether or not the template behind them is still offered.

*(The Steward-facing view of what's available, and the ceremony for taking an update into your group, arrive with FEAT-H044.)*

## 2026-08-06 — Roles say where they came from, and can be put down ([FEAT-H043](../docs/products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md))

- **A role now tells you where it came from.** Where the roles panel used to say only "Template", it now says which version of that template your copy was taken from and when — `Template · v3 · copied 14 May 2026`. If a group is running a copy made long before the template moved on, the panel finally shows it.
- **It admits when it doesn't know.** For roles copied before this was recorded, the version can only be recovered where the answer is unambiguous. Where it isn't, the row says `version unknown` rather than inventing a number. The copied-date is always shown, because that was never in doubt.
- **A role your group adopted can be removed.** Adopting a role by mistake used to be permanent. Now a Steward can remove it — with the ceremony saying, before the click, that removal is permanent for this group and does not touch the template it came from.
- **It tells you what's in the way first.** If members still hold the role, the confirmation says so and names how many, instead of letting you find out by being refused. And a removal that would leave the group with no way to grant a permission like `manage_roles` is refused outright, naming what would be lost — a group can't be locked out from inside.
- **A template can be taken out of circulation.** Admins can retire a role template so it stops being offered — it disappears from the group-creation chooser and the add-from-template picker. Retiring is not deleting: every group already using it keeps its roles, unchanged, and the confirmation says so plainly before the click. Retired templates stay listed and can be offered again at any time.
- **The four built-in roles can't be retired.** Steward, Guide, Member and Observer are the floor every group is built on, so no retire option appears for them at all.

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
