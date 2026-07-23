# Integration-suite auth-admin ES256 flake — test-user creation intermittently rejected

---
id: TASK-INT-01
title: createTestUser intermittently fails with "unrecognized JWT kid <nil> for algorithm ES256" against the dev DB — root-cause and fence
status: todo
assigned_to: claude
priority: medium
feature: none
owner: platform/core/infrastructure
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 3
---

## Description

Integration suites intermittently fail in `createTestUser` — the Supabase auth **admin** API — with:

```
invalid JWT: unable to parse or verify signature, token is unverifiable:
error while executing keyfunc: unrecognized JWT kid <nil> for algorithm ES256
```

Surfaced during **COR-B W4** (2026-07-22): a parallel run of `tests/integration/groups/` reported 7 of 11 suites failing, which initially looked like the W4 migration had broken the substrate. It had not.

## Evidence — it is an environment fault, not a code fault

Established by control experiment. **Do not re-derive this:**

| Check | Result |
|---|---|
| Same suite on `main`, none of the W4 changes applied | **FAILS the same way** (`membership-lifecycle`: 1 failed / 23 passed) |
| Same suite minutes later on the W4 branch | **PASSES 24/24** — intermittent, not branch-dependent |
| Suites affected | Include ones with no shared surface at all (`group-of-groups`, `invitation-contracts`, `membership-lifecycle`, `role-permission-contracts`) |
| Standalone Node probe, same `SUPABASE_SERVICE_ROLE_KEY` from the same `.env.local` | **5/5 users created OK** — the key itself is valid |
| Key shape | Correct new-style `sb_secret_*` / `sb_publishable_*` |

It concentrates under concurrency, compounding the standing "never run two integration suites concurrently against the shared dev DB" rule — **but it also hit a serial `--runInBand` run**, so parallelism appears to amplify rather than cause it. Root cause not yet found.

## Diagnosis (2026-07-23) — rate limiting RULED OUT; server-side key verification is the cause

Auth-service logs pulled for the 24h window covering the failures:

| Signature | Count |
|---|---|
| `unrecognized JWT kid <nil> for algorithm ES256` | **12** |
| `token is unverifiable` | 12 |
| `rate limit` / `over_request_rate` | **0** |
| `jwks` / `signing_key` / `rotat` / `asymmetric` | 0 |

Every occurrence is the same shape:

```
path: /admin/users   status: 403
error: "token is unverifiable: error while executing keyfunc:
        unrecognized JWT kid <nil> for algorithm ES256"
```

**What this rules out.** The original hypothesis offered two candidates; one is now dead:

- **Rate limiting — RULED OUT.** Zero rate-limit events in the whole window. The 403s are credential-verification failures, not throttling.
- **Key verification — CONFIRMED as the mechanism.** GoTrue expects an ES256-signed token carrying a `kid`, and receives one with `kid = <nil>`.

**What remains open is the *why*.** The same credential succeeds far more often than it fails (successful `user_signedup` / `user_deleted` events sit in the same window, minutes apart, from the same key). A credential that is simply wrong fails 100% of the time; this one does not. That points at **server-side state, not our configuration** — most plausibly a JWT signing-key rotation that has propagated to some auth nodes and not others, so a request's success depends on which node answers it.

## Key state checked (2026-07-23) — the propagation hypothesis is WRONG

Read from the Management API and confirmed on the dashboard's *JWT Keys* page:

| Status | Key ID | Type |
|---|---|---|
| **CURRENT KEY** | `7CEB1304-C51B-4CE0-B365-E9A6257C77FB` | ECC (P-256) — ES256 |
| **PREVIOUS KEY** | `382775F4-8482-4A36-908A-8C6E78D38EB6` | Legacy HS256 (shared secret), rotated ~6 months ago |

**No standby key. The rotation is complete and settled.** The earlier hypothesis — a rotation half-propagated across auth nodes — is **not supported and is withdrawn.** One key is in use, one is retained purely to verify not-yet-expired tokens; that is the normal, finished state.

