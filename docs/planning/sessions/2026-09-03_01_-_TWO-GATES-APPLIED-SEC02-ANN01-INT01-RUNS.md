# Session bridge — 2026-09-03 (1): both schema gates applied on the named approval; INT-01's two full runs

**Continuation of `2026-09-02_04`.** Stefan: *"approve schema migrations"* — taken as the named approval for both held PRs. He also disabled the obsidian-git plugin (the community plugin toggled off, screenshot seen) — the vault-backup hazard is closed.

## Applied and merged, in order — each: apply → `migration repair --status applied` → the applied object read at the gate → the post-apply set → merge

| Migration | PR | Read at the gate | Post-apply set |
|---|---|---|---|
| `20260902220000` TASK-ANN-01 — restore the PC026 admin sight arm on `get_group_announcements` | **#594** merged 05:00 | SECURITY DEFINER; anon EXECUTE false; authenticated true; the arm present in the live body | admin slice **173/173** (the red cell green) · communication **157/157** · E2E `admin-suspended-content` + `wielded-announcements` **7/7** — the Announcements pane is back |
| `20260902210000` TASK-SEC-02 — the table-grant lockdown | **#593** merged 05:09 (rebased over #594; both changelog conflicts resolved by keeping both entries) | table-level DML for client roles = **0** · column-level = exactly one (`users` · authenticated · UPDATE · the six profile columns) · SELECT untouched · default ACL for `postgres` on tables now `anon=rm, authenticated=rm` | platform **37/37** (the gate 4/4 flipped) · groups **404/404** (adapted + inverted cells green) · profile **14/14** · E2E `groups` + `profile` **7/7** |

Both tasks → `done` with the gate records inside. The thirteen-day production regression (admins locked out of a suspended group's announcements) is closed.

## INT-01 — the close, in flight at this bridge

Chain started 05:10 on main (post-gates): full `test:integration` run A → `probe:auth` (second run) → full run B. Run 1 of yesterday was 87/90 with only the pre-apply reds; both causes are now applied. Outcome recorded below when it lands.

## Still with Stefan

H017-01 retire or keep · DB-4 in Ferd or Eid · journey pause · the SEAL-01 message-level read rider. Then the Ferd close itself (wave file, DoD walk, retro, Eid kickoff — `2026-09-02_02`'s answer stands).
