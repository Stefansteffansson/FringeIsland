# Phase 3 — Groups (A-GRP) completion plan

**Status:** Living plan (v1, 2026-07-03). **Decision board settled 2026-07-03** (Stefan — recommendations accepted; D1 amended by a disk finding, see the board). **Cycle G-A decomposed the same day:** [FEAT-PC010](../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md) (the first PC-3 feature spec) ↔ [FEAT-H013](../../products/hub/features/FEAT-H013-group-creation-and-stewardship.md), both `4-ready`. Governs Phase 3's second area.
**Parent plan:** [`README.md`](./README.md) (Hub v2 rebuild, Phases 0–4). Pattern: [`phase-3-identity-completion-plan.md`](./phase-3-identity-completion-plan.md).
**Wave:** Ferd. **Canonical capability inventory:** [`../../products/hub/SPECIFICATION.md`](../../products/hub/SPECIFICATION.md) §L3 (A-GRP — 19 capabilities: GRP-1..9 + MEM-1..10; there is no GRP-10..19). This plan references it; §L3 is the authority.

---

## Where this picks up

The Identity area closed 2026-07-03 ([retro](../retrospectives/retro-2026-07-03.md)): 10 of 12 capabilities live, IDN-12 parked, IDN-10 a Cycle-F forward-seam (DS-3 + DS-5). Next area in the Phase-3 dependency order: **Groups (A-GRP)** — the social substrate that journey enrolment, communication, and discovery all sit on (§L3 build-order note).

**Starting state, verified 2026-07-03:**

- **Hub side:** only **GRP-4's group-list read path** is realised (FEAT-H001, `6-done`; §L4 coverage note). The other 18 rows are unspecced at L4 — group detail, create/edit, and every membership surface are forward-commitments.
- **Platform side (PC-3 Organisation):** **zero feature specs exist** ([`../../platform/core/features/`](../../platform/core/features/) is all PC-2/PC-4/PD) — but the substrate is the strongest carry-forward in the audit: `groups`, `group_memberships` (8-policy RLS), the three-layer permission model (44-permission catalog, 377 grants realised), `has_permission()`, membership lifecycle functions incl. `leave_group` + the last-leader invariant, `pending_email_invitations`, and the group/role templates are **all Conformant** ([`substrate-audit.md`](./substrate-audit.md)). The PC-3 area spec ([`../../platform/core/organisation-specification.md`](../../platform/core/organisation-specification.md)) is `status: proposed`; its contract surface is PostgREST RPC over SECURITY DEFINER primitives. FEAT-PC IDs are assigned at decomposition (paired-spec rule).
- **Legacy oracle:** STRONG for groups (~80 tests in [`behaviour-inventory.md`](./behaviour-inventory.md) §A-GRP — CRUD, invites incl. email auto-claim, leave/removal cascades, leadership transfer with DeusEx fallback, last-member closure, last-leader protection, display-identity resolution). Two oracle gaps to specify fresh from canon: **former-member attribution (MEM-9)** and **real-time push** (none in legacy).
- **Known substrate debts to ride the first schema-gate migration:** the `FringeIsland Members` + `DeusEx` system groups are **not seeded by active migrations** (dev-DB carried state only — fresh-DB deployability gap, organisation-specification §seeding note); vestigial `Visitor`/`Guest` seed labels rename to **Mist** (substrate-audit).

---

## The 19 capabilities (from §L3, with proposed cycle)

Descriptions + dependencies from `SPECIFICATION.md` §L3 (A-GRP block). Platform-half spec IDs are assigned at decomposition; placeholders here are not canon.

