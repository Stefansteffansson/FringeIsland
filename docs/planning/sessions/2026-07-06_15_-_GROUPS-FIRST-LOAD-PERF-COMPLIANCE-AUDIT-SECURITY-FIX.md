# Session bridge — Groups first-load perf (ADR-U042), full compliance audit, and a live anon-EXECUTE security fix

**Date:** 2026-07-06 (same day as `_14`, after the Groups build closed)
**Session type:** A reactive perf investigation that widened into a compliance audit and a critical security remediation. Triggered by Stefan reporting a 3-5 s spinner on the first "My Groups" load. Measured → root-caused → fixed in three phases → then Stefan asked for a full anatomy/API compliance check, which found (and this session fixed) a live production vulnerability.
**Status:** Everything merged; `main` clean and synced through **PR #106** (`f802e79`). Dev DB current through migration **`20260706201500`** (the security lockdown, applied live under the schema gate). No PRs held, nothing dangling. Unit 441/441, `next build` clean.
**Participants:** Stefan (repro help — live sign-ins for the authenticated waterfall measurements; five merge/gate nods; enabled Fluid compute) + Claude.

---

## What was built / merged (in order)

- **PR #102 — Groups first-load Phase 1** (`fix/groups-first-load-client-waterfall`). Killed the measured **3× GET /api/groups** per load (the page effect was keyed on the `user` object, which the auth listener re-issues per hydration event: `getSession` resolve → `INITIAL_SESSION` → `TOKEN_REFRESHED`). Re-keyed on `user?.id`; added a stale-while-revalidate session cache (`peekMyGroups`/`fetchMyGroups`/`invalidateGroupsCache` in `hub/lib/groups/client.ts`, profile-client prior art, in-memory only). Instant paint on revisit; spinner only on true first read.
- **PR #103 — Groups first-load Phase 2, ADR-U042** (`feat/adr-u042-bootstrap-read`). **ADR-U042** (Accepted): the first-paint bootstrap read is a **BFF bundle, not a platform RPC**. `GET /api/me/overview` (Edge + `dub1` + `getClaims`) fans out to the five existing substrate reads concurrently in one invocation, per-slice `{data}|{error}` envelopes, bundle-only (no derivation/authorization beyond the substrate reads). `OverviewBoot` (first child inside `AuthProvider`, wins the same-commit effect race) fires it once per session for a FIM on `/`, `/login`, `/groups`; slices adopted by the per-resource clients; bundle **transport** failure falls each consumer back to its standalone read. The RPC option (A) was rejected: surface-shaped bundle → no platform L3 owner; parallel fan-out (RTT+max) ties/beats serial RPC (RTT+sum). Guardrails canonical in the ADR.
- **PR #104 — Phase 2 verification note.**
- **PR #105 — anon-EXECUTE security lockdown** (`security/anon-execute-lockdown`, migration `20260706201500`). **CRITICAL, live vuln.** See Findings below.
- **PR #106 — route-policy conformance** (`fix/route-policy-adr-conformance`). Three POST mutations switched `getClaims`→`getUser` (ADR-U037); two mutation-only routes (`journal/[id]`, `sessions/[id]`) Edge→Node (ADR-U036); the post-login `/api/auth/audit` POST made fire-and-forget (removes ~0.7 s serialized hop before the redirect). Edge→Node cost mitigated by Fluid compute.

## Measured results (authenticated waterfall, real path — the ADR-U037 lesson)

| Scenario | Before | After Phase 1 | After Phase 2 (verified live) |
|---|---|---|---|
| First-ever cold visit (sign-in → list) | ~7 s | ~7 s | **~2.4 s** |
| API calls at first paint | 5 (one ×3) | 5 | **1** (`/api/me/overview`) |
| Revisit | 1.2-6 s spinner | instant | instant, spinner never appears |

Phase 3 finding that reframed the whole diagnosis: **Vercel Edge cold-boot is ~150 ms** (unauth probe on the stable domain `fringe-island.vercel.app`), not the villain. The multi-second cold cost was **connection setup to Supabase multiplied across five concurrent isolates** — collapsing to one function (Phase 2) was the real fix. ADR-U036's Edge premise still holds. Stefan enabled **Fluid compute** (helps the Node-runtime routes + audit hop; irrelevant to the already-fixed Edge read path; pre-positions for a future Edge-deprecation ADR).

## Findings / watch items (new this session)

