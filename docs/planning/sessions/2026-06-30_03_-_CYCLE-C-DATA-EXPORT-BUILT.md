# Session bridge — Cycle C (Data export / GDPR) built to 6-done

**Date:** 2026-06-30 (build session; follows `2026-06-30_02` which decomposed Cycle C to 4-ready)
**Session type:** Build (`feature-development`). Platform-half-first, red-first, full pyramid. + a targeted cycle-close doc-health pass.
**Status:** **Cycle C COMPLETE** — FEAT-PC008 + FEAT-H010 both `6-done` and merged. IDN-8 (request + receive complete data export) shipped.
**Branches/PRs (all merged):** #31 PC008 (platform), #32 H010 (Hub). `main` synced at `a9ae448`.
**Participants:** Stefan + Claude

---

## What was built

The PC-4 Governance data-export contract + the Hub "download my data" surface, platform-first and API-first.

| Spec | What shipped | Tests (units red-first) | PR |
|---|---|---|---|
| **FEAT-PC008** (IDN-8) | `get_own_data_export()` — PL/pgSQL `SECURITY DEFINER`, `search_path=''`, **VOLATILE** (writes the audit row). Resolves via `auth.uid()` → `users` (covers suspended members), own-row only. Assembles `subject` / `profile` / `account_state` / `consent` (full history newest-first) / `memberships` (joined to `groups`) into one versioned `jsonb` document + a durable `data_export` row in `admin_audit_log`. `GET /api/account/export` (attachment download). **No new table.** | 7 integration + 3 route-unit | #31 |
| **FEAT-H010** (IDN-8) | `/export` surface (FIM-only gate) + AccountMenu "Download my data" entry; `DataExportPanel` (fetch → `downloadJson` Blob+anchor → telemetry; loading + error/retry; no double-fire via stable `aria-label`). A faithful courier — never parses/reshapes the document. Client `hub/lib/account/export-client.ts`. | 4 client-unit + 4 panel-unit + AccountMenu link + 3 E2E | #32 |

Full unit **159/159**, account integration **32** (4 suites), export E2E **3**; `next build` + `eslint` clean throughout. User-visible **CHANGELOG** entry added (Cycle C closes).

### Schema (schema-review gate + ADR carve-out, applied on Stefan's nod)
- Migration `20260630161155_feat_pc008_data_export.sql` — **one new function, no new table** (so no RLS change). Applied + repaired.
- The function reads Core-owned substrate only (PC-2 `users`, own `consent_records`, PC-3 `group_memberships`, `groups`); Domain tables are **not** read (one-way Core→Domain boundary; §L3 scopes IDN-8 to PC-4).

## Decisions / notes from the build

- **Resolution via `auth.uid()`, not `get_current_personal_group_id()`** — the latter is `is_active`-gated, which would block a **suspended** member from exporting; GDPR right-of-access is status-independent, so the function anchors on `auth.uid()` → `users` directly (own-subject preserved). A small, deliberate refinement of the spec's wording.
- **Export-event substrate (the carried open point) — closed to `admin_audit_log`** for v1 (the existing durable audit substrate; honours the no-new-table decision). A dedicated privacy-events log stays a possible later move (documented in the migration + Open spec questions).
- **VOLATILE, not STABLE** — the function writes the audit row, so it cannot be STABLE (a STABLE function may not modify the DB).
- **Profile-field reconciliation** — the real `users` substrate carries `full_name` / `nickname` / `display_preference` / `show_real_name` / `avatar_url` / `bio` (the display-name system, migration `20260227095615`) — the spec's aspirational field list was reconciled to what the substrate actually holds; `display_name` is the personal group's name (joined).
- **Test-timeout note (honest, not a logic change)** — the data-export integration suite is heavier than the consent suites (cross-substrate reads + an audit write per export). Under the full-account `runInBand` sweep it runs last and brushed the default 30s ceiling on cumulative remote-DB contention (passes in ≈19–37s). Raised this suite's timeout to 60s + moved the empty-area user create/teardown into hooks.
- **E2E honesty** — the 3 export E2E are journey tests **layered on the red-first units** (the orchestration logic is unit-covered); labelled as such in the spec + impl notes, matching the FEAT-H008/H009 precedent.

## Close ritual — targeted doc-health (cycle close, 2026-06-30)

Run because the cycle had a schema migration + new specs (cross-cutting). Targeted to the triggered sections (full skill deferred to the wave boundary):
- **§5 maturity / §8 inventory** — PC008 + H010 `6-done` consistent across spec frontmatter, governance §L4 + Hub §L4, and both `features/README` table rows. No stray `4-ready` (the `4-ready` references that remain are correctly PC005 / H007, both parked).
- **§2 schema** — migration `20260630161155` applied + in the migration list.
- **§1 terminology / gaps** — **G-35** correctly narrowed: data-export now enumerated in PC-4 §L3 (+ reconciliation note); only the *feature-flag* capability remains attributed-but-unenumerated. No stale "data-export unenumerated" claim anywhere.
- §1.5 / 3.x / 6 / 7 / 9 / 10 — not triggered (no concept retirements, archiving, deletions, snapshots, new entities, or CLAUDE.md/cascade edits this cycle).

## Resume HERE — next session

Per the [phase-3 plan](../hub-v2/phase-3-identity-completion-plan.md): **Cycle D — IDN-5 (private personal Journal surface)**. **Decompose first**, and at decomposition **confirm the open question the plan flags: does the PC-2 Journal substrate exist, or is it net-new (a new table → schema gate)?** (A migrations/seeds check confirmed **no `journal*` table exists today** during the Cycle C build — so Cycle D is very likely net-new substrate + a schema gate. Verify at decompose.) Then build platform-first / red-first. (Cycles E sessions / F exit-seam follow.)

## Carry-forward

- **Journal export section (forward seam)** — when IDN-5 lands (Cycle D), add a `journal` section to the export document under a `schema_version` bump (the function is structured for it). **Journey-enrolments export section** — added by the Journeys area (DS-3) when built.
- **G-35** — narrowed to its **feature-flag remainder** only (enumerate when the first feature-flag consumer is derived).
- **API-convention reconciliation** (`/api/v1/`+Bearer vs the realized `/api/account/*`+cookie) — still a directional open question across the new Hub (now spans consent + export routes).
- **Export-event substrate** — `admin_audit_log` for v1; revisit a dedicated privacy/data-subject-rights events log if the admin-log noise becomes real (or when IDN-10 erasure + a broader DSAR surface arrives).
- **G-34** sharing-controls slice — unchanged. **IDN-12 (FEAT-PC005/H007) stays parked**; **IDN-10 forward-seam untouched** (Cycle F).
