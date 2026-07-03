# FEAT-H012: Per-device sessions — see every device you're signed in on, sign one out, and the device finds out fast

---
id: FEAT-H012
title: Per-device sessions — the /sessions surface rendering the FIM's own session inventory with targeted remote sign-out, plus the AuthContext signal-listener that makes a revoked device sign itself out in seconds (ADR-U039 first tenant)
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

IDN-11 (`hub/SPECIFICATION.md` §L3): a FIM signed in on several devices has no way to see where, and no way to cut off a device they no longer hold — a lost phone keeps a live session indefinitely. The platform half now exists as [FEAT-PC009](../../../platform/core/features/FEAT-PC009-session-inventory-and-revocation.md) (Cycle E; feasibility gate passed 2026-07-03). The Hub needs the surface: a place to see the inventory, an affordance to revoke one session — and the client-side half of the **felt-instant** sign-out the legacy MVP already delivered (`hub-legacy/lib/auth/AuthContext.tsx`), rebuilt on the [ADR-U039](../../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md) socket doctrine: verify-on-signal, private channel, fallback validation.

This is IDN-11's Hub half, consuming FEAT-PC009 API-first (ADR-U009): the Hub renders and relays; every rule lives in the substrate (ADR-U038).

## Solution sketch

Four pieces — a page, a panel, the BFF plumbing, and the AuthContext tenant of the socket doctrine:

- **`/sessions` page** (flat route, like `/journal`, `/consent`, `/export`), linked from the AccountMenu. FIM-only gate per house pattern: sessionless → login with redirect-back; a Mist is redirected (their sessions are unlinkable across devices by design — nothing coherent to render); a **suspended** FIM still gets the page (session control is security-protective; the PC009 contract deliberately survives suspension).
- **`SessionsPanel`** — renders the inventory newest-last-active first: a friendly device line derived client-side from the raw `user_agent` (presentation only — light heuristics, never a taxonomy), last-active and created-at times, the IP string, and a **"This device"** badge on the row whose `is_current` is true. Each row offers **Sign out** through `ConfirmModal` (house primitive); the current device's row uses distinct copy ("This will sign you out here, now"). After a successful revoke the panel **re-reads the list** (house mutation pattern); revoking the current session instead completes as a local `signOut()` + redirect to `/login`. Failures are non-destructive (list unchanged, error surfaced). Honest copy note: a remotely revoked device usually signs itself out within seconds (the hint), and is guaranteed out within the fallback-validation window — the UI says "signed out on that device shortly," never "instantly."
- **BFF routes** — `GET /api/sessions` (list) and `DELETE /api/sessions/[id]` (revoke), `@supabase/ssr` cookie auth, Edge + `dub1` (ADR-U036; both are member-facing hot paths and must stay Edge-safe). SQLSTATE→HTTP mapping (`42501`→403, `P0002`→404, sessionless→401), content-free telemetry (request id, actor, outcome — **never** `user_agent`/`ip` values in logs). Private BFF per ADR-U038 — no rule lives only here; the RPCs self-gate.
- **AuthContext: the signal-listener + fallback validation (ADR-U039 first tenant).** On authenticated mount, subscribe once to the private topic `account:<auth_uid>:sessions` — the Hub's first realized realtime channel (scope amended in `docs/products/hub/CLAUDE.md` + SPECIFICATION §L2 §4 under ADR-U039 in the same batch). On a `session_revoked` hint: if the payload's `session_id` is **this device's** session, **verify-on-signal** — call `supabase.auth.getUser()`; only if the auth server refuses does the client `signOut()` locally and `window.location.replace('/login')` (a spoofed or misdelivered hint is a no-op by construction); if it names a *different* session and `/sessions` is open, re-read the list. Fallback guarantee (doctrine rule 6): revalidate via `getUser()` on tab focus/visibility, plus a slow interval (~60s) while the tab is visible — an offline device that missed the hint is caught on its next wake. Respect the house deadlock rule: no queries inside `onAuthStateChange`; the listener sets state, effects act on it.

## Appetite

Medium — the Cycle D shape. One page + panel + two BFF routes are the established pattern; the genuinely new surface area is the AuthContext realtime tenant (subscription lifecycle, verify-on-signal, the validation timers) and its tests. No migration of its own (substrate lands platform-side in FEAT-PC009).

## Rabbit holes

- **Don't build a user-agent parser.** A few honest heuristics ("Chrome · Windows", fall back to the raw string) — no UA-parsing library, no device-icon taxonomy.
- **Don't promise "instant."** The access token of a revoked session stays valid until `exp` (documented). The hint makes it *feel* instant when the device is online; the copy and the tests speak in "shortly / within the validation window," never absolutes.
- **Don't blind-sign-out on the hint.** Verify-on-signal is the doctrine's load-bearing rule — the legacy client's blind `signOut()` on broadcast is exactly what v2 fixes.
- **Don't poll aggressively.** The legacy 10s interval did double duty; v2's hint carries immediacy, so the poll is a slow safety net (visible-tab only — browsers throttle background timers anyway). Tune constants in one place.
- **Don't leak session PII into telemetry.** `user_agent` and `ip` render for the member; they never enter logs or error payloads (content-free discipline, the journal precedent).
- **Don't manage the subscription per-page.** The listener lives in AuthContext (it must run on *every* page — a revoked device isn't sitting on `/sessions`); `/sessions` only adds the list-refresh reaction.

