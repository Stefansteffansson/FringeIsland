# API Ring

**Wave:** Ferd
**Category:** Architecture
**Status:** 🟡 Needs study

---

## What Is This

The API ring is the single gateway through which anyone or anything accesses
the FringeIsland experience. It encapsulates and secures the entire platform.
No external consumer — whether a browser, mobile app, or third-party service —
may access any platform layer directly. All access flows through the API ring.

---

## Why We Are Building This

- Security: a single controlled entry point means a single place to enforce auth,
  rate limiting, validation and observability
- Scalability: the internal platform can evolve without exposing implementation details
- Consistency: all consumers get the same interface regardless of how internals change

---

## How It Is Supposed to Work

- The browser (member or visitor) communicates exclusively with Next.js as the API layer
- Next.js acts as the API ring — it is the only component the outside world talks to
- Internal services, Supabase, and all platform layers are invisible to external consumers
- Any future mobile app, third-party integration or tooling also goes through the API ring

---

## Open Questions

- [ ] Is the API ring implemented as Next.js API routes, or a separate service?
- [ ] What are the exact rules for what the API ring enforces — auth, validation, rate limiting, all of these?
- [ ] How does the API ring interact with Supabase RLS — are they complementary or does one take precedence?
- [ ] How does the API ring handle the five verticals — does it call into them or are they middleware?
- [ ] What does a violation of the API ring look like in practice — what patterns are forbidden?
- [ ] How will the conformance audit detect API ring violations in the existing codebase?

---

*Status: 🟡 Needs study*
