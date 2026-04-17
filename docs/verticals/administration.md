# Vertical — V1: Administration & Moderation

**Status:** Draft (scaffold — Ferd)
**Owner:** Stefan
**Last updated:** 2026-04-08
**Tier:** Cross-cutting

> Administration covers platform-level operator capabilities (user management, group management, content moderation, abuse response). Every domain service and surface must expose the hooks that admins need to inspect, intervene, and remediate.

---

## 1. Purpose

Without administration, the platform is ungovernable. This vertical guarantees that operators always have the tools to keep the platform safe, lawful, and consistent with the cosmological constitution — without requiring database surgery.

## 2. Scope

- Platform admin role assignment (DeusEx system group)
- User account inspection, suspension, deletion
- Group inspection, takeover, dissolution
- Content moderation (review queues, flagging, takedown)
- Audit trail of every administrative action
- Appeal flows

## 3. Obligations on each tier

### Platform Core
*To be filled in as the vertical's obligations are refined from the existing admin implementation. Read the live code and migrations directly for the current state.*

### Domain Services
Each domain service must expose: list-all (admin scope), force-edit, force-delete, audit-log-emit.

### Surfaces
Each surface must surface admin actions behind the platform-admin permission gate, never client-side hidden.

## 4. Cross-cutting checklists

- [ ] New table has an admin list/inspect query
- [ ] New mutation emits an audit-log entry on the admin path
- [ ] New surface respects `is_platform_admin()` for admin affordances
- [ ] Destructive admin actions require a confirm modal (never `window.confirm`)

## 5. Tooling and infrastructure

- `is_platform_admin()` SECURITY DEFINER helper (existing)
- DeusEx system group (existing)
- Audit log table (currently partial — to be refined as the tooling matures)

## 6. Failure modes

*To be filled in as the vertical's tooling and failure cases mature.*

## 7. Open questions

- Appeal workflow: in-app or out-of-band?
- Content moderation: human-only, or AI-assisted with human review?
- Regional moderation: do we need per-jurisdiction moderation rules?

---

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
