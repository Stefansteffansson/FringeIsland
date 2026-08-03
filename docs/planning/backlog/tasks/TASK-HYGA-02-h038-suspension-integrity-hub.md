# Implement FEAT-H038 — suspension integrity and state honesty (Hub)

---
id: TASK-HYGA-02
title: Implement FEAT-H038 — suspension integrity and state honesty
status: todo
assigned_to: claude
priority: high
feature: FEAT-H038
owner: hub
wave: ferd
cycle: HYG-A
depends_on: [TASK-HYGA-01]
estimated_hours: 6
---

## Description

The Hub half of cycle HYG-A — the walk's fix family: W-9 user-scoped `hub.adminEntry` with a registered invalidator, W-10 explicit wall exit (copy + sign-out-then-navigate), W-8 typed mapping in the profile BFF route (the announcements idiom), W-7 in-session account-state revalidation (soft-nav + focus/visibility, throttled, + exported refusal-triggered re-check), and the two-mode W-3 surface half: "Resting"/"Suspended" labels wherever groups render, resting groups read-only for non-holders with the normal surface for `rest_group` holders (capability-flag driven), the suspended found-but-that's-it shell (no content, no actions, no leave), honest refusal copy through the existing mappers, the steward Rest/Wake control on group settings, and the admin hold ceremony's mode choice (STORY-6; dated pointer on FEAT-H035 at build).

## Acceptance criteria

- [ ] All H038 stories green; each W-fix has a red-first unit pin.
- [ ] Account E2E journey automates the walk scenario: suspend → in-session wall (no hard reload) → explicit exit → sign-in-as-other lands in the normal app.
- [ ] Group E2E journey automates the two-mode model: steward rest → member read-only + holder exemption → steward wake → admin suspend → shell (no content leak, no leave) → admin reactivate.
- [ ] Revalidation never blocks navigation; wall renders on confirmed state only (no flash).
- [ ] Token + axe gates green; `next build` green (the type gate); leak delta 0.
- [ ] STORY-1..4 may build ahead of the PC023 apply; STORY-5 lands only post-apply (needs the status key + typed refusal live).

## Technical notes

Sites (dossier 2026-08-03): `AccountMenu.tsx:30-55` (cache), `cache-registry.ts:29,34` (idiom), `AuthContext.tsx:81-95` (auth-change hook), `AccountStateGate.tsx:17,27` + `AccountStateSurface.tsx:16` + `AccountStateView.tsx:74-81` (wall), `AccountMenu.tsx:84-95` (sign-out-then-navigate idiom), `app/api/profile/me/route.ts:81-89` (the 500 collapse), `announcements/http.ts:11-27` (mapping idiom), `AccountStateContext.tsx:41,43-78` (`reload()` + boot read). No fetch-wrapper refactor (named rabbit hole).

## Verification

`npm run test` (unit, red-first evidence kept), `npm run test:e2e` with dev server, `next build`; manual: the Gracy/Stefan two-user tab scenario cannot reproduce the photographed frame.
