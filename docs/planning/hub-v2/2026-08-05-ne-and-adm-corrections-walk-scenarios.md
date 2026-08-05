# Live-walk scenarios — 2026-08-05: the bell answers invitations (N-E, all new) + the ADM-E directives, corrected

**For:** Stefan's end-to-end walk on production.
**Covers:** everything shipped since the last long walk (ADM-E/ADM-G, 2026-08-04) — Cycle **N-E** (WF-1 bell-answerable invitations + the WS-4 landing focus, never walked live) and the three **ADM-E walk directives now corrected** (WA-2 audit-target names, WA-3 consented hard delete, WA-4 instant force sign-out). WA-1 (bulk no-op disable) was ruled and fixed *during* the ADM-E walk itself — already verified, not repeated here.

**Before you start:**
- Confirm the Vercel deployment of today's merges (#427/#429) is live. (If a deploy froze right after the Turbopack banner: stale restored build cache — redeploy without cache.)
- The migration `20260805120000` is applied (done at the gate, log consistent) — no DB steps needed.

**Cast (your standing walk users):**
| Label | Who | Needs |
|---|---|---|
| **ADMIN** | your DeusEx operator account | platform-admin plane |
| **INVITER** | a member who can steward a group (e.g. Gracy) | will create/steward the walk groups |
| **INVITEE** | a second member (e.g. Walk Test) | receives every invitation; ideally on a second browser/profile so both stay signed in |
| **DISPOSABLE** | a fresh credentialed sign-up you create in S8 | **hard-deleted in S8 — never use a real account** |

Tip: keep INVITEE in one browser and INVITER/ADMIN in another; several scenarios have both acting in turn.

---

## Part 1 — N-E: the invitation answers where it is read (all new)

### S1 — Accept in the bell, and the page beneath keeps up (two doors, one truth)

**Precondition:** INVITEE has no pending invitations (their `/groups` page shows no "You are invited" card).

