# FEAT-H022: Frozen walks and group progress — the freeze explains itself, and visibility is consent-shaped

---
id: FEAT-H022
title: Frozen-enrolment read-only mode and group progress views
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Three renders the Hub owes the J-D contracts (JRN-14/16/17):

1. **A frozen walk is a dead card.** When a membership-lifecycle cascade freezes an enrolment (`left_group`, `removed_from_group`, `group_closed`, `group_archived`), the Hub shows the bare H020 status panel — the traveller's lived record (their marks, their times, the content they walked) is readable platform-side but unreachable, and *why* it froze is never said. JRN-14 requires read-only mode **with explanation**.
2. **Group leads have no progress window.** A Steward or Guide walking a group through a journey sees nothing about how the walk is going — FEAT-PD005 now serves the consent-shaped read (JRN-16 aggregate + JRN-17 per-member), and the Hub must render it without inventing a comparative surface (invariant 8 binds the pixels, not just the payload).
3. **Sharing has no door.** Consent is opt-in (invariant 4), so without a traveller-side control nothing is ever visible. The traveller needs a quiet, honest toggle that says exactly what it shares.

## Solution sketch

- **Frozen read-only mode (JRN-14):** the player boots a frozen enrolment into the read posture the H021 review work already shaped — every step navigable through the unchanged renderer registry, own marks and times on the rail, **no background `enter`**, no completion affordances — plus a **freeze banner** above the canvas: canon-voice copy keyed on `freeze.reason` (four known reasons, verbatim-fallback for unknown ones), with `frozen_at` rendered. Cards and the detail enrolment panel show the frozen state honestly and offer **View** (the read-only door) where active rows offer Continue.
- **The sharing control (JRN-17, traveller side):** on the player for via-group walks (`progress_sharing.available`), a labelled toggle — copy states precisely what sharing exposes (step completion marks — never times, never content, never journal) — writing through the new BFF route to `set_journey_progress_sharing`; optimistic flip, server-confirmed, rollback on failure.
- **The group progress panel (JRN-16/17, leader side):** on the group detail page beside the existing journeys section, per group enrolment, an on-demand **Progress** view (new Edge/`dub1` BFF route → `get_group_journey_progress`): the step skeleton with aggregate completed-counts labelled by basis ("of M sharing members · N in the group"), then the member list — alphabetical always, sharing members with their marks and required-progress, non-sharing members with a quiet "not shared" — **no sorting by progress, no percentages-vs-others, no highlighting of most/least** (invariant 8 as a rendering rule). Members without `view_group_progress` never see the affordance; the route refuses as the contract does.

## Appetite

One cycle, shared with FEAT-PD005 (the J-A/J-B/J-C one-day shape) — the Hub half rides once the gate PR applies.

## Rabbit holes

- **Freeze copy sprawl:** four reasons need four honest lines, not a copy system. One keyed map + one fallback; canon voice; done.
- **Progress-visualization ambition:** no charts, no completion bars per member (a bar invites comparison at a glance — the marks list is the design). The aggregate row may show counts; that is the ceiling.
- **Consent-toggle placement debates:** player-only v1 (the state boots with `get_player_state`); adding it to the detail panel means a second state source — don't.
- **Frozen vs review posture divergence:** reuse the review-posture mechanics (navigation without `enter`, retired verbs); the delta is the banner and the entry affordance, not a third posture implementation.

## No-gos

- No unfreeze affordance (cascades own freeze state; nothing self-service here).
- No timing display in any leader-facing view (Q5 platform-side; the Hub renders no fallback for it).
- No notification bell/inbox work (A-NTF).
- No Steward-facing consent prompts or nudges ("ask your members to share" mechanics are a norm question, not a J-D surface).
- No group-progress surface anywhere but the group detail (no journeys-page aggregates, no dashboards).
- No changes to solo-walk surfaces beyond the frozen posture.

## Stories

### STORY-1: A frozen walk opens read-only and says why (JRN-14)
As a traveller whose enrolment froze, I want my walk readable with an honest explanation, so that losing the group context doesn't erase my lived record — or leave me guessing.

