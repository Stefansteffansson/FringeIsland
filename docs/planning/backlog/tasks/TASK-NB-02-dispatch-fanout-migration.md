# Actionable-notification dispatch + acting fan-out migration (FEAT-PD014)

---
id: TASK-NB-02
title: Actionable-notification dispatch + acting fan-out migration
status: done
assigned_to: Claude
priority: high
feature: FEAT-PD014
owner: platform/domain/communication
wave: ferd
cycle: N-B
depends_on: [TASK-NB-01]
estimated_hours: 4
---

## Description
The schema-gated migration realising ADR-U051: register the `acting_invitation` kind; extend `get_own_notifications` with `action_data` + NTF-8 lazy expiry-on-view; branch `notify_invitation_received` to fan out `acting_invitation` to the invited group's act_as_group holders; add `respond_to_acting_invitation` (thin dispatch to the untouched Core `respond_to_group_invitation` + first-answer-wins convergence). Ownership manifest gains the new RPC.

## Acceptance criteria
- [x] Migration `20260724120000_n_b_actionable_notification_dispatch.sql` authored (all five moves).
- [x] `supabase/ownership.manifest.json` DS-5 += `respond_to_acting_invitation`.
- [ ] **SCHEMA GATE — HELD.** Applied to the dev DB + repaired only on Stefan's named "ok merge". Dev-DB apply currently also blocked by the active ES256 window.

## Technical notes
DROP+CREATE `get_own_notifications` (return type grows a column; STABLE→VOLATILE for the self-healing expiry write). Trigger stays a delivery-substrate trigger (ADR-U048); `invite_group`/`respond_to_group_invitation` untouched (NB-1). Convergence keyed strictly on `action_data->>'membership_id'`; who-answered denormalised onto the durable notification rows (survives decline).

## Verification (apply commands — run at the gate nod)
```
node scripts/apply-migration-temp.js 20260724120000_n_b_actionable_notification_dispatch.sql
bash supabase-cli.sh migration repair --status applied 20260724120000
bash supabase-cli.sh migration list
```
