# Session bridge — the A-NTF walk is done, the gate is HELD, and W-05 is the thing to fix first

**Date:** 2026-07-27 (session 02) · **Wave:** Ferd · **Area:** A-NTF (Notifications) — **the area gate, now verdicted**
**Follows:** [`2026-07-27_01_-_A-NTF-MEASUREMENTS-DONE-COLD-LOAD-ACCEPTED-WALK-READY.md`](./2026-07-27_01_-_A-NTF-MEASUREMENTS-DONE-COLD-LOAD-ACCEPTED-WALK-READY.md)

---

## One-paragraph state

Stefan walked A-NTF live on the production stable domain. **Nine scenarios walked, eight findings, verdict written: HELD — not failed.** `main` at `6ab9cb9`, tree clean, no open PRs, discovery synced 0/0, dashboard refreshed (7 tabs, 734 files). Two PRs this session: **#311** (gate verdict, walk findings, script corrections) and **#312** (the W-09 design decision). **The gate now closes on one small remediation — W-01 and W-02 — plus the independently-owed items.** The most important thing found is not A-NTF's at all.

## The verdict

**HELD.** Gate document: [`../hub-v2/2026-07-27-notifications-area-gate.md`](../hub-v2/2026-07-27-notifications-area-gate.md). Every finding with file:line evidence: [`../hub-v2/2026-07-27-antf-walk-findings.md`](../hub-v2/2026-07-27-antf-walk-findings.md).

**N-C and N-D passed convincingly.** Scenario 7 is the best-evidenced result of any Phase-3 walk: with the membership category muted, two role changes demonstrably took effect and **no notification rows were written at all** — suppression proven at write time in the database, which is also why it costs no realtime. Live delivery, hidden-tab reconnect reconciliation, "absence means allowed", the non-suppressible account category, and the operator console's privilege boundary all held.

**Held on N-A**, which ships two defects against written acceptance criteria:

- **W-01** — inbox rows are inert; clicking does nothing. `FEAT-H030:88` names *"dropdown or inbox"* explicitly. `page.tsx:186` renders `<NotificationItem>` bare where `NotificationBell.tsx:276-281` wraps the identical component in a button.
- **W-02** — page-side mark-all leaves the bell badge stale. `FEAT-H030:72`. The sync contract exists (`NOTIFICATIONS_CHANGED_EVENT`); the page never dispatches it.

Neither is architectural. **Both escaped because the N-A E2E journey reaches the inbox only to assert history rendering** — it never clicks a row, never checks the badge after a page-side mark-all. **Extend that journey; do not add a parallel one.**

## Read this first if you are the next session: W-05

**A transient network failure signs the member out of every device.** `hub/lib/auth/session-guard.ts:69-89`. The hazard was anticipated and the guard *written* — it sits in a `catch` that never fires, because `supabase.auth.getUser()` **returns** its network error rather than throwing. So a hiccup takes the `if (error)` branch and is handled exactly like a revoked session. `signOut()` with no argument defaults to `scope: 'global'`, so one device's blip ends every session the member has. The ejection is silent: they land on *"Welcome Back — Sign in to continue your journey."*

It is **out of area** (session guard, PC-2 / Identity) so it cannot hold the A-NTF gate, and **must not be folded into A-NTF's remediation**. But it is the highest-severity thing found, it is arguably a launch blocker, and **it currently hides two A-NTF gate criteria** — the degraded-connection notice and the failed-save revert, both recorded **UNTESTED, not passed**. Fixing W-05 makes both testable.

## The W-09 decision (taken, PR #312)

Muting *"Group membership & invitations"* can strand an obligation the member never learns about — the mechanism is verified, the worst case is **not yet tested**. Stefan's call: **fix it properly, not surgically.**

The root problem is the category, which conflates **news** (*Alice joined*, *your role changed*) with **asks** (*you have been invited*). Rule adopted: *notices about your own account and access always reach you — and so do questions that only you can answer.* **Implementation is a registry split along asks-versus-news.** The surgical `action_type IS NOT NULL` exemption was **considered and rejected**: `invitation_received` carries no `action_type`, and that is the common case. Handle **with W-04** or the letter reaches the member and still goes nowhere. Home: the **DS-5 spec advance**.

## Everything else found

