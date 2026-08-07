# PC028 corrective — widen admin_get_role_template_detail with reach and retirement

---
id: TASK-RDB-04
title: FEAT-PC028 STORY-8 (corrective) — admin_get_role_template_detail carries publications[] and retired_at
status: done
assigned_to: claude
priority: high
feature: FEAT-PC028
owner: platform/core/governance
wave: ferd
cycle: RD-B
depends_on: []
estimated_hours: 1
---

## Description

**A corrective, not new scope.** FEAT-PC028 reached `6-done` with a payload-walk
commitment unbuilt. FEAT-H044's payload walk recorded, and both specs still stated,
that `admin_get_role_template_detail` would be widened to carry publication rows
"rather than adding a fourth read". The widening was never written into
`20260807090000`, and PC028's own stories never carried it — the commitment lived
only in the **consumer's** walk, so there was nothing in the **provider's** scope to
build it from.

Found at the start of the Hub half, when FEAT-H044 STORY-3's reach section had no
server key to read. **Two** keys were missing, not one: `retired_at` was never on the
detail read either, though RD-A added it to the list read — so STORY-3's "publish is
unavailable, and here is why" had nothing to branch on.

**HELD AT THE SCHEMA GATE.** The migration is written and red-proven; it is not applied.

## Verification performed before writing the corrective

Three ways, in increasing order of authority:

1. `20260807090000` does not mention the function (grep, 0 hits).
2. No later migration re-issues it — the only definition is ADM-F's `20260804190000:254`.
3. **The live catalogue**: `pg_get_functiondef` contains neither
   `role_template_publications` nor `retired_at` (2026-08-07, `deflen` 1971).

## Acceptance criteria

- [x] Migration `20260807140000` re-issues the function with a **byte-identical
      signature** (COR-A pattern — create-or-replace preserves the ACL; no grant restated)
- [x] Adds `publications[]` — `{group_id, group_name, published_at}`, `group_id` NULL =
      platform-wide, sorted first
- [x] Adds `template.retired_at`, present whether retired or not
- [x] No new table, no new grant, no RLS change — `role_template_publications` already
      carries RLS with zero write grants from `20260807090000`
- [x] Migration header names sibling assertions invalidated: **none**, grepped not assumed
- [x] Integration cells C1–C5 demonstrated **red** against the live stack
      (`publications` undefined, `retired_at` absent); C6 labelled green-before-and-after
- [x] **Applied on a named approval** (*"ok apply the RD-B corrective migration"*, 2026-08-07), then C1–C6 green — C1–C5 went red → green, C6 stayed green
- [x] `FEAT-PC028` returned to `6-done`; §L4 rows and `features/README.md` follow

## Post-apply verification (2026-08-07)

Against the **live catalogue**, not the migration file:

| Check | Result |
|---|---|
| `publications` in the function body | present |
| `retired_at` in the function body | present |
| Signature | `p_template_id uuid` — byte-identical |
| SECURITY DEFINER / volatility | `true` / `STABLE` — unchanged |
| ACL (the COR-A claim) | `anon` **denied**, `authenticated` + `service_role` allowed — preserved by create-or-replace, no grant restated |
| Definition length | 1971 → 3378 bytes |

Corrective cells: **6/6 green** (C1–C5 red → green; C6 green on both sides by design).

## Apply commands

```bash
node scripts/apply-migration-temp.js 20260807140000_rd_b_pc028_corrective_widen_admin_role_template_detail.sql
bash supabase-cli.sh migration repair --status applied 20260807140000
bash supabase-cli.sh migration list
```

Then:

```bash
cd hub && npx jest tests/integration/groups/role-publication-and-diff.test.ts --runInBand -t "CORRECTIVE"
```

## Verification

```
npm run test:integration:groups
npm run test:integration:admin
npm run lint && npm run build
```

## Why this class of miss is worth a process note

A cross-spec commitment recorded **only** in the consumer's payload walk has no home to
be built from. The walk is what *finds* the gap; the provider's stories are what *close*
it. This one survived the build, the schema gate, a full green suite, and a doc-health
run — because every one of those checks reads the provider's stories, and the provider's
stories never mentioned it. Registered for the RD-B walk and the cycle retrospective.
