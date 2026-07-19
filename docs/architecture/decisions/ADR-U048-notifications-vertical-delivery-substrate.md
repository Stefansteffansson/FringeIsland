# ADR-U048: The notifications delivery substrate is a vertical obligation; DS-5 owns routing above it

**Status:** Accepted (ratified 2026-07-19, Stefan — records ruling R-1 of 2026-07-19)
**Date:** 2026-07-19
**Deciders:** Stefan (ruling) + Claude (from the [anatomy-conformance audit](../../planning/reference/ANATOMY-CONFORMANCE-AUDIT.md), finding AC-3 / ruling R-1)
**Tags:** scope:vertical · scope:domain-service · scope:platform-core · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

`public.notifications` was born in the core foundation migration (`20260222000000_rebuild_universal_group_pattern.sql:214`) with a generic delivery shape (`type`/`title`/`body`/`payload`). Today it is written by PC-3 triggers (invitation/role/group events), PC-4's `admin_send_notification`, PC-3 lifecycle RPCs (pc013/pc014/pc015), and DS-3 journey RPCs (pd002–pd004) alike. Meanwhile the DS-5 Communication charter names "notification routing and delivery" as DS-5-owned — but DS-5 is unbuilt (the Communication area is next in the Phase-3 order).

The 2026-07-19 audit surfaced the collision as its only verdict-changing classification question (AC-3): **who owns the notifications table — DS-5, making every core and DS-3 write a boundary violation, or the Notifications vertical, making those writes obligation-fulfilment?**

## Decision drivers

- **ADR-U002's obligation pattern:** verticals are cross-cutting obligations every tier fulfils — the write-side pattern of audit and telemetry, which no service owns exclusively.
- **The evidence of the writers:** core is the dominant writer; the table predates any DS-5 design; the shape is generic delivery, not communication semantics.
- **A-COM is imminent:** the Communication area must build DS-5 on a settled reading, not inherit the ambiguity.
- **Proportionality:** ruling DS-5-now would create a Major multi-site relocation (every core trigger and RPC write) with no enforcement or product gain, into a service that does not exist yet.

## Considered options

- **Option A — Vertical delivery substrate now; DS-5 takes routing later.**
- **Option B — DS-5-owned now:** relocate every write into a DS-5 routing contract.
- **Option C — Defer the ruling to the A-COM decomposition.**

## Decision outcome

**Chosen option: Option A** (Stefan, 2026-07-19), because it matches how the substrate actually grew (an obligation table, written by all tiers), costs nothing now, and hands A-COM a clean layering instead of a relocation.

### The ruling

1. **`public.notifications` — and its delivery mechanics (`handle_notification_action` and kin) — is the Notifications-vertical delivery substrate**, platform-side. Any tier (core, domain service, product seam) writes it directly as obligation-fulfilment, exactly like the audit and telemetry substrates. These writes are not boundary crossings.
2. **When A-COM realizes DS-5, DS-5 owns the layer above:** routing rules, recipient preferences, digest/aggregation, channel fan-out — reading and managing delivery rows. The delivery table does not move.
3. **The DS-5 charter's "notification routing and delivery" is scoped accordingly** (doc pass, COR-A W7): *delivery* = the vertical substrate below; *routing* = DS-5's layer above it.

### Consequences

- **Positive:** audit finding AC-3 closes as a compliant Observation; the DS-3 and core writes stand as-is; A-COM gets an unambiguous DS-5 scope; the vertical's ADR-U002 reading gains its first concrete substrate precedent.
- **Negative:** none material now. If DS-5's routing layer eventually needs to own delivery (e.g., multi-channel outboxes), that is a new ADR superseding this one.
- **Neutral:** COR-A W7 carries the doc pass (DS-5 charter note, ARCHITECTURE_ANATOMY stamp move, ownership maps).

## Pros and cons of each option

### Option A — vertical substrate now, DS-5 routing later (chosen)
- Pros: zero-relocation; matches the write-side evidence; layering ready for A-COM; consistent with ADR-U002.
- Cons: the DS-5 charter line needs a scoping note (one sentence — W7).

### Option B — DS-5-owned now
- Pros: most literal reading of the current charter wording.
- Cons: Major multi-site relocation into an unbuilt service; core would then legitimately depend on a domain service for a cross-cutting duty — inverting the very rule ADR-U047 restores.

### Option C — defer to A-COM
- Pros: decides with DS-5's real shape on the table.
- Cons: leaves AC-3 open; the corrective cycle and A-COM planning would both build against ambiguity — the audit showed exactly where that leads (AC-1 grew from "satisfied-now" deferrals).

## Links

- Evidence: [anatomy-conformance audit](../../planning/reference/ANATOMY-CONFORMANCE-AUDIT.md) AC-3 + §Rulings R-1 (writer inventory, file:line)
- Plan: [anatomy-correction-plan](../../planning/hub-v2/anatomy-correction-plan.md) (W6 = this ADR; W7 doc pass)
- Related ADRs: U002 (the five verticals — the obligation pattern), U047 (lifecycle facts; excludes notifications writes from its scope), U023 (decomposition)
- Canon: DS-5 charter (docs/platform/domain/); ARCHITECTURE_ANATOMY §DS-5, §verticals
