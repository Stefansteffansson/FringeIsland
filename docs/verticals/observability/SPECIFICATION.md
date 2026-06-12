# Vertical — V4: Observability

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V4
name: Observability
owner: Stefan
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: active
last_updated: 2026-06-12
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Logs, metrics, traces, audit trails, error reports. Every service must be inspectable in production. If a feature isn't observable, it doesn't exist as far as operations are concerned. Operating a multi-product ecosystem with extensions and 50+ contributors is impossible without observability. This vertical guarantees that any anomaly — performance regression, error spike, suspicious access pattern — is detectable, attributable, and reproducible.

### 2. Scope

- Structured application logs
- Performance and business metrics
- Distributed tracing across service boundaries
- Audit log (immutable record of security-relevant events)
- Error reporting and alerting
- Dashboards for the most critical metrics
- On-call posture (who gets paged, when, why)

### 3. Tooling and infrastructure

- **Structured logger (missing; current posture is bare console).** The realized posture is 69 `console.log/error/warn` call sites across `app/` and `lib/` — per-site, unstructured, carrying no request ID, actor, or outcome. The platform-tier bar (structured logs with request ID + actor + outcome on every API route) is unmet by tooling: a shared logger owned by Platform Core is the missing piece that makes the obligation cheap to satisfy. Backend connection is part of the self-host-vs-buy question (§5 Q1).
- **Metrics backend (to be selected).** Nothing realized. The obligations below already fix the selection criteria: canonical metric names, count + duration per operation, service-level baselines for regression detection — and a hard boundary: operational metrics never feed member-facing surfaces (§6). Dashboards and alerting are downstream of this selection (nothing realized there either).
- **Tracer (to be selected; deliberately deferred).** Nothing realized. The current architecture is a single Next.js process in front of Supabase — there is no second service boundary for distributed tracing to cross. The obligation (request context carried end-to-end) is satisfiable today by request-ID propagation through the structured logger; a dedicated tracer becomes real when service boundaries do (the ADR-U023 Internal/Platform API split is the forward trigger).
- **Audit log (partial — realized for admin actions only).** `admin_audit_log` is a live, RLS-enabled baseline table (origin migration archived at `20260217163653_admin_audit_log.sql`; operator read surfaces at `app/admin/page.tsx` and `app/admin/deusex/page.tsx`). That covers administrative acts; ADR-U012's immutable audit trail also covers data-access events over member data — the recording side of the U012 split (Observability records, Privacy exposes), which is unrealized. Immutability is verified at the RLS layer (SELECT + INSERT policies only, currently gated by the `is_platform_admin()` helper — a DeusEx-membership proxy for the admin permission set, not a permission check; no UPDATE/DELETE path for application roles) but is policy-shaped, not mechanism-complete: the table itself carries no trigger guard, and one deliberate SECURITY DEFINER mutation path exists — `admin_hard_delete_user` reassigns audit-entry actors to the `[Deleted User]` sentinel (the erasure side, §5 Q4, not tampering). The live table is the 2026-02-22 rebuild (group-keyed actor), not the archived origin. The Console is the operator read surface going forward (ADR-U028 Ferd routing); the member-facing exposure surface is V2's deliverable, built on this vertical's recording.
- **Error reporter (to be selected — "Sentry or equivalent", ADR-U012).** Next.js error boundaries exist (`app/error.tsx`, `app/global-error.tsx`) but report to no collector — unhandled errors are rendered, not gathered. Vendor naming stays here, not in an ADR. Any selected vendor is a V2 sub-processor the moment request context or stack traces flow, and the content-free payload rule binds error payloads like any other.

### 4. Failure modes

This vertical is the detection layer for the other four; its own failure modes are second-order — when observability fails, the failure presents as silence.

