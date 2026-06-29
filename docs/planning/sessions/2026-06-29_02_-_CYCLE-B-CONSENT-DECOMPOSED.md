# Session bridge — Cycle B (Consent & privacy / GDPR) decomposed to 4-ready

**Date:** 2026-06-29 (decompose session; follows `2026-06-29_01` which built Cycle A IDN-9 and parked IDN-12)
**Session type:** Decompose (`ecosystem-decomposition`). Platform-half-first, paired specs. No feature code.
**Status:** **Cycle B (IDN-6 → IDN-7 consent half) decomposed to `4-ready`** — four paired specs authored; substrate confirmed; two findings registered.
**Branch/PR:** `docs/cycle-b-consent-decompose` → (PR linked at close). `main` to be synced on merge.
**Participants:** Stefan + Claude

---

## What was decomposed

The PC-4 Governance consent contracts + the Hub consent surfaces, authored fresh from `hub/SPECIFICATION.md` §L3 (the canonical anchor — IDN-6 at `:191`, IDN-7 at `:192`, the PC-4 cross-entity attribution at `:366`):

| Spec | Owner | What | Maturity |
|---|---|---|---|
| **FEAT-PC006** `member-consent-read` | platform/core/governance | Granular-consent **substrate** (`decision` column on `consent_records` + seeded `consent_purposes` catalog) + own-subject `get_own_consent_state()` read (effective-per-purpose + history + `needs_reconsent` drift) + `GET /api/account/consent`. Platform half of IDN-6. | 4-ready |
| **FEAT-PC007** `consent-decision-write` | platform/core/governance | Own-subject, append-only, **withdrawability-gated** `record_consent_decision()` grant/withdraw + `POST /api/account/consent` + ADR-U016 cascade. Platform half of IDN-7 (consent half). | 4-ready |
| **FEAT-H008** `render-consent-state` | hub | Read-only Hub surface: effective consent + history, FIM-only, drift surfaced. Consumes PC006. IDN-6. | 4-ready |
| **FEAT-H009** `update-consent-decisions` | hub | Grant/withdraw controls (ConfirmModal; non-withdrawable purposes locked; re-read after success). Consumes PC007. IDN-7 consent half. | 4-ready |

DoR met for all four: Given-When-Then ACs, all six verticals filled (no blanks), platform deps named, ADR-U016 cascade in PC007, edge cases, no open blockers (the one carried item — API-convention reconciliation — is a directional note, not a blocker).

## Confirm-at-decomposition — substrate (disk-verified, not assumed)

`consent_records` **exists** (FEAT-PC002 / ADR-U034, migration `20260626205412_feat_pc002_consent_substrate.sql`): append-only ledger, RLS `consent_records_select_own` (subject reads own by personal group), `enforce_consent_append_only` trigger, **no client write policy** (writes via SECURITY DEFINER only), one producer today (transcendence, `purpose='transcendence'`).

**What's net-new vs existing:**
- **IDN-6** = lightweight read contract over existing data — but needs two additive substrate pieces for an honest *granular* read: a `decision` column (the ledger has **no grant/deny dimension** — ADR-U034 §2 deferred withdrawal to "a later Privacy feature"; this is it) + a `consent_purposes` catalog (purpose is open text with no label/withdrawability metadata). Both land in PC006.
- **IDN-7** = net-new write path (append a decision row) + withdrawability gate. Plus §L3's bundled **sharing-controls** concern = fully net-new, no substrate today — **split out** (see decisions).

## Decisions locked with Stefan (decompose-time)

1. **Grant/withdraw representation** → open-text `decision` column on `consent_records` (robust, queryable, matches ADR-U034 audit intent; no enum).
2. **IDN-7 scope** → **split**: consent decisions in Cycle B; sharing controls (per-audience visibility, PC-3-coupled, different storage grain — current-state preference vs append-only ledger) sequenced as a later paired slice. §L3 IDN-7 stays one capability; only delivery sequenced (mirrors Cycle A IDN-9/IDN-12).
3. **"Granular" driver** → a PC-4 `consent_purposes` **catalog table** (data-driven, no sealed enum), seeded `transcendence` (`withdrawable=false`, foundational) + `product_analytics` (`withdrawable=true`, optional — gives IDN-7 a real toggleable purpose).
4. **Re-consent drift** → read **surfaces** `needs_reconsent` (decision.policy_version ≠ catalog.current); **no** re-consent flow built this cycle.
5. **API convention** → realized house style `/api/account/consent` + `@supabase/ssr` cookie auth (per PC003/PC004); `/api/v1/`+Bearer stays directional (carried Open spec question, not a blocker).

## Findings registered (gaps register)

- **G-34** — sharing-controls (IDN-7 per-audience visibility) split out; no substrate yet; FEAT-H009 references it as the tracking home.
- **G-35** — **PC-4 §L3 does not enumerate the consent-state / GDPR / data-export / feature-flag capabilities** the Hub `SPECIFICATION.md` §L3:366 attributes to PC-4. Surfaced because L4 was authoring features for a capability PC-4's own §L3 doesn't list (PC-4 §L3 = admin/audit/DeusEx + 2 LATENT only — cross-checked, zero consent rows). Substrate table is PC-2-owned; the consent-state *governance* capability is PC-4's, just unenumerated. *Proposed fix:* a small PC-4 §L3 touch-up (consent + likely export + feature-flag rows). FEAT-PC006/PC007's L4 summary carries the note until then.

## Resume HERE — next session (Build Cycle B)

`feature-development`, platform-half-first, red-first:
1. **FEAT-PC006** through its **schema-review gate** (the `decision` column + `consent_purposes` catalog + seed = schema change → lands at `review`, pauses for Stefan's apply nod; **write the ADR-U034 amendment** — append-only ADR note covering the decision column + catalog — this is the ADR + schema carve-out), then the read RPC + route.
2. **FEAT-PC007** write RPC + route on top.
3. **FEAT-H008** then **FEAT-H009** Hub surfaces, API-first.
Then `6-done` → merge → bridge. After Cycle B: Cycle C (IDN-8 export) or reorder per the phase-3 plan.

## Carry-forward

- **ADR-U034 amendment** is deferred to the build session (named as a platform dep in PC006/PC007; carve-out — pauses for the nod).
- **`product_analytics` is a seed purpose, not canon** — it's data, easily changed; confirm the member-facing label at build.
- **G-35 PC-4 §L3 touch-up** — small, restores L3→L4 integrity for the GDPR cluster; do before/with the build or as a quick standalone.
- **G-34 sharing-controls slice** — author when Cycle B closes or when DIS-6 / COI-1 first need it.
- **Vocabulary body-rename residual (still pending, NOT done this session):** the four account-lifecycle spec bodies (FEAT-PC004/H006/PC005/H007) still use "deactivated"; the careful rename pass (point at the new `suspended` referent, grep all instances, no new canon) remains for a doc-health boundary. Out of Cycle B scope — kept separate so this decompose commit stays single-purpose.
- **IDN-12 (FEAT-PC005/H007) stays parked**; **IDN-10 forward-seam untouched** (Cycle F).

## Close-ritual notes

Targeted integrity check done (all relative cross-reference links in the four new specs resolve; no stray IDs). **No full `doc-health-check`** — not a cycle boundary, and the changes are additive (new specs + gap entries), not cross-cutting renames/deletions/migrations. `npm run dashboard` refreshed at close. The pending "deactivated"→"suspended" rename pass is the cross-cutting change that should travel with the next doc-health pass. This bridge is the entry point for the Cycle B build session.
