# RD-B desk walk — the narrative walked against shipped behaviour

**Date:** 2026-08-07 · **Cycle:** RD-B (both halves `6-done`, merged as #453)
**Kind:** the plain-English walkthrough the `feature-development` skill binds at cycle close — written and walked **against the code**, not in a browser. The live walk (Stefan driving) is a separate leg; its script is [`2026-08-07-rd-b-live-walk-script.md`](./2026-08-07-rd-b-live-walk-script.md).

---

## The narrative — what we built, as a Steward would tell it

> A role template I copied a while back has fallen behind. The panel has been telling me
> that for weeks — `Template · v1 · copied 12 Mar` — and there was nothing I could do
> about it short of deleting the role and starting again, which would have unbound
> everyone holding it.
>
> Now there's a section in the roles panel showing what's actually offered to *my* group.
> Some of it I haven't copied yet, some I have and it's current, and some has moved on.
> For the ones that moved on there's a Review update button. It shows me exactly what
> would be added and what would be removed, in plain names, tells me three people hold
> the role and that they keep it while their permissions change, and — the part that
> matters — warns me when the update would put back a permission I deliberately took
> away. I decide. Nothing merges quietly.
>
> And when someone at the platform makes a role available to my group, or retires one I'm
> using, I get told. The retirement notice says my copy still works, which is the
> difference between news and a scare.

That narrative holds against the shipped code. Four findings sit **underneath** it — the
continuity and lifecycle questions the three test tiers did not ask.

---

## W-1 — CRITICAL: the notices land the member somewhere the news isn't

**This is Stefan's own HYG-A complaint, recurring in a new place.**

The three notices route through `notificationTarget()`, which has no entry for the new
kinds and falls back to `` `/groups/${row.group_id}` `` (`hub/lib/notifications/client.ts:139-145`).
So clicking *"The role 'Greeter' is now available to copy into your group"* lands the
member at the **top of the group page**.

The roles panel is the **seventh** section on that page — below the detail panel,
journeys, journey progress, conversations, announcements, and the forum
(`hub/app/groups/[id]/page.tsx:259-294`). And the available-roles section inside it is
**collapsed by default** (by design — the ADR-U043 placement).

So the member is told *"a role is available"*, clicks, and arrives at a long page showing
nothing about roles. They must scroll past six sections and then click a disclosure they
have no reason to suspect exists.

**This is exactly what WS-4 was built to fix for invitations.** At the HYG-A walk Stefan
clicked an invitation notice, landed on `/groups`, and said it was "easy to read as
nothing happened"; N-E answered with `?focus=invitations` plus scroll-into-view and a
brief ring. RD-B's spec asked for the same thing in words — STORY-4: *"and links into
that group's roles panel"* — and the build gave it a link to the group, not to the panel.

**The AC is not met.** The precedent for the fix already exists and is one cycle old.

## W-2 — The section is stricter than the panel it lives in

In a **resting** group a Steward can still Add role, Edit grants, and Delete role — those
affordances gate on `canManage` alone (`RolesPanel.tsx:137, 202, 214`), and the substrate
deliberately permits them, because `assert_group_writable` lets a `rest_group` holder
write and the Steward template grants `rest_group` (the finding from the PC028 build).

But the new available-roles section gates on `groupStatus !== 'active'`
(`RolesPanel.tsx:278`) and withdraws Copy and Review update entirely.

**So the same Steward, in the same panel, on the same group, can rewrite a role's grants
by hand but may not copy one or take an update.** That is incoherent, and it is stricter
than the platform.

The spec asked for read-only *"consistent with every other write affordance under the
availability guard"* — the premise was wrong: the neighbouring write affordances are not
gated. Either they should be, or this one should not. **A decision, not a defect** — but
the two must agree.

## W-3 — The empty state is unreachable, and the section is noisy by default

`get_available_role_templates` returns system templates unconditionally
(`20260807090000:424` — `rt.is_system` OR published), and a fresh group adopts all four
system templates at creation (WA-6). So:

- the list **always** has at least four entries;
- `available-roles-empty` ("Nothing new is offered to this group right now") is
  **effectively dead code** — reachable only if the system templates were retired, which
  the platform refuses;
- expanding the section on a typical group shows **four rows of "Copied and up to
  date"** before anything actionable.

The AC's intent was *"nothing is offered to this group **beyond what it already holds** →
say so plainly"*. The implementation only says that when the list is literally empty, so
the intent is unserved: the honest render for "you already have everything on offer" is
currently four rows of nothing-to-do.

**Not a correctness bug** — every state is truthful. It is a signal-to-noise question,
and it is the first thing a Steward sees when they open the section.

## W-4 — Minor: the holder sentence reads oddly at zero

`AvailableRolesSection.tsx` renders `0 members hold this role. They keep the role, and
their permissions change with it.` for an unheld role. Truthful, and slightly absurd —
"they" refers to nobody. The one-holder case is handled (`1 member holds`); zero is not.

---

## What the desk walk did NOT find

Worth stating, so the walk's silence is not read as absence of checking:

- **The double-adoption ambiguity is unreachable from this surface.** `group_roles` is
  `UNIQUE(group_id, name)` and the offer read resolves `adopted_group_role_id` to the
  *earliest* copy, so a second copy of one template would make the offer entry point at
  the older one. But the Copy button names the role after the template, so a second copy
  collides on the unique constraint and is refused (409, message surfaced verbatim) — and
  once adopted, the entry stops offering Copy at all. It remains reachable via the
  *existing* Add-role form, which lets the Steward type any name. Carried, not raised.
- **Refusal paths behave.** The lockout guard, retired-template and availability refusals
  all surface verbatim with the ceremony open and the panel untouched (unit-covered).
- **The provenance line moves**, in the render and at row level (E2E-covered).
- **Unpublish never reaches into a group** (E2E-covered — the RD-2 claim).

---

## Recommendation

**W-1 is worth fixing before the live walk**, not after: it is a one-cycle-old solved
problem (the WS-4 pattern), the AC plainly asks for it, and walking a notice that lands
nowhere useful will just reproduce a complaint already on record. W-2 and W-3 are
decisions for Stefan and belong *in* the walk. W-4 is a one-line copy fix that can ride
whatever else lands.
