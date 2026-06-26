# ADR-U033: Scheduled reaper for Mist ephemerality — pg_cron as the platform scheduler

**Status:** Accepted
**Date:** 2026-06-26
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

> Architecture Decision Record (MADR-style). **Operationalizes** [ADR-U004](ADR-U004-visitor-anonymous-sign-in.md)'s
> already-named "pg_cron job cleans up temporary profiles" and **resolves** the TTL/inactivity threshold
> that [ADR-U031](ADR-U031-mist-identity-lifecycle.md) stage 3 deferred by design ("a Privacy-vertical /
> PC-2 configuration"). U004/U031 said *that* a reaper exists and *that* it gates the server-side
> anonymous token; this ADR decides *how* it is built. Pairs with **FEAT-PC002** (substrate) ↔
> **FEAT-H004** (Hub), the IDN-2 increment. Decided alongside [ADR-U034](ADR-U034-consent-record-substrate.md)
> (consent substrate).

---

## Context and problem statement

The Mist lifecycle (ADR-U031) makes ephemerality the privacy protection for the unconsented entrant:
the Mist's own data "has no durability past session end: a short, configurable TTL after **inactivity**
plus an **explicit-erase** path on close" (ADR-U031 stage 3). ADR-U004 named a `pg_cron` job as the
cleanup mechanism but left it unbuilt; the 2026-06-26 IDN-1 clarification confirmed **pg_cron is not yet
installed** and routed the robust reaper to FEAT-H004 (IDN-2).

The arrival half (IDN-1, FEAT-PC001/H003) shipped with the **accumulation gap live**: actual-entrant
Mist rows accumulate with no automated cleanup, "known, bounded, logged." IDN-2 must close that gap.

*"How is the scheduled ephemerality reaper built — on what scheduling substrate, with what erasure
semantics, and how does it avoid racing the atomic transcendence migration — to industry standard?"*

## Decision drivers

- **Stefan's steer (locked in FEAT-H003 / FEAT-PC001 notes):** build the reaper **robustly, to industry
  standard** — a real scheduled mechanism, even if backend-heavy, **not** a lazy on-request shortcut.
- **ADR-U031 atomicity invariant:** "a last-moment joiner must not be erased mid-migration." The reaper
  must never delete a Mist that is mid-transcendence.
- **GDPR / Privacy-by-design (ADR-U010):** TTL-after-inactivity + explicit-erase + a complete erasure
  cascade (no orphaned child rows); data minimisation for the unconsented.
- **Grounded substrate state (verified 2026-06-26):** `pg_cron` is **available** on the project
  (`default_version 1.6.4`) but **not enabled** (`installed_version: null`). It is enableable. Supporting
  extensions `pg_net` (async HTTP), `pgmq`, `http` are likewise available-but-off.
- **Postgres-native is the lowest-moving-parts robust option** and is exactly what ADR-U004 assumed; on
  Supabase, scheduled Edge Functions ride pg_cron/pg_net underneath anyway.
- This choice sets the **platform-wide scheduling pattern**, not just the Mist reaper — future periodic
  jobs (notification digests, retention sweeps, materialised-view refreshes) inherit it.

## Considered options

- **Option A — Enable `pg_cron`; a scheduled `SECURITY DEFINER` sweep function (chosen).** SQL-native
  scheduled job invokes a reaper function that deletes expired Mist rows and cascades. Establishes
  pg_cron as the platform scheduler.
- **Option B — Supabase scheduled Edge Function calling an erasure RPC.** App-tier (TypeScript) logic,
  but more moving parts; on Supabase it still requires pg_cron/pg_net underneath, so it does not avoid
  the extension and adds a network hop and an auth surface.
- **Option C — External scheduler (Vercel Cron / GitHub Action) → Hub API route → erasure RPC.** Keeps
  the DB extension surface clean, but introduces an external dependency, an authenticated public
  trigger surface, and a failure mode outside Supabase observability.

## Decision outcome

**Chosen option:** Option A — enable `pg_cron` and run the reaper as a scheduled `SECURITY DEFINER`
sweep. pg_cron becomes the canonical FringeIsland scheduling substrate.

Decision-level commitments (exact DDL, interval, and TTL value are FEAT-PC002 detail):

1. **Scheduler.** Enable the `pg_cron` extension by migration. A scheduled job runs the reaper on a
   fixed interval (sweep cadence ≪ TTL, so expiry is bounded by the TTL, not the cadence).
2. **Reaper function.** A `SECURITY DEFINER` function selects expired un-transcended Mists and performs
   a **complete erasure cascade** (the Mist's auth user, proto-group, journeys, and any session-scoped
   child rows — no orphans). Mirrors the E2E `cleanupAnonymousUsers` janitor shape, hardened for
   production and run server-side on a schedule rather than per-test.
3. **Expiry rule.** TTL is measured from **inactivity**, not from creation (ADR-U031 stage 3). An
   **explicit-erase** path (close/"say goodbye") erases immediately, independent of the scheduled sweep.
4. **TTL config home.** The TTL/inactivity threshold is **PC-2 configuration**, not hardcoded in the
   sweep function (ADR-U031: "a Privacy-vertical / PC-2 configuration"). The precise store (config row
   vs. server constant) is a FEAT-PC002 detail; the value is changeable without altering the function.
5. **Reaper ↔ transcendence race guard.** The reaper must honour ADR-U031's "no erase mid-migration."
   Because TTL is **inactivity-based**, an actively-transcending Mist is by definition recently active
   and outside the sweep set; additionally the transcendence migration runs in a single transaction with
   row-level locking so the sweep cannot interleave with it. The sweep excludes any row with an in-flight
   migration marker. Exact mechanism is FEAT-PC002.
6. **Clean boundary with the consent substrate (ADR-U034).** Consent records exist **only
   post-transcendence**; the reaper reaps **only pre-transcendence Mists**. The two never collide — the
   reaper's GDPR-erasure path never touches a row that carries durable consent proof.
7. **Observability (ADR-U012).** Each sweep emits a reaper run event (counts swept/erased/skipped);
   explicit-erase emits its own event. This realises the `reaperRealised:false` accumulation-gap signal
   already in the `mist.entered` telemetry stream (FEAT-PC001) — once the reaper lands it flips true.

### Consequences

- **Positive:** the accumulation gap closes; ephemerality becomes an enforced guarantee, not a
  documented intention; the platform gains a reusable, observable scheduling primitive.
- **Positive:** Postgres-native keeps the reaper inside one trust boundary and one observability surface;
  no external trigger to secure.
- **Negative:** enabling `pg_cron` is a standing platform commitment (an always-on extension + a job the
  team must monitor); a runaway or failing sweep is now an operational concern.
- **Neutral:** Edge-Function or external scheduling can still be added later for jobs that genuinely need
  app-tier logic; this ADR does not forbid them, it sets the default.

## Pros and cons of the options

### Option A — pg_cron + SECURITY DEFINER sweep (chosen)
- Pros: industry-standard for DB-row TTL; what ADR-U004 assumed; one trust + observability boundary;
  reusable platform scheduler; fewest moving parts.
- Cons: an always-on extension to operate; sweep failures are an ops concern.

### Option B — Supabase scheduled Edge Function
- Pros: erasure logic in TypeScript; familiar app-tier testing.
- Cons: still needs pg_cron/pg_net underneath; extra network hop + auth surface; split trust boundary.

### Option C — External scheduler → API route
- Pros: no DB extension enabled.
- Cons: external dependency + public authenticated trigger; failure mode outside Supabase; weakest
  observability; most surface to secure.

## Links

- **Operationalizes:** [ADR-U004](ADR-U004-visitor-anonymous-sign-in.md) (the named pg_cron cleanup job).
- **Resolves:** [ADR-U031](ADR-U031-mist-identity-lifecycle.md) stage 3's deferred TTL/inactivity reaper.
- **Decided with:** [ADR-U034](ADR-U034-consent-record-substrate.md) (consent substrate — the
  post-transcendence half).
- **Related:** [ADR-U010](ADR-U010-privacy-dedicated-vertical.md) (Privacy vertical / GDPR) ·
  [ADR-U012](ADR-U012-observability-dedicated-vertical.md) (reaper events) ·
  [ADR-U003](ADR-U003-supabase-backend-platform.md) (Supabase / extensions) ·
  [ADR-U016](ADR-U016-cascade-specification-first.md) (erasure cascade discipline).
- **Implemented by:** FEAT-PC002 (substrate) ↔ FEAT-H004 (Hub) — the IDN-2 increment.
