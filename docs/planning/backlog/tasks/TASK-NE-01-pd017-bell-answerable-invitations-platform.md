# Build FEAT-PD017 — armed dispatch + typed response + all-doors convergence (one schema gate)

---
id: TASK-NE-01
title: Build FEAT-PD017 — arm invitation_received, respond_to_personal_invitation, the group_memberships convergence trigger + backfill, red-first, held at the schema gate
status: in_progress
assigned_to: Claude
priority: high
feature: FEAT-PD017
owner: platform/domain/communication
wave: ferd
cycle: N-E
depends_on: []
estimated_hours: 5
---

## Description

The platform half of Cycle N-E, per [FEAT-PD017](../../../platform/domain/features/FEAT-PD017-bell-answerable-personal-invitations.md). One migration carrying: the `notify_invitation_received` re-issue (personal branch gains `action_type='accept_decline'` + `action_data={membership_id, group_id, group_name, inviter_name}`; acting branch byte-identical), the `dispatch_segment='invitation-response'` registration (self-verifying DML, the 20260731140000 pattern), the thin `respond_to_personal_invitation(p_notification_id, p_accept)` composing the untouched Core `accept_group_invitation`/`decline_group_invitation` (mirrors `respond_to_acting_invitation`'s shape incl. the P0002 converge-idempotent backstop), the **additive** convergence trigger function `converge_invitation_notifications()` on `group_memberships` (AFTER UPDATE from `invited` + AFTER DELETE of `invited` — beside the existing `notify_invitation_accepted`/`notify_invitation_declined_or_member_change` triggers, which are not touched), and the backfill arming standing pending invitations. Red-first; the PR holds at the schema gate with red evidence + apply commands for **named** approval (the standing rule).

## Acceptance criteria

- [ ] Migration implements the spec's Solution sketch exactly; Core contract bodies untouched; existing triggers untouched (additive only)
- [ ] Gate suite red at head covering STORY-1..3 (arming + backfill classes, dispatch/convergence classes, all-doors classes incl. cancel and the name-withholding rule) with labelled designed-green controls (acting branch unchanged; orphans stay passive)
- [ ] `cancelled` convergence withholds `resolved_by_name`; declined-by-self carries the invitee's name; keying strictly on `membership_id`
- [ ] Sibling-assertion sweep enumerated in the migration header (the PD017 rabbit-hole list: `oracle-spine-port` passive-kind case, `typed-action-registry` catalog pins, `invitation-contracts` fixtures), each marked adapted or deliberately left
- [ ] `respond_to_personal_invitation` + `converge_invitation_notifications` registered in `supabase/ownership.manifest.json` (DS-5); conformance suites green post-apply
- [ ] PR held at the schema gate with red evidence + apply commands; applied only on a NAMED approval; post-apply full integration green

## Technical notes

Latest definitions verified at decomposition: personal-branch insert `20260724120000:182-195` (trigger AFTER INSERT — `NEW.id` available); Core pair `20260803190000:1529/2683` (accept UPDATEs to active, decline DELETEs; both P0002 on none, PC023 guards inside); registry `20260731140000` (`notification_action_types` + `notification_kinds.dispatch_segment`; the acting-response body at `:180-282` is the template); `action_taken` unconstrained TEXT (`20260723120000:134`). Existing `group_memberships` triggers: `notify_invitation_received` (INSERT), `notify_invitation_accepted` (UPDATE), `notify_invitation_declined_or_member_change` (DELETE) — `20260222000000:1379-1390`. Resolver name idiom: `SELECT g.name FROM public.groups g WHERE g.id = v_pg`. DELETE-outcome predicate: actor (`get_current_personal_group_id()`) = `OLD.member_group_id` → `declined`, else (incl. NULL actor) → `cancelled`, never erroring the host transaction.

## Verification

Red demonstrated at head (suite output in the PR body); post-apply `npm run test:integration` green (`--runInBand`); conformance green; `migration list` consistent after repair.
