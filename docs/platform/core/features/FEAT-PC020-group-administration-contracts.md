# FEAT-PC020: Group administration contracts — the platform finally sees its own groups

---
id: FEAT-PC020
title: Group administration contracts — cross-platform enumeration (incl. the DeusEx-stewarded subset), detail, suspend/reactivate, and stewardship reassignment out of caretakership
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

No platform-side contract enumerates groups at platform scope — Audit III proved it exhaustively (AC3-O8: a sweep of every `get_*group*`/`list_*group*` across 87 migrations found nothing), and the A-NTF re-walk found the consequence (RW-05): **a group handed to FringeIsland becomes invisible to the only party who can act on it.** The DeusEx system group is the caretaker of last resort (ADR-U019), yet its stewardship list has no read. Meanwhile `groups.status` already admits `'suspended'` (CHECK since sprint1) **with zero producers** — ADM-9's suspend slot exists in the schema and nothing can write it. Board AB-5 ratified ADM-8-early; this is cycle ADM-B's platform half (ADM-8 + ADM-9).

### Why Platform Core (PC-4), not PC-3 or a Domain Service

The Hub §L3 rows name PC-3 as the substrate — correct: groups, memberships, roles are PC-3-owned, and this feature adds **no** table. The *contracts* are admin-plane orchestration: platform-admin-gated, audit-writing, composing PC-3 substrate exactly as the admin user ops (PC-4-labelled at TASK-ADMA-01) compose PC-2's. The `admin_*` naming puts them under the mechanical PC-4 pin by design. A Domain home is ruled out twice over (Core substrate below, one-way rule).

## Solution sketch

One migration (schema gate) — four/five SECURITY DEFINER contracts, `SET search_path = ''`, `is_platform_admin()`-gated with typed `42501`, `REVOKE` anon, every mutation writing `admin_audit_log` (pattern (a), `FOR UPDATE` on the target row — the AC3-14 lesson):

