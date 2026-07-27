# The Notifications area gate (A-NTF) — 2026-07-27

Companion to the [area retrospective](../retrospectives/retro-2026-07-26-notifications-area.md). A-NTF was the **fifth of six** Phase-3 areas, covering cycles **N-A** (passive core), **N-B** (typed actions and acting fan-out), **N-C** (realtime hint and reconnect reconciliation) and **N-D** (preferences and the dispatcher).

**Verdict: HELD.** See [Gate verdict](#gate-verdict) below.

Sources: the [measurement record](./2026-07-27-antf-gate-measurements.md) · the [live-walk findings](./2026-07-27-antf-walk-findings.md) · the [walk script](./2026-07-26-antf-live-walk-script.md).

---

## Measurements

Taken headlessly on production against the authenticated real path, 2026-07-27, with four separate ≥20-minute enforced-idle windows. Full record in the [measurement document](./2026-07-27-antf-gate-measurements.md); summary:

| Scenario | Result | Budget | Verdict |
|---|---|---|---|
| B2 cold `/notifications/preferences` | 5 864 / 5 142 ms | ≤ 2 500 | FAIL ~2× |
| B2 cold `/groups` | 5 617 ms | ≤ 2 500 | FAIL ~2.25× |
| B1 sign-in → content (deep-cold) | 2 377 ms | ≤ 2 500 | PASS |
| Semi-warm, both pages | 379–402 ms | — | PASS |
| B3 warm soft-nav ×3 | 272–399 ms | ≤ 1 000 | PASS, wide |
| B3 warm full load, fresh context | 937 ms | ≤ 1 000 | PASS, 63 ms spare |

**Warm and semi-warm are the binding signal** per the standing A-COM rider, and all pass. The deep-cold overshoot extends the standing labelled pre-launch exception (J-gate 2026-07-19, A-COM 2026-07-22); it was **closed by decision, not deferred** — no investigation is commissioned. The cold penalty is **not page-specific**: whichever authenticated page loads first after idle pays it.

**Carried live, not covered by the exception:** the 937 ms warm full load against the 1.0 s B3 ceiling — the same ceiling-hugging class A-COM flagged on the group page.

**B6 (loading states), supplied by the walk** — the one thing the harness could not judge: `/notifications/preferences` loads fast with **no indicator at all**, which is correct for sub-1 s. No spinner was found where a skeleton belonged.

---

## The live walk (2026-07-27)

Walked by Stefan on the production stable domain, two browser profiles plus a platform-admin window. Scenario 1 was skipped (measurements taken headlessly). **Nine scenarios walked; eight findings.**

### Scenario dispositions

| Scenario | Result |
|---|---|
| 2 — bell and count | Dropdown path **PASS**. Page path → **W-01**, **W-02** |
| 3 — inbox and history | **PASS.** Keyset pagination clean across 60 rows, no duplicates or skips at boundaries; chips correct → **W-03** |
| 4 — live delivery | **PASS.** Bell rose 4 → 5 → 6 in under 1 s, no reload, no navigation |
| 5 — reconnect and degraded notice | **PARTIAL.** Hidden-tab reconciliation **PASS** (8 → 10 on return). Degraded notice **UNTESTED — blocked by W-05** |
| 6 — typed actions | **PASS** via substitute path; the scripted premise is a **script error** |
| 7 — mute → silence → unmute | **PASS — the strongest result of the walk** |
| 8 — non-suppressible and email | **PASS** on steps 1–3 → **W-08**. Step 4 **UNTESTED — blocked by W-05** |
| 9 — operator console and cost line | **PASS.** Operator panel correctly **invisible** to a non-admin; toggle confirmed left OFF |
| 10 — suppression costs no realtime | **PASS.** Observed directly — no flicker, no transient count |

### The strongest result

Scenario 7 was proven at the database level, not merely observed. With *"Group membership & invitations"* muted, two role changes were performed and demonstrably took effect — yet **no notification rows were written at all**. On unmute the suppressed events stayed permanently absent, and the next change arrived normally (badge 0 → 2, matching exactly two rows). Only the muted category wrote a preference row, so **"absence means allowed" held throughout**.

This is N-D's central claim — suppression happens at write time, so a muted notification costs no realtime either — confirmed by mechanism (`ds5_apply_notification_preference` returns `NULL` **before** insert, so the `AFTER INSERT` hint trigger cannot fire) and by direct observation.

### Findings

| ID | Grade | Summary |
|---|---|---|
| **W-01** | **DEFECT** | Inbox rows are inert — clicking does nothing. Violates `FEAT-H030:88`, which names *"dropdown or inbox"* explicitly |
| **W-02** | **DEFECT** | Mark-all on the inbox page leaves the bell badge stale. Violates `FEAT-H030:72` |
| **W-05** | **DEFECT, high** | A transient network failure signs the member out of **every device**. **Out of area** — session guard (PC-2 / Identity) |
| **W-03** | SEAM | An answered actionable row still commands the action, and hides the outcome |
| **W-04** | SEAM | A personal invitation arrives as a letter with no way to answer it and no pointer to where you can |
| **W-07** | SEAM | Answering a notification does not refresh the page whose data it just changed |
| **W-08** | SEAM | The email-deferral line promises to honour a choice the member was never offered |
| **W-09** | DESIGN | Muting a category may strand an obligation the member never learns about. Mechanism verified; consequence **untested** |
| **W-06** | TRIVIAL | A stale comment claims a permission gate that the code correctly enforces |

Full evidence, file:line references and root causes in the [walk findings document](./2026-07-27-antf-walk-findings.md).

### Why the two defects escaped the suites

The N-A E2E journey drives *Steward invites → invitee's bell badge → dropdown → mark-all → inbox history → read-state survives reload*. It reaches the inbox page only to assert **history rendering** — it never clicks an inbox row, and never asserts the badge after a **page-side** mark-all. The journey walks around both gaps. **Remediation should extend this journey rather than add a parallel one.**

### Script errors found by walking

Two, both of which would mislead the next walker and are corrected in the script:

1. **Scenario 6's premise was wrong.** It promised Grace's pending personal invitation would carry Accept/Decline in the inbox. `FEAT-PD014:40` states the opposite verbatim — a personal invitation keeps `invitation_received` *"unchanged (the MyInvitations path)"*. N-B brought exactly two answerable events into the inbox: **stewardship nominations** and **group-of-groups acting-invitations**. The script conflated nominations with personal invitations. The code matches its spec; the script did not.
2. **A stale precondition.** Grace already held the Observer Role Template, which Scenarios 4, 5, 7 and 10 assume she lacks.

---

## Gate verdict

**HELD.** Not failed — held pending a short, well-scoped remediation.

**What passed convincingly.** N-C and N-D. Live delivery, reconnect reconciliation, suppression-at-write-time, the preference model's "absence means allowed" default, the non-suppressible account category with its plain-language explanation, and the operator console with its privilege boundary intact. Scenario 7 is the best-evidenced result of any Phase-3 walk to date.

**Why it is held.** N-A ships with **two defects against written acceptance criteria**, and one of them — **W-01** — is the inbox page's *primary interaction*. The area cannot be called green while the surface N-A exists to deliver does not respond to a click. Neither defect is architectural; both are small and localised.

**Conditions to close:**

1. ~~**W-01** and **W-02** fixed, with the existing N-A E2E journey extended to cover an inbox-row click and a page-side mark-all badge assertion.~~ **DISCHARGED 2026-07-27** (PR #317). Both fixed red-first; the N-A journey was **extended, not duplicated**, and now clicks an inbox row and asserts the badge after a page-side mark-all — both were demonstrated red by reverting the page. A third stale-badge path (answering an actionable row) was closed in the same pass. Hub unit 987 → 994/994, notification E2E 10/10. See [FEAT-H030's amendment](../../products/hub/features/FEAT-H030-notification-bell-and-inbox.md#amendment--w-01--w-02-the-inbox-was-a-display-case-not-a-surface-2026-07-27).
2. The independently-owed items below discharged. **← the gate remains HELD on this alone.**

**Gate status after the W-01/W-02 remediation: still HELD.** Half the closing condition is discharged; the walk-defect half. Nothing in that remediation touches the six independently-owed items below, and the gate does not close until they are.

**Explicitly not conditions:** the deep-cold overshoot (standing labelled exception, closed by decision) and the out-of-area **W-05** (tracked separately, must not be folded into A-NTF's remediation).

**Recorded as UNTESTED, not passed:** the degraded-connection notice (Scenario 5 steps 2–4) and the failed-save revert (Scenario 8 step 4). Both are unreachable behind W-05 and become testable the moment it is fixed. Neither may be marked passed on inference.

---

## Still owed at the gate

Independent of the walk, carried from the retrospective:

- **NB-8** — Mist-posture proof
- **W12** — per-RPC gate verification (the A-COM gate's Appendix A pattern; **not yet produced for A-NTF**)
- **U049 §8 Q1** — adapter ownership
- The **email-deferral** recording — distinct from **W-08**, which is about the member-facing sentence
- The **DS-5 spec advance**
- The **937 ms warm ceiling-hugger**

## Follow-ups logged, not blocking

- **W-03**, **W-04**, **W-07**, **W-08** — seams. **W-07** ranks first: it is the same stale-view family as W-02 and could ride the same fix.
- **W-09** — **DECIDED 2026-07-27, routed to the DS-5 spec advance.** The `membership` category conflates **news** (*Alice joined*, *your role changed* — nothing owed by you) with **asks** (*you have been invited* — a decision only you can make), so one switch silences both. Rule adopted: *notices about your own account and access always reach you — and so do questions that only you can answer.* **Implementation is a registry split along asks-versus-news**; the surgical `action_type IS NOT NULL` exemption was **considered and rejected**, because `invitation_received` carries no `action_type` and that is the common case — a muted member could still be invited and never told. Also: the label *"Group membership & invitations"* should name the *telling*, not the thing. **Handle together with W-04** — otherwise the letter reaches the member and still goes nowhere. Not a condition of gate closure.
- **W-06** — a comment deletion.

## Consequences of the walk

- **Platform state left clean.** Preferences unmuted, one preference row platform-wide (an explicit allow), the announcement realtime toggle still `false`, Dev Login still sole Steward of Nya gruppen #1, Dev Login's inbox returned to its pre-walk state exactly. No synthetic notification rows were created — seeding was done by flipping existing rows, so no residue.
- **One deliberate change persists:** the twin group *"Nya gruppen 1"* is now stewarded by Grace, and the previous Steward was removed from it. That was the accepted cost of walking Scenario 6 through a real stewardship nomination, and the group was chosen precisely because nothing else depends on it.
- **A behaviour worth knowing, discovered en route:** accepting a stewardship nomination grants the **actual Steward role** (a `user_group_roles` row, template-first resolution) *and* removes the nominator from the group entirely — the `leave_group` cascade verbatim. Handing over leadership means leaving, not being demoted.

## Task sweep

**Still held.** `TASK-NC-01..04`, `TASK-NC-06` and `TASK-ND-01..05` remain on disk pending gate closure, per the A-COM precedent of one sweep line per area. `TASK-NC-05` must survive regardless — it carried the owed `/groups` measurement, now done, so re-check whether it can finally close.

---

*Walked by Stefan on `fringe-island.vercel.app`, 2026-07-27. Findings triaged in-session against the specs and the live database; every defect claim is anchored to a file:line or a query result in the [findings document](./2026-07-27-antf-walk-findings.md).*
