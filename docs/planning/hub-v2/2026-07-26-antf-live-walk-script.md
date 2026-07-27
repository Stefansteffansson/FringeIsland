# A-NTF live-walk script (Stefan) — 2026-07-26

Companion to the [area retrospective](../retrospectives/retro-2026-07-26-notifications-area.md), whose **gate section is deliberately open** and waiting on this walk. Every account, group, role and number below was **verified live against the dev DB on 2026-07-26** — not inferred from specs.

**Environment:** production stable domain `fringe-island.vercel.app` (the A-COM/A-JRN gate precedent). Walk the deployed app, not localhost — Scenario 1 is a gate measurement and only counts on production.

---

## Read this first

1. ~~Scenario 1 must be first, before you sign in anywhere.~~ **No longer applies — the measurements were taken headlessly on 2026-07-27. Sign in freely and start at Scenario 2.**
2. **Do not pause, delete or decommission any account.** That is how Alice died in the A-COM walk, and she is why this script has no fourth cast member.
3. **Record as you go** using the template at the bottom. "Felt wrong but I can't say why" is a valid and useful finding — say it anyway.
4. Anything marked **⚑ EXPECT** is a specific prediction. If reality differs, that is a finding even if it looks harmless.

---

## Cast — all verified active in the DB, 2026-07-26

| Window | Account | Email | Role in this walk |
|---|---|---|---|
| **A** (normal browser) | **Dev Login** | `dev-login@fringeisland.test` | Your main seat. **Steward** of Nya gruppen #1, #2, #3 and "Nya gruppen 1". **46 unread** → the bell should read `9+`. |
| **B** (incognito) | **Grace Hopper** | `grace1@fringeisland.test` | The other human. Active **Member + Guide** of Nya gruppen #1. Has a **pending invitation to Nya gruppen #2**. **4 unread.** |
| **C** (2nd incognito, scenarios 9–10 only) | **DeusEx** | `deusex@fringeisland.com` | The only platform admin. Needed for the nudge console and its cost line. |

**Not available:** `alice@fringe.test` is **decommissioned** (`[Deleted User]`, member-origin) — she walked the A-COM departure ladder. Your own `stefan.steffansson@yahoo.com` works and has 14 unread if you want a fourth pair of eyes, but nothing here needs it.

**Direct links**

| What | Path |
|---|---|
| Nya gruppen #1 | `/groups/8781a79c-3a14-4fc5-8f6a-56bb7fcd1f8a` |
| Nya gruppen #2 | `/groups/96317e28-8bc0-470a-b323-dbad6c5e2465` |
| Nya gruppen #3 | `/groups/3c0a1cfd-13f7-49e8-b841-08ff99832163` |
| Notifications inbox | `/notifications` |
| Notification preferences | `/notifications/preferences` |

**Starting state — verified: nobody on the platform has a single preference row.** Every switch, for every account, should read **ON**. If you find one already off before you touch anything, stop and tell me — the "absence means allowed" default is broken.

> **CORRECTED 2026-07-27 — a stale precondition.** Scenarios 4, 5, 7 and 10 instruct you to *assign* Grace the **Observer Role Template** on the grounds that she has Member and Guide but not Observer. **She already holds it.** Every such sequence must therefore begin with a **remove**, then an assign. **Re-verify role state against the DB before walking — do not trust this cast table's role lists.** The account, group and permission facts held up; only the role list had drifted.

---

## 1 — ~~The two owed gate measurements~~ — **DONE 2026-07-27, SKIP THIS SECTION**

> **You no longer need to do this, and you no longer need to protect the cold window.** Both measurements were taken headlessly on production — full record: [`2026-07-27-antf-gate-measurements.md`](./2026-07-27-antf-gate-measurements.md). **Sign in whenever you like and start at Scenario 2.**
>
> What was found, so you know what to expect as you walk: **warm and semi-warm are fast** (272–402 ms everywhere) — but the **first authenticated page you open after leaving the tab idle 20+ minutes will take ~5.5 seconds**. That is a known, recorded FAIL against the 2.5 s budget, accepted as a labelled pre-launch exception. It is **not page-specific** — whichever page is first pays it. So if your very first click of the morning feels slow, that is the known number, not a new bug. Everything after it should feel instant.
>
> One thing your eyes can still add that the harness could not: **B6 judgement** — where a load takes 1–3 s, is there a **skeleton rather than a spinner**? And does the ~5.5 s first load show *anything* useful, or a blank page? Note it under Scenario 2.

