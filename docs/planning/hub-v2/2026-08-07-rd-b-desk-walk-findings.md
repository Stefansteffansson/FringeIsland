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

> **RULED 2026-08-08 (live walk, S6): align to the panel — remove the status gating.** A
> Steward keeps **both** halves in a resting group: editing current roles *and* copying /
> reviewing under available roles. The `readOnly` prop and its "read-only right now"
> notice come out; `canManage` alone gates the affordances, exactly like Add role, Edit
> grants and Delete beside them.
>
> **This amends STORY-1's written AC** (*"Given a resting or suspended group … renders
> read-only"*), which rested on a premise about the panel that was not true. The substrate
> remains the enforcement point and is unchanged: `assert_group_writable` permits a
> `rest_group` holder and refuses everyone else, verbatim, whether or not the button was
> ever offered.
>
> Consequence for the suite: the "renders read-only under the availability guard" unit
> cell inverts — a resting group must now still offer Copy and Review update. A labelled
> adaptation to a ruled behaviour change, not a weakening.

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

> **RULED 2026-08-08 (live walk, S2): actionable only.** Adopted-and-current entries are
> **hidden**. The section lists only what can be copied or updated; when nothing can, it
> says *"Nothing new is offered to this group right now."* — which makes the previously
> unreachable empty state the normal state for a settled group. The reassurance that
> Guide/Member/Observer/Steward are current is not lost: the role cards above already
> carry it in their provenance lines, which is where RD-A put it.
>
> Consequence to carry into the implementation: the "three states" unit cell currently
> asserts a *current* entry renders with no button. That expectation inverts — a current
> entry must now be **absent** — and the E2E's post-copy assertion ("the entry stops
> offering Copy") becomes "the entry disappears". Both are labelled adaptations, not
> weakenings.

## W-5 — CRITICAL, found live at S2: "publish to named groups" was never built

**Found by Stefan on the first click of the reach section, 2026-08-08.** The section
offers **only** "Publish to all groups". There is no group picker, so the targeted
publish — the entire point of RD-B's scoping — is unreachable from the admin plane.

It was named in three places and built in none:

- the spec's solution sketch: *"publish platform-wide, **publish to named groups**, unpublish"*
- STORY-3's AC: *"Given an admin publishes to named groups, when it completes, then each appears in the reach list with its publication date"*
- TASK-RDB-03's AC: *"publish platform-wide / **to named groups** / unpublish"*

Everything below the UI supports it: `admin_publish_role_template(p_role_template_id,
p_group_ids uuid[])`, the BFF route's `group_ids` array, and `publishRoleTemplate()`.
`AdminRoleTemplateDetail.tsx:309-329` renders one button and no picker.

**`FEAT-H044` was marked `6-done` with this AC unbuilt.** Reopened.

### Why three green tiers agreed with each other

This is the finding worth more than the fix:

| Tier | What it proved | The hole it stepped over |
|---|---|---|
| Unit | Named reach **renders** from a fixture payload; platform-wide publish **acts** | Never that an admin can **create** named reach — the read of a state with no door to it |
| Integration (C2) | The **contract** accepts and stores a named-group array | Called the RPC directly; says nothing about the surface |
| E2E | The Steward journey over a group-scoped offer | The fixture **inserted the publication row with the service-role client**, bypassing the admin UI |

**A fixture that inserts the state under test bypasses the door that creates it.** The
E2E's own setup was the disguise: it manufactured exactly the state the missing
affordance was supposed to produce, so the journey passed over a hole in its own floor.

**Generalisable rule for the suite:** when a feature adds a *write* door, at least one
test must reach the state **through that door**. A fixture may set up everything the door
is not responsible for — never the thing it produces. Both prior cycles' fixtures
(`clearPublications`, direct version inserts) are legitimate under that rule; this one
was not.

**Sibling check owed:** RD-B's *unpublish* has the same shape — per-group Unpublish
buttons exist and are driven only from a fixture-created reach. Once the picker lands,
the E2E must create the reach through the UI and remove it through the UI.

## W-8 — CRITICAL, found live at S7: the notices never name their group

**Found by Stefan, 2026-08-08.** A Steward holding `manage_roles` in five groups received
**five identical notices**, all reading:

> *The role "Walk Second" is now available to copy into **your group**.*

