# FEAT-H046: Wielded content affordances — the "use" half of acting

---
id: FEAT-H046
title: Wielded content affordances — the hat's content powers open real doors (forum first), and hat lifecycle stays fresh through delivery
owner: hub
consumers: []
wave: unassigned
maturity: 5-in-cycle
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

## Decomposition walks (recorded 2026-08-15)

- **Payload walk:** STORY-1/2 render from PD019 tranche-1 payloads (shape-preserving + additive `kind`); STORY-3's chip consumes `{display_name, attribution, kind}` — every rendered field traces to a served key; STORY-4 renders no payload (hint → re-read of existing reads). Quote-bearing ACs ("You are posting as {A}", "Viewing as {A}") are new copy this spec introduces — no precedent string to collide with (checked against H018's confirm copy pattern).
- **Mechanism walk:** the affordance gate is the already-fetched substitution read (H018 6-done notes); `refreshNavigation` is the canonical cross-component event (hub entity CLAUDE.md); the safe floor (server-side refusal on stale hats) verified in the 2026-08-15 walk.
