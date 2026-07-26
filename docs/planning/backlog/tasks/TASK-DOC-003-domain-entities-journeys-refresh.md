# DOMAIN_ENTITIES.md — the Journeys substrate is missing

---
id: TASK-DOC-003
title: Refresh DOMAIN_ENTITIES.md with the ADR-U044/U046 Journeys substrate
status: done
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

- [x] The Journey entity section describes the step substrate (steps as rows, the open kind/family registries, instances as the lived record) at the entity level — pointers to ADR-U044/U046 and the DS-3 spec, not a schema dump
- [x] The response payload is named as personal data with its privacy posture (private-only, erased with the enrolment cascade, exported under right-of-access)
- [x] A "reflects decisions through" style freshness marker or equivalent pointer discipline is considered (mirror the ARCHITECTURE_ANATOMY.md pattern) so this doc stops rotting silently

## Verification

Doc-health Section 2 clean on the next run; a reader landing from the CLAUDE.md document map gets a current entity picture.

## Outcome — DONE 2026-07-26 (A-NTF area gate, merged pass with TASK-DOC-005)

**The finding was worse than filed, and that changed the fix.** This task described the step substrate as *missing*. It was not merely missing — the Journey section **actively asserted the superseded model**: a "Content Structure (JSONB Schema)" block presenting `content.steps[]` with the sealed `content | activity | assessment` union as the live shape. ADR-U044 converted exactly that into rows and **nulls `content` on every converted journey**, and the sealed union is what ADR-U018's no-sealed-vocabularies rule forbids. A reader arriving from the root `CLAUDE.md` document map was being confidently misinformed, not left short — which is the failure mode this doc's own triage ("agent orientation, so wrong costs more than missing") was worried about.

Delivered in `docs/architecture/DOMAIN_ENTITIES.md`:

- **Freshness marker** at the head, mirroring `ARCHITECTURE_ANATOMY.md`: a `Status: derived — canon wins` line, a `Reflects decisions through: ADR-U046` stamp, and an explicit **freshness caveat** naming the areas (Communication, Notifications) whose detail this file does not carry, plus `supabase/migrations/` as the schema of record. The caveat is deliberate: without it the stamp would imply whole-tree currency this Ferd-era doc does not have.
- **Step substrate** as a three-row table at entity grain — `journey_steps` (the single-beat node), `step_kinds` / `content_families` (**open registries, not enums**), `journey_step_instances` (the lived record, grained enrolment × traveller personal group × step). Pointers to U044/U046/U008/U018 and the DS-3 spec; no schema dump.
- **The response payload named as the most personal data in the system**, with all three posture facts: private by default (DS-3 invariants 4 + 8, *share your garden without sharing your journal*), **contract-only** (RLS enabled, zero policies, zero grants — a direct PostgREST caller including a Mist holding `authenticated` can neither read nor write it, ADR-U038), erased with the enrolment cascade (U031), exported under right-of-access.
- **The legacy JSONB block retained but demoted** — relabelled "legacy, pre-ADR-U044", trimmed, and captioned *"Do not build against this shape."* Kept rather than deleted so an unconverted row stays recognisable.
- Supporting fixes so the section doesn't contradict itself: `content` flagged legacy in Properties, `sequencing_mode` added (verified real — `20260707190000` L150), `steps` and `step_instances` added to Relationships, the Overview entity line updated, and the worked Example corrected from `content: {steps: [...]}` to `content: null`.

**Verification:** every substrate claim read off `20260707190000_feat_pd003_step_substrate_progress_contracts.sql` and `20260718090000_feat_pd007_response_substrate.sql` rather than from the ADRs' prose. **Four of six ADR filenames I first wrote were wrong** (U008, U018, U031, U046 all differ from the obvious slug) — caught by a link check before commit; all eight relative links now verified to resolve.
