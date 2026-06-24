# hub-legacy — the frozen Hub MVP (behavioural oracle)

**This is the old Hub MVP, relocated here from the repo root on 2026-06-24 ([ADR-U032](../docs/architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)).**

It is the **read-only oracle** for the Hub v2 rebuild — the reference for "what v2 must still do," catalogued in the [behaviour inventory](../docs/planning/hub-v2/behaviour-inventory.md). It is **not** the Hub going forward.

## Rules

- **Read-only. Copy-with-correction, never import-and-patch.** The new Hub (under `hub/`) is written fresh; you may look things up here and re-implement them clean, but never import from here into `hub/`.
- **Do not develop here.** No new features, no fixes. It is frozen.
- **It will be deleted at Phase-4 cutover** ([Hub v2 plan](../docs/planning/hub-v2/README.md)), once `hub/` has replaced every area.

## Notes

- This tree was the entire repo-root Next.js app (`app/`, `components/`, `lib/`, `tests/`, config) before the move; history is preserved (`git mv`).
- It does **not** currently carry its own `package.json` — that split is deferred to the `hub/` scaffold step (ADR-U032). To run it standalone for reference, it would need its dependencies reinstated.
- The database substrate it speaks to (`supabase/migrations/`) stays shared at the repo root and **carries forward** to `hub/` (per the [substrate audit](../docs/planning/hub-v2/substrate-audit.md)).
