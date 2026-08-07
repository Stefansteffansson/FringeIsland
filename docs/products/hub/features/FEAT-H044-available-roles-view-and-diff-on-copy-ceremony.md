# FEAT-H044: The Steward's available-roles view, the diff-on-copy ceremony, and the admin publish surface

---
id: FEAT-H044
title: Available-roles view, diff-on-copy ceremony, admin publish surface, and the three passive distribution notices
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

**Cycle:** RD-B (role distribution, distribution) · **Pairs with:** [FEAT-PC028](../../../platform/core/features/FEAT-PC028-role-template-publication-scoped-offer-and-diff-on-copy-contracts.md)
**Board:** [role-distribution design note](../../../planning/hub-v2/2026-08-05-role-distribution-design-note.md) — CLOSED
**Substrate evidence:** [RD-B substrate dossier](../../../planning/hub-v2/2026-08-06-rd-b-substrate-dossier.md); decomposition board RDB-1..RDB-7 settled all-as-recommended, 2026-08-06.
**Builds on:** [FEAT-H043](./FEAT-H043-role-provenance-retirement-and-role-removal.md) (RD-A) — the provenance line this feature gives somewhere to go.

## Problem

RD-A taught three surfaces to tell the truth. It gave none of them an action.

**The roles panel states a divergence it cannot resolve.** `RolesPanel.tsx:21-26` now renders `Template · v1 · copied 12 Mar` while the catalogue serves v6. The Steward reads that they are five versions behind and finds no button. Their only route forward is delete-and-re-adopt, which loses every local edit and unbinds every holder.

**The template picker offers the whole platform.** `RolesPanel.tsx:301-303, :357` fills its dropdown from `get_role_templates()` — the entire non-retired catalogue, identical in every group on the platform. A clone made for one pilot group appears in everyone's picker, because the Hub has no notion of a role being *for* anyone.

**The admin has no way to say who a clone is for.** `AdminRoleTemplateDetail.tsx` can clone, version, apply, and (since RD-A) retire. It cannot express reach, because reach did not exist.

**And nothing is ever announced.** A retire performed today is silent: the Steward whose group holds a copy of a template that just stopped being offered finds out by noticing.

## Solution sketch

Four surfaces, one new panel, no new framework.

**1. The available-roles view.** A section in the group's roles panel listing what is offered **to this group** — one read of `get_available_role_templates(group_id)`, which already carries adoption state, so each entry renders in one of three states without a second call: *not adopted* (offer Copy), *adopted and current* (state it, offer nothing), *adopted and behind* (offer Review update). It loads **behind an affordance**, not on the group-detail first paint — the ADR-U043 placement FEAT-PC028's performance budget is drawn against.

**2. The diff-on-copy ceremony (RD-3).** Reviewing an update opens a confirmation stating **added** and **removed** as two explicit lists, with the version movement named, and the consequence stated before the click. It reuses the admin Apply ceremony's shape rather than inventing one. The Steward confirms; nothing is merged silently, ever.

**3. The admin publish surface.** `AdminRoleTemplateDetail.tsx` gains a reach section: publish platform-wide, publish to named groups, unpublish, and a plain statement of current reach.

**4. Three passive bell renders.** Published / updated / retired, each a sentence and a link into the group's roles panel — news, not an ask (RD-7). The bell gains **no** new answerable affordance; `dispatch_segment` is NULL server-side, so the existing passive render path already handles them and the work is copy plus routing.

## Appetite

One cycle, paired. The panel and the ceremony are the substance; the admin surface is a form over two contracts and the bell renders are copy.

## Rabbit holes

- **A diff viewer.** Two lists — added, removed — with permission display names. Not a tree, not a three-way merge, not per-permission opt-in. Per-permission choice would re-create silent-merge's ambiguity one row at a time; the ceremony is take-it-or-leave-it by design.
- **Rebuilding the picker.** The existing template dropdown stays exactly where it is; only its source read becomes group-scoped.
- **Making the available-roles view a marketplace.** It lists what is offered to this group. No search, no categories, no ratings.
- **Optimistic apply.** The refusals (retired template, lockout guard, resting group) are real and server-side; the ceremony waits for the contract and surfaces its reason verbatim.