Verified at row level: the five rows are genuinely *about* five different groups
(`NB-ctx-ms55e4wo-3`, `GoG-A-1783500843306`, `E2E GF Byalaget…`, …) — the `group_id`
differs on every row. Only the **body** is identical, because the server authors it as
`'…is now available to copy into your group.'` — a possessive, never the group's name.

**All three kinds have it** (`20260807090000`):
- published — *"…into your group."*
- updated — *"…before copying them into your group."*
- retired — *"Your group's existing copy is unaffected."*

**This is STORY-4's AC violated verbatim:**
> *"Given a member holding `manage_roles` in two affected groups, when both notices
> arrive, then each names its own group — the recipient must not have to guess which
> group a notice is about."*

The recipient must guess. With five, they cannot.

Server-authored copy, so the fix is substrate-side (the surface must not re-word it — the
V3 surfaces law): the dispatch bodies interpolate `g.name`. One migration, three literals.

> **RULED 2026-08-08 (live walk, S7): the fan-out is correct; name the group.** One notice
> per group where the recipient holds `manage_roles` is the intended behaviour and stays
> unchanged — *"this is perfectly okay"*. The defect is the body, which must say **which
> group the role is available to copy into**.
>
> Shipping these three literals (`g.name` interpolated, one migration):
>
> | Kind | Body |
> |---|---|
> | `role_template_published` | `The role "X" is now available to copy into <Group>.` |
> | `role_template_updated` | `A newer version of the role "X" is available. Review the changes before copying them into <Group>.` |
> | `role_template_retired` | `The role "X" is no longer offered by the platform. <Group>'s existing copy is unaffected.` |
>
> The retirement sentence keeps its reassurance while gaining the name — the clause that
> stops the notice reading as a loss is preserved word-for-word apart from the possessive.
>
> **Titles stay as they are** (*"New role available"* etc.) — the group belongs in the
> sentence, not repeated in the heading, and the bell renders both.

## The meta-finding: fixture-invented payloads (W-5 and W-8 share one root cause)

Twice in one cycle a unit test passed by asserting a shape **the substrate never
produces**, because the fixture was hand-authored:

| | The fixture invented… | What the substrate actually does |
|---|---|---|
| **W-5** | a `publications` payload with named-group rows | offers no UI door that can create one |
| **W-8** | two notice bodies reading *"…into Willow Circle"* / *"…into Harbour Crew"* | writes *"…into your group"* on every row |

In both cases the test proved the **surface renders a distinction correctly** — and in
both cases the distinction does not exist upstream. Green, and meaningless.

**Why the payload walk did not catch it.** The walk traces *keys*: `group_id` is present,
`template_name` is present, both consumers accounted for. It never asks what the **value**
looks like. The N-E rider added a *copy check* for exactly this blind spot — but the copy
check as practised verified the strings **the component renders in its own test**, not the
strings **the server authors**. For server-authored copy those are different documents,
and only one of them ships.

**Rule earned here:** when copy is server-authored, the copy check reads **the migration's
literal**, never the component's fixture. A component test may prove the surface renders
what it is given; it can never prove the server gives it that.

## W-9 — A guaranteed refusal is still offered as a button (the WA-1 pattern, recurring)

**Found live at the Aftermath, 2026-08-08.** Gracy opened Delete on `Steward Role
Template` (1 holder). The ceremony correctly named the obstacle **before** the click —
*"It is currently held by 1 member — remove the role from all holders first"* — she
confirmed, and the contract refused with *"role is held by members — remove the role from
all holders first"*. The same sentence, twice, with a wasted round-trip between them.

Nothing is broken. Every layer did its job. But `holder_count` rides the fabric and is
fresh, so **the surface knew with certainty that Confirm would fail** and offered it
anyway.

**Stefan already ruled this exact pattern, at the ADM-E walk (WA-1):** guaranteed-no-op
bulk actions **disable**, rather than being offered and then refused. `ConfirmModal`
already carries `confirmDisabled` (added at H041) for precisely this — gate Confirm,
state the reason, leave Cancel live.

Scope note: this is **RD-A (FEAT-H043 STORY-4)** behaviour, not RD-B's. RD-B is what made
it visible, by putting a careful ceremony beside it. Recorded here; routed to RD-A's
owner rather than fixed under this cycle's banner.

