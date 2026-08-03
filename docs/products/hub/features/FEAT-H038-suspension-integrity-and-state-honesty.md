# FEAT-H038: Suspension integrity and state honesty — the walk's fix family lands

---
id: FEAT-H038
title: Suspension integrity and state honesty
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

Stefan's live walk (2026-08-02→03) found the suspension family honest at the substrate and dishonest at the surface, and his directive made the family committed fix work ([findings](../../../planning/hub-v2/2026-08-02-admin-live-walk-findings.md); board rows RB-7/RB-8, [plan](../../../planning/hub-v2/phase-3-platform-ops-completion-plan.md)). Each fault is site-anchored (Hub dossier 2026-08-03):

1. **W-7 — suspension is invisible in-session.** `AccountStateContext` reads account state once per session (`hub/lib/account/AccountStateContext.tsx:43-78`); no soft-nav, focus, cadence, or refusal-triggered re-check exists — `reload()` (`:41`) has exactly two callers, both manual. A suspended member browses on boot-time "active" until a hard load.
2. **W-8 — refusals are honest but mute.** `hub/app/api/profile/me/route.ts:81-89` collapses everything non-validation to a generic 500 `"Failed to update profile"` — the typed SQLSTATE from `update_own_profile` (`hub/lib/profile/queries.ts:187-188` throws it intact) dies at `:88`. Five sibling BFF libs already have the mapping idiom (`hub/lib/announcements/http.ts:11-27` et al.); this route predates it.
3. **W-9 — `hub.adminEntry` bleeds across users, bidirectionally (photographed).** `hub/components/shell/AccountMenu.tsx:30-55` caches the admin-entry probe verdict in sessionStorage keyed by nothing, inline in the component — the one cache that escaped the cache-registry sweep (`hub/lib/auth/cache-registry.ts`) because it doesn't live in a `lib/*/client.ts` module. Never invalidated on sign-out, sign-in, grant, or revoke.
4. **W-10 — the suspended wall's exit is findable only by luck.** `app/layout.tsx:34-36` wraps every route in `AccountStateGate` with no allowlist, so `/login` bounces to the wall; the wall's Sign-out button (`AccountStateGate.tsx:17,27` → bare `signOut`) ends the session but never navigates — the member stays parked on the wall's URL, and the button reads as part of the error.
5. **W-3's surface half, now two-mode.** The paired FEAT-PC023 gives group holds teeth in two states (`resting` — the visible steward-fix hold; `suspended` — the hard hazard hold; the RB-6/RB-7 amendment + the naming settle). The Hub must render both: the status chip is impossible on the groups list today (`get_member_groups` carries no status until PC023's additive key), a suspended group needs a found-but-that's-it shell instead of its content, resting-group affordances must split by the `rest_group` permission, the steward needs the Rest/Wake control, and the typed refusals must reach member copy.

## Solution sketch

