# Statements

Locked statements from the universe-discovery sessions, one per file.

- **ID / file:** `stmt:N` in `SNNN.md` (for example `stmt:26` in `S026.md`). `order:` gives the position in the session view, `session:` the session it was locked in, `held:` keeps Claude's paraphrase from the session verbatim.
- **Write policy:** `revisioned` (spec section 7). An edit keeps the number, increments `revision`, appends the previous text to `SNNN.history.md` and flags every edge touching the statement for review. Minor wording fixes carry no flag. "Append a clarifying statement" creates the next number with `refines:` pointing back.
- **Generated view:** `SESSION-VIEW.md`, all statements in order grouped by session with revision markers; rebuilt by the sweep, never edited by hand.
- **Import source:** the discovery log's `## N. Title` sections, through the importer's statement preset. The original is never modified by the importer.

Spec: [`../../thinking/2026-09-11_discovery-canvas-spec.md`](../../thinking/2026-09-11_discovery-canvas-spec.md), sections 5 and 7.
