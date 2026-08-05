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

1. ADMIN: open `/admin/audit`. S4's suspend + reactivate rows verify the **group** half: the target renders the group name, raw uuid in the expandable detail. *(Corrected mid-walk: these rows are group-targeted — they cannot show the email half.)*
2. For the **member + email** half, the row's target must be another member: click the **`member.`** filter chip → Apply, and the ADM-era member acts (2026-08-02–04) render as **display name + email** — or simply run S7 first and come back; its force sign-out writes a fresh member-targeted row.
3. **The claim:** member targets render name + email, group targets the group name, literals/erased targets as-is; the raw uuid always survives in the expandable detail. Expand one of each and verify.

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

## Part 3 — the role-template editor (ADM-F / FEAT-H040, never walked live) — added at walk close

**One consequence to know before you start:** a cloned template is **member-visible platform-wide** (it appears in every member's group-creation options and rides template-less creation) and there is **no deletion affordance, by RB-4 design**. So the walk's clone persists until removed substrate-side — name it something you're willing to see in a list (the script uses "Walk Editor Test"), and tell Claude at walk close to clean it up.

**The law under test in S11 (stated up front):** Apply moves the template's **default pointer** — it does **not** rewrite existing group roles. Existing groups keep their instantiated snapshot; only groups created **after** the apply carry the new set. The blast-radius line in the ceremony says exactly this.

### S9 — The fifth card, the honest list, and the read-only catalogue

1. ADMIN: open `/admin` — **the claim:** a fifth card, **Roles**, sits on the dashboard. Open it.
2. `/admin/roles` renders two panes from one read: the **template list** (each row: name, a *seeded* badge on the four system templates, default version, version count, and how many live group roles instantiate it) and the **catalogue browser** — every permission, grouped by category, protected badges — with **zero write affordances anywhere** (no add, no edit, no toggles: the catalogue is read-only by the settled RB-4 board). As-of line + working Refresh.
3. Open a seeded template's detail (note: seed names carry the suffix — e.g. **"Steward Role Template"**). **The claim:** version history renders, but **no draft editor, no save, no apply** — **Clone is the only action**. Seeds are immutable in the UI *and at the door* (the platform refuses seed writes with "Seeded role templates are immutable — clone, then edit the clone" — pinned by test, no need to provoke it).

### S10 — Clone, with both consequences named

1. On the seed detail, press **Clone**. The confirm hosts the name field — enter **Walk Editor Test**.
2. **Before you confirm, the claim** *(rewritten under WA-6, ruled mid-walk)*: the ceremony copy names the clone's visibility at **both pull doors** (member group-creation options; the Steward's add-role template picker) and states that groups created **without** a chosen template start with the **system set only** — a clone joins a group only when someone chooses it.
3. Confirm. **The claim:** the list repaints with Walk Editor Test — no seeded badge, version 1 = the source's live set, instantiated-count 0.
4. Optional refusal check: Clone the seed again with the **same name** — the platform's duplicate-name refusal renders verbatim.

### S11 — Draft, diff preview, Apply — verified on a fresh group, snapshot law on an old one

1. Open **Walk Editor Test**'s detail. **The claim:** the draft editor renders — name/description plus the permission **checkbox fabric** over the catalogue.
2. Flip a small, memorable set — e.g. **remove** one grant the source had and **add** one it lacked. **Write down which two.**
3. **Save draft.** **The claim:** a new **version 2** appears in the history, *unapplied*; the copy states nothing changes until Apply; the default pointer still marks version 1.
4. Press **Apply** on version 2. **Before you confirm, the claim:** a danger-variant confirm shows the **added and removed lists** (exactly your two), any name change, and the blast-radius line: *N existing group roles keep their snapshot; future groups instantiate the new set*. Read N.
5. Confirm. The default pointer moves to version 2 on the repaint.
6. **Member-side verification** *(rewritten under WA-6 — walk this leg only after the WA-6 gate merges and the deploy lands)*: as a regular member (Avatar works), create a **new group without choosing a template**. Open its roles panel — **the claim:** it carries the **system roles only**; no "Walk Editor Test" rode along.
7. **The pull door carries the edit:** in that group (or any existing one you steward), add a role **from the template picker**, choosing "Walk Editor Test" — **the claim:** the role lands with exactly the **edited** set (your two flips present). Pull works everywhere; the ride exists nowhere.
8. **Snapshot law:** any role pulled or instantiated **before** the Apply keeps its old grants — **the claim:** nothing propagated backwards.

### S12 — Rollback is the same door; the audit log carries the diffs

1. Back on Walk Editor Test's detail: press **Apply** on **version 1**. **The claim:** the *same* ceremony renders with the diff **reversed** (your added grant now listed as removed, and vice versa) — rollback needs no special affordance. Confirm; the pointer returns to version 1.
2. ADMIN: `/admin/audit` — **the claim:** the clone / save-draft / apply / rollback acts are all rows, and the apply/rollback rows carry the **added/removed diffs** in their expandable metadata — this is verification-by-audit, the ADM-13 waiver's compensating control, rendered real.
3. Walk close: tell Claude to remove **Walk Editor Test** substrate-side (or keep it, your call — but it lives in every member's creation options until removed).

## If something looks wrong

Same protocol as every walk: don't work around it — note what you clicked, what you expected (the stated claim), what you saw, and file it as a WA/WF finding; directives get slotted at the next planning step. The findings docs from the last rounds are the shape: [`2026-08-03-hyga-walk-findings.md`](./2026-08-03-hyga-walk-findings.md), [`2026-08-04-adme-walk-findings.md`](./2026-08-04-adme-walk-findings.md).
