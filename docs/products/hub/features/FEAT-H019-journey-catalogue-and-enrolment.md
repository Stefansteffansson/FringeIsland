# FEAT-H019: Journey catalogue & enrolment surfaces — browse the journeys, see one whole, and enrol yourself or a group you may enrol

---
id: FEAT-H019
title: Journey catalogue & enrolment surfaces — the /journeys catalogue, the journey detail page with viewer-shaped enrolment affordances (self + wielded group), withdraw, and the group-detail enrolment summary (JRN-1/2/3/4 + the GRP-4 seam; first Hub spec under the ADR-U043 performance budgets)
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The Hub has **zero** Journeys surface — no page, route, or component (kickoff substrate audit). Journeys are the primary developmental experience (§L3 A-JRN intro); the Groups area just finished building the social container that enrols in them. A member today cannot browse the catalogue (JRN-1), open a journey (JRN-2), start one alone (JRN-3), or take their group travelling (JRN-4) — and the Groups detail page still shows no enrolment summary (the G-A seam this cycle fills).

The platform half is [FEAT-PD002](../../../platform/domain/features/FEAT-PD002-journey-catalogue-and-enrolment-contracts.md) (Cycle J-A, the first DS-3 feature): catalog/detail/my-enrolments reads with the viewer block, self- and group-enrolment, withdraw, and the group enrolment-summary read. This is the Surface consuming them API-first (ADR-U009): the Hub renders and relays; every rule lives in the substrate (ADR-U038).

## Solution sketch

Two pages, one panel, and the BFF plumbing — all on established house patterns, **first feature built under the ADR-U043 budgets** (see Performance budget below):

- **Catalogue page `/journeys`**: a card grid from `get_journey_catalog()` (title, description, difficulty, duration, tags) with an **Enrolled** badge from `get_my_enrollments()`; card → detail navigation. FIM-gated (house journal-pattern gate; the Mist surface arrives at J-E with the onboarding journey, ADR-U045). No search/sort/ranking promises — a stable default order only (DS-6 is a seam, board J-A2).
- **Journey detail page `/journeys/[id]`**: renders the PD002 detail payload — journey fields, the **steps overview** (title/kind/duration per step; no content — the player is J-B), and the **viewer-shaped enrolment block**: *Start this journey* (self-enrol) when not individually enrolled; **Enrol a group** offering **exactly the payload's `enrollable_groups`** (the wielding walk — the Hub never computes eligibility, mirrors the ADR-U041 "only flagged contexts" posture); enrolled-state rendering (individually / via named groups) with a **Withdraw** affordance behind a destructive `ConfirmModal`. Unpublished/nonexistent → BFF 404 → house not-found (indistinguishable, the no-leak rule). Mutations re-read, never optimistic.
- **Group-detail enrolment summary** (fills the G-A seam): the group page's BFF route composes `get_group_enrollment_summary()` alongside `get_group_detail()` **as a slice** — the summary section renders the group's journeys (title, status) with a link into each journey's detail; a failed summary slice never breaks the group page (ADR-U042 envelope posture). *(Decomposition finding recorded in PD002: the summary is a DS-3 read composed at the BFF — not an added field on the PC-3 contract — per the one-way rule.)*
- **BFF routes** — `GET /api/journeys` (catalogue), `GET /api/journeys/[id]` (detail), `GET /api/me/journeys` (my enrolments): hot reads → **Edge + `dub1` + `getClaims()`** (ADR-U036/U037). `POST /api/journeys/[id]/enroll` (body `{ group_id? }` — absent = self) and `POST /api/journeys/[id]/withdraw`: mutations → Node + `getUser()`. SQLSTATE→HTTP (42501→403, P0002→404, sessionless→401); content-free telemetry (`journey.catalog_loaded`, `journey.detail_loaded`, `journey.enrolled_self`, `journey.enrolled_group`, `journey.withdrawn`, failure variants — journey/group ids only). The PR #111 route-policy conformance test walks every new file automatically.

## Appetite

Medium-plus — two pages, an enrolment block with two flows, a summary slice, five routes; but zero novel mechanism (every piece is an H013/H018-established pattern) and the platform half carries all the rules. First cut if it swells: the Withdraw affordance (contract exists; surface affordance can follow inside the cycle) — never the budgets.

## Rabbit holes

