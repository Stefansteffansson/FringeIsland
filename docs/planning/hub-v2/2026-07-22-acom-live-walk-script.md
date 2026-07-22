# A-COM live-walk script (Stefan) — 2026-07-22

Companion to the [area-gate record](./2026-07-21-communication-area-gate.md). Two browser windows: **A** = your account (normal window), **B** = a scratch FIM (incognito). Scenario 10 deletes the scratch account — never walk it with your own.

## Setup
1. Window B (incognito): `fringe-island.vercel.app/signup` → create scratch FIM (e.g. display name `WalkPartner`).
2. Window A: sign in as yourself. Invite/add the scratch FIM to a group you steward (roster → invite by email, or your usual flow). Confirm B sees the group.

## 1 — Cold arrival (the felt datum)
1. Before anything else, window A: open `/messages` as your first hit of the session. Feel it — this is the deep-cold experience you dispositioned.
2. Reload the page twice. This is the warm experience (~0.3 s). The contrast IS the scale-to-zero story.

## 2 — DM core + read state
1. A: group page → member roster → **Message** on the scratch member → conversation opens.
2. A: send a message. B: open `/messages` — unread badge/row present; open the conversation → message there, badge clears.
3. B: reply. A: your inbox row shows unread; open it → clears. Check B's read state did NOT change when you read (own-cursor-only).

## 3 — Realtime live delivery (COM-10)
1. A: keep the conversation open. B: send a message → it should appear in A **without any reload** within ~1-2 s.
2. A: go to `/messages` inbox, keep it open. B: send another → A's inbox reorders (that conversation jumps to top) and shows unread, live.

## 4 — Group conversations (COM-15)
1. A: group page → conversations panel → create a conversation (title it).
2. B: same group page → sees it → **join** → send a message; A responds — flows both ways.
3. B: **leave** the conversation → B can no longer read it; A still can (history intact).

## 5 — Forum + flat threading + moderation (COM-5/6/7)
1. A: group page forum → post a thread. B: reply to it (should work with default member role).
2. Check: B's reply offers no reply-to-reply affordance (flat 2-level, trigger-enforced).
3. A (Steward): moderate/remove B's reply → tombstone renders in place, not a silent vanish.

## 6 — Own-edit window (COM-12)
1. B: post a fresh thread; immediately edit it (within 15 min) → works; delete another own post → works.
2. Check a DM message offers **no** edit/delete affordance (DMs immutable by design).

## 7 — Announcements (COM-8/9)
1. A: send a **group announcement** to the stewarded group → B receives it (announcements surface/bell).
2. A: send a **platform announcement** (admin affordance) → both accounts receive.
3. A: **retract** one → it disappears from B's list (immutable + retract, no edit).

## 8 — Content report (COM-13)
1. B: report one of YOUR posts (reason + submit) → confirmation.
2. B: report the same post again → idempotent (no duplicate/no error explosion).
3. Note: no queue surface yet — that is the A-ADM seam, by design.

## 9 — Reconnect reconciliation (COM-11)
1. A: conversation open → set the window offline (DevTools → Network → Offline, or drop Wi-Fi).
2. B: send 2-3 messages while A is offline.
3. A: back online → the missed messages appear without a manual full reload (allow a few seconds for the reconcile).

## 10 — Departure ladder (SCRATCH ACCOUNT ONLY)
1. B: leave the group → A: B's forum posts/replies now attribute as **"Former member"** (content stays).
2. B: profile → **pause account** → calm confirm → paused surface offers reactivation → reactivate → lands back on groups.
3. B: profile → **delete account** → ceremony: consequence copy (what erases vs what stays), export offer, type-to-confirm → farewell page.
4. A: the DM conversation survives with B attributed as former/tombstoned; group forum content intact under "Former member".
5. B: any stale tab → navigating shows the honest terminal state ("This account is closed"), and a fresh sign-in with the scratch credentials is refused.

## Wrap
Note anything that felt wrong/slow/surprising per scenario number — riders get filed from those (the J-gate produced 7). Verdict + retro follow.
