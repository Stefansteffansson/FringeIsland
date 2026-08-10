# FEAT-H045: The catalogue stops at what's live — retired templates collapse, and a mistake can be disposed of

---
id: FEAT-H045
title: Retired role templates collapse behind a disclosure in the admin catalogue, and a never-offered template gains a guarded delete
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

**Follows:** RD-B walk finding **W-10** · **Pairs with:** [FEAT-PC029](../../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md) — consumed API-first; this feature carries **no migration of its own**
**Capability:** Hub §L3 **ADM-17** — *render and manage role templates and the permission catalogue (DeusEx-scope CRUD)*

> **RD-4a was accepted 2026-08-09**, so STORY-2's gate is cleared and both stories are buildable.
> The split still stands and still matters: **STORY-1 has no platform dependency and can ship
> first**, on its own, because the display fix is the larger part of the felt problem. Build it
> without waiting for PC029 to land.

## Problem

Stefan, re-walking the catalogue 2026-08-09:

> *Over time I guess we will have mega many retired roles in this list. Is this reasonable?*

It is not, and today's numbers make the trajectory plain rather than dramatic: **7 templates, 1
retired, 6 ever adopted, 1 ever published.** Small — and monotonically growing, because nothing
ever leaves. The RD-B walk alone added two experiments that are now permanent.

**The catalogue is a working surface being used as an archive.** An admin opening `/admin/roles`
to publish something must read past every retired experiment to find the live set. Retire already
means *"this is no longer offered"* — the list is simply failing to act on what it already knows.

Separately, and much more narrowly: a clone made by mistake and adopted by nobody has no exit at
all (W-10). That is real, but it is the *smaller* half, and conflating the two is how a display
problem turns into a retention argument.

## Solution sketch

**STORY-1 — collapse, don't delete.** Default the template list to **live templates only**, with
retired ones behind a disclosure that states its own count: **`Retired (3)`**. Expanding reveals
them, rendered as they are today, still carrying unretire. Nothing is hidden that cannot be
reached in one click, and nothing is destroyed.

The payload walk says this needs **nothing from the platform**: `admin_get_role_templates` already
returns `retired_at` (verified against the live catalogue, not inferred from the migration). This is
a partition of a list the surface already holds.

**STORY-2 — dispose of the mistake.** On a retired template the server marks `deletable`, offer
**Delete permanently**, behind a ceremony that states the consequence before the click. The Hub
**never computes eligibility** — it renders `deletable` / `undeletable_reason` from PC029. One rule,
enforced server-side, displayed client-side.

## Appetite

**Small.** STORY-1 is a list partition and a disclosure — the smaller of the two by far. STORY-2 is
one ceremony on the idiom RD-A and RD-B already established. If either grows a new component
family, it has escaped.

## Rabbit holes

- **Re-inventing the ceremony.** Retire, clone, apply/rollback, publish and diff-on-copy all already
  state consequences before the click. Reuse that idiom; do not design a new danger dialog.
- **A client-side eligibility guess.** If the Hub ever computes "never published" itself, it will
  drift from the SQL guard and offer a button that refuses. Render the server's answer only.
- **Hiding the empty state.** If every template is retired, the default view is empty — and must say
  so, rather than rendering blank (the W-3 lesson from this same panel family: an empty state
  nobody can reach is a defect, and one that renders as nothing is worse).
- **Counting retired templates client-side when the list is paginated.** If the list ever pages, the
  disclosure's count must come from the same source as the rows, or it will lie.

## No-gos

- No delete offered on any template the server has not marked `deletable` — including "greyed out
  with a tooltip", which is still an affordance for an impossible act.
- No bulk delete, no multi-select.
- No third archive state — `retired_at` is the archive.
- No change to retire / unretire semantics, or to the group-side roles panel.
- No change to what members see. This is a DeusEx-scope surface end to end.

## Stories

### STORY-1: The catalogue shows what is live, and says how much it is not showing

