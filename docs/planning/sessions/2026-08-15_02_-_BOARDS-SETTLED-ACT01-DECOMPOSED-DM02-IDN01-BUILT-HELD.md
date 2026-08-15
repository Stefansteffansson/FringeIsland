# Session bridge — 2026-08-15 (second session): boards settled, ACT-01 decomposed, DM-02 + IDN-01 built and held at the gate

**Mode:** autonomous continuation from the Hopper bridge (`2026-08-15_01`). Stefan's two inputs: "please continue from our bridge", then **"ok go ahead"** adopting the full decision board presented (IDN-01 finalisation, DM-02 mechanism A, ACT-01 scope, sequencing). All schema-gated work is **built and held** — nothing gated was merged.

## The slice verdict (the bridge's opener) — RESOLVED, with a mechanism found

Two full notifications-slice runs at main HEAD (18:14 throttled-window; 18:53 after a 38-min drain + clean probe):
- **Every failure in both runs was throttle-class** — 28/28 test failures across both runs carried `ThrottlerException: Too Many Requests` in `runAdminSql` fixture plumbing; **zero genuine assertion failures**.
- **Union of the two runs: all 8 suites and all 121 tests green.** The close's "4 unverified reds" are resolved as the throttle class.
- **The mechanism, finally:** failures always land on whichever suites run **last** (run 1: last three; run 2: last two — jest orders suites differently per run, which is the whole "varies run-to-run" mystery). **The slice's own runAdminSql volume exhausts the Management-API budget mid-run.** No drain wait fixes that; the run defeats itself.
- **The fix (PR #543, merged):** `isManagementApiThrottled` predicate (narrow single-signature, red-first 16/16) + a separate 15s/30s/45s linear backoff branch in `runAdminSql` — the transient 250ms schedule burns all attempts inside two seconds against a per-minute window. Warn log prints `RATE-LIMITED` so frequency stays instrumented. **Observed working the same session**: the IDN-01 sibling sweep rode out a mid-run throttle and passed.
- Claim discipline: single-run 121/121 was NOT observed pre-fix; the green claim is by union + 100%-throttle classification. Post-fix runs should go green in one shot — the next full slice run is the proof point.

## Shipped to main (fuller-auto)

| PR | What |
|---|---|
| #541 | Board rulings recorded in TASK-IDN-01 / TASK-DM-02 / TASK-ACT-01 |
| #542 | **TASK-ACT-01 decomposed** → FEAT-PD019 + FEAT-PD020 + FEAT-H046, all `4-ready`; indexes + both L4 summaries same-commit; FEAT-H018 stays 6-done |
| #543 | The runAdminSql rate-limit branch (above) |

## Held at the schema gate (merge on NAMED approval only — "ok merge NNN")

- **PR #544 — TASK-DM-02** (migration `20260815190000`, applied to dev DB + history repaired): erased authors render 'Unknown', never the sentinel literal. **Three** leak sites re-issued — the ladder's rung-3 gate (`AND NOT u.is_decommissioned`), `get_conversation_detail` participants[] (the thread title), and **`get_my_conversations.other_participant_name` — a third site found at build** (the inbox served raw `g2.name`). Red-first 2 cells failing on the exact literal → 11/11; siblings 62/62.
- **PR #545 — TASK-IDN-01** (migration `20260815210000`, applied + repaired; cron job `member-deletion-reaper` live, hourly at :37): the full grace blueprint — `decommissioned_at` + identity **stash trigger** (BEFORE UPDATE, captures OLD at the scrub moment; `delete_own_account` deliberately untouched), `pc2_config.member_deletion_grace_period='30 days'`, `get_own_restore_state` + `restore_own_account` (the ruled narrow amendment to PC005's "decommission is terminal" — member-origin within window only; `reactivate_own_account`'s refusal stands), `_pc2_hard_erase_user` extracted from `admin_hard_delete_user` (pg_cron has no admin JWT; wrapper byte-preserves), `reap_expired_member_deletions` (Mist-reaper pattern, DeusEx actor, SKIP LOCKED makes restore-vs-reap atomic). Manifest: five functions registered. Hub half: `DecommissionedAccountSurface` (probe → door/wall/loading/retry), BFF `GET /api/account/restore-state` + `POST /api/account/restore`, grace-honest ceremony copy. Red-first both tiers: integration 6 reds → **8/8**; unit 3 reds → account 41/41, **full tier 1465/1465**; siblings green; `next build` exit 0.

## Decomposition findings worth keeping (in the #542 specs, recorded here for the next builder)

- **Payload-walk catch (FEAT-PD019 STORY-3's reason to exist):** the attribution ladder resolves **personal groups only** — a wielded (engagement-group-authored) post would fold to rung-3 'Unknown'. The gate widens to engagement groups (`group_type='engagement'` only; sentinel/DeusEx stay 'Unknown') with an additive `kind: 'person'|'group'` display key. PD019's ladder change **rebases on DM-02's re-issue** — build order matters.
- **Mechanism insight (FEAT-PD020):** dead letters are fixed at the TABLE, not per writer — a DS-5-owned `BEFORE INSERT` expansion trigger on `public.notifications` (engagement-group recipient → act_as_group holders ∪ Stewards, one level). Per-writer fixes would invert Core→Domain (the role/participation writers are PC021's); the trigger is same-owner (no GC-8 license) and future writers inherit by construction. PD014's acting_invitation fan-out is the precedent; trigger naming must sort before the N-D dispatcher.

## Corrections (verify-before-asserting, both disk-verified)

- **"Roles/memberships survive the window untouched" was FALSE** — the membership walk exits every active group at click (`20260812120000:268-430`, `groups_exited` in the audit row) and the DS-3/5/7 dispositions fire at click. The ruling keeps that; **restore returns identity only** and every surface copy says so. Task file corrected in #545's branch.
- The ceremony's "immediate and cannot be undone" is now scoped to the content erasure (still true); the account itself is scheduled with a restore door.

## Environment facts

- pc2_config's new grace row is **migration-carried** (re-runs on reset) — no reseed-reversion caveat, unlike the ds5_config hint flag (that caveat from the Hopper bridge still stands: re-flip `realtime_hint_platform_announcements` after any reseed).
- Beppe-class note: the migration backfills `decommissioned_at = now()` for any pre-existing member-origin decommissioned row — their 30-day clock started at apply time (2026-08-15).
- doc-health-check: **deliberately skipped** — no renames/deletions/restructures; every doc update rode its own PR. Next cycle boundary runs it as usual.

## Next session starts here

1. **The two gates await named approval** — #544 (DM-02) and #545 (IDN-01). Both migrations are already applied to the dev DB with history repaired, so the gate is: reviewer checks (applied-function ACLs per the tier rule; the direct-caller question is answered in each PR body) + "ok merge 544/545". No file overlap between them; merge order free.
2. **IDN-01 E2E journey** (delete → re-login → restore door → active experience returns) — deferred, labelled, rides the gate execution.
3. **Build queue, wave-planning to slot:** FEAT-PD019 tranche 1 + FEAT-H046 (wielded forum), FEAT-PD020 (dead letters + hat staleness) — all `4-ready` with walks recorded.
4. **Next full notifications slice run** doubles as the throttle-fix proof point (expect slow-tail warns, not reds).
