# FEAT-H045: The catalogue stops at what's live — retired templates collapse, and a mistake can be disposed of

---
id: FEAT-H045
title: Retired role templates collapse behind a disclosure in the admin catalogue, and a never-offered template gains a guarded delete
owner: hub
consumers: [hub]
wave: ferd
maturity: 4-ready
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
