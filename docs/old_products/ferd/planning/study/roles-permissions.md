# Roles & Permissions

**Wave:** Ferd
**Category:** General
**Status:** 🟡 Needs study

---

## What Is This

Roles are assigned to members within the context of a group.
Permissions are attached to roles. A member's effective permissions
in any context are the union of permissions granted by all roles
they hold across all their group memberships.

---

## Why We Are Building This

A clear, consistent permission model is the security and access backbone
of the entire platform. It must be correct, auditable and scalable before
any features that depend on it are built.

---

## How It Is Supposed to Work

- A role is scoped to a group — it has no meaning outside of a group context
- A member can hold different roles in different groups
- Permissions are attached to roles, not directly to members or groups
- The DeusEx group holds a role that grants all permissions on the platform

---

## Open Questions

- [ ] What are the default roles needed for Ferd — e.g. admin, member, moderator?
- [ ] Are roles platform-defined, group-defined, or both?
- [ ] Can a group admin create custom roles within their group?
- [ ] How are permissions defined — as resource + action pairs, or another model?
- [ ] What are all the permissions needed to cover Ferd's scope?
- [ ] How does permission inheritance work in nested groups?
- [ ] How is the permission check performed at runtime — where in the stack does it happen?
- [ ] How do Supabase RLS policies relate to the application-level permission model?

---

*Status: 🟡 Needs study*