Extend house patterns, never invent: the cache-registry idiom for W-9, the `mapAnnouncementError` idiom for W-8, the `AccountMenu` sign-out-then-navigate idiom for W-10, and `AccountStateContext` grows the revalidation it was built to hold for W-7 (soft-nav + visibility/focus, throttled, plus an exported refusal-triggered re-check). W-3 surfacing rides the existing BFF mappers, and the status chip consumes PC023's new key in both modes: a suspended group renders a minimal shell (name + "Suspended" label, no content, no actions) from the minimal payload, while a resting group renders by capability — `rest_group` holders get the normal working surface plus the Rest/Wake control on group settings, everyone else read-only with honest copy. The steward control and the admin ceremony's mode choice ride here as STORY-6 (the admin half is H035's surface, dated pointer at build).

## Appetite

The Hub half of cycle HYG-A, alongside FEAT-PC023. Five small, independent fixes — the value is in the tests that pin each leak shut.

## Rabbit holes

- **No shared fetch-wrapper refactor.** No central fetch layer exists; introducing one to serve W-7 is a rebuild-sized detour. The refusal-triggered re-check is an exported hook wired at the write paths this cycle touches; broader adoption is incremental.
- **No route allowlist surgery on the wall.** The gate-wraps-everything shape is deliberate (person-bound wall, proven at the walk); W-10 is copy + navigation, not routing.
- **Revalidation must never block navigation.** Background re-check, stale-while-revalidate; the wall appears on *confirmed* off-state only (the `AccountStateView.tsx:52` optimistic-render revision stands).

## No-gos

- No sanction notifications (Eid, DB-4) — W-7 fixes staleness, not the missing bell.
- No member-facing explanation of a hold's reason — the label/shell says the state, never the why (Eid, with the sanction-communication family).
- No realtime suspension push (the H035/H036 refresh-based no-go stands).
- No admin-plane changes (ADM-E/ADM-F territory).

## Stories

### STORY-1: The admin-entry cache learns whose it is (W-9)
As the Hub, I want the admin-entry probe cached per user and cleared on auth change, so that no member ever sees another's admin state.

**Acceptance criteria:**
- Given Stefan's session cached an admin-entry answer in a tab, when Gracy signs in in that tab, then her menu renders from her own probe — never Stefan's cached `yes`, and his `no` never hides a real admin's entry (the photographed frame is impossible).
- Given any auth-state change (sign-out or sign-in), when the menu next renders, then the cache for the departed user is gone (registered invalidator via `registerCacheInvalidator`, key carrying the user id).
- Given a grant or revoke, when the affected member starts a new session, then the fresh probe answers correctly (probe-per-session semantics stated in the component).

### STORY-2: The wall's exit is explicit (W-10)
As a suspended member, I want the wall to tell me the way out and take me there, so that the exit is not luck.

**Acceptance criteria:**
- Given the suspended wall, when it renders, then the exit affordance reads as the way out — "Sign out to use another account" — distinct from the error body.
- Given the wall, when I activate the exit, then the session ends and I land on `/login` (sign-out-then-navigate, the `AccountMenu.tsx:84-95` idiom), where signing in as another account reaches the normal app (person-binding proven at the walk stays proven).

### STORY-3: The profile refusal speaks (W-8)
As a member whose profile save is refused, I want the real reason, so that a typed refusal is never a generic failure.

**Acceptance criteria:**
- Given the profile BFF route, when the RPC refuses typed, then the route maps SQLSTATE→HTTP (the `mapAnnouncementError` idiom: 42501→403, P0001→409-class with honest copy, 22023→400) — nothing typed collapses to 500.
- Given a suspended member saving their profile, when the refusal returns, then the surface says the account is suspended at the point of refusal (`ProfileEditForm.tsx:87` renders the mapped message).

### STORY-4: The session learns of suspension (W-7)
As the Hub, I want in-session account-state revalidation, so that a suspended member meets the wall without a hard load.

**Acceptance criteria:**
- Given a signed-in member suspended mid-session, when they soft-navigate, or return focus/visibility to the tab, then a throttled background re-check (≥30 s between checks) confirms the state and the wall renders — no hard reload required.
- Given a write refused 401/403, when the refusal is mapped at a wired path (the profile path and the group-write mappers this cycle), then the exported re-check fires and a confirmed off-state walls the session.
- Given an active account, when revalidation runs, then navigation is never blocked and no visible flicker occurs (background check, confirmed-state rendering only).

### STORY-5: Resting and suspended groups render honestly (W-3 surface half, two-mode)
As a member, I want a held group to say what it is and refuse legibly, so that both hold modes are legible.

**Acceptance criteria:**
- Given the groups list (and every surface where groups normally render), when a group is resting or suspended, then its row carries the matching label ("Resting" / "Suspended" — consuming `get_member_groups.status`).
- Given a resting group, when a member without `rest_group` opens it, then content renders read-only with write affordances absent-or-refusing; when a `rest_group` holder opens it, then the normal working surface renders (capability-flag driven, never role-name driven).
- Given a resting group, when a non-holder's write reaches the contract anyway, then the typed refusal surfaces as honest member copy — "this group is resting", never a generic failure (existing `http.ts` mappers extended).
- Given a suspended group, when any member — `rest_group` holders included — opens it or deep-links into its content, then the found-but-that's-it shell renders (name + "Suspended" label, no content, no actions, not even leave) and no content leaks.

### STORY-6: The Rest/Wake control and the admin ceremonies
As a steward, I want to rest and wake my group from its settings page — and as a platform admin, I want the full three-state ceremony — so that the model is operable at both planes.

**Acceptance criteria:**
- Given a group's settings page, when the viewer holds `rest_group` (capability flag), then the Rest/Wake control renders — "Rest this group" on an active group, "Wake this group" on a resting one — through `ConfirmModal` with honest consequences; a non-holder never sees the control. (The verb is "rest", never "put to rest".)
- Given the group admin detail, when an admin opens the hold ceremony, then they choose Rest or Suspend (and Wake / Reactivate on held groups), the ConfirmModal names each mode's consequences honestly, and the resulting state renders on the admin surfaces; admin transitions are audited platform-side. (The admin half is H035's surface — dated pointer added to FEAT-H035 at build.)
- Given a suspended group, when a steward views its shell or settings entry point, then no Rest/Wake control renders — there is no steward path out of the hard state.

### STORY-7: Wired, gated, observable
As the Hub, I want the family under the standing gates, so that the fixes stay fixed.