## No-gos

- No client-side scope or retirement filtering. Both are server-side in `get_available_role_templates`; the Hub renders what it is given (the RD-A STORY-3 discipline — *"every Surface inherits the filter by calling the contract"*).
- No answerable affordance in the bell for these three kinds (RD-7).
- No silent apply. Every version copy passes the ceremony (RD-3).
- No "Update all" bulk action. Each role is confirmed on its own diff.

## Payload walk

Run against FEAT-PC028's proposed payloads before either spec went `4-ready`. Every field a story renders traces to a named key; every proposed key traces to a consumer. **Including keys this surface consumes from other features' payloads**, per the J-D rider.

| Rendered here | Key | Served by |
|---|---|---|
| Offered template name / description | `name`, `description` | `get_available_role_templates` |
| "Copy" vs "Update available" vs "Current" state | `adopted_group_role_id`, `adopted_version_number`, `current_version_number` | `get_available_role_templates` |
| "version unknown" on an un-stamped copy | `adopted_version_number` = null | `get_available_role_templates` (RD-10) |
| Existing role's provenance line | `created_from_role_template_id`, `created_from_version_number`, `created_at` | `role_fabric_entry` — **FEAT-PC027's payload, unchanged**; this feature adds no key to the fabric read |
| Diff added / removed lists | `added[]`, `removed[]` (permission display names) | `get_role_copy_diff` |
| "v1 → v3" in the ceremony header | `from_version`, `to_version` | `get_role_copy_diff` |
| Current reach on the admin surface | publication rows: `group_id` (null = platform-wide), `published_at` | `admin_get_role_template_detail` — **widened by PC028** |
| Refusal text on any failed act | the contract's own message | all write contracts, surfaced verbatim |

**Two findings from the walk, both fixed in PC028 before `4-ready`:**

1. `get_available_role_templates` originally returned only `{id, name, description}` — `get_role_templates`' shape. The three-state render needs adoption state, and without it the panel would have needed a second read per entry. The three adoption keys were added to PC028 STORY-2.
2. The admin reach display had **no server key at all** — `admin_get_role_template_detail` knows nothing about publications. PC028 widens it rather than adding a fourth read. This is the `get_journey_detail` lesson: a surface reading from a *sibling* feature's payload is where the walk earns its keep.

**Copy check** (the N-E rider — the walk traces keys, it does not see rendered copy): STORY-2 and STORY-3 below quote user-facing strings. Each is stated as the string the surface renders, not as the key that feeds it, and each is pinned by its own assertion.

## Stories

### STORY-1: A Steward sees what is available to their group

- Given a Steward opens the roles panel and expands the available-roles section, when it loads, then it lists the templates offered to **this** group and nothing else — a template published only to another group is absent.
- Given a template published platform-wide, when any Steward views the section, then it is present.
- Given the group has adopted nothing yet, when the section loads, then each entry offers **Copy**.
- Given the group has adopted a template and is on the version the catalogue currently serves, when the section loads, then the entry states it is current and offers no action.
- Given the group has adopted a template and the catalogue has since moved on, when the section loads, then the entry offers **Review update** and names the version movement.
- Given a copy whose provenance is honestly unknown, when the entry renders, then it reads `version unknown` and still offers **Review update** — the diff is computable from grants even when the version label is not (PC028 STORY-4).
- Given a member **without** `manage_roles`, when they open the roles panel, then the available-roles section is not shown at all — it offers acts they cannot perform.
- Given a resting or suspended group, when a Steward opens the section, then it renders read-only, consistent with every other write affordance under the availability guard.
- Given nothing is offered to this group beyond what it already holds, when the section loads, then it states so plainly rather than rendering an empty box.

