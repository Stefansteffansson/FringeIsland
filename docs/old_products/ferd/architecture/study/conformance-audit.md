# Architecture Conformance Audit

**Wave:** Ferd
**Category:** Architecture
**Status:** 🟡 Needs study

---

## What Is This

A systematic validation of every line of the existing FringeIsland codebase
against the defined system anatomy and architectural principles.
This audit must be completed — and all violations resolved — before or alongside
the development of new Ferd features. Building new functionality on a foundation
that violates its own architecture compounds technical debt silently and rapidly.

---

## Why We Are Building This

The current codebase was developed before the system anatomy was fully locked.
It is expected that violations exist. These must be surfaced, documented,
prioritised and resolved to ensure that all future waves build on a clean foundation.

---

## How It Is Supposed to Work

1. **Lock the architecture first** — the system anatomy (L0–L7), API ring principles
   and vertical definitions must be fully specified before the audit begins.
   Without a clear measuring stick there is nothing to audit against.

2. **Audit the codebase** — Claude Code will analyse the existing codebase
   against the locked architecture specification and produce a violations report.

3. **Categorise violations** — each violation is tagged by:
   - Which architectural principle it violates
   - Which layer or vertical is affected
   - Severity: blocking (must fix before Ferd ships) vs non-blocking (fix within Ferd)

4. **Resolve violations** — violations are resolved as part of Ferd development,
   prioritised by severity and dependency order.

5. **Verify resolution** — a second pass confirms all blocking violations are cleared
   before the wave-is-done criteria can be met.

---

## Audit Scope

| Area | What to check |
|------|--------------|
| **Layer violations** | Code in the wrong layer — e.g. business logic in L0, data access in L2 |
| **API ring violations** | Anything that accesses the platform bypassing the API ring |
| **Vertical violations** | Concerns that belong to a vertical (auth, observability, notifications, privacy, transactions) implemented ad-hoc outside the vertical |
| **Dependency direction** | Lower layers depending on higher layers |
| **Cross-cutting concerns** | Duplicated logic that should live in a single vertical |

---

## Open Questions

- [ ] Is the system anatomy (L0–L7) fully documented and locked? *(blocker)*
- [ ] Is the API ring fully specified? *(blocker)*
- [ ] Are all five verticals defined in enough detail to audit against? *(blocker)*
- [ ] What tooling will Claude Code use to perform the audit — static analysis, manual review, or both?
- [ ] How do we handle violations that are deeply embedded and expensive to fix — are any acceptable as known technical debt?
- [ ] Who reviews and signs off on the violations report?

---

*This item cannot begin until system-anatomy.md, api-ring.md and verticals.md are 🟢 Ready to specify.*
