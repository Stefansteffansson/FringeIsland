# Session bridge — ADM-F decomposed: FEAT-PC025 + FEAT-H040 at 4-ready, cycle tasks slotted; next step is the TASK-ADMF-01 build to the held schema gate

**Date:** 2026-08-04 (session 6) · **Wave:** Ferd · **Cycle:** ADM-F (decomposition done; build next)
**Follows:** [`2026-08-04_01_-_ADME-WALK-CLOSED-ADMF-DOSSIER-READY.md`](./2026-08-04_01_-_ADME-WALK-CLOSED-ADMF-DOSSIER-READY.md)

---

## READ THIS FIRST — the paired specs are 4-ready; start at TASK-ADMF-01

1. **The ADM-F decomposition is committed:** [FEAT-PC025](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) ↔ [FEAT-H040](../../products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md), both 4-ready, payload walk in PC025; cycle tasks [TASK-ADMF-01](../backlog/tasks/TASK-ADMF-01-pc025-role-template-editing-contracts.md) (platform, first) and [TASK-ADMF-02](../backlog/tasks/TASK-ADMF-02-h040-role-template-editor.md) (surface, depends on 01; H039 tranche pattern if the apply is pending). Both feature READMEs + both L4 summaries advanced in the same commit.
2. **Dossier caveats (a) and (d) discharged live at spec time (2026-08-04):** the catalogue is **48 on the live DB** (counted); the composition is **all-seeds** — every group template references exactly the 4 seeded role templates, Member the default everywhere. No migrations landed after `20260803210000`, so the dossier's file:line facts stand unre-verified.
3. **The build's one PR-hold:** TASK-ADMF-01's migration holds at the schema gate with red evidence + apply commands for **named** approval (standing rule). Everything else in the cycle is fuller-auto.

## L4 derivation calls made this session (within RB-4/RB-5's frame — recorded so the build doesn't re-derive)

- **Versioning shape:** `role_template_versions` (+ junction) is an append-only ledger; `role_templates.default_version_id` is the pointer; **apply materialises the version onto the live rows** (`role_templates` + `role_template_permissions`) that the untouched instantiation physics already read. Zero changes to `create_engagement_group` / `copy_template_permissions` — snapshot-now holds by construction, and rollback = repoint through the same door.
- **The protected set is a code-owned flag:** `permissions.is_protected` (seed/migration-set, editor renders never writes); membership settled at build against the live catalogue per the spec's criteria (the governance-plane family + `rest_group`).
- **Guard predicate + honesty:** an apply refuses typed if it strips a protected permission's last holder on any instantiation path; with the all-seeds composition and seed immutability this is **structurally unreachable in Ferd** — the guard is the invariant's contract-level home for Eid's re-opens, and its red-first cell builds a synthetic composition under the service role.
- **The clone's two consequences are contract-pinned, not just copy:** a clone appears in `get_role_templates()` (member group-creation options) **and rides every template-less instantiation** (the EVERY-role-template path) — STORY-2 pins both; the Hub ceremony names both.
- **Seeds:** backfilled as version 1 (history starts honest), pointer frozen there; no delete doors for templates or versions anywhere.
- **WA-2 folds in the PC024-recorded message-drift settle:** the `admin_get_audit_log` re-issue takes `'platform administrator required'` along with the symmetric target resolution (the "own tiny separate decision" arrived with the re-issue).
- **WA-4 copies `revoke_own_session`'s emission inline** (one hint per session id per target, non-fatal wrap); `ds5_emit_hint` deliberately not reused (trigger-path-only per its own comment).

## The sequence after ADM-F (unchanged)

ADM-G (WF-2, suspended-groups-only admin access) → N-E (WF-1 bell-answerable invitations + the polish rider) → AB-6 (the FULL audit, Phase-4 cutover's entry condition).

## Standing items (unchanged from `2026-08-04_01`)

TASK-E2E-02 (consented-fixture leak, 1,289 measured — purge decision is Stefan's; census size underpins pagination-test expectations) · TASK-E2E-01 (profile.spec flake, ~2 h fix due at a boundary) · the deferred Eid piles.

## Close ritual (this session)

- [x] Both specs + tasks + index/summary rows + this bridge in one PR (fuller-auto; no schema, no ADR, no steering files)
- [x] Discovery synced after merge
- [ ] No doc-health run owed (no cross-cutting change; cycle boundary not reached)
