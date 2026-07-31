# FEAT-PC018: Telemetry event store & platform statistics — the V4 sink and the ADM-1 read

---
id: FEAT-PC018
title: Telemetry event store & platform statistics — durable content-free event capture with bounded retention, and the admin-gated statistics read
owner: platform/core/infrastructure
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The platform emits well but stores nowhere. Every meaningful action emits a content-free structured event (the V4 discipline, in force since C-C), but events land in the runtime log stream — short retention, not queryable (TASK-OBS-01; AC3-O7 recorded the deferral as honest-because-no-consumer). A-ADM ends the no-consumer state: ADM-1 (Hub §L3: *"Render admin dashboard with platform statistics"*, external-dep *"PC-1 statistics aggregation — load-bearing infrastructure commitment"*) needs numbers to render, and there is no statistics contract anywhere in the migration set. The decision layer is settled ([ADR-U052](../../../architecture/decisions/ADR-U052-telemetry-sink-and-analytics-posture.md), board AB-1a..d): durable PC-1-owned store, fire-and-forget recorder, 90-day retention, computed-on-read aggregation, legitimate-interest posture with erasure cascade.

### Why Platform Core, not a Domain Service

The V4 obligation is universal — every tier emits (PC auth routes, DS contracts, product BFFs), so the sink's writers span the whole dependency graph. Homed in any Domain Service, Core writers could not reach it without breaking the one-way dependency rule; homed in PC-1, everyone above may call down. PC-1's own §L3 already carries the enabling shape (flag-evaluation telemetry, migration-log-as-audit-substrate, the scheduled-job substrate this feature's prune rides), and instrumentation substrate is charter PC-1 exactly as RLS and schema discipline are. This cannot be modelled in Domain or via Extensions.

## Solution sketch

One migration (schema gate):

- **`public.telemetry_events`** — `id uuid pk default gen_random_uuid()`, `actor_group_id uuid NULL REFERENCES public.groups(id) ON DELETE CASCADE`, `event_name text NOT NULL` (dot-namespaced, open set — no enum, no CHECK list), `props jsonb NOT NULL DEFAULT '{}'` (content-free by discipline), `created_at timestamptz NOT NULL DEFAULT now()`. Indexes: `(event_name, created_at DESC)` and `(created_at)` (prune path). **RLS enabled with zero policies — deliberate deny-all** (the `ds5_config` precedent, AC3-O2, documented in place): the two contracts below are the only doors.
- **`record_telemetry_event(p_event_name text, p_props jsonb DEFAULT '{}')`** — SECURITY DEFINER, `SET search_path = ''`; resolves the actor via `get_current_personal_group_id()` (NULL tolerated); **never raises** — the body's insert is wrapped so an emit failure cannot fail the calling action (ADR-U052 §2; the C-C hint discipline). `REVOKE` PUBLIC/anon; `GRANT EXECUTE TO authenticated`. Pre-session emissions (no JWT) stay on the console mirror — a recorded limitation, not a silent gap.
- **Retention prune** — a pg_cron daily job deleting `created_at < now() - interval '90 days'` (PC-1 scheduled-job substrate; the ADR-U033 reaper's proven pattern — verify the exact registration idiom against the live cron catalog at build, cumulative-forward). Job presence is test-pinned; run outcomes observable via the cron run log.
- **`get_platform_statistics()`** — SECURITY DEFINER, `SET search_path = ''`; explicit `is_platform_admin()` gate with a typed `42501` refusal; `REVOKE` PUBLIC/anon. Returns one versioned `jsonb` document, **computed on read** (no aggregate tables): `members` (total / active / mists), `groups` (total / engagement), `journeys` (active_enrollments / completions_30d), `activity_daily` (last 30 days of event counts from `telemetry_events`), `generated_at`. Exact source predicates (e.g. which `group_type` values count) are verified against the live schema at build — named here as intent, not as column law.
- **Manifest riders in the same PR:** `telemetry_events` classified `owner: PC-1` + `memberData: true` with the exemption citing ADR-U052 §4; both functions registered (classification gate GC-1 fails red otherwise — by design, after TASK-ADMA-01's split they register as PC-1).

## Appetite

Small-to-moderate: one table, two contracts, one cron job, four test surfaces. The risk concentrates in the schema gate and in getting the never-raises recorder genuinely non-fatal (an exception path that escapes is a defect of the feature's central promise).

## Rabbit holes

- **Don't build aggregate tables.** Computed-on-read is the decision (ADR-U052 §3); a "just one materialized view" is the drift this ADR exists to prevent.
- **Don't let the recorder validate event names against a registry.** The namespace is open (extensibility rule); a sealed list makes every new feature a two-PR change. Content-free discipline is enforced by review + the emitting code, not by a CHECK.
- **Don't wire browser-side emission.** The recorder is server-side substrate; the Hub's BFF calls it. A browser door would need its own abuse posture for zero gain.
- **Timestamp comparisons in tests:** epoch-numeric, never ISO-string equality (platform CLAUDE gotcha).

## No-gos

No external analytics vendor or log-drain (Ferd; ADR-U052 §1). No behavioral/product-analytics collection — the consent purpose is registered, collection stays dormant until a consumer exists (§4). No feature-flag substrate (deferred, board AB-8/ADM-15). No backfill of historical console events.

## Stories

### STORY-1: Durable, non-fatal event capture
As the platform, I want server-side telemetry emissions durably recorded without ever endangering the emitting action, so that the V4 sink exists and stays harmless.

**Acceptance criteria:**
- Given an authenticated session, when `record_telemetry_event('demo.event', '{"k":1}')` is called, then exactly one row exists with the caller's personal group as actor, the name and props verbatim, and a fresh `created_at`.
- Given the insert path fails internally (forced in test), when the recorder is called, then no exception reaches the caller and the caller's transaction commits unaffected.
- Given an anon (sessionless) PostgREST caller, when calling the recorder, then execution is refused (no anon EXECUTE).
- Given any role other than the definer path, when reading or writing `telemetry_events` directly, then RLS deny-all refuses — asserted structurally (zero policies on the table; the deny-all is deliberate and documented in place).

### STORY-2: Bounded retention
As the platform, I want raw events pruned at 90 days on a schedule, so retention is a property of the system rather than a promise.

**Acceptance criteria:**
- Given rows older than 90 days and rows younger, when the prune job body runs, then only the old rows are deleted.
- Given the deployed cron catalog, then the prune job is present and scheduled daily — test-pinned so removing it fails red.

### STORY-3: The statistics read (ADM-1's contract)
As a platform admin, I want one statistics document computed on read, so the dashboard renders live numbers with nothing to drift.

**Acceptance criteria:**
- Given a DeusEx member, when calling `get_platform_statistics()`, then the payload carries exactly the walked keys (payload walk below) with counts consistent with fixture state, and `generated_at`.
- Given a non-admin authenticated member, when calling, then a typed `42501` refusal and no data.
- Given an anon caller, then EXECUTE is refused.
- Given 31+ days of events, then `activity_daily` carries at most 30 buckets, oldest first.

### STORY-4: Privacy posture proven (the Mist rule, proved not assumed)
As the platform, I want the erasure and classification posture demonstrated, so actor-linked telemetry can never outlive its subject.

**Acceptance criteria:**
- Given a Mist with telemetry rows, when the Mist is erased (farewell path), then its `telemetry_events` rows are gone by cascade — asserted by count, not inferred from the FK declaration.
- Given the ownership manifest, then `telemetry_events` is classified member-data with the ADR-U052 §4 exemption citation, and the W2 export-completeness invariant plus the GC-1 classification gate are green.

## Decomposition verification walk — payload ↔ consumer (FEAT-H034)

| `get_platform_statistics()` key | FEAT-H034 consumer |
|---|---|
| `members.total` / `members.active` / `members.mists` | Members tile (STORY-2 there) |
| `groups.total` / `groups.engagement` | Groups tile |
| `journeys.active_enrollments` / `journeys.completions_30d` | Journeys tile |
| `activity_daily[{day,count}]` | 30-day activity trend |
| `generated_at` | "as of" caption |

Every key has a consumer; every tile a key. No other feature's payload feeds the dashboard (walked per the J-D rider rule).

## Platform dependencies

PC-1 internal: schema management, RLS substrate, privilege-escalation discipline, scheduled-job substrate. Consumed cross-area: `get_current_personal_group_id()` (PC-3 actor primitive, P-O1) and `is_platform_admin()` (PC-1-defined / PC-4-semantics). No Domain dependency in either direction.

## Cross-product impact

The Hub consumes both contracts via FEAT-H034 (BFF-wrapped). The Gimbal inherits the same platform contracts by construction (ADR-U009); no surface-side logic to duplicate.

## Vertical impact

- **Privacy/GDPR:** actor-linked events are personal data — legitimate-interest posture, content-free payloads, 90-day bound, erasure cascade proven (STORY-4), export exemption cited (ADR-U052 §4).
- **Notifications:** None (no member-visible state change; nothing to notify).
- **Administration:** the statistics read is admin-gated (`is_platform_admin()`, typed refusal); the store itself carries no admin mutation surface (append + prune only).
- **Observability:** this feature *is* the V4 sink; the prune job's runs are themselves observable; recorder failures surface in logs (swallowed for the caller, not for the operator).
- **Transactions:** None.
- **Extensibility:** `event_name` is an open namespace (no enum, no sealed list); the statistics document is versioned jsonb — additive keys are non-breaking.

## Performance budget

N/A (no surface). The statistics read is consumed by FEAT-H034 under its B2/B3 page budget; computed-on-read is acceptable at current scale by measurement posture (ADR-U042/U043) — if a gate measurement ever shows it hot, pre-aggregation is a *measured* follow-up, not a default.

## Implementation notes (6-done, 2026-07-31)

Built exactly per the sketch as migration `20260731180000_adm_a_pc018_telemetry_store_and_statistics.sql` (PR #354, merged + applied on named approval): deny-all `telemetry_events` (RLS enabled, zero policies), the never-raises `record_telemetry_event()`, `prune_telemetry_events()` + the daily `telemetry-prune` pg_cron job (03:30, the reaper idiom), the DS-3-registered `ds3_stats_snapshot()` compose-contract, and the admin-gated `get_platform_statistics()` (typed `42501`). Suite: `hub/tests/integration/observability/telemetry-and-statistics-contracts.test.ts` — 8 demonstrated-red pre-apply (+2 refusal-shaped anon tests, vacuously green), 10/10 post-apply, including the forced-failure never-raises proof (table renamed mid-test) and the Mist-rule cascade proven by count against a probe group. Manifest riders landed in the same PR (table PC-1 + ADR-U052 §4 export exemption; functions PC-1 ×3 + DS-3 ×1 — born classified under the TASK-ADMA-01 gate). Consumed by FEAT-H034 via `GET /api/admin/statistics` + `lib/observability/telemetry-server.ts`.