- **Don't build the player.** The detail page's steps overview is a list, not a walkable surface (JRN-6..11 = J-B). No step content rendering of any kind.
- **Don't compute eligibility client-side.** `enrollable_groups` and the enrolled-state come from the payload; no `has_permission` calls, no role strings, no client filtering of groups.
- **Don't invent catalogue UX.** No search, filters, sorting controls, or recommendations (DS-6 seam); a grid and a stable order.
- **Don't cache-cleverly beyond the house pattern.** Session-cache reads + re-read after mutations; no client store, no optimistic enrolment.
- **Don't leak Mist scope early.** Mists never see `/journeys` this cycle (nav hidden + deep-link redirect); the ADR-U045 onboarding surface is J-E's — resist wiring "just the read" for Mists now.
- **Vocabulary-tolerant rendering** for difficulty/status strings (CHECK lists can grow — ADR-U018 posture; no exhaustive switches).

## No-gos

- No journey player, no progress display, no completion/review (J-B/J-C), no group-progress views (J-D).
- No Mist-facing surface, no onboarding auto-launch (J-E, ADR-U045).
- No authoring/publishing affordances (Journey Studio scope), no discovery/search/ranking (A-DIS/DS-6).
- No realtime, no push notifications (durable rows land platform-side; rendering rides A-NTF).
- No pause affordance (no write path exists; recorded, not built).

## Stories

### STORY-1: Browse the catalogue (JRN-1)
As a FIM, I want to browse the published journeys, so I can find where to go next.

