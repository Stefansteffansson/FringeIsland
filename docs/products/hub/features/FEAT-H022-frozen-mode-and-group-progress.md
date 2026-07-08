# FEAT-H022: Frozen walks and group progress — the freeze explains itself, and visibility is consent-shaped

---
id: FEAT-H022
title: Frozen-enrolment read-only mode and group progress views
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Three renders the Hub owes the J-D contracts (JRN-14/16/17):

1. **A frozen walk is a dead card.** When a membership-lifecycle cascade freezes an enrolment (`left_group`, `removed_from_group`, `group_closed`, `group_archived`), the Hub shows the bare H020 status panel — the traveller's lived record (their marks, their times, the content they walked) is readable platform-side but unreachable, and *why* it froze is never said. JRN-14 requires read-only mode **with explanation**.
2. **Group leads have no progress window.** A Steward or Guide walking a group through a journey sees nothing about how the walk is going — FEAT-PD005 now serves the consent-shaped read (JRN-16 aggregate + JRN-17 per-member), and the Hub must render it without inventing a comparative surface (invariant 8 binds the pixels, not just the payload).
3. **Sharing has no door.** Consent is opt-in (invariant 4), so without a traveller-side control nothing is ever visible. The traveller needs a quiet, honest toggle that says exactly what it shares.

## Implementation notes

*(Built Cycle J-D, 2026-07-08, on the FEAT-PD005 contracts. TASK-JD-03/04 delegated + lead-verified; PR #144. The one contract addition found at build — the panel's `enrollment_id` key — landed as the separately-nodded PD005 rider `20260708190000`.)*

**Data path (JD-03/04).** Additive types in `hub/lib/journeys/queries.ts` (`PlayerFreeze`/`PlayerProgressSharing` on `PlayerState`; the `GroupJourneyProgress` family; optional `enrollment_id` on the group summary entries), re-exported through `player.ts`; two new BFF routes, zero business logic route-side (ADR-U038): POST `/api/journeys/enrollments/[id]/sharing` (Node mutation) → `set_journey_progress_sharing`, GET `/api/groups/[id]/journeys/[enrollmentId]/progress` (**Edge/`dub1`**, ADR-U036) → `get_group_journey_progress`; house SQLSTATE→HTTP mapping (P0002→404, 42501→403, P0001→422); both pass the route-policy conformance matrix.

**Frozen read-only mode (JD-03).** Posture precedence explicit — the frozen check runs first and completion framing renders *inside* the frozen frame (a frozen-completed walk keeps its marks and times); `FreezeBanner` above the canvas (four canon-voice reason lines + verbatim fallback for unknown reasons + a null-reason fallback; `frozen_at` as "Held since"); `StepCanvas` gained `readOnly` (every completion affordance retired); navigation fires **no background `enter`** (asserted as the effect — the transport mock never called); **View** replaces Continue/Review on frozen rows at the journeys cards and the detail enrolment panel; withdrawn unchanged.

**Sharing + panel (JD-04).** `SharingToggle` on via-group walks only — boots from the payload's `progress_sharing` with zero extra reads, optimistic flip (B5) with rollback + the standard retry surface, copy naming exactly what is exposed (step completion marks — never times, never anything written). **Labelled deviation (lead-accepted):** the toggle is suppressed inside frozen posture (`available && !frozen`) — a live consent write inside a read-only frame read as a contradiction; the platform admits it, so reversal is one line if the area gate wants payload-fidelity. `GroupJourneyProgressSection` on the group detail beside the journeys section: expand-on-demand (no group-page boot cost, deferred skeleton, session reuse), aggregate labelled "Completed · of M sharing · N members", zero-sharing renders the honest empty state, members alphabetical **as served**, sharers show per-step marks + "X of Y required" + a completed flag, non-sharers a quiet "not shared", shares-but-not-started distinct ("0 of Y required"), and no timing-shaped element anywhere. The affordance renders only for `view_group_progress` holders from the already-fetched effective-permissions read; the route refuses as the contract does. Telemetry: `player.freeze_banner_shown`, `player.sharing_flipped`/`player.sharing_set`, `group.progress_expanded`/`group.progress_loaded`.

**Red → green.** Red-first per block: Block A 10 reds across 5 suites (FreezeBanner absent, readOnly/frozen-posture/View unimplemented) → green; Block B 5 suites red as module absences → green. Unit **611 → 656** (83 → 88 suites), lead-re-run; `next build` green (the type gate, lead-run); eslint 0 errors; `set-state-in-effect` suppressions unchanged at 4 (≤ 5 budget). **Labelled paired-suite adaptation (unit-only):** the H020/H021 assertions that pinned frozen to the bare non-active panel are superseded by the new posture — updated to `paused`/`withdrawn` examples; no integration tests touched.

**E2E (JD-05, delegated + lead-verified).** `frozen-and-group-progress.spec.ts` — one arc: group enrol → the member walks a step → the Steward's expanded panel shows the honest zero-sharing state (`progress-empty` + "not shared") → the member shares → the **refreshed** panel shows marks + "1 of 2 required" (**the effect asserted, never the click** — retro-2026-07-08-j-c §4) → revoke → "not shared" again (immediate) → freeze (admin-seeded to the exact `close_group` terminal shape — the real closure flow would destroy the group the panel reads) → the frozen boot renders the banner naming the reason, read-only, rail navigable, **zero background `enter` POSTs asserted by request listener**, exactly one player-state read; the panel fetch fires on expand only (zero requests before). 1/1 green + all four journeys/player specs together **6/6 (lead re-run, 27.4s)** + a clean isolated re-run; zero source files touched by the E2E work (every needed test-id already existed). One transient sibling observation (a `journeys.spec` cold-route-compile miss against a 5s visibility timeout, once, non-reproducible — green on baseline, re-run, and the lead's verification) — flagged to the flake watch, not adapted. The single-session-FIM design (the Steward is also the walking member) was verified against the contract: no self-special-case exists — the Steward's own row honestly reads "not shared" until they share.

**Production waterfall:** frozen boot + progress-panel expand join the J-O3 area-gate protocol with Stefan's live walk — pending at 6-done, per the H019/H020/H021 precedent.

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

All three decided at task review (2026-07-08, lead) and built as confirmed:

1. **Frozen entry affordance label.** **View** on frozen rows (cards + detail panel) — Continue promises writes and Review names the completed posture; a frozen walk is neither. Built as confirmed.
2. **Progress panel placement.** Expandable section per enrolment inside the group detail page (beside the existing journeys section) — no new page v1. Built as confirmed.
3. **Sharing-toggle copy.** Shipped as drafted in canon voice ("…step completion marks — never your times, and never anything you write. You can turn this off at any time."); the freeze-banner lines likewise. Flagged for Stefan's live walk / the J-O3 gate as a copy look, not a build question.
