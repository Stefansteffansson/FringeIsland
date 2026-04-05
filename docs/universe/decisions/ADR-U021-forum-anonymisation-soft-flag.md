# ADR-021 — Forum anonymisation — soft-flag, not data mutation

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
When a member leaves a group, their forum posts remain. Should they be deleted, anonymised in the database, or handled differently?

**Decision:**
Posts retain their original `author_id`. Display logic shows "Former Member" based on current membership status — not based on the stored author field. If the member rejoins, their name reappears automatically. Historical data is never mutated.

**Why:**
Mutating historical data creates data integrity problems and is irreversible. Soft-flag display logic is reversible, honest, and respects the historical record. It also handles the rejoin case automatically without any additional logic.

**Why not delete posts:**
Deleting posts damages the integrity of forum conversations. A thread where half the replies have disappeared is worse than a thread with "Former Member" attributions.
