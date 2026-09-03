# Session bridge — 2026-09-03 (1): both schema gates applied on the named approval; INT-01's two full runs

**Continuation of `2026-09-02_04`.** Stefan: *"approve schema migrations"* — taken as the named approval for both held PRs. He also disabled the obsidian-git plugin (the community plugin toggled off, screenshot seen) — the vault-backup hazard is closed.

## Applied and merged, in order — each: apply → `migration repair --status applied` → the applied object read at the gate → the post-apply set → merge

| Migration | PR | Read at the gate | Post-apply set |
|---|---|---|---|
| `20260902220000` TASK-ANN-01 — restore the PC026 admin sight arm on `get_group_announcements` | **#594** merged 05:00 | SECURITY DEFINER; anon EXECUTE false; authenticated true; the arm present in the live body | admin slice **173/173** (the red cell green) · communication **157/157** · E2E `admin-suspended-content` + `wielded-announcements` **7/7** — the Announcements pane is back |
| `20260902210000` TASK-SEC-02 — the table-grant lockdown | **#593** merged 05:09 (rebased over #594; both changelog conflicts resolved by keeping both entries) | table-level DML for client roles = **0** · column-level = exactly one (`users` · authenticated · UPDATE · the six profile columns) · SELECT untouched · default ACL for `postgres` on tables now `anon=rm, authenticated=rm` | platform **37/37** (the gate 4/4 flipped) · groups **404/404** (adapted + inverted cells green) · profile **14/14** · E2E `groups` + `profile` **7/7** |

Both tasks → `done` with the gate records inside. The thirteen-day production regression (admins locked out of a suspended group's announcements) is closed.

## INT-01 — the close, in flight at this bridge

Chain started 05:10 on main (post-gates): full `test:integration` run A → `probe:auth` (second run) → full run B. Run 1 of yesterday was 87/90 with only the pre-apply reds; both causes are now applied.

**Outcome:** runs A and B each **1 241/1 245** — the same four cells both times, all ADR-U038 direct-UPDATE proofs on tables with no write policy (`forum_posts` ×2, `conversation_participants`, `notifications`) that asserted RLS's silent zero rows and now meet the grant's 42501 first: **SEC-02's sibling sweep had grepped only the policy-bearing tables.** Adapted with labels, the honest sweep rule recorded in the task, merged as **#596** (three suites 62/62). Run A also had one transient: `account-state-read` afterAll timed out at 30 s in `cleanupTestUser` (the Management-API throttle tail); absent in B. Second probe: **0/90** flakes. Then on main: **full run C 91/91, 1 245/1 245 · full run D 91/91, 1 245/1 245**, back to back, zero ES256 signatures. **TASK-INT-01 → done.**

## Where the finish bucket stands after this bridge

Every row that needed no decision is closed: DBT-01/02/03, E2E-02, E2E-03, INT-01, INT-03, MIST-01, SEAL-01 (Hub half), SEC-02, the invite guard, the lint warnings, the Q1/Q2 rules, the DoD typecheck line, and the found-not-caused ANN-01. The **four decisions** (H017-01 · DB-4 · journey pause · the SEAL-01 read rider) are the only open rows before the Ferd close.

## Still with Stefan

H017-01 retire or keep · DB-4 in Ferd or Eid · journey pause · the SEAL-01 message-level read rider. Then the Ferd close itself (wave file, DoD walk, retro, Eid kickoff — `2026-09-02_02`'s answer stands).
