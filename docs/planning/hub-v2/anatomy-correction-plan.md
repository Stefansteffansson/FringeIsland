# Anatomy correction plan — Cycle COR-A (+ deferred homes)

**Status:** Draft plan, ready to execute. Successor step to the [anatomy-conformance audit](../reference/ANATOMY-CONFORMANCE-AUDIT.md) (2026-07-19).
**Slot:** the corrective cycle runs **before the Communication area (A-COM) kicks off** — decided by Stefan 2026-07-19, so A-COM builds DS-5 on the corrected Internal-API pattern instead of compounding the crossing.
**Wave:** Ferd. **Cycle name:** COR-A ("corrections"; not an area — the letter scheme stays free for areas).
**Decisions already made (audit §Rulings, 2026-07-19):** R-1 `notifications` = Notifications-vertical delivery substrate (DS-5 takes routing later) · R-2 consent tables = PC-2 · R-3 `content_families` = DS-3 · Tranches I+II before A-COM.
**Finding IDs (AC-1..AC-9) refer to the audit register — the register stays the single source for evidence; this plan does not restate it.**

---

## Shape of the work

One corrective cycle (**COR-A**) carries Tranches I + II plus the cheap, riding parts of III/IV. Two items deliberately do **not** ride: the durable audit binding (AC-6) goes to its natural area home (Platform-Ops), and the per-RPC assurance pass (AC-9) becomes a standing gate row, not a one-off.

