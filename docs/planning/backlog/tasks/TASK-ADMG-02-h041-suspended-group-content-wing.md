# Build FEAT-H041 — the suspended-group content wing on /admin/groups/[id]

---
id: TASK-ADMG-02
title: Build FEAT-H041 — the content wing (plane banner + members/forum/announcements/conversations), six BFF routes, the moderate + remove ceremonies, the E2E journey
status: done
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

- [x] STORY-1..6 red-first and green *(tranche 1 #419: wing suite 12 + route-tier suite 17 demonstrated red module-absent → green; unit 1291/1291)*: wing for suspended only, plane banner, four sections, both reason-required ceremonies, honest repaint, wing collapse on drift, non-admin 404 on every new route (E2E-verified while held)
- [x] Durable telemetry asserted in the NEW route-tier suite (exact event names, exact ids-only props, no-emit on refusals — the pattern established this cycle; none existed before); acts verified platform-side (`admin_audit_log` rows in the PC026 gate suite + `/admin/audit` in the E2E)
- [x] Route-policy conformance green, zero exceptions (per-verb identity convention); jest-axe clean on the wing + the suspended page
- [x] E2E journey 6/6, leak 0→0 — member-side verification sequenced AFTER reactivation (the member plane is quarantined by design while held); two test-side selector fixes labelled (product correct both times)
- [x] Performance budget honoured: first paint unchanged, post-paint fetch-on-mount sections, B6 skeletons, B5 ceremonies; no deep-cold spot owed (no first-paint request added); AB-6 carries the full pass
- [x] Feature-inventory summary + README rows advanced with the 6-done move; CHANGELOGs: root cycle entry + hub/ member-register entry + platform-core (PC026)

## Technical notes

The wing gate and members data ride the existing `admin_get_group_detail` fetch already in hand (email arrives via PC026's re-issue — `AdminGroupMember` type gains `email`). The four reads call the same outer-ring query functions the member BFF uses — the PC026 arms decide access; the BFF adds the admin-plane 404 collapse + telemetry only. Verify `admin_remove_member_from_group(p_group_id, p_target_user_id)` — the target is the **user id**, not the personal group id; the detail payload carries `personal_group_id`, so the remove route must map (check how the ADM-C member console does it) or the ceremony must carry the right id. Remove reason is ceremony-side friction only (PC021's signature carries no reason — verified at build); the moderate reason lands in the PC026 audit row.

## Verification

`npm run test:e2e` (dev server on :3000) — the STORY journey; `npm run test:unit`; `next build` (the type gate); manual: suspend a seeded group → wing → all four sections → moderate → remove → audit → reactivate.
