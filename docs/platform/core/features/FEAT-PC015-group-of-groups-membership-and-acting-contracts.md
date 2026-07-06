# FEAT-PC015: Group-of-groups membership & acting contracts

---
id: FEAT-PC015
title: Group-of-groups membership & acting contracts
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The substrate is nesting-capable by construction — `group_memberships.member_group_id` references any group with no type restriction (`supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql:105-115`), `has_permission()` resolves an engagement group as acting principal at depth-1 (`:419-475`), the auto-role trigger binds a context group's Member instance to any member on `invited→active` (`20260704144630:689-724`), and the legacy oracle proves both member-ness and actor-ness (`hub-legacy/tests/integration/rbac/groups-join-groups.test.ts`, B-D15-002/003). But **no client path exists**: every FIM contract hard-assumes a personal-group member (`invite_member` refuses engagement groups P0002, `20260705090321:84-90`; accept/decline self-scope to the caller's personal group), no wielding key exists in the 39-key catalog (`supabase/seeds/01_permissions.sql`), nominee eligibility admits any active member including DeusEx post-fallback (`20260705072252:214-227`), and no payload distinguishes a system or group member from a person. MEM-10 (Hub §L3:223) has substrate but no doors — and ADR-U041 now defines exactly which doors are legitimate.

## Solution sketch

Contracts-over-proven-substrate, the G-A..G-E pattern: **no new table, no trigger changes, no policy changes** (the permissive `memberships_insert_invite` RLS stays as defense-in-depth, the PC012 residue posture). One additive column (Open Q4). Everything binds to ADR-U041's five clauses.

- **The wielding key (ADR-U041 §1).** `act_as_group` joins the catalog (`01_permissions.sql` group_management block, 39→40 keys) and the Steward Role Template's permission set (`02_role_templates.sql:24-42` IN-list) — seeds + idempotent migration INSERT for existing DBs (the PC010 seeding-repair pattern). Wielding checks are the ADR's two-step walk, enforced inside each wielding contract: `has_permission(caller_personal, A, 'act_as_group')` then the act runs with A as acting principal. No generic sudo surface.
- **Admission is invitation-mirrored.** `invite_group(p_group_id, p_invited_group_id)` — `invite_members`-gated in the context group (same key as person-invites; the target kind is not a new authority), engagement-type targets only (personal/system targets: P0002 no-leak), self-join and direct-cycle refused honestly (Open Q2), duplicate refused; creates the `status='invited'` row (`added_by_group_id` = caller's personal group) so the existing notification trigger and the `invited→active` auto-role-bind fire unchanged. `search_invitable_groups(p_group_id, p_query)` — public engagement groups, ilike, cap 8, `invite_members`-gated — the D3 precedent, tagged **DS-6 re-home seam**.
- **The invited group answers by being wielded (ADR-U041 §2).** `respond_to_group_invitation(p_membership_id, p_accept)` — caller must hold `act_as_group` in the *invited* group; accept flips `invited→active` via UPDATE (the trigger binds the context group's Member instance to A); decline deletes. The wielding human lands in the audit trace (Open Q4). `leave_group_as_group(p_group_id, p_acting_group_id)` — the voluntary exit, wielding-gated, mirroring PC013 `leave_group` semantics: last-active-Steward-of-context refused honestly (transfer first), absent membership P0002.
- **Acting-context reads.** `get_acting_contexts()` — engagement groups where the caller's personal group holds `act_as_group` (id + name; the FEAT-H014 selector's data source). `get_group_memberships_of(p_acting_group_id)` — wielding-gated: where A is member or invited (context group id, name, status) — feeds both the "belongs to" panel and the pending-invitations answer surface.
- **Eligibility hardening (ADR-U041 §4).** `nominate_steward` replaced-in-place again (PC014 precedent): the eligibility loop (`20260705072252:214-227`) additionally requires the nominee's group to be `group_type='personal'` — persons only (Open Q3; subsumes the ADR's system-exclusion minimum).
- **Honest member payloads (ADR-U041 §5).** `get_group_detail` members[] gains additive `member_group_type` (the raw `groups.group_type` of the member — open-set, no mapped enum, Open Q5) and the top level gains `non_system_member_count` (active members whose group_type ≠ 'system'). Close/affordance semantics key on the non-system count Surface-side; substrate refusal guards unchanged.
- Grants follow house posture: `REVOKE ... FROM PUBLIC`, `GRANT EXECUTE TO authenticated`, TRUNCATE revokes carried.

## Appetite

One focused platform session to red-first build + the schema gate. G-F floats value-light — if it swells, first cut is `leave_group_as_group` (removal by the context Steward via existing PC013 `remove_member` already works; voluntary exit can fast-follow).

## Rabbit holes