- **[CRITICAL — FIXED, PR #105]** The `anon` role could execute **77 SECURITY DEFINER functions** via PostgREST, including `_erase_mist(uuid)` — the ungated erasure primitive → `POST /rest/v1/rpc/_erase_mist` with the public anon key was **unauthenticated arbitrary-account erasure**. Root cause: Supabase default privileges (`pg_default_acl`) re-grant EXECUTE to `anon`/PUBLIC on every new public function, silently defeating the repo's per-function `REVOKE FROM PUBLIC` discipline (the deferred "grant sweep" noted at `feat_pc014…:960`). Most of the 77 were the **PC010–PC015 Groups contracts**. Fix: `ALTER DEFAULT PRIVILEGES` (fixes the class) + sweep all existing + close the two internal primitives to `authenticated` too. Verified live: **77 → 0**, erasure sealed, authenticated contracts intact. Intentional behaviour change: a *sessionless direct* contract call now raises 42501 instead of null (routes 401 before contracts, so no app path affected).
- **[LOW — open]** `hub/lib/groups/leadership.ts:103` `fetchPendingNominations` derives "which nominations are pending" in **client TypeScript** incl. client-clock date-math on `expires_at` — the only Groups read bypassing the RPC-contract pattern. RLS scopes the rows and the respond RPC gates expiry authoritatively, so not a hole, but the derivation is sole-homed in Hub code (a sibling surface would re-implement it). **Fix: add a `get_my_pending_nominations()` substrate contract** mirroring `get_my_invitations()`. Schema work → schema gate.
- **[INFO — Stefan's toggles]** Leaked-password protection is OFF; the `avatars` storage bucket allows public listing. Both are dashboard settings only Stefan can change.
- **[Test hygiene]** Hundreds of orphaned `test-*@fringeisland.test` / `e2e-*` users accumulated in `auth.users` (back to 2026-06-24) from deterministic test emails + shared anon-rate-limit collisions; the integration suite runs clean only with `--runInBand`. One deterministic-email collision (`gc-s5-newcomer`) was cleared this session. **Recommend: unique-per-run test emails + a bulk fixture cleanup.**

## Compliance audit result (four dimensions, for the retro)

- **Browser discipline — CLEAN.** One client-instantiation point (`AuthContext`), zero browser table access, type-only query imports, one ADR-U039-conformant realtime channel.
- **BFF rule-home — CLEAN** except the one LOW `leadership.ts` finding above. Zero direct writes, no `service_role`, 403s are honest SQLSTATE mapping, `/api/me/overview` confirmed bundle-only.
- **Route policy — 5 deviations, all FIXED (PR #106).** All from recent cycles (the getClaims-on-mutation three were G-F/FEAT-H018).
- **Substrate — 1 CRITICAL (fixed) + the toggles.** RLS coverage clean (24 tables), `search_path` hygiene clean (all 101 definer fns), no `/api/v1`+Bearer surface (correct — platform = PostgREST).

## Next session — the Groups area retro (unchanged agenda from `_14`, now with more input)

**Start with:** *"run the Groups area retro (cycles G-A..G-F)"*. Read in order: bridge `_14` (build state at close), **this bridge `_15`** (perf + audit + security findings), then `docs/planning/hub-v2/2026-07-06-groups-first-load-perf.md`. Retro-worthy themes this session surfaced about the Groups build specifically:
- Why the **grant-layer gap recurred** despite the documented `REVOKE FROM PUBLIC` pattern (default-privileges defeat it — the pattern was wrong, not just unapplied). Process fix: default-privileges belong in a base migration; a lint/CI gate on anon-executable definer functions.
- How to catch **route-policy drift at build time** (getClaims-on-mutation, Edge-on-mutation) rather than in a later audit — a checklist item or a test.
- The **client-side first-load waterfall** as a build-pattern lesson (client-rendered pages + per-component fetches → fan-out; ADR-U042 is the counter-pattern).
- The `leadership.ts` sole-home finding as an L3/contract-completeness gap.

Task-file cleanup (TASK-PC010..015 + TASK-H013..018) still rides the retro per L5 lifecycle.

## Carried-forward follow-ups (not blocking)

1. `get_my_pending_nominations()` substrate contract (closes the LOW BFF finding). Schema gate.
2. Stefan's two dashboard toggles (leaked-password protection; `avatars` bucket listing).
3. Test hygiene: unique-per-run test emails + bulk-clean orphaned fixtures.
4. Possible ADR-U036 addendum if the team wants Edge-safe mutations to stay on Edge (Stefan chose "merge as-is" this session — convention intact for now).

## Close-down note

Five PRs merged (#102-#106), `main` synced through `f802e79`, dev DB through `20260706201500`. One migration applied live to production under the schema gate (the security fix — the vuln is closed now, not pending). Dashboard refreshed. No branches, nothing held. The Groups retro is the next agenda item and should run in a fresh session with this bridge as input.
