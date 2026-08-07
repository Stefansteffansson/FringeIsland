# RD-B live walk — Stefan's script

**For:** Stefan's end-to-end walk on production.
**Covers:** Cycle **RD-B**, both halves — `FEAT-PC028` (publication scope, scoped offer, diff-on-copy, three passive notices) and `FEAT-H044` (the available-roles section, the ceremony, the admin reach surface, the bell renders). Nothing here has been walked live.
**Read first:** the [desk-walk findings](./2026-08-07-rd-b-desk-walk-findings.md) — **W-1, W-2 and W-3 are deliberately built into this script** so you adjudicate them at the moment you feel them, not from a document.

**Before you start:**
- Confirm the Vercel deployment of **#453** is live. *(If a deploy freezes right after the Turbopack banner: stale restored build cache — redeploy without cache.)*
- Migrations `20260807090000` and `20260807140000` are **applied** (both at the gate, log consistent, live catalogue verified) — **no DB steps are needed from you.**
- The scenarios below need a template that is **not** a system template. S0 creates it from the admin plane, so nothing is pre-seeded.

**Cast:**

| Label | Who | Needs |
|---|---|---|
| **ADMIN** | your DeusEx operator account | platform-admin plane (`/admin/roles`) |
| **STEWARD** | a member who stewards a group (e.g. Gracy) | will create the walk group and do all the copying |
| **HOLDER** | a second member | will be given the copied role, so the ceremony has a real holder count |

Keep STEWARD in one browser and ADMIN in another; several scenarios alternate.

---

## Part 1 — The admin says who a role is for

### S0 — Clone a template and give it somewhere to go

1. ADMIN: `/admin/roles` → open any **seeded** template (e.g. Guide) → **Clone…** → name it `Walk Greeter`.
2. Open `Walk Greeter`'s detail. **Before you look, the claim:** the page now carries a **Reach** section that did not exist before this cycle, and it reads **"Not published"** — because a clone is offered to *nobody* until someone says otherwise. That is the whole point of RD-B: before this, a clone made for one pilot group appeared in **every** group's picker on the platform.
3. Verify the Reach section is present and says "Not published".
4. **Also verify the absence:** go back and open a **seeded** template (Steward/Guide/Member/Observer). **Claim:** there is **no Reach section at all** — system roles are the floor every group is built on and are not distributed. Not an empty one; absent.

### S1 — Publish to all, then withdraw

1. ADMIN, on `Walk Greeter`: click **Publish to all groups**. **Before you confirm, the consequence:** this *offers* the template to every group; it **never adds a role to anybody's group**. Stewards choose whether to copy it.
2. Confirm. **Verify:** the summary flips to **"Published to all groups"**, and the action offered becomes **Unpublish from all groups** (not a second Publish).
3. Read the standing sentence under the actions. **Claim:** it states that unpublishing withdraws the *offer* and that copies already adopted are unaffected. This sentence is the reason Unpublish does not read as a deletion.
4. Click **Unpublish from all groups** → confirm. Verify it returns to "Not published".

---

## Part 2 — The Steward's journey (the substance of the cycle)

### S2 — What is offered to *my* group

1. STEWARD: create a fresh group **G1**. Open it.
2. Scroll to the **Roles** panel. **Before you click, the claim:** there is now a **"Show available roles"** disclosure at the bottom of the panel. It is collapsed on purpose — it costs zero extra requests to open, because the data already rode the page.
3. Click it. **⚠️ FINDING W-3 — judge this now, first impression:** you will see the **four system templates listed as "Copied and up to date"** before anything actionable. Every row is truthful, but the first thing the section shows you is four rows of nothing-to-do.
   **The question for you:** should adopted-and-current entries be shown at all, collapsed into a line ("4 roles up to date"), or listed as they are? *There is no right answer in the spec — the AC said "state plainly when nothing new is offered", and with system templates always on offer that state is unreachable as built.*
4. ADMIN: publish `Walk Greeter` **to G1 by name** (not platform-wide) — use the reach section. Verify G1 appears in the reach list with its date.
5. STEWARD: reload G1, expand the section. **Verify:** `Walk Greeter` is listed with a **Copy** button. **And the scoping claim:** it is offered *to this group* — a template published only elsewhere would be absent.

### S3 — Copy it, and watch the provenance line appear