| ID | Capability | Internal dep | External dep (per §L3) | Cycle |
|----|-----------|--------------|------------------------|-------|
| GRP-1 | Create an engagement group (creator becomes Steward) | IDN-3 ✓ | PC-3 | **G-A** |
| GRP-2 | Edit group settings (name, description, branding) | GRP-1 | PC-3 | **G-A** |
| GRP-3 | Configure group + member-list visibility independently | GRP-1 | PC-3 | **G-A** |
| GRP-4 | Group list + group detail view | IDN-3 ✓ | PC-3, DS-3 (enrolment summary in detail) | **G-A** (list read done; detail + seam note) |
| GRP-5 | Display group lifecycle status | GRP-1 | PC-3 | **G-A** |
| GRP-6 | Role templates + custom roles | GRP-1 | PC-3 | **G-B** |
| GRP-7 | Manage member roles | GRP-1, GRP-6 | PC-3 | **G-B** |
| GRP-8 | "Act as" context selector + effective permissions | GRP-4 | PC-3 (`has_permission()` canonical resolution) | **G-B** |
| MEM-1 | Invite an existing FIM (with member search) | GRP-1, GRP-6 | PC-3, DS-6 (search) | **G-C** (D3) |
| MEM-2 | Invite non-FIM by email (pending, auto-claim) | GRP-1, GRP-6 | PC-3, PC-2 (auto-claim), V3 (outbound) | **G-C** (D4) |
| MEM-3 | Accept or decline an invitation | MEM-1/2 | PC-3 | **G-C** |
| MEM-4 | Pause / activate a member's participation | GRP-6 | PC-3 | **G-D** |
| MEM-5 | Remove a member (Steward action) | GRP-6 | PC-3, DS-3 (enrolment freeze) | **G-D** |
| MEM-6 | Voluntary leave (regular) | IDN-3 ✓, GRP-4 | PC-3, DS-3 (freeze), DS-5 (attribution) | **G-D** |
| MEM-7 | Leave with leadership transfer (handover / nominated succession) | GRP-7, MEM-6 | PC-3, DS-3, V3, ADM-* (DeusEx fallback) | **G-E** |
| MEM-8 | Last-member closure with content reassignment | MEM-6 | PC-3, DS-3, DS-5, DS-4 (assets) | **G-E** |
| GRP-9 | Delete a group (Steward; distinct from MEM-8 on intent grounds) | GRP-1, GRP-7 | PC-3, DS-3, DS-5 (forum disposition) | **G-E** |
| MEM-10 | Group joins another group (group-of-groups) | GRP-1, GRP-6 | PC-3 (depth-1 realised; depth>1 = G-29) | **G-F** (D5) |
| MEM-9 | "Former member" attribution after exit | MEM-5..8, GRP-9 | PC-3, DS-5 (authorship layer) | ⛔ **forward-seam** (D2) |

## The cycle sequence (Foundation-first, paired-platform-first)

Same execution shape as Identity: platform half authored to `4-ready` and built through its schema gate first, then the Hub half consumes it API-first; red-first throughout; decompose/build sessions alternate, staying one cycle ahead on specs.

