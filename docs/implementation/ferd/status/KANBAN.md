# Ferd Kanban Board

**Last Updated:** 2026-04-05
**Source:** [REQUIREMENTS.md](../../products/ferd/specification/REQUIREMENTS.md) + [ACTUAL_STATE.md](../baseline/ACTUAL_STATE.md)

---

## Critical / Immediate

| Item | Type | Notes |
|------|------|-------|
| Orphan groups after hard delete | Bug | Needs stewardship transfer UI |
| `fix-orphans` page uses `alert()` | Bug | Should use ConfirmModal |
| ADR-009 compliance (~40+ direct writes) | Tech debt | Only 4 API routes exist |

## In Progress

*No items currently in progress.*

## Next Sprint (Ferd 1.6)

| Item | Type | Notes |
|------|------|-------|
| Mobile responsiveness audit | UI/UX | Sprint plan step 1 |
| User onboarding flow | Feature | Sprint plan step 2 (TDD stages 0-7) |
| Expand E2E test coverage | Testing | 7 Playwright tests exist |
| Fix known issues | Bug fixes | Sprint plan step 4 |
| Beta testing setup (10-20 users) | Launch | Sprint plan step 5 |
| Error monitoring (Sentry) | Ops | Sprint plan step 6 |

## Backlog (Post-Launch)

| Item | Type | Notes |
|------|------|-------|
| Permission enforcement (8/39 enforced) | Security | Shallow enforcement |
| Email delivery service | Feature | Currently stub only |
| GDPR / privacy rights | Compliance | No implementation yet |
| WCAG 2.1 AA accessibility | Accessibility | Basic semantic HTML only |
| i18n / string externalization | i18n | English only currently |

## Deferred (Hamn / Wave 2+)

| Item | Type | Notes |
|------|------|-------|
| Journey Designer | Feature | Specification sessions ongoing |
| Native iOS/Android apps | Platform | Requires full ADR-009 compliance |
| Whisp system | Feature | Needs AI integration |
| Dreamineer marketplace | Feature | Publishing, ratings, reviews |
| Groups-join-groups UI | Feature | Requires D11 circularity trigger |

---

## Related

- [Sprint Tracker](../../../../SPRINT.md) — Active sprint details
- [Project Status](../../../../PROJECT_STATUS.md) — Current state
- [Deferred Decisions](../../../products/ferd/planning/DEFERRED.md) — Why items are deferred