1. STEWARD: click **Copy** on `Walk Greeter`.
2. **Verify the four consequences:** a new role card appears named **Walk Greeter**; its badge reads **`Template · v1 · copied <today>`** (RD-A's provenance line, now describing something you just did); its permission chips read as **words** — "Invite members", not `invite_members`; and the available-roles entry for it **stops offering Copy** and now says it is up to date.
3. STEWARD: assign the new role to **HOLDER** from the member list. *(This gives the ceremony in S5 a real holder count — do not skip it.)*

### S4 — Diverge from the template deliberately

**This is the setup that makes RD-3 mean something.** On the `Walk Greeter` role card:

1. Click **Edit grants**. **Remove** a permission the template grants (untick "Invite members").
2. **Add** a permission the template does *not* grant (tick something else — e.g. "View member list", if it isn't already on).
3. You have now done what every real Steward does: adjusted a copied role to suit your group. **Remember both changes** — the ceremony in S5 must name exactly these two.

### S5 — The catalogue moves, and the ceremony tells the truth

1. ADMIN: open `Walk Greeter` → **Draft a new version**: tick an *additional* permission, **Save draft…**, then **Apply…** the new version so it becomes the default.
2. STEWARD: reload G1, expand the available-roles section. **Verify:** `Walk Greeter` now shows **`v1 → v2`** and offers **Review update**.
3. Click **Review update**. **Before you read it, the claim — and this is the sentence the whole cycle exists for:** because you removed "Invite members" in S4 and the template still grants it, the ceremony must list it under **will be added** *and say so in words*:
   > **"This will restore permissions you removed from this role."**
   **Verify that sentence renders verbatim.** If it is missing or paraphrased, RD-3 has failed and the walk should stop here.
4. **Verify the rest of the ceremony:** the permission you *added* in S4 appears under **will be removed**, with the statement that applying takes it away; the holder count names **1 member** (HOLDER) and states they keep the role while their permissions change with it; the header names **v1 → v2**; and every permission reads as **words**, never as an internal key.
5. **Cancel.** **Verify:** nothing changed — the role card's badge still reads `v1`, and its chips are still your S4 edits. *(Cancel makes no contract call at all.)*
6. Re-open **Review update** → **Apply update**. **Verify the observable effect:** the badge moves to **`Template · v2 · copied <today>`**, and the chips now equal the template's set — your S4 additions gone, your S4 removals restored. Take-it-or-leave-it, exactly as warned.

### S6 — ⚠️ FINDING W-2 — the resting group disagreement

1. STEWARD: put G1 to **rest** (the Rest affordance on the group panel).
2. Look at the Roles panel. **Verify the inconsistency:** **Add role**, **Edit grants** and **Delete** are still offered — the platform genuinely permits a Steward to manage roles in their own resting group. But expand the available-roles section: **Copy and Review update are gone**, replaced by "This group is read-only right now".
3. **The question for you:** same panel, same permission, same group — one half lets you rewrite a role's grants by hand while the other half refuses to let you copy one. Which posture is right? *The spec asked for read-only "consistent with every other write affordance under the availability guard" — that premise was simply wrong about this panel.*
4. Wake G1 again before continuing.

---

## Part 3 — The telling

### S7 — ⚠️ FINDING W-1 — the notice lands you where the news isn't

1. ADMIN: publish a *second* clone (make one, `Walk Second`) to **G1 by name**.
2. STEWARD: open the bell. **Verify:** a notice under a new **"Roles & permissions"** grouping, stating which role became available in which group, with **no Accept/Decline buttons** — this is news, not an ask. The act happens in the roles panel.
3. **Now click the notice body.** **⚠️ Judge this:** you land at the **top of G1's page**. The roles panel is the **seventh section down**, and the available-roles section inside it is **collapsed**. You were told a role is available; you arrive somewhere that shows no roles at all.
4. **The question for you:** this is your HYG-A complaint again — *"easy to read as nothing happened"* — which N-E fixed for invitations with `?focus=invitations`, scroll-into-view, and a brief ring. **Should the roles notices get the same treatment?** *(My recommendation: yes, and it is the one finding I would fix before anything else in RD-B.)*

### S8 — Retirement says the thing that stops it frightening you

1. ADMIN: **retire** `Walk Greeter` (the retire ceremony from RD-A).
2. STEWARD: open the bell. **Verify the notice reads, in full:**
   > *"The role 'Walk Greeter' is no longer offered by the platform. Your group's existing copy is unaffected."*
   **The second sentence is the point** — without it the notice reads as a loss.
3. **Verify the substance behind the sentence:** G1's `Walk Greeter` role card is **still there**, still `v2`, still held by HOLDER, still granting what it granted. Nothing about the group changed.
4. Expand the available-roles section. **Verify:** `Walk Greeter` is **gone from the offer** — retirement stops it being offered without touching what exists.

### S9 — The section is not shown to someone who cannot use it

1. HOLDER (who holds `Walk Greeter` but not `manage_roles`): open G1.
2. **Verify:** the Roles panel renders — they can read the fabric — but there is **no "Show available roles" disclosure at all**. Not a disabled one; absent. It offers acts they cannot perform.

---

## Aftermath — what the walk leaves behind

- **G1** with a `Walk Greeter` role at v2 held by HOLDER, and a retired source template.
- **`Walk Greeter`** retired, **`Walk Second`** published to G1.
- Nothing needs cleaning up unless you want to; if you do: unretire and delete the two clones from `/admin/roles`, then delete G1.

## What I need back from you

For each of **W-1**, **W-2**, **W-3** (and W-4 if you care): a ruling. I will record them in `2026-08-07-rd-b-walk-findings.md` and route each to a task or a fix. Everything else: pass/fail per scenario is enough.
