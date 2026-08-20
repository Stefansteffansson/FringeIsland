---
id: TASK-PD019-3
title: Tranche 3 platform build — the three community-announcement contracts learn wielding; the PD020 interplay proven by cell
status: in-progress
assigned_to: claude
priority: high
feature: FEAT-PD019
owner: platform/domain/communication (DS-5)
wave: unassigned
cycle: 2026-08-20 session (same-day pull after the conversations walk)
depends_on: [TASK-PD019-2R]
estimated_hours: small (three re-issues; the family's last tranche)
---

# TASK-PD019-3 — wielded announcements, platform half

STORY-5 firmed at pull (walk findings in the spec — no board forks: retraction is a role power already; the platform arm refuses structurally). The Hub half rides its own pull after the gate.

## Build map

- **Three DROP + CREATE re-issues** with trailing `p_acting uuid DEFAULT NULL` (bodies from applied definitions; ACLs `{authenticated, service_role}` re-stated; DO-block verification): `get_group_announcements` (limbs 1+2a — membership is the family's bar), `send_community_announcement` (limb 2b = `send_announcements`), `retract_announcement` (community arm limb 2b = `send_announcements`; platform arm never wielded — NULL scope refuses at limb 2a).
- **The wielded send's two carried consequences:** fan-out excludes BOTH `v_actor` and `v_me` (dual actor exclusion — one act, two identities); payload `sent_by_group_id = v_actor` (A — the FIM-visible payload must not leak the person; the wielder stays in the platform audit path only). `retracted_by_group_id = v_actor` on wielded retract. Availability-guard subject = the actor of record (the T1 ruling carried).
- **The PD020 interplay proven by cell:** a wielded send into a group with another engagement-group member asserts (a) person members get personal rows naming A, (b) neither A nor the wielder gets a row, (c) the other group's row expanded to its key-holders' personal rows, (d) **zero group-addressed notification rows survive**.
- Sibling sweep at migration time; header names what it invalidates.

## Acceptance check

STORY-5's ACs red-first in `wielded-announcement-contracts.test.ts` (PGRST202 reds; guards labelled); communication + platform slices green; migration holds at the schema gate (status `review`, merge on named approval). Completing this tranche makes FEAT-PD019 platform-complete; maturity to `6-done` rides the gate-close commit with the L4 rows.
