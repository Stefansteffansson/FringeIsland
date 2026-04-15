# Groups

**Wave:** Ferd
**Category:** General
**Status:** 🟡 Needs study

---

## What Is This

Groups are the fundamental organisational unit of the FringeIsland permission model.
All permissions flow through group membership — never directly to individual members.
Groups can stand alone, contain other groups, or exist at system level.

---

## Why We Are Building This

The group model is the spine of the entire platform. It governs who can do what,
where, and in what context. Getting this right in Ferd is critical — it is the
foundation every future wave builds on.

---

## How It Is Supposed to Work

### Group types

| Type | Description |
|------|-------------|
| **Standalone groups** | Independent groups with their own membership and roles |
| **Groups of groups** | A group that contains other groups as members |
| **System-level groups** | Platform-wide groups with special behaviour (e.g. DeusEx, the universal member group) |

### Key locked decisions
- Permissions flow exclusively through group membership
- Groups (not individual members) enroll in journeys
- Every member automatically belongs to a universal platform-wide group on sign-up
- Each member has a personal group created automatically on sign-up
- DeusEx is a special system group with superuser access — implemented as a regular group with a flag, not a separate construct

---

## Open Questions

- [ ] What are all the system-level groups needed for Ferd?
- [ ] How is the universal platform-wide group used — what permissions does it carry?
- [ ] Can a group of groups have its own direct members as well as sub-groups?
- [ ] How deep can group nesting go — is there a limit?
- [ ] How are group-level permissions inherited across nested groups?
- [ ] How is group creation governed — who can create a group and under what conditions?
- [ ] What happens to a group's journeys and data if the group is dissolved?
- [ ] How does the personal group interact with the member's own permissions?

---

*Status: 🟡 Needs study*
