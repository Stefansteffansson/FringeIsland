---
id: TASK-DBT-03
title: The role-template-editing suite can leak its clone catalog rows — and a leaked offered clone is permanent by design
status: todo
assigned_to: unassigned
priority: low
feature: none (test-infra debt; touches tests/integration/admin/role-template-editing.test.ts fixtures)
owner: hub (test tier)
wave: unassigned
cycle: none — found by Stefan on the production admin view, 2026-08-19
depends_on: []
estimated_hours: small
---

# TASK-DBT-03 — PC025 suite teardown leak

**Found (Stefan, 2026-08-19, on `fringe-island.vercel.app/admin/roles` — the one shared DB):** one leaked test run, tag `pc025xmsq8d0lb`: a "Steward Clone" role template (3 versions, 1 publication) and a "synthetic gt" group template survived their suite.

**Disposition executed 2026-08-19 (RULED: full cleanup):** the clone was walked through the house contracts — retire ✓, unpublish (already historical), **hard delete REFUSED by RD-4a as designed** ("this role template was offered to groups and cannot be deleted" — the was-offered record is permanent). End state: the clone sits retired, invisible to offering flows, one historical row forever. The synthetic group template was removed data-level (symmetric with its creation). Elevation used the suites' makePlatformAdmin pattern and was demoted immediately (verified 0 rows).

**The debt (two parts):**
1. **Teardown:** the PC025/RD-* admin suites' afterAll must retire + unpublish + delete their clones (and delete synthetic group templates) even on mid-run failure — note the sharpened stake: a clone that a test OFFERS becomes permanently undeletable on leak, so every leaked run adds a forever-row to the production catalog.
2. **Audit checklist:** the debris-audit sweep (users/groups/content) must include the governance catalogs — `role_templates` (is_system=false), `role_template_versions/publications`, `group_templates` beyond the seeded four — the classes this find proved the standard sweep misses.
