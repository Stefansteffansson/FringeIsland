# FEAT-PC008: Member data export — the FIM's own complete data, assembled on demand into a single portable document

---
id: FEAT-PC008
title: Member data export — a self-service contract that assembles and returns the caller's own complete personal data as one machine-readable document, with a durable record that the export happened
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A FIM's personal data is spread across the platform substrate: their profile and account-state on `public.users`, their append-only consent ledger on `public.consent_records`, their group memberships on `public.group_memberships`, and their journey enrolments on `public.journey_enrollments`. A member has **no way to obtain a copy of all of it**. GDPR (the right of access, Art. 15; data portability, Art. 20) entitles the data subject to a copy of their personal data in a structured, commonly-used, machine-readable form. §L3 (`hub/SPECIFICATION.md:366`) attributes the **"data export request flow"** to **PC-4 Governance** for IDN-8, and the [phase-3 plan](../../../planning/hub-v2/phase-3-identity-completion-plan.md) sequences it as Cycle C.

IDN-8 ("request and receive complete data export") needs a contract that, for the **caller's own** account, gathers every piece of their personal data the platform holds into a single document and returns it — and records, durably, that the export was performed (the accountability trail GDPR expects of a fulfilled data-subject request).

This is the platform half of IDN-8: an own-subject aggregation contract over the existing FIM-data substrate, consumed API-first by the Hub ([FEAT-H010](../../../products/hub/features/FEAT-H010-download-my-data.md)) and any future surface (the Gimbal). It is a single capability — request-and-receive in one synchronous step — not a read/write pair.

### Why Platform Core (Governance), not a Domain Service

The export reaches **across** Core-owned substrate (`users`, `consent_records`, `group_memberships`) that no Domain Service may touch without breaking the one-way Domain→Core dependency rule, and it bypasses each table's RLS via a single own-subject `SECURITY DEFINER` projection. Assembling a member's complete cross-substrate record, and recording that a data-subject-rights request was fulfilled, is a **governance** concern (the accountability/compliance fact), not a domain one. It cannot be modelled in Domain or via Extensions: it is a privileged read across Core's own tables plus a durable governance record. (Schema-predates-partition, PW-1: the substrate tables were authored under PC-2/PC-3/DS-3; the member-facing *export contract* over them is PC-4 Governance — the same arrangement as the consent contracts FEAT-PC006/PC007.)

## Solution sketch

Two pieces — one contract, one durable record — over **existing** substrate; **no new table** (the synchronous model, chosen at decomposition):

- **`get_own_data_export()`** — a `SECURITY DEFINER` SQL function, `SET search_path = ''`, resolving the caller through the repo actor primitive to their personal group (`public.get_current_personal_group_id()`). It assembles and returns a single `jsonb` document with a stable top-level shape:
  - `schema_version` — an integer the consumer can branch on (starts at `1`); the document shape is versioned so later additions (the Journal seam below) don't silently change meaning.
  - `exported_at` — server-stamped `timestamptz`.
  - `subject` — the caller's stable identifiers (user id, personal-group id, account email/auth handle).
  - `profile` — the member's `public.users` fields (full name, display name, nickname, bio, display preference, show-real-name).
  - `account_state` — the lifecycle flags the member already sees via IDN-9 (active / suspended / decommissioned).
  - `consent` — the full append-only consent history (the same proof-of-consent projection FEAT-PC006 exposes — every `consent_records` row for the subject: purpose, decision, policy version, captured-at, capture context).
  - `memberships` — the member's `public.group_memberships` (which groups the personal group belongs to, role, status) — the last Core-owned section.
  - **Domain-owned data — forward seams.** Personal data owned by Domain Services (journey enrolments, DS-3 `journey_enrollments`; later forum content, DS-5; …) is **not** assembled here: PC-4 must not reach down into Domain tables — that inverts the one-way Core→Domain boundary, and §L3 scopes IDN-8's external dependency to PC-4 alone. Each Domain area contributes its own export section when it is built/reconciled (the Journeys area adds `enrollments`, etc.), exactly like the Journal seam below. v1 therefore carries no `enrollments` section.
  - **Journal — forward seam.** IDN-5's private Journal substrate does not exist yet (Cycle D). The document **omits** a `journal` section in v1; adding it later is an additive new section under the same `schema_version` bump, not a breaking change. The function is structured so future sections slot in without reshaping the existing ones.

  It reads only the caller's own rows; there is no target parameter. It never returns another subject's data.