### STORY-2: Copying an update shows the diff and states the consequence before the click

- Given a Steward chooses **Review update** on an adopted role, when the ceremony opens, then it shows two labelled lists — permissions that **will be added** and permissions that **will be removed** — using permission display names, not internal keys.
- Given the Steward previously revoked a permission the template still grants, when the ceremony opens, then that permission appears under **will be added**, and the ceremony says so in words: *"This will restore permissions you removed from this role."* **This sentence is the whole point of RD-3** — it is the moment a silent merge would have escalated permissions invisibly, made visible and refusable.
- Given the Steward previously added a permission the template does not grant, when the ceremony opens, then it appears under **will be removed**, with the matching statement that applying takes it away.
- Given members currently hold the role, when the ceremony opens, then it names how many, and states that they keep the role and their permissions change with it — the consequence stated before the click, not discovered after.
- Given the diff is empty, when Review update is chosen, then the ceremony states there is nothing to apply and offers only Close. (Reachable as a race: the catalogue can move between the panel read and the ceremony open.)
- Given the Steward confirms, when the apply succeeds, then the panel refreshes and the role's provenance line reads the new version and today's date — the RD-A render, now moving.
- Given the Steward confirms and the contract **refuses** (lockout guard, retired template, resting group), when the refusal returns, then its reason is surfaced verbatim, the ceremony stays open, and nothing in the panel changes.
- Given the Steward cancels, when the ceremony closes, then no contract call was made.

### STORY-3: An admin says who a template is for

- Given an admin opens a non-system role template's detail, when it loads, then a reach section states the current reach in words — *"Published to all groups"*, *"Published to 3 groups"*, or *"Not published"* — with the named groups listed when the reach is targeted.
- Given an admin publishes platform-wide, when it completes, then the reach section states so and the action offered becomes Unpublish.
- Given an admin publishes to named groups, when it completes, then each appears in the reach list with its publication date.
- Given an admin unpublishes a group, when it completes, then that group is removed from the reach list and the template disappears from that group's available-roles section on next load. **Copies already adopted are untouched and still work** — unpublish withdraws an offer, it never reaches into a group (RD-2). The surface states this where the action is taken.
- Given a **retired** template, when its detail loads, then the publish action is unavailable and the surface says why — the catalogue has stopped offering it.
- Given a **system** template, when its detail loads, then no reach section is shown: system roles are the floor every group is built on and are not distributed.
- Given a publish or unpublish that fails, when the refusal returns, then it is surfaced verbatim and the reach section is unchanged.

### STORY-4: The three notices read as news

- Given a template is published to a Steward's group, when they open the bell, then a notice states which template became available in which group, and links into that group's roles panel.
- Given a template a group has adopted gets a new default version, when the Steward opens the bell, then a notice states that an update is available for the named role in the named group, and links to the same place.
- Given a template a group has adopted is retired, when the Steward opens the bell, then a notice states the template is no longer offered **and that the group's existing copy is unaffected** — the sentence that stops the notice from reading as a loss.
- Given any of the three, when it renders, then it carries **no accept/decline affordance** — `dispatch_segment` is NULL, so it takes the existing passive render path, and the act happens in the roles panel (RD-7). Contrast N-E, whose invitation was genuinely answerable in place.
- Given a member who has muted the `roles` category, when any of the three would be delivered, then it is not — the existing preference gate applies unchanged, and the category is separate from `platform` precisely so this choice is available without also muting admin announcements (RDB-3).
- Given a member holding `manage_roles` in two affected groups, when both notices arrive, then each names its own group — the recipient must not have to guess which group a notice is about.

## Platform dependencies

