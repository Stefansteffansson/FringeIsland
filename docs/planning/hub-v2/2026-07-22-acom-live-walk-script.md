# A-COM live-walk script (Stefan) — 2026-07-22

Companion to the [area-gate record](./2026-07-21-communication-area-gate.md). Detailed edition (v2): every scenario uses **already-registered accounts** (verified live in the DB 2026-07-22) and spells out each click. Base URL everywhere: `https://fringe-island.vercel.app`.

## Cast (all registered, verified live)

| Window | Account | Email | Role in the walk |
|---|---|---|---|
| **A** (normal browser) | **Stefan** (dev) | `dev-login@fringeisland.test` | Your main seat. Steward of **Nya gruppen #1, #2, #3**. |
| **B** (incognito) | **Gracy** | `grace1@fringeisland.test` | The other human. Already an **active Member of Nya gruppen #1**. |
| **C** (2nd incognito or another browser, scenario 7 only) | **DeusEx** | `deusex@fringeisland.com` | The only platform-admin account — platform announcement + retract. |
| **Sacrifice** (scenario 10 only, in window B after Gracy signs out) | **Alice** | `alice@fringe.test` | Near-zero footprint (one pending invite to Nya gruppen #2). She walks the departure ladder and is deleted. |

Your real account (`stefan.steffansson@yahoo.com`) is optional — it has a pending invite to Nya gruppen #1 you can accept as a bonus check, but no stewarded groups, so the walk runs on dev-login. **Passwords:** these are your manual fixtures; if any password is forgotten, tell me which and I'll set a known temporary one (never for your yahoo account).

Direct links used throughout:
- Nya gruppen #1: `/groups/8781a79c-3a14-4fc5-8f6a-56bb7fcd1f8a`
- Nya gruppen #2: `/groups/96317e28-8bc0-470a-b323-dbad6c5e2465`

## Setup (5 min)
1. Window A: open `/login`, sign in as `dev-login@fringeisland.test`. **Stop — do the Scenario 1 timing FIRST if this is your first hit today** (deep-cold is spent the moment you load anything).
2. Window B (incognito): `/login` → `grace1@fringeisland.test`.
3. Both windows: open **Nya gruppen #1** via the direct link above. A sees steward affordances; B sees member view. If either fails to load the group, stop and tell me — that's a finding before the walk even starts.

## 1 — Cold arrival (the felt datum)
1. Before signing in anywhere, window A: open `/messages` as the day's very first hit. Count one-thousand-one… — the full wait to usable content is the deep-cold experience dispositioned in the gate record (expect ~5–7 s).
2. Sign in if bounced to `/login` (that bounce is part of the cold story too).
3. Reload `/messages` twice (F5). Expect ~0.3–1 s. The contrast is the scale-to-zero story; note how each *feels*, not the milliseconds.

## 2 — DM core + read state (Stefan ↔ Gracy)
1. A: Nya gruppen #1 → member roster → find **Gracy** → click **Message** → conversation view opens (`/messages/...`).
2. A: type `walk-2 hello from Stefan` in the Message box → send. It may flash a brief "sending" state — should settle to sent.
3. B: open `/messages`. Expect the conversation row with **Stefan** showing an unread indicator. Open it → the message is there; go back to the inbox → unread cleared.
4. B: reply `walk-2 hello back from Gracy`.
5. A: `/messages` shows unread on that row; open → clears.
6. Cross-check: B's inbox must NOT have re-flagged unread because A read something (read cursors are per-person).

## 3 — Realtime live delivery (COM-10)
1. A: keep the Stefan↔Gracy conversation open. Do not touch the keyboard.
2. B: send `walk-3 realtime test`. Expect it to appear in A **without any reload** within ~1–2 s.
3. A: go to `/messages` (inbox) and leave it open. B: send `walk-3 again`. Expect A's inbox to reorder live — that conversation jumps to the top with an unread mark, no reload.

## 4 — Group conversations (COM-15)

> **RIDER-1 (2026-07-22): FIXED + APPLIED.** The "New conversation" button was missing in all pre-C-A groups — the permission was seeded to role templates only, never backfilled to existing groups' role instances. Backfill applied to the live DB on Stefan's named nod; the button is there now.
> **RIDER-2 (2026-07-22): FIXED in the branch, not yet in production.** There was no **Leave** affordance anywhere — contract, route and client all existed, but nothing rendered a button. Now wired into the group page's Conversations panel (participant rows read `Open | Leave`). Until PR #235 merges, steps 4-5 need the branch preview `https://fringe-island-d3ib4miyh-stefansteffanssons-projects.vercel.app` — **note it sits behind Vercel SSO**, so it works in your normal window (you're signed in to Vercel there) and bounces in incognito. Simplest walk: let **window A leave** and check window B keeps the history — same code path, mirrored assertion. Everything else in the walk stays on production.

