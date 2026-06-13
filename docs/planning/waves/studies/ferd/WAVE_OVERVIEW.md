# Wave 1 — Ferd (Voyage)

> *You set out.*

## Mission

Establish the complete foundational infrastructure of the FringeIsland platform.
Define and lock the system anatomy and architecture that all future waves will build upon.
Validate the existing codebase for conformance against this architecture before proceeding.
When Ferd is complete, the platform has a solid, scalable, well-tested core
with no architectural violations in the codebase.

---

## Wave Is Done When

- [ ] All architecture documents are written, reviewed and locked
- [ ] Architecture conformance audit is complete and all violations are resolved
- [ ] Members can sign up, sign in, sign out and leave the platform
- [ ] Groups, roles and permissions are fully functional
- [ ] Members can join, undertake and leave journeys
- [ ] Members can write in their personal journals
- [ ] Direct messaging works between individual and multiple members
- [ ] Group forums are functional
- [ ] System and admin notifications are operational
- [ ] Multi-language support is in place
- [ ] All five verticals cover the scope defined for this wave
- [ ] All open questions for this wave are closed

---

## Contents

### Architecture & System Anatomy
→ [System Anatomy (L0–L7)](./system-anatomy.md)
→ [API Ring](./api-ring.md)
→ [Verticals](./verticals.md)
→ [Architecture Conformance Audit](./conformance-audit.md)

### Authentication
→ [Authentication](./authentication.md)

### General
→ [Members](./members.md)
→ [Groups](./groups.md)
→ [Roles & Permissions](./roles-permissions.md)
→ [Journeys](./journeys.md)
→ [Journals](./journals.md)

### Communication
→ [Direct Messaging](./direct-messaging.md)
→ [Forum](./forum.md)
→ [Notifications](./notifications.md)

### Internationalisation
→ [Multi-language Support](./internationalisation.md)

---

## Study Dependencies

The following must be answered or resolved before Ferd development can begin in earnest:

- [ ] System anatomy (L0–L7) fully defined and documented
- [ ] API ring principles locked — what can and cannot bypass it
- [ ] Five verticals scope for this wave agreed
- [ ] Conformance audit methodology agreed — how do we measure violations?
- [ ] Authentication flow fully specified for all visitor/member states

---

## Open Questions

Open questions exist across all topics in this wave. Each feature file carries its own
open questions section. The items below are wave-level questions that cut across multiple topics:

- [ ] What is the precise definition of a "visitor" vs a "member" in system terms?
- [ ] How are system-level groups (e.g. DeusEx) bootstrapped on first deploy?
- [ ] What is the data retention policy when a member leaves the platform?
- [ ] How does multi-language support interact with user-generated content?
- [ ] What observability tooling is in scope for this wave?
- [ ] What constitutes a complete admin interface for this wave?

---

*Status: 🔴 Needs concept work → architecture must be locked before study can begin*
