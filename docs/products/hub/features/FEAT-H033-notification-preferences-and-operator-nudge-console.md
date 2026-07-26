# FEAT-H033: Notification preferences & the operator nudge console

---
id: FEAT-H033
title: Notification preferences & the operator nudge console
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The Hub has a bell, an inbox, typed actions and a live socket — everything except a
way to say **no**. A member who finds a category noisy has exactly one remedy today:
ignore it. NTF-10 is the last unbuilt A-NTF capability, and its Hub half is the
surface that makes the platform's new suppression substrate reachable.

Two smaller gaps close in the same surface, both deliberately deferred *to here* by
N-C (decision NC-2a):

- The platform-announcement nudge toggle shipped as **data with no door** —
  `ds5_config.realtime_hint_platform_announcements` is seeded `'false'` and the
  migration's own comment (`20260725120000:90`) says *"the operator surface arrives
  with N-D's preferences work."* An operator cannot see it, let alone change it.
- The general per-category nudge switch was cut as gold-plating when it would have
  been a standalone build. It is nearly free once this surface exists.

The operator half carries a cost the Hub is the right place to expose. N-C measured
that a platform-wide announcement is billed **per recipient whether or not anyone is
listening** — 857 delivery rows against a reachable population of 1,274 — so the
dominant cost tracks **headcount, not concurrency**. That number currently lives in a
session bridge. An operator flipping the toggle has no way to know what it costs.

## Design record (the as-specified sketch)

**`/notifications/preferences`** — a categories × channels matrix, sitting under the
inbox because that is where a member already goes to think about notifications
(`app/notifications/page.tsx` is the sibling). One row per category, server-authored
labels rendered verbatim — the H030 law: **never re-word server copy**.

- Toggles are optimistic with rollback on failure, the shipped H030/H031 idiom.
- A category with `member_suppressible = false` renders **locked-on with a reason**,
  not as a disabled mystery. In Ferd that is `account` only, and the honest reason is
  that these are notices about the member's own access.
- **The `email` column does not render.** `channel_delivers` is `false` for it (board
  row ND-3): the preference is stored so it binds the day email ships, but a toggle
  that cannot change anything is a promise the Hub would be breaking. The page says
  so in one line rather than hiding it.
- `interruption_grade` shows as a quiet hint per row (all `badge` in Ferd — no sound,
  no toast, no overlay; the H032 posture holds).

**The operator console** — a DeusEx-gated panel on the same route, rendering the
nudge policy with **a live cost line**: *"Sending a platform-wide announcement now
would emit ≈ N realtime messages"*, N from `get_platform_announcement_reach()`. This
is board row ND-4's whole point: the cheapest possible guardrail is showing the number
at the moment of the decision, not in a bridge. Per-category nudge switches sit beside
it (ND-5).

**BFF routes** (private Hub BFF per ADR-U038; cookie session, unversioned — the
FEAT-PC006/PC007 house shape, mirrored from `app/api/account/consent/route.ts`):

| Route | Method | Contract |
|---|---|---|
| `/api/notifications/preferences` | GET | `get_own_notification_preferences()` |
| `/api/notifications/preferences` | PUT | `set_own_notification_preference(...)` |
| `/api/notifications/nudge-policy` | GET | `get_notification_nudge_policy()` + `get_platform_announcement_reach()` (composed in the BFF) |
| `/api/notifications/nudge-policy` | PUT | `set_notification_nudge_policy(...)` / `set_notification_category_nudge(...)` |

Typed-refusal mapping follows the consent route's precedent exactly: `22023` → 422,
`42501` → 409, `28000` → 403, sessionless → 401 before the contract, anything else →
500 surfaced (never swallowed).

## Implementation notes

**Built 2026-07-26 (A-NTF Cycle N-D), PR #295.** Carries no migration; consumes [FEAT-PD016](../../../platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md) API-first.