As a **platform admin**, I want retired templates out of my working list but one click away, so
that the catalogue stays the place I publish from rather than the place everything accumulates.

**Acceptance criteria:**
- Given the catalogue contains live and retired templates, when `/admin/roles` loads, then only
  live templates render in the main list.
- Given retired templates exist, when the page renders, then a disclosure reads **`Retired (N)`**
  where N is the exact count of retired templates in the same payload the rows come from.
- Given the disclosure is collapsed, when it is expanded, then the retired templates render with
  their existing affordances — including **unretire** — and the section states plainly that these
  are not offered to any group.
- Given **no** retired templates exist, when the page renders, then the disclosure is **absent
  entirely** — not a `Retired (0)` control.
- Given **every** template is retired, when the page renders, then the live list shows a named
  empty state saying no templates are currently offered, never a blank region.
- Given a template is retired or unretired from the detail view, when the admin returns to the
  list, then it appears under the correct heading without a manual refresh.

### STORY-2: A template nobody ever saw can be removed, and the ceremony says what that means

As a **platform admin**, I want to permanently delete a retired template that was never offered and
never adopted, so that a mistake stops being a permanent catalogue entry.

**Acceptance criteria:**
- Given a template whose payload carries `deletable: true`, when its detail is viewed, then a
  **Delete permanently** affordance is offered.
- Given a template whose payload carries `deletable: false`, when its detail is viewed, then **no
  delete affordance is rendered at all**, and the reason from `undeletable_reason` is shown as
  plain explanatory text — so the admin learns why rather than meeting a dead control.
- Given the delete affordance is activated, when the ceremony opens, then it states, before the
  click: that this is **permanent and cannot be undone**, that the template was **never offered to
  any group and has no copies**, and the template's **name** as confirmation of target.
- Given the ceremony is confirmed, when the delete succeeds, then the admin returns to the
  catalogue, the template is gone from both sections, and a confirmation names what was deleted.
- Given the server refuses (someone published it between render and click), when the refusal
  returns, then the message is surfaced **verbatim**, the admin stays where they are, and the list
  refreshes to show the now-current state — never a silent failure, never a stale button.
- Given the admin cancels, when the ceremony closes, then nothing is called and nothing changes.

### STORY-3: The two halves do not disagree

As a **platform admin**, I want the retired section and the delete affordance to tell one story, so
that I am never offered an act the server will refuse.

**Acceptance criteria:**
- Given a retired template is `deletable`, when it renders inside the retired disclosure, then its
  delete affordance is reachable there without opening the detail view first — disposal lives where
  the disposed-of things are.
- Given a live (non-retired) template, when it renders, then no delete affordance appears anywhere,
  regardless of its publication or adoption state — retire is always the first act.

## Platform dependencies

[FEAT-PC029](../../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md) — `deletable` / `undeletable_reason` on `admin_get_role_templates` (STORY-2, STORY-3) and
`admin_delete_role_template` (STORY-2). **STORY-1 has no platform dependency**: `retired_at` is
already served.

**Payload walk (traced at spec time, pre-`4-ready`):**

| Rendered field | Server key | Status |
|---|---|---|
| live / retired partition | `retired_at` | **already served** — verified live |
| `Retired (N)` count | derived from the same rows | no new key |
| delete affordance shown | `deletable` | **PC029 STORY-1 — new** |
| reason text when hidden | `undeletable_reason` | **PC029 STORY-1 — new** |
| ceremony's target name | `name` | already served |
| refusal copy | RPC error | PC029 STORY-2 |

No field renders without a named key. The one quote-bearing AC (`Retired (N)`) is Hub-authored copy,
not server-authored, so it needs no migration-literal check — unlike `undeletable_reason`, which is
server-authored and **is** checked against the migration's literal on PC029's side.

## Cross-product impact

None. `/admin/roles` is Hub-only; the Gimbal has no admin catalogue and no studio surface reads role
templates.

## Vertical impact

