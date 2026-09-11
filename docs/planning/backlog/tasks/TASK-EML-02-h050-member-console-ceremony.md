# Hub — the rectification ceremony on the member console

---
id: TASK-EML-02
title: The member console's email rectification ceremony — BFF route, lib function, and the dialog on the member detail page
status: review
assigned_to: Claude
priority: high
feature: FEAT-H050
owner: hub
wave: eid
cycle: email-rectification
depends_on: [TASK-EML-01]
estimated_hours: 5
---

## Description

Build the Hub half specified by [FEAT-H050](../../../products/hub/features/FEAT-H050-admin-member-email-rectification.md): the address in the member detail header stops being read-only.

Three pieces, each with a sibling to copy from:

1. `updateAdminUserEmail(client, userId, email, reason)` in `hub/lib/admin/users.ts`, beside its nine siblings.
2. `hub/app/api/admin/users/[id]/email/route.ts` — POST, shaped like `.../suspend/route.ts`.
3. The ceremony in `hub/components/admin/AdminMemberDetail.tsx`, built from `ConfirmModal` + `CeremonyReasonField` (both already imported there) plus one address input.

## Acceptance criteria

- [ ] STORY-1 — the control renders beside the address for an active member; absent when the member has no address; the route refuses a non-admin independently of the UI
- [ ] STORY-2 — the dialog shows the current address and an input for the new one; states that sessions will end and that invitations to the old address will be deleted; states that **no email is sent to either address**; confirm unavailable without a reason; both addresses visible at the moment of confirming
- [ ] STORY-3 — the confirmation names both addresses from the payload and reports `sessions_revoked` / `invitations_deleted` including when zero; the header re-renders from `new_email`; a `member.email_change` entry appears in the audit view
- [ ] STORY-4 — the route reads the reason with `requiredReason` and passes it verbatim; the reason is **never** in telemetry; a blank reason refuses without a round-trip
- [ ] STORY-5 — `42501`/`P0002` → 404, `P0001` → 409, `22023` → 400; the dialog stays open with input intact on refusal
- [ ] STORY-6 — the member's notice renders in the bell; the `account` category preference is honoured with no special forcing

## Technical notes

- **Route policy** (`hub/tests/unit/app/api/route-policy-conformance.test.ts` is the gate): no `runtime` / `preferredRegion` exports; POST authenticates with `getUser()`.
- **Telemetry:** this is a mutation, so it adopts the durable leg — `emitDurableTelemetry` before the mutation, mirroring the hard-delete route's ordering. The **reason never enters telemetry** (`hub/lib/admin/reason.ts` docstring).
- **ADR-U038:** the route is presentation-only. Every rule lives in the contract; the route's blank-reason check is defense-in-depth, and an adversarial integration test must prove the substrate refuses what the route refuses.
- Browser `confirm()` is forbidden at this entity — `ConfirmModal` only.
- E2E fixture names must be single-token (the nickname renders as the first token), and the test project's population is small — assert exact fixture counts before any page-scoped action.

## Verification

```
npm run test:unit -w hub
npx jest --selectProjects integration --testPathPatterns "member-email-rectification"
npm run test:e2e -w hub -- admin-member-email
npm run lint && npm run typecheck
```