1. INVITER: create a fresh group **G1** (any name you'll recognise), open it → Invitations panel → invite INVITEE.
2. INVITEE: go to `/groups` and stay there. The bell badge shows unread. **Before you open it, the claim:** the invitation letter now carries **Accept / Decline buttons** below its body — the WF-1 directive, exactly like a stewardship nomination.
3. Open the bell dropdown. Verify the letter "Group Invitation … G1 …" shows both buttons.
4. **Before you click Accept, the consequences:** a confirm dialog opens naming the letter; on confirm — the letter's buttons vanish and it reads **"Accepted by [your nickname]"** (it names you, same as an acting answer names its answerer); the "You are invited" card below **lets go of G1**; the groups list **gains G1** — all with **no reload**; the unread badge follows.
5. Click Accept → confirm. Verify all four consequences on the page beneath the open dropdown.
6. Reload `/notifications`. **Claim:** the outcome is server truth, not a local paint — the letter still reads "Accepted by [you]" after a full reload.

### S2 — The letter lands you on the invitation (the WS-4 rider — your own HYG-A complaint)

**Context:** at the HYG-A walk you clicked an invitation notice, landed on `/groups`, and nothing anchored the invitation — "easy to read as nothing happened". This is the fix.

1. INVITER: invite INVITEE to a fresh group **G2**.
2. INVITEE: from any page **other than** `/groups` (e.g. the inbox at `/notifications`), find G2's letter. **Before you click, the claim:** clicking the letter **body** (not the buttons) navigates to `/groups?focus=invitations`, the "You are invited" card **scrolls into view** and glows with a brief blue ring (~2–3 s), then the glow fades.
3. Click the letter body. Verify the landing, the scroll, the glow.
4. Now answer through **the second door**: click **Decline on the card** (not the bell) → the confirm names the group.
5. **Before you confirm, the claim:** the card drops G2 — and the bell letter, next time it renders, reads **"Declined by [you]"** with no buttons (the card's answer converged the letter — one truth, whichever door).
6. Confirm, then open the bell and verify the converged letter.

### S3 — A withdrawn invitation says so — and names nobody

1. INVITER: invite INVITEE to a fresh group **G3**. INVITEE: verify the armed letter arrived — then **leave it unanswered**.
2. INVITER: on G3's Invitations panel, **cancel/withdraw** the pending invitation.
3. INVITEE: **before you look, the claim:** the standing letter now reads **"Withdrawn"** — no buttons, and **no name attached to the withdrawal**. (The letter's body still says "invited … by [inviter]" — that's the original invitation copy; the *withdrawal* is deliberately actor-less: whoever withdrew it is not the invitee's business if they're outside the group.)
4. Open the bell/inbox and verify. Also verify: G3 never appears in INVITEE's groups list, and the "You are invited" card doesn't hold it.

### S4 — An invitation into a held group refuses honestly, and the ask survives the hold

1. INVITER: invite INVITEE to a fresh group **G4**.
2. ADMIN: suspend G4 (`/admin/groups` → G4 → Suspend, with a reason).
3. INVITEE: the letter still shows Accept/Decline — the ask **stands** under the hold. **Before you click Accept, the claim:** the confirm proceeds, then the refusal comes back **pinned on the letter itself** ("group is suspended"), the buttons return, and the letter stays unanswered — no silent failure, no fake success.
4. Click Accept → confirm. Verify the pinned refusal.
5. ADMIN: reactivate G4. INVITEE: answer Accept again — **claim:** it now lands normally (membership active, G4 in the list). The hold delayed the ask; it never destroyed it.

### S5 — Two views racing one ask: first answer wins, the stale view can only converge

1. INVITER: invite INVITEE to a fresh group **G5**.
2. Get **the same INVITEE account signed in twice**, showing the same ask two ways *(clarified 2026-08-05 mid-walk — the original step glossed the focus re-read)*:
   - **Window A** = the browser where INVITEE already is: open the bell dropdown so G5's letter shows Accept/Decline, and **leave the dropdown open**.
   - **Window B** = a fresh incognito/private window: sign in as INVITEE again, go to `/groups` — the card shows G5.
3. In **Window B**: **Accept on the card** → confirm. The ask is now settled server-side while Window A still displays a stale letter with live-looking buttons.
4. Return to **Window A**. **The claim, before you touch anything — two outcomes possible, both correct:**
   - switching to the window can trigger the bell's focus re-read, and the letter converges to **"Accepted by [you]"**, buttons gone, without you ever answering there; **or**
   - if the stale buttons are still up and you click **Accept** → confirm: **no error, no second join** — the response returns *already answered* and the letter renders the recorded outcome.
5. Verify: G5 appears **once** in the groups list; both windows agree after a re-read. The law under test: a stale view can never produce a duplicate join or an error — only convergence.

---

## Part 2 — The ADM-E directives, corrected (WA-2 / WA-4 / WA-3)

### S6 — WA-2: the audit log names its targets for humans

**Context:** at the ADM-E walk, `/admin/audit` rendered member targets as raw uuids — "impossible for humans to understand."

1. ADMIN: open `/admin/audit`. Recent rows exist from this very walk (S4's suspend + reactivate).
2. **The claim:** member-targeted rows render the target as **display name + email**; group-targeted rows render the **group name**; the raw uuid still exists, tucked into the row's expandable metadata; old literal targets (like `'users'`) render as-is.
3. Expand a row and verify the raw value survives underneath the readable form.

### S7 — WA-4: force sign-out reaches the device instantly

**Context:** at the ADM-E walk, Gracy's browser coasted ~a minute on its unexpired token after a force sign-out.

1. INVITEE: signed in, sitting on any page, hands off the keyboard.
2. ADMIN: member detail → **Force sign-out** (the ceremony names the email).
3. **Before you click, the claim:** INVITEE's untouched browser is thrown out **within seconds** (the session-signal channel now carries the admin path), not after token expiry. Watch the other screen as you click.
4. Verify. (INVITEE: sign back in for S8's observer role if you like — force sign-out is a sweep, not a lock.)

### S8 — WA-3: hard delete no longer refuses the members it exists for

**Context:** at the ADM-E walk you asked "does hard delete work now?" — verification showed it refused **every consented member** (every credentialed sign-up) with a masked 500, because the consent records blocked the cascade. Corrected in ADM-F.

**⚠️ Destructive — use only the DISPOSABLE user created here.**

1. Create DISPOSABLE: a fresh credentialed sign-up (fresh email, consent accepted — that consent record is precisely what used to break this). Optionally have INVITER invite them to a group and accept, so the cascade has memberships to cross.
2. ADMIN: member detail for DISPOSABLE → **Hard delete** ceremony (reason required, email echo — verify the ceremony names the right account before confirming).
3. **Before you confirm, the claim:** it **succeeds** — no generic 500. The account is gone: sign-in fails, the member appears in no group, and the audit log carries the act (visible readable per S6).
4. Confirm and verify all three.

---

## If something looks wrong

Same protocol as every walk: don't work around it — note what you clicked, what you expected (the stated claim), what you saw, and file it as a WA/WF finding; directives get slotted at the next planning step. The findings docs from the last rounds are the shape: [`2026-08-03-hyga-walk-findings.md`](./2026-08-03-hyga-walk-findings.md), [`2026-08-04-adme-walk-findings.md`](./2026-08-04-adme-walk-findings.md).