- **Privacy/GDPR:** None. No FIM data is rendered, collected, or removed; templates are platform
  content and the delete removes no member-owned rows.
- **Notifications:** None. STORY-1 changes display only. STORY-2's deletions are, by PC029's guard,
  only ever templates no Steward was ever told about — so there is nobody to notify.
- **Administration:** The whole feature is DeusEx-scope. This closes the lifecycle-management gap
  W-10 named on the admin catalogue.
- **Observability:** The delete is audited server-side (PC029 STORY-3). Refusals surface verbatim
  and are never swallowed. No client-side audit.
- **Transactions:** None.
- **Extensibility:** No new types, enums, or permission scopes in the Hub. `undeletable_reason` is
  rendered as **text**, never switched on — so a new server reason needs no Hub change, which is the
  point of it being an open code.

## Implementation notes

**STORY-1 is built and shipped (2026-08-09, [TASK-RDC-01](../../../planning/backlog/tasks/TASK-RDC-01-h045-story1-retired-collapse.md)). STORY-2 and STORY-3 are NOT built** — both consume `deletable` / `undeletable_reason` from FEAT-PC029, which has not landed. The feature is `5-in-cycle`, not `6-done`, and stays there until PC029 ships and its two halves are built.

**What shipped.** `AdminRolesView` partitions `templates` on `retired_at` — live rows in the working list, retired ones behind a `Retired (N)` disclosure that reuses the H044 `AvailableRolesSection` idiom (button + `aria-expanded` + conditional render), as the rabbit hole instructed. One row renderer serves both sections; a second would drift. The count and the rows come from the same array, so the disclosure cannot lie. No migration, no API change, no new component family — the appetite held.

**Red-first at the unit tier**, 6 new cases seen failing before any implementation (partition, exact count, reveal-with-unretire, absent-when-zero, named empty state, cross-section move on a fresh read, plus axe collapsed *and* expanded). Unit tier green at **1420/1420**.

**Two sibling unit cases were adapted, and both are labelled in place as adaptations rather than silently rewritten** — `offers unretire on a retired template` and `retires on confirm and repaints from a fresh read`. Both addressed a retired row that now starts collapsed. The second is the one worth naming: its original intent — *"the row REMAINS listed, marked — retirement is not a disappearance"* — is exactly what STORY-1 changes the *reach* of, not the truth of. Its assertion was kept and extended (the disclosure must appear **and** the row must be revealed under it, still badged), never dropped.

**PREMISE CORRECTION — the last acceptance criterion.** STORY-1's final AC says *"a template is retired or unretired **from the detail view**"*. **The detail view carries no retire affordance.** Retire/unretire live on the list; only the route `/api/admin/roles/[id]/retire` exists. So that AC's stated trigger is not a user action on today's surface, and building one would be new scope this story did not ask for. What the criterion protects is the no-stale-list guarantee (the J-D lesson), and *that* is pinned: an E2E walks list → detail client-side, the state changes underneath via the same endpoint the detail view would call, and the return is a **client-side `goBack()`** — never `page.goto`, which resets module state and would mask the staleness the criterion exists to catch. **If a detail-view retire button is ever added, this AC should be re-walked as written.**

**Honest labelling:** that E2E is **test-after** — the partition it exercises was implemented under the unit tier's red-first work, and the repaint-on-return behaviour it pins is pre-existing. It passed on first run. It is not vacuous: `retired-templates-toggle` did not exist at head, so it would have failed against the pre-change component.

**Gates:** unit 1420/1420 · `admin-roles.spec` 12/12 · eslint 0 errors (3 warnings, all pre-existing in untouched files — found, not caused) · `next build` clean.

### STORY-2 + STORY-3 — built 2026-08-10 (TASK-RDC-04), one AC blocked on a schema gate

Built against PC029's applied contract. The Hub **renders** `deletable` / `undeletable_reason`
and never derives them; where deletion is impossible it prints the reason as text rather than a
disabled control. Disposal is reachable **inside the retired fold** (STORY-3) as well as on the
detail view (STORY-2), driven by one ceremony carrying the same copy in both places.

