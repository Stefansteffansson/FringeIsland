# N-C: red integration suite for the notification hint, nudge policy, and reconnect guarantees

---
id: TASK-NC-01
title: "N-C: red integration suite for the notification hint, nudge policy, and reconnect guarantees"
status: done
assigned_to: claude
priority: high
feature: FEAT-PD015
owner: platform/domain/communication
wave: ferd
cycle: A-NTF N-C
depends_on: []
estimated_hours: 4
---

## Description

Write the failing integration suite for every FEAT-PD015 acceptance criterion **before** the migration exists. Sibling precedent to copy from: `hub/tests/integration/communication/realtime-hint-emission.test.ts` (C-C, FEAT-PD010) — it solved exactly this test-shape problem for conversations and forums.

New file: `hub/tests/integration/notifications/realtime-hint-and-policy.test.ts`.

**Why each assertion is genuinely red pre-apply:**

- **Emission (STORY-1):** no trigger exists on `public.notifications` (verified live), so a notification insert produces **zero** rows in `realtime.messages` on the recipient's topic. Every `toBe(1)` fails.
- **Nudge policy (STORY-2):** `ds5_config` does not exist, so the platform-announcement-suppression assertions cannot pass. Note the pre-apply state makes the *suppression* assertion accidentally green (zero hints because no trigger at all) — **that one must be written to also assert the community case emits**, so the pair cannot both pass without the real behaviour. Flag this explicitly; a suppression test alone is vacuous pre-apply.
- **Receipt (STORY-3):** the receive policy for `account:<uid>:notifications` does not exist, and RLS is enabled on `realtime.messages`, so the subscribe probe returns `CHANNEL_ERROR`/`TIMED_OUT` rather than `SUBSCRIBED`.
- **Durability (STORY-4):** the offline/reconnect reads pass pre-apply (the durable rows already work — that is the point of the guarantee), so these are **labelled regression/invariant guards, not red-first**. The genuinely-red one is the forged-id assertion paired with an emitted hint.
- **Publication (STORY-5):** `pg_publication_tables` currently returns `public.notifications` for `supabase_realtime`, so `toHaveLength(0)` fails.

## Acceptance criteria

- [ ] One test per FEAT-PD015 acceptance criterion, each tagged with its story ID in the test name.
- [ ] Every test **run and its red output captured** before any migration SQL is written.
- [ ] Tests that are green pre-apply are **labelled honestly in the file docblock** as invariant/regression guards, never counted in the red-first claim (the C-C docblock is the model — it separates red-first from green-throughout explicitly).
- [ ] The receipt gate is a **WebSocket subscribe probe** (`probeSubscribe`), not a SQL SELECT — `realtime.topic()` returns NULL outside Realtime's join-time authorization, so a SELECT would deny everyone and prove nothing.
- [ ] Emission assertions query `realtime.messages` via `runAdminSql` (the table is not PostgREST-exposed) and assert the payload at **key-set level** — the row id present, and title/body/type/category **absent**.
- [ ] A no-send-policy structural assertion over `pg_policies`: the four receive policies exist and **no** INSERT/ALL policy exists on `realtime.messages`.
- [ ] Fixtures use `createTestUser` so personal groups and notification ids are fresh per run and cannot collide with prior runs' `realtime.messages` rows.
- [ ] `jest.setTimeout(180_000)`; suite runs with `--runInBand`.

## Technical notes

- Helpers: `createTestClient`, `createAdminClient`, `createTestUser`, `cleanupTestUser`, `cleanupTestGroup`, `signInWithRetry`, `withAnonRateLimitRetry`, `runAdminSql` from `@/tests/helpers/supabase`.
- The subscribe probe needs its own `ws` transport — `jest-environment-node` exposes no `WebSocket` global (see C-C `:165-195`).
- Announcement fixtures: `send_community_announcement(p_group_id, p_title, p_body)` needs the `send_announcements` permission (Steward template grants it); `send_platform_announcement` is admin-gated.
- A platform announcement fans out to **every** FIM — in a shared dev DB that is ~1,274 rows per call. Use it **sparingly** (ideally once) and assert on hint counts for the *fixture* users only, never on global counts.
- Do **not** run this concurrently with another integration suite against the shared dev DB (house rule).

## Verification

- `cd hub && npx jest --selectProjects integration --runInBand --testMatch "**/tests/integration/notifications/realtime-hint-and-policy.test.ts"` — red, with each failure attributable to an absent trigger/table/policy rather than a broken test.
- Capture the red output into the task record before proceeding to TASK-NC-02.
