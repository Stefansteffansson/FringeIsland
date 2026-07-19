# Retrospective — the Journeys area (A-JRN), closed at the J-O3 gate

**Scale:** area retro (six cycles, J-A..J-F, 2026-07-07 → 2026-07-19). **Gate:** [2026-07-19-journeys-area-gate.md](../hub-v2/2026-07-19-journeys-area-gate.md) — **PASSED**, one labelled exception (deep-cold B2 = the vendor provisioning floor; revisit at real traffic or the scale-to-one decision).

## What the area shipped

Six paired cycles, all `6-done` with per-cycle schema-gate nods: **J-A** catalogue/enrolment (PD002↔H019, the first DS-3 feature), **J-B** the ADR-U044 step substrate + player core (PD003↔H020), **J-C** completion/timing/review (PD004↔H021), **J-D** group progress + sharing consent + frozen walks (PD005↔H022 — the area's hardest privacy design, invariants 4+8 in the contract), **J-E** the onboarding front door + transcendence carry-over (PD006↔H023, ADR-U045+A1), **J-F** step-response capture + review substance (PD007↔H024, ADR-U046 — the Ask collects; the lived record holds the traveller's words, private-only, exported from day one). Plus the gate riders: Mists read journey detail (browse → want → transcend), the returning Mist's continue-your-walk door, and the production catalogue cleaned of fixture residue.

## What went well

- **The per-cycle rhythm held for six cycles straight:** red-first contract suites (23-red at J-F; 17-red at J-E), schema gates with explicit boards, labelled adaptations instead of silent weakening, payload walks catching real gaps at decomposition (the unserved `journey.takeaway`), plain-English walkthroughs catching lifecycle questions the tiers miss.
- **The performance discipline matured in-area:** ADR-U043 budgets landed at J-A, cold was operationalized (Amendment 1) after the shallow-cold false pass, the Edge→Node migration killed the boot lottery mid-area, and the gate's deep-cold windows confirmed it dead at area depth. The J-A "measured to the floor" closure discipline was applied twice more (P1-residual, R3 fan-out) — bets close with evidence, never silently.
- **Stefan's live walk earned its place as a gate instrument:** three real findings no test tier caught (the returning-Mist dead-end link, the goodbye/domain confusion, the publicly-visible fixture residue) — all actioned same-day, two as built-and-merged riders.

## What to learn (carried forward)

1. **Shared-DB fixture residue is now a named hazard with two bites** (GDTarget×17 vs the search LIMIT 8; JB journeys×6 publicly visible). Fix shape: run-unique fixture names across ALL suites + a periodic residue sweep. → cooldown hygiene item (extends the J-F sweep finding).
2. **Long-running dev servers degrade** (day-old process: worker-pool crashes → route 500s that mimic product defects). Rule of thumb: fresh dev server per session; suspect the server before the product when a previously-green flow 500s locally.
3. **E2E sweep ordering is load-bearing:** profile.spec's sign-out globally revokes the shared session; mutation-bearing specs must sort before it (documented in the J-F spec header; a structural fix — fresh-identity specs or scope-local sign-out per H012's design — is a candidate when Communication touches auth surfaces).
4. **Ghost sessions** (a browser outliving its erased Mist) produce a confusing front-door limbo — TASK-MIST-01 filed; the per-domain session split (preview vs stable URLs) also confused live testing. Testing guidance: the stable domain only.
5. **The doc-health full-sweep scope matters:** Section 5's first full sweep caught a June `6-done`-without-notes gap that three incremental runs missed (TASK-DOC-004); Section 11 (anatomy freshness) ran live for the first time — cheap, keep it.

## Standing items into Communication (A-COM)

- Un-park **IDN-10** (exit/deletion — the forum-content disposition arrives with DS-5); un-seam **MEM-9**; the D2/D4 dispositions (`pending-DS-5`) come due.
- **TASK-MIST-01** (ghost sessions), **TASK-DOC-003** (DOMAIN_ENTITIES refresh), **TASK-DOC-004** (PC002 notes backfill), fixture-residue hygiene.
- **Parked with Stefan:** Vercel Pro scale-to-one (now carrying this gate's data) · logo · launch checklist · dashboard toggles.
- **CQ-010** real onboarding content — the J-F takeaway renderers are its landing surface.

## Doc health

Run at the J-F cycle close (2026-07-18, in the `_03` bridge): clean but for the two backlog items above; Section 11 first live run clean.
