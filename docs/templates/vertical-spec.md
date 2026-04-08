# Vertical — V{N}: {Vertical name}

**Status:** Draft · Active · Stable
**Owner:** {name}
**Last updated:** YYYY-MM-DD
**Tier:** Cross-cutting

> A "vertical" is a concern that touches every layer of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces. Verticals are *not* services. They are obligations that every service and every surface must fulfil. There are five: V1 Administration & Moderation, V2 Privacy & GDPR, V3 Notifications, V4 Observability, V5 Transactions.

---

## 1. Purpose

What this vertical exists to guarantee, in one paragraph. What goes wrong if it isn't satisfied?

## 2. Scope

What it covers. Be specific — "privacy" alone is too vague to be enforceable. ("Personal data minimisation, consent capture, right-to-erasure flows, data export, AI training opt-out, GDPR Art. 30 records of processing.")

## 3. Obligations on each tier

### Platform Core
What every Platform Core capability must do to satisfy this vertical.

### Domain Services
What every domain service must do. May vary by service — list per service if needed.

### Surfaces (Products + Studios + Design System)
What every surface must do (UI affordances, copy, flows).

## 4. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../planning/PROCESS.md` §5).

- [ ] ...
- [ ] ...

## 5. Tooling and infrastructure

What shared infrastructure exists to make this vertical cheap to satisfy (audit log, consent store, rate limiter, etc.). If something has to be reimplemented per-feature, that's a smell — flag it.

## 6. Failure modes

What can go wrong, what happens when it does, how it's detected, and how it's recovered.

## 7. Open questions

Decisions still owed. Each is a candidate ADR or spike.
