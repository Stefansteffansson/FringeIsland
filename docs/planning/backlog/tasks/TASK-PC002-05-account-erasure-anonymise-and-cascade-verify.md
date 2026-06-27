---
id: TASK-PC002-05
title: FIM account-erasure anonymise-vs-retain path + cascade-spec verification
status: review
assigned_to: Claude
priority: medium
feature: FEAT-PC002
owner: platform/core/identity
wave: ferd
cycle: IDN-2
depends_on: [TASK-PC002-03, TASK-PC002-04]
estimated_hours: 3
---

# TASK-PC002-05: FIM account-erasure anonymise-vs-retain + cascade verification

## Description

FEAT-PC002 STORY-5 criterion 4 + the DoR/cascade half of STORY-4 (ADR-U034 §5).
The reaper's hard-delete cascade applies **only pre-transcendence**. A
**post-transcendence** FIM's right-to-erasure is a **distinct path** that must
reconcile erasure against the legal duty to retain proof-of-consent: anonymise the
consent subject link, retain the consent event. Also the final cascade-spec
verification beat (ADR-U016 DoR) before the feature reaches `6-done`.

Status `review`: schema-touching (anonymise path) behind the schema-review gate.

## Acceptance criteria

- [x] FIM account-level erasure (distinct from the reaper) **anonymises the consent
      subject link and retains the consent event** as proof — not hard-deleted.
- [x] Both ADR-U016 cascade specs (Mist erasure; Mist→FIM transcendence) are
      verified to document the effect at every layer (PC-2, PC-3, each vertical) —
      already drafted in FEAT-PC002 §"Cascade specification"; this confirms they
      match the shipped substrate.
- [x] The reaper↔consent boundary is verified collision-free (reaper touches only
      pre-transcendence rows; consent exists only post-transcendence).

## Technical notes

- Privacy-vertical adjudication finalises the anonymise-vs-retain detail named in
  ADR-U034 §5 / FEAT-PC002 §"Resolved spec questions" item 3.
- Do not conflate with the reaper's pre-transcendence hard-delete cascade.
- This task closes the feature: on green, FEAT-PC002 → `6-done` (+ identity §L4
  row) in the same commit, pending schema review.

## Verification

- Integration tests: account-erasure anonymises the subject link, consent row
  retained. Cascade-spec review checklist complete. Red-first.

## Implementation notes (2026-06-27)

**Migration:** `supabase/migrations/20260627120000_feat_pc002_fim_account_erasure.sql`
— `public.erase_fim_account(uuid)` (SECURITY DEFINER, `search_path = ''`).
Applied to dev DB + repaired. **Schema-review gate: at `review`, not `done`.**

**Design (ADR-U034 §5 anonymise-vs-retain, finalised this session):**
1. Admin-gated (`manage_all_groups`, mirrors `admin_hard_delete_user`) — GDPR
   account-erasure is an admin/ops action; a Hub self-service "delete my account"
   affordance, if ever, routes through this same privileged path (forward seam).
2. Boundary guard: refuses a Mist (`is_temporary = true`) → `42501`. Pre-transcendence
   rows are the reaper's / `explicit_erase_mist`'s and hold no consent — so the two
   erasure paths can never touch the same row (**collision-free**, crit-3).
3. Anonymise-then-retain: under `app.consent_erasure_in_progress` (the only
   sanctioned bypass of `enforce_consent_append_only`), NULLs `subject_user_id` /
   `subject_group_id`; the consent **event** (purpose / policy_version / captured_at)
   is **retained** as GDPR proof. The consent FK `ON DELETE RESTRICT` structurally
   forces anonymise-first.
4. Delegates teardown to the existing `admin_hard_delete_user` (sentinel
   reassignment + cascade) — **reused as-is, no Platform Core change**.

**Tests (red-first):** `hub/tests/integration/auth/fim-account-erasure.test.ts` —
4 tests, 4 green. Demonstrated red first (function-missing `PGRST202`; the deny /
boundary tests assert the specific `42501` so a missing function is a genuine red,
never a pass-at-red). The 4th is labelled **characterization (test-after)**: proves
the consent FK `RESTRICT` blocks a raw hard-delete (`23503`) — *why* anonymise-first
is required; already true from the consent migration, regression-locked here.
A platform admin is built per-suite via `runAdminSql` (active DeusEx member + DeusEx
role); the dev DB's one founding DeusEx member keeps the last-member guard satisfied
at teardown.

**Cascade-spec verification (crit-2 / STORY-4 DoR):** both FEAT-PC002
§"Cascade specification" tables verified against the shipped substrate —
Mist erasure (`_erase_mist` / reaper / `explicit_erase_mist`) and Mist→FIM
transcendence (`finalise_transcendence`) match at every layer. The transcendence
cascade's Privacy row ("account-erasure becomes retention-bound") is now **realised**
by `erase_fim_account`. No discrepancy found.

**Closes the build of FEAT-PC002** (all 5 stories built, all 5 tasks green). The
feature flips `5-in-cycle → 6-done` (+ identity §L4 row + §L3 latent→shipped cell)
**after** Stefan clears the schema-review gate for the PC002 migration set — pending,
not auto-flipped.
