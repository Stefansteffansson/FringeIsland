# The Notifications area gate (A-NTF) — 2026-07-27

Companion to the [area retrospective](../retrospectives/retro-2026-07-26-notifications-area.md). A-NTF was the **fifth of six** Phase-3 areas, covering cycles **N-A** (passive core), **N-B** (typed actions and acting fan-out), **N-C** (realtime hint and reconnect reconciliation) and **N-D** (preferences and the dispatcher).

**Verdict: ~~HELD~~ → CLOSED 2026-07-28.** Every blocking condition is discharged. See [Gate verdict](#gate-verdict) below.

Sources: the [measurement record](./2026-07-27-antf-gate-measurements.md) · the [live-walk findings](./2026-07-27-antf-walk-findings.md) · the [walk script](./2026-07-26-antf-live-walk-script.md) · the [NB-8 Mist-posture proof](./2026-07-27-antf-nb8-mist-posture-proof.md) · the [gate decision board](./2026-07-27-antf-gate-decision-board.md) · the [warm-ceiling investigation](./2026-07-28-antf-warm-ceiling-investigation.md).

## Closure summary (2026-07-28)

| Condition | Disposition |
|---|---|
| **W-01 + W-02** — the inbox was a display case | Fixed red-first, PR #317 |
| **W12** — per-RPC verification | Appendix A produced; found 7 anon-executable contracts, repaired by `20260727120000` |
| **NB-8** — Mist posture | **Proof REFUTED its own premise**; fixed by `20260727180000` (board GB-1). The rule is now true by construction |
| **U049 §8 Q1** — adapter ownership | Resolved (board GB-2): DS-5 owns adapters below the Platform API, PC-1 owns transport. Resolved-in-principle, unrealized |
| **Email deferral** | Recorded in V3 §3 + DS-5 §3; "no email substrate shipped" verified literally |
| **DS-5 spec advance** (W-09 + W-04) | Shipped together (board GB-3): asks split from news and made unmutable; the invitation now leads where it can be answered |
| **937 ms warm ceiling** | **Investigated and closed as not-a-defect** — warm steady state is ~400 ms (n=10, zero over ceiling); the parked fan-out lever is **refuted by measurement** |
| **Task sweep** | Executed — see [Task sweep](#task-sweep) |

**What the gate cost, and what it bought.** Three of the six owed items turned out to be wrong rather than merely undone: NB-8's premise was false, W-09 was filed against the wrong scope (it missed `stewardship_nomination`, the largest ask population), and the 937 ms had a documented cause that measurement contradicted. A fourth — W-04 — was worse than filed: the invitation did not merely fail to point anywhere, it navigated to a page with no answering affordance at all.

**Carried out of the gate, filed not buried:** [`TASK-INT-03`](../backlog/tasks/TASK-INT-03-test-fixture-orphaned-personal-groups.md) (test fixtures orphan personal groups — 11 150 of 12 687 were orphaned, holding 73% of the notifications table; the universal blocker is fixed, two residual sources are not) and [`TASK-INT-04`](../backlog/tasks/TASK-INT-04-nd-pair-suppression-intermittent.md) (the N-D PAIR test is intermittent in fleet — **filed after an earlier "flake" call was retracted by a second failure**). Also still open and non-blocking: **W-03**, **W-07**, **W-08**.

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

**~~HELD~~ → CLOSED 2026-07-28.** The remediation below was carried in full; see the [closure summary](#closure-summary-2026-07-28) at the head of this document. The original verdict and its reasoning are preserved unedited.

**HELD.** Not failed — held pending a short, well-scoped remediation.

**What passed convincingly.** N-C and N-D. Live delivery, reconnect reconciliation, suppression-at-write-time, the preference model's "absence means allowed" default, the non-suppressible account category with its plain-language explanation, and the operator console with its privilege boundary intact. Scenario 7 is the best-evidenced result of any Phase-3 walk to date.

**Why it is held.** N-A ships with **two defects against written acceptance criteria**, and one of them — **W-01** — is the inbox page's *primary interaction*. The area cannot be called green while the surface N-A exists to deliver does not respond to a click. Neither defect is architectural; both are small and localised.

**Conditions to close:**

1. ~~**W-01** and **W-02** fixed, with the existing N-A E2E journey extended to cover an inbox-row click and a page-side mark-all badge assertion.~~ **DISCHARGED 2026-07-27** (PR #317). Both fixed red-first; the N-A journey was **extended, not duplicated**, and now clicks an inbox row and asserts the badge after a page-side mark-all — both were demonstrated red by reverting the page. A third stale-badge path (answering an actionable row) was closed in the same pass. Hub unit 987 → 994/994, notification E2E 10/10. See [FEAT-H030's amendment](../../products/hub/features/FEAT-H030-notification-bell-and-inbox.md#amendment--w-01--w-02-the-inbox-was-a-display-case-not-a-surface-2026-07-27).
2. The independently-owed items below discharged. **← the gate remains HELD on this alone.**

**Gate status after the W-01/W-02 remediation: still HELD.** Half the closing condition is discharged; the walk-defect half. Nothing in that remediation touches the six independently-owed items below, and the gate does not close until they are. ***All six were subsequently discharged (2026-07-27 / 2026-07-28) and the gate is CLOSED — see the [closure summary](#closure-summary-2026-07-28).***

**Explicitly not conditions:** the deep-cold overshoot (standing labelled exception, closed by decision) and the out-of-area **W-05** (tracked separately, must not be folded into A-NTF's remediation).

**Recorded as UNTESTED, not passed:** the degraded-connection notice (Scenario 5 steps 2–4) and the failed-save revert (Scenario 8 step 4). Both are unreachable behind W-05 and become testable the moment it is fixed. Neither may be marked passed on inference.

---

## Still owed at the gate

Independent of the walk, carried from the retrospective:

- **NB-8** — Mist-posture proof. **RUN 2026-07-27 — PREMISE REFUTED** ([proof](./2026-07-27-antf-nb8-mist-posture-proof.md)). The delivery path does *not* structurally exclude Mist durable rows: all 6 Mists hold a `role_assigned` row from their own personal-group bootstrap, readable / mark-readable / exportable, refused only at the preference doors (`28000`) — a notification a Mist cannot silence. The realtime hint fires for them too, against `FEAT-PD015:59`. Not exploitable (self-referential, CASCADEs away on erase) and not Mist-specific (1516/1548 FIMs carry it). **The record half is discharged; the disposition is board item GB-1.**
- ~~**W12** — per-RPC gate verification (the A-COM gate's Appendix A pattern; **not yet produced for A-NTF**)~~ **PRODUCED 2026-07-27 — see [Appendix A](#appendix-a--w12-per-rpc-gate-verification-roll-up).** 15 callable contracts walked body-vs-spec, 4 internal fact-handlers checked, 6 tables + RLS read live. **Two findings, neither exploitable:** F1 — seven N-D contracts executable by `anon` (of 181 functions in `public`, exactly those 7; all refuse anon in-body, probed); F2 — `notify_invitation_received()` retains `authenticated` EXECUTE (trigger fn, direct call raises 0A000). Repair migration `20260727120000` **HELD at the schema gate**; the lockdown suite now asserts the invariant rather than a list. **This item is discharged; its repair is not yet merged.**
- **U049 §8 Q1** — adapter ownership. **Board item GB-2.** Two facts arrived 2026-07-27: the question's own anchor (the open-coded `app/api/invitations/send-email`) lives **only in `hub-legacy/`**, the frozen oracle, so the lean was anchored to something outside the app being built; and **ADR-U038** now forbids a BFF route being the sole home of a rule, which rules that anchor out as precedent.
- ~~The **email-deferral** recording — distinct from **W-08**, which is about the member-facing sentence~~ **RECORDED 2026-07-27** in [V3 §3](../../verticals/notifications/SPECIFICATION.md) and [DS-5 §3](../../platform/domain/communication.md): in-app is the only delivering channel, `email` is registered but stored-not-delivering so a preference binds when delivery lands, and dispatch needs its own ADR first. **"No email substrate shipped" verified literally** — Hub v2 has no `lib/email/`, no send-route, no vendor dep; the seam both specs described lives in `hub-legacy/`. **W-08 is untouched and still open.**
- The **DS-5 spec advance** — **board item GB-3**, carrying **W-09** (the asks-versus-news split) and **W-04** (the pointer), which must move together.
- ~~The **937 ms warm ceiling-hugger**~~ **INVESTIGATED AND CLOSED 2026-07-28 — [full record](./2026-07-28-antf-warm-ceiling-investigation.md).** Re-measured on production against the authenticated real path: **n=10 fully-warm fresh-context runs, 308–436 ms, zero over the 1 000 ms ceiling.** The 937 ms was a **partial-warmth** number, not steady state. **The parked fan-out lever is refuted, not deferred** — it was an explicit un-park candidate at this gate, and the decisive comparison went the other way: `/groups` (4 reads, *in* `BOOT_PATHS`) measured **slower** than `/notifications/preferences` (6 reads, not in it). The reads are fully concurrent, so cost is `max(read)` not `sum(read)`, and consolidation trades cheap parallel reads for one fat serial one. **The real signature is a correlated stall** — when a page is slow, *every* read is slow by the same amount, finishing within ~5 ms of each other (a shared pooler/instance stall, worst observed 3 477 ms on `/groups`). That is a platform-tier concern belonging with the standing cold-load exception, not an A-NTF defect. Two harness defects were found and fixed en route: `STATE` and `OUT` resolved to the **same file** (a rename left a no-op `.replace`), silently corrupting the session after the first `measureNav`; and `waterfall` was hardcoded to one path, which is why this attribution had never been obtained for `/groups`.

## Follow-ups logged, not blocking

- **W-03**, **W-04**, **W-07**, **W-08** — seams. **W-07** ranks first: it is the same stale-view family as W-02 and could ride the same fix.
- **W-09** — **DECIDED 2026-07-27, routed to the DS-5 spec advance.** The `membership` category conflates **news** (*Alice joined*, *your role changed* — nothing owed by you) with **asks** (*you have been invited* — a decision only you can make), so one switch silences both. Rule adopted: *notices about your own account and access always reach you — and so do questions that only you can answer.* **Implementation is a registry split along asks-versus-news**; the surgical `action_type IS NOT NULL` exemption was **considered and rejected**, because `invitation_received` carries no `action_type` and that is the common case — a muted member could still be invited and never told. Also: the label *"Group membership & invitations"* should name the *telling*, not the thing. **Handle together with W-04** — otherwise the letter reaches the member and still goes nowhere. Not a condition of gate closure.
- **W-06** — a comment deletion.

## Consequences of the walk

- **Platform state left clean.** Preferences unmuted, one preference row platform-wide (an explicit allow), the announcement realtime toggle still `false`, Dev Login still sole Steward of Nya gruppen #1, Dev Login's inbox returned to its pre-walk state exactly. No synthetic notification rows were created — seeding was done by flipping existing rows, so no residue.
- **One deliberate change persists:** the twin group *"Nya gruppen 1"* is now stewarded by Grace, and the previous Steward was removed from it. That was the accepted cost of walking Scenario 6 through a real stewardship nomination, and the group was chosen precisely because nothing else depends on it.
- **A behaviour worth knowing, discovered en route:** accepting a stewardship nomination grants the **actual Steward role** (a `user_group_roles` row, template-first resolution) *and* removes the nominator from the group entirely — the `leave_group` cascade verbatim. Handing over leadership means leaving, not being demoted.

## Task sweep

~~**Still held.** `TASK-NC-01..04`, `TASK-NC-06` and `TASK-ND-01..05` remain on disk pending gate closure, per the A-COM precedent of one sweep line per area. `TASK-NC-05` must survive regardless — it carried the owed `/groups` measurement, now done, so re-check whether it can finally close.~~

**EXECUTED 2026-07-28** on gate closure. Swept: `TASK-NC-01..06` and `TASK-ND-01..05` (11 files), plus the four carried as *"closed, awaiting the next retro sweep"* — `TASK-DOC-003`, `TASK-DOC-004`, `TASK-DOC-005`, `TASK-INT-02`. Recorded in the [backlog README](../backlog/tasks/README.md), per the A-COM precedent of one sweep line per area.

**`TASK-NC-05`'s verdict, lifted here because the file is gone.** Its re-check found **six of seven acceptance criteria met on disk**: the nominations slice is out of the overview bundle, the `fetchMyNominations` / `adoptMyNominationsRead` / `requestMyNominations` trio is confirmed deleted repo-wide, `/api/me/nominations` survives with a test (deliberately — it is FEAT-H017-owned), both stale comments are corrected, and `leadership-transfer.spec.ts:168` asserts the capability moved to the bell rather than vanishing. **The seventh is half-unobtainable and was not ticked:** it asked for `/groups` first paint *before and after*, and only after-numbers exist, because the slice was already retired on production when the measurement pass ran. What that pass did establish is that the after-number is in band with history and shows no regression. **Closed recording that honestly, rather than claiming a delta nobody measured.**

**Two tasks were filed rather than swept**, both raised by this gate's own work: [`TASK-INT-03`](../backlog/tasks/TASK-INT-03-test-fixture-orphaned-personal-groups.md) (test fixtures orphan personal groups — the universal blocker is fixed, two residual sources are not) and [`TASK-INT-04`](../backlog/tasks/TASK-INT-04-nd-pair-suppression-intermittent.md) (the N-D suppression PAIR test is intermittent in fleet, green in isolation — **filed after an earlier "flake" call was retracted by a second failure**).

---

*Walked by Stefan on `fringe-island.vercel.app`, 2026-07-27. Findings triaged in-session against the specs and the live database; every defect claim is anchored to a file:line or a query result in the [findings document](./2026-07-27-antf-walk-findings.md).*

---

## Appendix A — W12 per-RPC gate-verification roll-up

**Produced 2026-07-27**, discharging the W12 item. Scope: migrations `20260723120000` (N-A) → `20260726120000` (N-D). Body canon = the latest re-issuing migration; gate canon = the owning spec. Live ACLs, RLS policies and refusal behaviour were read from the production database (`jveybknjawtvosnahebd`) and probed under `SET LOCAL ROLE`, not inferred from source.

**FIM gate** = `ds5_require_fim_subject()` (resolves the personal group; raises **28000** for no subject *and* for a Mist — `is_temporary`). **Admin gate** = `is_platform_admin()` (raises **42501**).

### Callable contracts (granted to `authenticated`)

| RPC | Latest body | Gate in body | Owning spec — match? | Adversarial coverage | Verdict |
|---|---|---|---|---|---|
| `get_own_notifications(int,ts,uuid)` | N-B `…120000:40` | FIM; own-recipient scope; keyset | PD013/PD014 — match | notification-contracts, actionable (22 hits) | VERIFIED |
| `get_own_unread_notification_count()` | N-A `…120000:166` | FIM; own scope | PD013 — match | notification-contracts, realtime-hint (10) | VERIFIED |
| `mark_notification_read(uuid)` | N-A `…120000:190` | FIM; own row only | PD013 — match | notification-contracts (5) | VERIFIED |
| `mark_all_notifications_read()` | N-A `…120000:213` | FIM; own scope | PD013 — match | notification-contracts (2) | VERIFIED |
| `get_own_notifications_export()` | N-A `…120000:254` | FIM; own scope | PD013 / PC008 — match | preference-and-dispatcher (2) | VERIFIED |
| `get_own_data_export()` | N-A `…120000:300` | FIM; own scope | PC008 — match | data-export, export-composite (4) | VERIFIED |
| `respond_to_acting_invitation(uuid,bool)` | N-B `…120000:206` | FIM; permission-fanned; first-answer-wins | PD014 / ADR-U051 — match | actionable-notifications (8) | VERIFIED |
| `get_own_notification_preferences()` | N-D `…120000:374` | FIM (28000) | PD016 — match | preference-and-dispatcher (4) | **VERIFIED — grant finding F1** |
| `set_own_notification_preference(text,text,bool)` | N-D `…120000:421` | FIM (28000); category exists; suppressible | PD016 — match | preference-and-dispatcher (10) | **VERIFIED — F1** |
| `get_own_notification_preferences_export()` | N-D `…120000:486` | own subject (28000) | PD016 / PC008 — match | preference-and-dispatcher (1) | **VERIFIED — F1** |
| `get_notification_nudge_policy()` | N-D `…120000:531` | admin (42501) | PD016 / H033 — match | preference-and-dispatcher (2) | **VERIFIED — F1** |
| `set_notification_nudge_policy(text,text)` | N-D `…120000:562` | admin (42501); known key | PD016 — match | preference-and-dispatcher (1) | **VERIFIED — F1** |
| `set_notification_category_nudge(text,bool)` | N-D `…120000:589` | admin (42501); category exists | PD016 — match | preference-and-dispatcher (4) | **VERIFIED — F1** |
| `get_platform_announcement_reach()` | N-D `…120000:625` | admin (42501) | PD016 / H033 — match | preference-and-dispatcher (2) | **VERIFIED — F1** |
| `ds5_require_fim_subject()` | N-D `…120000:337` | the shared FIM gate itself | PD016 — match | transitively, every row above | VERIFIED (helper) |

**Every one is `SECURITY DEFINER` with `SET search_path = ''`** — 19 of 19, no exceptions.

### Internal fact-handlers — confirmed closed to `authenticated`

| Function | Returns | Live posture |
|---|---|---|
| `ds5_may_deliver(uuid,text,text)` | boolean | REVOKEd — `authenticated` ✗, `anon` ✗ |
| `ds5_apply_notification_preference()` | trigger | REVOKEd — `authenticated` ✗, `anon` ✗ |
| `notify_notification_hint()` | trigger | REVOKEd — `authenticated` ✗, `anon` ✗ |
| `notify_invitation_received()` | trigger | **`authenticated` ✓ — finding F2** |

### Tables and RLS

| Table | RLS | Policies | Posture |
|---|---|---|---|
| `notifications` | on | 1 | `SELECT` own rows only, `{authenticated}`. **No write policy** — a direct `INSERT` as `authenticated` is refused **42501** (probed). anon sees **0 rows** (probed). |
| `notification_preferences` | on | 1 | `SELECT` own rows only, `{authenticated}`. No write policy. |
| `notification_categories` / `_channels` / `_kinds` | on | 1 each | `USING (true)`, `{authenticated}` — reference registries, no member data. |
| `ds5_config` | on | **0** | Deny-all by policy absence; reachable only through the admin-gated operator RPCs. Deliberate, and the most restrictive shape. |

No policy names `anon` anywhere in the area, and there are **no INSERT/UPDATE/DELETE policies at all** — every write goes through a `SECURITY DEFINER` contract.

### Automatic-fail checks

- **Sole-home-in-BFF (ADR-U038):** none. Every rule above is enforced in the substrate; the Hub's `app/api/notifications/*` routes are thin presentation (SQLSTATE→HTTP, telemetry).
- **Core-referencing-domain (ADR-U047):** green — no Core function in scope references a DS-5 object.

### Findings

**F1 — seven N-D contracts were executable by `anon`.** Cause: N-D wrote `REVOKE ... FROM anon` where N-A/N-B/N-C wrote `FROM PUBLIC, anon`, and `REVOKE ... FROM anon` is a no-op against a privilege held via PUBLIC. Measured blast radius: **of 181 functions in `public`, exactly these 7** — the 2026-07-06 lockdown holds everywhere else. **Not exploitable:** all seven refuse anon in-body, probed live (42501 admin-gated ×4, 28000 FIM-gated ×3). The defect is that the grant layer, which ADR-U038 L27 names as an enforcement surface in its own right, was wider than every one of those bodies intended.

**F2 — `notify_invitation_received()` retains `authenticated` EXECUTE.** It has never carried a GRANT or REVOKE line in *any* migration since its creation in February; the privilege comes from default privileges. **Inert** — a direct call raises `0A000` (probed). Recorded because its two A-NTF sibling trigger functions are both explicitly closed.

**Repair:** `20260727120000_n_d_anon_execute_repair.sql` — pure REVOKE, no behaviour change, plus `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` so the next migration cannot inherit the trap. **HELD at the schema gate.**

**Prevention:** the hardcoded `anon-execute-lockdown` suite could only ever catch functions that existed when it was written — which is exactly how this escaped. It now also asserts the **invariant** (zero anon-executable functions in `public`, allowlist empty by design), so the next omission fails in CI rather than at a live walk.