- **FEAT-PC028** — every contract this feature calls: `get_available_role_templates`, `get_role_copy_diff`, `apply_role_template_update`, `admin_publish_role_template`, `admin_unpublish_role_template`, the widened `admin_get_role_template_detail`, and the three notification kinds. Hard prerequisite in both directions: the payload walk above shaped PC028's keys.
- **FEAT-PC027 / FEAT-H043** (RD-A) — the provenance line this feature makes actionable, and `role_fabric_entry`'s existing keys, consumed unchanged.
- **The BFF wrapper** — `hub/lib/groups/queries.ts:239-244` currently wraps the zero-arg `get_role_templates()`. That contract is **dropped** by PC028 (RDB-1), so this wrapper moves to the scoped read in the same change; it is the single call site.

## Cross-product impact

None. Gimbal has no role-management surface. No studio consumes these reads.

## Vertical impact

- **Administration** — The publish surface is an admin plane addition on an existing detail page, gated by the same platform-admin check as every sibling action; refusals surface verbatim rather than as generic errors. The reach statement is the admin's read-back that a distribution act landed.
- **Privacy / GDPR** — No FIM data is rendered by any new surface. The admin reach list names groups, not members. The available-roles view and the diff show templates and permission names only. No new export path is created; the notices are already covered by the notifications export.
- **Notifications** — Three new passive renders through the existing bell, no new answerable affordance, no new preference surface beyond the `roles` category appearing in the existing preference list.
- **Observability** — Every write from these surfaces goes through a contract that audit-logs; the Hub adds no client-side telemetry. Failed applies leave the ceremony open with the server's reason, so a refusal is visible to the user and recorded server-side rather than swallowed.
- **Transactions** — None.

## Performance budget

The available-roles section loads **behind an affordance**, not on the group-detail first paint. This is a deliberate placement decision, not an implementation detail: it keeps `get_available_role_templates` off the composed first read and therefore keeps the ADR-U043 cycle-level deep-cold spot measurement untriggered. **If the section is later promoted to first paint, that measurement is owed.**

The section is one read; the three-state render must not fan out to a per-entry call (the payload walk exists to prevent exactly that). The diff is read on ceremony open, not for every listed entry.

## Implementation notes (2026-08-07 — all four stories `6-done`)

**Where the code went.** `hub/components/groups/AvailableRolesSection.tsx` (the section
and the ceremony) · `hub/lib/groups/available-roles.ts` (the three-state logic, isolated
from JSX so it could be pinned exhaustively) · `hub/lib/groups/permission-label.ts` (the
display-name humaniser) · `hub/lib/admin/role-template-reach.ts` (the reach statement) ·
the reach section inside `AdminRoleTemplateDetail.tsx` · three new BFF routes
(`roles/[roleId]/diff`, `roles/[roleId]/apply-update`, `admin/roles/[id]/publish`) ·
`NotificationItem.tsx`'s `roles` icon entry.

