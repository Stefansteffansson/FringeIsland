# Session bridge — Hub v2 Phase 1 complete (spec refresh, substrate audit, behaviour inventory)

**Date:** 2026-06-17
**Session type:** planning / architecture
**Status:** Closed — Phase 1 deliverables landed; the Phase-1 **gate review** is the open item.
**Participants:** Stefan + Claude

> Picks up from `2026-06-17_-_DASHBOARD-AND-HUB-V2-SESSION.md`. This session executed all three Phase-1 deliverables of the Hub v2 rebuild ([plan](../hub-v2/README.md), [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md)).

---

## Session summary

The session took Hub v2 from "Phase 0 done, Phase 1 next" to **all three Phase-1 deliverables complete**. We worked them in order: (1) refresh the Hub DESCRIPTION + SPECIFICATION against the reconciled canon; (2) audit the DB substrate; (3) inventory the old Hub's tests as the v2 oracle.

The arc: the Hub spec turned out to be *partially* reconciled (June touches had woven in U025/U026/Shadow vocabulary) but internally inconsistent and — critically — its §L3 capability inventory was still anchored to the **old Hub MVP** that ADR-U030 retires. We chose **Option A** (anchor-neutral §L3): strip all implementation/activation status, leaving the inventory to state *what the Hub should do*, with status pushed downstream to the audit / behaviour inventory / ROADMAP. We then reconciled U027 (Shadow lifecycle) and U028 (governance by scope) into §L2/§L3. The substrate audit found the schema is **strikingly canon-true and carries forward almost wholesale** — validating U030's thesis that the violations live in the app tier, not the DB. The behaviour inventory (delegated to 5 parallel agents digesting ~650 tests) produced a coverage map and, most valuably, named the **oracle silences**.

Everything landed in three commits; the Phase-1 gate (Stefan reviewing the three outputs together) is the clean next step before Phase 2.

## What was decided

- **Option A — anchor-neutral §L3.** Retire the forward-commitment row markers, the External-dependencies "Activation timing" column, and the dependency-chain status tags; implementation/activation status lives downstream (behaviour inventory / substrate audit / ROADMAP), per the skill's no-status rule. *Locked (this session).*
- **U028 keeps A-ADM on the Hub for now.** The ADR's Ferd routing is per-capability (moderation/exit in-place; audit-viewer + flags + economy → the Console), and the Console's status (own entity vs Hub-shell bundle) is itself deferred — so **no rows were relocated**; the routing is recorded as a caveat. *Locked, per ADR-U028.*
- **Substrate carries forward; Shadow is the one build-new.** 16/19 tables and 47/51 functions tagged conformant, 0 replace. The Shadow lifecycle (no `is_temporary`, no pg_cron) is the only substantial substrate-side new work. *Locked (audit finding).*
- **Oracle silences get fresh specs, not back-derivation.** Where the old suite is silent (Shadow, consent/export/Journal, sentinel reassignment, former-member attribution, real-time push), v2 specifies from canon — it does not infer behaviour from the old code's absence. *Locked (method).*

## What was produced

- `docs/products/hub/SPECIFICATION.md` + `DESCRIPTION.md` — deliverable 1 (consistency fixes; anchor-neutral §L3; U027/U028 reconciliation; NBSP cleanup). commit `d9cb11b`.
- `docs/planning/hub-v2/substrate-audit.md` — deliverable 2 (19 tables / 51 functions / 55 policies / 5 seeds tagged conformant/adapt/replace). commit `c810f0b` (+ Visitor fix in `d9a75a0`).
- `docs/planning/hub-v2/behaviour-inventory.md` — deliverable 3 (the oracle: per-area guarantees, coverage map, silences). commit `d9a75a0`.
- `docs/planning/hub-v2/README.md` — status advanced to "Phase 1 deliverables done; gate review pending." commit `d9a75a0`.
- Memory: `reference_l3_annotation_nbsp.md` (the U+00A0-behind-annotation gotcha for future spec re-groundings).

## What is still open

