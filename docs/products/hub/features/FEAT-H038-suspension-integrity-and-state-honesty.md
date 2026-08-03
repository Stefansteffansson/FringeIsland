# FEAT-H038: Suspension integrity and state honesty — the walk's fix family lands

---
id: FEAT-H038
title: Suspension integrity and state honesty
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Stefan's live walk (2026-08-02→03) found the suspension family honest at the substrate and dishonest at the surface, and his directive made the family committed fix work ([findings](../../../planning/hub-v2/2026-08-02-admin-live-walk-findings.md); board rows RB-7/RB-8, [plan](../../../planning/hub-v2/phase-3-platform-ops-completion-plan.md)). Each fault is site-anchored (Hub dossier 2026-08-03):

1. **W-7 — suspension is invisible in-session.** `AccountStateContext` reads account state once per session (`hub/lib/account/AccountStateContext.tsx:43-78`); no soft-nav, focus, cadence, or refusal-triggered re-check exists — `reload()` (`:41`) has exactly two callers, both manual. A suspended member browses on boot-time "active" until a hard load.
2. **W-8 — refusals are honest but mute.** `hub/app/api/profile/me/route.ts:81-89` collapses everything non-validation to a generic 500 `"Failed to update profile"` — the typed SQLSTATE from `update_own_profile` (`hub/lib/profile/queries.ts:187-188` throws it intact) dies at `:88`. Five sibling BFF libs already have the mapping idiom (`hub/lib/announcements/http.ts:11-27` et al.); this route predates it.
3. **W-9 — `hub.adminEntry` bleeds across users, bidirectionally (photographed).** `hub/components/shell/AccountMenu.tsx:30-55` caches the admin-entry probe verdict in sessionStorage keyed by nothing, inline in the component — the one cache that escaped the cache-registry sweep (`hub/lib/auth/cache-registry.ts`) because it doesn't live in a `lib/*/client.ts` module. Never invalidated on sign-out, sign-in, grant, or revoke.
4. **W-10 — the suspended wall's exit is findable only by luck.** `app/layout.tsx:34-36` wraps every route in `AccountStateGate` with no allowlist, so `/login` bounces to the wall; the wall's Sign-out button (`AccountStateGate.tsx:17,27` → bare `signOut`) ends the session but never navigates — the member stays parked on the wall's URL, and the button reads as part of the error.
5. **W-3's surface half.** The paired FEAT-PC023 gives suspension teeth; the Hub must render them — the suspended chip is impossible on the groups list today (`get_member_groups` carries no status until PC023's additive key), and the new typed refusal must reach member copy.

## Solution sketch

Extend house patterns, never invent: the cache-registry idiom for W-9, the `mapAnnouncementError` idiom for W-8, the `AccountMenu` sign-out-then-navigate idiom for W-10, and `AccountStateContext` grows the revalidation it was built to hold for W-7 (soft-nav + visibility/focus, throttled, plus an exported refusal-triggered re-check). W-3 surfacing rides the existing BFF mappers and the list chip consumes PC023's new key.

## Appetite

The Hub half of cycle HYG-A, alongside FEAT-PC023. Five small, independent fixes — the value is in the tests that pin each leak shut.

## Rabbit holes

- **No shared fetch-wrapper refactor.** No central fetch layer exists; introducing one to serve W-7 is a rebuild-sized detour. The refusal-triggered re-check is an exported hook wired at the write paths this cycle touches; broader adoption is incremental.
- **No route allowlist surgery on the wall.** The gate-wraps-everything shape is deliberate (person-bound wall, proven at the walk); W-10 is copy + navigation, not routing.
- **Revalidation must never block navigation.** Background re-check, stale-while-revalidate; the wall appears on *confirmed* off-state only (the `AccountStateView.tsx:52` optimistic-render revision stands).

## No-gos

- No sanction notifications (Eid, DB-4) — W-7 fixes staleness, not the missing bell.
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

### STORY-5: Suspended-group honesty on member surfaces (W-3 surface half)
As a member of a suspended group, I want every surface to say so and every refusal to explain itself, so that the freeze is legible.

**Acceptance criteria:**
- Given the groups list, when a group is suspended, then its row carries the suspended chip (consuming `get_member_groups.status`, PC023 STORY-7) — parity with the detail surface.
- Given a group-context write in a suspended group (forum post, announcement, message, enrol), when PC023's typed refusal returns, then the surface renders honest member copy naming the suspension — never a generic failure (existing `http.ts` mappers extended with the `'group is suspended'` case).

### STORY-6: Wired, gated, observable
As the Hub, I want the family under the standing gates, so that the fixes stay fixed.

**Acceptance criteria:**
- Given the cycle's tests, when the suites run, then each W-fix has a red-first unit pin and the E2E journey covers suspend → in-session wall → explicit exit → sign-in-as-other (the walk's scenario, automated); token + axe green; `next build` green.

## Platform dependencies

FEAT-PC023 (paired): the typed refusal contract + canonical message, and the `get_member_groups.status` key (STORY-5 consumes both). STORY-1..4 have no platform dependency and can build ahead of the gate.

## Cross-product impact

None outward. The Gimbal inherits the enforcement substrate by construction; state-honesty UX will be its own surface work.

## Vertical impact

- **Privacy/GDPR:** No new data collected. W-9's fix removes a minor cross-user state disclosure (another user's admin-entry verdict).
- **Notifications:** None (the Eid deferral pointer stands).
- **Administration:** None — admin surfaces untouched; the family makes admin ceremonies legible member-side.
- **Observability:** Refusal-surfacing paths keep their BFF telemetry mirror; the revalidation re-check emits no new durable events (Q2 criteria — no consumer).
- **Transactions:** None.
- **Extensibility:** The refusal-copy mapping keys on SQLSTATE + canonical message, open to new cases; no sealed lists.

## Performance budget

- **First-paint class:** unchanged — B3/B4 paths gain no blocking reads (revalidation is background, stale-while-revalidate; boot path untouched, ADR-U042 slice adoption unchanged).
- **Interaction class:** the exit affordance and profile save stay under B5 (200 ms to next paint) — mapping is synchronous; revalidation never sits on the interaction path.
- **Loading states:** unchanged; the wall renders on confirmed state only (no flash-of-wall during re-check).
