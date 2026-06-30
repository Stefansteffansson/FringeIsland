# Session bridge — Cycle C (Data export / GDPR) decomposed to 4-ready

**Date:** 2026-06-30 (decompose session; follows `2026-06-30_01` which built Cycle B consent to 6-done)
**Session type:** Decompose (`ecosystem-decomposition`, L4 + a small L3 step). Paired Hub + platform specs to `4-ready`.
**Status:** **Cycle C consent→export pivot — IDN-8 decomposed.** FEAT-PC008 (platform) + FEAT-H010 (Hub) authored `4-ready`. PC-4 §L3 now enumerates data export (G-35 narrowed to feature-flags only). Merged.
**Branch/PR (merged):** #29 `docs/cycle-c-idn8-export-decompose`. `main` synced at `cd8ee09`.
**Participants:** Stefan + Claude

---

## What was decomposed

The IDN-8 "request and receive complete data export" capability — the GDPR right of access / data portability — as a **single paired slice** (not a read/write pair like consent): one platform contract + one Hub surface.

| Spec | What it specifies | Maturity |
|---|---|---|
| **FEAT-PC008** (PC-4 Governance) | Synchronous `get_own_data_export()` (`SECURITY DEFINER`, own-subject via `get_current_personal_group_id()`) assembling the caller's **Core-owned** data into one versioned `jsonb` document — `subject` / `profile` / `account_state` / `consent` (full history) / `memberships` — + a durable export-event record. `GET /api/account/export` (cookie auth). Net-new RPC → **schema gate at build.** | `4-ready` |
| **FEAT-H010** (Hub) | FIM-only "download my data" affordance in the account/privacy area; request → loading → file download / error. A faithful **courier** of the versioned document (renders nothing of the data itself, so future sections flow through with no Hub change). Read-only, own-data only. Consumes PC008 API-first; no migration. | `4-ready` |

## Decisions (Stefan's picks + the conformance correction)

- **Synchronous instant download** (not an async request/queue/table) — chosen for the small per-FIM data volume; the contract can be wrapped async later without changing its signature. + a **durable export-event record** (the "+audit" half of the pick — the GDPR accountability trail).
- **Member's own data only**; the platform **admin audit log is excluded** from the member export (it is platform-internal operational data, not member-provided).
- **Format:** one versioned JSON document (`schema_version` starts at `1`); **FIM-only own-subject**; **`/api/account/export` + cookie** (the realized Hub house style; `/api/v1/`+Bearer stays the carried directional open question).
- **Conformance correction (caught during authoring):** PC-4 assembles **Core-owned data only** (PC-2 `users`, own `consent_records`, PC-3 `group_memberships`). My first draft wrongly included **journey enrolments** (DS-3) + cited DS-3 as a dependency — but canonical §L3 scopes IDN-8's external dependency to **PC-4 alone**, and PC-4 reading a Domain table inverts the one-way Core→Domain boundary (governance §4). So journey enrolments + the Journal (IDN-5) are **forward-seam sections** each Domain/area contributes when built — exactly like the Journal seam. The document is versioned so they slot in non-breaking.

## Open design point — deferred to the build's schema-review gate

**Where the durable export-event record lands:** `admin_audit_log` (default; the only existing durable audit substrate — honours the no-new-table decision, but a member self-service action then appears in an *admin*-tier log) vs a **dedicated privacy / data-subject-rights events log** (cleaner semantics, slightly more substrate). Stefan's lean (and mine): default to `admin_audit_log` for v1, revisit if admin-log noise becomes real. Settle with the migration at the schema gate. **Not a DoR blocker** (default is clear).

## Cascade (the L3/L4 maintenance + a bonus fix)

- **PC-4 §L3 (`governance-specification.md`):** added the **data-export capability row** (internal area PC-4; upstream-PC substrate only — PC-2/PC-3/PC-1; V2/V4) + a reconciliation note → **closes the data-export portion of G-35.**
- **§L4 summaries:** governance §L4 (FEAT-PC008 row) + hub §L4 (FEAT-H010 row + coverage-note update).
- **Indexes:** both `features/README.md`; **gaps.md** G-35 narrowed to its **feature-flag remainder** only (awaiting the first feature-flag consumer's derivation).
- **Bonus fix:** corrected a **pre-existing broken-link bug** — governance §L4 Hub links used `../../../products/...` (→ a nonexistent `<root>/products`); fixed to `../../products/...` (3 links: the existing PC006/PC007 rows + the new PC008 row). All new links verified against the real filesystem.

## Close ritual

- **doc-health-check:** not run — this was a routine decompose (two new specs + one §L3 row), not a cycle boundary and not a cross-cutting change (no rename / deletion / schema migration / restructure). Targeted link verification done inline instead.
- **dashboard:** refreshed.
- **bridge:** this file.

## Resume HERE — next session

**Cycle C build session** (`feature-development`): platform-first — **FEAT-PC008 through its schema gate** (build the `get_own_data_export()` RPC + the export-event write; settle the open design point above with the migration), then **FEAT-H010** consuming it API-first. Red-first, full pyramid → `6-done` → merge → bridge. (Cycles D Journal / E sessions / F exit-seam follow.)

## Carry-forward

- **Export-event substrate** (admin_audit_log vs dedicated privacy-events log) — resolve at the PC008 schema gate.
- **Journey-enrolments export section** — forward seam; the Journeys area (DS-3) adds an `enrollments` section to the export document when it is built. **Journal export section** — forward seam; IDN-5 (Cycle D) adds a `journal` section.
- **G-35** — narrowed to its **feature-flag remainder** only (PC-4 §L3 still omits the feature-flag capability the Hub §L3:366 attributes to PC-4; enumerate when its first consumer is derived).
- **G-34** sharing-controls slice — unchanged (IDN-7's other half; PC-3-coupled; author when COI-1 / DIS-6 first need it).
- **API-convention reconciliation** (`/api/v1/`+Bearer vs the realized `/api/account/*`+cookie) — still a directional open question across the new Hub.
- **IDN-12 (FEAT-PC005/H007) stays parked**; **IDN-10 forward-seam untouched** (Cycle F).