- **A durable export-event record.** Fulfilling the export writes one durable record that *member X exported their data at time T* — the GDPR accountability trail (this is what makes the chosen model "synchronous **+ audit**", not a bare read). The only existing durable audit substrate is `public.admin_audit_log`; whether a member-initiated data-subject-rights event belongs there (it is semantically an *admin*-tier log) or in a dedicated privacy/data-subject-rights event log is the one **open design point, resolved at the build session's schema-review gate** (see Open spec questions). Either way the record is written by the `SECURITY DEFINER` body (bypassing RLS as owner); the route additionally emits structured logs (V4).

- **`GET /api/account/export`** — additive route, `@supabase/ssr` cookie-session auth (the realized Hub house style, per FEAT-PC003/PC006/PC007; the `/api/v1/` + `Authorization: Bearer` form of ADR-U015 stays directional and unrealised across the new Hub — see Open spec questions). Sessionless → 401. Returns the document as a downloadable JSON payload.

## Appetite

Small-to-medium. One `SECURITY DEFINER` aggregation function across the Core-owned substrate (`users`, `consent_records`, `group_memberships`), one durable export-event write, one additive GET route, and integration tests for the section completeness, the own-subject boundary, and the export-event record. All the substrate already exists; this reads it and stamps that the read happened. No new table; no background job (the synchronous model was chosen precisely to avoid both).

## Rabbit holes

- **Don't build an async request/queue system.** The decomposition decision is synchronous assembly + immediate return. No `export_requests` table, no worker, no polling. (If a future member ever holds enough data to need it, the contract can be wrapped async without changing this signature — but that is explicitly out of scope.)
- **Don't invent a new export format per section.** One `jsonb` document, one `schema_version`, sections as named keys. Machine-readable (Art. 20), not a human-formatted report.
- **Don't hardcode the data shape as a sealed contract.** New personal-data substrate (the Journal; later areas' member data) is added as new sections under a `schema_version` bump — never by reshaping or removing existing sections.
- **Don't relax any table's RLS.** The aggregation is a narrow own-subject `SECURITY DEFINER` projection keyed to the caller's personal group — not a widening of any table's SELECT policy.
- **Don't return another subject's data.** No target parameter; the elevation exists solely to assemble the caller's own record.
- **Mind the timestamp boundary.** `captured_at` / `enrolled_at` / `exported_at` are `timestamptz` (`+00:00`); compare/serialise as epoch ms or pass through as ISO, never string-compare raw ISO against `Z` (platform gotcha).
- **Mind `auth`-schema reads.** The subject's email lives on `auth.users`; reading it from the `SECURITY DEFINER` body is legitimate but must be deliberate and least-privilege (only the subject's own row).

## No-gos