**As built.** `app/notifications/preferences/page.tsx` (FIM-gated, matching FEAT-H008's `/consent` shape) · `components/notifications/NotificationPreferencesPanel.tsx` (the matrix) · `components/notifications/NudgePolicyPanel.tsx` (the DeusEx console) · `lib/notifications/preferences.ts` (contracts + the pure shaping helpers) · `app/api/notifications/preferences/route.ts` (GET + PUT) · `app/api/notifications/nudge-policy/route.ts` (GET composing the policy read and the reach count, + PUT accepting either shape). Both routes mirror `app/api/account/consent/route.ts`: cookie session, the ADR-U037 identity split (`getVerifiedUserId` on reads, `getUser()` on mutations), SQLSTATE→HTTP mapping, telemetry on every path including refusals.

**Nothing in the surface hardcodes a category, channel or interruption grade.** Categories and channels are derived from the payload, so a new registry row renders with no Hub change — proved at the unit tier by feeding a category (`weather-warnings`) and a channel (`push`) that do not exist in Ferd's registry at all.

**HONEST PROCESS RECORD — this half was NOT red-first, and that is a deviation.** The platform half (FEAT-PD016) was demonstrated red-first, 21 of 24 failing pre-apply. This Hub half was written implementation-first: `lib` → routes → page → components, *then* the E2E, *then* the unit tests. **All six panel unit tests and the ADR-U038 adversarial integration test passed on their first run** — green-at-red, which the `feature-development` skill says to stop and surface. Surfaced here rather than dressed up: this coverage is **test-after**, and it is not TDD. It is real coverage of real branches (one of which had none at all — see below), but the red→green evidence the DoD asks for does not exist for the Hub half. Routed to the A-NTF area retro as the cycle's process deviation.

**The rollback path had zero coverage until the DoD forced the question.** E2E covers the happy round-trip; nothing covered a *failed* PUT. A silent revert would be worse than an error — the member would believe the change stuck. Now unit-tested: the toggle reverts visibly and the server's own message is shown in an `alert` role. The DoD's "keep the pyramid upright" rule is what surfaced it; without that step this would have shipped untested.

**The E2E found a race that was mine, not the product's.** The first run failed 1 of 3: reloading immediately after the click outran the in-flight PUT and read back pre-mutation state. Not a defect — the control is `disabled` while the write is in flight, so a real member cannot outrun it; only a test reloading within milliseconds can. Fixed by awaiting the PUT response, which makes the assertion **stronger** than the optimistic flip alone: it now proves the contract returned 2xx rather than only that React re-rendered.

**Two decisions held exactly as specified**, and both are visible in the tests: a non-suppressible category renders **locked-on with a stated reason and no control at all** (never offered, so never refused — the spec's timeboxed rabbit hole never became one), and the `email` column **does not render**, named honestly in one line.

**Verification.** Unit **982/982** (131 suites — +9 helper tests, +6 panel tests) · E2E **89/89** (86 baseline + this feature's 3) · full integration sweep **690/690** · route-policy conformance **5/5** · `next build` clean.

**Performance DoD — one item is OWED, not done.** The first-paint budget is met and *tested*: the panel issues exactly one read (ADR-U042 justified standalone; deliberately **not** added to the overview bundle, because a rarely-visited settings surface must not tax every page load — the N-C nominations-slice lesson applied before the mistake rather than after). The B5 interaction budget is met by construction (optimistic flip paints before the PUT). **The ADR-U043 deep-cold spot measurement for this new page has NOT been taken** — it requires ≥20 minutes of enforced zero traffic on a deployed environment, which no in-session run can provide. Tracked on `TASK-ND-05` and the A-NTF area-gate checklist, alongside N-C's still-owed `/groups` before/after. Recorded as owed rather than quietly omitted.

## No-gos

- No quiet hours, frequency caps, or digest UI (board row ND-7 — Eid+).
- No email toggle rendered (see above), and no email sender.
- No per-group preference overrides (V3 §5 Q2 is parked).
- No notification-history or preference-change audit view — current state only. The
  append-only history pattern belongs to consent, not preferences (G-34's grain
  distinction).
- No new design-system components; the matrix composes existing primitives, and
  appearance stays in the design-system layer per the V3 surfaces law.

## Stories

### STORY-1: A member sees what the platform may send them
As a member, I want a page listing every notification category with its current
setting, so that I can see what reaches me before deciding to change anything.

**Acceptance criteria:**
- Given an authenticated FIM with no preference rows, when they open
  `/notifications/preferences`, then every category renders with its server-authored
  label and an **on** toggle — the page reflects "absence means allowed" without
  needing to know that rule.
- Given the six seeded categories, when the page renders, then the `account` row shows
  as locked-on with a stated reason and no operable toggle, and the other five are
  operable.
- Given the `email` channel is `delivers = false`, when the page renders, then no email
  column appears, and a single line states that email delivery is not live yet.
- Given a sessionless visitor, when they request the route, then they are gated as the
  Hub's other own-data surfaces are — no partial render of another member's state.
- Given the page loads, when it fetches, then it makes **one** standalone read
  (ADR-U042) — no per-category request fan-out.

### STORY-2: A member mutes a category and it stops arriving
As a member, I want to switch a category off and have it actually stop, so that the
control is real rather than cosmetic.

**Acceptance criteria:**
- Given an operable category, when the member toggles it off, then the toggle flips
  immediately (optimistic), the PUT is issued, and the state persists across a reload.
- Given the PUT fails, when the response returns non-2xx, then the toggle rolls back
  visibly and an honest error is shown — never a silent revert.
- Given a muted category, when a notification of that category would have been written
  for the member, then nothing appears in their bell or inbox and the unread badge does
  not move (verified end-to-end, not by asserting the contract twice).
- Given a muted category, when the member switches it back on, then subsequent
  notifications of that category arrive again.
- Given a member attempts to mute a `member_suppressible = false` category by calling
  the route directly, then the route returns 409 with a stated reason (the `42501`
  mapping), and the surface never offered the affordance in the first place.

### STORY-3: An operator sees the nudge policy and what it costs
As a platform operator, I want the nudge policy visible with its cost, so that turning
on a platform-wide nudge is a decision rather than a surprise.

**Acceptance criteria:**
- Given a platform admin, when they open the preferences route, then the operator panel
  renders the current `realtime_hint_platform_announcements` value (`false` today) and
  a cost line naming the reachable-recipient count from
  `get_platform_announcement_reach()`.
- Given a non-admin member, when they open the same route, then the operator panel does
  not render at all, and the PUT is refused server-side if called directly — the gate is
  the contract, not the absence of a button.
- Given a platform admin, when they flip the platform-announcement nudge on and then
  off, then the stored `ds5_config` value changes each time and the cost line stays
  accurate.
- Given a platform admin, when they set a category's `nudge` off, then notifications in
  that category still appear in the inbox but the bell does not update live until the
  next read — loudness changed, delivery did not.

## Platform dependencies

Consumes the paired [FEAT-PD016](../../../platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md)
contracts API-first (ADR-U009); **carries no migration of its own.** Also depends on
PC-4's `is_platform_admin()` (through the platform contract, not directly) and the
existing `@supabase/ssr` cookie-session auth the Hub's other own-data routes use.

## Cross-product impact

The Gimbal will need its own preferences surface, but **not** its own enforcement —
suppression lives in the substrate (FEAT-PD016), so the Gimbal inherits correct
behaviour before it renders anything. When the equipment frame adds push (ADR-U025),
the channel arrives as a `notification_channels` row and this matrix grows a column
without a code change on either surface.

## Vertical impact

- **Privacy/GDPR:** The surface reads and writes **only the caller's own** preference
  rows through the contract door; it never reads the table directly and adds no new
  collection. Preferences appear in the member's existing data export via the platform
  contract. No consent state is written here — consent has its own surface
  (`/consent`, FEAT-H008/H009) and this page deliberately does not blur into it.
- **Notifications:** This is the in-app **preference** surface the V3 obligation
  requires be "reachable from every product surface that delivers notifications"
  (`:108`), with appearance owned by the design-system layer per the V3 surfaces law.
  Interruption stays `badge` — this feature adds no new interruption modes.
- **Administration:** Adds the operator nudge console (DeusEx-gated), closing N-C's
  NC-2a deferral. Gating is server-side in the contract; hiding the panel is a
  courtesy, not the control.
- **Observability:** Preference reads/writes and operator policy changes emit
  content-free structured events (category/channel keys are reference data). The BFF
  error path is instrumented and refusals are recorded with their SQLSTATE, per the
  consent-route precedent — a refused write must not look like a successful one.
- **Transactions:** None.
- **Extensibility:** The matrix renders from the contract's registry rows, so a new
  category or channel appears with **no Hub change** — the same kind-agnostic discipline
  H030 proved for the inbox renderer. No category list, channel list, or grade list is
  hardcoded in the surface.

## Performance budget

Budget classes per [ADR-U043](../../../architecture/decisions/ADR-U043-performance-budgets.md).

- **First-paint class:** **B2 (cold nav)** and **B3 (warm nav)**. Data-boot path is one
  **justified standalone read** per ADR-U042 — the preferences matrix is not in the
  overview bundle and does not belong there: it is a rarely-visited settings surface,
  and adding it to the bundle would tax every page load to serve one. This is the same
  reasoning that retired the orphaned nominations slice at N-C, applied before the
  mistake rather than after.
- **Interaction class:** the toggle is a **B5** interaction (200 ms to next paint) and
  meets it by construction — it is optimistic, so the flip paints before the PUT is
  issued; the network round trip is off the interaction path.
- **Loading states:** the matrix is a single read, expected **B6 < 1 s** (nothing
  needed). If it exceeds 1 s, a skeleton of the row structure — not a spinner. Over
  3 s is a defect.
