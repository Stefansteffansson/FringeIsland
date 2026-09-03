# Session bridge — 2026-09-03 (4): #600 applied and merged; SEAL-02 built and HELD (#603); journey pause still HELD (#601); DB4-01's decision board put to Stefan

**Continuation of `2026-09-03_03`.** Stefan gave the first named approval ("ok merge #600") and said "then continue". Item 1 walked its gate and merged; item 3 was built and held; item 4 stopped at its DoR board, which is his to rule.

## Live state (verified at close — cite, don't re-derive)

- `main` = `origin/main` = discovery at the #600 merge (`a05e2e1e`) + this bridge. Two branches are pushed with open, **held** PRs, both branched from main, no shared code files (each inserts a CHANGELOG entry at the same spot — whichever merges second takes a one-line resolution).
- **#600 — TASK-H017-01 — DONE, applied, merged 2026-09-03T18:20Z.** Migration `20260903090000` applied + repaired; post-apply set green: absence suite 3/3, platform slice 8 suites 37/37, groups slice 15 suites 401/401, E2E `leadership-transfer` + `notifications-live` 10/10. `get_my_pending_nominations()` is gone from the substrate.
- **#601 — TASK-JRN-PAUSE-01 — HELD** (unchanged since `_03`; needs "ok merge #601"). Its post-apply set and the ADR-U047 rule 7 flag are in the PR body.
- **#603 — TASK-SEAL-02 — HELD** (needs "ok merge #603"). Migration `20260903110000`: `ds5_admin_conversation_detail` (DS-5, sealed body) under `admin_get_group_conversation_detail` (PC-4: admin wall 42501, closed-scope P0001, DM P0002, one `admin_audit_log` row per read `sealed_thread.read`); the member doors untouched (the admin is still refused by `get_conversation_detail` on a closed group — pinned). Hub: every preserved-thread row gains Open → a read-only, labelled thread view. Red at HEAD: 6 integration cells (PGRST202), the classification gate on the two unapplied contracts, 7 unit cells + the route suite module-absent. Green: unit 184 suites 1542/1542, lint 0/0, typecheck, build. Two SEAL-01 cells and the E2E "never a door" assertion adapted, labelled.
- **A dev server may still be running on :3000** from the #600 gate (started from `hub/`; used for the E2E sets). Kill the tree before starting another; a stopped background `npm run dev` leaves a wounded next-server (memory `taskstop-dev-server-epipe`).

## The two gates — what a named approval unlocks

Each PR body carries the apply + repair commands and the post-apply set. Run the two post-apply sets one after the other, never beside each other (one DB; the teardown sweep). Reviewer notes: #601 — read the two applied contracts' ACLs; ADR-U047 rule 7 is flagged for Stefan's amendment. #603 — the body must admit no client role (the migration's DO block checks it; PUBLIC tested as an element start); the wrapper no bare `=X/`, no `anon=X`.

## Item 4 — TASK-DB4-01 (sanction communication): the decision board, as put to Stefan

Facts on the substrate today (verified): the hold family is `rest_group` / `wake_group` (Steward, key `rest_group`), `admin_rest_group` / `admin_wake_group` / `admin_suspend_group` (PC023) and `admin_reactivate_group` (PC020) for groups; `admin_update_user_status(target_user_id, new_is_active)` for members (audit `member.suspend` / `member.reactivate`). **None takes a reason**; the PC026 moderate ceremony (`admin_moderate_group_forum_post(p_post_id, p_reason)`, 22023 when empty) is the precedent — `admin_remove_member_from_group` takes none either. The notification registry (PD013/PD016) is categories (`lawful_basis`, `interruption_grade`, `member_suppressible`) → kinds; PD020's BEFORE INSERT trigger expands a group-addressed row to the group's members. The member-facing surfaces say the state, never the why: `SuspendedGroupShell` ("no why"), `GroupDetailPanel`'s status label, `AccountStateView` ("suspended by an administrator, contact support").

The decisions (recommendation first; Stefan rules):

1. **Which transitions notify.** Recommend: all of the hold family, one kind each — `group_rested`, `group_woken`, `group_suspended`, `group_reactivated`, `account_suspended`, `account_reinstated`. Rest/wake are informational (the Steward's own act on their group); suspend/reactivate/reinstate are the sanction notices. Alternative: sanctions only.
2. **Recipients.** Group holds → every active member (one group-addressed row; PD020 fans it out). Member holds → the sanctioned member only (their personal group). No separate Steward kind.
3. **Where the reason lives.** Recommend three homes from one write: the audit row's metadata (history, admin-only), a member-readable column for the *current* hold (`groups.hold_reason`, cleared on wake/reactivate; `users.suspension_reason`, cleared on reinstate), and the notification body. The columns are what the wall and the label read — the audit log is PC-4-private.
4. **Who writes it.** Required for every admin sanction (suspend / reactivate a group, suspend / reinstate a member — the PC026 ceremony shape, 22023 when empty); optional for the Steward's own rest/wake (a note to their members).
5. **What the member sees.** Recommend verbatim, from one free-text field the ceremony labels *"shown to the group's members"* — never a closed category enum (the Ferd non-closure rule). The Privacy question (a reason can name a third party) is answered by the label on the ceremony and by the audited admin plane, not by a taxonomy; an admin-only internal note is Eid.
6. **Suppressibility.** `account` is already locked-on (N-D set `member_suppressible = false` on it) — the two member kinds ride it. The four group kinds need a home: recommend a new locked-on category `sanctions` ("Holds & sanctions", transactional, badge, `member_suppressible = false` — the FEAT-H033 posture); the alternative, `membership`, is suppressible today and would let a member mute a suspension notice.
7. **Dispatch home.** Re-issue the seven transition contracts to write the notification row + the reason (contract, not trigger: the reason and the audit row are already there; a status trigger would also fire on close/delete/exit). `admin_update_user_status` gains `p_reason` → DROP + CREATE (an added defaulted param makes a PostgREST overload), re-issue its grants. The sibling sweep is large: the suites naming these contracts are many (`group-availability-enforcement` alone is 117 cells) — every one grepped, each marked adapted or left (the ANN-01 lesson).
8. **Hub.** The four admin ceremonies + the Steward's Rest control gain the reason field; `SuspendedGroupShell`, the group status label and `AccountStateView` render the current reason; the bell renders the six kinds (no typed action — plain notices). FEAT-PC023 + FEAT-H038 No-gos amended with the dated ruling.

**Sequence after the rulings:** author the paired specs (a PC/PD spec for the registry rows + column + contract re-issues; an H spec for the ceremonies, the wall/label and the bell) to 4-ready → the build (12–16 h) → one schema gate.

## Not done — plainly

- **TASK-DB4-01:** board only; no spec, no code. Waits on the rulings above.
- **#601 and #603 post-apply E2E** (`journey-pause.spec.ts`; `admin-closed-threads.spec.ts` extended) have not run — they need the applied contracts.
- **ADR-U047 rule 7 amendment** (flagged in #601) — not written; a carve-out.
- **`ferd.md`** — still the placeholder; the Ferd close waits on the four.

## After the four: the Ferd close

Unchanged: write `ferd.md`, walk the quality gates (the deep-cold ADR-U043 pass needs Stefan's walking first), the "v2 is the Hub" verdict line, a ruling on CQ-014, the wave retro, then Eid kickoff.
