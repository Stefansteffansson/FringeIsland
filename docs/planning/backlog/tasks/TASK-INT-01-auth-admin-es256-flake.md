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

That hypothesis is consistent with every observation (intermittent, key-valid-in-isolation 5/5, reproducible on `main`, no rate limiting) but **cannot be confirmed from inside the repo** — it needs the project's JWT signing-keys state, which lives in the Supabase dashboard.

**Next concrete step (needs dashboard access — Stefan):** open *Project Settings → API Keys / JWT Keys* and check whether a signing-key migration or rotation is in progress or half-applied (a current key plus a legacy/standby key both live). If so, completing or reverting the rotation is the fix and it is entirely platform-side. If the keys are clean and settled, this task escalates to Supabase support with the log evidence above.

## Why this needs fixing rather than tolerating

The failure mode is *actively misleading*. Raw, it reads as "the substrate rejected my change," which is the single most expensive wrong conclusion to hand someone mid-cycle — it cost roughly an hour during COR-B W4, and it will cost more each time a schema-gated PR is being verified, which is exactly when trust in the suites matters most.

## Already fenced (partial mitigation, landed 2026-07-22)

`hub/tests/helpers/supabase.ts` now decorates this specific error at the throw site with a named "KNOWN ENVIRONMENT FAULT (TASK-INT-01)" banner and the two-step triage (re-run serially; then run the control on `main`). That removes the misdiagnosis cost but **does not fix the flake** — suites still fail.

A preflight health check in `tests/integration/suite-setup.ts` was considered and deliberately rejected: `setupFilesAfterEnv` runs per test file, so it would add an auth-admin call per file and increase the very load the fault correlates with.

## Acceptance criteria

- [x] **Rate limiting ruled out** and the mechanism identified as server-side key verification (403 on `/admin/users`, `kid <nil>` vs expected ES256) — see Diagnosis above
- [ ] **Signing-key state checked in the Supabase dashboard** (rotation in progress / legacy key still standby?) — the one step that needs access this repo does not have
- [ ] Root cause confirmed or escalated to Supabase support with the log evidence
- [ ] Either the fault is eliminated, or a deterministic mitigation is in place (e.g. bounded retry-with-backoff around `admin.auth.admin.createUser` for this *specific* signature error only — never a blanket retry, which would mask real failures)
- [ ] A full `tests/integration/` run completes green twice consecutively
- [ ] If the root cause turns out to be concurrency, the standing "run integration suites serially" rule is enforced mechanically (jest `maxWorkers` for the integration project) rather than remembered
- [ ] The `decorateAuthAdminError` fence is either removed (if truly fixed) or its wording updated to match what was learned

## Notes

- Separate trap seen the same day, already understood — **not part of this task**: a hand-rolled probe calling `admin.auth.admin.createUser` *without* `user_metadata.consent_accepted` fails with "Database error creating new user". That is `handle_new_user` correctly enforcing the ADR-U038 S3 consent gate. Working as designed; pass the consent metadata as the helper does.
- Related standing flake item: [`TASK-E2E-01`](./TASK-E2E-01-profile-shared-session-flake.md) (E2E shared-session flake) — different layer, same class of "intermittent, erodes trust in the suite."