- **Transitive anything.** Resolution stays the single-hop join (`has_permission` `:437-472`). No recursion, no cycle-*detection* machinery — only the cheap direct-cycle refusal at invite time (Open Q2). Depth>1 is OQ-6 (`docs/products/hub/SPECIFICATION.md:417`), untouched per ADR-U041 §3.
- **Wielding as a mechanism.** No session-level "act as" state, no impersonation tokens. Each wielding contract does its own two-step check. The rule is worded depth-agnostically but implemented one hop.
- **Notification fan-out to key-holders.** The invitation notification row targets the invited group (`notify_invitation_received` resolves names group-side, `20260222:1035`); surfacing it to A's key-holders is the reads' job. No per-holder row multiplication — V3 seam, like D4.

## No-gos

- No transitive resolution beyond depth 1 (OQ-6; ADR-U041 §3). No chained wielding — the wielding actor is always a personal group (ADR-U041 §2d).
- No request-to-join flow (Open Q1 default: invitation-only v1). No group-nominee stewardship succession (Open Q3). No journey group-enrolment surface (JRN-4 — Journeys area).
- No new RLS paths, no realtime (D8), no dispatch.

## Stories

### STORY-1: The wielding key exists
As the platform, I want `act_as_group` in the catalog and on the Steward template, so that wielding authority is an ordinary RBAC grant (ADR-U041 §1).

**Acceptance criteria:**
- Given a fresh seed or the migration on an existing DB, when the catalog is read, then `act_as_group` exists in group_management (40 keys) and the Steward Role Template's set includes it — idempotently (re-run safe).
- Given a group's Steward, when `get_user_permissions(steward_personal, group)` is read, then `act_as_group` is present; a plain Member's read lacks it.

### STORY-2: A Steward invites a group
As a Steward of group B, I want to invite engagement group A as a member, so that group-of-groups membership has a legitimate door.

**Acceptance criteria:**
- Given `invite_members` in B and a public engagement group A, when `invite_group(B, A)` is called, then a `status='invited'` membership row exists (`added_by_group_id` = my personal group) and the invitation notification row targets A.
- Given a personal or system group as target, when invited, then P0002 "group not found" (no enumeration); given A = B, or A already a member/invited of B, or B already a member of A (direct cycle), then `22023` with the specific honest reason.
- Given a caller without `invite_members` in B, when calling, then the house no-leak refusal.
- Given `search_invitable_groups(B, 'nya')`, when called with `invite_members` in B, then at most 8 public engagement groups match ilike, excluding B itself and existing members/invitees.

### STORY-3: The invited group answers through a wielder
As a holder of `act_as_group` in A, I want to accept or decline B's invitation on A's behalf, so that A's memberships are decided by people A empowered (ADR-U041 §2).

**Acceptance criteria:**
- Given a pending invitation of A into B and my `act_as_group` in A, when I accept, then the row is `active`, A holds B's Member-template instance (trigger-bound), and the transition records my personal group in the audit trace (Open Q4).
- Given the same but decline, then the row is deleted.
- Given a member of A *without* the key (or a non-member), when responding, then the house no-leak refusal — B's Steward cannot answer for A either.

### STORY-4: Acting contexts are readable
As a member, I want my acting contexts and a wielded group's memberships readable, so that the Hub can render the selector and A's belongs-to panel honestly.

**Acceptance criteria:**
- Given `act_as_group` in A only, when `get_acting_contexts()` is called, then exactly A (id, name) returns — an empty array for key-less members.
- Given the key in A, when `get_group_memberships_of(A)` is called, then A's member/invited rows return (context id, name, status); without the key, the house no-leak refusal.

### STORY-5: A group can leave
As a holder of `act_as_group` in A, I want `leave_group_as_group(B, A)`, so that A's membership in B is voluntary.

**Acceptance criteria:**
- Given A an active member of B and my key in A, when called, then A's membership, roles in B, and enrolment freeze follow the PC013 leave cascade semantics.
- Given A holds B's last active Steward role, when called, then refused honestly (transfer first); given no membership, P0002.

### STORY-6: Only persons are nominatable
As the platform, I want nominee eligibility restricted to personal-group members, so that stewardship succession lands on people (ADR-U041 §4).

**Acceptance criteria:**
- Given a group with DeusEx as active member (post-fallback), when a Steward nominates DeusEx, then `22023` with the honest reason — same for an engagement-group member (Open Q3).
- Given the replaced function, when the PC014 suite runs, then all prior contracts hold (replaced-in-place, no behavior change for person nominees).

### STORY-7: Member payloads tell the truth
As the Hub, I want `member_group_type` per member row and `non_system_member_count`, so that surfaces can distinguish persons, groups, and the platform (ADR-U041 §5).

**Acceptance criteria:**
- Given a group with a person, an engagement-group member, and DeusEx, when `get_group_detail` is read, then rows carry `member_group_type` = `personal`/`engagement`/`system` respectively (raw, additive) and `non_system_member_count` = 2 while `member_count` = 3.
- Given existing consumers, when the payload extends, then no existing field changes (additive only).

## Platform dependencies

