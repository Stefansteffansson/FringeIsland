# Changelog — The Hub

User-visible changes to the Hub (the canvas surface of FringeIsland). The Hub is being rebuilt fresh under `hub/` ([ADR-U032](../docs/architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)); entries below track the Phase-3 rebuild. Each entry links the feature spec, which carries the full implementation notes.

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
