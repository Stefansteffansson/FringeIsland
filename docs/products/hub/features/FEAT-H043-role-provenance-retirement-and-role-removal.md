# FEAT-H043: Role provenance, template retirement, and group-side role removal

---
id: FEAT-H043
title: Role provenance on group roles, template retirement in the admin plane, and group-side role removal
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

**Cycle:** RD-A (role distribution, foundation) · **Pairs with:** [FEAT-PC027](../../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md)
**Board:** [role-distribution design note](../../../planning/hub-v2/2026-08-05-role-distribution-design-note.md) — CLOSED
**Substrate evidence:** [RD-A substrate dossier](../../../planning/hub-v2/2026-08-06-rd-a-substrate-dossier.md)

## Problem

Three surfaces are currently unable to tell the truth or take an obvious action.

**The group's roles panel can't say where a role came from.** It renders a "Template" / "Custom" chip (`RolesPanel.tsx:127`) and stops there. Stefan's walk read a v1 copy against a v5 template and the surface offered nothing to explain the difference (WA-8).

**The roles panel offers no way to remove an adopted role.** The delete affordance is gated on `!role.created_from_role_template_id` (`RolesPanel.tsx:146`), so a role the group adopted is permanent — and the contract beneath the button refuses it too (dossier Finding 3, as corrected: one live layer below the surface, not two — the RLS layer was retired at HYG-A).

**The admin roles page can't retire anything.** "Steward clone" — created during the walk — persists platform-wide with live copies and no way to stop offering it. The page has an editor and no off-switch.

## Solution sketch

Three surface changes, all reading contracts FEAT-PC027 provides.

