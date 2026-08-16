# FEAT-H046: Wielded content affordances — the "use" half of acting

---
id: FEAT-H046
title: Wielded content affordances — the hat's content powers open real doors (forum first), and hat lifecycle stays fresh through delivery
owner: hub
consumers: []
wave: unassigned
maturity: 6-done
requires-equipment: none
---

## Problem

FEAT-H018 STORY-1's intent line — see **and use** its powers — outran its shipped scope ("pure substitution rendered honestly"). A wielder flipping the selector sees `post_forum_messages`/`view_forum` in the panel and can open nothing (walk 2026-08-14; [TASK-ACT-01](../../../planning/backlog/tasks/TASK-ACT-01-acting-does-not-drive-content-actions.md), board settled 2026-08-15: read + write, forum first). And when the host pauses the member-group, wielders' open pages keep offering the hat until the next read — safe (every wielded act already refuses) but uninformed.

## Solution sketch

API-first over the paired [FEAT-PD019](../../../platform/domain/features/FEAT-PD019-wielded-content-authorship-acting-in-content-contracts.md) contracts; **no migration of its own** (house pattern). Content affordances key on the substitution permissions the page already fetches (H018's acting reads — no new probing):

- **Forum as the group (tranche 1).** With a hat selected on B's page: if the hat grants `view_forum`, the forum section renders via the acting read with a banner naming the substitution; if it grants `post_forum_messages`, the composer renders with the wielding named in the confirm ("You are posting as {A}"). Refused states name the hat, not a generic error.
- **Group authors are badged.** Author chips render PD019's additive `kind: 'group'` with the H018 "Group" badge — everywhere the forum renders authors (list, thread, replies).
- **Hat freshness through delivery (rider).** The [FEAT-PD020](../../../platform/domain/features/FEAT-PD020-group-addressed-notification-delivery.md) expansion delivers the pause notice to the wielder personally; the bell's house path (notification → `refreshNavigation`) re-reads the acting contexts, and the stale hat leaves the selector without a manual reload.
- Tranches 2/3 (conversations, announcements) follow PD019's tranches — affordances specified at pull.

## Appetite

One focused Hub session after PD019 tranche 1 passes its gate. First cut if it swells: the composer (write) ships first — the walk's exact frustration; wielded read fast-follows.

## Rabbit holes

- **H018's rabbit holes hold:** no session-wide acting mode (per-section banner + per-act confirms, never a global "you are group A" state); no optimistic wielded state (post → re-read).
- **Don't fork the forum components.** The wielded render is the same forum components with an acting context prop and banner — a parallel "acting forum" tree is drift.

## No-gos

- No wielded DM affordances (person-anchored by design). No group inbox (PD020's rejected alternative). No tranche-2/3 affordances ahead of their contracts.

## Stories

### STORY-1: The hat opens the forum for reading
As an `act_as_group` holder in A on B's page, I want the forum to render when A's hat grants `view_forum`, so that I can see what A can see.

**Acceptance criteria:**
- Given the hat selected and `view_forum` among its powers, when the forum section renders, then threads load via the acting read and a banner names the substitution ("Viewing as {A}").
- Given the hat lacks `view_forum` (and I am not personally a member), then the members-only honest copy renders naming the hat's insufficiency — no malfunction fallback, no fake door.
- Given "Myself" selected, then behaviour is byte-identical to today.

### STORY-2: The hat opens the composer for writing
As an `act_as_group` holder in A, I want to post and reply as A when the hat grants `post_forum_messages`, so that the group speaks through me.

**Acceptance criteria:**
- Given the hat selected with `post_forum_messages`, when I open the composer, then the confirm names the wielding ("You are posting as {A}"); on submit the thread re-reads and my post renders attributed to A with the Group badge.
- Given the contract's 42501 (limb failed server-side — stale hat), then its copy renders verbatim-faithful.

### STORY-3: Group authors are badged wherever authors render
As a member reading the forum, I want group-authored posts visibly attributed to the group, so that representation is honest (ADR-U041 §5).

**Acceptance criteria:**
- Given a post whose author object carries `kind: 'group'`, when any forum surface renders it, then the author chip shows the group's name with the "Group" badge; `kind: 'person'` (or absent — tolerant reader) renders exactly as today.
- Given attribution `former`/`unknown` on a group author, then the existing attribution strings render unchanged (the badge does not override the ladder).

### STORY-4: A paused hat leaves the page without a reload (rider)
As a wielder whose hat the host paused, I want my open pages to learn it, so that degradation is informed, not just safe.

**Acceptance criteria:**
- Given my open page offering hat A, when the host pauses A's membership and PD020 delivers the `participation_paused` row to me, then the bell hint fires and the house `refreshNavigation` path re-reads the acting contexts — the hat leaves the selector; any wielded section falls back to my own standing with honest copy.
- Given the delivery has not yet arrived (race), then every wielded act still refuses server-side exactly as today (the already-verified safe floor — asserted as a guard, not new behaviour).

## Platform dependencies

FEAT-PD019 tranche 1 (the acting content contracts + the `kind` key) — built only after its gate passes. FEAT-PD020 for STORY-4's delivery leg. H018's acting reads (contexts, substitution permissions) as the affordance gate — already shipped.

## Cross-product impact

The wielded-banner + badge pattern is the reference for the Gimbal's render of the same contracts. No sibling changes.

## Vertical impact

- **Administration:** no new admin affordances; moderation renders group-authored rows like any rows.
- **Privacy/GDPR:** the surface shows the group as author (never the wielding person's name on content — the PD019 privacy posture rendered faithfully).
- **Notifications:** STORY-4 consumes PD020's delivery; no dispatch authored here (V3 seam holds).
- **Observability:** wielded acts emit id-only telemetry (house posture); refused states are events, not silent fallbacks.
- **Transactions:** none.
- **Extensibility:** badges key on the open-set `kind` with default rendering for unknown values; affordances key on permissions, never role names.

## Performance budget

Added at build (2026-08-16) — the section was missing at 4-ready, flagged in TASK-H046-1. **Budget class: interaction-follow-up reads on an existing page; no new first paint.** The affordance gate is H018's already-fetched substitution read (no new probing — the spec's own rule); selecting a hat triggers one wielded forum read (the same `/api/groups/[id]/forum` request with `?acting=`, keyset-paged as before) and one substitution-permissions read (pre-existing H018 path). The forum session cache keys by view, so hat-switching repaints from each view's own peek and never re-fetches on churn. No page joins or leaves the overview bundle; no first-paint request is added or rerouted, so no deep-cold spot measurement is owed (ADR-U043). Loading states: the existing section skeleton covers the wielded read (B6).

## Implementation notes (2026-08-16, TASK-H046-1 — all four stories)

Built same-day on FEAT-PD019 tranche 1's merged gate (#551). No migration (house pattern held). Two calls ruled by Stefan mid-build:

- **Wielded affordance set (RULED): read/post/reply only.** Under a selected hat the composer and reply gates key on the hat's substitution permissions; edit/delete/moderate/report affordances hide until "Myself" — pure substitution, and nothing dead-ends against the substrate's refusals (a wielded post is editable by no one — the PD019 v1 posture; no edit affordance renders on `kind: 'group'` posts by construction, since editing hides whenever a hat is on and a group-authored row is never "mine" otherwise).
- **STORY-4 wiring (RULED): the narrow mechanism.** The page re-reads the acting slice on `NOTIFICATIONS_CHANGED_EVENT` (the bell's coalesced hint-arrival event) and revalidates the selected hat (`revalidateHat`, `lib/groups/acting-selection.ts` — pure and browser-safe; the outer-ring conformance gate is why it does not live beside the server-side RPC couriers in `acting.ts`). A hat that lost standing falls back to "Myself" with a dismissible notice naming it. Deliberate narrowing of the sketch's "hint → `refreshNavigation`": firing the house full-re-read event per hint burst would turn every notification into a platform-wide page re-read — blast radius PD020's expansion amplifies. The `refreshNavigation` full path is untouched and inherits the revalidation (guard cell).
- **Mechanics:** `GroupForumSection` gains an `acting` prop ({groupId, name, permissions}); the BFF forum routes pass `p_acting` through (`?acting=` / body key — plumbing only, ADR-U038); the forum session cache keys by `(group, acting)` so wielded and personal views never share a peek, and `dropGroup` stales every view; wielded writes confirm per act ("You are posting as {A}" / "You are replying as {A}", confirm buttons "Post as {A}" / "Reply as {A}") then re-read (no optimistic wielded state — the rabbit hole); `mapForumError` passes the PD019 limb-naming 42501 copy through verbatim (the window-refusal precedent); `authorKindBadge` renders the H018 open-set badge posture (group → "Group", person/absent → nothing, unknown kind → raw value).
- **Red → green:** 18 red / 2 labelled guards at the unit tier (banner, acting read, hat-insufficiency copy, hat-gated composer, per-act confirms, verbatim 42501, ruled affordance-hide, badges, `authorKindBadge`, `revalidateHat`, page passthrough + hint revalidation) → 23/23; full unit tier 176 suites 1485/1485 (two labelled sibling adaptations: the outer-ring conformance catch above, and the prepend cell's client arity). E2E: the wielded journey (banner → confirm → Group-badged thread) green against the live substrate beside the untouched FEAT-H026 forum journey — **labelled honestly: the E2E was authored with the implementation and first ran green; the red-first proof of every AC lives at the unit tier.** Lint 0 errors; `next build` green (the type gate); route-policy conformance green (no new routes, identity split unchanged).
- **Deferred, stated plainly:** tranche-2/3 affordances (conversations, announcements) ride their platform tranches; STORY-4's full delivery loop has no single E2E — its links are individually proven (PD020 expansion integration; N-C's bell hint; unit cells here) and the safe floor is PD019's integration suite.

## Decomposition walks (recorded 2026-08-15)

- **Payload walk:** STORY-1/2 render from PD019 tranche-1 payloads (shape-preserving + additive `kind`); STORY-3's chip consumes `{display_name, attribution, kind}` — every rendered field traces to a served key; STORY-4 renders no payload (hint → re-read of existing reads). Quote-bearing ACs ("You are posting as {A}", "Viewing as {A}") are new copy this spec introduces — no precedent string to collide with (checked against H018's confirm copy pattern).
- **Mechanism walk:** the affordance gate is the already-fetched substitution read (H018 6-done notes); `refreshNavigation` is the canonical cross-component event (hub entity CLAUDE.md); the safe floor (server-side refusal on stale hats) verified in the 2026-08-15 walk.
