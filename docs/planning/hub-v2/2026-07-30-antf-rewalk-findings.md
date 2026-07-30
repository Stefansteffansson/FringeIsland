# A-NTF re-walk findings — 2026-07-30

The second live walk of the Notifications area, run against the fixes that landed after the [first walk](./2026-07-27-antf-walk-findings.md). Its purpose was to confirm those fixes on the deployed site and to reach the scenarios the first walk could not.

**Environment:** `fringe-island.vercel.app`, 2026-07-29 → 2026-07-30.
**Preceded by:** the A-NTF gate closing, the three exit-checklist lines being cleared (PR #327), and W-03/W-07/W-08 shipping (PR #328).

> **Status: complete.** Every finding below is either fixed and merged, or open and named with a reason. Nothing here is waiting on a decision I could have made myself.

---

## Outcome in one line

**The fixes hold.** Eight prior findings confirmed live, four new defects found and fixed, two hygiene items found (one fixed), one capability gap identified as already-planned-and-unbuilt, and **two errors in the walk script itself — both mine**.

---

## Confirmed on the deployed site

Each of these was a finding or a blocked scenario from 2026-07-27. All were observed working.

| Prior finding | Confirmed how |
|---|---|
| **W-08** — email line pointed at a choice never offered | Reads *"the choices above cover every channel, so they will apply to it the day it arrives"* |
| **W-03 #1** — the imperative that could not expire | A fresh nomination reads *"You have been nominated as Steward of Nya gruppen #2."* — no *"Accept or decline within 7 days"*, with **Respond by 8/6/2026** rendered separately |
| **W-03 #2** — outcome-blind chip | Gracy's older row reads **`Declined`**, the new one **`Awaiting response`** — not "Handled" |
| **W-04** — the letter that led nowhere | Accept/Decline render **on the notification itself**, in the bell |
| **W-05** — a dropped connection ejected the session | Went offline; **stayed signed in**. This is what blocked Scenarios 5 and 8 last time |
| **NTF-9 degraded notice** | `reconnecting…` appeared while sockets were down and **cleared on reload** — the notice Scenario 5 could never reach |
| **Hand-to-FringeIsland (MEM-7)** | Dev Login left; the **DeusEx system group holds Steward Role Template**; group active, not headless |
| **W-07 / NTF-6 dispatch** | Gracy accepted from the bell; server state landed exactly — Nya gruppen #2 now has Gracy alone, holding Steward |

**One honest limit:** W-07's *without-reload* repaint was not explicitly reported back. The transfer itself is confirmed in the database and in Dev Login's removal notifications; the live-repaint half rests on the unit coverage in PR #328, not on an eye at the screen.

---

## New findings

### RW-01 — the `asks` category inherited copy written for `account`
**Grade: SEAM, copy** · **FIXED** (PR #332)

*"Questions waiting for your answer"* carried the subtitle *"Always on — these tell you about your own account and access."* That sentence was written for `account` when it was the only non-suppressible category; board **GB-3** made `asks` the second, and it silently inherited it.

**This is W-08 a third time** — copy pointing at the wrong referent because the set it described grew underneath it. Worth naming as a pattern rather than a coincidence: *any* sentence written about "the members of a set" becomes a liability the moment the set can grow.

Not fixed with a `category → sentence` map: the panel's own header says it renders entirely from the payload and holds no category list. The line is now true of every non-suppressible category. **The category-specific *why* belongs in the registry** beside `member_suppressible` — a `RETURNS TABLE` change to a live DS-5 contract, recorded rather than smuggled into a copy fix.

### RW-02 — a failed preference save showed the member "Failed to fetch"
**Grade: SEAM, copy** · **FIXED** (PR #332)

Going offline and flipping a switch rolled the switch back correctly, then put a raw browser internal in a red banner.

The fix is a seam, not a blanket rewrite: a server that **answered** with a reason is quoted verbatim (the H030 never-re-word law), and only failures that never reached a server get new words — there is no server sentence to preserve in that case.

### RW-03 — the inbox page never listened for live arrivals
**Grade: DEFECT** · **FIXED** (PR #331)

`/notifications` **dispatched** `notificationsChanged` (the W-02 fix, so the bell keeps up when you mark-all there) but **never listened** for it. One-directional wiring: a notification arriving live updated the bell and left the page missing it entirely.

Reported as *"the full list is sorted differently from the bell"*. It was not a sort — both surfaces read the same contract (`created_at DESC, id DESC`), and the three 9:35:35 PM rows were **absent**, not reordered. **This is W-02's mirror image**, and it is the second half of a contract that shipped with only one half wired.

Caught mid-fix and worth keeping: the first version made the page **answer its own announcement**, overwriting its optimistic flip with a read taken mid-write. Two existing tests went red and named it.

### RW-04 — the member count contradicted the list beneath it
**Grade: SEAM** · **FIXED** (PR #331)

A caretaker-held group read **"1 member"** directly above a list of two rows.

The count was **right**. ADR-U041 §5 keys both the count and the Close affordance on `non_system_member_count` because *the caretaker is never load-bearing* — counting FringeIsland would mean a platform-held group never reaches "last member" and Close breaks. The screen simply never explained the second row. It now names the caretaker instead of inflating the count.

### RW-05 — a group handed to FringeIsland is invisible to the platform
**Grade: GAP, not a defect** · **OPEN — this is ADM-8**

After the handover, the DeusEx user's *My Groups* reads **"No groups yet."** That is correct behaviour: stewardship went to the **DeusEx system group**, not to any person, and *My Groups* lists the viewer's own personal-group memberships.

Nothing is broken in the substrate — the DeusEx user holds both `act_as_group` and `manage_all_groups` on that system group, and the group detail page renders. **What is missing is a list.** Three real groups are platform-stewarded today with no surface that enumerates them.

That surface is **ADM-8** (*"Render group administration view — cross-platform group list and detail"*), with **ADM-9** for reassign. Both are A-ADM and unbuilt.

**Why it matters for sequencing:** the walk found the *consequence* of the gap — **a handed-over group becomes invisible to the only party who can now act on it.** That is an argument for putting ADM-8 early in A-ADM rather than after the moderation queue.

### RW-06 — a test kind was living in the live registry
**Grade: HYGIENE** · **FIXED** (migration `20260730200000`)

`na_test_kind_mrzenort` ("N-A open-registry probe") sat in `notification_kinds` under `membership` since 2026-07-24. `notification_kinds` is a **catalogue, not scratch space**: every category listing and every "what does this switch control" answer reads it.

Retired narrowly — one named kind, no pattern-matching for test-looking names, because that sweep is how a real kind gets deleted by a regex someone trusted. `membership` 7 → 6; every category still populated.

### RW-07 — 39 E2E groups inside the DeusEx system group
**Grade: HYGIENE** · **OPEN**

The DeusEx system group is an active member of **39** `E2E GF Nya gruppen …` groups — Playwright fixture detritus. Same family as [`TASK-INT-03`](../backlog/tasks/TASK-INT-03-test-fixture-orphaned-personal-groups.md), which closed the *integration* suites' leaks; this is the E2E tier, which was never audited.

### RW-08 — `reconnecting…` says the same thing for two different conditions
**Grade: SEAM** · **OPEN, low**

`hub/lib/realtime/manager.ts:127-129` maps `CHANNEL_ERROR` to `reconnecting`, and its own comment records why that is lossy:

```
// A private-channel authorization refusal surfaces as CHANNEL_ERROR.
```

So *"you may no longer see this"* and *"the socket dropped"* render identically. On this walk the condition **was** transient and recovered on reload, so nothing was mis-told — but a permanent refusal would promise a recovery that never comes.

I initially leaned toward the refusal explanation and **was wrong**; Gracy seeing it as an active member was the clue, and the reload settled it. Recorded because the wrong lean is instructive: the label cannot distinguish the two, so neither could I.

---

## Two errors in the walk script — both mine

Recorded at least as carefully as the product findings, because a walk that tests the wrong thing wastes the walker's time and can look like a defect.

### S-01 — I told the walker to mute the wrong category
Step 5 said *mute "Stewardship updates", then assign a role*. But `role_assigned` / `role_removed` live in **`membership`**, not `stewardship`. Muting stewardship cannot silence them, so the test was incoherent and the "failure" was correct behaviour.

The correct instruction is *mute "Group & membership updates"*. `stewardship` is not a dead switch — it holds `stewardship_required` / `stewardship_transferred`, 304 rows in 30 days.

### S-02 — I verified a precondition and then wrote a step that destroys it
I confirmed *"Dev Login is sole Steward of Nya gruppen #1"* as the precondition for step 7, and then placed step 5 — which assigned Gracy the **Steward** role in that same group — ahead of it. That made Dev Login no longer sole Steward, so `nominate_steward` correctly refused and step 7 could not run.

The platform behaved perfectly and said so in red: *"you are not the sole active Steward — regular leave applies."*

**The lesson generalises:** verifying preconditions at the top of a walk is not enough if a later step mutates them. Preconditions need to be checked **per step**, or steps ordered so the destructive ones come last.

---

## One open design question, for the owner

**Being made a Steward is filed as `membership` news.** So a member who mutes *"Group & membership updates"* to stop routine churn also stops hearing that they were made a Steward of something.

That may well be right — it is a membership change. But it is the kind of default worth choosing deliberately rather than inheriting. No action taken.

---

## State at close

| | |
|---|---|
| Merged this session | **#327 · #328 · #329 · #330 · #331 · #332** |
| Migrations applied | `20260728190000` · `20260728200000` · `20260730200000` |
| Unit | **1033/1033** (133 suites) |
| Integration | **715/715** (58 suites) · notifications **100/100** · platform **15/15** |
| `next build` | clean · eslint **0 errors** |
| Orphaned personal groups | **689**, every one attributing something that survives |
| Notification kinds | **20**, no test artefacts |

**Open and carried forward:** RW-05 (ADM-8 sequencing), RW-07 (39 E2E groups), RW-08 (the `reconnecting…` conflation), and the registry-homed *why* for non-suppressible categories.
