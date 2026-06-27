# Session bridge — IDN-2 build: FEAT-PC002 tasks 01-04 green at `review` (schema-review gate)

**Date:** 2026-06-27 (build session; follows `2026-06-26_03` scoping bridge)
**Session type:** build (platform, TDD red-first) — the platform half of IDN-2
**Status:** Open — **4 of 5 FEAT-PC002 tasks built and green**, all at `review` (schema-review gate). Committed (`5b59b15`, local only, **not pushed**). **PC002-05 (FIM account-erasure + cascade verify) remains** — deferred to a fresh session by Stefan's call. Feature stays `5-in-cycle` until the 4 migrations pass schema review (then `6-done`).
**Participants:** Stefan + Claude

> Picks up the scoping bridge's "build order: FEAT-PC002 first". Built the platform departure+transcendence slice (ADR-U031 stages 3-4, ADR-U033, ADR-U034) red-first, platform-first. The Hub half (FEAT-H004) is untouched — next product layer.

---

## What was built (TDD red -> green, all demonstrated red first)

Branch **`idn-2-build`** (forked at the scoping tip `3aa7378`; PR #1 on `idn-2-scoping` still OPEN). Four additive migrations, **applied to dev DB + repaired**, behind the schema-review gate.

| Task | Story | Migration | What |
|---|---|---|---|
| **PC002-01** | S2 | `20260626202215_…explicit_erase` | `_erase_mist(uuid)` cascade primitive (internal, REVOKEd from PUBLIC) + `explicit_erase_mist()` owner RPC. Temporary-only; non-Mist denied `42501`. |
| **PC002-02** | S1 | `20260626204102_…ephemerality_reaper` | `pc2_config` (TTL `72 hours`) + `reaper_runs` (V4 sink) + `reap_expired_mists()` + **pg_cron enabled** + `mist-reaper` job `*/15`. Accumulation gap closed. |
| **PC002-03** | S5 | `20260626205412_…consent_substrate` | `consent_records` append-only table — RLS subject-scoping, open `purpose` text, FK **RESTRICT** (retention), append-only trigger (`42501` unless `app.consent_erasure_in_progress`). |
| **PC002-04** | S3 | `20260626205932_…atomic_transcendence` | `finalise_transcendence(policy_version, capture_context)` — one txn: lock (race guard) -> flip `is_temporary` -> enrol FringeIsland Members -> write consent. |

**Tests (8 suites, 20 auth-integration tests green):** new `hub/tests/integration/auth/{mist-reaper,mist-consent,mist-transcendence}.test.ts`; new `runAdminSql` test helper (Management-API admin SQL — backdating `last_sign_in_at`, reading the `cron` schema). `hub/lib/auth/AuthContext.tsx` `reaperRealised` flipped `false -> true` (honest: reaper now realised; no test asserted it).

## Key design decisions (locked in the migrations)

- **Erasure cascade order** mirrors `admin_hard_delete_user`: journeys (RESTRICT) -> `auth.users` (CASCADE drops profile) **before** the proto group, dodging the `personal_group_id` ON-DELETE-SET-NULL immutability trigger. `_erase_mist` is the shared primitive the reaper reuses.
- **Reaper race guard** = `FOR UPDATE … SKIP LOCKED` (sweep skips a row the transcendence txn locks) + inactivity-based TTL. TTL from `pc2_config`, not hardcoded.
- **Consent append-only + retention** = FK RESTRICT (a consented FIM can't be hard-deleted out from under its proof) + trigger blocking UPDATE/DELETE (`42501`) unless the controlled `app.consent_erasure_in_progress` bypass is set. Subject keyed via the actor chain (`subject_group_id` = personal group), RLS via `get_current_personal_group_id()`.
- **"No persistence without consent"** is structural: the consent INSERT is last in `finalise_transcendence` and `policy_version` is `NOT NULL`, so a missing policy aborts the whole txn (this is also how the rollback test is driven).
- **Observability boundary:** reaper has a DB-side sink (`reaper_runs`) because pg_cron has no Hub; explicit-erase + transcendence emit V4 telemetry **Hub-side** (FEAT-H004) over the existing seam — the platform function returns the outcome.

## Process note worth keeping — green-at-red catch

The transcendence **rollback** test first *passed at red* (a missing function leaves the same state as a real rollback: Mist intact, no consent). Per red-first discipline, stopped and strengthened it to assert the consent `NOT NULL` violation code (`23502`) — only reachable once the function exists, flips, enrols, then fails on the consent insert. Re-ran: genuinely red, then green. (Same technique as the `42501` denial assertions throughout.)

## Verification (doc-health, this session)

**doc-health-check clean — no critical findings, no backlog items.** Sections run: 2 (schema), 5 (maturity), 8 (feature-inventory), 3 (cross-refs, light), 1.5 (arch-drift sanity). All 3 new tables carry RLS; FEAT-PC002 `5-in-cycle` consistent with its 5 tasks and its §L4 row; no broken links / obsoleted-concept drift in new docs. **Watch-item (not a finding):** identity-spec §L3 Privacy "latent" consent annotations stay accurate at `5-in-cycle`; update to "shipped" when FEAT-PC002 hits `6-done`. Dashboard refreshed (538 files).

## What is still open

- **PC002-05** (`todo`) — FIM account-erasure anonymise-vs-retain (distinct from the reaper) + ADR-U016 cascade-spec verification. **Closes FEAT-PC002 -> `6-done`.** Design sketch below.
- **Schema review** — the 4 migrations + their RLS/cascade specs await Stefan's human approval (gate). Tasks stay at `review` until then.
- **Push** — `idn-2-build` is local only (commit `5b59b15`). No PR yet for the build branch.
- **Hub half (FEAT-H004)** — untouched: anon->permanent conversion + the transcendence/consent gate + "say goodbye" farewell, consuming these RPCs. Separate product layer.
- **§L3 latent-cell update** — deferred to FEAT-PC002 `6-done`.

## For the next session — PC002-05 (close FEAT-PC002)

- **Design sketch (pre-agreed):** an `erase_fim_account`-style SECURITY DEFINER path that, under `app.consent_erasure_in_progress`, **anonymises the consent subject link** (`subject_user_id`/`subject_group_id -> NULL`) and **retains** the consent event (GDPR proof), then delegates FIM teardown (the existing `admin_hard_delete_user` already handles sentinel reassignment). The FK RESTRICT forces anonymise-first. Distinct from the reaper's pre-transcendence hard-delete — reaper and consent never collide (reaper hits only un-transcended Mists, which hold no consent).
- **Also:** verify both ADR-U016 cascade specs (Mist erasure; Mist->FIM transcendence) against the shipped substrate; on green, FEAT-PC002 -> `6-done` (+ identity §L4 row + §L3 latent-cell update) in one commit, pending review.
- **Read order:** this bridge -> FEAT-PC002 (cascade specs + STORY-5 crit-4) -> ADR-U034 §5 -> the four `20260626*` migrations -> `admin_hard_delete_user` (in `20260222000000_rebuild_universal_group_pattern.sql`).
- **Orientation:** tests `cd hub && npm test` (or `npx jest --selectProjects integration … tests/integration/auth`); migrations via `node scripts/apply-migration-temp.js <file>` then `bash supabase-cli.sh migration repair --status applied <ts>`; `runAdminSql` helper is in `hub/tests/helpers/supabase.ts`.
