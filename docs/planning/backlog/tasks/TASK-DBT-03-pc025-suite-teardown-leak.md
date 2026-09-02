---
id: TASK-DBT-03
title: The role-template-editing suite can leak its clone catalog rows — and a leaked offered clone is permanent by design
status: done
assigned_to: claude (2026-09-02)
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

---

## Disposition — built 2026-09-02 (both parts; no schema; fuller-auto)

**Why the 2026-08-19 run leaked, read from the code:** `role_templates` has no delete trigger and every child (`role_template_versions`, `role_template_publications`, `role_template_permissions`, `group_template_roles`) cascades, so the old afterAll's data-level `DELETE` would have succeeded had it run. It did not: the run died mid-cell (3 versions = between S5's v3 and v4; the synthetic gt still linked), and an afterAll that never runs cleans nothing. Its three latent defects were real regardless: it only knew rows whose id a cell had captured, it hard-deleted a house-created clone data-level, and every step sat behind `.catch(() => undefined)`.

**Part 1 — the suite's afterAll** (`hub/tests/integration/admin/role-template-editing.test.ts`): every class is found **by run token** (a cell that dies before its `push` still gets cleaned); the run's groups go first (RD-4a's last clause refuses while a copy survives); synthetic group templates go data-level (symmetric with their creation); the clone walks **retire → unpublish → delete through the house contracts** as the elevated DeusEx fixture — the offer was a data-level platform-wide INSERT with no `role_template.publish` audit row, so after the house unpublish the house delete is permitted and nothing needs a bypass; each step reports its own failure **by name** (`[pc025-teardown] <step> failed: …`); what is left is counted by class and said out loud (not thrown — the `cleanupTestGroup` posture); demotion and account cleanup come last and are each guarded. **Labelled honestly: hardening, not red-first** — there is no cheap failing test for "the process died"; the evidence is the runs below.

**Part 2 — the global sweep** (`hub/tests/integration/global-teardown.ts`, extended not forked): the residue read gains four **fixture classes** (non-system role templates by the run-token name convention, their versions and publications, non-seeded convention-named group templates — swept and blamed on a suite) and three **note classes** (non-system role templates and group templates *outside* the convention, publications of seeded templates whose publisher no longer exists — reported once per run as a `Catalog note`, never swept, never in the residue sum so a hand-made production template cannot make "STILL PRESENT" permanent). The catalog has no structural fixture marker, so the discriminator is the convention the suites already carry — `^(pc0[0-9]{2}x[0-9a-z]+|RD-A|RDB)( |$)` — the same species of rule as `test-%@fringeisland.test`. The sweep deletes convention-named templates **only with no surviving adopter** (RD-4a's one structural reason, kept; its audit-trail clause is moot because the same sweep clears the trails), after the group deletes, children cascading. Exported for the suite: `read`, `sweepGovernanceCatalogs`, `FIXTURE_CATALOG_NAME_RE`, `SEEDED_GROUP_TEMPLATE_NAMES` (the four by the names production carries today: Small Team / Large Group / Organization / Learning Cohort — `group_templates.is_system` is false on all four, verified).

**Red-first evidence:** `hub/tests/integration/platform/integration-teardown-governance-catalogs.test.ts` reproduces the leaked shape data-level (clone + version + platform-wide publication + linked synthetic gt), plus an *adopted* template (a real personal group carrying a copy) and a *hand-made* control outside the convention. Red at head 3/3 for the stated reasons (`read is not a function`, `sweepGovernanceCatalogs is not a function`, the regex undefined) — and the head teardown printed **"Clean"** over that run, the blind spot in one line. Green 3/3 after: the read counts all four classes and the note; the sweep removes the leaked rows and their children, leaves the adopted and the hand-made ones standing; the convention is evaluated **in Postgres** against every shape the four catalog-writing suites use, the seeded names, and a near-miss.

**Runs:** editing suite full **17/17** (52 s), no `[pc025-teardown] … failed` line, the clone gone through the house path; DB after: 0 non-system templates, 0 extra group templates, 0 run groups, 0 publications. Lint 0; `tsc --noEmit` 0 errors in the three touched files (the test tree carries ~1 100 pre-existing type errors ts-jest never sees — found, not caused, untouched).

**Stated plainly:** the 2026-08-19 scar row (`pc025xmsq8d0lb Steward Clone`, retired, RD-4a-refused) matched the convention with no adopter and was **removed by the sweep during this session's green run**. It was the accepted leftover of a ruled full cleanup, not a wanted row; the sweep finishing that cleanup is the intended behaviour, stated here so nobody looks for it.
