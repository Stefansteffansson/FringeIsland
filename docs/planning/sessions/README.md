# Session Bridges

Session bridge documents from planning, design, and review sessions. They capture decisions, locked choices, and the handoff context needed for the next session — so the next agent can pick up without re-reading a transcript.

- **Template:** [`../../templates/session-bridge.md`](../../templates/session-bridge.md)
- **Naming convention:** `YYYY-MM-DD_NN_-_{TOPIC}.md` (date + 2-digit sequence within the day, separator `_-_`, then descriptive uppercase-kebab topic — e.g. `2026-04-26_01_-_VERTICALS-MIGRATION-AND-FORWARD-PLAN.md`). The `_NN_` sequence keeps multi-bridge days sorted chronologically; for days with one bridge, use `_01_`. Forward-looking from 2026-04-26; older single-bridge files use the prior `YYYY-MM-DD_-_{TOPIC}.md` form.

Sessions are historical records. Once committed, they are **not rewritten** — subsequent decisions supersede them rather than editing them. The `doc-health-check` skill excludes `sessions/` from its edit-targets for this reason.

## Browsing

The full set of session files lives in this directory and can be listed directly (e.g. `ls docs/planning/sessions/`). Maintaining a curated index here would go out of date within weeks; the directory listing is the canonical index.

Recent highlights worth knowing about:

- [`2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md`](./2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md) — way-of-working refactor Session 1 (Tier 1 cleanup + Tier 2 structural additions).
- [`2026-04-17_-_WAY-OF-WORKING-REVIEW.md`](./2026-04-17_-_WAY-OF-WORKING-REVIEW.md) — the 11 locked decisions driving the refactor.
- [`2026-04-15_-_LEGACY-MIGRATION-PRODUCTS-IMPLEMENTATION.md`](./2026-04-15_-_LEGACY-MIGRATION-PRODUCTS-IMPLEMENTATION.md) — `old_products/` + `old_implementation/` decommission.
- [`2026-04-12_-_SESSION-BRIDGE.md`](./2026-04-12_-_SESSION-BRIDGE.md) — ADR migration + legacy universe review.

For older sessions, browse the directory directly. For the most recent session with instructions for the next agent, check the newest dated file.