<details>
<summary>Original measurement instructions (superseded — kept for the record)</summary>

### The two owed gate measurements (COLD — DO THIS FIRST)

These are the last two blocking items on the A-NTF gate. **≥ 20 minutes of zero traffic** must have passed on production — no page, no API, no background tab. Both are `n=1` and honestly labelled as such; that is the ratified depth call, not a shortcut.

1. **Before signing in**, open `/groups` as the day's first hit. Count the wait to *usable content*, not first pixel. Record it. **⚑ EXPECT B2 ≤ 2.5 s.** *(This is N-C's owed "after" number — N-C removed a dead nominations read from this page's first paint.)*
2. Sign in as `dev-login@fringeisland.test` if bounced. Record the sign-in → content time. **⚑ EXPECT B1 target 2.0 s, ceiling 2.5 s.**
3. Reload `/groups` ×3. **⚑ EXPECT B3 ≤ 1.0 s each.** *(A-COM measured 941–993 ms here — hugging the ceiling. If yours is worse, that's the fan-out seam getting louder.)*
4. Now open `/notifications/preferences` for the first time ever. Record it. **⚑ EXPECT B2 ≤ 2.5 s.** *(N-D's owed measurement — a brand-new page.)*
5. Reload it ×3. **⚑ EXPECT B3 ≤ 1.0 s.**
6. **B6 check** on all of the above: under 1 s needs no indicator; 1–3 s must show a **skeleton, not a spinner**; over 3 s is a defect regardless of the number.

> If the 20-minute idle wasn't real, say so and label the numbers *shallow-cold*. A mislabelled cold number is worse than a missing one.

</details>

---

## 2 — The bell and its count (N-A)

1. A: look at the header bell. **⚑ EXPECT a badge reading `9+`** (you have 46 unread).
2. Click it. **⚑ EXPECT the most recent 15, unread first.**
3. Click one notification that points somewhere. **⚑ EXPECT** it marks read *and* navigates. The badge should drop **immediately**, not after a reload.
4. Open the bell again, click a notification that points nowhere. **⚑ EXPECT** it marks read and you **stay put** — no dead navigation.
5. Hit **mark all**. **⚑ EXPECT** the badge clears at once and stays clear on reload.

> The badge decrements optimistically and rolls back on failure. You can't easily force a failure here — just note if the count ever disagrees with what you can see.

---

## 3 — The inbox and its history (N-A)

1. A: open `/notifications`. **⚑ EXPECT** a full page, not the 15-item dropdown. **v1 had no history page at all** — this is the thing that didn't exist.
2. Page back as far as it goes. **⚑ EXPECT** keyset pagination — no duplicated rows, no rows skipped at a page boundary. Duplicates at the seam are the classic keyset bug; look for them.
3. Find any notification that expects something of you. **⚑ EXPECT** a status chip: *Awaiting*, *Handled*, or *Expired*.
4. **⚑ EXPECT** every row to render as *something*, even if the surface doesn't recognise its kind. A blank or missing row is a finding.

---

## 4 — Live delivery (N-C)

1. A: sit on `/notifications` and **do not touch the keyboard**.
2. B (Grace, incognito): sign in, open Nya gruppen #1.
3. A: in a second tab, go to Nya gruppen #1 → members → **Grace** → assign her the **Observer Role Template** (she has Member and Guide; Observer she does not).
4. B: watching the bell. **⚑ EXPECT the count to rise within ~1–2 s with no reload and no navigation.**
5. **⚑ EXPECT no content to arrive over the wire** — the socket carries a hint only. You can't see this directly; what you *can* check is that the new item is fully rendered and correct, meaning it was fetched through the normal door.

---

## 5 — Reconnect reconciliation and the degraded notice (N-C)

1. B: with the bell visible, kill the network (DevTools → Network → Offline, or turn off wifi).
2. **⚑ EXPECT the bell to say, quietly, that it isn't live.** It must not sit there looking current while being stale. *This is the part most likely to be wrong — look closely at the wording and whether it's noticeable-but-not-shouty.*
3. A: while B is offline, remove Grace's Observer role and assign it again.
4. B: restore the network. **⚑ EXPECT** the degraded notice clears **and** the missed notifications appear — caught up, not lost. Losing the connection must cost latency, never data.
5. Repeat with a **hidden tab** instead of offline (switch tabs for ~30 s while A triggers something). **⚑ EXPECT** the same catch-up on return.

---

## 6 — Typed actions: answer where you were asked (N-B)

> **CORRECTED 2026-07-27 — the original premise was wrong.** This section used to say Grace's pending **personal** invitation to Nya gruppen #2 would carry Accept/Decline in the inbox. It does not, and never should: [`FEAT-PD014`](../../platform/domain/features/FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md) line 40 states verbatim that a **personal invitation** keeps `invitation_received` *"unchanged (the MyInvitations path)"*. N-B brought exactly **two** answerable events into the inbox — **stewardship nominations** and **group-of-groups acting-invitations** — and the old script conflated nominations with personal invitations. **The code matches its spec; the script did not.** Walked in corrected form on 2026-07-27; see the [gate document](./2026-07-27-notifications-area-gate.md).

**You need a live, unresolved actionable row, and the walk accounts may not have one.** Check first — only `stewardship_nomination` and `acting_invitation` are actionable. The cheapest generator is a **fresh stewardship nomination**, created through the UI so the real dispatch path is exercised.

> ⚠️ **Know the cost before you click.** Accepting a nomination grants the **actual Steward role** *and* **removes the nominator from the group entirely** (the `leave_group` cascade verbatim — handing over leadership means leaving, not being demoted). Declining sends the offer to the next-ranked nominee, and with a sole nominee runs into the all-decline fallback to FringeIsland. **Either answer changes who owns that group — so nominate in a group nothing else in this walk depends on.**

1. A (a **sole** Steward of the chosen group): open the group → **"Hand over leadership"** (the button beside "Leave group" — the panel is collapsed until you click it) → **"Nominate successors"** → pick the nominee → **"Nominate in this order"** → confirm **"Send nomination"**.
2. B: **⚑ EXPECT the bell to rise within ~1–2 s**, no reload.
3. B: open `/notifications`. **⚑ EXPECT** the nomination with **Accept** and **Decline** on the letter itself.
4. **⚑ EXPECT a *Respond by* date** if it has an expiry.
5. Click **Accept**. **⚑ EXPECT** a confirm step first, then it applies, then the buttons are replaced by the outcome.
6. **⚑ EXPECT the bell badge to update too** — `FEAT-H031:39` says a successful response decrements the pending affordance.
7. Reload. **⚑ EXPECT** the answered state persists — this is the platform's memory, not the browser's.
8. **⚑ EXPECT** the nominee now holds Steward, and the nominator is **gone from the group**, not merely demoted.
9. **⚑ EXPECT nowhere in the app still shows a separate "pending nominations" panel** — that was deleted in N-B and the inbox is its only home now. *(This line was always correct.)*

**Personal invitations, for the record:** they arrive as an `invitation_received` letter with no chip and no buttons, answerable via **MyInvitations**, not the inbox. That is by design — see finding **W-04**, which questions the design rather than the behaviour.

> If a dispatch ever fails, **⚑ EXPECT the reason pinned to that row and the buttons back** — never a silent revert. If you can provoke a failure, that's the single most valuable observation in this scenario.

---

## 7 — The headline: you can say no (N-D)

This is the cycle that justifies the area. Do it carefully.

1. B (Grace): open `/notifications/preferences`. **⚑ EXPECT every switch ON** (verified: she has no preference rows).
2. Note her exact bell count. Call it **N**.
3. B: switch **OFF** → *"Group membership & invitations"*.
4. A: Nya gruppen #1 → Grace → **remove** the Observer role, then **assign** it again. (Both are `membership`-category events.)
5. B: **⚑ EXPECT the bell count to still be exactly N.** Nothing arrived. No flicker, no arrive-then-vanish.
6. B: reload `/notifications`. **⚑ EXPECT no new rows.**
7. B: switch the category back **ON**.
8. B: reload again. **⚑ EXPECT the notifications from step 4 to still be absent — permanently.** They were never written, so they are gone, not queued. **This is by design; if they appear now, that is a real bug.**
9. A: assign/remove Observer once more. **⚑ EXPECT it arrives normally now.**
10. B: confirm other categories still work — **⚑ EXPECT muting one category never silences another.**

---

## 8 — What can't be switched off, and what isn't ready (N-D)

1. B: on `/notifications/preferences`, find **"Account & participation state"**. **⚑ EXPECT no switch at all**, and **⚑ EXPECT a plain-language line saying why** — notices about your own account and access always reach you.
2. **⚑ EXPECT it is NOT a greyed-out toggle with no explanation.** The whole design point is telling you why instead of leaving you guessing. Judge the wording as a member would.
3. **⚑ EXPECT email to be mentioned as listed-but-not-switchable**, in one line, because email delivery hasn't shipped. **⚑ EXPECT no email toggle you can actually click.**
4. Try to make a save fail if you can (offline, then flip a switch). **⚑ EXPECT the switch to revert to what's actually true and say why** — not to sit showing a setting the platform never accepted.

---

## 9 — The operator console and its cost line (N-D, DeusEx)

1. C: sign in as `deusex@fringeisland.com`, open `/notifications/preferences`.
2. **⚑ EXPECT an operator panel that Grace and Dev Login do NOT see.** Check that in window A — if a non-admin can see it, stop and tell me immediately.
3. **⚑ EXPECT the platform-announcement live-update toggle to be OFF.** (Verified in `ds5_config`: `realtime_hint_platform_announcements = false`.)
4. **⚑ EXPECT a live cost line reading approximately: "1,415 real-time messages — one per member, charged whether or not they are online."** The number **1,415** is computed live; if it's wildly different, tell me. *(N-C measured 1,274 in the same window; growth is expected, an order of magnitude is not.)*
5. Judge it as the person who'd flip the switch: **does the cost line actually make you hesitate?** That was its entire purpose — the number used to live in a session bridge where the decision-maker would never see it.
6. **Leave the toggle OFF.** Turning it on bills ~1,415 realtime messages per platform announcement.

---

## 10 — The subtle one: suppression costs no realtime (N-C × N-D)

Worth confirming because it's the design claim that ties the last two cycles together.

1. B: mute *"Group membership & invitations"* again.
2. A: assign/remove Observer for Grace.
3. B: **⚑ EXPECT not merely "no notification" but no activity at all** — no bell flicker, no transient count change, nothing arriving-and-being-removed.
4. B: unmute when done.

> A muted notification is never written, so the realtime hint never fires either. If you see a flicker, suppression is happening *after* the write and the claim is wrong.

---

## Known and expected — do not file these

- **`na_test_kind_mrzenort`** ("N-A open-registry probe") is a **test kind left in the live registry**, with one notification in a throwaway test account's inbox. It is real residue and I've logged it — but it is **not** in any walk account, so you shouldn't encounter it. If you somehow do, that's known.
- **Bell shows `9+` not `46`** — the cap is deliberate.
- **"Nya gruppen #1" and "Nya gruppen 1" are two different groups** (different IDs). Confusing, pre-existing, not an A-NTF thing.

---

## Wrap — how to feed back

Copy this and fill it in; paste it back to me in any form.

```
## A-NTF walk — findings

Environment: fringe-island.vercel.app / date / time
Idle before scenario 1 was genuinely ≥20 min?  yes / no

### Measurements (scenario 1)
/groups cold (B2 ≤2.5s):                    ___ s
sign-in → content (B1 ≤2.5s):               ___ s
/groups warm ×3 (B3 ≤1.0s):                 ___ / ___ / ___
/notifications/preferences cold (B2):       ___ s
/notifications/preferences warm ×3 (B3):    ___ / ___ / ___
Any spinner where a skeleton belonged?      ___

### Per scenario: PASS / FAIL / ODD + a sentence
2 bell & count:
3 inbox & history:
4 live delivery:
5 reconnect & degraded notice:
6 typed actions:
7 mute → silence → unmute:
8 non-suppressible & email:
9 operator console & cost line:
10 suppression costs no realtime:

### Anything that felt wrong but you can't name
```

**Rule of thumb for grading:** if it *worked* but felt confusing, that's still a finding — every A-COM walk finding turned out to be a **seam between units of work**, not a defect inside one, and those only ever surface by feel.