| Cycle | Capabilities | Notes / risks |
|-------|--------------|----------------|
| **G-A — Group CRUD & rendering** | GRP-1, 2, 3, 5 + GRP-4 completion | **Built `6-done` 2026-07-04** (PR at the schema gate); P3a executed alongside. Decomposed 2026-07-03: [FEAT-PC010](../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md) ↔ [FEAT-H013](../../products/hub/features/FEAT-H013-group-creation-and-stewardship.md), both `4-ready`. The boundary NFR bet reshaped at decomposition (D1 amendment): **P2 was already realized** by the ADR-U038 tranche (`get_member_groups()` + the single-RPC route); **P3a executes alongside the G-A build** as its own hardening migration. PC010's schema-gate migration carries the contracts + the ADR-U038 direct-write narrowing on `groups` + the system-groups seeding fix + the vestigial-seed-vocabulary check. GRP-4 detail renders **without** the DS-3 enrolment summary (seam; slot filled at the Journeys area). |
| **G-B — Roles & permissions** | GRP-6, 7, 8 | **Decomposed 2026-07-04:** [FEAT-PC011](../../platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md) ↔ [FEAT-H014](../../products/hub/features/FEAT-H014-group-roles-and-permissions.md), both `4-ready`. Substrate audit at decomposition: the role tables' RLS is already substantively correct (two existing anti-escalation walls — `can_assign_role()` at assignment, the `grp_insert` posture at definition; last-Steward/last-DeusEx invariants; template-derived roles deletion-protected) — so the platform half is contracts-over-proven-rules, **no new table, no policy changes**. GRP-8's effective read is the existing published `get_user_permissions()`; the **act-as selector ships honestly v1** (one context, "Myself") — group-as-actor wielding is unresolved governance, routed to **G-F/G-29** (PC011 Open Q1). ADR-U007 governs the model, ADR-U018 forbids hardcoded group types. |
| **G-C — Invitations & joining** | MEM-1, 2, 3 | Substrate exists (`status=invited` memberships, `pending_email_invitations` token + 30-day expiry + auto-claim). Two seam decisions gate scope: member search without DS-6 (**D3**), outbound email without the V3 channel (**D4**). |
| **G-D — Membership lifecycle** | MEM-4, 5, 6 | Leave/removal cascades incl. non-public enrolment freeze already exist in the Conformant substrate — platform-tier, same reasoning that de-risked IDN-10's cascade (Identity plan §"Why the cross-area worry does not block this"). MEM-6's DS-5 attribution disposition is tagged `pending-DS-5`, not built (D2). |
| **G-E — Leadership transfer & closure** | MEM-7, 8, GRP-9 | Heaviest cycle. Legacy proves the flows (sole-Steward → DeusEx fallback, nomination + expiry, last-member closure, last-leader protection — ADR-U019). DS-4/DS-5 dispositions in MEM-8/GRP-9 are built as **tagged cascade layers** (`done / pending-DS-4 / pending-DS-5`, ADR-U016 pattern), like IDN-10's cascade spec (D2). V3 succession notifications: durable rows now; push rides the Notifications tenant later (D8). |
| **G-F — Group-of-groups** | MEM-10 (depth-1) | Substrate supports nesting; legacy proves group-as-member + group-as-actor. Depth-1 only; transitive resolution beyond depth 1 stays the **G-29** open item (D5). |
| ⛔ **Forward-seam** | MEM-9 | Genuinely blocked on the DS-5 content-authorship layer (Communication area) — there is no member-visible authored content in v2 yet for attribution to render on. Tracked with the same hook set as IDN-10 (D2). |

Order rationale: internal deps force A → B → (C, D) → E; C and D are mutually independent and can swap if a platform half stalls; F is value-light and floats.

---

## Decision board (surface-all-at-once — settled 2026-07-03)

> **Settled 2026-07-03 (Stefan):** all recommendations accepted as written, with one amendment discovered at decomposition — **D1**: the P2 half of the bet turned out to be **already realized** (the 2026-07-02 ADR-U038 tranche landed `get_member_groups()` as exactly the single consolidated RPC P2 called for; `GET /api/groups` makes that one call — verified on disk + dev DB 2026-07-03, [perf backlog updated](./perf-hardening-backlog.md)). The boundary NFR bet is therefore **P3a alone**, executed alongside the Cycle G-A build as its own hardening migration through the schema gate. D6: task files return for every 4-ready feature at build. D7's gap entry landed as **G-36** in the kickoff batch.

**Answered by existing canon (no action needed):**

- **D8 — Realtime in Groups: none.** No A-GRP §L3 row implies realtime; group/invitation liveness rides the **Notifications tenant** under ADR-U039 (ping-then-fetch) when that area lands. Groups builds durable-state + re-read only.
- **D9 — Governance split: ADR-U028.** Group-scope operations (invite/roles/remove/settings) live in-place per group inside A-GRP; universe-scope operations (DeusEx interventions, audit) belong to A-ADM/Console, not this area.

