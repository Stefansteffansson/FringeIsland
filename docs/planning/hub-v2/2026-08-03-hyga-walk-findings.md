# HYG-A live-walk findings — 2026-08-03 (Stefan's walk of the two-mode hold family)

**Context:** Stefan walked the freshly-merged Cycle HYG-A build (FEAT-PC023 + FEAT-H038, PR #395) on production. The mechanics held — invitation flow, rest/wake ceremonies (member and admin plane, audit rows verified), the suspended shell, the member-plane no-leak rule. Two findings became **directives** (committed product law, awaiting slotting), plus one polish note. Substrate claims below were verified against the applied migration and live telemetry/audit rows in-session.

---

## WF-1 (DIRECTIVE) — group invitations answer in the bell, like nominations

**The walk:** the invitation notification carried no Accept/Decline; it routed to `/groups`, where the MyInvitations card does the answering. That split is today's design (only stewardship nominations and group-as-group invitations are bell-actionable).

**Stefan's directive:** invited members SHALL be able to accept/decline group invitations directly in the bell dropdown, exactly like stewardship nominations.

**What already exists:** the whole typed-actions framework (FEAT-PD014 + FEAT-H031, ADR-U051) — `action_data` on the list contract, typed response routes, first-answer-wins convergence, two shipped precedents (nomination-response, acting-response).

**Build shape (paired feature, notifications family):**
- Platform (PD): `invitation_received` notifications gain `action_data` (the PD014 dispatch pattern) + a typed response path composing the existing accept/decline contracts, with the N-B convergence discipline for an invitation answered elsewhere or cancelled while the notification stands.
- Hub (H): the bell/inbox renders Accept/Decline for the kind (the H031 renderer pattern); a response re-reads the groups list. MyInvitations on `/groups` stays — two doors, one truth.

**Polish note (independent, small):** today's bell notice lands on `/groups` with nothing anchoring or highlighting the invitation card — easy to read as "nothing happened". Worth fixing even before WF-1 builds (anchor/scroll-to or highlight).

**Routing:** its own small paired cycle (or a rider after ADM-E) — Stefan slots it at the next planning step.

## WF-2 (DIRECTIVE) — admins always have full access to suspended groups

**The walk:** the admin (DeusEx operator account, not a member of the group) opened the suspended group's member-plane URL and got the honest 404 — the member-plane visibility law has no admin arm; admin powers live at `/admin/groups/[id]`, which shows metadata + lifecycle ceremonies but **no content**.

**Stefan's directive:** admins SHALL always have full access to suspended groups — the admin's role is keeping everyone safe; when a group is suspended for wrongdoing/bullying, the admin must be able to step inside, inspect, clean forums, remove members, and so on.

**What the substrate already grants (verified in the applied migration):**
- Every **write** door passes platform admins — `assert_group_writable()` early-returns on `is_platform_admin()`, so moderation writes (e.g. `moderate_forum_post`) work in a held group for admins today.
- The **exits** carry explicit admin arms (`leave_group`, invitation respond, `remove_member`) — an admin can already kick members of a suspended group at the contract level.
- `get_group_detail` already returns admins the **full payload** for a suspended group — but only past the visibility gate, which has **no admin arm** (the 404 above).
- The **content-read quarantines are mixed**: some contract-level checks carry the admin arm; the row-layer RLS quarantines and the conversation-list filters need a door-by-door audit at spec time before any "admins can read everything in a suspended group" claim is made.

**Build shape:**
- Platform (PC023 amendment — schema gate): an admin visibility arm in `get_group_detail`, plus admin arms across the read-quarantine family (contract AND RLS layers), door-by-door.
- Hub (H): the surface half — member-plane affordances key on group permissions, which a non-member admin holds none of, so even with visibility the buttons would not render. Either an is-admin affordance arm on the member-plane surface (moderate/remove render for admins, honestly labelled as admin-plane acts) or a dedicated admin content view under `/admin/groups/[id]`. Design choice at spec time.

**Scoping decision (open — recommendation recorded):** grant the admin arm for **suspended groups only** (option a), not all groups (option b). The stated mandate — rectify wrongdoing — operates under the hard hold, and (a) preserves the "private and absent look identical" guarantee everywhere else: an admin gains sight of exactly the groups the admin plane has already acted on. (b) would need its own privacy decision. Either way the access is purpose-bound and audited (Privacy/GDPR + Administration verticals).

**Routing:** Platform-Ops family — a new row on the completion plan (ADM-G candidate) or folded into the ADM-E/ADM-F board at the next kickoff. Slotting is Stefan's call; the AB-6 audit should not run before this is at least slotted, since it changes the admin plane's claimed capability set.

---

*Filed 2026-08-03 at the walk (session 4's follow-on); bridge: `2026-08-03_04`. The WF-2 substrate verification is recorded above so the future spec's dossier can start from it.*

---

## Walk verdict (2026-08-03, close of walk) — COMPLETE, all four scenarios passed

- **A (Rest/Wake, member plane):** passed — invitation flow, the Rest ceremony, the Resting label, the read-only surface, holder exemption, Wake. (The invitation-UX observation became WF-1.)
- **B (mode choice + the shell, both planes):** passed — admin Rest | Suspend choice, the member's sealed shell, Reactivate; audit rows verified for every ceremony. (The non-member-admin 404 on the member plane is the standing visibility law working; it became WF-2's trigger.)
- **C (in-session suspension):** passed, several rounds — suspend → the wall arrives in-session → the explicit exit → sign-in-as-other lands clean; reactivate restores. The brief groups-flicker before the wall was walked, explained (the confirmed-state-only rule meeting the non-blocking-paint rule — only a suspended member ever sees it, and the substrate refuses their writes throughout), and **left as designed — no directive issued**.
- **D (per-user admin-menu entry):** passed in both directions. One scenario-script correction recorded: the menu label is "Platform admin", not "Administration".

End-state verified in the substrate at close: Gracy active, Walk Test active, no leftover holds; the audit trail carries the complete ceremony history. Directives WF-1 and WF-2 await slotting at the ADM-E kickoff.