- **The Phase-1 gate:** Stefan reviews the three outputs together to unlock Phase 2.
- **Console decomposition (U028):** own entity vs Hub-shell feature bundle — deferred decision; bears on where A-ADM's audit-viewer/flags/economy land.
- **Inline journey content → DS-4 blocks:** the substrate `adapt` Phase 3 must execute deliberately.
- **DS row-by-row reciprocation:** the 7 DS L3 inventories now exist; reconciling the Hub's external-dep claims against them was deferred to the substrate-audit follow-through / G-29.
- **CQ-014 (visitor/Shadow product surface):** still open-narrowed; informs the Shadow build but deferred (experience-design-after-fundamentals).

## Tensions and contradictions

- **Shadow is real in canon (U027), vestigial in the substrate, and absent from the oracle.** A `Visitor` system group + `Guest` role exist as shells, but there's no lifecycle, no ephemerality, no pg_cron, and no test. This is the sharpest "spec ahead of code" gap in the whole rebuild.
- **Vocabulary drift, data layer vs canon:** `Visitor`/`Guest` → Shadow; role template `Member` → Participant. A rename (adapt), not a behaviour change — but it must be done consistently on build.
- **`journeys.content` inline JSONB** is simultaneously the live oracle model *and* a canon `adapt` (→ DS-4). Phase 3 has to port the progress/step tests *and* re-point them at the new content model in the same move.

## Non-obvious insights

- **The forward-commitment scheme was status in disguise, and it was anchored to a corpse.** Once U030 retires the MVP, "implemented in the running system" stops meaning "v2 has it." Option A wasn't just tidying — it removed a now-false semantic.
- **The substrate is the real asset, empirically.** D15 (no user_id in domain tables) is *already* honored — domain tables are group-keyed throughout, and `has_permission(p_acting_group_id, …)` is the exact canon contract. The audit turned U030's argument from assertion into measurement.
- **A latent NBSP (U+00A0) hid behind every §L3 annotation.** Stripping the markers exposed it on 42 rows. The stress-test-pattern L3 specs (PC-1..4, the 7 DS) almost certainly share it — it'll bite their re-groundings. Saved to memory.
- **The oracle's silences are as valuable as its guarantees.** Knowing the old suite never tested Shadow / sentinel-reassignment / former-member attribution / real-time push prevents Phase 3 from mistaking "the old code didn't do it" for "v2 needn't do it."

## For the next session

- **Read order:** [hub-v2/README](../hub-v2/README.md) → [substrate-audit](../hub-v2/substrate-audit.md) → [behaviour-inventory](../hub-v2/behaviour-inventory.md) → the refreshed [Hub SPECIFICATION](../../products/hub/SPECIFICATION.md) §L3.
- **Current focus:** the **Phase-1 gate** (review the three together), then **Phase 2** — the walking skeleton (sign-in → land on `/groups`, which the e2e specs already pin). Identity/auth bootstrap can stand on the conformant substrate immediately.
- **Locked:** Option A anchor-neutral §L3; U028 no-relocation; substrate-carries-forward.
- **Standing user prefs honoured this session:** print-batch-before-gate (every multi-edit batch previewed first), verify-before-asserting (NBSP, system-groups, U028 routing all disk/DB-verified before writing), sub-batch-of-1 spec edits, ASCII-only labels.
- **Disposition:** Stefan commits on his say-so (done for all three deliverables). Dashboard refresh (`npm run dashboard`) was offered but not yet run this session.

---

## Open items

### Immediate
- [ ] Phase-1 gate review (Stefan) — the three outputs together.
- [ ] Optional: `npm run dashboard` to refresh the overview.

### Near-term
- [ ] Phase 2 walking skeleton: API-first layering + verticals baseline + design-system extract + auth, one thin slice end-to-end.
- [ ] Decide inline-journey-content → DS-4 externalisation approach.

### Deferred
- [ ] Console decomposition decision (U028): own entity vs Hub-shell bundle.
- [ ] DS row-by-row reciprocation of the Hub's external-dep claims (G-29).
- [ ] NBSP cleanup when PC/DS L3 specs get re-grounded (see `reference_l3_annotation_nbsp` memory).
