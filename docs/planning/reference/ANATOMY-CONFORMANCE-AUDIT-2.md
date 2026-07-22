# Anatomy Conformance Audit II — the gate-coverage delta

**Date:** 2026-07-22 · **Scope:** `hub/` + `supabase/migrations/` (75 migrations, 72 BFF routes, 32 live public tables). `hub-legacy/` excluded.
**Predecessor:** [`ANATOMY-CONFORMANCE-AUDIT.md`](./ANATOMY-CONFORMANCE-AUDIT.md) (2026-07-19) — findings AC-1..AC-9, corrected by Cycle COR-A.
**Ground truth:** [`ARCHITECTURE_ANATOMY.md`](../../architecture/ARCHITECTURE_ANATOMY.md) · [`ECOSYSTEM_ANATOMY_V6.svg`](../../architecture/ECOSYSTEM_ANATOMY_V6.svg) · ADR-U009 · ADR-U038 · ADR-U047 (+A1, A2) · ADR-U048 · ADR-U002.
**Finding IDs are `AC2-*`** to keep the predecessor register's `AC-*` namespace intact.

**Status: CLOSED (2026-07-22)** — all five findings dispositioned in Cycle COR-B, same day as the audit. AC2-1 **CLOSED** (W2, PR #255) · AC2-2 **CLOSED** (W1, PR #255) · AC2-3 **CLOSED** (W3, PR #255) · AC2-4 **CLOSED** (W4, PR #257 — `get_role_templates()` applied at the schema gate on a named approval) · AC2-5 **CLOSED** (W5, PR #256). Correction plan: [`anatomy-correction-plan-cor-b.md`](../hub-v2/anatomy-correction-plan-cor-b.md).

---

## Why this audit is a delta, not a repeat

The predecessor audit found the anatomy's headline deviation (Core authoring DS-3 cascades inline) and COR-A corrected it. This pass re-tested all seven ring invariants against current code and found **the rings themselves are conformant**. Every deviation below is a gap in *what the gates can catch*, not in what the code currently does.

That distinction matters for scheduling: nothing here is a live defect, and nothing here blocks an area. All of it is drift-insurance, and its value is highest *before* the next areas add DS surface.

## Verdict at a glance

| Invariant | Verdict |
|---|---|
| **R1 — outer ring, no DB→component** (ADR-U009) | **CLEAN, ungated.** Every client path is `fetch('/api/…')`. Only `app/farewell/page.tsx` and `lib/auth/AuthContext.tsx` import the browser client, both for auth/session — the use ADR-U009 permits. Held by convention, not by a test (AC2-3). |
| **R2 — no rule solely in `app/api/*`** (ADR-U038) | **CLEAN.** All 72 route files contain zero `.from(`/`.rpc(`; data access sits in `lib/*/queries.ts` over 100+ SECURITY DEFINER RPCs. Route-level 403s are SQLSTATE→HTTP mapping, i.e. presentation, per clause 1. |
| **R3 — surface never skips a service** | **CLEAN**, with one consistency item (AC2-4). |
| **R4 — core never reaches up except via lifecycle facts** (ADR-U047) | **CLEAN and gated — confirmed live.** The W3 gate passes against the `pg_proc` catalog (2026-07-22): *Core functions referencing DS-owned tables: 0*, and 0 of COR-A's ten relocation targets remain. `ds3_/ds5_/ds7_lifecycle_*` carry the crossings. |
| **R5 — DS graph acyclic, DS-7 a leaf** | **CLEAN, ungated.** No live DS→DS reference. The gate cannot see this class at all (AC2-1). |
| **R6 — notifications substrate** (ADR-U048) | **CLEAN.** Writes from every tier are obligation-fulfilment by ruling R-1; `notifications` is correctly outside `DS_TABLES`. |
| **R7 — five verticals** | **ALIGNED.** `lib/audit/`, `lib/observability/telemetry.ts`, consent substrate, export composite all present. |

**No Major or Minor code defect was found.** The register below is five gap findings.

---

## Deviation register

### AC2-1 · Major (latent) — DS↔DS crossings are structurally ungated

The W3 gate (`hub/tests/integration/platform/internal-api-conformance.test.ts`) asserts *"no **Core** function references a DS-owned table"*. Its exemption is a single flat set:

```ts
!DS_OWNED_ALLOWLIST.has(r.name) && !VERTICAL_COMPOSITION_ALLOWLIST.has(r.name)
```

`DS_OWNED_ALLOWLIST` merges the DS-3, DS-5 and DS-7 function lists, so membership exempts a function from the *entire* `DS_TABLES` check — not just from its own service's tables. A DS-5 function reading `public.journey_enrollments`, or anything reading `public.journal_entries`, stays green.

The anatomy's other inner-ring rule — *"dependency direction inside Domain is acyclic and explicit — DS-1 at the bottom, DS-7 at the top; nothing depends on DS-7"* ([`ARCHITECTURE_ANATOMY.md:66`](../../architecture/ARCHITECTURE_ANATOMY.md)) — therefore has **no mechanical enforcement whatsoever**, while its sibling rule has a permanent gate.

**Live state: clean.** Static scan of every current function body found no DS→DS reference. This is latent exposure, not an active deviation.

**Why it matters now:** the predecessor audit's own diagnosis was that the PC→DS crossing "grew pc013 → pc014 → pc015 precisely because no gate caught it". This is the same shape, one axis over, and the next DS areas are where it would grow.

**Correction direction:** make the allowlist per-service. Map each DS function to its owning service number; assert it references only its own service's tables, plus an explicit cross-service allowlist that encodes *direction* (DS-N may read DS-M only where M < N), each entry citing its contract.

---

### AC2-2 · Major (latent) — nothing binds `DS_TABLES` to the live catalog

`DS_TABLES` is a hand-maintained `as const` array of 14 names. All 14 are live (verified against the catalog, 2026-07-22) — but no assertion connects the list to reality in either direction:

- **A new DS-owned table ships ungated by default.** Nothing fails when a table is added and the array is not.
- **The list is maintained by prose.** Two entries carry `NAMED DEFERRAL` comments recording windows where the array deliberately lagged the schema (`forum_posts` at C-B, `announcements`/`content_reports` at C-D). The discipline worked because A-COM was attentive — that is exactly the assurance the predecessor audit's AC-9 flagged as residual.

Combined with AC2-1, the gate's coverage is defined entirely by two hand-edited lists with no completeness check on either.

**Correction direction:** a single checked-in **ownership manifest** (table → DS-N / PC-N / vertical, function → owning service) as the one source; the gate reads `DS_TABLES` and its allowlists from it; a test asserts the manifest covers every live `public.` table and that every manifest entry still exists. Adding a table then fails red until it is classified — the classification becomes the gate.

*The table→service map derived during this audit is the seed for that manifest — see Appendix A.*

---

### AC2-3 · Minor — the outer ring (ADR-U009) is prose-enforced

`route-policy-conformance.test.ts` (5/5 green) asserts runtime policy and auth-verb policy — not layering. No test asserts that browser-reachable code avoids direct table access.

Today the discipline holds, and the codebase is visibly conscious of it: `lib/account/client.ts`, `lib/consent/client.ts`, `lib/journal/client.ts` and `lib/profile/client.ts` each open with a comment stating the module is *"not a direct `supabase.from(...)` call (ADR-U009 / Hub CLAUDE.md narrow-exception rule)"*, and `components/profile/ProfileEditForm.tsx:23` carries the same note.

Five hand-written comments asserting a rule is precisely the condition the Groups retro (2026-07-06) created the route-policy gate to end: *"route policy that lived only in ADR prose drifted within one cycle."*

**Correction direction:** extend the static gate — no `'use client'` module and no file under `components/` may contain `.from(`/`.rpc(`, with a cited exception list for the realtime-subscription case ADR-U009 explicitly permits.

---

### AC2-4 · Minor — one surviving direct table read in the server lib

[`hub/lib/groups/queries.ts:179-183`](../../../hub/lib/groups/queries.ts) — `fetchRoleTemplates` reads `.from('role_templates')` directly. Every other data function in `lib/` goes through an RPC.

Not an enforcement hole: `role_templates` has RLS enabled with a policy, so no rule is BFF-only and ADR-U038 clause 1 is satisfied. It is a uniformity item — ADR-U038 tranche 2 relocated `get_member_groups()` for exactly this shape, and this one was not swept up.

**Correction direction:** a `get_role_templates()` RPC, **or** record it in the manifest as a deliberate exception citing its RLS policy. Either closes it; the second is legitimate.

---

### AC2-5 · Observation — the route inventory snapshot is stale

Predecessor Appendix A states *"Route inventory (52 files)"*; the live surface is **72**. The register elsewhere applies the pointer-not-snapshot rule; this appendix predates it.

**Correction direction:** replace with a pointer to a generated inventory, or drop the count.

---

## Verified clean — evidence for the regression record

| Check | Method | Result |
|---|---|---|
| PC→DS crossings at HEAD | **live `pg_proc` catalog** via the W3 gate | **0** — gate PASS (657 ms), 2026-07-22 |
| COR-A's ten relocation targets | W3 gate's relocation-target report | **0 remaining** — all ten relocated |
| Route-policy gate | `npx jest route-policy-conformance` | 5/5 pass |
| Route data access | 72/72 route files | zero `.from(`/`.rpc(` |
| Browser client imports | repo-wide | 2, both auth/session |
| DS-7 as leaf | inbound references to `journal_entries` | DS-7 functions + 1 cited vertical-composition entry |
| RLS coverage | live catalog | 32/32 tables RLS-enabled |
| `DS_TABLES` entries live | live catalog | 14/14 |
| `/api/v1` + Bearer absence | ADR-U038 clause 3 | compliant **by definition**, not a deviation |

## Method note

Two static-analysis traps were hit and corrected during this pass; both would have produced false findings:

1. **Drop-unaware migration parsing.** Concatenating 75 migrations surfaces functions and tables that later migrations drop — `_handle_stewardship_nomination_action` appeared to cross into DS-3 but is dead (dropped at `pc014:948`), and `direct_messages` appeared live but was dropped by the C-A migration.
2. **Comments read as code.** The ADR-U009 compliance notes in `lib/*/client.ts` contain the literal string `supabase.from('users')` inside prose asserting the opposite.

Any future automated pass over this substrate must strip comments and resolve drops against the live catalog. The gate's own `stripComments()` helper already does the first.

---

## Appendix A — Table ownership map (32 live tables, 2026-07-22)

Seed for the AC2-2 manifest. Ownership per ADR-U023, rulings R-1..R-3, and the gate's own `DS_TABLES`.

| Owner | Tables |
|---|---|
| **PC-2 Identity** | `users`, `pc2_config`, `reaper_runs`, `consent_records`, `consent_purposes` |
| **PC-3 Organisation** | `groups`, `group_memberships`, `group_roles`, `group_role_permissions`, `group_templates`, `group_template_roles`, `role_templates`, `role_template_permissions`, `user_group_roles`, `permissions`, `pending_email_invitations` |
| **PC-4 Governance** | `admin_audit_log` |
| **DS-3 Journeys** | `journeys`, `journey_steps`, `journey_step_instances`, `journey_enrollments`, `step_kinds`, `content_families` (R-3) |
| **DS-5 Communication** | `conversations`, `messages`, `conversation_participants`, `conversation_kinds`, `forum_posts`, `announcements`, `content_reports` |
| **DS-7 Intelligence** | `journal_entries` |
| **Notifications vertical** | `notifications` (R-1 / ADR-U048 — deliberately outside `DS_TABLES`) |

DS-1, DS-2, DS-4 and DS-6 hold no tables yet.