## What the evidence actually points at now

The dashboard's *Legacy JWT Secret* tab states it plainly:

> Legacy JWT secret … is used to **only verify** JSON Web Tokens by Supabase products. **This includes the `anon` and `service_role` JWT based API keys. Consider switching to publishable and secret API keys to disable them.**

So the project still has **both** key generations live:

- legacy `anon` + `service_role` — JWTs (`eyJhbGciOiJIUz…`), HS256, and critically **kid-less**
- new `sb_publishable_*` + two `sb_secret_*` keys

The failure signature is a **kid-less JWT verified against the ES256 current key** — exactly the shape a legacy HS256 API key produces. The coexistence of the two generations keeps that verification branch alive.

**Repo side is already clean (verified 2026-07-23, no key material printed):** both `.env.local` files (repo root and `hub/`) carry only `sb_publishable_*` / `sb_secret_*` / `sbp_*`; no legacy `eyJ…` JWT appears in any env file, nor hardcoded anywhere under `hub/`, `supabase/`, or `scripts/`. `SUPABASE_SERVICE_ROLE_KEY` resolves to project key `fringeislandsecret` (`61a31f8f…`), type `secret`.

So *our* callers do not present a legacy JWT. The kid-less token is being produced or resolved **inside Supabase's own verification path** — which is consistent with the flake being intermittent and unreproducible from a standalone probe.

## Experiment 2026-07-23 — legacy keys disabled and re-enabled: HYPOTHESIS DISPROVEN

The lever below (disable the legacy `anon`/`service_role` JWT keys) was **tried directly** and **did not fix the flake.**

Method — a concurrent admin-`createUser`/`deleteUser` probe (10-wide waves, our `sb_secret_*` key) run against production before and after toggling `PUT /v1/projects/{ref}/api-keys/legacy?enabled=…`:

| State | Cycles | ES256 flakes | Rate |
|---|---|---|---|
| Legacy keys **enabled** (baseline) | 60 | 5 | ~8% |
| Legacy keys **disabled** | 90 | 5 | ~6% |

The rates are statistically indistinguishable at these sample sizes — **disabling the legacy keys had no effect on the flake.** So the "legacy kid-less keys keep a bad verification branch reachable" theory is **wrong**, or at least not the operative cause. The legacy keys were **re-enabled immediately** (one call, `enabled=true`); production is back to its original state, and our own `sb_secret_*` path kept working throughout (the probe never lost its ability to create/delete).

**What this leaves.** The mechanism is now genuinely unexplained from our side: not rate limiting, not a half-applied rotation, and not the legacy-key coexistence. It is an intermittent kid-less-JWT rejection inside GoTrue's own verification path that persists regardless of which key generation is enabled. **This is the point to escalate to Supabase support** with: the auth-log evidence (12× `unrecognized JWT kid <nil> for algorithm ES256`, 403 on `/admin/users`, zero rate-limit events), the settled-rotation key state, and this before/after experiment showing the flake is independent of the legacy keys.

The `decorateAuthAdminError` fence stays — it is the right mitigation for a platform-side intermittent fault we do not control.

## Superseded lever (kept for the record) — NOT a fix

**Disable the legacy `anon` / `service_role` JWT API keys** — which is what Supabase's own banner recommends independently of this bug. Rationale: the legacy keys are what keep the kid-less verification branch reachable; nothing in this repo uses them.

**Do not flip this without checking every other consumer first.** A legacy key still set anywhere becomes an instant outage:

