# ADR-U004: Visitor anonymous sign-in with temporary profile

**Status:** Accepted
**Date:** 2026-03 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

FringeIsland's Contribution Architecture locked a visitor/shadow experience: visitors can explore the island before registering. Everything they do should carry over seamlessly on registration. The question was how to implement this technically.

## Decision

Use Supabase's built-in anonymous sign-in. Every visitor receives a real but temporary Supabase auth session on arrival. A temporary profile is created simultaneously, flagged `is_temporary: true`. Visitor activity saves to this temporary profile. On registration, the anonymous session converts to a permanent account — a supported Supabase API call. `is_temporary` flips to `false`. If the visitor never registers, a pg_cron job cleans up temporary profiles after a configured period.

## Why anonymous sign-in over browser storage

Browser storage (localStorage, sessionStorage) loses data if the visitor clears their browser, switches devices, or the session expires. Anonymous sign-in creates a real database record that persists across browser sessions and can survive the conversion to a permanent account without any data migration.

## Why this matches the garden door metaphor

The garden exists before it is claimed. The temporary profile is the garden waiting. The door opening on registration is the session conversion. This is not a clever technical trick — it is the technical expression of a product principle.

## Alternatives considered

- *Browser storage only* — rejected because it cannot survive device switching and cannot deliver the seamless conversion experience the product principle requires
- *Cookie-based tracking without auth* — rejected because it doesn't integrate with the profile system and creates a more complex conversion path
- *No visitor persistence* — rejected because it contradicts the locked Contribution Architecture principle

## Consequences

- pg_cron cleanup job must be implemented to remove stale temporary profiles
- Visitor temporary profiles consume database resources — retention period must be configured
- The conversion moment (anonymous → permanent) must be tested carefully to ensure no data loss

## Clarification — 2026-06-26 (FEAT-H003, IDN-1 build)

The "temporary session on arrival" is created **lazily** — at the visitor's first act that enters the shared near-side world, not on page load — so a public *FringeIsland entry* is **sessionless** and bot/bounce traffic creates no temporary profiles. A returning anonymous visitor past session expiry/cleanup is a **new** Mist (no persistent anonymous re-identification); cross-session continuity is reserved for the converted (FIM) account. The pg_cron cleanup named in *Decision* / *Consequences* is the **hard retention clock** that gates a server-side anonymous token (ADR-U031 stage 3); it is built robustly in **FEAT-H004 (IDN-2)** — pg_cron is not yet installed. (Cross-ref: ADR-U031 stage-1 / dissipation / stage-3 clarification, same date.)

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Related: [CONTRIBUTION_ARCHITECTURE.md](../../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md)
