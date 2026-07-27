# NB-8 — the Mist notification posture, proved against the live database

**Produced:** 2026-07-27 · **Area:** A-NTF · **Gate item:** NB-8 (verify-and-record)
**Board row asked for:** *"Adversarial proof that the delivery/recipient path structurally excludes Mist durable rows + spec recording, not a scrub build"* ([completion plan](./phase-3-notifications-completion-plan.md) NB-8, settled 2026-07-23).

---

## Verdict: the premise is REFUTED, not proved

The adversarial proof was run and **the claim it was meant to confirm is false**. Mists hold durable notification rows, can read them, can mark them read, can export them, and cost a realtime broadcast. The only door that refuses a Mist is the preference pair.

This is the proof doing its job. NB-8 was scoped "no decision needed" on the assumption verification would confirm the rule; it did not, so a disposition is now owed. **Nothing here is a privacy leak** — see "What this is not" below.

All facts read live from the production database (`jveybknjawtvosnahebd`), probed under `SET LOCAL ROLE authenticated` with a real Mist's JWT claims. Every mutating probe ran inside `BEGIN … ROLLBACK`; production state is unchanged.

---

## What V3 says, and what is true

**The rule** (`docs/verticals/notifications/SPECIFICATION.md §6`, carried into the completion plan at `:52`): *"Mist rule — no email, no durable state; in-app in-session only."*

**What is true:** every Mist holds exactly **one durable row in `public.notifications`**, written at the instant of signup.

| Measured | Value |
|---|---|
| Mists on the platform | 6 |
| Mists holding a durable notification row | **6 — one each** |
| Delay between Mist creation and the row | **`00:00:00` on all six** |
| The row | `role_assigned` · *"You have been assigned the \"Myself\" role in \"Mist\"."* · category `membership` |
| Mist memberships beyond their own personal group | 0 |
| Mist preference rows | 0 |

## Where the row comes from

Not from anything targeting Mists. It is the **personal-group bootstrap notifying the new account about itself**.

`handle_new_user` (`20260626120000_mist_anonymous_substrate.sql`) creates a personal group for **every** new user — Step 2 is unconditional; only **Step 7**, enrolment in *FringeIsland Members*, is skipped for a Mist (`IF NOT v_is_temporary`). Step 6 then assigns the "Myself" role in the user's own personal group, and `notify_role_assigned()` — an unconditional `AFTER INSERT` trigger on `user_group_roles` (`20260222000000:1392`) — writes a notification for it.

The assigner, the recipient and the subject are all the same personal group. The member is told that they have been given a role in themselves, by themselves.

**This is not Mist-specific: 1516 of 1548 FIMs carry the identical row.** The Mist case is the same bootstrap noise, visible against a rule that forbids it.

## V3 predicted this exactly, and named the test that would find it

`docs/verticals/notifications/SPECIFICATION.md:57` carries it in the risk register:

> **Mist durability leak.** Notification state outlives the ephemeral session (ADR-U031): a Mist can hold no email address and no durable notification state — in-session delivery only. **Detected by ephemerality verification on Mist-linked rows;** recovered by the TTL/explicit-erase sweep.

NB-8 *is* that ephemerality verification, run for the first time. **The named risk has materialised, and its own detection method found it.** The register should now read as realised-and-dispositioned rather than anticipated.

## The door matrix — every notification door knocked on as a real Mist

| Door | Outcome for a Mist |
|---|---|
| `get_current_personal_group_id()` | **resolves** — a Mist has a personal group |
| `get_own_unread_notification_count()` | **1** — answers, does not refuse |
| `get_own_notifications()` | **1 row** — `Role Assigned` / `role_assigned` / `membership` |
| `mark_all_notifications_read()` | **ACCEPTED** — marked 1; the badge then read **0** |
| `get_own_notifications_export()` | **returns the row in full**, payload included |
| `set_own_notification_preference()` | **REFUSED — `28000 no active subject`** |
| `get_own_notification_preferences()` | **REFUSED — `28000 no active subject`** |

**The asymmetry is the defect.** The read and act doors gate on `get_current_personal_group_id()`, which a Mist satisfies. The preference doors gate on `ds5_require_fim_subject()`, which a Mist does not. So a Mist can see, clear and export a notification **it has no mechanism to silence** — and `membership` is `member_suppressible = true`, so the category is nominally mutable by everyone except the one caller who cannot reach the switch.

## A second, independent error: the realtime hint does fire for Mists

`FEAT-PD015:59` states: *"No Mist realtime: Mists hold no durable notification rows (NB-8), so no topic resolves for them."* `notify_notification_hint()` repeats it in its own comment: *"a group-addressed row (an engagement group) or a Mist resolves to NULL -> no topic -> no hint."*

**Both are wrong.** The trigger resolves the topic with `SELECT u.auth_user_id FROM public.users u WHERE u.personal_group_id = NEW.recipient_group_id`. A Mist **has** a `users` row and a non-null `auth_user_id`. Run against all six Mists' personal groups, that lookup **resolves every time** — a hint is emitted to `account:<auth_uid>:notifications`.

The conflation is *Mist* with *no `users` row*. Only a **group-addressed** row (an engagement group, which no `users` row points at) resolves to NULL. `FEAT-PD015:72` — the acceptance criterion — is written correctly for the group case and merely inherits the wrong gloss for the Mist case.

## What this is not

- **Not a privacy leak.** The only row a Mist can reach is *about itself*, generated by its own bootstrap. No other member's data is exposed; no boundary is crossed. Verified: Mists hold no group memberships beyond their own personal group, so no membership-derived fan-out reaches them.
- **Not permanent.** `notifications.recipient_group_id` is `REFERENCES public.groups(id) ON DELETE CASCADE` (confirmed live: `confdeltype = 'c'`). When a Mist is erased — explicit "say goodbye" or the ephemerality reaper — the personal group goes and the row goes with it. It never outlives the Mist.
- **Not a broken door.** No contract behaves other than as written. The failure is that the **written rule and the built substrate disagree**, and nobody had checked which was true.
- **Not reachable by an outsider.** The anon-EXECUTE surface was closed separately by `20260727120000`; these doors require an authenticated Mist session.

## What is actually wrong

1. A durable row exists where V3 says none may (**the posture rule is violated by the bootstrap, not by any notification feature**).
2. A Mist can read and export a notification it cannot silence (**the read/preference gate asymmetry**).
3. Two specs and one code comment assert a structural exclusion that does not exist (**PD015:59, `notify_notification_hint()`'s comment**).
4. 1516 FIMs carry a notification about being given a role in themselves, by themselves (**bootstrap noise, area-independent**).

Items 1–3 are A-NTF's. Item 4 is older than this area and reaches every new member.

---

## Disposition — owed, carried to the gate decision board

NB-8 cannot be ticked as proved. The options are laid out on the [gate decision board](./2026-07-27-antf-gate-decision-board.md) rather than decided here; the recommendation there is to enforce the rule at the dispatcher **and** silence the self-assignment at source, because the first makes the spec true by construction and the second removes the noise for everyone.

Recording this document discharges the **record** half of verify-and-record. The **proof** half is discharged with a negative result, which is a result.