## No-gos

- No Mist surface (nav hidden + deep-link redirected, the `/journal` pattern) — contract-consistent (PC009 is FIM-only).
- No admin view of anyone else's sessions (`admin_force_logout` is the admin tool; A-ADM territory).
- No session naming/labeling, no geo-IP resolution, no session history — the live inventory only.
- No "sign out all other devices" button in v1 — the SDK's `signOut({scope:'others'})` makes it cheap, but it's additive scope; keep Cycle E to IDN-11's list + targeted revoke. (If pulled in later it's a Surface-only change.)
- No new-sign-in alerting (future Notifications-area feature).
- No second WebSocket, no public channel, no `postgres_changes` — ADR-U039 binds the mechanism.

## Stories

### STORY-1: See where I'm signed in
As a FIM, I want to see every device with an active session on my account, so I can spot one I don't recognise or no longer hold.

**Acceptance criteria:**
- Given an authenticated FIM on `/sessions`, when the page loads, then they see one row per active session — device line (from `user_agent`), IP, created-at, last-active — ordered newest-last-active first, with a "This device" badge on the current session (which is always present: the viewer is using it).
- Given a sessionless visitor, when they open `/sessions`, then they are sent to login and returned after signing in; given a Mist, then they are redirected away (no sessions surface for a Mist).
- Given a suspended FIM, when they open `/sessions`, then the inventory renders and revocation works — session control survives suspension.

### STORY-2: Sign out one device
As a FIM, I want to sign out a specific device from here, so a lost or abandoned session stops being a standing risk.

**Acceptance criteria:**
- Given the session list, when the FIM chooses Sign out on a non-current row and confirms in the `ConfirmModal`, then the revoke succeeds and the re-read list no longer contains that session; the other rows are untouched.
- Given the revoke fails (network, `P0002` because it was already gone), when the error returns, then the list re-reads to the truthful state and an error message shows — nothing is destructively assumed.
- Given the current-device row, when the FIM confirms its distinct ConfirmModal copy, then the revoke completes as an immediate local sign-out and redirect to `/login`.

### STORY-3: The revoked device signs itself out fast (verify-on-signal)
As a FIM, I want the device I just revoked to drop out within seconds when it's online, so remote sign-out feels real.

**Acceptance criteria:**
- Given device B online on any Hub page, when the FIM revokes B's session from device A, then B receives the `session_revoked` hint on the private topic, **verifies** with the auth server (`getUser()`), and — the session being refused — signs out locally and lands on `/login` with history replaced.
- Given a hint arrives naming a session that is **not** this device's, when it fires on a device with `/sessions` open, then the list re-reads; on any other page, nothing user-visible happens.
- Given a spoofed or stale hint (the session is still valid when verified), when the client checks with the auth server, then nothing happens — no sign-out, no state change (a hint is never an authority).

### STORY-4: The guarantee when the hint is missed
As a FIM, I want a revoked device that was asleep or offline to be signed out promptly when it comes back, so the hint path failing costs latency, never security.

**Acceptance criteria:**
- Given a revoked device that missed the hint, when its tab regains focus or visibility, then the immediate revalidation catches the dead session and signs it out to `/login`.
- Given the same device left open and visible, when the slow validation interval next fires (~60s), then the dead session is caught the same way.
- Given the device only returns after its access token expired, when it attempts any authenticated action or token refresh, then the refusal path signs it out — there is no state in which a revoked session quietly keeps working past the validation window.

### STORY-5: One socket, one doctrine
As the platform, I want the Hub's first realtime tenant to establish the ADR-U039 conventions cleanly, so notifications and DMs later join a working pattern instead of a one-off.

**Acceptance criteria:**
- Given an authenticated Hub client, when AuthContext mounts, then exactly one subscription to `account:<auth_uid>:sessions` exists on the shared socket — created `private: true`, torn down on sign-out/unmount, and never duplicated across pages.
- Given any client attempting to join another member's topic, when the subscribe is attempted, then Realtime authorization refuses it (substrate policy, exercised from the client side in tests).
- Given telemetry for hint handling, when a hint is received/acted on, then events are content-free (event type + outcome; no session ids beyond correlation needs, no UA/IP).

## Platform dependencies

