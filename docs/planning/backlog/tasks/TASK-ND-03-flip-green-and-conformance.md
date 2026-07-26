# Flip green + conformance — N-D platform half

---
id: TASK-ND-03
title: Flip the FEAT-PD016 suite green, run the conformance gate, record every adaptation honestly
status: done
assigned_to: claude
priority: high
feature: FEAT-PD016
owner: platform/domain/communication
wave: ferd
cycle: N-D
depends_on: [TASK-ND-02]
estimated_hours: 2
---

## Description

Flip TASK-ND-01's suite green against the applied migration, then run the conformance gate and the notifications integration slice.

**Adaptations get labelled, not laundered.** The N-C precedent: two "payload exactly" assertions had mis-modeled the storage envelope and were adapted as *labelled* adaptations with the invariant kept exact. Any assertion changed after apply must say what it mis-modelled and why the new form is not weaker. An adaptation that loosens a guard without naming what changed is worse than a red.

## Acceptance criteria

- [ ] Full FEAT-PD016 slice green; red→green delta reconciled against TASK-ND-01's recorded red count.
- [ ] Any post-apply assertion change is labelled with what it mis-modelled; none is a silent loosening.
- [ ] Route-policy conformance test green (no `runtime`/`preferredRegion` exports; the ADR-U037 identity split intact).
- [ ] `next build` clean — the type gate. ts-jest and eslint do not full-type-check.
- [ ] The whole notifications integration slice green, not just the new file.
- [ ] Assertions verified against the *applied* objects (`pg_policies`, `pg_proc.prosrc`, `pg_trigger`) rather than trusting the migration text — the N-C initplan-regex false negative.

## Verification

`cd hub && npx jest --selectProjects integration --testPathPatterns notification` green; `npx next build` clean.

## Outcome (2026-07-26)

Green with **zero migration edits after the first correction**, and no assertion loosened. Full sweep **690/690** (56 suites) — reconciles exactly against the 666/55 baseline: +24 tests, +1 suite, nothing else disturbed.

**Two conformance gates failed on the first sweep, both caused by this cycle** and both classification misses rather than defects: the two new tables were unclassified in `supabase/ownership.manifest.json`, and `functionOwner()` defaults to `CORE`, so the operator contracts read as CORE functions touching `ds5_config` (DS-5) — flagged `core-to-domain`. Fixed by classifying; `notification_preferences` deliberately DS-5 rather than `vertical:notifications` so it lands in `dsTables()` and **is policed** by that gate. Also closed N-C's filed manifest finding (1 of 5 DS-5 trigger functions listed; `ds5_emit_hint` absent).
