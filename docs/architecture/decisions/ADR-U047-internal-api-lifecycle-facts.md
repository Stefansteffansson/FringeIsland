# ADR-U047: Internal API inversion — core emits lifecycle facts; domain services own their dispositions

**Status:** Accepted (ratified 2026-07-19, Stefan — "ok merge 182"). Amended 2026-07-19 (A1: fourth fact — user hard-deleted; A2: vertical composition), 2026-08-11 (A3: the declared-composition class) and 2026-09-03 (A4: the member-scoped and group-closed freeze shapes reach `paused` enrolments — Stefan, after "ok merge #601"); see Amendments below.
**Date:** 2026-07-19
**Deciders:** Stefan + Claude (from the [anatomy-conformance audit](../../planning/reference/ANATOMY-CONFORMANCE-AUDIT.md), findings AC-1/AC-2)
**Tags:** scope:platform-core · scope:domain-service · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

The anatomy (ADR-U023) makes Platform Core the domain-agnostic stability zone and the Internal API a one-directional boundary: domain services consume core; core never depends on domain. The 2026-07-19 conformance audit found this violated in code (structure is clean — no core table references a domain table): PC-2/PC-3/PC-4 lifecycle RPCs author DS-3 dispositions inline, naming `journeys`/`journey_enrollments` directly — historically grown across eight migrations (`sprint2_leave_group_core` → `sprint3` nomination handler → `sprint4_platform_exit` → pc013 → pc014 → pc015 → pc002 `_erase_mist`). The crossing was each time a conscious "satisfied-now" disposition (so recorded in pc013's comments) — and it grew with every lifecycle feature because nothing gated it.

W2 characterization (2026-07-19) verified the **live** relocation set against the current schema: the sprint3 nomination handler was already DROPped (`pc014:948`) and the sprint2 leave shape is superseded — **nine live functions across six migrations**:

- **PC-3:** `leave_group` (`20260705115243`), `remove_member` (pc013), `_transfer_stewardship_to_deusex`, `respond_to_stewardship_nomination`, `close_group`, `delete_group` (all pc014), `leave_group_as_group` (pc015)
- **PC-4:** `admin_exit_user_from_platform` (`sprint4_platform_exit` — scenarios L1/L2 map to *member departed*, L3 to *group closed*)
- **PC-2:** `_erase_mist` (pc002) → *personal group erased*

**How should core lifecycle actions (member departs, group closes, user exits, personal group erased) trigger domain reactions without core authoring domain policy?**

## Decision drivers

- **The direction rule itself** (ADR-U023; ARCHITECTURE_ANATOMY §Internal API): core stays domain-agnostic; DS-3's charter owns enrolment/progress policy (thaw-on-activate is already "DS-3's when Journeys activates", per pc014's own comment).
- **Behavior preservation:** the current dispositions are correct product behavior; only their *home* moves (COR-A W4 is behavior-preserving, schema-gated).
- **Atomicity:** cascades are same-transaction today (a removal whose freeze fails must roll back whole) and must remain so — rules out async/queue designs for now.
- **Erasure ordering:** `journeys.created_by_group_id → groups ON DELETE RESTRICT` forces journey disposition *before* the group row delete (the constraint that motivated pc002's inline delete).
- **Mechanical enforceability:** the rule must be regression-guarded by an automated conformance check (COR-A W3) — the contract needs a recognizable ownership convention.
- **Forward pattern:** A-COM (DS-5) and later DS-4 need the same seam — pc014 already tags "pending-DS-4 / pending-DS-5" dispositions it deliberately does not execute.
- **Governance:** Internal-API contracts are ADR-governed (platform/core `CLAUDE.md`; conformance-register rule B8).

## Considered options

- **Option A — Named lifecycle-fact functions**: a per-service family (`ds3_lifecycle_*`), typed parameters, called synchronously by core in-transaction.
- **Option B — Single generic dispatcher**: `ds3_handle_lifecycle_event(p_event text, p_payload jsonb)`.
- **Option C — Domain-owned triggers on core tables**: DS-3 attaches triggers to `group_memberships`/`groups`; core calls nothing.
- **Option D — Status quo**: inline authorship + acknowledging comments.

## Decision outcome

**Chosen option: Option A** — named lifecycle-fact functions, because they keep the contract typed, greppable, and mechanically checkable, while preserving the same-transaction and ordering guarantees the cascades require.

### The contract (initial fact vocabulary, realized in COR-A W4/W5)

| Fact function (DS-3-owned) | Signature intent | Disposition it owns |
|---|---|---|
| `ds3_lifecycle_member_departed(p_group_id, p_member_group_id, p_reason)` | reason ∈ `'left_group'` \| `'removed_from_group'` \| `'left_as_group'` | Freeze the departing member's active enrolments in the group's non-public journeys; stamp `frozen_reason`/`frozen_at` |
| `ds3_lifecycle_group_closed(p_group_id, p_reason) returns jsonb` | reason ∈ `'group_closed'` (`close_group`, admin-exit L3) \| `'group_archived'` (`delete_group`); summary includes `journey_count` | Freeze both shapes (member enrolments in the group's non-public journeys + the group's own group-level enrolments, stamped with `p_reason`); transfer non-public journeys to DeusEx; return the summary core needs for its notification duty |
| `ds3_lifecycle_personal_group_erased(p_personal_group_id)` | must run before the group row delete (FK RESTRICT), same transaction | Hard-delete journeys owned by the erased personal group (Mist/FIM erasure) |

### The rules

1. **Naming and ownership:** the `ds{N}_lifecycle_` prefix is reserved for domain-owned lifecycle-fact handlers. They are SECURITY DEFINER with EXECUTE revoked from PUBLIC/anon/authenticated — a core-internal contract, not a client surface.
2. **Semantics:** synchronous, same transaction; errors propagate (the core action rolls back if a disposition fails).
3. **The boundary rule (W3-enforced):** core may invoke `ds*_lifecycle_*` functions and nothing else domain-side. No PC-owned function, trigger, or policy may reference a DS-owned table. Any function referencing DS tables must itself be DS-owned (explicit allowlist in the conformance test).
4. **Contract stability:** these signatures are Internal-API contracts — changes follow B8 (ADR/amendment + compatibility handling), like any Internal-API change.
5. **Scope exclusion:** writes to `public.notifications` are *not* covered — that table is the Notifications-vertical delivery substrate per [ADR-U048](ADR-U048-notifications-vertical-delivery-substrate.md); writing it from any tier is obligation-fulfilment, not a boundary crossing.
6. **The hook direction, named honestly:** core calling `ds3_lifecycle_*` is a *knowledge* inversion, not a data dependency: core knows a stable hook signature exists (WHEN); the domain owns the reaction (WHAT). Core never reads or writes domain data, never encodes domain policy. If DS-3 were ever extracted, core ships no-op default hooks. This is the Internal API's upward-facing hook surface — the anatomy's data-direction rule (domain consumes core, never the reverse) stays fully intact.
7. **The live predicate divergence, recorded not silently fixed:** `leave_group_as_group` freezes enrolments where `status <> 'frozen'` (`pc015:385`) — so it also freezes `paused`/`completed` enrolments — while every other live site freezes `status = 'active'` only. A W2 characterization test pins this behavior before relocation; W4 preserves it verbatim, and aligning it to the `active`-only shape is a behavior change requiring its own decision + test. (An earlier draft of this rule recorded a divergence at the sprint3 nomination handler; W2 verification showed that function was already dropped by `pc014:948` — its successor `respond_to_stewardship_nomination` uses the standard member-scoped shape.)

### Consequences

- **Positive:** core is domain-agnostic again and stays that way (W3 conformance test as a permanent gate); DS-3 owns freeze/thaw policy end-to-end — the thaw work it already owns now has its other half; A-COM builds DS-5 dispositions on the same pattern (`ds5_lifecycle_*` for the pc014 pending-DS-5 tags) instead of inheriting the crossing; the service-extraction path is preserved.
- **Negative:** one extra function frame per lifecycle action (negligible in-monolith); nine live functions churn in one behavior-preserving migration (schema gate); two places to read a lifecycle flow (core action + domain disposition) — the same trade ADR-U038 accepted for the BFF, guarded the same way (discipline + gate).
- **Neutral:** runtime behavior and performance unchanged — the same statements execute in a new frame.

## Pros and cons of each option

### Option A — named lifecycle-fact functions (chosen)
- Pros: typed, self-documenting call sites; prefix convention makes the W3 conformance allowlist mechanical; per-fact evolution; ordering explicit at the call site (erasure-before-delete stays visible).
- Cons: core names domain hook functions (addressed by rule 6); vocabulary must be curated (that is what an ADR-governed contract is for).

### Option B — single jsonb dispatcher
- Pros: one seam, smallest surface.
- Cons: untyped payload contract; dispatch switch inside DS-3 re-centralizes what facts exist; call sites opaque; signature changes invisible to B8 governance.

### Option C — domain triggers on core tables
- Pros: core would not even name the hooks — purest ignorance.
- Cons: control flow hidden (the audit's own discovery cost demonstrates why that hurts); trigger ordering fragile exactly where ordering matters most (erasure before group delete; per-row firing on bulk membership deletes); several facts don't map 1:1 to a single core row change (platform-exit scenarios, closure-with-transfer); core still *causes* the reaction — implicitly instead of visibly.

### Option D — status quo
- Cons: the audit's AC-1/AC-2 in full — the coupling grew sprint2→pc015 because nothing gated it; rejected.

## Links

- Evidence: [anatomy-conformance audit](../../planning/reference/ANATOMY-CONFORMANCE-AUDIT.md) AC-1/AC-2 (all sites, file:line)
- Plan: [anatomy-correction-plan](../../planning/hub-v2/anatomy-correction-plan.md) (W1 = this ADR; W3 conformance test; W4/W5 relocation)
- Related ADRs: U023 (platform decomposition — the direction rule), U038 (substrate-first enforcement; the BFF analogue of rule 6's trade), U048 (notifications scope exclusion), U030 (v2 rebuild)
- Canon: ARCHITECTURE_ANATOMY §Internal API, §Platform Core; DS-3 charter (docs/platform/domain/)

---

## Amendment 1 (2026-07-19) — fourth fact: user hard-deleted

**Status:** Accepted
**Date:** 2026-07-19
**Provenance (recorded honestly):** surfaced by the W3 conformance gate *during* W4 — the gate queries the live catalog, not the audit, and found a **tenth** core author-site the original decision's "nine live functions" (from audit AC-1) missed. The regression gate earning its keep on day one — catching a crossing the human audit undercounted — is precisely the value rule 3 exists to create.

### What changed

W2/W3 verification against the live catalog found that `admin_hard_delete_user` (PC-4 Governance; live shape = the `20260222` rebuild superseded by `20260223171200_fix_rc7_admin_user_ops`) authors a DS-3 disposition inline: on account hard-delete it **reassigns** `journeys.created_by_group_id` and `journey_enrollments.enrolled_by_group_id` from the erased personal group to the `[Deleted User]` sentinel system group (attribution preservation, so content and enrolment history survive the erasure without the deleted user's ownership). This is neither a freeze nor a delete — the three initial facts do not cover it — but it is the same shape of crossing as the other nine: a core lifecycle action triggering a DS-3 journey/enrolment disposition, historically inline because nothing gated it.

### Decision — the contract gains a fourth fact

| Fact function (DS-3-owned) | Signature intent | Disposition it owns |
|---|---|---|
| `ds3_lifecycle_user_hard_deleted(p_personal_group_id, p_reassign_to_group_id)` | core resolves the reassignment target and passes it; synchronous, same transaction | Reassign the erased personal group's owned journeys (`created_by_group_id`) and its enrolment attributions (`enrolled_by_group_id`) to the passed target |

- **The sentinel convention stays in core.** Resolving the `[Deleted User]` system group is a core-owned system-group lookup (same class as DeusEx resolution): core resolves it and passes the resolved id as `p_reassign_to_group_id`; DS-3 owns only the reassignment statements. The handler knows "reassign to this group", never "the `[Deleted User]` group exists" — the fact vocabulary stays domain-agnostic.
- **Behavior preserved verbatim.** `journeys.created_by_group_id` is `NOT NULL`, so core keeps its `COALESCE(sentinel, caller)` fallback when computing the id it passes (guaranteeing non-null); `journey_enrollments.enrolled_by_group_id` is nullable. `[Deleted User]` is a seeded system singleton, so the resolved target is non-null in every reachable state and both statements reassign to that one group exactly as the inline code did.
- **Same discipline as facts 1–3:** SECURITY DEFINER, `search_path=''`, EXECUTE revoked from PUBLIC/anon/authenticated (core-internal, owner keeps implicit EXECUTE), synchronous same-transaction, errors propagate. The reassignment must run before the personal-group delete (the same `created_by_group_id → groups ON DELETE RESTRICT` ordering that governs fact 3).

### Consequences

- The W3 conformance gate now asserts **all ten** core author-sites — the day-one allowlist exception is removed. A standing "known offender" exception would be exactly the "satisfied-now" pattern (audit AC-1's own diagnosis) that COR-A exists to end, so it does not ship.
- The initial fact vocabulary is now four, not three; the `ds{N}_lifecycle_` naming/ownership rule (rule 1) and the boundary rule (rule 3) are unchanged — the amendment adds a fact, it does not alter the rules.
- Register note: audit AC-1's site count moves from nine to ten (the tenth found by the gate, not the audit) — for the register annotation pass.

---

## Amendment 2 (2026-07-19) — vertical-obligation composition

**Status:** Accepted (rides PR #191's named schema-gate approval — one approval covers the W8 migration + this amendment, the PR #188 / Amendment 1 pattern)
**Date:** 2026-07-19
**Provenance (recorded honestly):** surfaced by COR-A W8 (the platform-side GDPR export composite, audit AC-4) colliding with the W3 conformance gate. W8 makes `get_own_data_export()` (PC-4) compose the journal and walks datasets by *calling* `get_own_journal_export()` (DS-7) and `get_own_step_instances_export()` (DS-3) — which rule 3 as written ("core may invoke `ds*_lifecycle_*` functions and nothing else domain-side") does not permit, even though the composition reads no DS table and mutates nothing. The rule was scoped to the lifecycle seam it was written for; the export composite exposed the class it had not yet named.

### What changed — rule 3 gains one tightly-bounded carve-out

A platform function that fulfils a **cross-cutting vertical obligation** (ADR-U002: Administration · Privacy/GDPR · Notifications · Observability · Transactions) may **compose domain services' published read contracts**, because a vertical obligation spans every tier *by definition* — completeness across tiers is the obligation itself. This is the **read-side mirror of ADR-U048's write-side ruling** (writing `public.notifications` from any tier is obligation-fulfilment, not a boundary crossing): there, every tier may *write into* a vertical's delivery substrate; here, a vertical's fulfilment point may *read out of* each service's own published contract.

**Bounds (all three required):**

- **(a) Declared, not implicit:** each such function is declared **by name** in the W3 conformance test's vertical-composition allowlist, with the vertical and the concrete obligation cited. An undeclared composition is a rule-3 violation, carve-out or not.
- **(b) Read-only, contract-only:** the composition may only call each domain service's **own published export/read contract** — never access a DS-owned table directly, never invoke a lifecycle mutation. Rule 6's knowledge-inversion framing holds unchanged: this is a contract call, not a data dependency; core still never reads or writes domain data directly.
- **(c) One substrate home per dataset:** the composite **calls** the owning contract, never inlines its SELECT logic — each dataset keeps exactly one substrate home (the ADR-U038 sole-home discipline).

### First allowlist entry

| Function | Vertical | Obligation |
|---|---|---|
| `get_own_data_export()` (PC-4) | Privacy/GDPR | Whole-account export completeness (Art. 15/20 right of access; audit AC-4 — one RPC returns the complete document so no surface re-implements the merge) |

### Consequences

- Rules 1–7 are otherwise unchanged; the lifecycle-fact vocabulary is untouched. The carve-out covers *vertical-obligation reads* only — any new lifecycle-shaped crossing still requires a new fact function, never an allowlist entry.
- The W3 conformance test carries the allowlist as a distinct, cited category (not merged into the DS-owned list) so every carve-out use remains visible at the gate.
- In the same change the W3 test's table matching is tightened to schema-qualified references (`public.<table>`, word-bounded): `search_path = ''` is mandatory in substrate code, so every real relation reference is schema-qualified, and bare-name matching false-positives on jsonb key literals (the W8 composite's `'journeys'` document key — PR #191).

---

## Amendment 3 (2026-08-11) — the declared-composition class; the manifest becomes the contract registry

**Status:** Accepted (ruling R-7, Stefan, 2026-08-11 — Cycle COR-D W1, from [Audit IV](../../planning/reference/ANATOMY-CONFORMANCE-AUDIT-4.md) findings AC4-2/AC4-3/AC4-4/AC4-5)
**Provenance (recorded honestly):** ADM-D/ADM-G shipped a deliberate pattern — PC-4 admin contracts wrapping sealed DS-5 moderation bodies, "the rider ownership split" — that rule 3 as written does not permit, justified in-repo only by a planning-doc line ("the composition IS the design; conformance gates green on the shape"). The gates were green because they enforced only the **table** half of rule 3; the **invocation** half had no check (Audit IV GC-15), and the area gate's acceptance leaned on exactly that blind spot. Same class, one more site: PC-1's `get_platform_statistics` composing `ds3_stats_snapshot()` (AC4-3). Two of the moderation callees **mutate**, which Amendment 2's read-only carve-out is structurally unable to legalise. This amendment ratifies the pattern with bounds and ships the gate that makes the bounds mechanical — the same day, red-first.

### What changed — rule 3 gains the declared-composition class

A core-class function realising a client-facing platform contract for a cross-cutting vertical obligation (ADR-U002) may **call** a domain service's sealed contract functions, under **all** of:

- **(a) Declared, per pair.** Every (caller, callee) pair is declared in `supabase/ownership.manifest.json` → `exceptions.declaredCompositions`, with the vertical and the concrete obligation cited. An undeclared composition is a rule-3 violation, class membership or not — bound (a) of Amendment 2, unchanged.
- **(b) Sealed body, own tables only.** The callee is DS-owned, EXECUTE revoked from client roles (reachable only through the wrapper), and references only its own service's tables — the table half of rule 3 applies to it unmodified.
- **(c) Mutation only as the obligation itself.** A mutating callee is permitted only when the mutation *is* the declared vertical obligation (Administration's moderation actions are the founding case). Amendment 2's read-only compositions remain the default class and are unchanged.
- **(d) The wrapper owns the wall.** Authorization, input vocabulary, presentation contract, and audit duty live at the core wrapper; the body owns the domain reaction — the ADR-U038 clause-1 trade, one level down, guarded the same way.

### The registry home (resolves AC4-4 / AC4-5)

The **manifest is the single living registry** of Internal-API contract instances: `exceptions.declaredCompositions` (this class), `verticalComposition[].composes` (the A2 class), and the new `exceptions.lifecycleFacts` — the fact vocabulary's current set, superseding this ADR's own tables as the live list. Division of labour, pointer-not-snapshot: the ADR family defines the classes and declares each new fact or composition as it is ratified; the manifest carries the current set; the W3 conformance family asserts the live catalog against the manifest. No prose list in any ADR is load-bearing again.

Two facts gain their ADR-grade declaration here (AC4-4): `ds5_lifecycle_group_closed` (shipped Cycle C-E, referenced by ADR-U050 §4 as the deletion seal) and `ds5_lifecycle_user_hard_deleted` (shipped at feature level). With the four U047/A1 facts and ADR-U050's `ds3_/ds7_lifecycle_account_deleted`, the registered vocabulary is **eight**.

### Initial declaredCompositions entries

| Caller (core) | Callee (sealed, DS-owned) | Vertical | Mutation |
|---|---|---|---|
| `admin_get_content_reports` | `ds5_moderation_list_reports` | Administration | no |
| `admin_get_content_report_detail` | `ds5_moderation_report_detail` | Administration | no |
| `admin_resolve_content_report` | `ds5_moderation_resolve_report` | Administration | **yes** — bound (c) |
| `admin_moderate_group_forum_post` | `ds5_moderation_moderate_group_post` | Administration | **yes** — bound (c) |
| `get_platform_statistics` | `ds3_stats_snapshot` | Observability (ADR-U052 posture) | no |

### Consequences

- The W3 conformance family gains the **invocation axis** (COR-D W2, `classifyInvocations`): core→DS calls fail red unless the callee is a registered lifecycle fact or the pair is declared; DS→DS calls inherit the table axis's direction-plus-citation rule; a `ds{N}_lifecycle_` call to an unregistered name fails red. Demonstrated red on the five then-undeclared live calls **before** these declarations landed — the gate's teeth are the recorded proof, not an assertion.
- Rules 1–7, Amendment 1, and Amendment 2 are otherwise unchanged. A new lifecycle-shaped crossing still requires a new fact; a new composition requires its declaration **before** it ships — the schema-gate checklist line (AB-6 ruling C) already forces the suite run that would catch it.
- The static-match caveat is recorded in the gate itself: dynamic SQL (`EXECUTE format(...)`) would evade callee matching; none exists live today, absence not proven (Audit IV honesty log).

## Amendment 4 (2026-09-03) — the member-scoped and group-closed freeze shapes reach `paused` enrolments

**Status:** Accepted (Stefan, 2026-09-03 — "then do the ADR-U047 amendment", after the named approval "ok merge #601")
**Date:** 2026-09-03
**Provenance (recorded honestly):** surfaced by [TASK-JRN-PAUSE-01](../../planning/backlog/tasks/TASK-JRN-PAUSE-01-journey-enrolment-pause-write-path.md)'s ADR-U016 cascade check, the one the task named before any build. `paused` had been a CHECK value with no write path since J-A; the moment it gained one ([FEAT-PD002](../../platform/domain/features/FEAT-PD002-journey-catalogue-and-enrolment-contracts.md) STORY-8), rule 7's recorded shape — "every other live site freezes `status = 'active'` only" — became a hole: a traveller who paused a walk in a group's non-public journey would have kept it out of the freeze when they left, were removed, or the group closed. Two integration cells proved it on the live substrate before the migration (a row paused by admin SQL stayed `paused` through `leave_group` and `delete_group`).

### What changed — rule 7's "active-only" shape is widened, not silently

Rule 7 said aligning the member-scoped shape to anything other than `active`-only "is a behavior change requiring its own decision + test". This amendment is that decision, and the test is the cascade pair in `hub/tests/integration/journeys/journey-enrolment-pause-contracts.test.ts`.

- **`ds3_lifecycle_member_departed`** — the `left_group` / `removed_from_group` branch now freezes `status in ('active', 'paused')` (was `= 'active'`); the `left_as_group` branch is **untouched** — it already froze paused rows (`status <> 'frozen'`, the pc015 divergence rule 7 preserved verbatim).
- **`ds3_lifecycle_group_closed`** — both shapes (member enrolments in the group's non-public journeys; the group's own group-level enrolments) now freeze `status in ('active', 'paused')` (was `= 'active'`).
- Realised by migration `20260903100000` — the two handlers re-issued in place, byte-identical except the three predicates (extracted from `20260719190205` at authoring, not retyped; the migration self-verifies 1 + 2 widened predicates). CREATE OR REPLACE preserved the ACLs; the revokes were re-asserted anyway.

The contract table's row for `ds3_lifecycle_member_departed` reads, from this amendment on, "the departing member's **active or paused** enrolments"; the group-closed row likewise. The signatures, the fact vocabulary, and the reasons are unchanged — this is a predicate widening inside DS-3's own dispositions, exactly the kind of change rule 2 places in the domain service's hands.

### What is deliberately still divergent

- The wielded-exit shape (`left_as_group`) still freezes `completed` rows too; the member-scoped and group-closed shapes still do not. That residual divergence is rule 7's original subject and stands as recorded — a completed walk's disposition on departure is a separate decision, not taken here.
- `withdrawn` rows are terminal and untouched by every shape.

### Consequences

- The frozen shape wins over the paused one: pause is a rest, never a third terminal, and never shelters a walk from a lifecycle fact. FEAT-PD002 STORY-8 and FEAT-H019 STORY-8 record the same rule from the contract and the surface sides; FEAT-PC013 / FEAT-PC014 carry revision lines pointing here.
- Rules 1–7 and Amendments 1–3 are otherwise unchanged.