- [x] **Vercel project environment variables — CHECKED CLEAN (2026-07-23).** Project `stefansteffanssons-projects/fringe-island`. All three environments (production / preview / development) carry only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the anon key is the **new-generation `sb_publishable_*`** in every environment — no legacy `eyJ…` JWT anywhere. Notably there is **no `SUPABASE_SERVICE_ROLE_KEY` on Vercel at all**, which is correct: the runtime BFF uses the anon key plus the user session; the service-role key is test-only and lives only in local `.env.local`. (Verified via `vercel env pull` to the scratchpad, shapes inspected without printing key material, pulled files scrubbed immediately.)
- [ ] any other deployment, cron, webhook, or external integration holding an `eyJ…` key
- [ ] `hub-legacy/` if it is ever run
- [ ] local `.env` files on any other machine (the two in *this* checkout are clean — see above)

Only once every consumer is confirmed on `sb_publishable_*` / `sb_secret_*` is disabling the legacy keys safe. If the flake survives that, escalate to Supabase support with the log evidence above — at that point it is unambiguously platform-side.

## Why this needs fixing rather than tolerating

The failure mode is *actively misleading*. Raw, it reads as "the substrate rejected my change," which is the single most expensive wrong conclusion to hand someone mid-cycle — it cost roughly an hour during COR-B W4, and it will cost more each time a schema-gated PR is being verified, which is exactly when trust in the suites matters most.

## Already fenced (partial mitigation, landed 2026-07-22)

`hub/tests/helpers/supabase.ts` now decorates this specific error at the throw site with a named "KNOWN ENVIRONMENT FAULT (TASK-INT-01)" banner and the two-step triage (re-run serially; then run the control on `main`). That removes the misdiagnosis cost but **does not fix the flake** — suites still fail.

A preflight health check in `tests/integration/suite-setup.ts` was considered and deliberately rejected: `setupFilesAfterEnv` runs per test file, so it would add an auth-admin call per file and increase the very load the fault correlates with.

## Acceptance criteria

- [x] **Rate limiting ruled out** and the mechanism identified as server-side key verification (403 on `/admin/users`, `kid <nil>` vs expected ES256) — see Diagnosis above
- [x] **Signing-key state checked** — rotation is complete and settled (ES256 current, HS256 previous, no standby); the propagation hypothesis is withdrawn
- [x] **Repo verified free of legacy JWT keys** — both `.env.local` files and all source use only the new key generation
- [x] **Vercel env vars audited — clean** (all `sb_publishable_*`, no legacy JWT, no service-role key).
- [x] **Legacy-key disable tried directly (2026-07-23) — did NOT fix the flake** (before/after probe above); rolled back. The remaining-consumer audit is therefore moot *for this bug* (still worth doing for its own security merit, but no longer on this task's critical path).
- [ ] **Escalate to Supabase support** with the log evidence + the before/after experiment — the flake is platform-side and independent of every lever reachable from here
- [ ] Disable the legacy `anon` / `service_role` JWT API keys once that audit is clean, and re-run the integration suites to see whether the flake survives
- [ ] If it survives: escalate to Supabase support with the log evidence — at that point it is unambiguously platform-side
- [ ] Either the fault is eliminated, or a deterministic mitigation is in place (e.g. bounded retry-with-backoff around `admin.auth.admin.createUser` for this *specific* signature error only — never a blanket retry, which would mask real failures)
- [ ] A full `tests/integration/` run completes green twice consecutively
- [ ] If the root cause turns out to be concurrency, the standing "run integration suites serially" rule is enforced mechanically (jest `maxWorkers` for the integration project) rather than remembered
- [ ] The `decorateAuthAdminError` fence is either removed (if truly fixed) or its wording updated to match what was learned

## Notes

- Separate trap seen the same day, already understood — **not part of this task**: a hand-rolled probe calling `admin.auth.admin.createUser` *without* `user_metadata.consent_accepted` fails with "Database error creating new user". That is `handle_new_user` correctly enforcing the ADR-U038 S3 consent gate. Working as designed; pass the consent metadata as the helper does.
- Related standing flake item: [`TASK-E2E-01`](./TASK-E2E-01-profile-shared-session-flake.md) (E2E shared-session flake) — different layer, same class of "intermittent, erodes trust in the suite."