**1. Provenance on the role row.** Where the panel renders "Template" today, render what the copy actually is: its source version and when it was taken. When the version is unknown (an unambiguous backfill wasn't possible), say so plainly rather than inventing one.

**2. Retire / unretire in the admin plane.** `/admin/roles` gains a retire ceremony beside the existing editor, following the admin ConfirmModal shape already used for suspend and Apply: it states the consequence before the click, and it states it accurately — retiring stops the template being offered and changes nothing that already exists. Retired templates stay listed, marked, with unretire available.

**3. Group-side role removal.** The affordance opens for template-derived roles, and the ceremony carries the consequences the contract will enforce: holders must be stripped first, and a removal that would brick the group is refused with the permission named.

Every refusal from PC027 surfaces **verbatim** — the refusal strings are the product copy, per the pattern the admin plane already uses.

## Appetite

One cycle, shared with FEAT-PC027. Surface-side this is one new render on an existing row, one new ceremony on an existing admin page, and the opening of an existing affordance.

## Rabbit holes

- **Building the Steward's available-roles view.** That is RD-B, along with the diff-on-copy ceremony and the publication notices.
- **A bespoke type-to-confirm.** `ConfirmModal` carries no children (ADM-C finding); retire and remove are ordinary confirmations, not type-to-confirm ceremonies.
- **Client-side version inference.** If the version is NULL, it renders unknown. The surface never derives a version the contract declined to assert.

## No-gos

- No render that implies a retired template was deleted, or that an adopted copy changed when its source was retired.
- No optimistic removal — the panel repaints from a fresh read, per the write-through-confirmed-state rule.
- No client cache keyed by nothing (W-9's lesson): any cached template list is user-scoped and invalidated on retire/unretire.

## Stories

### STORY-1: A group role says where it came from

- Given a group role derived from a template with a known version, when the roles panel renders it, then the row shows the source version and the date it was copied, read from `created_from_version_number` and `created_at` on `get_group_roles`.
- **Copy check (quote-bearing AC):** the rendered string is `Template · v{N} · copied {date}` — verified against the render, not against the payload keys. A reviewer comparing this AC to the screen compares that exact string.
- Given a template-derived role whose `created_from_version_number` is NULL (backfill found no unambiguous match), when the row renders, then it reads `Template · version unknown · copied {date}` — never a guessed version, and the copied-date still shows because `created_at` is always honest.
- Given a custom role (no source template), when the row renders, then it reads `Custom` as it does today, with no version or copied-date — a custom role has no provenance to state.
- Given a group role copied from a template that has since been Applied forward, when the row renders, then it shows the version copied, not the catalogue's current version — the row describes this group's copy.

### STORY-2: An admin retires a template and the catalogue stops offering it

- Given an admin on `/admin/roles` viewing a non-system template, when they open the retire ceremony, then the confirmation states that the template will stop being offered and that **existing copies in groups are unaffected**, before the click.
- Given the retire is confirmed, when it completes, then the row remains listed and marked retired, and the list repaints from a fresh read.
- Given a retired template, when an admin opens it, then unretire is available and its confirmation states that the template will be offered again.
- Given a system template, when an admin views it, then no retire affordance renders — the four seeded roles are the floor, and the contract refuses regardless.
- Given a retire that the contract refuses, when the refusal returns, then the panel renders the refusal string verbatim.

### STORY-3: Retired templates disappear from the places roles are offered

- Given a retired template, when a Steward opens the group-creation template chooser, then it is absent.
- Given a retired template, when a Steward opens the roles panel's add-from-template picker, then it is absent.
- Given a group that adopted the template before it was retired, when its roles panel renders, then the adopted role is present and unchanged, still showing its source version and copied-date — retirement reached the offer, not the group.
- Given a template is retired while a Steward has the picker open, when they next read it, then the retired template is gone — the template list is user-scoped and re-read, never served from a stale shared cache.

### STORY-4: A Steward removes a role the group adopted

- Given a template-derived role held by nobody, when a Steward with `manage_roles` views it, then a remove affordance renders — the gate on `created_from_role_template_id` is lifted.
- Given they open the ceremony, when the confirmation renders, then it names the role and states that removal is permanent for this group and does not affect the source template, before the click.
- Given a template-derived role **held by members**, when the Steward opens the ceremony, then it states the holder count and that holders must be removed first — the panel already reads `holder_count` on `get_group_roles`, so the consequence is stated before the click rather than discovered as a refusal after it.
- Given the removal is attempted anyway and the contract refuses (`P0001`, held by members), when the refusal returns, then it renders verbatim and the role stays.
- Given a removal of the group's only definer of a protected permission, when the contract refuses, then the refusal renders verbatim, naming the permission that would be lost. *(Corrected at build from "no holder" to "only definer" — see FEAT-PC027 STORY-4 for why the holder-based phrasing is unreachable under held-first ordering.)*
- Given a successful removal, when it completes, then the panel repaints from a fresh read and the role is gone.
- Given a resting or suspended group, when a Steward views the panel, then removal behaves exactly as every other group-write does under the availability guard — no new branch, no special case.

## Platform dependencies

All four areas come from [FEAT-PC027](../../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md). **Payload walk (traced 2026-08-06, both specs pre-`4-ready`):**

| This spec renders | Traces to |
|---|---|
| source version (STORY-1) | `get_group_roles` → `created_from_version_number` (PC027 STORY-1) |
| copied date (STORY-1) | `get_group_roles` → `created_at` (PC027 STORY-1) |
| Template vs Custom (STORY-1) | `get_group_roles` → `created_from_role_template_id` (already served) |
| holder count in the remove ceremony (STORY-4) | `get_group_roles` → `holder_count` (already served) |
| retired state + unretire (STORY-2) | `admin_get_role_templates` → `retired_at` (PC027 STORY-3) |
| picker absence (STORY-3) | `get_role_templates`, filtered server-side (PC027 STORY-3) |
| every refusal string | PC027 STORY-3 / STORY-4 refusals, rendered verbatim |

No key is rendered that PC027 does not serve; no key PC027 adds is unconsumed.

## Cross-product impact

None. Gimbal has no role-management surface; no studio consumes these reads.

## Vertical impact

- **Administration** — Retire/unretire is an admin ceremony on `/admin/roles`, following the established ConfirmModal shape. Group-side removal is a Steward ceremony inside the group. Both state consequences before the click.
- **Privacy / GDPR** — No FIM data is rendered by any of the three changes. The provenance line is a version integer and a date about a role, not about a person.
- **Notifications** — **None in this feature.** The published / updated / retired notice kinds are RD-B's scope; a retire performed in RD-A is silent by design.
- **Observability** — Every ceremony's outcome, including refusals, is surfaced to the user and recorded server-side by PC027's audit writes. The surface swallows no failure: a refused removal renders its reason rather than reverting silently.
- **Transactions** — None.

## Implementation notes

**Built 2026-08-06, Cycle RD-A, paired with FEAT-PC027. No migration of its own.**

### Red → green evidence

**STORY-1 + STORY-4 (`RolesPanel`)** — red at head **6 failed / 9 passed**: the two copy-check cells found no provenance line, and the opened-affordance cells found no `delete-role-button` on a template-derived row. Green after implementation **15/15**.

**STORY-2 (`AdminRolesView`)** — red at head **5 failed / 9 passed**, all five "retire-button not found". Green **14/14**.

Full unit suite **1311/1311 across 161 suites**, up from the 1300 baseline. Lint 0 errors. `next build` green with `/api/admin/roles/[id]/retire` registered. Route-policy conformance green — `getUser()` on the mutating verbs, no `runtime`/`preferredRegion` exports.

**Three assertions were corrected to the shipped copy rather than the copy bent to the test**, each still asserting the load-bearing consequence: the held-role ceremony reads "held by 1 member" (not "1 holder"); the retire ceremony reads "no longer appear in the group-creation chooser" (not "stop being offered") and "will reappear" (not "offered again"). Recorded because the alternative — quietly rewriting product copy to match a test guess — is how copy drifts.

### STORY-3 needed no surface change, verified rather than assumed

The add-from-template picker's list is composed fresh into the roles-fabric response on every read of `/api/groups/[id]/roles`; no module-level, session, or global cache holds templates anywhere in the Hub. So PC027's server-side `retired_at IS NULL` filter satisfies STORY-3 on its own, and the "never served from a stale shared cache" criterion holds **structurally** — there is no cache to invalidate. Stated here because "we built nothing" and "it works" are only the same sentence when the reason is written down.

### The sweep missed one, and the reason generalises

The full E2E fleet came back **131 passed / 1 failed**, in `announcements-window-reports.spec.ts` — a *forum-post* delete, nothing to do with roles. Control run: passed on `main` in isolation, failed on this branch in isolation. **Caused, not pre-existing** — verified, not assumed, and in the direction that costs the most to get wrong.

The coupling: that step clicked `getByRole('button', { name: /^Delete$/ }).last()` — page-wide, positional. Opening the remove affordance for template-derived roles gave the group page four more buttons labelled "Delete", so `.last()` began resolving to a roles-panel button sitting behind the modal backdrop. Scoped to `confirm-modal-confirm`, which is what the step always meant.

**Why the sibling-assertion sweep didn't catch it.** The sweep greps for assertions naming the objects whose behaviour changes — tables, functions, policies, refusal strings. This assertion names **no object at all**. It names a *button label*, and it depends on *how many* things on the page carry that label — a property no grep for `delete_group_role` or `created_from_role_template_id` could surface. The rule's own wording ("the table, function, trigger, policy, or the user-facing copy it drives") does reach it, but only if "copy" is read to include an affordance's label and not just refusal text.

**The generalisable form: a change that alters how many elements match a generic selector is a sweep target, even when it changes no contract those tests name.** Worth carrying to the retro — the cheap version is to grep the E2E fleet for bare accessible-name selectors whenever a cycle opens or hides an affordance.

### Copy decisions worth keeping

The removal ceremony quotes the substrate's own held-by-members wording, so the pre-click warning and the post-click refusal read as one voice rather than two paraphrases. The retire ceremony names the count of already-adopted roles and says explicitly that they stay as they are — the spec's no-go is a copy implying deletion, and the word "delete" appears nowhere in it (asserted).

## Performance budget

**Budget class:** warm interaction on an existing surface (ADR-U043). No new data-boot path — STORY-1 and STORY-4 read `get_group_roles`, which the roles panel already calls, with two added scalar keys; STORY-2 and STORY-3 read the template lists the pages already read, with one added key and a server-side filter. The ADR-U043 pass runs at the gate regardless, per the standing rule that perf tests are never skipped.

### Discharge at build (2026-08-06) — stated precisely, because a perf claim is easy to overstate

**No first-paint request was added or rerouted, verified rather than asserted:**

- `RolesPanel` gained **no** fetch. `created_from_version_number` and `created_at` ride the fabric read the panel already made — the two keys were added inside `role_fabric_entry`, which `get_group_roles` already composed.
- `AdminRolesView`'s first paint is unchanged: still exactly one composed read, pinned by `toHaveBeenCalledTimes(1)` and re-pinned by the new "does not retire on open" cell, which asserts opening the ceremony issues no request at all.
- The retire/unretire call is a **warm interaction**, not first paint, and its confirm path re-reads exactly once.
- No new fetch plumbing was introduced — in-repo prior art (the composed roles-fabric response, the admin composed read) already carried both payloads.

**Therefore the cycle-level deep-cold spot measurement is not triggered.** That obligation attaches to a cycle that adds or reroutes a request on a user-facing first paint; RD-A does neither.

**What remains owed, and is not claimed here:** the full ADR-U043 pass — deep-cold with ≥20 minutes of enforced idle plus the warm sweep, appended to the [perf ledger](../../../planning/reference/PERF-MEASUREMENT-LEDGER.md). That is an area-gate exercise against production and it was **not run in this cycle**; it stays on the standing owed list alongside AB-6. No cold or warm number is recorded for RD-A because none was measured.