PC-3 substrate throughout (Conformant): `group_memberships` + UNIQUE, the `invited→active` auto-role-bind trigger, `has_permission`/`get_user_permissions` depth-1 resolution, PC013 cascade semantics, PC014 nomination flow (replaced-in-place). Governs: ADR-U041 (all five clauses), ADR-U028 rails, ADR-U006/U007, ADR-U019 (fallback untouched), ADR-U038 (contracts platform-side).

## Cross-product impact

Consumed by Hub FEAT-H018 API-first. The acting-context read is the seam every future surface (Gimbal) uses for the same selector. JRN-4 (group journey-enrolment) becomes buildable later against `get_acting_contexts()` + the wielding walk — Journeys area, not here.

## Vertical impact

- **Privacy/GDPR:** No new personal data. The audit-trace column (Open Q4) records an acting personal-group id on wielded transitions — group-scoped operational data, erasure-covered by the existing membership cascade (`ON DELETE SET NULL` posture).
- **Notifications:** Group invitations ride the existing durable notification rows (recipient = the invited group); no dispatch (V3 seam, D4 precedent). Key-holders read via the new contracts.
- **Administration:** DeusEx unaffected as fallback; clause-4 exclusion makes it un-nominatable. System groups never admissible as invited targets.
- **Observability:** ADR-U041 §2b — wielded transitions carry the acting human at audit level (Open Q4 column); never surfaced as authorship.
- **Transactions:** None.
- **Extensibility:** `act_as_group` is an ordinary catalog key (open set); `member_group_type` exposes the raw open-set column, no sealed enum; no hardcoded group names anywhere (ADR-U018).

## Open spec questions

1. **Admission shape.** Invitation-only v1 (B invites A); no request-to-join. *Default: yes* — mirrors PC012, reuses the proven `invited→active` path.
2. **Direct-cycle refusal.** `invite_group` refuses A=B and B∈A at invite time (cheap depth-1 check); no deeper cycle machinery. *Default: yes.*
3. **Nominee eligibility = persons only** (`group_type='personal'`), stricter than ADR-U041's system-exclusion minimum; engagement-group nominees deferred until a real need. *Default: yes.*
4. **Audit trace as additive column.** `group_memberships.status_changed_by_group_id uuid NULL REFERENCES groups(id) ON DELETE SET NULL`, written by the wielding contracts (and available to PC013 transitions later). *Default: yes.*
5. **Raw `member_group_type`** in payloads (open-set) rather than a mapped kind-enum. *Default: yes.*

## Implementation notes (6-done — Cycle G-F platform half, 2026-07-06)

Built TDD red-first. **Schema gate passed:** Stefan reviewed PR #95 (Open Q1–Q5 defaults as implemented, the four in-default build decisions, the ADR-U038 direct-caller answers) and gave the nod; merged. Consumed by FEAT-H018 (Surface half; its notes carry the Hub side).

- **Migration** `supabase/migrations/20260706120000_feat_pc015_group_of_groups_acting_contracts.sql` (applied to dev + repaired). The `act_as_group` key (catalog 39→40 — the remembered 44 was the legacy count) + Steward-template seed + **instance backfill** (template changes don't propagate to instances; the verification block counts zero missed instances); the Open Q4 audit column; `invite_group` / `search_invitable_groups` / `respond_to_group_invitation` / `leave_group_as_group` / `get_acting_contexts` / `get_group_memberships_of`; `nominate_steward` + `get_group_detail` **replaced in place**. Seeds files updated for fresh-DB parity. **No new table, no trigger changes, no policy changes.** Explicit `revoke from public, anon` per function (the PC014 build-finding-4 default-privileges hazard).
- **Red evidence:** 20/26 red for the documented reasons — including the live contract **accepting a DeusEx nominee** (error null), the exact hole FEAT-H017:139 routed here. The 6 anon-floor guards were red-phase-vacuous (absent function = error) and are labelled guards, never claimed as TDD reds; the migration verification block is the real anon-grant enforcement.
- **Build decisions inside the defaults (gate-ratified):** invite targets are public active engagement groups only (P0002 no-enumeration for everything else); `get_acting_contexts` reads **direct empowerments only** — deliberately not `has_permission()`, so Tier-1 admin reach never floods the selector and chaining cannot exist (ADR-U041 §2d); `leave_group_as_group` refuses last-active-Steward and last-member honestly; decline deletes (PC012 shape, no durable decline trace).
- **Canon collision, resolved same-day:** the PC014 suite's "group-as-member is a valid nominee (ADR-U006 uniformity)" test asserted the posture ADR-U041 §4 deliberately reversed; amended to pin the 22023 refusal, with a Post-6-done amendment recorded in FEAT-PC014.
- **Suite:** `hub/tests/integration/groups/group-of-groups.test.ts` 26/26 green (one test-side fixture fix: groups create private by default; the fixture sets visibility explicitly). Full groups + security regression **190/190**. (`test:integration:rbac` is a phantom path — the parked cooldown cleanup item, bridge `_13`.)