**Defaulting (I'll proceed on these unless overridden):**

- **D5 — MEM-10 ships depth-1.** Legacy-proven, substrate-supported. G-29 keeps the depth>1 transitive-resolution question open; MEM-10's spec notes it explicitly rather than resolving it.
- **D10 — Cycle grouping as tabled above** (G-A..G-F). Reorderable within the internal-dep constraints; the table is a plan, not canon.

**Open — need Stefan's call (recommendation first, per house style):**

- **D1 — Boundary NFR allocation (PROCESS §3 + the perf backlog's own run-window).** *Recommend:* pull **P3a** (RLS `(select auth.uid())` sweep + FK covering indexes + duplicate-policy consolidation — `group_memberships`/`user_group_roles` are among the worst offenders, so it directly serves this area) **and P2** (the `/groups` RPC collapse, folded into G-A as its natural query work) — matching the backlog's own sequencing (P3a → P2 first). P1-remainder, P3b, P4 stay parked. Alternative: P2 only (minimum compliant with "pull ≥1").
- **D2 — What "Groups area complete" means.** *Recommend:* 18 of 19 rows build now; **MEM-9 is the area's only forward-seam** (DS-5), tracked with the full IDN-10-style hook set (parked spec + tagged dispositions + re-entry lines at the Communication gate + gap-register entry). DS-3-dependent freezes count as satisfied-now via the Conformant substrate cascades, **re-verified at the Journeys gate**; DS-4/DS-5 dispositions inside MEM-8/GRP-9 build as tagged cascade layers, not blockers. Alternative: also forward-seam GRP-9/MEM-8 wholesale (delays the heaviest, most oracle-covered flows for no substrate reason).
- **D3 — MEM-1 member search without DS-6.** *Recommend:* a minimal PC-3-side search primitive (legacy-proven ilike typeahead, cap 8, RLS-safe), explicitly tagged as a **DS-6 re-home seam** (§L4 already notes DS-6 "not yet consumed"). Alternative: ship MEM-1 without search (invite by exact identity only) and wait for Discovery.
- **D4 — MEM-2 outbound email without the V3 channel.** *Recommend:* build the pending-invitation record + signup auto-claim now (substrate exists and is Conformant); actual email **dispatch** is a V3 seam that lands with the Notifications area — the invitation is durable and claimable regardless. Alternative: wire a minimal transactional-email path now (drags a whole vertical channel into this area).
- **D6 — Task-file discipline (from the retro).** Cycles B/C ran without task files, against the process as written. *Recommend:* **recommit to task files** for every 4-ready feature (quality/workflow over speed); the alternative — legitimise task-optional single-session slices — is a `type:process` PROCESS.md change, Stefan's call, not a quiet norm.
- **D7 — Finish planting the IDN-10 hooks (retro action item).** Two of four hooks were never planted. *Recommend:* the **gap-register entry** (G-NN: IDN-10 blocked on DS-3 + DS-5, close-conditions per the Identity plan) lands in this kickoff batch; the **parked IDN-10 specs** are authored by the next cooldown at latest.

## Exit checklist — the Groups area gate (planted now)

Per-area gate (parent plan): feature DoD + vertical checklists + tests green. Additionally, at the A-GRP gate:

- **Carried from the Identity plan (verbatim commitment):** confirm IDN-10's group-membership cascade (PC-3) is exercised by the area's membership work; note no IDN-10 close yet.
- Confirm MEM-9's forward-seam hooks are all planted (parked spec, tagged dispositions in MEM-5..8/GRP-9 specs, Communication-gate re-entry line, gap entry).
- Confirm the DS-3 freeze re-verification line is planted at the Journeys gate (GRP-4 enrolment summary + MEM-5/6/7/8 freezes).
- G-29 (depth>1 resolution) reviewed: still open unless MEM-10's build resolved it.
- P2/P3a (if pulled, per D1) verified shipped, not silently dropped.

## After Groups

Per the parent plan's order: **Journeys (A-JRN, 18)** → Communication (A-COM, 15) → Notifications (A-NTF, 10) → Platform-Ops (A-ADM, 18). At Journeys: DS-3 realised → advance IDN-10's enrolment-freeze disposition + fill GRP-4's enrolment-summary seam. At Communication: DS-5 realised → close IDN-10's forum disposition, un-park IDN-10 (Identity Cycle F), and un-seam MEM-9.
