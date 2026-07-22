# Anatomy correction plan — Cycle COR-B (gate coverage)

**Status:** **W1+W2+W3 EXECUTED 2026-07-22** (approved to run before A-NTF). W4 and W5 remain open by design — W4 awaits the next Groups migration, W5 rides the next doc pass. Evidence: manifest `supabase/ownership.manifest.json` (32 tables classified); gates `ownership-manifest-conformance` (5), `ownership-direction-rule` (12), `outer-ring-conformance` (10), rewired `internal-api-conformance` (1). Full unit suite 121 suites / 891 tests green; `next build` clean. **No migration, no behaviour change, no production code touched.**
**Evidence base:** [`ANATOMY-CONFORMANCE-AUDIT-2.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-2.md) (2026-07-22). Finding IDs `AC2-*` refer to that register; this plan does not restate its evidence.
**Predecessor:** [`anatomy-correction-plan.md`](./anatomy-correction-plan.md) (Cycle COR-A, executed 2026-07-19) — corrected the deviations; COR-B closes what the resulting gates cannot see.
**Wave:** Ferd. **Cycle name:** COR-B (corrections; the letter scheme stays free for areas).

---

## What this cycle is, and what it is not

COR-A corrected a live systemic deviation and was urgent. **COR-B corrects nothing that is broken.** Audit II found the rings conformant on all seven invariants — every finding is a gap in gate *coverage*.

That changes the argument for doing it. The case is not "the code is wrong"; it is that two of the anatomy's inner-ring rules are enforced by hand-edited lists with no completeness check, and one ring rule (DS acyclicity) has no enforcement at all. COR-A's own retro named why this bites: the PC→DS crossing *"grew pc013 → pc014 → pc015 precisely because no gate caught it."*

**The scheduling consequence:** the value is front-loaded — highest before the next DS surface lands, near zero once it has. This is the natural slot, but it is a genuine choice, not a blocker. See "Scheduling call" below.

---

## Shape of the work

Five work items, one cycle. **No schema migration and no behaviour change** — every item is a test, a manifest, or a doc. The schema gate does not apply; `next build` is the type gate.

| Work item | Finding | Kind | Gate / nod |
|---|---|---|---|
| W1 Ownership manifest + completeness gate | AC2-2 | manifest + test | — |
| W2 Per-service allowlist: DS↔DS direction rule | AC2-1 | test (red-first) | — |
| W3 Outer-ring static gate (ADR-U009) | AC2-3 | test (red-first) | — |
| W4 `role_templates` read: RPC or recorded exception | AC2-4 | hub code **or** manifest | `next build` if code |
| W5 Route-inventory pointer + register annotations | AC2-5 | docs | — |

W1 is the spine: W2 and W3 both read from the manifest it creates. W4 and W5 are independent and can ride anytime.

---

## W1 — The ownership manifest and its completeness gate (AC2-2)

**Blocks W2.** Today `DS_TABLES` and the three function allowlists are hand-edited arrays inside the test file, with nothing asserting they match reality.

Create one checked-in manifest — proposed `supabase/ownership.manifest.json` (co-located with the substrate it classifies, not with the test that reads it):

- `tables`: every live `public.` table → `DS-1..DS-7` | `PC-1..PC-4` | `vertical:<name>`
- `functions`: every public function → owning service, by explicit entry or by the `/^ds\d+_lifecycle_/` prefix rule
- `exceptions`: cited carve-outs — the ADR-U047 A2 vertical-composition list, and AC2-4 if W4 takes the record-it path

Seed it from Audit II Appendix A (32 tables, already classified).

Then the gate — three assertions, catalog-diffed:

1. every live `public.` table appears in the manifest (a new table fails red until classified);
2. every manifest table still exists (no stale entries);
3. `internal-api-conformance.test.ts` derives `DS_TABLES` from the manifest instead of its literal array.

The `NAMED DEFERRAL` comments in the current array stay valid — they become manifest entries with the same citations, so a deliberate lag is still expressible, just no longer invisible.

**Deliverable:** manifest + `tests/integration/platform/ownership-manifest-conformance.test.ts`; the W3 gate reads the manifest.

## W2 — Per-service allowlist: make DS acyclicity mechanical (AC2-1)

**Red-first.** The current exemption is flat — `DS_OWNED_ALLOWLIST.has(name)` exempts a function from the whole `DS_TABLES` check. Replace with per-service resolution using the W1 manifest:

- resolve each function's owning service, and each referenced table's owning service;
- **same service** → allowed;
- **cross-service** → allowed only where the reference is *downward* (DS-N may read DS-M where M < N) **and** the pair appears in a cited cross-service allowlist;
- **upward** (including anything reading `journal_entries` from outside DS-7) → fail.

Demonstrating red needs care, since the live substrate is clean. Assert against a fixture set of synthetic function bodies rather than mutating the database: the test's `referencedDsTables()` logic is pure and can be exercised directly. That gives real red-then-green without a throwaway migration.

This is the anatomy's *"nothing depends on DS-7"* rule becoming executable for the first time.

## W3 — Outer-ring static gate (AC2-3)

**Red-first.** Extend `route-policy-conformance.test.ts` (or add a sibling — it is pure `fs`, no DB, 0.6s):

- no file under `components/` and no `'use client'` module contains `.from(` or `.rpc(`;
- exception list for the realtime-subscription case ADR-U009 explicitly permits (*"acceptable for real-time subscriptions but not for data mutations"*), each entry citing its justification;
- the existing "exception lists stay honest" assertion pattern extends to the new list.

Red is demonstrated against a fixture module, then green against the live tree. The five hand-written ADR-U009 comments in `lib/*/client.ts` and `ProfileEditForm.tsx` can then be shortened to cite the gate rather than assert the rule.

## W4 — The `role_templates` read (AC2-4)

Two legitimate paths — **this is a decision, not a defect**:

- **(a) Relocate:** add `get_role_templates()`, make `fetchRoleTemplates` a thin RPC call. Uniform with the other 90+ data functions and with ADR-U038 tranche 2's treatment of `get_member_groups()`. Costs a migration — which would pull the schema gate into an otherwise gate-free cycle.
- **(b) Record:** enter it in the manifest as a deliberate exception citing its RLS policy. Zero risk, keeps COR-B migration-free, and is defensible — the read is RLS-governed and hosts no rule.

**Recommendation: (b) now, (a) whenever a Groups migration next opens.** Taking (a) alone would add a schema gate to a cycle that otherwise needs none.

## W5 — Docs (AC2-5)

Replace predecessor Appendix A's `52 files` snapshot with a pointer (pointer-not-snapshot); annotate the predecessor register with AC2 cross-references; move the `ARCHITECTURE_ANATOMY.md` stamp if any ADR lands. Run `doc-health-check` — this cycle touches the reference tree.

---

## Execution order

```
W1 (manifest + completeness gate)
 ├── W2 (per-service allowlist)      ← needs W1's manifest
 └── W4(b) (exception entry)          ← needs W1's manifest
W3 (outer-ring gate)                  ← independent, can run first
W5 (docs)                             ← last, absorbs whatever landed
```

W3 is the cheapest and most self-contained — a reasonable place to start if the cycle needs a quick first green.

## Definition of Done

- [x] Manifest covers all 32 live tables; adding an unclassified table fails red — **demonstrated** (5/5 red before the manifest existed, green after)
- [x] `internal-api-conformance.test.ts` derives `DS_TABLES` from the manifest — no literal array
- [x] Per-service allowlist live; an upward DS→DS reference fails red — **demonstrated on fixtures** (suite unresolvable before the rule existed; 12/12 after)
- [x] Outer-ring gate live; a `.from(` in a client module fails red — **demonstrated on fixtures** (10/10)
- [ ] AC2-4 closed by (a) or (b) — **open**, W4 not in this tranche
- [x] Full suite green (121 suites / 891 unit tests); `next build` clean
- [x] `doc-health-check` run (W5) — sections 2, 3, 3.6, 11; results below
- [x] Audit II register annotated with dispositions

### W5 — doc pass results (2026-07-22)

Fixed in place:
- **AC2-5 closed** — predecessor Appendix A's `52 files` snapshot replaced with a pointer to the live tree and the route-policy gate that walks it.
- **Anatomy stamp moved** U048 → **U049** (Accepted 2026-07-20). ADR-U049 had real anatomy impact and had not been absorbed: DS-5's charter row now carries the durable announcements home. ADR-U050 is **Proposed** (rides the C-F schema gate) and is deliberately left unabsorbed, stated inline so the next reviewer doesn't re-derive it.
- **Broken ADR link** in the predecessor register: `ADR-U023-platform-decomposition.md` → `ADR-U023-platform-core-domain-services-decomposition.md`. Pre-existing, isolated (not a citation cluster — the only occurrence in the tree).
- **README indexes** — `reference/README.md` now lists audit II; `hub-v2/README.md`'s Phase-3 gate paragraph now describes the three COR-B gates alongside COR-A's.
- Predecessor register marked **CLOSED** with a successor pointer; AC-9 annotated with COR-B's narrowing of the residual-assurance surface.

Clean:
- Retired vocabulary in the living anatomy pair — one `Shadow` hit, correctly the place-3-menace gloss, not the entrant sense (ADR-U031).
- Anatomy pointer integrity — the V4/V5 references in `architecture/README.md` are explicitly labelled superseded history.
- All 53 links across the four touched documents resolve.

**Reported, not fixed (needs its own pass):** `hub-v2/README.md`'s Phase-3 narrative still reads *"Now kicking off: Communication (A-COM)"* while A-COM has closed and A-NTF is next. Area-status narrative is out of W5's scope and wants the area-gate context loaded — flagged rather than patched.
- [ ] Retro notes whether COR-B's premise held — that gate-coverage work pays before area work, not after

### What the gates now catch that they did not on 2026-07-22 morning

| Scenario | Before | After |
|---|---|---|
| New DS table added, arrays not updated | silent green | **red** — unclassified in manifest |
| DS-5 function reads `journey_enrollments` | silent green | **red** — uncited cross-service |
| Anything outside DS-7 reads `journal_entries` | silent green | **red** — upward crossing |
| A dropped function left in an allowlist | silent green | **red** — stale entry |
| `.from()` added to a client component | silent green | **red** — outer-ring violation |
| Core writes `notifications` | green | green (ADR-U048 — correctly still not a crossing) |

## Scheduling call — the one thing this plan needs from Stefan

COR-A ran *before* A-COM deliberately, so A-COM would build on the corrected pattern. The same argument applies here and is the reason to run COR-B before the next area rather than after: W1's manifest and W2's direction rule are cheapest to establish while DS-5 is the newest surface, and they are what a new area would otherwise be free to drift against.

The counter-argument is real: nothing is broken, A-NTF is queued, and a cycle spent on drift-insurance is a cycle not spent on product. Deferring costs nothing today — it costs only if the next area adds a crossing the gates cannot see, which is exactly the bet COR-A's retro says we lost last time.

**Recommendation:** run W1+W2+W3 before A-NTF (they are test-and-manifest work, no schema gate, and small); let W4(a) and W5 ride later. If that is too much, **W1 alone** captures most of the value — an unclassified table failing red is the assertion everything else builds on.