**The detail view gets the keys by BFF composition, not a new read.** `admin_get_role_template_detail`
does not carry them — PC029 widened the *list* read. The detail route already composes the detail
read with the list read to carry blast-radius facts, so eligibility rides the same path. That is
the Hub *relaying the server's answer*, not computing it — the rabbit hole forbids the second, not
the first. Defaults are the safe ones: an absent key means **no delete offered**.

**Red-first at the unit tier**, 12 cases. Unit tier **1433/1433**.

**One cell passed on first run and is labelled, not dressed up:** *"a LIVE template never offers
delete anywhere"* is a **negative** assertion — trivially true before any affordance existed. It
became load-bearing the moment delete shipped, and it is what would catch a delete offered on a
live row.

**One sibling test file adapted, labelled in place:** `role-template-reach-section.test.tsx` needed
a `next/navigation` mock, because the detail component now calls `useRouter()` — a successful delete
must return the admin to the catalogue. Test infrastructure only; no assertion changed.

**`next build` caught what no test could.** The catalogue reads `?deleted=` to name what was
removed, and `useSearchParams()` opts a client component out of static prerendering unless it sits
under a `<Suspense>` boundary — the export failed on `/admin/roles`. Fixed at the page with a
boundary whose fallback is the same B6 skeleton the view paints. `/admin/roles` remains static.

> ### THE VERBATIM-REFUSAL AC — found broken, corrected, and now proven at the route
>
> *"Given the server refuses … then the message is surfaced **verbatim**"* was **unreachable
> against the first applied contract**. `admin_delete_role_template` shipped raising its guard
> refusals with `42501`, and the BFF lib maps 42501 to "not authorised", collapsing it to an
> existence-hiding **404 Not found** with the reason discarded. So *"this role template was
> offered to groups"* reached the admin as *"Not found"*.
>
> 42501 is *insufficient_privilege*; a guard refusal is not a privilege failure. Corrective
> migration `20260810120000` (**applied 2026-08-10** on a named approval) moves guard refusals to
> **P0001 → 409, verbatim**, leaving 42501 to the non-admin gate where the 404 is correct. It also
> removed the dead refusal-audit INSERT rather than leaving a line that reads as auditing but
> audits nothing ([TASK-RDC-03](../../../planning/backlog/tasks/TASK-RDC-03-refusal-audit-rows-are-dead-code.md)).
>
> **Why it had hidden:** the integration suite calls the RPC *directly*, so it stayed green while
> the BFF path was broken. Only a cell going through the **route** could catch it. That cell now
> exists (`admin-roles.spec`: *"an offered-then-withdrawn template refuses VERBATIM, not as Not
> found"*) and asserts **409** plus the exact literal — it would have failed against the
> pre-corrective contract with a 404.
>
> Found by building the consumer, which is exactly where a contract walk earns its keep — the
> third premise in this feature pair to fail that way, and the second to be caught by a test
> rather than by review.

## Performance budget

- **First-paint class:** **B2 (cold nav)** and **B3 (warm nav)** on `/admin/roles`. Data-boot path is
  unchanged — the same single `admin_get_role_templates` read, widened by two scalar keys per entry,
  with **no additional round-trip**. The retired partition is computed from the payload already in
  hand, so first paint gains no new dependency. This must not regress the page's existing budget;
  measure it in the ADR-U043 pass at the gate.
- **Interaction class:** expanding `Retired (N)` is a pure client-side disclosure over data already
  loaded — well inside **B5 (200 ms)**, and it must not fetch. The delete confirmation is a write:
  show feedback within 100 ms of the confirm click, and keep the control disabled until the call
  settles so it cannot be double-fired.
- **Loading states:** none new for STORY-1 (no new fetch). For the delete, the ceremony's confirm
  shows in-place progress; if it exceeds 3 s that is a defect in the RPC, not a spinner to design
  around (B6).
