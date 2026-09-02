# Session bridge — 2026-09-02 (4): addendum — SEC-02 held at #593, a thirteen-day regression found and its corrective held at #594, and the vault-backup incident

**Addendum to `2026-09-02_03`.** Everything after that checkpoint. Read this one first next session: two PRs are **held at the schema gate** and one editor hazard needs Stefan's hand.

## Held at the schema gate — named approval each ("ok merge N, apply the migration")

| PR | What | Red today | Apply + verify |
|---|---|---|---|
| **#593** TASK-SEC-02 — the table-grant lockdown | migration `20260902210000` (revoke DML/TRUNCATE/REFERENCES/TRIGGER from anon + authenticated on all 42 public tables; the `users` six-column UPDATE re-issued **column-exact**; default ACL for role postgres revoked); the gate `table-grant-lockdown.test.ts` (table catalog + column catalog + default ACL); two siblings adapted, one inverted, labelled | gate 3 of 4 cells red on today's grants; the adapted siblings red until apply | `node scripts/apply-migration-temp.js 20260902210000_…` → `test:integration:platform` (4/4) · `test:integration:groups` · `jest tests/integration/profile` |
| **#594** TASK-ANN-01 — restore the PC026 admin sight arm | migration `20260902220000` re-issues `get_group_announcements` byte-identical to PD019 T3 with the `OR (is_platform_admin() AND suspended)` arm restored in the personal branch; wielded limb untouched | **found, not caused:** `suspended-group-admin-access.test.ts` › *"get_group_announcements admits the admin"* red at main HEAD alone; `admin-suspended-content.spec.ts` red at the Announcements pane | apply → `test:integration:admin` · `test:integration:communication` · `playwright test admin-suspended-content.spec.ts wielded-announcements.spec.ts` (Q1) |

**Posture decision inside #593, for the nod:** FEAT-PC010's direct settable-column UPDATE on `groups` is closed (the Hub only ever used `update_group_settings()`); the DoR's default "no client DML" is taken. Sequences out of scope.

## The regression, plainly

On 2026-08-20 FEAT-PD019 tranche 3 re-issued `get_group_announcements` and its personal branch lost the FEAT-PC026 (ADM-G) arm. Since then a platform admin opening a **suspended** group's page sees the Announcements pane collapse to "This section could not be loaded"; forum and conversations kept working. Thirteen days on production. Caught by the **first full integration run since**, started tonight for TASK-INT-01's close — PC026's own cell did its job the moment it ran. The T3 migration's sibling sweep named only the announcement suites: exactly the class the platform tier's sibling-assertion rule and Q1 (#585, codified tonight) exist for. Corrective notes on FEAT-PC026 and FEAT-PD019 T3; task `TASK-ANN-01` (review, held).

## INT-01 — where it stands

`npm run probe:auth`: **0 ES256 flakes in 90 cycles** (baseline 5–8 %). Full integration run 1: **87/90 suites, 1 237/1 241** — the 4 reds are 3 pre-apply SEC-02 adaptations (they ran after my edits, on the un-migrated DB) + the ANN-01 regression. The ×2-consecutive-green bar is therefore **blocked on both gates**; resume after #593 + #594 apply. A second probe run is also owed.

## The vault-backup incident (Stefan's hand needed)

`.obsidian/` (Obsidian vault config with the **obsidian-git** plugin) appeared at the repo root mid-session. Two effects: (1) it rode into #589 through a stash-and-restore step — #590 untracked and gitignored it; (2) later, a commit **"vault backup: 2026-09-02 22:17:49"** authored by Stefan appeared on *local* `main` containing exactly the seven uncommitted SEC-02 files — a schema-gate item swept onto main by the editor. It was **not pushed**. Recovered: branched at the commit, amended with a real message and `--reset-author`, `git branch -f main origin/main`; PR #592 (the empty one it left) closed. **Ask:** disable obsidian-git auto-backup / auto-push for this vault, or move the vault off the repo — the next backup could push half-written work to `origin/main`. Memory saved.

## Decisions still with Stefan (unchanged)

H017-01 retire or keep (recommend retire, schema gate) · DB-4 sanction communication in Ferd or Eid (1–2 days, decomposition + schema gate) · journey pause (carry-over unless said otherwise) · the SEAL-01 message-level read rider (Ferd or Eid) · the two nods above.

## Merged tonight, for the record

#579 DBT-03 · #580 DBT-01 · #581 DoD typecheck · #582 backlog truth · #583 E2E-02 · #584 INT-03 + lint · #585 Q1/Q2 · #586 invite guard · #587 MIST-01 · #588 E2E-03 · #589 SEAL-01 Hub half · #590 untrack .obsidian · #591 bridge. Held: #593, #594. Closed empty: #592.
