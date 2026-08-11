# ADR-U052: Telemetry sink & analytics posture

**Status:** Accepted (2026-07-31 — promoted on Stefan's explicit approval after the ADM-A schema gates merged on named approval, both migrations applied, and the realizing features FEAT-PC018/PC019/H034 reached 6-done).
**Deciders:** Stefan (A-ADM area-open decision board, rows AB-1a..AB-1d + AB-4, settled 2026-07-31 "go with recommended").
**Supersedes / amends:** nothing. Realizes the decision layer [ADR-U012](./ADR-U012-observability-dedicated-vertical.md) (Observability as a dedicated vertical) left open; narrows the COR-C W2 `admin_audit_log` export exemption recorded 2026-07-31.

---

## Context

Since the C-C close (2026-07-20, TASK-OBS-01) the platform **emits well but stores nowhere**: every meaningful action emits a content-free structured event (`[telemetry]` / `[audit]`, the V4 discipline), but events land in the runtime log stream — short Vercel retention, not queryable. Audit III recorded the state as honest-because-no-consumer-exists (AC3-O7) and the audit seam as console-only with four callers, three GDPR-relevant (AC3-O6). A-ADM ends the no-consumer state: ADM-1 (platform statistics) and ADM-16 (audit-log surface) are consumers. The decision layer — sink, retention, consent posture, aggregation, measurement continuity, and the audit trail's right-of-access shape — is what this ADR fixes.

## Decision

1. **The sink is a durable, platform-owned Postgres event store** — `public.telemetry_events`, **PC-1 Infrastructure-owned** (realized by FEAT-PC018). No external log-drain or analytics vendor in Ferd: pre-launch there are no consumers a vendor would serve, and an external processor is a data-protection surface (DPA, transfer, retention contract) bought for nothing. A drain/hybrid stays re-openable at Eid without migration cost (the store is the source either way).
2. **Write discipline: fire-and-forget, content-free, server-side.** One SECURITY DEFINER recorder (`record_telemetry_event`) that **never fails the calling action** — an emit failure is swallowed by construction (the C-C hint discipline). Event payloads stay content-free (names, ids, outcomes — never member-authored text); the actor is the caller's personal group id, platform-resolved. The table itself is deny-all under RLS: the recorder and the statistics read are the only doors.
3. **Retention and aggregation: 90-day raw retention, computed-on-read aggregates.** A scheduled prune (PC-1 scheduled-job substrate, pg_cron) deletes raw events older than 90 days; the job's runs are observable and its presence is test-pinned. ADM-1 statistics are computed on read — live counts from domain tables plus event-derived trends. **No pre-aggregation tables until a measured need** (the ADR-U042/U043 posture: optimise against measurement, not anticipation); cardinality is bounded by the registered event-name namespace.
4. **Privacy posture (V2 / ADR-U034):**
   - Operational telemetry and audit run under **documented legitimate interest** — content-free, actor-linked, retention-bounded. No consent gate on operational events.
   - **Erasure cascades.** `telemetry_events.actor_group_id` references the personal group `ON DELETE CASCADE`: a Mist's erasure (reaper or farewell) removes its events with it — the Mist rule holds *by construction* and is proven by test, not assumed (the NB-8 lesson). FIM self-delete relies on the same cascade where the personal group is erased, and on the 90-day prune plus content-free payloads where it is not.
   - **Export:** `telemetry_events` is classified member-data with a **cited exemption** (bounded retention, content-free operational purpose, this ADR §4) in the W2 export-completeness register.
   - **"Analytics / optimization" is registered as a named ADR-U034 consent purpose now; collection under it is deferred** until a consumer exists. Nothing behavioral is collected that nothing reads.
5. **ADR-U043 measurement continuity is a docs-side ledger,** `docs/planning/reference/PERF-MEASUREMENT-LEDGER.md`, appended at every gate measurement pass. Perf numbers are planning artifacts, not member data — they do not belong in the event store.
6. **Audit-trail right of access (the COR-C W2 revisit, board AB-4): split by row direction.** Rows where the member is the **actor** — including their own `data_export` entries and the four auth-moment events — gain an export representation in the Art. 15 composite. Rows where the member is the **target of a third-party admin action** remain exempt under a narrowed citation: disclosure could defeat moderation, and the rows carry the admin actor's own identity (third-party data); admin actions visible by effect (e.g. suspension) disclose nothing by their absence from the export. Executed in cycle ADM-D with ADM-16; the manifest exemption entry and the completeness invariant are updated in the same PR.

## Alternatives considered

- **External log-drain / analytics vendor now** — rejected: zero consumers, real DPA/transfer surface, and the platform's queries (admin dashboard counts) are trivially served by Postgres at current scale.
- **Pre-aggregated statistics tables** — rejected: aggregate drift risk and write amplification bought before any read has been measured slow.
- **Consent-gating operational telemetry** — rejected: operational/security events are the textbook legitimate-interest case; consent-gating them makes refusal break observability obligations (V4) without privacy gain, since payloads are content-free. The consent boundary is drawn where collection becomes behavioral analytics — that purpose is registered but dormant.
- **Blanket `admin_audit_log` export exemption (status quo)** — rejected: once ADM-16 gives admins a read surface, denying the member their *own actions'* trail is an asymmetry Art. 15 doesn't support. The narrowed split keeps the defensible half only.

## Consequences

- The V4 vertical spec's scaffold sections (G-03) can be de-scaffolded into a real obligation inventory: emit (existing discipline) + sink (this ADR) + review cadence.
- Every future member-visible surface gains a queryable activity substrate without new decisions.
- The 90-day window is a real limit: investigations older than 90 days have only the audit log (indefinite, append-only) — deliberate; audit ≠ telemetry.
- `admin_audit_log`'s exemption text in the ownership manifest must be rewritten at ADM-D (tracked in the A-ADM plan's exit checklist).

## References

A-ADM area-open board ([plan](../../planning/hub-v2/phase-3-platform-ops-completion-plan.md), AB-1a..d, AB-4) · `TASK-OBS-01` (the task file was swept 2026-08-03 once this ADR and FEAT-PC018 discharged its subject; named here as provenance, not as a live link) · ADR-U012 · ADR-U034 (consent purposes) · ADR-U042/U043 (measurement posture) · ADR-U031/U033 (Mist erasure) · COR-C W2 register (`supabase/ownership.manifest.json` export classifications) · AC3-O6/AC3-O7 (ANATOMY-CONFORMANCE-AUDIT-3).
