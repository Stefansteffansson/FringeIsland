# ADR-U047: Internal API inversion — core emits lifecycle facts; domain services own their dispositions

**Status:** Accepted (ratified 2026-07-19, Stefan — "ok merge 182")
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