1. A: Nya gruppen #1 → Conversations section → **New conversation** button (top-right of the section) → title it `Walk conversation` → **Open**.
2. B: same group page (reload is fine) → sees `Walk conversation` → **Join** → send `walk-4 from Gracy`.
3. A: open it → reply `walk-4 from Stefan`. Both directions flow.
4. B: go **back to the group page** (leave lives on the Conversations panel, not inside the conversation view) → the `Walk conversation` row reads `Open | Leave` → click **Leave**.
5. B: the row flips back to **Join** — that is rejoin through the same door. Opening `/messages/<id>` directly must now refuse. A: still sees the full history including B's message (history survives the absence).

## 5 — Forum + flat threading + moderation (COM-5/6/7)
1. A: Nya gruppen #1 → forum section → new thread: title `Walk thread`, body `walk-5 opening post`.
2. B: open the thread → reply `walk-5 reply from Gracy` (plain Member role must be allowed to).
3. Check: on B's reply there is **no** reply-to-this-reply affordance (threading is flat, 2 levels, trigger-enforced).
4. A (steward): moderate/remove B's reply → expect a **tombstone** in its place ("removed by a steward" style), not a silent vanish. B reloads → sees the same tombstone.

## 6 — Own-edit window (COM-12)
1. B: post a new thread `Walk edit test` → immediately **edit** it (inside the 15-min window) → change sticks.
2. B: **delete** one of B's own posts → gone/tombstoned as designed.
3. Check: in the DM conversation from scenario 2, messages offer **no** edit or delete affordance (DMs are immutable).

## 7 — Announcements (COM-8/9)
1. A (steward): Nya gruppen #1 → announcements section → post group announcement `walk-7 group announcement`.
2. B: group page → sees it in the group announcements section.
3. Window C: sign in as `deusex@fringeisland.com` → post a **platform announcement** `walk-7 platform announcement` (admin affordance). A and B: open `/groups` — the platform announcements section at the overview shows it for both.
4. C: **retract** the platform announcement. A/B reload `/groups` → it is gone. Note there is deliberately no edit — retract only.
5. A: retract the group announcement from step 1 too (leave the walk clean).

## 8 — Content report (COM-13)
1. B: on A's `Walk thread` opening post → **Report content** → pick a reason, add details `walk-8 report` → submit → confirmation dialog.
2. B: report the exact same post again → idempotent (calm confirmation, no duplicate/no error explosion).
3. Note: no steward-facing report queue exists yet — that is the A-ADM seam, by design, not a finding.

## 9 — Reconnect reconciliation (COM-11)
1. A: open the Stefan↔Gracy DM → DevTools (F12) → Network tab → set **Offline**.
2. B: send `walk-9 one`, `walk-9 two`, `walk-9 three`.
3. A: set Online again → within a few seconds all three appear **without a manual reload**.

## 10 — Departure ladder (ALICE ONLY — never your own accounts)
1. B: sign Gracy out. Sign in as `alice@fringe.test`.
2. B/Alice: accept the pending invitation to **Nya gruppen #2** (it's waiting on her groups/invitations surface) → she's an active member.
3. B/Alice: Nya gruppen #2 forum → post thread `walk-10 Alice was here`.
4. B/Alice: **leave the group**. A: open Nya gruppen #2 forum → Alice's thread remains, attributed **"Former member"**.
5. B/Alice: `/profile` → **pause account** → calm confirm → paused surface → **reactivate** → lands back in the app.
6. B/Alice: `/profile` → **delete account** → the ceremony: consequence copy (what erases vs what stays), export offer, type-to-confirm → **farewell page**.
7. A: Nya gruppen #2 forum content still intact under "Former member".
8. B: in the same (now stale) tab, navigate anywhere → honest terminal state ("this account is closed" style), and a fresh `/login` with Alice's credentials is refused.

## Wrap
Note anything wrong/slow/surprising **by scenario number** — riders get filed from those (the J-gate walk produced 7). Then: your verdict on the gate + the named nod on PR #235.
