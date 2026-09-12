# Gaps

Gaps-register entries, one per file.

- **ID / file:** `gap:N` in `G-NNN.md` (for example `gap:12` in `G-012.md`).
- **Status:** `open`, `parked` or `resolved`, in frontmatter.
- **Write policy:** `editable`; the app rewrites the whole file.
- **Generated view:** `GAPS-VIEW.md`, grouped by status with the quick-index table; rebuilt by the sweep, never edited by hand.
- **Import source:** the gaps register's `**G-NN — Title**` entries, through the importer's gaps preset. The original is never modified by the importer.

Spec: [`../../thinking/2026-09-11_discovery-canvas-spec.md`](../../thinking/2026-09-11_discovery-canvas-spec.md), section 5.