**Acceptance criteria:**
- Given the cycle's tests, when the suites run, then each W-fix has a red-first unit pin; the account E2E journey covers suspend → in-session wall → explicit exit → sign-in-as-other (the walk's scenario, automated); the group E2E journey covers steward rest → member read-only + holder exemption → steward wake → admin suspend → shell → admin reactivate; token + axe green; `next build` green.

## Platform dependencies

FEAT-PC023 (paired): the two-mode status on `get_member_groups`, the suspended minimal-detail payload, the typed refusal contracts + canonical messages ("group is resting" / "group is suspended"), the `rest_group` permission + capability flag, `rest_group()`/`wake_group()`, and the admin ceremonies (STORY-5/6 consume all of it). STORY-1..4 have no platform dependency and can build ahead of the gate.

## Cross-product impact

None outward. The Gimbal inherits the enforcement substrate by construction; state-honesty UX will be its own surface work.

## Vertical impact

- **Privacy/GDPR:** No new data collected. W-9's fix removes a minor cross-user state disclosure (another user's admin-entry verdict).
- **Notifications:** None (the Eid deferral pointer stands).
- **Administration:** The admin hold ceremony gains the mode choice and the steward gains the member-plane Rest/Wake control (STORY-6; the admin half is H035's surface, dated pointer); admin transitions audited platform-side, steward rest/wake telemetry-mirrored by design; the rest of the family makes admin ceremonies legible member-side.
- **Observability:** Refusal-surfacing paths keep their BFF telemetry mirror; the revalidation re-check emits no new durable events (Q2 criteria — no consumer).
- **Transactions:** None.
- **Extensibility:** The refusal-copy mapping keys on SQLSTATE + canonical message, open to new cases; no sealed lists.

## Performance budget

- **First-paint class:** unchanged — B3/B4 paths gain no blocking reads (revalidation is background, stale-while-revalidate; boot path untouched, ADR-U042 slice adoption unchanged).
- **Interaction class:** the exit affordance and profile save stay under B5 (200 ms to next paint) — mapping is synchronous; revalidation never sits on the interaction path.
- **Loading states:** unchanged; the wall renders on confirmed state only (no flash-of-wall during re-check).

## Implementation notes — tranche 1: STORY-1..4, the walk's fix family (built 2026-08-03, ahead of the PC023 apply)

- **Red-first at the unit tier**, four new suites, demonstrated 16 red / 4 green of 20 at head (the 4: two designed controls — the untyped-500 collapse, the error wall's retry — and two boundary pins green-at-head vacuously, labelled in-suite): `account-menu-admin-entry-user-scope.test.tsx` (W-9) · `account-wall-explicit-exit.test.tsx` (W-10) · `profile-me-typed-refusals.test.ts` (W-8) · `account-state-revalidation.test.tsx` (W-7). Post-implementation: 20/20; full unit 1167/1167; lint 0 errors; `next build` green.
- **W-9:** the probe verdict is cached as `hub.adminEntry:<user.id>`; the legacy unkeyed key is never read; a `registerCacheInvalidator` at module init drops every verdict (legacy key included) on the auth flip. Probe-per-session semantics stated in the component.
- **W-10:** `AccountStateView` suspended branch gains `signOutLabel="Sign out to use another account"` + an `onWallExit` prop; the gate wires sign-out-then-navigate to `/login` (the AccountMenu idiom). Other branches keep their exits (the decommissioned "Return to the front page" landing is deliberately untouched).
- **W-8:** the PATCH route maps typed SQLSTATE → HTTP (42501→403, P0001→409, 22023→400, P0002→404) with the substrate's canonical message passed through as member copy; telemetry `profile.update_refused` carries the code; untyped failures keep the generic 500. `ProfileEditForm` renders the mapped message unchanged (it already surfaces the response error body).
- **W-7:** `AccountStateContext` grows `revalidate()` — throttled ≥30 s, stale-while-revalidate, never flips `loading`/`error` (the wall renders on confirmed state only) — triggered by focus/visibility return and soft-nav (`usePathname`), plus the exported `requestAccountStateRecheck()` (throttle-bypassing) now wired at the profile save path on 401/403. No fetch-wrapper refactor (the named rabbit hole).
- **Found-not-caused hygiene (fenced by name):** two pre-existing main-branch lint errors (`react-hooks/set-state-in-effect` in `AdminAuditLog.tsx` / `AdminModerationQueue.tsx`, ADM-D era) fixed with the house promise-chain idiom; admin unit suites stay green.
- **Deferred to the post-apply tranche:** STORY-5 (two-mode group rendering — needs `get_member_groups.status` + the typed refusals live), STORY-6 (Rest/Wake control + admin mode choice + the FEAT-H035 dated pointer), STORY-7's two E2E journeys, and the group-write mapper wiring of the W-7 re-check.

## Implementation notes — tranche 2: STORY-5..7, the post-apply half (built 2026-08-03, substrate live)

- **Red-first at the unit tier**, six suites (three new, three extended), demonstrated **14 red of 19 new cases at head** with the five green-at-head cases **labelled in-suite as designed controls** (the two recheck never-fires boundary pins, the holder-no-banner and active-no-label pins, the full-payload no-overreach pin): `availability-http.test.ts` (the mapper family) · `group-write-recheck.test.ts` (W-7 wiring) · `GroupDetailPanel.availability.test.tsx` (STORY-5/6 member surface) · `groups-page.test.tsx` + `group-detail-page.test.tsx` (list labels, the shell branch) · `admin-group-detail.test.tsx` (the mode choice). Post-implementation: full unit **1195/1195**, lint 0 errors, `next build` green.
- **STORY-5 shape:** `GroupSummary.status` (additive) labels list rows ("Resting"/"Suspended", vocabulary-tolerant); the suspended shell is a **payload-driven branch** — `isGroupDetailShell()` keys on the absent `viewer` (never a client-side status guess), so an admin's full payload renders the normal surface; the shell (`SuspendedGroupShell`) renders name + label + one state sentence, zero buttons. The guard lives in `lib/groups/client.ts`, NOT `queries.ts` — a value export from the substrate module trips the outer-ring conformance gate (caught red at build). `GroupDetailShell.viewer?: undefined` is the discriminant that keeps the union narrowable (a full detail is otherwise structurally assignable to the shell — caught by `next build`).
- **The mapper family:** the canonical availability refusals (P0001 + `'group is resting'` / `'group is suspended'`) map to **409 with the message through verbatim** via one shared `availabilityRefusal()` (`lib/groups/http.ts` — SQLSTATE + canonical-message keyed, open set), consulted first by `mapForumError`/`mapForumOwnMutationError`/`mapAnnouncementError`/`mapContractError` and by the groups-scoped write handlers that had no P0001 branch (settings PATCH, role create, invite send/cancel ×2, invitation accept/decline); every non-availability case keeps its existing mapping (flat-threading P0001 stays 400 — pinned).
- **W-7 wiring completed:** every groups-client **write** transport now throws via `throwFromWrite` → `requestAccountStateRecheck()` on 401/403; reads and 409s never fire it (both pinned). No fetch-wrapper refactor (the named rabbit hole stands).
- **STORY-6:** member plane — "Rest this group"/"Wake this group" in the group panel's management row, gated purely on the `rest_group` capability flag, ConfirmModal with honest consequences (the "rest" verb); refusals render in place. Admin plane — the FEAT-H035 surface's actions became the mode choice (active → Rest | Suspend; resting → Wake | Suspend; suspended → Reactivate), two new BFF routes on the H035 mapping shape, `resting` in both admin STATUS_STYLES vocabularies; dated pointer added to FEAT-H035.
- **Placement resolution (recorded):** there is no standalone group settings *page* — the panel's management actions row IS the settings surface, so the Rest/Wake control lives there (reachable regardless of `edit_group_settings`; a `rest_group` holder without the settings key still gets their control).
- **STORY-7:** both journeys green — `group-availability.spec.ts` (rest → member read-only banner + holder exemption → wake → admin mode-choice suspend → the shell with no leave/no content → reactivate; caretaker-leak delta 0) and `account-suspension-journey.spec.ts` (suspend mid-session → wall **in session, no reload**, via the W-7 refusal-triggered re-check → the W-10 explicit exit to `/login` → sign-in-as-other lands in the normal app). Both **labelled test-after** integrative journey coverage (the house rule); the behaviour-level red-first lives at the unit tier and in the PC023 gate suite. The account journey's wall trigger is the refusal path deliberately: the soft-nav/focus cadence needs the ≥30 s throttle window, and the refusal path is the same revalidator arriving faster while exercising W-8 on the way.
- **Found at the E2E, fixed red-first (the journey's first run caught it):** a suspended member's profile save dies as **28000** — PC003's `update_own_profile` NOT FOUND branch fires because `users_select_active` (`is_active = true`) hides the caller's own row from the `UPDATE … RETURNING` — so the typed-refusal map missed it, the save collapsed to the generic 500, and the re-check never fired. The W-8 map gains **28000 → 401** (message through; the 401/403 re-check then confirms and walls). Substrate wording note routed forward: PC003's `'Not authenticated.'` copy for this branch is stale for the suspended case — a candidate for the sanction-communication family (Eid), not this cycle.
