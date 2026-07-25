# N-C: flip green, conformance, and the fan-out write-path check

---
id: TASK-NC-03
title: "N-C: flip green, conformance, and the fan-out write-path check"
status: todo
assigned_to: claude
priority: high
feature: FEAT-PD015
owner: platform/domain/communication
wave: ferd
cycle: A-NTF N-C
depends_on: [TASK-NC-02]
estimated_hours: 3
---

## Description

Take the TASK-NC-01 suite from red to green against the applied migration, run the conformance gate, and verify the write-path cost the fan-out budget claims.

## Acceptance criteria

- [ ] Every TASK-NC-01 test green; each red→green transition recorded for the Implementation notes.
- [ ] Conformance gate green (`DS_OWNED_ALLOWLIST`, `DS_TABLES` — `ds5_config` in, `notifications` still out per ADR-U048).
- [ ] **Full integration suite** green, run `--runInBand`. Any pre-existing failure is verified at `main` HEAD on a clean build and fenced **"found (not caused)"** by name — never retry-masked or absorbed into the green claim. The known ES256 `createTestUser` flake is a named candidate: reproduce the control on `main` before attributing anything to this diff.
- [ ] **Write-path cost verified, not assumed.** Insert a batch of notifications and confirm the trigger adds one indexed lookup per row, not a scan — the fan-out budget in the spec is a claim that must be checked, since a platform announcement inserts ~1,274 rows in one statement.
- [ ] **The suppression path proved with a real platform send.** One `send_platform_announcement` call, then assert: all recipient rows written, **zero** hints on the fixture users' topics, and the announcement visible on next read. Then flip `ds5_config` to `'true'`, send again, and assert hints now appear — proving the toggle is live data, not a constant.
- [ ] Publication verified empty **on the live DB**, not just in the migration text (the exit-checklist wording requires the live check).

## Technical notes

- Do not run two integration suites concurrently against the shared dev DB.
- The `ds5_config` flip in the test must be reverted in `afterAll` — a left-on toggle would make every later platform send in the shared DB emit ~1,274 hints.
- If the migration could not be applied in this session, this task is **blocked**, not failed — record it and stop.

## Verification

- `cd hub && npx jest --selectProjects integration --runInBand` — green (or green-with-named-fences).
- `SELECT count(*) FROM pg_publication_tables WHERE pubname='supabase_realtime';` → 0.
- `SELECT value FROM public.ds5_config WHERE key='realtime_hint_platform_announcements';` → `false` (restored).
