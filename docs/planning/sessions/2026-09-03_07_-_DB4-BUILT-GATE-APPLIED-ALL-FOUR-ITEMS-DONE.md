# Session bridge — 2026-09-03 (7): DB-4 built on all three tiers, the gate applied on the pre-build blessing, the four leftovers items done; the Ferd close is next

**Continuation of `2026-09-03_06`.** Stefan: "ok continue please", then mid-turn: "you have my blessing to do the migration (ref. Migration (one schema gate, held for your named approval))". The blessing was read as the named approval for the DB-4 gate — apply and merge — given before the migration existed; both migrations were applied under it and the fact is written into the migration header, the specs, the task and the PR. PR #608.

## Live state (verified at close — cite, don't re-derive)

- **TASK-DB4-01 — BUILT**, PR #608 (see the merge line at the end). Migrations `20260903120000_db4_pc030_pd021_sanction_communication.sql` (the gate as specified) and `20260903130000_db4_pc030_notice_titles_are_core_literals.sql` (the same-day corrective) are applied and repaired on the one database. [FEAT-PD021](../../platform/domain/features/FEAT-PD021-sanction-notification-kinds.md), [FEAT-PC030](../../platform/core/features/FEAT-PC030-sanction-communication-contracts.md), [FEAT-H049](../../products/hub/features/FEAT-H049-sanction-communication-surfaces.md) are `6-done` with Implementation notes; the L4 rows (governance-specification, communication, hub SPECIFICATION) and the three feature indexes say so; the three CHANGELOGs carry the entry; the task is at `review` with the build record.
- **The numbers, once:** integration 23/23 red at HEAD → 24/24 green (two test-side corrections: the admin's act reaches the Steward too; a recovery hook + a self-contained cell); sibling sweep 408/410 on the first pass (ten suites adapted with a labelled reason, 33 lines; the PC023 STORY-7 key pin gains `hold_reason`; the gate finding below) → post-corrective set 152/152; unit 39 red at HEAD → 1616/1616; lint / typecheck / `next build` 0; E2E 9/9 (the new arc + the two adapted ceremony specs), the arc's second run and the notifications + account slices in the PR's merge comment.
- **Gate reads on the applied objects:** nine functions `{postgres, authenticated, service_role}` only (re-read after the corrective — unchanged); `groups` relacl `anon=m, authenticated=m`; both client roles' column SELECT lists are the 14 pre-existing columns without `hold_reason`; no client grant on `users.suspension_reason`.
- `ferd.md` is still the placeholder — the Ferd close waits on it. The TASK-E2E-04 smoke-job recommendation is still Stefan's ruling to take.

## Findings worth carrying

- **The invocation-axis gate earned its keep post-apply, and the grep sweep could not have caught it.** The first issue's five fan-out bodies read the notice title from `notification_kinds` (DS-5) — `[core-to-domain]` on all five. ADR-U047 holds (Core never depends upward on Domain); the notice copy is the writing contract's literal (the `pause_member` precedent), pinned equal to the registry label by a cross-check cell. Rule of thumb, now in memory: a Core contract never `select`s a DS registry, even for a label; run the platform slice in the post-apply set before the PR.
- **A decomposition gap the build found:** FEAT-H049 named six ceremonies; the H039 bulk bar composes `admin_update_user_status` and would have refused every row post-migration. Shaped as one required reason per batch — the seventh ceremony — and recorded in the spec's notes, not by rewriting the story list.
- **Two test-side lessons:** (1) "every active member hears" includes the Steward when the *admin* acts — the recipient set depends on who the actor is, and the first cell assumed the Steward's own act; (2) a cross-cell state dependency plus an `afterEach` recovery hook is a contradiction — make the dependent cell self-contained.
- **`get_own_notifications.category` is the category key, not the label.** PD021's wording described the same fact; the pin is on the key.
- **A pre-build blessing is a named approval when it names the gate.** It was given before the file existed; the corrective migration rode the same approval and says so. If that reading is wrong, the correction is one revert of #608's merge — the migrations themselves are applied either way.

## Not done — plainly

- **The Ferd close** — `ferd.md` is the placeholder; the wave DoD walk has not started.
- **The E2E smoke job in CI** (TASK-E2E-04's recommendation) — a ruling for Stefan, not taken.
- **DB-4's own No-gos stand:** no reason on closure / deletion / removal; no reason edit after the fact; no push or email beyond the bell; no Steward-side suspension; no reason taxonomy; no internal admin-only note.

## Merge line

- **PR #608 merged 2026-09-03T21:14Z** (`3ace4ea7` on `main`) under the pre-build named approval; the arc's second E2E run 2/2, the notifications + account slices 219/221 → two more pins adapted (FEAT-PC004 key set, FEAT-PD016 locked-on set) → 31/31 on re-run. TASK-DB4-01 → `done`. The four leftovers items (H017-01, JRN-PAUSE-01, SEAL-02, DB4-01) are all merged; next is the Ferd close.
