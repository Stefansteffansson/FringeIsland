# Session bridge — Cycle E built: FEAT-PC009 + FEAT-H012 6-done (per-device sessions, IDN-11, ADR-U039 first tenant)

**Date:** 2026-07-03
**Session type:** Cycle E build (same session as the feasibility gate, legacy review, and decomposition — bridges `2026-07-03_04` and PRs #55/#56).
**Status:** **Built and verified; PR open at the schema gate** (new SECURITY DEFINER functions over `auth.sessions` + `realtime.messages` RLS policy + grants — the fuller-auto carve-out pauses for Stefan's merge nod).
**Participants:** Stefan + Claude

---

## What was built

**FEAT-PC009 — session inventory & targeted revocation (PC-2, platform half of IDN-11).**
Migration `20260703154102_feat_pc009_session_contracts.sql` (applied to dev + repaired; **no new table**):
- `get_own_sessions()` — own inventory over `auth.sessions`, newest-last-active (`updated_at`; `refreshed_at` unreliable per the gate), `is_current` via the JWT `session_id` claim, `ip` via `host()`; **`auth.uid()`-direct so it survives suspension** (PC008 pattern); FIM-only (Mist → 42501).
- `revoke_own_session(p_session_id)` — own-row delete (refresh tokens die by FK cascade), **P0002 no-existence-leak**, current-session revoke allowed, one durable `session_revoked` audit row (`admin_audit_log`, open Q1 → default), and the **ADR-U039 hint**: `realtime.send()` on private topic `account:<auth_uid>:sessions`, **exception-guarded** so a Realtime failure can never fail the revocation (open Q2 resolved).
- `realtime.messages` policy `session_signal_receive_own`: authenticated RECEIVE on the own topic only; **no client send policy** — hints cannot be spoofed by a peer.

**FEAT-H012 — the `/sessions` surface + the session guard (Hub half; no migration).**
- BFF `GET /api/sessions` + `DELETE /api/sessions/[id]` (Edge+dub1, SQLSTATE→HTTP, content-free telemetry — UA/IP never in events).
- `/sessions` page (journal-pattern gate; suspended FIM served) + `SessionsPanel` (device-line heuristic, "This device" badge, ConfirmModal revoke, mutations re-read, `sessionsChanged` listener) + AccountMenu link.
- **`hub/lib/auth/session-guard.ts` in AuthContext — the ADR-U039 first tenant:** one private-topic subscription per FIM, **verify-on-signal** (`getUser()` before any sign-out; spoofed hint = proven no-op), other-device hints nudge the open list, focus/visibility + 60s visible-tab fallback validation (legacy's 10s blind pattern, corrected). `replaceLocation` helper isolates jsdom-unmockable navigation.

## Verification

- **Red-first honored:** PC009 9 integration tests demonstrated red (functions absent) → green post-migration; H012 route-unit 9, panel 9, guard 8 all red-first. Page-gate unit 3 **labelled test-after** (authored from the journal pattern).
- **Full pyramid green:** unit **220/220**; integration **109/109** (`--runInBand`); **E2E 35/35** (3 new: sessionless gate, the **live two-context remote sign-out**, current-device self-revoke); `next build` clean; lint 0 errors (one pre-existing unrelated warning).
- **API-boundary DoD:** adversarial direct-`rpc()` tests at the substrate (Mist 42501 both contracts; cross-user + ghost P0002; cross-subject exclusion; channel-auth join refusal exercised client-side).

## Found / learned this build

1. **Jest has no `WebSocket` global** (`jest-environment-node`) — realtime probes need the `ws` transport passed explicitly + `realtime.setAuth(<jwt>)`; verified SUBSCRIBED under plain node before concluding anything about the policy.
2. **First-ever Realtime use cold-boots the tenant** (partition creation in service logs) — a join during that window can close spuriously.
3. **Suite-order find (E2E):** `profile.spec` STORY-4's sign-out is scope-**global** — it server-revokes the shared storageState session; specs after it must not assume that session is alive server-side. The sessions journey runs on its own fresh logins and revokes exactly device B. Related accepted trade (ADR-U037): a locally-verified GET serves a revoked-session JWT until expiry — the session guard is precisely the catcher.

## Process notes

- Tasks: TASK-PC009-01/02 at **review** (schema gate); TASK-H012-01/02/03 done. Tasks stay until the cycle retrospective.
- Both specs `6-done` with Implementation notes; §L4 rows (identity-specification + hub SPECIFICATION), both feature indexes, CHANGELOG carried in this batch.

## State / next

- **PR open, waiting for the schema-gate merge nod** (auth-schema SECURITY DEFINER functions + realtime.messages policy + grants).
- After merge: **Cycle F (IDN-10 self-service exit/deletion) stays a forward-seam** — blocked on DS-3 (enrollment-freeze) + DS-5 (forum-content disposition) in the later Journeys/Communication areas. Phase 3 Identity is otherwise complete except parked IDN-12; next area per the dependency order is **Groups**. A **doc-health-check** at the cycle boundary remains the formal sweep. Perf T2 unchanged.
