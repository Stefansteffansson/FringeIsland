# i18n key-externalisation — dated deferral to the Eid design-system activation

---
id: TASK-I18N-01
title: i18n externalisation (ADR-U013) — deferred to the Eid design-system activation point; land the key-based layer before retrofit surface grows further
status: todo
assigned_to: claude
priority: medium
feature: none  # deferral record + future retrofit tranche — not a Ferd FEAT build
owner: design-system
wave: eid
cycle: unscheduled — first design-system tranche of Eid (the R-6 activation point)
depends_on: []
estimated_hours: 24
---

## Description

**This file is the dated deferral Audit III found missing (AC3-6).** ADR-U013 (Accepted) requires all user-facing strings externalised to translation files from day one; at HEAD the Hub ships zero i18n infrastructure across 20 pages / 54 components, and no deferral was recorded anywhere in `docs/planning/` — silently missing, not deferred, which made it a Major finding rather than a cited Observation.

Ruling R-6 (Stefan, 2026-07-31, the COR-C W4 rulings board) activated the design-system tier with a scoped activation and chose for i18n specifically: **defer, dated, naming the activation point.** The key-based layer lands at the **Eid-wave design-system activation**, as the first design-system tranche of that wave.

Deliberately NOT deferred by the same ruling (binds today): WCAG a11y on shipped primitives (COR-C W5) and the design-token layer (COR-C W6).

## Acceptance criteria

- [ ] Key-based i18n layer (library choice, `t()` convention, locale-file layout) lands as the first Eid design-system tranche
- [ ] `components/ui/` primitives externalised first (the seed), then feature components tranche-wise
- [ ] ADR-U013's 3–5× retrofit-cost estimate re-evaluated against actual surface size at Eid open (54 components at deferral time, 2026-07-31 — measure the growth)
- [ ] Audit III AC3-6 annotated CLOSED in `docs/planning/reference/ANATOMY-CONFORMANCE-AUDIT-3.md` when the first tranche lands

## Verification

`docs/design-system/CLAUDE.md` links here (both the activation paragraph and the current-state line); Audit III AC3-6 downgrades to a cited Observation on this file's existence; doc-health-check's parked/deferred sweep sees a dated, owned deferral with a named landing point.