- **Swallowed failure.** An error is caught and dropped or rendered as an empty state; the platform learns about production issues from user reports — the exact condition ADR-U012 exists to prevent. Detection is second-order: a swallowed failure emits nothing, so it is found only by review against the no-silent-fallbacks rule and by error-reporter coverage once a reporter exists. Recovered by instrumenting the path; the missed-incident window is unknowable, which is the cost that justifies the rule.
- **Audit gap.** A security-relevant action or an access to private member data happens without an audit entry. Privacy cannot expose what was never recorded — the member-rights answer ("what has been done with my data?", ADR-U012) silently degrades to incomplete. Detected at feature-spec time by the Vertical Impact review (the audit-recorded slot, ADR-U016) and retroactively by audit-coverage reconciliation; invisible at runtime. Recovered by closing the instrumentation gap and recording that the gap existed — an un-audited window cannot be honestly backfilled.
- **Mutable audit trail.** The trail can be updated or deleted by an actor it audits; immutability (ADR-U012) fails and the trail's evidentiary value with it. Detected by permission review on the audit store (insert-only for every audited actor). Recovered by locking down the write paths; entries from the mutable window are downgraded to untrusted. The deliberate tension with Art. 17 erasure is §5 Q4 — erasure-by-design is distinct from tampering.
- **Recorded but unseen.** An anomaly is logged or counted, but no alerting or on-call path escalates it; detection exists on disk and nowhere else. The Art. 33 seam makes this acute: the 72-hour clock starts at detection, and a recorded-but-unread breach indicator is detection without response (V2 §5 Q5 owns the process side; this vertical owes the escalation side). Detected by periodic manual review during the solo phase (§5 Q3); recovered by alerting tooling when selected.
- **Telemetry becomes member-facing measurement.** Operational events surface to members as counts, rankings, scores, or activity displays. This is the constitutional failure mode: the MANIFESTO's "story — not metrics, not scores, not algorithms" and "to be met without being measured", the privacy-model's aggregate ban. Detected at design review (Vertical Impact + design-system review); recovered by removing the surface — the underlying events stay operational-only.
- **Payload leak.** An event or log entry carries member content (journal text, Whisp dialogue, assessment results) instead of identifiers and outcomes. The log store silently becomes a personal-data store outside V2's controls — retention violates storage limitation, and erasure cascades break (logs are V2 §4's named survivor copies). Detected by content-free payload review and log audits; recovered by purging the offending entries and fixing the emitter — and purging logs is itself privacy-and-immutability-hard, which is why prevention (content-free by design) is the rule.
- **The watcher fails silent.** The observability pipeline itself drops writes, fills, or throws — and the layer that would record the failure is the failing layer. The posture rule bounds the blast radius: instrumentation is read-only and passive (ADR-U012) — it fails open for the observed operation (never blocks or corrupts member-facing work) and fails loud for operators (self-monitoring, to-be-designed). Recovered by restoring the pipeline and recording the bounds of the blind window.

### 5. Open questions

