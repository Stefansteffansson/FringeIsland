# FEAT-PC009: Session inventory & targeted revocation — see every device you're signed in on, and sign one out

---
id: FEAT-PC009
title: Session inventory & targeted revocation — own-subject contracts to list the caller's active sessions per device and revoke a specific one, with a server-originated instant-sign-out hint (ADR-U039)
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A FIM can be signed in on many devices — by default a Supabase session lasts indefinitely, and a member has **no way to see** where they are signed in or to **sign out a device they no longer hold** (a lost phone, a library computer, a housemate's laptop). §L3 (`hub/SPECIFICATION.md` IDN-11) names the capability — "render and manage per-device sessions (active sessions list, remote sign-out)" — and records the platform half as a **cross-entity gap routed to G-29**: `admin_force_logout` exists, but no member-facing session inventory or targeted revocation. The [phase-3 plan](../../../planning/hub-v2/phase-3-identity-completion-plan.md) sequences it as **Cycle E**, gated on the feasibility check that **passed 2026-07-03** (row E carries the evidence).

The SDK cannot cover this: supabase-js offers no session-listing API, and its `signOut` grains are only `local` / `others` / `global` — there is no "sign out *that* device." The substrate can: `auth.sessions` is the documented session store (the JWT `session_id` claim officially correlates with its primary key), `user_agent` / `ip` are populated, and `auth.refresh_tokens.session_id` is `ON DELETE CASCADE` — deleting one session row kills that device's ability to continue.

This is the platform half of IDN-11, consumed API-first by the Hub ([FEAT-H012](../../../products/hub/features/FEAT-H012-per-device-sessions.md)) and any future surface.

### Why Platform Core (Identity), not a Domain Service

Sessions are auth substrate — PC-2 owns the session lifecycle end-to-end (§L2 §6: sign-in produces it, refresh extends it, sign-out terminates it; this adds *enumerate* and *terminate-one*). No Domain Service may read or delete `auth.sessions` rows without breaking the one-way Domain→Core rule, and the elevation required (SECURITY DEFINER against the `auth` schema) is exactly the privilege Core exists to bound. The schema-gate-approved precedent is `admin_force_logout` (deletes from `auth.sessions` / `auth.refresh_tokens`); this feature is the same mechanics scoped to the caller's own rows. It cannot be modelled in Domain or via Extensions.

## Solution sketch

Two own-subject `SECURITY DEFINER` contracts over **existing** substrate (**no new table**), plus the first realized channel under the **ADR-U039 socket doctrine**:

- **`get_own_sessions()`** — `SECURITY DEFINER`, `SET search_path = ''`, STABLE. Resolves the caller via `auth.uid()` **directly** (not the four-hop actor primitive — deliberately, as in FEAT-PC008's export: a **suspended** member must still be able to see and cut their sessions; P-O1 is overridden here with this stated reason). FIM-only (an anonymous Mist gets 42501 — Mist sessions are unlinkable across devices by design; there is no coherent cross-device inventory for a Mist). Returns a `jsonb` array, newest-last-active first; each element: `id`, `created_at`, `last_active` (from `updated_at` — `refreshed_at` is unreliably populated; feasibility-gate finding), `user_agent` (raw string), `ip` (text), `is_current` (`id` = the caller's JWT `session_id` claim). Own rows only; no target parameter.
- **`revoke_own_session(p_session_id uuid)`** — `SECURITY DEFINER`, `SET search_path = ''`, VOLATILE. Deletes the session row `WHERE id = p_session_id AND user_id = auth.uid()`; refresh tokens die by FK cascade. A foreign or nonexistent id raises `P0002` — no existence leak (the `delete_journal_entry` pattern). Revoking the **current** session is allowed (the Surface pairs it with a local sign-out). On success it: (1) writes one durable `session_revoked` row to `public.admin_audit_log` (the PC008 inline-INSERT precedent — see Open spec questions), and (2) emits the **instant-sign-out hint** server-side: `realtime.send(jsonb payload {session_id}, 'session_revoked', 'account:<auth_uid>:sessions', private => true)`. The payload carries the event and the id — never content (ADR-U039 rule 4).
- **Private-channel authorization** — RLS policies on `realtime.messages` allowing an authenticated caller to **receive** on their own topic only (`account:<their auth.uid()>:sessions`); no client send policy (signals originate in the substrate; the RPC's elevation writes the message). This is the schema substrate of ADR-U039 rules 2–3 and ships in this migration.

**The direct-caller answer (ADR-U038):** `auth.sessions` is not exposed through PostgREST at all; the two RPCs are the *only* client path, each self-gating on `auth.uid()`. A direct PostgREST caller — including an anonymous-session Mist — can list or revoke nothing beyond their own rows (and for a Mist, nothing at all).

## Appetite

Small-to-medium — the Cycle A/C shape. One migration (two functions + the `realtime.messages` policies + grants), integration tests for the inventory shape, the own-subject boundary, the revocation cascade, and the hint emission. No new table; the substrate and the precedent both exist.

## Rabbit holes

- **Don't parse user-agents platform-side.** Return the raw `user_agent` string; "Chrome on Windows" prettifying is a Surface presentation concern (and a classic scope sink).
- **Don't build session liveness detection.** Every session keeps one non-revoked refresh token (rotation); dormant sessions are not reliably distinguishable substrate-side. The inventory lists what exists, sorted by last-active; the member prunes. No "stale" flag, no cleanup job.
- **Don't chase the access-token window platform-side.** A revoked session's access token stays valid until `exp` (documented Supabase behaviour). The hint + the Surface's verify-on-signal/fallback validation (FEAT-H012) close the *felt* gap; do not add per-request session checks to unrelated RPCs in this feature.
- **Don't touch the dashboard session knobs.** Time-box / inactivity-timeout / single-session are Pro-plan, project-global settings — adjacent, not this contract.
- **Mind the timestamp boundary** (`+00:00` vs `Z` — platform gotcha): return timestamps as ISO strings and let consumers compare as epoch ms.
- **Mind `auth`-schema writes.** The revocation deletes rows GoTrue owns. Deletion of *data rows* is the established, docs-consistent mechanism (sign-out *is* row removal; `admin_force_logout` precedent) — but stay strictly to `DELETE` on `auth.sessions` by `id + user_id`; never mutate other auth tables or any auth DDL.

## No-gos

- No admin surface and no cross-subject path — `admin_force_logout` already covers the admin case; this is strictly own-subject.
- No revoke-all contract — `signOut({ scope: 'others' | 'global' })` already exists in the SDK; the Surface uses it directly.
- No new table, no session metadata enrichment (geo-IP lookup, device naming/labels), no session history — the inventory is the live `auth.sessions` state, nothing more.
- No notification to the member ("new sign-in on your account" alerting is a future Notifications-area feature, not this contract).
- No change to JWT TTL or any global auth setting.
- No `postgres_changes` subscription and no public channel — ADR-U039 binds the mechanism.

## Stories

### STORY-1: List my sessions — one row per device, honestly described
As the platform, I want an authenticated FIM to receive their own active sessions as data, so a Surface can render "where am I signed in?" API-first.

**Acceptance criteria:**
- Given a FIM signed in on multiple devices, when they call `get_own_sessions()`, then they receive one element per active session carrying `id`, `created_at`, `last_active`, `user_agent`, `ip`, and `is_current`, ordered newest-last-active first.
- Given the session making the call, when the list returns, then exactly that session carries `is_current = true` (matched via the caller's JWT `session_id` claim).
- Given a **suspended** FIM, when they call `get_own_sessions()`, then the call succeeds — session control is security-protective and survives suspension.
- Given an anonymous-session Mist, when they call `get_own_sessions()`, then the call raises `42501` (FIM-only).

### STORY-2: Revoke one session — that device, and only that device, loses its standing
As the platform, I want a FIM to terminate one specific session of their own, so a lost or abandoned device can be cut off without touching the others.

**Acceptance criteria:**
- Given a FIM with sessions A and B, when they call `revoke_own_session(B)`, then session B's row is deleted, B's refresh tokens are gone (FK cascade), and session A is untouched.
- Given a revoked session, when that device next refreshes its token or calls `getUser()`, then the auth server refuses — the session cannot continue past its current access token's `exp`.
- Given a session id belonging to another user, or no session at all, when `revoke_own_session` is called with it, then it raises `P0002` — indistinguishable between "not yours" and "doesn't exist" (no existence leak).
- Given a FIM revoking their **current** session, when the call succeeds, then the same semantics apply (the Surface pairs it with a local sign-out).

### STORY-3: The instant-sign-out hint — server-originated, private, content-free
As the platform, I want each revocation to emit a hint on the owner's private channel, so the revoked device can react in seconds instead of waiting for token expiry (ADR-U039, first tenant).

**Acceptance criteria:**
- Given a successful `revoke_own_session(X)`, when the function completes, then a `session_revoked` message with payload `{session_id: X}` has been sent via `realtime.send()` on the private topic `account:<auth_uid>:sessions` — emitted by the substrate, not by any client.
- Given an authenticated member subscribed to **their own** topic, when the hint fires, then they receive it; given any caller attempting to subscribe to **another member's** topic, then Realtime authorization (RLS on `realtime.messages`) refuses the join.
- Given no client-side send policy exists, when any client attempts to broadcast onto a session topic, then the send is refused — a spoofed hint cannot originate from a peer.

### STORY-4: Own-subject only, and no path around the contract
As the platform, I want the session substrate reachable only through these self-gating contracts, so exposure never widens (ADR-U038 direct-caller answer).

**Acceptance criteria:**
- Given any authenticated caller, when they call either contract, then it resolves strictly to `auth.uid()`'s own rows — no parameter targets another subject, and no path returns or deletes another subject's session.
- Given a direct PostgREST caller of any role, when they attempt to read or write `auth.sessions` outside these RPCs, then no such surface exists — the `auth` schema is unexposed and the RPCs are the only client path.

### STORY-5: A durable record that the revocation happened
As the platform, I want each targeted revocation recorded durably, so account-security actions leave an accountability trail.

**Acceptance criteria:**
- Given a successful revocation, when the contract completes, then one durable `session_revoked` audit row exists identifying the subject and the server-stamped time (substrate per Open spec question 1).
- Given a failed revocation (`P0002`), when the call returns, then no audit row and no hint were emitted.

## Platform dependencies

- **PC-2 Identity — session substrate (existing).** `auth.sessions` / `auth.refresh_tokens` (Supabase Auth substrate; PC-2 owns the lifecycle conventions per §L2 §6). The JWT `session_id` claim provides current-session correlation (documented Supabase contract).
- **PC-1 Infrastructure — SECURITY DEFINER discipline + Realtime substrate.** `realtime.send()` (verified present on the instance) and RLS-policy authorization on `realtime.messages` per ADR-U039.
- **PC-4 Governance — durable audit substrate (existing).** `public.admin_audit_log` via the inline-INSERT pattern (FEAT-PC005/PC008 precedent), pending Open spec question 1.
- **Schema gate.** New SECURITY DEFINER functions + `realtime.messages` policies + grants → task status `review`, explicit nod (Platform Core + schema carve-outs). Each function's migration comment documents why the elevation is needed (auth-schema access bounded to the caller's own rows).

## Cross-product impact

Consumed by **Hub [FEAT-H012](../../../products/hub/features/FEAT-H012-per-device-sessions.md)** (IDN-11) — the `/sessions` surface and the AuthContext signal-listener. The **Gimbal** will consume the same contracts for its own session-management affordance; the hint channel and verify-on-signal semantics are surface-agnostic (ADR-U039). Additive only — no existing contract changes.

## Stability posture (Platform Core §7)

Additive: two new `SECURITY DEFINER` functions, `realtime.messages` policies, one audit-write pattern reuse. No existing Core contract signature changes. Both functions are privilege-escalation surfaces (auth-schema read / delete + elevated realtime send), documented as such in the migration; their elevation is bounded to the caller's own session rows and own topic, nothing more.

## Vertical impact

- **Privacy/GDPR:** session rows carry personal data (IP address, user-agent); the contracts expose them strictly own-subject — a member sees only their own devices, and gains the protective control GDPR's security expectations point at (cutting an unauthorized device). Erasure is already covered: account erasure hard-deletes the auth user and its sessions. The hint payload is content-free (a session id), so nothing personal transits the socket.
- **Notifications:** None — the hint is a session-control signal to the member's own devices, not a member-facing notification (no bell, no preference). A future "new sign-in detected" alert is a separate Notifications-area feature.
- **Administration:** complements the existing `admin_force_logout` (admin cuts *all* of a user's sessions; the member cuts *one* of their own). No new admin action; the audit row makes member self-revocations visible to whatever audit tooling reads the log.
- **Observability:** each revocation writes the durable audit row (STORY-5); the consuming route (FEAT-H012) emits structured request logs (actor, outcome); refusals surface as SQLSTATEs, never silent empties.
- **Transactions:** None.
- **Extensibility:** the inventory is a `jsonb` array of named fields — additive fields extend it without reshaping; the topic naming (`<area>:<subject-id>:<purpose>`) and hint shape follow ADR-U039 so later tenants (notifications, DMs) join the same doctrine rather than inventing parallel ones; no enums, no sealed sets.

## Open spec questions

1. **Audit substrate (resolve at the build-session schema-review gate).** The `session_revoked` durable record defaults to `public.admin_audit_log` (the PC008 precedent and the only existing durable audit substrate). Same open point as PC008's: whether member-initiated security events eventually deserve a dedicated log. Decided with the migration; the default is clear.
2. **Hint-emission failure semantics.** If `realtime.send()` errors (Realtime unavailable), the revocation itself must still commit — the hint is an accelerant, not the contract (ADR-U039 rule 5/6: the fallback validation catches it). Confirm at build whether `realtime.send()` can raise in-transaction and guard accordingly (exception-swallowing around the send only).
3. **`ip` column fidelity.** `inet` → text conversion and whether the value reflects the original sign-in or the latest refresh (observed populated 56/56 on the dev DB). Verify at build; presentation stays Surface-side either way.
