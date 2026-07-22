# Session bridge — Anatomy Audit II and Cycle COR-B (complete)

**Date:** 2026-07-22 (session 04) · **Wave:** Ferd · **Preceded by:** `2026-07-22_03_-_A-COM-RETRO-COMMITTED-AREA-FULLY-CLOSED-A-NTF-NEXT.md`

---

## What this session was

A deep conformance analysis of the codebase against the anatomy — specifically the **inner and outer API rings** and whether any layer bypasses a lower one — followed by the corrective cycle that came out of it.

## The headline

**Both API rings are conformant. No Major or Minor code defect was found.**

- **Outer ring (ADR-U009 / U038):** all 72 BFF route files contain zero `.from(` / `.rpc(`; data access sits in `lib/*/queries.ts` over 100+ SECURITY DEFINER RPCs. Route-level 403s are SQLSTATE→HTTP mapping — presentation, per clause 1.
- **Inner ring (ADR-U047):** the live W3 gate passes against `pg_proc` — 0 Core→domain crossings, and 0 of COR-A's ten relocation targets remain.
- **The missing `/api/v1` is not a deviation** — ADR-U038 clause 3 resolves it by definition. Worth remembering; it looks like a finding every time someone new reads the anatomy.

What the audit *did* find was five gaps in **what the gates could catch** — recorded as AC2-1..AC2-5 in [`ANATOMY-CONFORMANCE-AUDIT-2.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-2.md), all five closed by Cycle COR-B the same day.

## The most important change

**The anatomy's DS-acyclicity rule — "DS-1 at the bottom, DS-7 at the top; nothing depends on DS-7" — had no mechanical enforcement at all.** The W3 gate's allowlist was flat, so membership excused a function from the *entire* table check rather than from its own service's tables. A DS-5 function reading `journey_enrollments`, or anything reading `journal_entries`, stayed green.

It is now direction-checked, and ownership derives from a single manifest whose completeness is itself gated.

**Five silent-greens are now red:**

| Scenario | Before | After |
|---|---|---|
| New DS table added, allowlists not updated | silent green | **red** |
| DS-5 function reads `journey_enrollments` | silent green | **red** |
| Anything outside DS-7 reads `journal_entries` | silent green | **red** |
| Dropped function left in an allowlist | silent green | **red** |
| `.from()` added to a client component | silent green | **red** |
| Core writes `notifications` | green | green — correctly still not a crossing (ADR-U048) |

## What landed

| PR | Content |
|---|---|
| #254 | Audit II register + COR-B plan |
| #255 | W1 ownership manifest + completeness gate · W2 DS-to-DS direction rule · W3 outer-ring static gate |
| #256 | W5 doc pass — anatomy stamp U048 → **U049**, AC2-5, README indexes, one broken ADR link |
| #257 | W4 `get_role_templates()` — schema gate, applied on a named approval |
| #258 | Cycle close |
| #259 | Homed the What Fills a Life v2 `.docx` into `docs/research/` |

New artifacts worth knowing about:

- **`supabase/ownership.manifest.json`** — the single source for table and function ownership (32 tables). The inner-ring gate reads `DS_TABLES` from it. **Adding a table without classifying it here fails the suite red.**
- `hub/tests/helpers/ownership.ts` — the direction rule, shared by a fixture suite (fast, demonstrable red) and the live catalog gate.
- `hub/tests/helpers/outer-ring.ts` — the ADR-U009 client-layer rule.

## Open items carried forward

1. **`TASK-INT-01` (new, real, unresolved)** — integration suites intermittently fail in `createTestUser` with an ES256 signing-key error. **Proven an environment fault, not a code fault:** reproduced on `main` with no branch applied, while the same suite passed 24/24 minutes later, and a standalone probe with the same key created users 5/5. It recurred live during this session's final verification. Fenced (the helper now names it at the throw site with a triage path) but **not fixed**.

   **If integration suites fail around you: re-run serially first, then run the control on `main` before suspecting your own diff.** That misdiagnosis cost about an hour this session.

2. **`TASK-DOC-005` reconciled, not closed.** Its ADR-U049 half is done (stamp moved, DS-5 charter row updated). Two things remain: the **`ECOSYSTEM_ANATOMY_*.svg` diagram was not touched** by the W5 prose pass and may still lag U049; and its **premise was wrong** — it treats ADR-U050 as accepted, but the ADR reads `Status: Proposed (rides the C-F schema gate)`. **Decision (Stefan): hold U050 until the gate accepts it**, then absorb it and move the stamp in the same change.

3. **Observed, deliberately not bundled:** default Supabase table grants give `anon` and `authenticated` INSERT/UPDATE/DELETE on `public.role_templates`. **RLS denies all of them** (SELECT-only policy; no policy means deny), so nothing is reachable — but the grant surface is wider than intended, the same class the anon-execute lockdown closed for functions. Wants its own gated migration.

## Lessons worth keeping

- **A prior audit already existed.** `ANATOMY-CONFORMANCE-AUDIT.md` (2026-07-19) and Cycle COR-A had covered this ground days earlier. Finding it turned the work from a duplicate first-pass audit into a delta pass. *Look for the prior art before starting an audit.*
- **Static SQL analysis over a migration tree lies twice:** it surfaces functions and tables that later migrations dropped (a dead function looked like a live crossing), and it reads *comments* as code (the ADR-U009 compliance notes in `lib/*/client.ts` contain the literal `supabase.from('users')` inside prose asserting the opposite). Strip comments; resolve against the live catalog.
- **The routine check earned its keep.** The stamp lag (U048 vs the accepted U049) was found by doc-health-check Section 11, not by anything anyone set out to look for.
- **Prose loses, gates win** — the through-line of the whole cycle. Every finding was some rule held by hand-written comments or hand-edited lists. The fix was always to make something fail red.

## Next

**A-NTF** is unblocked, and now builds against gates that enforce both ring rules rather than one.