- No asynchronous request flow, queue, table, or background job (synchronous only — decomposition decision).
- No deletion or mutation of any data — export is read-only (self-service exit/deletion is IDN-10, the Cycle F forward-seam).
- No cross-subject export — strictly own-row; no parameter targets another member.
- No Journal section in v1 (the substrate does not exist — added when IDN-5 lands, Cycle D).
- No Domain-owned data in v1 (journey enrolments, forum content, …) — PC-4 does not read Domain tables; those sections are contributed by their areas as forward seams (§L3 scopes IDN-8's dependency to PC-4).
- No admin-initiated export of another member's data (an admin/DeusEx data-access affordance, if ever needed, is a separate A-ADM capability).
- No change to any existing table, RLS policy, trigger, or route.

## Stories

### STORY-1: Assemble my complete data into one document
As the platform, I want an authenticated FIM to receive all of their own personal data in a single machine-readable document, so a Surface can offer "download my data" API-first without touching the substrate tables directly.

**Acceptance criteria:**
- Given an authenticated FIM, when they call the contract, then it returns one `jsonb` document with `schema_version`, a server-stamped `exported_at`, and a `subject` block carrying their own stable identifiers — resolved to the caller via the actor primitive.
- Given the member has profile data, consent history, and group memberships, when they call the contract, then the document contains a `profile`, `account_state`, `consent`, and `memberships` section, each populated from the caller's own rows.
- Given a member with data in only some areas (e.g. consent and profile but no group memberships), when they export, then the empty areas are present as empty collections — never omitted and never erroring — so the document shape is stable.

### STORY-2: The export is complete and faithful to the ledgers
As the platform, I want each section to reflect the authoritative substrate, so the export is an honest copy and (for consent) a GDPR proof trail.

**Acceptance criteria:**
- Given a member with multiple consent events across purposes (including a grant later withdrawn), when they export, then the `consent` section contains **every** one of their `consent_records` rows (purpose, decision, policy version, captured-at, capture context) — the ledger is not collapsed.
- Given a member's current profile and account state, when they export, then `profile` and `account_state` match the member's `public.users` row (the same lifecycle flags IDN-9 renders).
- Given a member's group memberships, when they export, then `memberships` reflects their `group_memberships` rows.

### STORY-3: Own-subject only — no cross-member exposure
As the platform, I want the contract to assemble only the caller's own data, so it never widens exposure.

**Acceptance criteria:**
- Given any authenticated caller, when they call the contract, then it resolves to **their own** personal-group subject only — there is no parameter to target another subject, and no path returns another subject's data.
- Given the `SECURITY DEFINER` elevation, when the function runs, then it bypasses each source table's RLS **only** to project the caller's own rows; an ordinary `SELECT` by any other surface on those tables still obeys the unchanged per-table policies.

### STORY-4: A durable record that the export happened
As the platform, I want each fulfilled export recorded durably, so there is an accountability trail that a data-subject-access request was served.

**Acceptance criteria:**
- Given a member successfully exports their data, when the contract completes, then a durable export-event record is written identifying the subject, the action (`data_export`), and the server-stamped time.
- Given the export fails before assembly completes, when the call returns an error, then no partial document is returned and the failure is observable (structured log), not silent.

### STORY-5: The document shape is versioned and extensible
As the platform, I want the document carried under a schema version with open sections, so future personal-data areas (the Journal; later areas) extend it without breaking consumers.

**Acceptance criteria:**
- Given the v1 contract, when a member exports, then `schema_version = 1` and the absent-substrate Journal section is **not** present (its substrate does not exist yet).
- Given a later area adds a new personal-data section, when the contract is extended, then it appears as a new named section under an incremented `schema_version`, leaving existing sections unchanged in shape and meaning.

## Platform dependencies

- **PC-2 Identity — profile + account substrate (existing).** `public.users` (FEAT-PC002/PC003/PC004 territory) for `profile` + `account_state`, and the repo actor primitive `public.get_current_personal_group_id()` for own-subject resolution. The subject's email is read from `auth.users` (least-privilege, own row only).
- **PC-4 Governance — consent ledger (existing).** `public.consent_records` (FEAT-PC002 / ADR-U034) for the `consent` section — the same own-subject projection FEAT-PC006 exposes. The export **reads**; it never appends.
- **PC-3 Organisation — memberships (existing).** `public.group_memberships` (Conformant carry-forward, [substrate-audit](../../../planning/hub-v2/substrate-audit.md)) for `memberships`.
- **Domain-owned personal data — forward seams (do not block; not assembled by PC-4).** Journey enrolments (`journey_enrollments`, DS-3) and later Domain-owned member data (forum content, DS-5; …) are **not** read by PC-4 — that would invert the one-way Core→Domain boundary, and §L3 scopes IDN-8's external dependency to PC-4 alone. Each Domain area contributes its own export section when it is built/reconciled (the Journeys area adds `enrollments`), exactly like the Journal seam.
- **Durable audit substrate (build-session schema-review gate).** The export-event record lands in `public.admin_audit_log` (the existing durable audit table) unless the schema-review gate elects a dedicated privacy-events log — the one open design point, resolved with the migration. The new `SECURITY DEFINER` function + the audit write are a schema touch → task status `review`, gated on the explicit nod (Platform Core + schema carve-outs).
- **IDN-5 Journal — forward seam (does not block).** The Journal section is added when IDN-5's substrate lands (Cycle D); its absence in v1 is by design, not a missing dependency.

## Cross-product impact

Consumed by **Hub [FEAT-H010](../../../products/hub/features/FEAT-H010-download-my-data.md)** (IDN-8) — the surface that offers "download my data." The **Gimbal** will consume the **same** `GET /api/account/export` contract for its own export affordance; only the platform-side semantics are shared. The route is additive (ADR-U015) — no breaking change, no version bump. Paired-spec reciprocation: **the assembly is owned at the platform tier; the Hub cannot touch the substrate tables directly (ADR-U009)** — it receives the assembled document and hands it to the member as a file.

## Stability posture (Platform Core §7)

Additive: one new `SECURITY DEFINER` read function, one durable export-event write, one new route. No existing Core contract signature changes, so the Internal/Platform API surface only grows. The new function is a privilege-escalation surface, documented as such in its migration comment — its elevation is bounded to assembling the caller's own cross-substrate record, nothing more. The schema touch sets task status to `review`, not `done`.

## Vertical impact

- **Privacy/GDPR:** this is a Privacy-vertical feature end-to-end — it realises the right of access / data portability (Art. 15 / Art. 20). Own-subject only; it bypasses each table's RLS **only** for the caller's own rows and never widens exposure. The export is read-only (no erasure — that is IDN-10). The `consent` section carries the append-only proof-of-consent trail.
- **Notifications:** None — an own-data export addresses no other party and triggers nothing (consistent with §L3 IDN-8 = V2, V4; not V3). (If a future async model is ever adopted, an "export ready" notification would attach there — out of scope here.)
- **Administration:** None new — no admin affordance and no admin path; the member exports their own data. The durable export-event record may surface in admin/audit tooling depending on the schema-gate substrate decision (see Open spec questions), but this feature adds no admin *action*.
- **Observability:** the route emits structured logs (request id, actor, outcome); auth denials and assembly failures are recorded, not returned silently. Beyond route logs, each fulfilled export writes the durable export-event record (Story-4) — the accountability trail.
- **Transactions:** None — no payment, entitlement, or financial data. (Entitlement/receipt data is not part of the member's personal-data substrate today; if Transactions substrate lands later, it joins the export as a new versioned section.)
- **Extensibility:** the document is carried under an integer `schema_version` with named, open sections; new personal-data areas extend it as new sections under a version bump — never a sealed shape. Decision/status values inside sections (consent decisions, enrolment status) pass through as the open-text data their source tables hold, not a hardcoded client enum.

## Open spec questions

1. **Export-event substrate (resolve at the build-session schema-review gate).** The durable export-event record defaults to `public.admin_audit_log` (the only existing durable audit substrate, honouring the no-new-table decision). The open point is whether a *member-initiated* data-subject-rights event belongs in an *admin*-tier log — where it would appear in admin/audit viewers alongside genuine admin actions — or in a dedicated privacy / data-subject-rights event log. Decided with the migration at the schema gate; not a DoR blocker (the default is clear).
2. **API convention reconciliation (ADR-U015).** Spec'd as `GET /api/account/export` + `@supabase/ssr` cookie auth — the realized Hub house style (FEAT-PC003/PC006/PC007). The canonical `/api/v1/...` + `Authorization: Bearer` form is directional and not yet realised across the new Hub; a future reconciliation aligns the shipped routes with the versioned contract. Carried, not resolved here.
3. **Email source.** The subject's email is read from `auth.users`. Confirm at build whether the export should also carry any other auth-schema fields the member would consider "their data" (e.g. last-sign-in), or strictly the application-tier record.
