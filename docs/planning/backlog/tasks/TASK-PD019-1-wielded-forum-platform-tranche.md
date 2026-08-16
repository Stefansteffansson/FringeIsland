---
id: TASK-PD019-1
title: Tranche 1 platform build — the two-limb gate reaches the three forum contracts, wielded writes stamp the group, the ladder learns group authors
status: done — built and verified 2026-08-16 (red-first 13 red / 2 labelled guards -> 15/15; communication slice 9 suites 133/133; conformance gates 30/30; two labelled sibling adaptations); MERGED at the schema gate on named approval ("ok merge PR #551", Stefan, 2026-08-16; all three PR checks SUCCESS; mergedAt verified) — PR #551. The migration-history repair (`migration repair --status applied 20260816120000`) executed post-merge — no outstanding steps. Tranches 2/3 + FEAT-H046 remain separate pulls; feature maturity stays 5-in-cycle
assigned_to: claude
priority: high
feature: FEAT-PD019
owner: platform/domain/communication (DS-5)
wave: unassigned
cycle: 2026-08-16 session
depends_on: []
estimated_hours: one focused session (the spec's appetite; tranches 2/3 are separate pulls)
---

# TASK-PD019-1 — wielded forum, platform half

One task for tranche 1 (STORY-1/2/3). Tranches 2 (group conversations) and 3 (announcements) are pulled separately by wave-planning; the Hub half is FEAT-H046's own session.

## Build map (mechanism facts pinned 2026-08-16, this session)

- **The three re-issues are DROP + CREATE, not CREATE OR REPLACE** — each gains `p_acting uuid DEFAULT NULL` as a trailing parameter, and a same-name overload would leave the old arity alive beside it (the `20260706150000` lesson, restated in its header). ACLs re-stated from the **applied** objects (probed 2026-08-16): `authenticated` + `service_role` hold EXECUTE on all three; PUBLIC/anon revoked.
- **New internal helper `ds5_assert_wielded_content_gate(p_actor, p_acting_group_id, p_context_group_id, p_permission_name)`** — the ADR-U041 two-limb gate, shared by the three contracts (and tranches 2/3 later). Limb 1: the caller personally holds `act_as_group` in the acting group (S5 posture: keyless learns nothing). Limb 2: the acting group is an active engagement-group member of the context AND itself holds the content permission there (`has_permission` is already group-to-group). Refusals are 42501 with copy naming the failing limb. ACL: internal (revoked from authenticated, like `ds5_resolve_author_display`); registers in `supabase/ownership.manifest.json` under DS-5.
- **Ladder rebased on `20260815190000` (TASK-DM-02) verbatim** — the identity gate widens: resolvable = personal group with live non-decommissioned backing users row OR engagement group; resolvable returns gain additive `kind: 'person' | 'group'`; rung 3 stays byte-identical (no `kind` — 'Unknown' claims no kind).
- **Wielded writes**: `author_group_id = p_acting`; `assert_group_writable` runs with the acting group as subject (pure substitution — the group's own `rest_group` standing governs, not the wielder's).
- **Sibling assertions named by the sweep (2026-08-16)**: `forum-contracts.test.ts:443` (rung-2 person author, exact-equality) and `:449` (rung-2 sender via `get_conversation_detail`) — **adapted** (gain `kind: 'person'`); `forum-contracts.test.ts:513` and `member-erasure-disposition.test.ts:337` (rung-3 'Unknown', exact-equality) — **deliberately left** (they are now the guard that rung 3 stays kind-less).

## Acceptance check

FEAT-PD019 STORY-1/2/3 ACs, red-first: wielded read serves a byte-shaped payload under both limbs; each limb's failure refuses 42501 naming the limb (keyless / no standing / no permission), never leaking content; wielded post and reply land `author_group_id = A` and the read serves them; the no-acting calls stay byte-identical (additive default); group authors render `{name, 'active', kind: 'group'}`, former `{'Former member', 'former', kind: 'group'}`, person authors gain `kind: 'person'` otherwise byte-identical, sentinel/system stay rung-3 'Unknown' exactly as today (labelled guard, green in the red run); Mist with `p_acting` refused (FIM-only precedes the limbs). Sibling sweep applied; conformance gates green; migration holds at the schema gate (status `review`, merge only on named approval).
