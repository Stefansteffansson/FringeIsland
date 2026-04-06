# Notifications

**Wave:** Ferd
**Category:** Communication
**Status:** 🟡 Needs study

---

## What Is This

The notification system delivers system messages and administrator messages to members.
In Ferd this is the foundational layer of the Notifications vertical —
scoped to platform-level and admin-originated communications.

---

## Why We Are Building This

Members need to be informed about relevant events on the platform — account activity,
admin announcements, system status. A reliable, well-architected notification system
in Ferd ensures that all future notification needs (journey events, social activity, etc.)
have a solid base to build on.

---

## How It Is Supposed to Work

- System notifications are generated automatically by platform events
- Admin notifications are sent by platform administrators to members or groups
- Members receive notifications in-app
- Notification preferences are controllable by the member

---

## Open Questions

- [ ] What specific system events trigger notifications in Ferd?
- [ ] What channels are in scope for Ferd — in-app only, or also email?
- [ ] How are notifications scoped — to an individual, a group, the whole platform?
- [ ] What are the member's controls over notification preferences?
- [ ] How does the notification system integrate with the Notifications vertical architecture?
- [ ] Is there a notification inbox/history view?
- [ ] How does the Privacy vertical interact with notification delivery?
- [ ] Are notifications real-time (Supabase realtime) or polled?

---

*Status: 🟡 Needs study*
