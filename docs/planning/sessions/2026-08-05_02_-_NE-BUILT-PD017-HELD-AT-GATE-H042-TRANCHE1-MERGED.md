# Session bridge — N-E built: PD017 held at the schema gate, H042 tranche 1 merged

**Date:** 2026-08-05 (session 10, continued) · **Wave:** Ferd · **Cycle:** N-E (**built — held at the gate**)
**Follows:** [`2026-08-05_01_-_NE-DECOMPOSED-BOTH-SPECS-4-READY-U051A2-HELD.md`](./2026-08-05_01_-_NE-DECOMPOSED-BOTH-SPECS-4-READY-U051A2-HELD.md)

---

## READ THIS FIRST — the state, and what unlocks on the nods

1. **Two PRs stand HELD for Stefan's NAMED approvals; nothing else blocks the cycle close:**
   - **#426** — the PD017 migration (`20260805120000_n_e_bell_answerable_personal_invitations.sql`) + the red gate suite. Unlock: "ok merge 426". Apply commands are in the PR body (apply → repair → list → targeted suite → full integration sweep).
   - **#423** — ADR-U051 Amendment 2 (docs-only; the "invitation path untouched" clause superseded). Unlock: "ok merge 423". Independent of #426.
2. **Merged this session:** #422 (decomposition) · #424 (bridge _01) · #425 (tasks + 5-in-cycle) · **#427 (H042 tranche 1)** — the `invitation-response` BFF route + courier, the "Withdrawn" chip (fact-only, leak-defense cell), the two-doors `refreshNavigation` listeners (MyInvitations + groups list), and the WS-4 landing focus (`ANSWER_PATHS` → `/groups?focus=invitations`, kept deliberately — the W-04 dead-end rationale is in-file; scroll + transient highlight, plain degrade). Inert-but-safe pre-gate: nothing dispatches to the route until the platform serves `dispatch_segment`.
3. **The numbers:** gate suite at head **11 red / 3 labelled-green of 14** (the labelled greens: the server-copy pin + two refusal cells, green-at-red by nature — teeth post-apply, the H031 precedent) · Hub tranche red-first **6 red → green** · full unit **1297/1297** · lint 0 errors · `next build` green · ownership direction rule 12/12 with the two new DS-5 manifest rows.
4. **Post-apply work (the remainder of TASK-NE-01/-02), in order after "ok merge 426":** apply + repair + list · targeted suite 14/14 · full integration sweep (`--runInBand`) with the header's sweep list re-checked · **the one E2E journey covering WF-1 + WS-4** (invite → bell Accept/Decline → groups list updates → landing focus; plus the cancelled-while-standing "Withdrawn" leg) · the `notifications.spec.ts:183` **first-button watch** (armed rows gain buttons; named in TASK-NE-02) · then the 6-done batch (Implementation notes both specs, maturity + L4 + README rows, CHANGELOG ×2 — root cycle entry + hub member register; **no platform-core entry** — this cycle touches no Core substrate), plain-English walkthrough, cycle-close bridge.
5. **Design facts a resuming session must not re-derive:** convergence lives in the **additive** `converge_invitation_notifications()` trigger pair on `group_memberships` (beside the untouched notify_* triggers; ADR-U048 classification; no Core body edits) · `cancelled` withholds `resolved_by_name` (the chip renders "Withdrawn", never an actor — surface defense-in-depth cell exists) · keying strictly on `action_data->>'membership_id'` · backfill arms only live-pending; orphans stay passive · the respond wrapper observes convergence (same transaction), never performs it.

## Standing items (carried)

TASK-E2E-01 (three flake specs; fix due at next boundary) · TASK-E2E-02 · AB-6's docket (Tier-1 finding · admin-plane deep-cold U043 pass · sealed-threads sight question) · the deferred Eid piles · G-3 journeys deferral. After N-E closes: **AB-6**.

## Close ritual (this step)

- [x] Red-first at every tier this session touched; all sweeps green at the tranche boundary
- [x] Sibling sweeps enumerated (migration header + TASK-NE-02 watch); adaptations labelled
- [x] Discovery synced after every merge; checkout on main, clean
- [x] Session bridge (this file)
- [ ] Dashboard + CHANGELOGs + doc-health: owed at cycle close (post-gate), not at the hold
