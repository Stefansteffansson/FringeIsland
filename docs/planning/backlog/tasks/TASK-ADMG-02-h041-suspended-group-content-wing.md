# Build FEAT-H041 — the suspended-group content wing on /admin/groups/[id]

---
id: TASK-ADMG-02
title: Build FEAT-H041 — the content wing (plane banner + members/forum/announcements/conversations), six BFF routes, the moderate + remove ceremonies, the E2E journey
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H041
owner: hub
wave: ferd
cycle: ADM-G
depends_on: [TASK-ADMG-01]
estimated_hours: 8
---

## Description

The surface half of Cycle ADM-G, per [FEAT-H041](../../../products/hub/features/FEAT-H041-suspended-group-admin-content-view.md). `AdminGroupDetail` gains a content wing rendered **only** when `status === 'suspended'`: the plane banner (admin view, access audited), then four lean new read sections (members with emails + Remove ceremony; forum with tombstone honesty + Moderate ceremony; announcements read-only; conversations list + read-only group-kind message bodies) — never member-section reuse. Four GET BFF routes with `admin.group_*_read` durable telemetry (ids only) + two POST act routes on `getUser()`; four-step admin guard on every route; fresh-per-mount, no session caches, no realtime; honest wing-collapse on the reactivation race. If the gate apply is pending when surface work starts, follow the H039/H040 tranche pattern (shape-tolerant work first, true consumption post-apply) rather than blocking.

## Acceptance criteria

- [ ] STORY-1..6 red-first and green: wing for suspended only (active/resting byte-identical page), plane banner, four sections rendering the contracts' payloads, both ceremonies (W-4 email echo on remove; author + group named on moderate; required reason; consequence stated before the click), honest repaint after acts, wing collapse on reactivation race, non-admin 404 on every new route
- [ ] Durable telemetry asserted in the route suites (four read events, ids only, never content); acts verified against platform-side `admin_audit_log` rows (the BFF adds no second authority — ADR-U038)
- [ ] Route-policy conformance green (no runtime/region exports; `getUser()` on POSTs, `getVerifiedUserId` on GETs); jest-axe clean on new states; tokens only
- [ ] E2E journey per the spec's J-B narrative: suspend → wing → read all four families → moderate (tombstone verified member-side by a second context) → remove (membership gone member-side) → `/admin/audit` shows both rows → reactivate → wing gone, member plane restored; leak check 0→0
- [ ] Performance budget honoured: sections are independent fetch-on-mount reads below the metadata anatomy (never blocking it), B6 skeletons, B5 ceremony feedback
- [ ] Feature-inventory summary + README rows advanced in the same commits as maturity transitions; CHANGELOG(s) owed: root always; hub/ — admin-plane change, check the register precedent (ADM-B..F)

## Technical notes

The wing gate and members data ride the existing `admin_get_group_detail` fetch already in hand (email arrives via PC026's re-issue — `AdminGroupMember` type gains `email`). The four reads call the same outer-ring query functions the member BFF uses — the PC026 arms decide access; the BFF adds the admin-plane 404 collapse + telemetry only. Verify `admin_remove_member_from_group(p_group_id, p_target_user_id)` — the target is the **user id**, not the personal group id; the detail payload carries `personal_group_id`, so the remove route must map (check how the ADM-C member console does it) or the ceremony must carry the right id. Remove reason is ceremony-side friction only (PC021's signature carries no reason — verified at build); the moderate reason lands in the PC026 audit row.

## Verification

`npm run test:e2e` (dev server on :3000) — the STORY journey; `npm run test:unit`; `next build` (the type gate); manual: suspend a seeded group → wing → all four sections → moderate → remove → audit → reactivate.