1. **Self-host or buy observability infrastructure?** One hosted bundle or composed parts — logger backend, metrics, error reporter, dashboards? Every external vendor inherits V2's sub-processor obligation the moment request context or stack traces flow. Candidate decision when the first backend is selected (§3).
2. **Retention per signal class.** How long do logs, metrics, and audit entries live? This is a privacy seam, not just a cost knob: logs and audit entries carrying actor identifiers are personal data under V2's own definitions — each class needs a documented retention basis, and log stores join the erasure-cascade scope (V2 §6). Content-free aggregate metrics are the cheap class. Candidate joint spike with V2.
3. **On-call during the solo-developer phase.** Who is paged, when, why — and what does "paged" mean for one operator? Interim posture candidate: a periodic review cadence plus a single escalation channel; becomes real when alerting tooling lands (§3; §4 recorded-but-unseen).
4. **Immutable audit trail vs Art. 17 erasure.** ADR-U012 demands immutability; V2's erasure cascade names logs as survivor copies that break erasure. When a member invokes Art. 17, what happens to audit entries naming them as actor or subject? Candidate ADR; the option space includes actor pseudonymisation at write time, crypto-shredding of identifier columns, and a documented legal-obligation basis for retaining security-relevant entries (Art. 17(3)). Owned jointly with V2 — neither spec resolves it unilaterally. Realized evidence: the platform already practices actor-pseudonymisation on this trail — `admin_hard_delete_user` reassigns `admin_audit_log.actor_group_id` to the `[Deleted User]` sentinel before deleting the personal group. The erasure-side exception has a working precedent; the question is whether sentinel reassignment generalises to regime-grade Art. 17 (shared question with V2 §5 Q4).
5. **Lawful basis for behavioral telemetry.** The products-tier obligation ("every meaningful user action emits a telemetry event") meets consent law: is feature-level telemetry legitimate-interest operational data or consent-gated analytics (ePrivacy)? V2 owns the lawful-basis law; this vertical owns the event stream. Needs an answer before telemetry tooling ships member-wide. Candidate joint spike with V2.

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- Provides the shared observability tooling — structured logger, metrics client, audit-log writer, and (when service boundaries warrant) tracer — as one implementation every tier consumes; owns the connection to the selected backend(s). If a feature has to hand-roll its own instrumentation, the tooling is missing — flag it.
- Every API route emits a structured log entry carrying request ID, actor, and outcome. The bar: if a bug cannot be traced to its origin from logs alone, instrumentation is missing.
- Every RLS denial is recorded, never silently returned as empty. Doubly load-bearing: it is the platform-debugging rule, and V2's consent-drift and private-by-default-inversion failure modes name RLS-denial observability as their detection mechanism.
- Every access to private member data writes a data-access audit event — the recording side of the ADR-U012 split (Observability records data-access events; Privacy exposes them to the member through a Platform API). Recording must be queryable per-member, or the exposure side cannot be built on it.
- Every security-relevant action — authentication events, permission and role changes, administrative acts, data-access grants — writes an audit entry through the shared writer. Administrative acts are the realized slice today (`admin_audit_log`); the obligation covers the full class.
- The audit trail is immutable in the tampering sense: insert-only for every actor it audits — no UPDATE or DELETE path from application roles. The erasure-side exception is §5 Q4, decided deliberately, never improvised per-feature.
- Every migration is traceable: applied timestamp, applied-by, repair status.
- Platform errors are observability events — no swallowed failures, no silent fallbacks.
- Instrumentation is read-only and passive (ADR-U012): it never mutates the state it observes and never blocks the observed operation — fail open for the operation, fail loud for operators.
- Observability payloads are content-free: identifiers, categories, and outcomes — never member content. A log line that needs the member's words to be useful is a design smell pointing at a missing identifier.
- Detection signals other verticals depend on are platform instrumentation duties: V2 names breach detection (Art. 33's clock starts at detection), consent drift, and private-by-default inversion as V4-dependent. The platform emits the signals; escalation posture is §5 Q3.

#### Domain Services

- Each operation emits one structured log entry at the appropriate level, carrying the request context (request ID, actor, outcome) through every service it crosses.
- Each operation increments a metric — count + duration — under a canonical metric name, so service-level baselines exist and regressions are detectable rather than anecdotal.
- Each security-relevant action, and each access to private member data, writes an audit entry through the shared audit writer — services never invent their own audit stores.
- Event payloads are content-free by design: dialogue, accumulation, enforcement, and feed events carry identifiers and outcomes, never member content. An event payload is a visibility surface like any other — V2's no-role-bypass and private-by-default obligations are the binding source.
- Operational telemetry never becomes member-facing measurement: no service computes counts, rankings, scores, or activity aggregates from observability data for display to members. Anything member-visible derived from member activity crosses into V2's aggregate regime (explicit informed consent, enterprise stewardship) — operational metrics stay operational.
- Service degradation is an observability event: an AI provider down, a search index stale, a queue backing up — emit the degradation; no silent fallbacks that mask it.
- Where a flow crosses a service boundary, the request context crosses with it — the tracing obligation is context propagation today, a dedicated tracer when boundaries multiply (§3).

#### Surfaces (Products · Studios · Design System)

- Every surface reports unhandled errors to the central error reporter once one is selected; until then, error boundaries render the failure honestly and never swallow it — an empty screen with no emitted error is a double failure.
- Products: every meaningful user action emits a feature-level telemetry event — "meaningful" means anything a future product decision would want to measure (enrolled in a journey, accepted an invitation, left a group); page views are the low bar, not the standard. Error states are observability events too.
- Studios: content lifecycle events are first-class — publish, update, deprecate, retire, handover, takeover all emit. Creator actions on their own content are tracked separately from FIM interactions with that content; the two trails never mingle.
- Studios: silent studio failures — a save that didn't persist, a deployment that didn't propagate — are Dreamineer-visible failures; emit them.
- Design system: components instrument their own interaction events (button clicked, modal opened, form submitted) under canonical event names — products and studios get interaction observability free by using components and never rewire it. "Show error" is a component concern; "what the error was" is a caller concern.
- No surface renders telemetry-derived measurement to members: no counts, rankings, scores, streaks, or activity displays sourced from observability data. The constitutional boundary (story, not metrics; met without being measured) binds hardest at this tier, where leakage becomes visible harm.
- Audit-trail read surfaces consume the trail through Platform APIs, never by querying audit storage directly: the operator surface is the Console's audit-log viewer (ADR-U028); the member-facing access trail is V2's exposure surface, built on this vertical's recording.

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New API route emits a structured log entry with request ID, actor, and outcome
- [ ] New API route increments a metric (count + duration) under a canonical metric name
- [ ] New security-relevant action writes an audit entry via the shared audit writer
- [ ] New access path to private member data writes a data-access audit event
- [ ] New RLS-protected read path records denials instead of silently returning empty
- [ ] New error path reports to the error reporter (until one exists: renders an error state and swallows nothing)
- [ ] New observability event payload is content-free — identifiers and outcomes, no member content
- [ ] New metric or event is operational-only — nothing derived from it renders to members as counts, rankings, or scores
- [ ] New meaningful product action emits a feature-level telemetry event
- [ ] New content lifecycle transition emits its lifecycle event (publish / update / deprecate / retire / handover / takeover)
- [ ] New instrumentation is read-only and non-blocking for the operation it observes
- [ ] Dashboard exists if this feature has a measurable success criterion

### Sources-status block

- **Step 2 verification record (2026-06-12):** Compliance polarity: `admin_audit_log` live (rebuilt 2026-02-22, group-keyed actor; RLS-layer insert-only verified; one deliberate erasure-side mutation path — sentinel reassignment); 69 bare `console.*` lines across `app/`+`lib/` (5 in `app/api/`, catch-all `console.error` on each of 4 routes); error boundaries exist, collector absent (commented Sentry examples only). Absence polarity (dual-method, judged by output lines): metrics backend, tracer, dashboards, alerting, shared logger, RLS-denial recording, error-tracking vendor — all zero; the 5 vendor-grep hits and the one seeds hit confirmed false positives hit-by-hit. Structured-log obligation's realized scope: 4 API routes (products tier queries Supabase directly — reconciliation downstream, SS-16/17 scope). Zero retractions against Step 1.

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
