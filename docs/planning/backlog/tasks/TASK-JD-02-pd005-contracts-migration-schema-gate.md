# PD005 contracts migration — group progress, sharing consent, freeze surfacing (schema gate)

---
id: TASK-JD-02
title: PD005 contracts migration (schema gate)
status: todo
assigned_to: Claude (lead)
priority: high
feature: FEAT-PD005
owner: platform/domain/journeys
wave: ferd
cycle: J-D
depends_on: [TASK-JD-01]
estimated_hours: 4
---

## Description
Author migration `<timestamp>_feat_pd005_group_progress_sharing_frozen_contracts.sql`: `get_group_journey_progress` + `set_journey_progress_sharing` (new SECURITY DEFINER, `search_path=''`, four-hop actor chain), the additive `get_player_state` re-issue (`freeze`, `progress_sharing`), the Q9 read-standing loosening (reads only), and the `view_group_progress` permission seed + Steward/Guide template wiring. **No new tables/columns/RLS.** Hold at the schema gate.

## Acceptance criteria
- [ ] Gate PR body: the Q1–Q9 board with defaults + reasoning, dev pre-check evidence (live frozen-enrolment counts by reason, consent purposes in flight, permission-catalog state), red-suite summary, apply commands (`node scripts/apply-migration-temp.js` + `supabase-cli.sh migration repair`).
- [ ] Status set to `review` at the gate — apply only on Stefan's nod (never bypass; autonomous-session rule).
- [ ] Post-nod: applied + repaired; suite green; any post-apply failures diagnosed honestly (adaptations labelled, never silent).
- [ ] Q8 disposition (closed-vs-archived asymmetry) recorded on the gate PR with the STORY-1 evidence.
- [ ] Full integration sweep green; sibling adaptations (if any) labelled to the loosening story per the paired-suite budget.

## Technical notes
Direct-caller question (ADR-U038) answered in the PR body for both new functions. Consent purpose `journey_progress_visibility` with `capture_context.enrollment_id`; latest-record-wins reduction (`DISTINCT ON` per subject). Permission seed lands in `supabase/seeds/01_permissions.sql` + template wiring — remember seeds are part of live state (seeds-directory discipline).

## Verification
`npm run test:integration:journeys` fully green post-apply; `npm run test:integration` sweep green; `supabase-cli.sh migration list` shows applied.