- **[FEAT-PC009](../../../platform/core/features/FEAT-PC009-session-inventory-and-revocation.md)** — `get_own_sessions()` / `revoke_own_session()` + the server-emitted hint + `realtime.messages` authorization (schema gate lands platform-side; this feature carries no migration).
- **[ADR-U039](../../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md)** — the socket doctrine this feature instantiates; the Hub channel-scope amendment (entity CLAUDE + SPECIFICATION §L2 §4) rides in the same decomposition batch.
- **Existing Hub substrate** — AuthContext (`hub/lib/auth/AuthContext.tsx`), AccountMenu, `ConfirmModal`, the FIM-only page-gate pattern, Edge+`dub1` BFF conventions (ADR-U036/U038).

## Cross-product impact

The **Gimbal** consumes the same PC009 contracts and the same channel/doctrine for its session-management affordance — verify-on-signal and the fallback validation are surface-agnostic; only the rendering differs. Nothing here is Hub-shell-specific except the page/panel.

## Vertical impact

- **Privacy/GDPR:** renders the member's own device/IP data to the member only — a transparency-and-control surface (cutting an unauthorized device is the protective act GDPR's security expectations point at). Session PII stays on-screen: never in telemetry, never in the hint payload.
- **Notifications:** None — the hint is session control on the member's own devices, not a notification (no bell, no preferences). "New sign-in detected" alerting is future Notifications-area scope.
- **Administration:** None new — no admin affordance; the platform half's audit row covers the accountability trail.
- **Observability:** content-free telemetry on page/route/hint paths (request id, actor, outcome); revocation failures and refused subscriptions are recorded errors, never silent.
- **Transactions:** None.
- **Extensibility:** the device line is a presentation heuristic over the raw string (no sealed UA taxonomy); the AuthContext subscription is written as the first tenant of a doctrine-shaped mechanism (topic + handler registered, not hardcoded one-off) so notifications/DM tenants extend rather than fork it.

## Implementation notes (6-done — Cycle E, 2026-07-03)

Built TDD red-first over the FEAT-PC009 substrate; carries no migration of its own.

- **Lib** `hub/lib/sessions/queries.ts` (typed RPC wrappers) + `hub/lib/sessions/client.ts` (browser transports over the BFF). **Routes** `GET /api/sessions` + `DELETE /api/sessions/[id]` — Edge+`dub1` (ADR-U036), `@supabase/ssr` cookie auth (GET via `getVerifiedUserId`/local claims per ADR-U037; DELETE via `getUser`), SQLSTATE→HTTP (42501→403, P0002→404), content-free telemetry (UA/IP never in events or error bodies — asserted). Route-unit **9/9**, demonstrated red (modules absent).
- **Surface** `hub/app/sessions/page.tsx` (the /journal gate pattern; suspended FIM still served) + `hub/components/sessions/SessionsPanel.tsx` — `describeDevice()` heuristic (a few `includes` checks, raw-string honesty), rows newest-last-active with the "This device" badge, ConfirmModal-gated revoke, mutations re-read (never optimistic), current-device revoke → local `signOut()` (the page gate redirects), `sessionsChanged` listener re-reads when the guard hears another device revoked. AccountMenu link. Panel unit **9/9** red-first; page-gate unit **3/3 (labelled test-after** — authored from the journal pattern before its test).
- **The ADR-U039 tenant** `hub/lib/auth/session-guard.ts`, wired in AuthContext: one private-topic subscription per authenticated FIM (`account:<auth_uid>:sessions`, `realtime.setAuth` before join), **verify-on-signal** (a hint naming this device triggers `getUser()`; only refusal signs out → `replaceLocation('/login')`; spoofed/stale hint = proven no-op), other-device hints dispatch `SESSIONS_CHANGED_EVENT`; fallback validation on focus/visibility + a 60s visible-tab interval (the legacy oracle's 10s poll relaxed — the hint carries immediacy; network failure is never treated as refusal). `replaceLocation` isolated in `hub/lib/auth/redirect.ts` (jsdom's location is unmockable in place). Guard unit **8/8** red-first.
- **E2E** `hub/tests/e2e/sessions.spec.ts` — **3 tests**: sessionless gate redirect; the two-context remote sign-out (device B, parked on /groups, lands on /login after device A revokes it — the live hint path, with `bringToFront` also arming the focus fallback so the assertion is deterministic); current-device self-revoke with the distinct copy. **Suite-order find:** profile.spec's STORY-4 sign-out is scope-global and server-revokes the shared storageState session — the journey therefore runs on its own fresh sessions and revokes exactly device B (never the shared session). Related observed behaviour, accepted per ADR-U037: a GET route verified by local claims serves a revoked-session JWT until expiry — the guard/refresh path is precisely what catches it.
- **Gates:** unit **220/220** (incl. the three suites above + page gate), integration **109/109** (`--runInBand`), **E2E 35/35**, `next build` clean, lint 0 errors (one pre-existing unrelated warning). API-boundary DoD: the contracts self-gate substrate-side with adversarial direct-`rpc()` tests (Mist, cross-user, ghost) in the PC009 suite; the routes are private-BFF presentation only.
