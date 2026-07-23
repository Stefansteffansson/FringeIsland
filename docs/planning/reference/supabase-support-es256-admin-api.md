# Supabase support ticket — intermittent ES256 "kid <nil>" rejection on the Admin API

**Purpose:** ready-to-send escalation for [`TASK-INT-01`](../backlog/tasks/TASK-INT-01-auth-admin-es256-flake.md). Paste the "Message" section into a Supabase support request (Dashboard → Support, or support@supabase.com). Fill the two `<…>` placeholders first.

**Severity to select:** Low / non-urgent — it affects test automation only, not production or end users (evidence in the message).

**Before sending, redact:** nothing sensitive is included by design — no keys, no tokens. The project ref is not secret, but include it only in the official support channel, not a public forum.

---

## Message

**Subject:** Admin API (`POST /auth/v1/admin/users`) intermittently returns 500 with `unrecognized JWT kid <nil> for algorithm ES256`

**Project ref:** `jveybknjawtvosnahebd` (region eu-west-1, Postgres 17)
**Plan:** <Free / Pro — fill in>
**First observed:** ~2026-07-22. Reproducible on demand as of 2026-07-23.

### Summary

Calls to the **Admin API** using a valid new-style secret API key (`sb_secret_…`) intermittently fail. The GoTrue error is:

```
invalid JWT: unable to parse or verify signature, token is unverifiable:
error while executing keyfunc: unrecognized JWT kid <nil> for algorithm ES256
```

In our auth logs this surfaces as `403`/`500` on `/admin/users` (create) and `/admin/users/{id}` (delete). The **same call with the same key succeeds far more often than it fails**, seconds apart, which is what makes this look like a server-side verification race rather than a bad credential.

### Rate (measured)

A concurrent create-then-delete probe against the Admin API, using our `sb_secret_…` service key (10-wide waves):

| Run | Cycles | Failures (`kid <nil>` ES256) |
|---|---|---|
| A | 60 | 5 (~8%) |
| B | 90 | 5 (~6%) |

Consistent ~5–8% failure rate, correlated with concurrency but also present in serial runs.

### What we have already ruled out (from our side)

1. **Not a bad key.** A standalone probe with the same `sb_secret_…` key creates users 5/5 in isolation. The key resolves to our project's `service`-type secret key.
2. **Not rate limiting.** Zero rate-limit / `over_request_rate` events in the auth logs for the failure window; the failures are signature-verification 403s, not 429s.
3. **Not a half-applied signing-key rotation.** Our JWT signing keys are settled: one `in_use` ES256 (ECC P-256) key, one `previously_used` legacy HS256 key, no standby.
4. **Not the legacy API keys.** We disabled the legacy `anon`/`service_role` JWT API keys and re-ran the probe: the failure rate was unchanged (5/90 vs 5/60). We re-enabled them. So the `kid <nil>` token is **not** coming from a legacy key our clients present — it appears to originate inside GoTrue's own verification path.
5. **Not our application.** No production/runtime code path calls the Admin API — only our test setup/teardown does. End users are unaffected; this is purely test-automation reliability for us.

### What the error implies

A JWT with **no `kid`** is being verified against the ES256 signing key (`kid <nil>` ≠ the ES256 key's id), which fails. A kid-less JWT is the shape of a legacy HS256-signed token. Since our clients present an opaque `sb_secret_…` key (not a JWT), the kid-less JWT appears to be minted/selected **internally** by the auth service, and intermittently signed or looked up against the wrong key generation.

### Questions

1. Is there a known race in GoTrue's Admin-API auth path around the ES256 ↔ legacy-HS256 key transition that can intermittently produce a `kid <nil>` verification failure?
2. Is there a project-side action that fully retires the legacy HS256 secret (beyond disabling the legacy API keys, which we tried) that would remove this branch?
3. Is disabling the legacy JWT secret entirely (once all legacy-signed tokens have expired) expected to resolve this, and is it safe for a project whose clients are all on `sb_publishable_…` / `sb_secret_…`?

### Reproduction

Concurrent `supabase.auth.admin.createUser(...)` + `deleteUser(...)` using a `sb_secret_…` key, ~10 concurrent, repeated; ~5–8% fail with the error above. Happy to share a minimal script or a specific failing `request_id` from our logs on request.

### Log anchors (our side, for correlation)

- 12× `unrecognized JWT kid <nil> for algorithm ES256` in the auth logs, 2026-07-22 window
- all on `path: /admin/users` (+ `/admin/users/{id}`), `status: 403`
- example `request_id` available on request

---

## After you hear back

- If they ship a fix or advise disabling the legacy JWT secret: re-run the probe in `TASK-INT-01` (documented there) and confirm the ~8% baseline drops to zero **before** removing the `decorateAuthAdminError` fence.
- If they confirm it's a known transient with no project-side fix: keep the fence, mark `TASK-INT-01` as accepted-platform-limitation, and close.
