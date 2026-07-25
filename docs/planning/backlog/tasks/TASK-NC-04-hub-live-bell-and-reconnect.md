# N-C: the bell goes live — tenant registration, hint handling, reconnect reconciliation

---
id: TASK-NC-04
title: "N-C: the bell goes live — tenant registration, hint handling, reconnect reconciliation"
status: done
assigned_to: claude
priority: high
feature: FEAT-H032
owner: hub
wave: ferd
cycle: A-NTF N-C
depends_on: [TASK-NC-02]
estimated_hours: 5
---

## Description

Register the notification bell as a realtime tenant and wire the two callbacks. FEAT-H027 built `hub/lib/realtime/manager.ts` for exactly this and its docstring says the bell joins "by calling `registerTenant`, with **no manager edit**" — so a manager change here means the tenant shape is being misused.

Covers FEAT-H032 STORY-1 (live badge), STORY-2 (reconnect reconciliation), STORY-3 (verify-on-signal at the surface).

**Unit tier carries the logic** (the pyramid must stay upright): coalescing, status transitions, teardown, forged-id handling, and the arming rule are all unit-testable against a mocked manager — `hub/tests/unit/lib/realtime/manager.test.ts` and `use-comm-channel` are the precedents. E2E is TASK-NC-06 and covers the journey only.

## Acceptance criteria

- [ ] A notifications channel hook (sibling to `use-comm-channel.ts`) registers one tenant on `account:<auth_uid>:notifications`, events including `notification`.
- [ ] `onHint` **invalidates and re-fetches through the existing contract path** (`/api/notifications/unread-count`, plus the recent window when the panel is open). It must never read the payload to paint — unit test asserts the payload is not a data source.
- [ ] Multiple hints in quick succession **coalesce into one re-read** — unit test with several synchronous hints asserting a single fetch.
- [ ] `onStatus('reconnecting')` surfaces the degraded state; returning to `'subscribed'` triggers reconciliation; `'closed'` degrades to fetch-only without breaking the bell.
- [ ] Visibility and focus re-reads work independently of channel status (a long-idle tab is correct even if no status change fired).
- [ ] Teardown on sign-out / identity change; **no tenant armed** for a Mist or a session-less visitor (the manager's arming rule, asserted at the unit tier).
- [ ] A forged/foreign row id in a hint changes nothing on screen; a malformed or empty payload does not throw or clear state; an unrecognised event name is ignored.
- [ ] `hub/lib/realtime/manager.ts` is **unchanged** by this task — verify with `git diff`.
- [ ] The socket join is **after paint** — it must not join the first-paint critical path (FEAT-H032 performance budget).
- [ ] Telemetry is content-free: topic **kind** only, never the uid-bearing topic string, never a row id (the H012 discipline the manager already follows).
- [ ] Exactly one subscription when both the bell and `/notifications` are mounted.

## Technical notes

- Components: `hub/components/notifications/NotificationBell.tsx`, `hub/components/shell/AppShell.tsx` (where the bell mounts, so registration is global), `hub/app/notifications/page.tsx` (reconciles through the shared context, registers nothing).
- Reads already exist — `/api/notifications/unread-count`, `/api/notifications`. No new route (FEAT-H032 No-gos).
- Do not add a spinner or skeleton to an already-painted badge; a badge that flickers per arrival is a defect (B6).
- The reconnecting indicator is a quiet degradation, not an error state — Hub `SPECIFICATION.md` §L2 `:143` frames it as "the rest of the Hub continues to function over polling".

## Verification

- `cd hub && npx jest --selectProjects unit` — green, with the new unit tests demonstrated red first.
- `cd hub && npx next build` — the type gate (ts-jest and eslint do **not** full-type-check).
- `git diff --stat hub/lib/realtime/manager.ts` → empty.
