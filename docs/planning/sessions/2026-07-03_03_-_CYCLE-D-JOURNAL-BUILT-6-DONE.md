# Session bridge — Cycle D built: FEAT-PD001 + FEAT-H011 6-done (private Journal, IDN-5)

**Date:** 2026-07-03
**Session type:** Cycle D build (same session as the decomposition, bridge `2026-07-03_02`).
**Status:** **Built and verified; PR open at the schema gate** (new table + RLS + grants — the fuller-auto carve-out pauses for Stefan's merge nod).
**Participants:** Stefan + Claude

---

## What was built

**FEAT-PD001 — the personal Journal primitive (the first Platform-Domain feature; DS-7 Intelligence).**
Migration `20260703084810_feat_pd001_journal_primitive.sql` (applied to the dev DB and repaired):
- `journal_entries` — owner `owner_group_id` FK → `groups(id)` **ON DELETE CASCADE**. FK target settled at groups after disk-verifying `admin_hard_delete_user`: it hard-deletes the personal group and its sentinel-reassignment UPDATE list never names this table, so erasure hard-deletes entries and can never sentinel-reassign them.
- **No client-role table grants** (revoked from `anon`/`authenticated`) + RLS with own-rows policies as defense-in-depth — a direct PostgREST caller, including an anonymous-session Mist, gets 42501 on every verb (the ADR-U038 direct-caller answer).
- Five own-subject SECURITY DEFINER RPCs: `create_journal_entry` (FIM-only 42501; active account; 22023 empty body), `update_journal_entry`/`delete_journal_entry` (own rows; foreign-or-nonexistent → P0002, no existence leak), `get_own_journal_entries` (newest-first, keyset, clamp [1,200]; reads survive suspension), `get_own_journal_export()` (versioned; `auth.uid()`-direct so a suspended member keeps Art. 15/20 access).

**FEAT-H011 — the `/journal` surface.** Page gate (sessionless → login-with-redirect, Mist → entry), `JournalPanel` (compose / edit-in-place / ConfirmModal delete / load-older; mutations re-read the list; failed save preserves text), AccountMenu link, BFF routes `/api/journal` + `/api/journal/[id]` (Edge+dub1, SQLSTATE→HTTP, content-free telemetry), and **the composed download**: `GET /api/account/export` now returns `{ ...pc008Doc, journal }` (additive key; present-and-empty; journal failure fails the whole download). FEAT-H010 carries the provenance amendment.

## Verification

- **Red-first honored:** PD001 contract tests 11/11 demonstrated red (contracts absent) → green post-migration; H011 12 unit + 3 route-composition tests red (modules absent / pre-composition route) → green. The erasure/export integration tests (4) are **labelled test-after verification** (substrate shipped in the same migration by design).
- **Full pyramid green:** unit **191/191**; integration full sweep (`--runInBand`) green — see the PR; **E2E 32/32**; `next build` clean; lint clean (one pre-existing unrelated warning).
- **Erasure proven end-to-end** via the real `erase_fim_account` → `admin_hard_delete_user` path (DeusEx-enrolled admin caller): zero surviving rows, none under the sentinel.

## Found-and-fixed on main (pre-existing since PR #48, the ADR-U038 tranche-1 S3 gate)

Two more members of the tranche-2 "profile-bio" class — breaks the tranche-1 sweep didn't reach:
1. **The whole E2E suite couldn't start**: `global-setup.ts` created the session FIM without `consent_accepted` metadata → `handle_new_user` refused ("Database error creating new user"). Fixed + `deleteE2EUser` now purges the S3 consent row under the controlled-erasure bypass (FK RESTRICT would block teardown). Full suite restored: 32/32.
2. **`signup.test.ts` unit red**: `signUpFim`'s metadata expectation predated the S3 fix (missing `consent_accepted`). Expectation updated.

Also folded: the export-route composition tests live in the existing `account-export-route.test.ts` (updated for the journal mock) — an initial duplicate file was removed.

## Process notes

- Deviation (recorded in FEAT-H011 Implementation notes): TASK-H011-01's "route-level integration tests" → route-unit + E2E instead; route-level integration tests aren't a house pattern and the routes carry no rules (substrate adversarially tested).
- Full-suite caution for future sessions: `npm run test -w hub` (bare `jest`) runs the unit AND integration projects **in parallel workers** — remote-DB suites interfere and fail spuriously. Use `tests/unit` for the unit tree and `npm run test:integration` (`--runInBand`) for integration.
- Tasks: TASK-PD001-01/02 at **review** (schema gate); TASK-H011-01/02/03 done. Tasks stay until the cycle retrospective.

## State / next

- **PR open, waiting for the schema-gate merge nod** (new table + RLS + grants + the S3-class harness fixes). Both specs `6-done`; §L4 rows (hub + intelligence.md), both feature indexes, FEAT-H010 amendment, CHANGELOG carried in the same batch.
- After merge: **Cycle E (IDN-11 session edges — feasibility-gate Supabase per-device sessions first)**, then Cycle F (IDN-10 seam). Perf T2 unchanged.