| ID | Grade | Summary |
|---|---|---|
| W-03 | seam | An answered row still commands the action, and hides the outcome. The body is server-authored and frozen, so an embedded call-to-action **cannot expire** — a consequence of the copy law, not a slip |
| W-04 | seam | A personal invitation arrives as a letter with no way to answer it and no pointer to where you can |
| W-07 | seam | Answering a notification does not refresh the page whose data it just changed. Same family as W-02, and **could ride the same fix** |
| W-08 | seam | The email-deferral line promises to honour a choice the member was never offered |
| W-06 | trivial | A stale comment claims a permission gate that the code correctly enforces |

## Two script errors, both corrected

1. **Scenario 6's premise was wrong.** It promised Accept/Decline on a *personal* invitation; `FEAT-PD014:40` says verbatim that personal invitations keep `invitation_received` *"unchanged (the MyInvitations path)"*. N-B brought exactly two answerable events into the inbox — nominations and acting-invitations — and the script conflated them. **The code matched its spec; the script did not.** Rewritten around a stewardship nomination.
2. **A stale Observer precondition** — Grace already held the role four scenarios assume she lacks. The script now says to re-verify role state against the DB rather than trust its cast table.

## Corrections I made in-session, worth knowing

- I claimed no notification existed for Grace's Nya gruppen #2 invitation and blamed migration timing. **Wrong** — I had filtered the query to `action_type IS NOT NULL`. The row exists; there is no historical gap.
- I proposed fixing an ungated "Hand over leadership" button. **Already gated** on `assign_roles` since a 2026-07-05 live-testing finding — I had quoted a stale comment instead of reading the code twenty lines above it. That became W-06.
- I told Stefan he was signed in as Dev Login for the first finding; the avatar said Stefan. Superseded, because the finding was then reproduced cleanly on Dev Login with a controlled count.

## Where the next session starts

0. **`doc-health-check` — RUN IT FIRST, before anything else.** Not "at the next cycle boundary", not "before A-ADM opens" — **the first task of the next session.** It has been owed across **four consecutive bridges**; every individual deferral was defensible and the pattern is not. It has slipped by *wording*, not by decision: each bridge filed it under a condition that never quite arrives. This entry removes the condition. Three sessions of triggers have accumulated (file creations and deletions, the gate/findings documents added here, the walk-script rewrite), and the tree should be clean before A-ADM opens a new area on top of it. **Deliberately scheduled rather than deferred, 2026-07-27.**
1. **W-05** — highest severity, unblocks two gate criteria. Own task, outside A-NTF.
2. **W-01 + W-02** — the gate's closing condition. One small cycle, with the N-A E2E journey extended.
3. **Still owed at the gate, independent of the walk:** NB-8 Mist-posture proof · W12 per-RPC verification (**A-NTF has no Appendix-A roll-up yet**) · U049 §8 Q1 adapter ownership · the email-deferral recording · the DS-5 spec advance (now carrying W-09) · the 937 ms warm ceiling-hugger.
4. **Then the task sweep** — `TASK-NC-01..04`, `TASK-NC-06`, `TASK-ND-01..05`, still **held** pending gate closure. `TASK-NC-05` must survive; its owed measurement is done, so re-check whether it can finally close. Deletion is a carve-out.
5. **Then A-ADM** — the sixth and last Phase-3 area, where [`TASK-OBS-01`](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md) lands at area open.

## Platform state after the walk

Clean. Preferences unmuted (one row platform-wide, an explicit allow), announcement realtime toggle still `false`, Dev Login still sole Steward of Nya gruppen #1, his inbox restored to its exact pre-walk state. **No synthetic notification rows were created** — seeding flipped existing rows back to unread, so there is no residue to clean up. **One deliberate change persists:** the twin group *"Nya gruppen 1"* is now stewarded by Grace and the previous Steward was removed from it — the accepted cost of walking Scenario 6 through a real nomination, in a group chosen because nothing else depends on it.

**Behaviour worth knowing, found en route:** accepting a stewardship nomination grants the **actual Steward role** *and* removes the nominator from the group entirely — the `leave_group` cascade verbatim. Handing over leadership means leaving, not being demoted.

## Close ritual

- [x] `npm run dashboard` — refreshed (7 tabs, 734 files)
- [x] Session bridge (this file)
- [x] Discovery sweep — synced **0/0**
- [x] PRs #311 and #312 merged, branches deleted, `main` at `6ab9cb9`, tree clean, no open PRs
- [ ] **`doc-health-check` NOT run — deliberately, and now SCHEDULED rather than deferred.** Two files were created this session, a named trigger; it is owed across **four consecutive bridges**. Running it at the tail of a long session would mean triaging its findings with the least room and the most fatigue — the "locally honest checkbox" failure mode this area's own retrospective named (learning 5). **It is item 0 of the next session, unconditional.** See "Where the next session starts".