**Open question for Stefan, adjacent and not yet ruled:** should Delete be offered at all
on the four seeded-derived roles (Guide / Member / Observer / Steward)? RD-A's principle
is *"an adopted role is the group's own property and the group may put it down"* — but
these four were not adopted by choice; they were instantiated at creation as the floor the
group is built on. The substrate protects against lockout (the only-definer guard and the
last-Steward invariant), so nothing unsafe can happen. It is a question of whether the
affordance should be there, not of whether it is dangerous.

> **RULED 2026-08-09: disable it, state the reason — and leave the built-in roles alone.**
> When a role is held, Confirm is **disabled** with the obstacle stated; Cancel stays
> live. `ConfirmModal.confirmDisabled` already exists for exactly this (added at H041).
> The WA-1 ruling from the ADM-E walk now holds in both places it applies.
>
> The adjacent question was **answered by not extending**: Delete stays offered on the
> four seeded-derived roles. RD-A's principle stands — an adopted role is the group's own
> property, however it arrived — and the substrate already refuses anything unsafe.
>
> **Scope: this is RD-A's fix (FEAT-H043 STORY-4), not RD-B's.** RD-B only made it
> visible by putting a careful ceremony beside a careless one. It lands under H043 so the
> history reads honestly.

## W-10 — A clone can never leave the catalogue (observation, not a defect)

The walk created two clones (`Walk Greeter`, `Walk Second`). Neither can be removed —
`/admin/roles` offers retire, never delete, and that is correct (see RD-4). A clone made
by mistake and adopted by nobody is therefore permanent in the admin catalogue; it can
only be hidden from offers.

That is the deliberate trade — provenance safety over tidiness — and it is the right one.
But the catalogue is now the place where every experiment accumulates forever, and this
walk alone added two. Worth a decision eventually: either a delete restricted to
templates with **zero adoptions ever** (checkable — `group_roles.created_from_role_template_id`
has no rows), or an explicit "this list grows and that is fine" acceptance. Not urgent;
recorded so it is a choice rather than a drift.

**Script correction:** this walk's Aftermath told Stefan to *"unretire and delete the two
clones from `/admin/roles`"*. That instruction is impossible and was written without
checking. Retire is the only disposal.

## W-6 — The publish ceremony does not state its blast radius (the asymmetry)

Surfaced by measuring what S1 actually did. A platform-wide publish dispatches one notice
per (manage_roles holder × group) across **every active engagement group** — 425 groups
today, 427 notices per publish, to 223 recipient personal groups. The publish ceremony
says:

> *"Offers 'X' to every group. Stewards choose whether to copy it — publishing never adds
> a role to any group."*

True, and it says nothing about the notification. **It does not name how many people it
is about to tell, and there is no way to take it back** — unpublish withdraws the offer
but correctly leaves the notices standing, because they record something that was true.

**The asymmetry is the finding.** RD-B's whole discipline is *consequence stated before
the click* — and the Steward's diff ceremony honours it precisely, naming the holder
count and what happens to them. The admin's publish ceremony, whose blast radius is two
orders of magnitude larger and irreversible, states nothing. We held the smaller act to a
higher standard than the larger one.

Measured 2026-08-08: 223 recipients = **4 real accounts** (the walk cast), 95 test
fixtures, 124 orphaned personal groups (`TASK-INT-03`). **No real-user incident** — but
the shape is wrong now and will not stay harmless.

