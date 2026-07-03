# AuthContext ADR-U039 tenant (signal-listener + fallback validation) + E2E + finalize

---
id: TASK-H012-03
title: AuthContext doctrine tenant — private-topic subscription, verify-on-signal, focus/visibility + slow-poll fallback; E2E; finalize both features
status: todo
assigned_to: claude
priority: high
feature: FEAT-H012
owner: hub
wave: ferd
cycle: E
depends_on: [TASK-H012-02]
estimated_hours: 4
---

## Description

FEAT-H012 STORY-3/4/5 — the first ADR-U039 tenant in `hub/lib/auth/AuthContext.tsx`: subscribe once (authenticated mount) to private topic `account:<auth_uid>:sessions` on the shared socket; on `session_revoked` — **verify-on-signal**: if payload names this device's session, `getUser()`; only on refusal → local `signOut()` + `window.location.replace('/login')`; other-session hints refresh `/sessions` if open. Fallback: `getUser()` revalidation on focus/visibility + ~60s visible-tab interval. House deadlock rule: no queries inside `onAuthStateChange`. Then E2E (revoke flow across two contexts; page gates) and finalize: full pyramid + `next build` + lint, both specs → `6-done` (+ §L4 rows, indexes, CHANGELOG, bridge).

## Acceptance criteria

- [ ] Unit tests RED→GREEN: subscription lifecycle (mount/sign-out/unmount, no duplicates); verify-on-signal (mine+refused → sign-out; mine+still-valid → no-op; not-mine → list refresh only); focus/visibility/interval revalidation triggers
- [ ] E2E: revoke from context A signs out context B's page; `/sessions` gates (sessionless redirect, Mist redirect)
- [ ] Test DoD + API-boundary DoD checked; unit + integration (`--runInBand`) + E2E + `next build` + lint all green
- [ ] Both specs `6-done` with honest Implementation notes (red→green evidence; any test-after labelled)

## Technical notes

Mock `supabase.channel()` in unit tests (subscribe/on/removeChannel spies) — the live-path proof is E2E. Timer tests via jest fake timers. Legacy oracle for the validation shape: `hub-legacy/lib/auth/AuthContext.tsx:179-223` (copy-with-correction: 10s→60s visible-only, blind sign-out → verify-on-signal).

## Verification

Full pyramid green; both features `6-done`; PR at the schema gate.