**Red → green, honestly.** Unit tiers driven red-first: `permission-label` (7), the
three-state logic (10), the section + ceremony (18), the reach statement + section (19),
and the `ConfirmModal` `hideConfirm` widening (2 of 3 red — the third pinned the existing
default). **Labelled test-after / green-before-and-after, not TDD:** the three
notification copy cells and the two-group cell (the passive render path already existed —
regression pins on shipped behaviour); the notification icon cell (written after the
entry, then **proven non-vacuous by control** — removing the entry fails it with the bell
fallback's class, which is exactly the silent-fallback mode that let the gap ship); the
system-template reach cell (vacuous the day it was written, load-bearing once the section
landed); and integration C6.

**Three things the build corrected in the spec.**

1. **STORY-3 had no server key.** The payload walk's finding 2 was never carried into
   PC028's migration — see PC028 STORY-8. Closed by migration `20260807140000`, applied
   the same day on the named approval; the live catalogue was re-verified afterwards
   rather than trusted (both keys present, signature byte-identical, ACL preserved).
2. **"Permission display names" had no source.** `public.permissions` has no display-name
   column and `get_role_copy_diff` returns `p.name`. Closed Surface-side as presentation
   mapping (ADR-U038), with a *total* humaniser rather than a lookup table.
3. **The BFF wrapper was already repointed** by the platform half — the dropped zero-arg
   contract would have broken the Hub otherwise. Nothing was owed here.

**A nuance the payload cannot resolve, recorded not hidden.** The RD-3 restore sentence
renders whenever `added` is non-empty. `added` means *in the template, not in the group's
current set* — which covers both "the Steward revoked it" and "the template gained it in a
later version". The substrate cannot distinguish the two without per-grant history on the
group role, and the walk's payload offers only `added[]`. The sentence is therefore
slightly over-broad in the second case. Cheap to fix only by widening the contract; left
as specified.

**The E2E journey gate** (`tests/e2e/role-distribution.spec.ts`) walks the whole arc:
offered → copied (provenance reads `v1`) → catalogue moves → panel says `v1 → v2` →
ceremony shows the diff in **display names** → confirm → **provenance moves to `v2`**,
asserted both in the render and at row level (`created_from_version_number`) → offer
withdrawn → **the adopted copy survives untouched** (RD-2). Labelled **test-after** and
proven non-vacuous by control: neutralising the section fails it at the toggle. That
control also showed the permission-gated cell is `toHaveCount(0)`-shaped and therefore
meaningless alone — the positive cell in the same file is what makes it bite.

**ADR-U043: not triggered, and by a stronger route than planned.** The spec drew its
budget against deferring a new read behind an affordance. In fact the scoped catalogue
**already rides the roles payload**, so the section consumes a read that has already
happened and costs *zero* requests to open — asserted by a cell. No request was added to
any first paint. If the section is ever given its own fetch, the deep-cold spot
measurement becomes owed.

## E2E sweep obligation

Named at spec time, from the RD-A miss. RD-A's sibling sweep grepped for assertions naming changed objects and missed a forum-post failure whose selector named **no object at all** — `getByRole('button', {name: /^Delete$/}).last()`, page-wide and positional, broken by a newly opened affordance adding buttons with that label.

This feature adds **Copy**, **Review update**, **Confirm**, **Publish**, and **Unpublish** affordances to pages that already carry buttons. Before the build closes, the E2E fleet is grepped for **bare accessible-name selectors** — `getByRole('button', {name: …})` without a scoping container, and any `.first()` / `.last()` positional resolution — on every page these surfaces touch, in addition to the normal object-named sweep.

**DISCHARGED 2026-08-07 — clean, with one latent trap recorded.** Swept `roles.spec.ts`,
`admin-roles.spec.ts`, the notification specs, and every spec touching `/groups/[id]`.
No bare selector and no positional resolution matches a new affordance: the page-level
names in play are `/^create$/i`, `/^save$/i`, `/edit settings/i`, `'Force sign-out'` and
`/remove steward role template from/i`, none of which any new label matches.
`notifications.spec.ts:183`'s `unreadRow.getByRole('button').first()` is safe because the
passive renders add no affordance to a notification row. `admin-roles.spec.ts:305`'s
`getByText('role_template.apply').first()` is safe because the new audit actions are
`role_template.publish` / `.unpublish`, which do not contain that substring.

**The latent trap, recorded because it is luck-adjacent.**
`roles.spec.ts:120` asserts `page.getByTestId('roles-panel').getByText('Steward Role
Template')` — and the available-roles section now lives **inside** `roles-panel`, where
the same template name would appear a second time. It resolves to one element only
because the section is **collapsed by default**. That is by design (the AC requires the
affordance), but it means defaulting the section to expanded would break that spec with a
strict-mode violation rather than a missing element. Whoever changes that default owns
scoping this assertion first.

Permission chips now render display names, so a spec asserting a raw key inside
`roles-panel` would have broken — swept, and none does. `roles.spec.ts:182`'s
`invite_members` assertion is against `my-permissions-panel`, a component this feature
does not touch; `perm-checkbox-*` and `grant-toggle-*` testids are still keyed by the raw
permission name and are unchanged.