| Work item | Finding | Kind | Gate / nod needed |
|---|---|---|---|
| W1 ADR-U047: Internal-API inversion seam | AC-1, AC-2 | design + ADR | **Stefan nod (ADR carve-out)** |
| W2 Characterization-coverage check on lifecycle cascades | AC-1 | tests | — |
| W3 Conformance regression test (written red-first) | AC-1, AC-2 | test | — |
| W4 Relocation migration: PC functions → DS-3 disposition handler | AC-1 | schema | **Schema gate (named "ok merge")** |
| W5 Mist-erasure journey hook | AC-2 | schema | **Schema gate** (may ride W4's migration) |
| W6 ADR-U048: notifications = vertical delivery substrate | R-1 / AC-3 | ADR | **Stefan nod (ADR carve-out)** |
| W7 Rulings doc pass (R-1..R-3) + anatomy stamp + doc-health-check | R-1..R-3 | docs | — |
| W8 Platform-side export composite | AC-4 (+ export half of AC-5) | schema | **Schema gate** |
| W9 Cache-invalidation registry + AC-6 TODO re-date | AC-5, AC-6 | hub code | `next build` type gate |
| W10 Predecessor-register closure annotations | AC-7 | docs | — |
| W11 platform/CLAUDE.md scoping caveat | AC-8 | steering file | **Stefan nod (steering carve-out)** |
| W12 Standing DoD row: per-RPC gate verification at area gates | AC-9 | process | Proposed at COR-A retro |

---

## Tranche I — the Internal-API inversion (AC-1, AC-2)

### W1 — Design note + ADR-U047 (blocks W4/W5)

Design the seam that makes the direction rule real inside the monolith:

- **Core emits lifecycle facts; DS-3 owns the reaction.** Core lifecycle functions stop naming `journeys` / `journey_enrollments`. Instead each calls one DS-3-owned contract — working name `ds3_handle_lifecycle_event(p_event, p_group_id, p_member_group_id, ...)` — and DS-3's body owns the freeze/transfer/delete policy.
- **Event vocabulary to fix in the ADR** (from the audit's seven sites): `member_removed`, `member_left`, `group_left_as_group`, `group_closed`, `leadership_transferred`, `user_exited_platform`, `personal_group_erased`.
- **Design constraints:** behavior-preserving (the current dispositions are correct product behavior — only their *home* moves); same-transaction semantics (the cascades are atomic with the core action today and must stay so — this is a synchronous in-transaction contract, not an async queue); DS-3's handler is SECURITY DEFINER with no client EXECUTE (core-internal contract, not a platform surface).
- **ADR also records** the boundary rule the conformance test enforces (W3), so the rule survives as canon, not just as a test.

Deliverable: `ADR-U047-internal-api-inversion-lifecycle-facts.md` draft → **pause for Stefan's nod** before W4/W5 build.

### W2 — Characterization coverage (parallel with W1)

Before moving anything, confirm the behavior oracle covers every cascade site: map the audit's sites (AC-1 table + AC-2) to existing integration tests (enrollment freeze on removal/leave/closure/exit; journey transfer to DeusEx; Mist-erasure journey delete). Where a disposition is untested, add the characterization test now — green against current code — so W4 is provably behavior-preserving. New-behavior tests (the seam contract itself) follow red-first as usual.

**W2 executed 2026-07-19.** The live relocation set is **nine functions across six migrations** — the sprint3 nomination handler is already dead (dropped `pc014:948`) and the sprint2 leave shape is superseded by `20260705115243`. Coverage: green today for `leave_group`, `remove_member`, the pc014 set (`_transfer_stewardship_to_deusex`, `respond_to_stewardship_nomination`, `close_group`, `delete_group`). Three gaps need green-before characterization tests (specs A–D in the W2 report): **A** `admin_exit_user_from_platform` (all 3 scenarios uncovered; no hub caller found — possibly an orphaned RPC, invoke via service role), **B** `leave_group_as_group` freeze (must pin the pc015 `status <> 'frozen'` predicate, which also freezes paused/completed — the live divergence, recorded in ADR-U047 rule 7), **C** `_erase_mist` journey-delete assertion, **D** (low) decline→DeusEx fallback freeze. Also: `delete_group` freezes with reason `'group_archived'` — the `ds3_lifecycle_group_closed` fact carries a reason parameter accordingly.

### W3 — The conformance regression test, written red-first (before W4)

An automated inner-ring check in the integration suite: query `pg_catalog`/`pg_proc` for every PC-owned function and trigger (owner list = audit Appendix B/C) and assert none references a DS-owned table (`journeys`, `journey_enrollments`, `journey_steps`, `journey_step_instances`, `step_kinds`, `content_families`, `journal_entries`).

Written **before** the relocation, this test is red against today's code — the demonstrated-red for the schema-gate PR — and turns green when W4/W5 land. It then stays forever as the regression gate the 2026-07-02 retro showed we were missing (the crossing grew pc013 → pc014 → pc015 precisely because no gate caught it).

### W4 — Relocation migration (schema gate)

One migration: create the DS-3 disposition handler(s); redefine the **eight live core functions** (`leave_group` — current shape `20260705115243`; `remove_member` — pc013; `_transfer_stewardship_to_deusex`, `respond_to_stewardship_nomination`, `close_group`, `delete_group` — pc014; `leave_group_as_group` — pc015; `admin_exit_user_from_platform` — sprint4) to call the contract (`_erase_mist` is W5); no PC object names a DS-3 table afterwards. Suites from W2 stay green; W3 flips to green. PR held at the schema gate with the red/green evidence and apply commands in the body; **merge only on Stefan's named approval**.

### W5 — Mist-erasure hook (schema gate; may ride the W4 migration)

`_erase_mist` (PC-2) stops deleting `public.journeys` directly; it calls the same DS-3 contract (`personal_group_erased`). Note the FK-ordering constraint that motivated the original inline delete (`created_by_group_id → groups ON DELETE RESTRICT`) — the handler must run before the group delete, same transaction.

## Tranche II — rulings become canon (independent of Tranche I; can run while W1 awaits nod)

### W6 — ADR-U048 (R-1)

Short ADR: `public.notifications` is the **Notifications-vertical delivery substrate** (platform-side; core and domain services alike write it as an obligation, ADR-U002); when the Communication/Notifications areas realise DS-5, DS-5 owns the **routing/preferences layer on top** — the delivery table does not move. Disposition: AC-3 closed. → **Stefan nod.**

### W7 — Rulings doc pass + freshness

- PC-2 spec: consent tables PC-2-owned with governance-adjacency note (R-2, cites ADR-U034).
- DS-3 / DS-4 charters: `content_families` = DS-3 step taxonomy, revisit at DS-4 decomposition (R-3).
- DS-5 charter: delivery-substrate scoping note per ADR-U048.
- `ARCHITECTURE_ANATOMY.md`: stamp moves to ADR-U048 (and its §DS-5/§verticals lines absorb the ruling in one sentence each).
- Then **doc-health-check** (cross-cutting doc change — on-demand trigger).

## Tranche III — contract completeness (the riding part)

### W8 — Export composite (AC-4; schema gate)

Extend `get_own_data_export()` (or add a composing wrapper) so the platform owns export *completeness*: profile/account + journal + step-instance datasets in one contract. `hub/app/api/account/export` becomes a thin proxy again; its journal import disappears (closing the export half of AC-5). Sibling surfaces inherit a complete GDPR export by calling one RPC.

### AC-6 durable audit binding — deferred to Platform-Ops (not in COR-A)

The durable auth-audit recorder (`recordAuditEntry` → `admin_audit_log` via SECURITY DEFINER) belongs to the Platform-Ops area, which owns admin/console work. COR-A only re-dates the stale TODO (part of W9). **Action for the Platform-Ops decomposition: carry a backlog row for the recorder.**

## Tranche IV — hygiene (anytime inside COR-A)

- **W9** — registry-pattern cache invalidation: each area registers its invalidator with auth at module init; `AuthContext` stops importing area cache modules (closes the AuthContext half of AC-5). Plus the AC-6 TODO re-date. Jest + **`next build`** before done (ts-jest/eslint don't full-type-check).
- **W10** — predecessor register (`api-conformance-register.md`): §7 closure entries for S1–S3/F1/F2 citing the migration IDs (the audit's §Verified-closed table supplies them verbatim).
- **W11** — `docs/platform/CLAUDE.md:40,54`: one-line ADR-U038 clause-3 scoping caveat. Steering file → **pause for Stefan's nod**.

## W12 — Standing item (AC-9)

Propose at the COR-A retro: add an area-gate DoD row — "every RPC the area shipped has its permission/lifecycle gates verified against its spec" — folding the exhaustive per-RPC assurance pass into the existing gate rhythm instead of a big-bang audit.

**DECIDED YES (Stefan, 2026-07-19).** Row added to the Phase-3 area-gate DoD (hub-v2 README, Phase-3 gate); applies from A-COM onward. The retro records it.

---

## Execution order

```
W2 (coverage)  ──┐
W1 (ADR-U047) ───┼─ nod ─→ W4 → W5      Tranche I spine
W3 (red test) ───┘

W6 (ADR-U048) ─ nod ─→ W7               Tranche II (parallel to I)
W8 · W9 · W10 · W11 (independent; W11 needs nod)
W12 at retro
```

Suggested sequencing for a session: start W1+W6 (both ADR drafts to Stefan in one review moment), run W2/W3/W10 while waiting, then W4/W5 to the schema gate, then W7/W8/W9, W11 last with the retro (W12).

## Cycle COR-A — Definition of Done

1. W3 conformance test **green**: no PC-owned function/trigger references a DS-owned table.
2. All suites green (characterization + existing pyramid); `next build` clean.
3. ADR-U047 + ADR-U048 ratified; anatomy stamp moved; doc-health-check pass on the changed docs.
4. Audit register annotated: AC-1/AC-2/AC-3/AC-4/AC-5/AC-7/AC-8 closed; AC-6 re-homed to Platform-Ops; AC-9 dispositioned per retro.
5. A-COM unblocked, with the ADR-U047 seam pattern as the documented way DS-5 will consume core lifecycle facts.

## Stefan's touchpoints (everything you'll be asked for, in order)

1. **ADR-U047 + ADR-U048 nods** (can be one review moment).
2. **Schema-gate named approvals** for the W4(/W5) migration PR and the W8 export PR — held with red/green evidence and apply commands per protocol.
3. **W11 steering-file nod** (one line in `docs/platform/CLAUDE.md`).
4. **COR-A retro** — W12 DoD-row proposal, cycle close.

---

*Plan drafted 2026-07-19 from the anatomy-conformance audit. The register (../reference/ANATOMY-CONFORMANCE-AUDIT.md) holds all evidence; amendments to this plan follow the spec-evolution loop (PROCESS.md §9).*
