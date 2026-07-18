# DOMAIN_ENTITIES.md — the Journeys substrate is missing

---
id: TASK-DOC-003
title: Refresh DOMAIN_ENTITIES.md with the ADR-U044/U046 Journeys substrate
status: todo
assigned_to: claude
priority: medium
feature: none
owner: architecture
wave: ferd
cycle: none
depends_on: []
estimated_hours: 2
---

## Description

Doc-health finding (J-F cycle close, 2026-07-18, Section 2): `docs/architecture/DOMAIN_ENTITIES.md` presents itself as the active inventory of core business entities (and is linked from the root `CLAUDE.md` document map), but carries **no mention of the step substrate** — `journey_steps`, `step_kinds`/`content_families` (the ADR-U044 registries), or `journey_step_instances` (the per-traveller progress grain, which since FEAT-PD007 also holds `response` — the most personal data in the system). The doc lags the Journeys area by five shipped cycles (J-B..J-F). Found (not caused) at J-F: the gap predates this cycle; J-F deepened its weight by adding a new personal-data category to an unlisted table.

## Acceptance criteria

- [ ] The Journey entity section describes the step substrate (steps as rows, the open kind/family registries, instances as the lived record) at the entity level — pointers to ADR-U044/U046 and the DS-3 spec, not a schema dump
- [ ] The response payload is named as personal data with its privacy posture (private-only, erased with the enrolment cascade, exported under right-of-access)
- [ ] A "reflects decisions through" style freshness marker or equivalent pointer discipline is considered (mirror the ARCHITECTURE_ANATOMY.md pattern) so this doc stops rotting silently

## Verification

Doc-health Section 2 clean on the next run; a reader landing from the CLAUDE.md document map gets a current entity picture.
