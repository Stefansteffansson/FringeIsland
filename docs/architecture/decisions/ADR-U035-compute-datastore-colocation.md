# ADR-U035: Compute–datastore co-location — Vercel functions run in the database region

**Status:** Accepted
**Date:** 2026-06-30
**Deciders:** Stefan
**Tags:** scope:platform-core · scope:product · wave:ferd

> Architecture Decision Record (MADR-style). **Resolves** a measured production responsiveness problem:
> the Hub's serverless functions and the Supabase database were in different continents, so every
> data-backed page paid multiple transatlantic round-trips. Establishes the principle that **compute
> co-locates with its primary datastore**. Pure deployment topology — it changes **no** contract,
> schema, or anatomy (ADR-U009 API-first is untouched). The complementary round-trip-*count* reductions
> are parked in [`docs/planning/hub-v2/perf-hardening-backlog.md`](../../planning/hub-v2/perf-hardening-backlog.md).

---

## Context and problem statement

The deployed Hub felt slow on every page that reads the database. A measured investigation (2026-06-30)
found the database is **not** the cause — the hottest query (the "your groups" join over 1,145
membership rows) executes in **~3 ms** server-side (indexed scans). The cause is **topology**:

- The Supabase project (`jveybknjawtvosnahebd`, `FringeIslandDB`) is in **`eu-west-1` (Ireland)**.
- The Hub's Vercel serverless functions had **no region pinned** (`vercel.json` absent, no
  `preferredRegion`), so they run in Vercel's **default region, `iad1` (US-East)**.
- The `/groups` page makes **~4 sequential server→Supabase round-trips** (`getUser()` to Auth →
  `get_current_personal_group_id()` → `group_memberships` → `groups`+counts). With the function in the
  US and the DB in Ireland, **each hop is transatlantic** (~150 ms RTT), so the page waits **~700 ms+**
  on geography alone — before render.

A user in Sweden therefore experiences: Sweden → US function (one ocean) → Ireland DB (a second ocean),
repeated per round-trip.

*"Where should the Hub's compute run so that database access is fast, and the topology is correct as the
user base grows — without compromising the API-first anatomy?"*

## Decision drivers

- **Responsiveness (felt now):** the round-trips only hurt because each crosses the Atlantic. Co-location
  collapses each hop from ~150 ms to ~1–2 ms.
- **Scale-readiness:** at high user counts, transatlantic round-trips also amplify connection-pool and
  Auth-service pressure. Co-location is the correct base topology before any of that scales.
- **Anatomy-faithful, zero shortcut:** this changes only *where the compute runs*. No API contract, no
  schema, no RLS, no decomposition boundary moves. ADR-U009 (API-first) is unaffected.
- **Single source of truth:** pin the region in the repo (`vercel.json`), not a dashboard setting that
  drifts and isn't reviewable.
- **DB round-trips dominate the page:** because a page makes *several* DB hops but only *one* user→function
  hop, co-locating with the **DB** (not the user) minimises total latency.

## Considered options

- **A — Status quo (functions US-East, DB Ireland).** Rejected: the measured ~700 ms transatlantic tax.
- **B — Co-locate functions in `dub1` (Dublin = `eu-west-1`, the DB's region). CHOSEN.** Every DB hop
  becomes intra-region (~1–2 ms); the user (Sweden) → Dublin function is one European hop (~35 ms). Net
  ~700 ms → ~45 ms on `/groups` (~15×), at the cost of ~5 lines of config.
- **C — Functions in `arn1` (Stockholm, closest to a Swedish user).** Rejected for now: it optimises the
  single user→function hop but leaves the *several* function→DB hops crossing Stockholm→Ireland (~30 ms
  each), which dominates. Becomes attractive only after the round-trip count is reduced (parked P1/P2).
- **D — Move the database to `eu-north-1` (Stockholm).** Deferred: a data migration, larger blast radius;
  revisit if the user base proves Nordic-concentrated. Co-locating compute is the cheaper correct first
  step and is reversible.

## Decision outcome

Pin the Hub's Vercel serverless functions to **`dub1`** via a repo-committed `vercel.json`
(`{"regions": ["dub1"]}`), co-located with the Supabase database in `eu-west-1`.

**Principle established:** *compute co-locates with its primary datastore.* Future surfaces (the Gimbal's
backend, studio services) that read this database default to the same region unless a measured reason
says otherwise.

**Operational note.** `vercel.json` must live at the path Vercel treats as the project **Root
Directory**. Confirmed in the Vercel dashboard (Settings → Build and Deployment, 2026-06-30): the
`fringe-island` project's Root Directory is **`hub`** — so the file is at **`hub/vercel.json`**. Vercel
reads only the `vercel.json` at its Root Directory. Verify after redeploy that the function region shows
**`dub1` (Dublin)`** under Settings → Functions (it was the default `iad1` / US-East before).

## Consequences

- **Positive:** data-backed pages drop from ~700 ms to ~45 ms of latency (~15×) with no architectural
  change; reversible by editing one file. Auth and DB calls become intra-region, reducing pressure at scale.
- **Follow-on (parked, not blocked):** with intra-region hops at ~1–2 ms, reducing the *number* of
  round-trips (`getUser`→`getClaims`, collapsing the `/groups` query chain into one RPC) drops from urgent
  to deliberate scale-hardening — tracked in the perf-hardening backlog to run between the Identity and
  Groups areas.
- **Revisit triggers:** a globally-distributed user base (→ read replicas / edge caching, parked P5); a
  Nordic-concentrated base (→ reconsider option D, DB in `eu-north-1`).
- **Append-only:** this ADR does not edit prior ADRs. It is the canonical record of the deployment-region
  decision.