**Acceptance criteria:**
- Given an active FIM, when they open `/journeys`, then the published journeys render as cards (title, description, difficulty, duration, tags) in a stable order, with an Enrolled badge on journeys they're enrolled in (individually or via a group).
- Given the catalogue is loading, when more than ~300 ms pass, then a **skeleton grid** renders (never a spinner-first screen — B6); under that threshold nothing intermediate shows.
- Given a Mist, when they visit `/journeys` or deep-link it, then the nav shows nothing and the deep link redirects (house gate; the Mist journey surface is J-E's).
- Given zero published journeys, when the page renders, then an honest empty state shows (no error styling).

### STORY-2: See one journey whole (JRN-2)
As a FIM, I want to open a journey and understand its shape before committing, so enrolment is an informed act.

**Acceptance criteria:**
- Given a published journey, when a FIM opens `/journeys/[id]`, then they see the journey fields and the steps overview (each step's title, kind, and duration — no step content), plus their viewer-shaped enrolment block.
- Given an unpublished or nonexistent id, when they deep-link it, then the house not-found renders — indistinguishable between the two (the BFF's 404 from `P0002`).
- Given a sessionless visitor deep-linking, when the gate fires, then they are sent to login and returned after signing in.
- Given unknown difficulty or step-kind strings, when the page renders, then they render plainly without crashing (vocabulary-tolerant).

### STORY-3: Start a journey myself (JRN-3)
As a FIM, I want to enrol myself in a journey, so my own travel starts with one act.

**Acceptance criteria:**
- Given a FIM not yet enrolled, when they choose *Start this journey* and the call succeeds, then the page re-reads and shows them enrolled (the affordance becomes the enrolled state — no optimistic flip).
- Given the button is pressed, when the request is in flight, then the affordance shows busy feedback **within 100 ms** (B5) and cannot double-submit.
- Given the platform refuses (already enrolled, suspended), when the error returns, then it surfaces honestly and the page's rendered state stays at last-read truth.

### STORY-4: Take a group travelling (JRN-4 — the wielding walk)
As a member who may enrol a group, I want to enrol it from the journey page, so group travel starts where the journey is.

**Acceptance criteria:**
- Given the detail payload's `enrollable_groups` lists two groups, when the FIM opens *Enrol a group*, then the picker offers **exactly those two** — never other groups, never a client-computed list.
- Given they pick one and confirm (the confirm names the group — the H018 wielding-confirm pattern), when the call succeeds, then the page re-reads and shows the journey enrolled via that group.
- Given `enrollable_groups` is empty, when the block renders, then no group-enrol affordance exists (absence, not a disabled tease).
- Given the platform refuses (permission lost since read, duplicate, inactive group), when the error returns, then it surfaces honestly; no partial UI state pretends success.

### STORY-5: Withdraw deliberately
As an enrolled traveller (or a member holding the group key), I want to withdraw through a deliberate confirmation, so leaving a journey is an intentional act.

**Acceptance criteria:**
- Given an individually-enrolled FIM, when they choose Withdraw and confirm via the destructive `ConfirmModal`, then the enrolment is gone on re-read and the catalogue badge clears.
- Given a group enrolment and a viewer holding `unenroll_from_journey` in that group, when they withdraw the group (confirm names the group), then the group's enrolment is gone on re-read; without the key, no affordance exists.
- Given a frozen enrolment, when its viewer looks for Withdraw, then the affordance follows the contract's refusal posture (rendered per the payload, never client-guessed).

### STORY-6: The group page tells its journeys (GRP-4 seam)
As a group member, I want the group detail page to show what the group is travelling, so the container and the journey meet.

**Acceptance criteria:**
- Given a group with enrolments, when a permitted viewer opens `/groups/[id]`, then an enrolment-summary section lists them (title, status) linking to each journey's detail.
- Given the summary slice fails, when the page renders, then the group detail still renders whole and the section shows an honest unavailable state (envelope posture — never a broken page).
- Given a group with none, then the section shows an honest empty state; given a viewer who cannot see the group, the whole page stays the house 404 (no new leak through the slice).

### STORY-7: Meaningful actions leave a trace (V4)
As the platform, I want every J-A surface action observable, content-free.

**Acceptance criteria:**
- Given a successful catalogue load / detail load / self-enrol / group-enrol / withdraw, when the route completes, then a structured event fires (actor, journey id, group id where applicable, outcome) — no titles, descriptions, or member data in events.
- Given any refused or failed call, when the route returns, then a failure-variant event fires with the mapped status — refusals are never silent.

## Platform dependencies

- **[FEAT-PD002](../../../platform/domain/features/FEAT-PD002-journey-catalogue-and-enrolment-contracts.md)** — all six contracts + the viewer block + the write-narrowing (schema gate lands platform-side; this feature carries no migration).
- **Existing:** the FIM-only page-gate pattern, Edge+`dub1`+`getClaims` BFF conventions (ADR-U035/U036/U037/U038), the H018 wielding-confirm pattern, `ConfirmModal`, session-cache pattern (PR #102), `components/ui/` card/badge/form primitives, the deferred `LoadingState` (300 ms) primitive.

## Cross-product impact

The **Gimbal** consumes the same PD002 contracts for its journey surfaces; the viewer-block pattern keeps eligibility platform-side for every surface. The catalogue/detail pages are what J-B's player and J-E's onboarding auto-launch land into — routes and navigation are built expecting those arrivals (detail links carry no player affordance yet, but the page structure reserves the primary-action slot).

## Vertical impact

- **Privacy/GDPR:** enrolment state renders only to its subject (own enrolments) or through group-visibility scope (summary); no traveller lists, no comparative progress anywhere (DS-3 invariant 8); ids-only telemetry.
- **Notifications:** group-enrolment durable rows are written platform-side (PD002); this surface renders nothing new — the bell/inbox is A-NTF's. None beyond relaying.
- **Administration:** withdraw is ConfirmModal-gated and named; frozen-enrolment posture renders from the payload; no admin affordances (freeze/ownership are Console scope, board J-A5).
- **Observability:** STORY-7 — content-free structured events on every action and failure; 403/404 mappings keep substrate refusals diagnosable; slice-failure of the summary is logged, never swallowed (ADR-U042 §2).
- **Transactions:** None.
- **Extensibility:** vocabulary-tolerant rendering (difficulty, status, step kinds); the enrolment block renders whatever the viewer block provides (additive payload growth safe); no journey-type branching anywhere in the surface.

## Performance budget

*(First Hub spec under [ADR-U043](../../../architecture/decisions/ADR-U043-performance-budgets.md); classes B1–B6, data-boot per [ADR-U042](../../../architecture/decisions/ADR-U042-first-paint-bootstrap-read-bff-bundle.md).)*

- **First-paint class:** `/journeys` and `/journeys/[id]` are navigation targets — **B2** (cold ≤ 2.5 s, target 2.0 s) / **B3** (warm ≤ 1.0 s) / **B4** (revisit: no visible loading state — session-cached catalogue re-paints instantly with background revalidate). **Data-boot path: justified standalone reads + session cache** — not overview-bundle slices (nothing here is first-paint-at-landing; ADR-U042's promotion rule is not triggered). Detail navigation seeds from the catalogue's cached card data where present (title paints immediately; the full payload fills in).
- **Interaction class:** enrol / group-enrol / withdraw are **B5**-bound — busy feedback within 100 ms on the pressed affordance, next paint ≤ 200 ms (the confirm/re-read completes in the background against last-read truth); card → detail navigation must paint within B3/B4.
- **Loading states:** **B6** — < 1 s: nothing (the deferred 300 ms `LoadingState` covers this); 1–3 s: **skeleton** grid/page, never a spinner; > 3 s: treated as a defect (fails the area gate).
- **Gate:** measured on the production stable domain, authenticated real path, cold + warm, ≥ 3 runs per scenario — every run within budget (the J-O3 waterfall; this page set joins the area-gate protocol).

## Open spec questions

1. **Withdraw affordance placement** (detail page only, or also on a "my journeys" view?). Default: detail page only this cycle — `/journeys` shows the badge, the detail is where enrolment state is managed. A dedicated my-journeys view can arrive with the player (J-B) if navigation wants it.
2. **Catalogue default order.** Default: a stable, non-ranking order (e.g. title or seeded order) — recorded at build; anything smarter is DS-6's.

## Implementation notes

Built Cycle J-A, 2026-07-07, consuming FEAT-PD002 API-first; carries no migration of its own (the STORY-5 payload amendment lives platform-side — see PD002's build finding: the viewer block gained `individual_enrollment` + per-`enrolled_via` withdraw handles because this spec's "affordance per the payload, never client-guessed" rule was otherwise unrenderable).

**Open-question resolutions:** Q1 — withdraw affordance on the detail page only (as defaulted); a my-journeys view can ride J-B. Q2 — catalogue order is the contract's `title asc, id` (recorded in PD002's migration).

**Shape:** five BFF routes — `GET /api/journeys`, `GET /api/journeys/[id]`, `GET /api/me/journeys` (Edge + `dub1` + `getVerifiedUserId`) and `POST .../enroll`, `POST .../withdraw` (Node + `getUser`) — pass the PR #111 route-policy conformance walk with **zero new exceptions**; SQLSTATE→HTTP inline per house style (P0001 messages pass through as the honest 409 copy). `hub/lib/journeys/` client rides the PR #102 session-cache pattern (shared in-flight, failed-read-never-cached, sign-out invalidation via AuthContext). New `SkeletonGrid` primitive (deferred 300 ms, B6 — no skeleton existed in `components/ui/`). The group-detail BFF composes `get_group_enrollment_summary` as an ADR-U042 `{data}|{error}` slice (`GroupJourneysSection` renders list/empty/unavailable honestly). Detail navigation seeds its header from the cached catalogue card (title paints immediately; the enrolment block always waits for the real payload).

**Performance DoD (ADR-U043):** budget section bound as authored (B2/B3/B4 pages, B5 interactions, B6 rule). Asserted at the unit tier: first paint = exactly 2 reads, zero duplicate fetches across auth-event churn (the groups-page 3x-refire guard), SkeletonGrid deferral + skeleton-not-spinner. In-repo prior art checked before new plumbing (session caches, `LoadingState`, card grid). **The production waterfall (cold + warm, ≥3 runs, stable domain) rides the J-O3 area gate with Stefan's live walk — pending at 6-done, per the completion plan's area-gate protocol.**

**Test evidence (red-first TDD; labelled exceptions honest):** routes/lib 19 + cache 8 unit demonstrated red (module-absent) → green; pages/panel 22 red → green; slice 4 (3 red-first, 1 carried-forward 404 guard, labelled); detail-seed 1 red → green; perf DoD rows 4 **labelled test-after** (verification of behaviour built under the STORY suites); E2E 2 journeys green (solo travel arc; the wielding walk incl. the group page's journeys section). Final: unit **509/509** (74 suites), `next build` green, lint 0 errors (3 `react-hooks/set-state-in-effect` suppressions — new-plugin lint drift, pre-existing on main's groups page; disposition routed to the J-A retro). PC016's STORY-2 rider (leadership.ts thinning) landed in this cycle's surface branch.
