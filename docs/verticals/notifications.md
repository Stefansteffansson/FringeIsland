# Vertical — V3: Notifications

**Status:** Draft (scaffold — Ferd)
**Owner:** Stefan
**Last updated:** 2026-04-08
**Tier:** Cross-cutting

> Every domain service can produce events users care about. This vertical defines the shared notification fabric — email, push, in-app — so that any service can publish a notification without reinventing delivery, preferences, or rate limiting.

---

## 1. Purpose

Notifications are how the platform reaches users when they aren't actively using it. Done right, they pull users back into meaningful moments. Done wrong, they're spam — and a one-way ticket out of the user's trust.

## 2. Scope

- Email delivery (transactional + digest)
- Mobile push (iOS + Android)
- In-app notification feed
- Per-user, per-category notification preferences
- Quiet hours and frequency caps
- Bounce and unsubscribe handling

## 3. Obligations on each tier

### Platform Core
- Identity service stores per-user notification preferences
- A shared notification dispatcher accepts events from any domain service

### Domain Services
- Each service publishes events through the notification dispatcher, never sending directly
- Each event declares its category (so user preferences can suppress it)

### Surfaces
- Every surface respects user-set quiet hours
- In-app notification feed is a first-class component shared via Design System

## 4. Cross-cutting checklists

- [ ] New event type belongs to a defined category
- [ ] User preference can suppress this notification
- [ ] Notification has a one-click unsubscribe path
- [ ] Notification respects quiet hours and frequency caps

## 5. Tooling and infrastructure

- Email provider (to be selected)
- Push provider (to be selected)
- Notification dispatcher (to be designed)

## 6. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

## 7. Open questions

- Do we batch low-priority notifications into a digest by default?
- How do we handle notifications for users in groups (per-user vs. per-group preferences)?

---

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