> **RULED 2026-08-09: state the count.** The publish ceremony names how many stewards
> across how many groups it is about to notify, and says the notices cannot be withdrawn
> — the same rule the Steward's diff ceremony already honours with its holder count.
>
> **Cost, surfaced rather than absorbed:** the two numbers are not equally cheap.
> * **Group count** — free. The W-5 picker already loads the engagement-group list.
> * **Recipient count** — needs a **new platform contract**. `admin_get_groups` returns
>   `member_count` / `non_system_member_count`, neither of which is a `manage_roles`-holder
>   count, and nothing in the substrate counts holders across groups. A preview read
>   (`admin_preview_publication_reach` or equivalent) is a migration, and therefore
>   another schema gate.
>
> **Scope ruled 2026-08-09: full version, with the gate.** Built as
> `admin_preview_publication_reach(p_role_template_id, p_group_ids)` — migration
> `20260809100000`, **held at the schema gate**. Both ceremonies (platform-wide and the
> W-5 picker) now state *"This will notify N stewards across M groups. Those notices
> cannot be withdrawn."*
>
> **The correctness risk was named and tested, not commented away.** A preview whose
> predicate drifts from the act it previews is worse than no preview: it states a
> confident number that is wrong. The preview's recipient predicate is a deliberate mirror
> of `admin_publish_role_template`'s, and cell **W6c previews, publishes, then asserts the
> preview equalled the rows actually created** — so editing one predicate without the
> other fails loudly.
>
> A missing preview renders nothing and never blocks the publish: the count is an aid, not
> a gate.
>
> **APPLIED 2026-08-09 — and verifying it caught a defect in my own migration.**
> `20260809100000` granted EXECUTE to `authenticated` but never revoked the grant
> Postgres gives PUBLIC by default on `CREATE FUNCTION`, so **`anon` could execute it** —
> the only one of the eight role-distribution functions that could. The house pattern
> (`20260807090000:987-997`) is a pair and I wrote half of it.
>
> **No data was exposed** — the function is SECURITY DEFINER behind `is_platform_admin()`,
> so an anonymous caller reached the gate and got 42501 (W6f pins that and passed
> throughout). Defence in depth restored, not a leak closed. Recorded as a real miss
> anyway: *"the gate caught it"* is no reason to leave an unintended grant standing, and
> the next function written by copying that one would inherit the omission.
>
> Corrected by `20260809140000`; **W6g now pins the posture directly** so it cannot recur
> silently. All eight functions verified identical afterwards: anon denied,
> authenticated and service_role allowed. **This is the third time this cycle that
> checking the live catalogue after an apply found something the migration did not say**
> — the PC028 widening, the notice literals, and now a grant.

## W-7 — Integration cell C3 fans out to the whole group table on a shared DB

`C3: platform-wide reach is one row with a NULL group_id` calls
`admin_publish_role_template(..., p_group_ids => null)` against the shared dev/production
DB. Each run writes **427 notifications** (`RDB Distributable`, 2026-08-07 16:15:34 — one
timestamp, one run).

The cell needs a platform-wide row to test the partial unique index and the sort order —
that part is legitimate. What is not legitimate is that a routine suite run scales its
write volume with the **real group table** and leaves the rows behind. `TASK-INT-03`
already records this DB as notification-heavy from fixture leakage; this adds to it every
run.

Fix options, cheapest first: have the cell delete its own dispatched notices in the same
`clearPublications` teardown; or assert the publication row without the dispatch by
publishing platform-wide only where the fan-out is bounded. **The cell must keep proving
the NULL-row uniqueness** — it is the reason the partial unique index exists.

> **PROMOTED 2026-08-09 — this is not tidiness. It was breaking the suite.**
>
> After the W-8 apply, the full integration run came back **1109/1112**: three assertion
> failures across two `tests/integration/notifications` suites. The measurement matrix:
>
> | Run | Result |
> |---|---|
> | `tests/integration/notifications` **alone** | **120/120 clean** |
> | each failing suite alone | **51/51 clean** |
> | `groups` + `notifications` | 1 failure — **a different suite again** |
> | full fleet | 3 failures, two suites |
> | `groups` + `notifications`, **after the teardown below** | **507/507 clean** |
>
> The victim **moves between runs** and every suite is green alone, which is the profile
> of a volume- or timing-sensitive emission assertion rather than a broken test. The
> failing cells are all PAIR-shaped — *"X emits and Y does not"* — i.e. exactly the
> assertions a flood of concurrent notification inserts and their hint triggers would
> disturb.
>
> **Attribution, stated honestly: partly mine.** The RD-B suite's notification churn grew
> this session — C3's platform-wide publish (~427 rows) *plus* the four new W8 cells
> publishing, retiring and dispatching. The clean full run this morning had C3 but not the
> W8 cells. So I cannot fence this as "found, not caused"; the honest statement is that I
> added to a load the directory was already carrying badly.
>
> **Fix applied:** the suite now deletes its own dispatched notices in `afterAll`. One
> clean run each way is **supporting evidence, not proof** — the profile is probabilistic
> (`TASK-INT-04` measured a sibling at 2 failures in 5), so this wants watching across
> several fleets before anyone calls it closed.
>
> **Still open underneath it:** the emission assertions in that directory are sensitive to
> notification volume at all. Cleaning up one suite's rows treats this instance; it does
> not make those cells robust. Worth its own look.

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
