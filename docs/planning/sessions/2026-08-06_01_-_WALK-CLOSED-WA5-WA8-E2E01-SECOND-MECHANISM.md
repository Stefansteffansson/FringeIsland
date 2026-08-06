# Session bridge — the walk closed: WA-5..WA-8 dispositioned, and TASK-E2E-01's retirement claim corrected

**Date:** 2026-08-05 → 2026-08-06 (session 10, continued past midnight) · **Wave:** Ferd · **Cycle:** N-E (closed) + the live walk
**Follows:** [`2026-08-05_03_-_NE-CLOSED-GATES-APPLIED-BOTH-SPECS-6-DONE-E2E01-RETIRED.md`](./2026-08-05_03_-_NE-CLOSED-GATES-APPLIED-BOTH-SPECS-6-DONE-E2E01-RETIRED.md)

---

## READ THIS FIRST

1. **The walk is COMPLETE — all twelve scenarios** (S1–S8 the N-E + ADM-E corrections; S9–S12 the never-before-walked role-template editor). Verdicts and per-finding records: [`2026-08-05-ne-walk-findings.md`](../hub-v2/2026-08-05-ne-walk-findings.md).
2. **Four findings, all dispositioned:** **WA-5** (hard delete stranded on a 404 → "Member erased" panel, #433) · **WA-6** (template-less groups instantiate the **system set only**; clones pull-only — ruled, built, held, nodded "ok merge 435", applied `20260805150000`, **verified live twice**: G10 born clean, then the pull door delivering v6 on demand) · **WA-7** (Save draft wiped the fabric → edits kept + "Draft saved as vN — awaiting Apply", #437) · **WA-8** (directive: group role copies show source version + copied-date — **not built**, slotted at the next boundary with the [role-distribution design note](../hub-v2/2026-08-05-role-distribution-design-note.md)).
3. **The correction that matters most — TASK-E2E-01 was declared retired prematurely, by me, in the `_03` bridge and the root CHANGELOG.** The third post-fix fleet falsified it (`signup.spec` red, six specs unrun). Second mechanism found: **`sessions.spec` signed in as the shared `SESSION_EMAIL` identity in its own fresh contexts and revoked `nonCurrentRows.first()`** — a non-current session *of that shared user*, sometimes the storageState one. My AC-2 audit had cleared it because I discriminated on *browser context* instead of *identity*. **Fresh context ≠ fresh identity.** Fixed the same way as profile.spec (dedicated FIM + consented teardown), 4/4 green. The task file carries the full correction, the new rule, and — deliberately — the **uncleared** remaining audit scope (13 candidate specs; `account-state.spec` named as next suspect, since it flips the *shared user's own* lifecycle state and depends on every restore path running).
4. **A discipline lesson worth carrying:** "×2 consecutive green fleets" is **not** a sufficient bar for this family — ordering luck produces it. Re-closure must state the *mechanism removed*.

## What this session did (after the `_03` bridge)

- Ran the walk end to end with Stefan on production; ruled and fixed WA-5 and WA-7 in-walk (red-first each), ruled WA-6 and shipped it through the held schema gate, recorded WA-8.
- Wrote and twice corrected the walk script mid-walk (#431 S5 staging, #432 S6's member-vs-group target classes) — both were my imprecisions, caught by Stefan walking them.
- Discussed and filed the **role-distribution design note** (Stefan's publishing model + four named decisions: no silent merge → diff ceremony; lockout guard on retire; retire-never-delete centrally; the creation-time wrinkle).
- **Debris swept on Stefan's nod:** 10 walk groups + 20 leaked fixture groups + 13 consented fixture users (the last needing the sanctioned `app.consent_erasure_in_progress` path — a bare delete refuses on the consent FK).
- **Fixed the leak I caused:** both specs I authored this session shipped without teardowns; teardowns added (#439) and TASK-E2E-02 gained the confirmed mechanism + an audit lead (`admin-roles.spec` swallows the same refusal via a bare `.catch`).
- Adjudicated the late sweeps honestly: the collation red (deterministic, first mixed-case template name — comparator adapted, labelled), the wedged 14-hour dev server (killed by PID — probe-before-trust, again), and the WA-5/WA-7 E2E cells that still pinned the pre-fix behaviours (adapted, observed red first).

## Numbers at close

Gate suite (PC025) **17/17** post-apply · `admin-roles` E2E **11/11**, leak 0→0 · N-E gate suite **14/14** · full unit **1300/1300** · lint 0 · `next build` green · full integration green after the collation adaptation · **final E2E fleet 133/133, leak 0→0** (7.5 min, run after the sessions.spec identity fix; the prior fleet — 100 passed / 2 failed / 6 unrun — is what exposed the second mechanism). Note the honest caveat: a green fleet is now explicitly *not* the evidence this family is closed — the mechanism removal is.

## Standing items

**TASK-E2E-01 — REOPENED-then-fixed; its remaining audit scope is explicitly uncleared** (see the task) · TASK-E2E-02 (historical leaked population; purge decision Stefan's) · **WA-8 + the role-distribution design note** → next planning boundary · AB-6's docket (Tier-1 `has_permission` finding · admin-plane deep-cold U043 pass · sealed-threads sight question) · the deferred Eid piles · "Steward clone" persists platform-wide with live copies (no retire affordance exists — that is the design note's first slice) · **the Avatar account still carries the temporary password set this session; Stefan is rotating it himself**.

## Next

**AB-6** — the full anatomy audit, the last unexecuted pre-cutover row on the Platform-Ops exit checklist. It opens with the retro (now six ledger items: ADM-G's two, N-E's two, plus this session's *conformance-gates-for-new-object-classes* and *identity-not-context* lessons) and the boundary doc-health run.

---

## HANDOFF — the next session opens at RD-A (added at session close, 2026-08-06)

**Stefan's call at close:** *"go with both A and B but in a new session."* Role distribution is **pulled into Ferd, pre-cutover** ([design note](../hub-v2/2026-08-05-role-distribution-design-note.md) — status, board, and settlement all recorded there; plan row on the [Platform-Ops exit checklist](../hub-v2/phase-3-platform-ops-completion-plan.md) ahead of AB-6). **Nothing was started this session.**

**The new session's first moves, in order:**

1. **Read the board's settlement** (design note §Board settlement). RD-1 is settled explicitly — **RD-A then RD-B, both before AB-6**. RD-2..RD-10 stand at their defaults; **re-read them aloud for a confirming nod** before decomposition hardens them into law.
2. **This is a boundary — the owed rituals land here:** the **cycle retro** (ledger now six items: ADM-G's two, N-E's two, plus this session's *conformance-gates-for-new-object-classes* and *identity-not-context* lessons) and the **boundary doc-health run**, both deferred from the N-E close.
3. **Then decompose RD-A** to 4-ready paired specs (`ecosystem-decomposition`): WA-8 provenance stamp (source version + copied-date, stamped at all three instantiation doors, honest-unknown backfill) · central retire (offerable-flag + filters on both picker reads + retire/unretire ceremony) · **group-side retire of a template-derived role** — note the substrate fact found at board time: `RolesPanel` gates deletion on `created_from_role_template_id` being null, so an adopted role is **permanent in its group today**. Schema-gated; hold the migration PR for a named approval per the standing rule.
4. **RD-B follows** (publications table + scoped publish + the three passive notice kinds + the Steward's available-roles view + the diff-on-copy ceremony), then **AB-6**, then Phase-4 cutover.

**State at handoff:** main clean, discovery synced, dev server stopped, dashboard refreshed, E2E fleet 133/133, all gates green, no PR open or held. **Owed to Stefan personally:** nothing — the Avatar password rotation is his and he has it.
