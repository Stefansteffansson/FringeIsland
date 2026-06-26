# Changelog — Platform Core

Substrate-level changes to Platform Core (Infrastructure, Identity, Organisation, Governance). These are developer-facing platform changes, not end-user features; each entry links the feature spec with the full implementation notes.

## 2026-06-26 — Mist anonymous-identity substrate, arrival ([FEAT-PC001](./features/FEAT-PC001-mist-anonymous-substrate.md))

- **`users.is_temporary`** identity-state flag (existing FIM rows backfill to `false`).
- **`handle_new_user` Mist branch** — an anonymous auth insert materialises an `is_temporary` profile with a proto personal group, a `'Mist'` name default (no null-crash on the nameless Mist), and **no** FringeIsland Members enrolment (status-driven access).
- **`users.email` made nullable** — a Mist carries no PII (UNIQUE still holds for FIMs).
- **Visitor→Mist rename** — the vestigial `'Visitor'` system group / `'Guest'` role renamed to `'Mist'` (ADR-U031).
- Migration: `supabase/migrations/20260626120000_mist_anonymous_substrate.sql`. Consumed by Hub FEAT-H003. The ephemerality reaper, consent substrate, and transcendence are deferred to FEAT-PC002.
