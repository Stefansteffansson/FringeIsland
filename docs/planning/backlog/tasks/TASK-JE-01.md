# PD006 schema + contracts migration — designation, the Mist-scoped gate, and the first-arrival read

---
id: TASK-JE-01
title: PD006 schema + contracts migration (designation flag, Mist-scoped enroll_self_in_journey, get_onboarding_status)
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD006
owner: platform/domain/journeys
wave: ferd
cycle: J-E
depends_on: []
estimated_hours: 6
---

## Description

Author the FEAT-PD006 schema-gate migration realizing STORY-1/2/3, red-first:

1. **Schema (2 additive columns on `journeys`):** `is_onboarding_designated boolean NOT NULL DEFAULT false` with a **partial unique index** `WHERE is_onboarding_designated` (single-designation lives in the database — do NOT also enforce it in application code); nullable `takeaway jsonb` (tagged `pending-DS-4` in the migration comment).
2. **Replace `enroll_self_in_journey(p_journey_id)` in place** (the ADR-U045 disposition tagged in the PD003 migration). New identity gate: FIM enrols in any published journey (both gates, unchanged); a Mist enrols **iff** the journey is the designated onboarding journey — on that branch the `has_permission` gate is bypassed (the designation *is* the authorization); a Mist on any other journey gets `42501`. Duplicate refusal, reactivation semantics, `status='active'`, personal-group party all unchanged.
3. **`get_onboarding_status() → jsonb`** — `{onboarding_journey_id, has_enrollment, has_completed}`; `onboarding_journey_id` null-safe when nothing is designated; `has_enrollment` counts ANY enrolment regardless of status; Mist-callable (grant to `authenticated`); actorless session → `42501`, never a silent empty.

## Acceptance criteria

- [ ] Migration file exists under `supabase/migrations/` (one migration; the seed is TASK-JE-02) with RLS/grant impact stated in comments
- [ ] Integration tests for every STORY-1/2/3 criterion were demonstrated **red first** (captured), then green after apply
- [ ] Adversarial tests: a Mist cannot ride the bypass onto a non-onboarding journey; direct PostgREST INSERT into `journey_enrollments` and direct `is_onboarding_designated` UPDATE are refused (ADR-U038 direct-caller question)
- [ ] Second-designation write refused by the unique index
- [ ] FIM path regression-free (existing journeys suites stay green)
- [ ] Task ends at **`review`**, not `done` — schema gate (fuller-auto carve-out: PR held for Stefan's nod with red-test evidence + apply commands in the body)

## Technical notes

- Latest `enroll_self_in_journey` body: `supabase/migrations/20260707213500_feat_pd003_amendment_reenrol_reactivation.sql` (the re-enrol amendment is the latest-wins definition; the `is_temporary` guard is comment-tagged for this replacement). Preserve reactivation + duplicate semantics verbatim; change only the identity gate.
- SECURITY DEFINER + `SET search_path = ''`, house grant pattern (`GRANT EXECUTE … TO authenticated`, revoke from `anon`/`public`) — copy from PD002/PD003 migrations.
- `get_current_personal_group_id()` (PC-3) resolves the party; `is_enrolled_in_journey` (PD002) backs `has_enrollment` (no status filter).
- Apply workflow (platform CLAUDE.md): `bash supabase-cli.sh migration new …` → edit → `node scripts/apply-migration-temp.js <file>` → `bash supabase-cli.sh migration repair --status applied <ts>`. If the apply is permission-denied in this autonomous session, ship the PR held at the gate with the red tests + apply commands (standing rule).

## Verification

`npm run test:integration:journeys` (red before apply, green after); full `npm run test:integration` sweep before the PR.
