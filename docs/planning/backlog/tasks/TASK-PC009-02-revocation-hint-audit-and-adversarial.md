# Revocation hint (realtime.send + private-channel policies), audit row, adversarial direct-caller tests

---
id: TASK-PC009-02
title: Revocation hint — realtime.messages policies + server-emitted session_revoked + audit row + adversarial tests
status: review
assigned_to: claude
priority: high
feature: FEAT-PC009
owner: platform/core/identity
wave: ferd
cycle: E
depends_on: [TASK-PC009-01]
estimated_hours: 3
---

## Description

The ADR-U039 substrate half (FEAT-PC009 STORY-3/5): `revoke_own_session()` emits `realtime.send({session_id}, 'session_revoked', 'account:<auth_uid>:sessions', private => true)` — guarded so a hint failure never fails the revocation (spec open Q2) — and writes one durable `session_revoked` row to `admin_audit_log` (inline-INSERT pattern; spec open Q1 default). RLS on `realtime.messages`: authenticated may **receive** on their own topic only; **no client send policy** (server-originated only). Adversarial coverage per the API-boundary DoD: the direct PostgREST path refuses everything the route will refuse.

## Acceptance criteria

- [ ] Successful revoke → one `realtime.messages` row (topic `account:<uid>:sessions`, event `session_revoked`, payload `{session_id}`, private) + one `admin_audit_log` row; failed revoke (P0002) → neither
- [ ] Realtime authorization: subscribing to another member's topic is refused; own topic succeeds (client-side integration probe)
- [ ] No client-originated send path onto session topics
- [ ] Hint-emission failure does not roll back the revocation (exception-guard demonstrated by test or documented reasoning in the migration)
- [ ] Adversarial: Mist + cross-user direct `rpc()` calls refused at the substrate (42501 / P0002) — not just at the route

## Technical notes

Same migration as TASK-PC009-01 (one schema-gate unit). `realtime.messages` policy: `USING (realtime.messages.extension = 'broadcast' AND realtime.topic() = 'account:' || auth.uid() || ':sessions')` FOR SELECT TO authenticated. Assert message rows via `runAdminSql` (management API; realtime schema is not PostgREST-exposed). Audit row via service-role read of `admin_audit_log`.

## Verification

Integration suite green incl. the realtime.messages + audit assertions; schema-review gate covers the policies (task status `review`).
