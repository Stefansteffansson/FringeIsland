# Journeys

**Wave:** Ferd
**Category:** General
**Status:** 🟡 Needs study

---

## What Is This

Journeys are structured experiences that members undertake on the FringeIsland platform.
In Ferd, journeys exist as a core data model and lifecycle — members can join, undertake
and leave journeys. The authoring tooling for journeys (Journey Studio) comes in Eid.

---

## Why We Are Building This

Journeys are the primary vehicle for growth and experience on the platform.
The data model and lifecycle must be solid in Ferd so that Journey Studio (Eid)
and all subsequent expansions have a stable foundation.

---

## How It Is Supposed to Work

### Key locked decisions
- Groups enroll in journeys — not individual members directly
- A member participates in a journey by virtue of being in a group that is enrolled
- Journey Zero is a special journey — same data model, flagged differently

### Member journey lifecycle
| Action | Description |
|--------|-------------|
| **Join** | A group (and its members) enrolls in a journey |
| **Undertake** | A member actively progresses through a journey |
| **Leave** | A member or group exits a journey |

---

## Open Questions

- [ ] What does a journey consist of at the data model level in Ferd?
- [ ] What is Journey Zero — what makes it special and how is it used?
- [ ] Can a member be in multiple journeys simultaneously?
- [ ] What happens to a member's journey data if they leave a journey mid-way?
- [ ] What happens to journey data if a group dissolves?
- [ ] How does a journey's progress get tracked per member?
- [ ] What is the relationship between journeys and the member profile's journey-contributed data layer?
- [ ] In Ferd, is there any UI for journeys beyond the data model — or is this purely backend?

---

*Status: 🟡 Needs study*