- **`admin_get_groups(p_filter text DEFAULT 'all')`** — the ADM-8 list. Filters: `all` (non-personal), `engagement`, `deusex_stewarded` (**the AC3-O8/RW-05 discharge**: engagement groups where the DeusEx system group holds an active membership — the caretaker signal), `suspended`. Row payload: `id, name, group_type, status, member_count, non_system_member_count, deusex_stewarded, created_at` (walked against FEAT-H035 below). No pagination in v1 — platform group counts are dozens; keyset joins when a measurement asks.
- **`admin_get_group_detail(p_group_id)`** — the row + counts + `stewards` (display names of members holding the group's Steward-template role — compose the PC-3 role fabric reads) + `deusex_stewarded` + status timestamps.
- **`admin_suspend_group(p_group_id)` / `admin_reactivate_group(p_group_id)`** — `active ↔ suspended`, engagement groups only; typed refusals on `closed`/`archived`/personal/system targets and on wrong-state transitions; the existing GRP-5 lifecycle badge and member-facing reads pick the state up with **no surface change** (status already flows through them).
- **`admin_reassign_group_stewardship(p_group_id, p_new_steward_group_id)`** — the RW-05 **exit from caretakership**: grant the group's Steward-template role to a named **existing active member** of that group by composing the PC-3 role fabric (`assign_member_role`/`can_assign_role` walls — never reimplemented), and end the DeusEx caretaker membership when a human steward then exists. Composition mechanics verified at build against the live role fabric (cumulative-forward); the member-invitation direction (reassigning to a non-member) is deliberately out — that is an invite flow, not an admin override.
- **Manifest riders:** all functions PC-4 (born classified; the `admin_*` pin binds them mechanically). No new tables — no export-classification change.

## Appetite

Moderate. The enumeration/detail reads are cheap; the risk concentrates in reassignment's composition against the anti-escalation walls and in getting the suspend guards' refusal matrix right. Schema gate applies.

## Rabbit holes

- **Don't reimplement role walls.** `can_assign_role`'s anti-escalation and last-steward protections are the law; reassignment composes them. If composition is refused where the admin story needs an override, that is a finding to surface, not a wall to bypass.
- **Don't invent a group-suspension cascade.** Suspension is a status write; what a suspended group refuses (posts? enrolment?) is enforced by the existing status-aware reads — if a read turns out status-blind, record it as a finding for ADM-C/the gate rather than patching enforcement into this contract.
- **Don't filter by name prefix.** The `deusex_stewarded` filter derives from membership rows, never from `E2E%`-style name matching (the TASK-INT-05 warning made law) — which is also why TASK-INT-05's cleanup precedes this build.

## No-gos

No new tables. No pagination scaffolding. No member-facing surface changes. No bulk operations (ADM-7, deferred). No group deletion (GRP-9 is the Steward's; admin deletion stays unspecced until a row asks for it).

## Stories

### STORY-1: Cross-platform enumeration with the caretaker filter
**Acceptance criteria:**
- Given engagement, system, and personal groups plus one DeusEx-stewarded fixture group (created through the real hand-over path, not fixture SQL), when a platform admin calls `admin_get_groups('all' | 'engagement' | 'deusex_stewarded' | 'suspended')`, then each filter returns exactly the walked-payload rows its name promises, personal groups never appear, and the DeusEx-stewarded fixture appears under `deusex_stewarded` with the flag true.
- Given a non-admin or anon caller, then `42501` / EXECUTE refused respectively — for every contract in this feature.

### STORY-2: Detail
- Given a group with two stewards, when the admin reads detail, then the payload carries the group row, counts, both steward display names, and the caretaker flag; given an unknown id, a typed not-found refusal.

### STORY-3: Suspend / reactivate (the first `'suspended'` producers)
- Given an active engagement group, when suspended, then `status='suspended'`, an audit row exists, and re-suspending refuses typed; when reactivated, `status='active'` + audit row.
- Given a `closed`, `archived`, personal, or system target, then suspend refuses typed and writes nothing.
- Given a suspended group, then the existing member-facing detail read reports the status (the GRP-5 badge's data path — asserted through the *existing* contract, no new surface read).

### STORY-4: Reassignment out of caretakership (the RW-05 exit)
- Given a DeusEx-stewarded group with an active human member, when the admin reassigns stewardship to that member, then the member holds the Steward role, the DeusEx caretaker membership is ended, `deusex_stewarded` reads false, and an audit row records actor + target.
- Given a target who is not an active member of the group, then a typed refusal and no partial state (transactional).

### STORY-5: Producer-driven audit proof
- Given every mutation in this feature exercised through the real contracts, then each has its `admin_audit_log` row (action names fixed at build against the live convention), and append-only holds against the post-change catalog.

## Decomposition verification walk — payload ↔ consumer (FEAT-H035)

| `admin_get_groups` / detail key | FEAT-H035 consumer |
|---|---|
| `id`, `name`, `status`, `group_type` | list rows + status badge |
| `member_count`, `non_system_member_count` | list row counts (the Gracy-honest pair) |
| `deusex_stewarded` | "Platform-stewarded" tab + row flag + detail banner |
| `created_at` | list row age |
| detail `stewards[{display_name, personal_group_id}]` | detail steward list + the reassign picker's "current" state |
| detail `members[{personal_group_id, display_name, is_steward}]` (active human members — migration `20260801130000`) | detail counts block + the reassign picker's candidate list |

Every key has a consumer. *(Amended 2026-08-01 at the TASK-ADMB-02 adjudication: the original walk named `get_group_memberships_of` as the picker source, but that contract returns the memberships **of** the acting group — the PC015 direction — and is `act_as_group`-gated, which an admin does not hold. The build finding is recorded in Implementation notes; the resolution is the additive `members` key above.)*

## Platform dependencies

PC-3 substrate (groups/memberships/roles + the role fabric contracts composed by reassignment; `get_group_memberships_of` for the picker); PC-1 (`is_platform_admin`, SECURITY DEFINER discipline); PC-4 own (`admin_audit_log` pattern (a)). No Domain dependency.

## Cross-product impact

Hub consumes via FEAT-H035 (BFF-wrapped). Gimbal inherits the contracts. The member-facing group surfaces are untouched (suspension visibility rides existing reads).

## Vertical impact

- **Privacy/GDPR:** admin reads expose group metadata + steward display identity already visible in shared contexts; no member content; no new stores (nothing to classify).
- **Notifications:** none in this slice — whether suspension/reassignment notifies affected members is recorded as an ADM-C board question (the V3 trigger review flagged, not silently skipped).
- **Administration:** this *is* ADM-8/9; every mutation audited; reversible by design (suspend↔reactivate), reassignment composes the existing protections.
- **Observability:** contracts emit through the BFF's durable telemetry (FEAT-H035); mutations audited; refusals typed.
- **Transactions:** none.
- **Extensibility:** `p_filter` is an open TEXT namespace (unknown filter → typed refusal listing none — no sealed enum baked into consumers); status vocabulary stays the existing CHECK's.

## Performance budget

N/A (no surface). Reads are admin-only, dozens of rows; FEAT-H035 carries the page budgets.

## Implementation notes (built 2026-08-01, Cycle ADM-B)

- **Closed 6-done 2026-08-01:** both migrations applied to the dev DB on named approvals (PR #363 → `20260801120000`, PR #364 → `20260801130000`), migration history repaired. Post-apply verification: the feature suite green **30/30** after the first migration and **32/32** after the members-array amendment; the two manifest conformance gates green 11/11 (the five functions born classified PC-4, the `admin_*` pin holding); the composed reassignment passed against the live role fabric exactly as the analytic verification predicted (`can_assign_role` with the true actor via Tier-1; `prevent_last_leader_removal` verifying the caretaker teardown). Consumed by FEAT-H035 the same day.

*(The remainder of this section was recorded at the schema gate, before apply.)*

- **Migration:** `20260801120000_adm_b_pc020_group_administration_contracts.sql` — five functions + ACLs, strictly additive. Red demonstrated 2026-08-01 before the migration existed: 29 failed / 1 passed of 30 (`PGRST202` function-absent on every producer case; the single green is the labelled carried-forward append-only catalog pin). Suite: `hub/tests/integration/admin/group-administration-contracts.test.ts` (activates `test:integration:admin` for the first time).
- **Audit action names (fixed at build):** `group.suspend` · `group.reactivate` · `group.reassign_stewardship` — the dotted namespace, matching the tree's NEWEST convention (PC019's `auth.*`/`mist.*`); the older mass is snake_case (`admin_hard_delete_user`, …). Decision recorded here because the tree is genuinely split.
- **Composition finding (cumulative-forward, the §Rabbit-holes clause exercised):** `assign_member_role` cannot be composed *whole* by the admin plane — its member-or-public visibility predicate (PC011, `20260704090434:503-506`) refuses any non-member caller with `P0002` **before** its permission walls are reached, and a platform admin is definitionally outside member visibility for private groups. The permission walls themselves were verified live (2026-08-01, dev DB): DeusEx's role grants are a strict superset of the Steward template (all 34 template permissions ⊆ DeusEx's 48, `assign_roles` included), so a platform admin passes `has_permission`/`can_assign_role` via Tier-1. Resolution: `admin_reassign_group_stewardship` composes the walls individually — `can_assign_role` with the **true actor** (the fabric's own anti-escalation primitive and refusal), the fabric's active-member predicate with its own `22023`, and `prevent_last_leader_removal` verifying the caretaker teardown (a human steward exists before the delete — the wall passes legitimately, never bypassed). This is a *finding recorded*, not a wall bypassed: no wall's logic is reimplemented, and the visibility scoping keeps doing its member-plane job.
- **Payload walk resolutions (divergences found at build):** (1) detail "status timestamps" carried by the row's `created_at`/`updated_at` — no walked consumer asked for more and no new column is in scope; (2) the §Solution "four/five" hedge settles at **five** contracts; (3) `p_new_steward_group_id` is a **personal-group id** (membership identity), matching `stewards[].personal_group_id`; (4) `stewards[]` carries **human stewards only** — the caretaker is carried by `deusex_stewarded` (walked to the H035 banner), so a caretaker group reads flag-true with an empty steward list.
- **FINDING for FEAT-H035 (TASK-ADMB-02) — the walked picker source does not serve:** the walk (§Decomposition verification) names `get_group_memberships_of` as the reassign picker's candidate list, but that contract returns the memberships **of** the acting group (which groups it belongs to — the PC015 direction), not the members of a group, and it is `act_as_group`-gated on the acting group, which an admin does not hold. **ADJUDICATED** (Stefan, 2026-08-01, at TASK-ADMB-02 entry): additive `members` jsonb key on `admin_get_group_detail` — active human members `{personal_group_id, display_name, is_steward}` — via migration `20260801130000` (red demonstrated between the two migrations: 2 failed / 30 passed, `members` undefined). The walk table above is amended to match.
- **Notifications (V3):** the reassignment grant fires the existing `notify_role_assigned` trigger, so the new steward receives the durable role-assigned notification for free; whether suspension/reassignment notifies *other* affected members remains the recorded ADM-C board question.
- **Non-goal honoured:** no group-suspension cascade — what a suspended group refuses rides the existing status-aware reads (GRP-5's badge is vocabulary-tolerant and renders `suspended` with zero surface change, asserted through the *existing* `get_group_detail` in STORY-3).
