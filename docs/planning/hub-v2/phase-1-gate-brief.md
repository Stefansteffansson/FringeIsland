# Hub v2 — Phase 1 gate brief

**For:** Stefan (gate reviewer) · **Prepared:** 2026-06-21 · **Status:** awaiting verdict
**Plan:** [Hub v2 README](./README.md) · **Decision:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md)

> **How to use this page.** Phase-1 review is a *human sign-off* (PROCESS.md: "review is serialised human attention"). You don't have to read the three source documents end-to-end — this one page summarises them against the gate's bar and gives you a recommended verdict to accept or override. The decision is yours; pick one of the three verdicts at the bottom.

---

## The gate, in one line

**The bar (from the plan):** *the refreshed Hub spec + the substrate audit + the behaviour inventory, reviewed together.* The question is not "is everything finished" — it's **"are these three good enough to build Phase 2 on top of?"**

## Recommended verdict: ✅ PASS — with 2 cleanups to track (neither blocks the gate)

All three deliverables exist, are substantive, agree with each other, and are canon-current (Mist / ADR-U031, governance-by-scope / U028). Nothing load-bearing is missing or wrong. The two cleanups below are doc-hygiene, not rework — fold them into the next pass; they don't change whether Phase 2 can start.

---

## The three deliverables at a glance

| # | Deliverable | Meets the bar? | One-line read |
|---|---|---|---|
| 1 | Refreshed Hub **DESCRIPTION + SPECIFICATION** | ✅ Yes | The "should-be" v2 target: ~100 capabilities across 8 areas, re-grounded clean of the old MVP and on Mist/U031. |
| 2 | **Substrate audit** | ✅ Yes | The database is a keeper — it carries forward almost wholesale; one real gap (Mist). |
| 3 | **Behaviour inventory** | ✅ Yes | The old Hub's ~650 tests catalogued as the v2 "oracle," with an honest map of where it's silent. |

### 1 — Refreshed spec (the target)
- **What it gives you:** what v2 *should do*, full stop — 8 areas (Identity, Groups, Journeys, Communication, Notifications, Companion/Insight, Discovery, Platform-Ops), ~100 capabilities, each traced to a founding question and a dimension.
- **Trust it because:** §L2 (shape/boundaries) and §L3 (capabilities) are both authored and reconciled to the current canon; the inventory is "anchor-neutral" (it states intent, not status — status lives in #2 and #3, which is the correct split).
- **Open by design (not a gap):** §L4 (feature-inventory summary) is intentionally empty until feature specs are written in Phase 3.

### 2 — Substrate audit (the inheritance)
- **What it gives you:** every database object tagged *conformant / adapt / replace* against canon. Net substrate = 19 tables / 51 functions / 55 RLS policies, all RLS-enabled.
- **Headline:** **0 "replace."** 16/19 tables and 47/51 functions are conformant; the rest are light *adapts*. This validates ADR-U030's whole thesis — the architecture violations live in the app tier, not the DB.
- **The one real new-build:** the **Mist** anonymous-identity state + its data-ephemerality (TTL/erase) — see below.

### 3 — Behaviour inventory (the oracle)
- **What it gives you:** the behavioural guarantees the old suite encodes, per area, rated STRONG / PARTIAL / NONE, so Phase 3 can seed TDD from them — and, crucially, where the oracle is **silent** so those get specified fresh from canon instead of guessed.
- **Strong across** permissions, RLS, groups, admin, communication, notifications, journeys. **Partial/None** on Identity's consent/export/Journal, Mist, per-device sessions; Discovery recommendations; Companion/Insight (post-Ferd).

---

## The one finding that actually matters: the Mist lifecycle

This is the single substantive gap, and all three deliverables independently land on it — which is a good sign, not a worry:
- **Substrate:** `users` models signed-up FIMs only (no Mist flag), and `pg_cron` isn't installed, so there's no ephemeral-data cleanup. → **build-new**, but *additive* (it adds to `users` + onboarding; it rewrites nothing).
- **Oracle:** no test exercises an anonymous/Mist actor — so Mist behaviour must be **designed fresh from canon (U004/U031)**, never back-derived from the old code.
- **Why it's fine:** it's clearly named, scoped, and consistent across the docs. It becomes the one piece of deliberate fresh design entering Phase 2/3 — exactly what ADR-U031 anticipated.

---

## Confirmations (things I verified, so you don't have to)
- **Mist re-grounding took:** zero "Shadow" residue anywhere in the three deliverables (grep-verified). They cite ADR-U031 and use "Mist" throughout. The gate carries **no** stale vocabulary into Phase 2.
- **The three documents agree** on the load-bearing facts: group-keyed actor / four-hop chain, the permission catalog, the Mist gap, and the inline-journey-content adapt all line up across spec ↔ substrate ↔ oracle.

## Cleanups to track (non-blocking — fold into next pass)
1. **Permission count drift.** The spec's Sources-status note says *"42 seeded permissions catalogue"* (SPECIFICATION line ~419), but the live DB seed, the substrate audit, and the behaviour inventory all say **44**. The authoritative number is 44 — fix the spec's "42."
2. **Stale cross-ref.** `substrate-audit.md` header still calls the behaviour inventory *"(deliverable 3, pending)"* — it's now done; refresh the pointer.

---

## Open risks carried into Phase 2 (flagged in the docs, not gate blockers)
- **DS reciprocation** — the Hub's external-dependency claims are consumer-side only; reciprocal contracts from the Domain Services are routed to **G-29** and resolved as each area builds. Expected at this stage.
- **Per-policy RLS review** deliberately deferred to per-area Phase-3 builds (TDD-seeded). Stated, not silent.

---

## Your decision

- [ ] **PASS** — proceed to Phase 2 (walking skeleton). *(recommended; the 2 cleanups tracked as follow-ups)*
- [ ] **PASS WITH CONDITIONS** — proceed, but name specific must-dos first: _______________
- [ ] **RETURN** — not ready; what's missing: _______________

*On a verdict, I'll record it in the README (Phase 1 → Done, Phase 2 → Active), note the decision + date, and drop a short session bridge.*
