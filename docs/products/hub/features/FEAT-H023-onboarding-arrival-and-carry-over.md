# FEAT-H023: Onboarding arrival — auto-launch the front door and carry it across transcendence (JRN-5 + JRN-15)

---
id: FEAT-H023
title: Onboarding arrival and carry-over
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A new arrival on FringeIsland lands nowhere in particular. ADR-U045 (with Amendment 1) makes onboarding **the front door**: first arrival lands the traveller *in* the onboarding journey's welcome — for a Mist at anonymous arrival and for a brand-new FIM at first sign-in who never arrived into it as a Mist — and the traveller is free to stop and explore at any step but is never walled behind completing it, and never nagged again once they have arrived once. And a Mist who begins onboarding and then transcends to a FIM must resume exactly where they left off, not restart (JRN-5).

The Hub has zero onboarding surface today. The platform half ([FEAT-PD006](../../../platform/domain/features/FEAT-PD006-onboarding-designation-and-arrival-contracts.md)) provides the designation, the Mist-admitting enrolment gate, and the `get_onboarding_status()` first-arrival read; this feature is the Hub orchestration that consumes them — the auto-launch decision, the launch into the existing player ([FEAT-H020](./FEAT-H020-journey-player.md)), and the post-transcendence resume.

## Implementation notes

