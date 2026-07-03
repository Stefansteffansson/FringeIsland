# Session bridge — Cycle E decomposed: IDN-11 sessions (FEAT-PC009 + FEAT-H012 4-ready, ADR-U039 socket doctrine)

**Date:** 2026-07-03
**Session type:** Feasibility gate + legacy-MVP review + Cycle E decomposition (same session; follows bridge `2026-07-03_03`).
**Status:** **Specs authored to `4-ready`; PR open awaiting the merge nod** (the batch carries an ADR and steering-file edits — fuller-auto carve-outs).
**Participants:** Stefan + Claude

---

## The feasibility gate (passed)

Cycle E was gated on "confirm Supabase support for per-device session listing + remote sign-out." Verified against the dev DB and current Supabase docs (evidence inline in the [phase-3 plan](../hub-v2/phase-3-identity-completion-plan.md) row E, merged as PR #55):

- **No member-facing SDK path** — supabase-js has no session-list API and `signOut` grains are only `local`/`others`/`global`. The contract therefore lands below the Platform API (ADR-U038 house pattern), which the substrate supports:
- `auth.sessions` is the **documented** session store; the JWT `session_id` claim officially correlates with its PK (docs-blessed "this device" marking + row-existence liveness check). `user_agent`/`ip` populated 56/56 on dev; **last-active = `updated_at`** (`refreshed_at` unreliable, 3/56).
- `auth.refresh_tokens.session_id` FK is **ON DELETE CASCADE** — deleting one session row kills that device's refresh chain. `admin_force_logout` is the schema-gate-approved precedent for SECURITY DEFINER deletes from `auth.sessions`.
- **Caveat:** a revoked session's access token stays valid until `exp` (documented) — mitigated below.

## The legacy-MVP review (Stefan's catch)

The legacy Hub solved *felt-instant* forced logout (`hub-legacy/lib/auth/AuthContext.tsx`): Realtime broadcast per user for sub-second sign-out + 10s/on-focus `getUser()` validation as the guaranteed fallback (GoTrue checks session-row existence server-side). Two weaknesses identified for v2: the broadcast was client-sent on a public channel (spoofable) and the client blind-signed-out on receipt. Also reviewed legacy **notifications**: durable `notifications` table + `postgres_changes` full-row push (RLS-checked per subscriber — correct, but the mechanism Supabase now steers away from at scale). Stefan's proposed v2 shape — **ping-then-fetch** (socket carries a hint; client re-fetches via the authorized path) — adopted as doctrine.

## What was decided and authored

1. **[ADR-U039 — Realtime socket doctrine](../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md)** (proposed; locks at merge): one socket per client; **private channels only** (RLS on `realtime.messages`); **server-originated** hints via `realtime.send()` (verified present on the instance); **hint-never-authority / verify-on-signal**; durable-first, poll-as-fallback. Amends the Hub channel-scope rule (`docs/products/hub/CLAUDE.md` + `SPECIFICATION.md` §L2 §1/§4): the named list is now doctrine-governed — session-signal channel realized; DM + notification-bell forward-looking (v2 shape = ping-then-fetch, decided in their areas).
2. **PC-2 §L3 maintenance** (`identity-specification.md`): new capability row **"Session inventory & targeted revocation (own-subject)"** + dependency-chain and external-deps (PC-1 Realtime) entries — closes the G-29-routed reciprocation gap flagged by Hub §L3 (the gap-table row now points at the reciprocation).
3. **[FEAT-PC009](../../platform/core/features/FEAT-PC009-session-inventory-and-revocation.md) (4-ready, PC-2, platform half of IDN-11):** `get_own_sessions()` (jsonb inventory, `is_current` via the `session_id` claim; **`auth.uid()`-direct so it survives suspension** — the PC008 pattern; FIM-only, Mist 42501) + `revoke_own_session(p_session_id)` (own-row delete, cascade kills refresh; P0002 no-existence-leak; current-session revoke allowed) + the server-emitted `session_revoked` hint on private topic `account:<auth_uid>:sessions` + one durable audit row. No new table. **Schema gate at build** (SECURITY DEFINER + `realtime.messages` policies + grants).
4. **[FEAT-H012](../../products/hub/features/FEAT-H012-per-device-sessions.md) (4-ready, Hub half):** FIM-only `/sessions` page + `SessionsPanel` (device line from raw UA — no parser; "This device" badge; ConfirmModal revoke; mutations re-read; survives suspension), BFF `GET /api/sessions` + `DELETE /api/sessions/[id]` (Edge+dub1, SQLSTATE→HTTP, content-free telemetry — UA/IP never logged), and the **AuthContext doctrine tenant**: private-topic subscription, verify-on-signal (spoofed hint = no-op), focus/visibility revalidation + ~60s visible-tab poll (legacy's 10s poll relaxed — the hint carries immediacy). No revoke-all button in v1; no new-sign-in alerting (future Notifications).
5. **Indexes/summaries updated in the same batch:** both features READMEs, PC-2 §L4 + Hub §L4 rows and coverage note, Hub §L3 gap-table row, phase-3 plan row E.

## Open points carried into the build session

- Audit-substrate default (`admin_audit_log`) confirmed at the schema gate (PC009 open Q1, same as PC008's).
- `realtime.send()` in-transaction failure semantics — hint must never fail the revocation (PC009 open Q2).
- `ip` fidelity (`inet`→text; sign-in vs latest-refresh) — verify at build (PC009 open Q3).

## State / next

- **PR open at the merge nod** (ADR-U039 + `hub/CLAUDE.md` steering edits are the carve-outs; the decomposition itself is docs-only, no schema).
- After merge: **Cycle E build, platform-first** — FEAT-PC009 red-first through its schema gate, then FEAT-H012. Then Cycle F (IDN-10 exit/deletion seam, still blocked on DS-3/DS-5). Perf T2 unchanged.
