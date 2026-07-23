# Session bridge — ES256 auth flake escalated; awaiting Supabase

**Date:** 2026-07-23 (session 01) · **Wave:** Ferd
**Supersedes the open item in:** [`2026-07-22_04_-_ANATOMY-AUDIT-II-AND-CYCLE-COR-B-COMPLETE.md`](./2026-07-22_04_-_ANATOMY-AUDIT-II-AND-CYCLE-COR-B-COMPLETE.md) (that bridge's "TASK-INT-01 open, fenced but not fixed" line is now advanced by everything below).

---

## One-paragraph state

The whole anatomy-audit → Cycle COR-B → diagram-refresh thread is **merged and closed** (PRs #254–#265). The only thing still live is the **Supabase Admin-API ES256 flake** (`TASK-INT-01`), which is now **escalated to Supabase support (ticket filed 2026-07-23)** and **waiting on their reply**. It is **test-only, zero end-user impact** (verified), and **fenced** so it costs a re-run, not an hour. There is nothing to actively do until Supabase responds — this session can be closed.

## What was proven about the flake (so it isn't re-litigated)

- Symptom: `unrecognized JWT kid <nil> for algorithm ES256`, intermittent (~5–8%), on the **Admin API** (`/admin/users`) only.
- **Not** rate limiting (0 events), **not** a half-applied key rotation (settled: ES256 in-use + HS256 previous, no standby), **not** legacy-key coexistence (disabled them, re-measured, no change, rolled back), **not** our app (no runtime code calls the Admin API — only test setup/teardown).
- Impact: end users, sign-up/sign-in, and the Vercel runtime are all unaffected. Cost is CI/test-suite trust.
- Conclusion: platform-side, inside GoTrue's verification path; exhausted every lever reachable from our side → escalated.

## The one open action — how to act on Supabase's reply

1. Read Supabase's response (arrives at stefan.steffansson@yahoo.com; Free plan = best-effort, no SLA; allow mail from supabase.com).
2. Apply whatever they advise (likely: fully retire the legacy HS256 JWT secret, or a GoTrue-side fix).
3. **Re-measure with one command:**
   ```
   cd hub && npm run probe:auth
   ```
   (`hub/scripts/auth-admin-es256-probe.mjs` — prints the ES256-flake rate vs the ~5–8% baseline.)
4. **Only if the flake reads 0 across a couple of runs**, remove the `decorateAuthAdminError` fence in `hub/tests/helpers/supabase.ts`. If Supabase says it's a known transient with no project-side fix, keep the fence and close `TASK-INT-01` as accepted-platform-limitation.

## Entry points for the next session

- **The task:** [`../backlog/tasks/TASK-INT-01-auth-admin-es256-flake.md`](../backlog/tasks/TASK-INT-01-auth-admin-es256-flake.md) — full diagnosis, the before/after experiment, and the decision tree above.
- **The filed ticket text:** [`../reference/supabase-support-es256-admin-api.md`](../reference/supabase-support-es256-admin-api.md).
- **The probe:** `hub/scripts/auth-admin-es256-probe.mjs` (`npm run probe:auth`).
- **Memory:** the `reference-dev-db-auth-admin-es256-flake` entry (run the control on `main` before suspecting your own diff).

## Everything else this thread delivered (all merged, no follow-up owed)

- Anatomy Audit II — both API rings conformant; five gate-coverage findings.
- Cycle COR-B (W1–W5) — ownership manifest + completeness gate, DS-to-DS direction rule, outer-ring gate, `get_role_templates()` relocation, doc pass. Both ring rules are now mechanically enforced.
- Anatomy diagram → **v2.5** (announcements in DS-5; U047/U048/U049 absorbed).
- **`ADR-U050` is the one deliberate hold** — `Proposed`, riding the C-F schema gate; absorb into the anatomy and move the stamp only once C-F ratifies it (`TASK-DOC-005`).

## Next actual work

**A-NTF (Notifications)** is unblocked and builds against the now-enforced ring rules. Start there when ready — it does not depend on the Supabase reply.
