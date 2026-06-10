# {Studio name} — Description

**Status:** Concept · Active · Maintained · Sunset
**Owner:** {name}
**Last updated:** YYYY-MM-DD
**Writes to:** {DS-N: domain service name}

> A Studio is the lifecycle surface where *Dreamineers* (FIMs in their authorial mode — Creator, Anthropologist, Teller, Wayfinder) **design, deploy, manage, and retire** their work — not just author it. The studios are World, Arc, and Journey Studio under Universe Studio as parent and binding frame (ADR-U026); each writes to exactly one Domain Service. Studios are a role-gated authoring mode inside the one experience and have different permissions, UI conventions, and review processes than the experiential default.

---

## What it is

One paragraph for someone who has never used this Studio. What does a creator come here to do across the full lifecycle (design → deploy → manage → retire)?

## Who uses it

The creator persona. What creative practice are they bringing? What experience level should we assume?

## What it produces

The artifacts this Studio creates and where they land in the system.

| Artifact | Format | Stored in | Consumed by |
|----------|--------|-----------|-------------|
| ... | ... | DS-{N} | {services / surfaces} |

## Studio philosophy

How the creative lifecycle is supposed to *feel* in this Studio — across design, deployment, ongoing management, and retirement. (Stålenhag-style mood-first authoring? Structured form filling? Visual node graph? How does a creator manage what they've shipped, or sunset something gracefully?) This shapes UX decisions more than any feature list.

## Constraints it enforces

What the Studio refuses to let creators do (and why). Constraints come from the World Model, the cosmological constitution, and the platform's safety/quality bar.

## Permissions

Who is allowed in. How creator status is granted. How it can be revoked.

## Relationship to other Studios

If this Studio's output is consumed by another Studio (e.g., World Studio's lore feeds Arc Studio's narrative), document the handoff here. Coherence across the set is held at the Universe Studio (parent) level — ADR-U026.

---

**Companion docs:** `SPECIFICATION.md` (build spec, when active) · the domain service it writes to
