# Retro — why v2 code drifted from the API-boundary canon

**Date:** 2026-07-02 · **Status:** Draft for review (Stefan) · **Type:** focused root-cause retro (scope decision: this failure mode only, not a full way-of-working review)
**Companion:** [`../hub-v2/api-conformance-register.md`](../hub-v2/api-conformance-register.md) — the findings this retro explains.

---

## The question

The v2 rebuild existed *because* v1 violated the architecture. The team wrote the canon (ADR-U009, Hub SPECIFICATION §5, PC-3 §3/§7), built the rebuild plan around "API-first, always", and TDD'd every slice — and still shipped nine Hub-hosted platform-contract routes, two platform contracts implemented in Hub lib code, and three substrate enforcement gaps. Why didn't the process catch it?

## What actually happened (evidence, not blame)

1. **The steering file the builders read encodes the wrong rule.** Hub `CLAUDE.md` line 23: *"Business logic lives in `app/api/...` route handlers … every business rule, validation, and side effect must live behind the Platform API so iOS and Android inherit them on day one."* This conflates the Hub's own Next.js routes with "the Platform API" and its justification is factually impossible — sibling native clients can never call Hub route handlers (Hub SPECIFICATION §5 forbids it; the same file's line 13 calls the Hub "a consumer surface in the strictest sense"). Every v2 feature was built in faithful obedience to this line.
2. **ADR-U009 under-specifies WHERE the API lives.** "DB → API route → Frontend" names a layering, not an owner. v1's sin was "frontend calls DB"; the natural reading of the fix was "put a route in between" — and the letter of that fix became v2's house style. The canon that *does* pin ownership (PC-3 §3/§7: PostgREST-RPC-canonical, three-justification rule for custom routes) was authored in May from *legacy*-hub evidence, and sits in a PC spec section that the Hub feature-build path never traverses: the `feature-development` skill loads the feature spec + the Hub cascade, not PC-3 §7.
3. **Deviations were captured in the wrong register.** The builders *saw* two deviations (no `/api/v1/`, cookie auth instead of Bearer) and recorded them — as code comments ("the spec's `/api/v1/` + Bearer is directional and not yet realised") and FEAT open-questions. PROCESS §9 requires deviations to be captured **and triaged** (local / upstream-bearing / open-question). These were captured-but-never-triaged: "directional" became a quiet norm across five features, and the upstream-bearing question (is this route surface even canonical?) surfaced only when the 2026-07-01 perf session collided with it by accident.
4. **No gate checks API-boundary placement.** Feature DoD + the five vertical checklists verify RLS, telemetry, tests, cascades — nothing asks "does this endpoint's contract exist platform-side?" or "does this route pass the three-justification test?". Five features passed DoD legitimately; the gate had no row to fail them on.
5. **App-layer gates got no adversarial pair.** FEAT-PC003 *explicitly designed* two enforcement layers ("RLS authorises which row; column gating **here** authorises which columns") — the spec itself accepted app-layer enforcement of a platform rule. Nobody asked the adversarial question "what can a direct PostgREST caller do that the Hub route wouldn't let them?" — which is precisely how S1 (consent-bypass via `is_temporary`), S2 (email over-exposure), and S3 (unrecorded sign-up consent) survived both the feature DoD *and* the schema-review gate.
6. **A spec froze a snapshot.** PC-3 §7 hardcodes the legacy Hub's 4 routes as "the current app/api surface" — a snapshot that went stale the week v2 shipped its first route, so the one canon section with the right rule also carried wrong facts (pointer-not-snapshot failure).

## Root causes, ranked

- **RC1 (primary):** an entity steering file (Hub `CLAUDE.md` L23) encoded a mis-reading of ADR-U009 and was never reconciled against Hub SPECIFICATION §5 / PC-3 §7 — the cascade's content was internally contradictory and no doc-health check compares rules *across* cascade files for consistency.
- **RC2:** ADR-U009 names a layering without an owner; the ownership rule lives outside the product build path.
- **RC3:** deviation capture ≠ deviation triage — code-comment "directional" notes satisfied the letter of "never silent" while bypassing PROCESS §9's triage entirely.
- **RC4:** no DoD/checklist row for API-boundary conformance; no adversarial direct-caller test requirement paired with app-layer gates.

## Gate patches (steering-file edits — APPLIED in tranche 3, PR pending merge)

- **GP1 — Fix the source:** rewrite Hub `CLAUDE.md` L23 per the §4 ADR verdict (platform contracts live platform-side; Hub routes are private BFF plumbing at most).
- **GP2 — DoD row (feature-development skill):** for every new/changed endpoint: (a) the contract exists platform-side (RPC/RLS/trigger), (b) any custom route names its three-justification case, (c) every app-layer gate has an adversarial integration test exercising the direct PostgREST path.
- **GP3 — Schema-review gate question:** standing item — "what can a direct PostgREST caller (incl. an anonymous-session Mist) do to this table that the product route wouldn't allow?"
- **GP4 — PROCESS §9 tightening + doc-health hook:** a code comment is not a deviation capture; deviations land in the feature spec's deviations section with a triage tag. `doc-health-check` greps the codebase for "directional" / "not yet realised" comments as unfiled-deviation flags.
- **GP5 — Pointer-not-snapshot in specs:** PC-3 §7 (and template guidance) point at the live route inventory instead of enumerating it.

## What worked (keep)

The v2 discipline held everywhere it had a gate: frontend is API-first clean (zero direct table access), substrate RPCs carry real REVOKE/guard discipline, failures surface, TDD held, and the builders *did* leave honest breadcrumbs at every deviation — the raw material for this audit was their own comments. The process failed at reconciliation and gating, not at craftsmanship.