*(Built Cycle J-E 2026-07-10; merged same day — PR #164, stacked on the nodded #163 and retargeted per the stacked-PR rule; deployed and deep-cold-measured before `6-done`. Tasks TASK-JE-04/05/07 `done`.)*

- **Data-boot decision (B1/B4, decided at build):** the arrival read rides BOTH postures — a FIM's landing consumes a new `onboarding` slice on the sign-in overview bundle (zero extra round-trips; `OverviewBoot` → `OnboardingArrival` same-commit adoption ordering), while a Mist takes the canonical standalone `GET /api/me/onboarding` (no bundle fires for a Mist; one small post-paint read). The standalone route stays canonical (ADR-U042 guardrail 3); route-policy conformance green (`getVerifiedUserId` read identity).
- **The uniform decision:** `hub/components/shell/OnboardingArrival.tsx`, mounted after `OverviewBoot` — fires post-paint on the landing paths (`/`, `/login`, `/groups`, `/mist`) for `mist`/`fim` identities only, once per session (the latch re-arms on failure; the enrolment itself flips `has_enrollment` for every later visit). First arrival → `enrollSelf(onboarding_journey_id)` through the existing enrolment route → route into the player at the welcome; `onboarding.arrived` telemetry; a failed arrival never breaks the landing.
- **Scope flips the ACs required (pre-U045 UI gates lifted):** `/journeys` and `/journeys/[id]/play` now ADMIT Mists — page-level UI gates only; what a Mist may boot or enrol stays platform-enforced (PD006). The `/mist` landing gained a "Your journeys" link (list reachability). **Surfaced seam:** the journey DETAIL page keeps its FIM gate — admitting Mists there without affordance work would render an always-refusing Enroll button (a fake door, the H018 principle); routed to the J-O3 gate / J-F.
- **Resume (STORY-4):** the `become-a-fim` success handler reads the carried status — mid-flight (`has_enrollment && !has_completed`) resumes into the player at the platform's resume pointer, never re-enrols; completed/none land `/groups` (where the uniform arrival path catches a genuine first-arrival FIM). `onboarding.resumed_after_transcendence` telemetry.
- **Tests (red-first):** 17 new unit tests demonstrated red (module absent) plus 2 labelled behaviour flips of the existing mist-redirect pins → full unit **691/691** (93 suites); lint 0 errors; `next build` green. E2E: the new `onboarding-arrival.spec.ts` (3 arcs, effects asserted — Mist arrival→welcome→leaves freely→listed→never re-launched; brand-new FIM first sign-in via the identical path; carry-over resume at the carried position) **3/3 green**; entry/transcendence specs adapted to the front-door reality (labelled); fixture FIMs across six sibling specs pre-enrolled via the new `markArrivedOnce` helper + global-setup ("arrived once" by construction — arrival flows own fresh identities). Full E2E sweep **59 passed**; the 2 remaining failures (`membership-lifecycle` regular-leave, `leadership-transfer` direct-hand-over — a departed group's name stays visible on /groups) **reproduce identically at main HEAD on a clean production build**: pre-existing, out of J-E scope, flagged for follow-up.
- **Perf-budget conformance:** B1 — the overview one-request test extended to six consumers (labelled adaptation); single-fire across auth-event churn asserted; no render-blocking fetch added to any landing. B4 — the status is session-cached; `markOnboardingArrived` flips the fact locally so the session never refetches to avoid a re-launch. Cold spot-check (ADR-U043 Amendment 1): **pending as TASK-JE-07** — one deep-cold measurement of the arrival path on production, before `6-done`.
- **Test-infra:** `playwright.config.ts` gained `E2E_BASE_URL` (target an alternate port when :3000 is held by a live manual-testing session); this build's E2E ran on a `next start -p 3001` production build after the :3000 dev server's compile workers wedged mid-session.
- **Post-build, pre-6-done (same day):** the two flagged E2E failures were root-caused and fixed — `BOOT_PATHS` matched `/groups/<id>`, so a detail-page full load adopted a groups slice nobody consumed there, and a later client-side `/groups` mount consumed it STALE (consume-once), painting a departed group (**PR #166**, red-first, the two specs 10/10 green). The same latent shape in this feature's `ARRIVAL_PATHS` was fixed on the branch before merge (a deep-linked never-arrived FIM opening a shared group link would have been yanked into the welcome) — red-first, unit 693/693.
- **Deep-cold spot check (TASK-JE-07, ADR-U043 Amendment 1) — RUN 2026-07-10:** production deploy of PR #164 (`a1dd9b2`) confirmed live 20:16:32Z; last setup traffic (measurement FIM sign-in) 20:18:41Z; **23.3 minutes enforced zero traffic**; one authenticated walk of `/groups` (an arrived-once FIM — the B1 steady state) at 20:41:58Z. Result: the landing made **exactly one API request** — `GET /api/me/overview` — whose `x-overview-timing` carried **`n:1`** (the instance's first invocation, provisioning-fresh): **server total 599 ms** (auth 185; the six concurrent slices 337–413, the new `onboarding` slice 407 among them). **Zero standalone `/api/me/onboarding` calls** (the arrival read rode the bundle — the B1 claim verified deep-cold) and **no launch fired** (URL held `/groups` — arrived-once honoured on production). Wall-to-network-idle 6.1 s (cold headless browser + full asset load — a different quantity than the §8 per-request fan-out numbers; labelled as such). The formal budget/tail pass stays with the J-O3 area gate.

## Solution sketch

**The arrival check rides the landing, never blocks it.** On the authenticated landing, the Hub reads `get_onboarding_status()` — folded into the sign-in overview bundle so it costs no extra round-trip (or session-cached; decided at build against the measured waterfall, per the ADR-U043 area discipline). The onboarding launch happens **after** first paint (a route into the player / a welcome surface), so onboarding never delays the landing.

**Auto-launch decision (uniform across both entry paths):** if `has_enrollment` is false → this is a first arrival: call `enroll_self_in_journey(onboarding_journey_id)` and route into the player at the welcome. If `has_enrollment` is true → do nothing automatic (they have arrived once; the journey stays available from their journeys list). There is no separate "is this a first sign-in?" state — enrolment-absence *is* the first-arrival signal, so a never-was-a-Mist FIM and an anonymous Mist take the identical path (ADR-U045 Amendment 1 §3). No opt-out toggle exists to check.

**Front door, never a wall:** the welcome renders in the ordinary player; from it and every step after, the standard Hub navigation is fully live — the traveller can leave and explore at any time. Nothing gates the rest of the Hub behind onboarding completion. Because auto-enrolment at arrival records "has arrived once," later visits see `has_enrollment=true` and never re-launch.

**Carry-over (JRN-5):** a Mist mid-onboarding who transcends lands, post-transcendence, with the same enrolment preserved (platform-guaranteed — `finalise_transcendence` keeps the personal group). The Hub's post-transcendence landing reads `get_onboarding_status()` → `has_enrollment=true, has_completed=false` → resumes onboarding via `get_player_state` at the carried position rather than re-launching or restarting. It does **not** auto-enrol again (the enrolment already exists).

## Appetite

A small orchestration feature over existing surfaces (the player already renders; the platform read + gate already decide). The weight is in the E2E proofs — the two arrival paths and the transcendence resume — not in new UI. A few days.

## Rabbit holes

- **Materialisation ordering.** A Mist must be materialised (have a personal group) before the arrival check runs — it is (IDN-1 / FEAT-H003 creates the Mist on arrival). Don't call the gate on an actorless session; it returns `42501`.
- **Don't block first paint.** The launch is post-paint. Resist wiring `get_onboarding_status` as a render-blocking standalone fetch on the arrival path — it rides the overview bundle or a session cache (B1/B4).
- **Resume, don't relaunch, after transcendence.** The post-transcendence path must recognise the carried enrolment and resume it — not fire the first-arrival auto-enrol again (which would `42501`/duplicate-refuse anyway, but the correct behaviour is a clean resume).
- **"Arrived once" is the enrolment, created at launch.** Enrol at the moment of auto-launch (landing in the welcome), so a traveller who glances at the welcome and immediately leaves is still recorded as arrived and not re-launched next visit.

## No-gos

- No response capture, no review-substance rendering — J-F (ADR-U046). This feature launches and resumes onboarding; it does not read takeaways or capture input.
- No opt-out / "skip onboarding" control (ADR-U045 Amendment 1 — there is nothing to skip before the door).
- No new player rendering — the welcome and every step render through the existing FEAT-H020 player and the DS-3 step registry.
- No onboarding content authoring — placeholder content is platform-seeded (FEAT-PD006); real content is CQ-010.

## Stories

### STORY-1: A Mist arrives and lands in the welcome
As a first-time anonymous visitor, I want to arrive into a welcome that sets the scene, so that I meet FringeIsland and my Whisp instead of an empty landing.

**Acceptance criteria:**
- Given a freshly-materialised Mist with no onboarding enrolment, when they land, then (after first paint) the Hub enrols them in the onboarding journey and routes them into the player at the welcome step.
- Given that Mist on a later visit (enrolment now exists), when they land, then onboarding is **not** re-launched; the journey remains reachable from their journeys list.

### STORY-2: A brand-new FIM lands in the welcome at first sign-in
As a new member who signed up directly (never a Mist), I want the same welcome on my first sign-in, so that every arrival path meets the front door.

**Acceptance criteria:**
- Given a new FIM who has never enrolled in onboarding, when they first sign in, then onboarding auto-launches via the identical `has_enrollment=false` path — no separate first-sign-in state is consulted.
- Given a FIM who has already arrived into onboarding, when they sign in again, then it does not re-launch.

### STORY-3: The front door is never a wall
As a traveller in onboarding, I want to leave and explore whenever I choose, so that I am invited, never trapped.

**Acceptance criteria:**
- Given a traveller on the welcome (or any onboarding step), when they use the Hub's navigation to go elsewhere, then they leave freely — no step is forced to advance and nothing is walled behind onboarding completion (voluntariness, DS-3 invariant 3 / ADR-U045 Amendment 1).
- Given a traveller who left onboarding incomplete, when they return later, then onboarding is not auto-relaunched at them (has_enrollment is true), and they may resume it deliberately from their journeys list.

### STORY-4: Onboarding carries across transcendence (JRN-5)
As a Mist who started onboarding, I want to continue where I left off after I become a FIM, so that transcendence loses nothing.

**Acceptance criteria:**
- Given a Mist who advanced partway through onboarding, when they transcend to a FIM and land post-transcendence, then onboarding resumes at the carried position (same enrolment, same step-instances) — not restarted, not re-launched, not duplicated.
- Given the carried enrolment, when the now-FIM opens onboarding, then `get_player_state` shows their prior progress intact.

## Platform dependencies

- **FEAT-PD006** (the paired half): `get_onboarding_status()` (arrival read), the Mist-admitting `enroll_self_in_journey`, the designation, the seeded placeholder journey.
- **FEAT-PD003**: `get_player_state` (render + resume), the step substrate.
- **FEAT-PC002 / IDN-2**: `finalise_transcendence` continuity (consumed as a guarantee; the Hub does not implement carry-over).
- **IDN-1 / FEAT-H003**: Mist materialisation on arrival (precondition for the arrival check).

## Cross-product impact

The Gimbal is a senses-surface arrival too — first-arrival auto-launch applies there, consuming the same PD006 contracts unchanged (ADR-U009). The launch UX is Hub-shell-specific (this feature); the decision and the read are surface-agnostic and shared. `requires-equipment: none` — arrival is not equipment-gated.

## Vertical impact

- **Privacy/GDPR:** the arrival read is own-scoped (the caller's own onboarding status); no other traveller's data is touched. A Mist's onboarding data rides ADR-U031 ephemerality (platform-owned). The Hub over-fetches nothing — `get_onboarding_status` returns ids + booleans, no content.
- **Notifications:** none authored here (no arrival notification; the welcome is the surface, not a notification).
- **Administration:** none — no admin affordance; designation is platform-seeded.
- **Observability:** the arrival decision and the auto-enrol emit content-free telemetry (arrived-into-onboarding, resumed-after-transcendence) so first-arrival funnel is measurable; refusals surface honestly, never swallowed.
- **Transactions:** none.
- **Extensibility:** no new types/enums/permissions — the feature orchestrates existing contracts. Branching is on `has_permission`/status booleans, never role-string equality.

## Performance budget

- **First-paint class:** B1 (sign-in landing) and B4 (revisit). The arrival check (`get_onboarding_status`) **rides the sign-in overview bundle** (no extra round-trip) or a session cache — decided at build against the measured waterfall per ADR-U043. The onboarding launch happens **after** first paint (route/redirect into the player), so onboarding never delays the landing paint.
- **Interaction class:** the launch transition into the player is a navigation, not a blocking interaction; it shows immediate feedback within 100 ms (B5).
- **Loading states:** the player's own skeleton covers the welcome load (B6: skeleton over spinner).
- **Cold spot-check (ADR-U043 Amendment 1):** this feature adds a request on the arrival first-paint path, so it runs one deep-cold spot measurement of the landing before `6-done` (idle depth recorded; no synthetic warm-up traffic — the pinger is retired, ADR-U036 Amendment 2).