**Acceptance criteria:**
- Given a frozen enrolment, when I boot the player, then the walk renders in read posture — every step navigable, content readable, my marks and times on the rail — with a banner naming the reason in canon voice (`group_closed`, `group_archived`, `left_group`, `removed_from_group` each keyed; an unknown reason renders the verbatim value in the fallback line) and when it froze.
- Given frozen-posture navigation, then no background `enter` ever fires (asserted by request listener — the effect, not the absence of a handler) and no completion affordance renders anywhere in the walk.
- Given my frozen enrolment on the journeys cards and the detail enrolment panel, then the state shows honestly and a **View** affordance opens the read-only walk — Continue and Review never render on frozen rows.
- Given a frozen walk that was completed before it froze, then the completion framing (marks, timing, completed state) still renders inside the frozen posture — the banner adds to the record, never replaces it. Frozen-posture precedence is explicit: a frozen status renders the frozen posture (with completion framing inside it) — never the bare review posture without the banner.
- Given my membership ended with the freeze (`left_group` / `removed_from_group`), then my frozen walk still lists on my journeys page and opens read-only (PD005 Q9's lived-record read standing) — my record does not vanish with my membership.

### STORY-2: I decide whether my group leads see my progress (JRN-17, traveller side)
As a traveller on a group walk, I want a clear control over progress sharing, so that visibility is my act and I know exactly what it shows.

**Acceptance criteria:**
- Given a via-group walk, when the player boots, then the sharing control renders with my current state from `progress_sharing` (no extra read); given a solo walk, then no control exists.
- Given I flip the toggle, then the change paints optimistically (B5), confirms through the BFF route, and rolls back with the standard retry surface on failure; the control's copy states that sharing exposes step completion marks only — not times, not content, not anything I wrote.
- Given I revoke, then the next leader read excludes me (verified E2E: flip off → the leader's refreshed panel shows me as "not shared").

### STORY-3: A group lead sees the walk's shape, on the group's page (JRN-16)
As a Steward or Guide with the progress permission, I want the group's journey progress where the group lives, so that leading has eyes without anyone being ranked.

**Acceptance criteria:**
- Given the group detail page and a group journey enrolment, when I hold `view_group_progress`, then a Progress affordance renders per enrolment and expands on demand into the panel (skeleton over spinner while fetching, B6); without the permission, no affordance and the route refuses (403) even if called directly.
- Given the panel, then the aggregate row shows per-step completed counts explicitly labelled with their basis ("of M sharing · N members"), zero-sharing renders the honest empty state (counts absent, basis shown) — never fabricated zeros presented as coverage.
- Given any rendering state, then members appear alphabetically only — no ordering, sorting control, bar, percentage, or emphasis derived from progress (invariant 8 at the pixel layer).

### STORY-4: Per-member visibility is exactly what was consented (JRN-17, leader side)
As a Steward or Guide, I want each member's row to show their shared marks or a quiet "not shared", so that the roster is complete and the window is honest.

**Acceptance criteria:**
- Given the member list, then every active member appears once; sharing members show per-step completion marks, their required-progress count ("3 of 5 required"), and a completed flag when their walk is done; non-sharing members show "not shared" and nothing else.
- Given a member with zero instances who shares (e.g. not yet started), then their marks render honestly empty — never conflated with "not shared".
- Given no member timing exists in the payload, then no Hub element renders or derives one (no em-dash column implying it could exist).

### STORY-5: The new surfaces meet their budgets (Performance DoD)
As the area gate, I want J-D's additions to ride the existing budget classes, so that the area closes with no perf regression.

**Acceptance criteria:**
- Given a frozen boot, then it is the same single `get_player_state` read + session cache as any player boot (B2/B3/B4 unchanged; the freeze banner renders from the payload with zero extra requests — asserted).
- Given the progress panel, then it is one justified standalone read (ADR-U042) on an Edge/`dub1` route, fetched on expand (never on group-page boot), skeleton ≥ 300 ms deferred (B6), and repeated expands within the session reuse the fetched state.
- Given the sharing toggle, then the flip paints ≤ 200 ms optimistically (B5) with the write in the background.

## Platform dependencies

FEAT-PD005 entirely: the `freeze` and `progress_sharing` blocks (STORY-1/2), `set_journey_progress_sharing` (STORY-2), `get_group_journey_progress` + the seeded `view_group_progress` permission (STORY-3/4). FEAT-PD003/PD004/H020/H021 substrate and posture mechanics otherwise unchanged. PC-2 session; PC-3 permission resolution server-side.

## Cross-product impact

None beyond the shared contracts — the Gimbal inherits the same consent-shaped payloads, and because the shaping is contract-side it cannot over-render. The group detail page gains the Progress section (additive, same shape as the existing journeys section); the player gains the banner + toggle (additive).

## Vertical impact

- **Privacy/GDPR:** Renders only what the contracts serve: own walk + freeze reason to the traveller; consent-shaped marks to permission-holders. The sharing control is the consent UX for the new purpose — explicit, labelled, revocable, opt-in (invariant 4). No client-side filtering of over-broad data (there is none to filter). Nothing comparative anywhere (invariant 8 as a rendering rule — alphabetical roster, no bars/rankings).
- **Notifications:** None (no bell/inbox work; sharing flips trigger nothing).
- **Administration:** None.
- **Observability:** Standard route/client error surfacing + telemetry events for the three new meaningful actions (freeze-banner render, sharing flip, progress-panel expand) via the existing pattern — no new event schema.
- **Transactions:** None.
- **Extensibility:** Freeze copy is a keyed map with verbatim fallback (open reason vocabulary honoured); the progress panel renders from payload shape (a future consent grain adding keys extends, not breaks); no client mode enum for frozen posture (derived per render from `status`/`freeze`, the H021 pattern).

## Performance budget

*(Classes B1–B6 per ADR-U043; data-boot per ADR-U042.)*

- **First-paint class:** frozen boots are player boots — B2/B3/B4 unchanged, one justified standalone read + session cache. The group progress panel is expand-on-demand: no group-page boot cost; its fetch is a justified standalone read on Edge/`dub1`.
- **Interaction class:** sharing toggle B5 (optimistic ≤ 200 ms); progress-panel expand shows skeleton per B6; review/frozen prev/next stays B5 from the in-memory payload.
- **Loading states:** deferred `PlayerSkeleton` covers frozen boots unchanged; the progress panel gets a deferred skeleton (300 ms), never a spinner.
- **Gate:** frozen boot + progress-panel expand join the J-O3 area-gate waterfall scenarios with Stefan's live walk (production stable domain, cold + warm, ≥ 3 runs).

## Open spec questions

1. **Frozen entry affordance label.** Default: **View** on frozen rows (cards + detail panel) — Continue promises writes and Review names the completed posture; a frozen walk is neither. Decided at task review unless the gate board touches it.
2. **Progress panel placement.** Default: expandable section per enrolment inside the group detail page (beside the existing journeys section) — no new page v1; a dedicated page returns only if the panel outgrows the detail layout.
3. **Sharing-toggle copy.** Default: one sentence naming exactly what is exposed ("your step completion marks — never your times or anything you write") + the revocation fact; final wording at task review in canon voice.
