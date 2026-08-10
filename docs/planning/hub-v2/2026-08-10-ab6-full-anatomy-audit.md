# AB-6 — the full anatomy audit (2026-08-10)

**What this is:** the one FULL anatomy audit AB-6 schedules — after A-ADM closes, before Phase-4
cutover. AB-6 itself is the standing cadence ruling, not this document; this document is the audit
that ruling scheduled. It is the last unexecuted pre-cutover row on the Platform-Ops exit checklist.

**Inputs, taken as verified:** [`AB-REGISTER.md`](./AB-REGISTER.md) (TASK-AB-01, pinned 2026-08-10,
same day — every AB claim rechecked against the live system there; this audit trusts the register and
does not re-derive it). The three anatomy-drift claims from the register are **starting conditions,
not results** — an audit reporting only those did not look.

**Docket (four items, per [session 2026-08-10_03](../sessions/2026-08-10_03_-_AB-REGISTER-PINNED-TWO-OF-EIGHT-HAD-DRIFTED.md)):**
the Tier-1 `has_permission` finding · the `/admin/roles` + admin-plane deep-cold ADR-U043 pass ·
the sealed-threads admin-sight safety question · the anatomy stamp. `doc-health-check` runs inside
this audit (deferred into it by design at the session-19 close).

---

## Leg 1 — the anatomy stamp (docket item 4): EXECUTED

The stamp moved from "ADR-U048 A1 + ADR-U051 A1 (2026-07-31)" to **"ADR-U052 + ADR-U051 Amendment 2
(2026-08-10)"**. The three known drifts were fixed, and the sweep found **three more** nobody had
recorded:

| # | Finding | Fix |
|---|---|---|
| 1 | Stamp lagged U052 and U051A2 (third-plus consecutive boundary) | Stamp moved; both absorbed in substance, not just dated |
| 2 | PC-1 row advertised **feature flags** (ADM-15: zero substrate, zero reading code) and lacked the telemetry sink | Row now carries the U052 sink (recorder, deny-all RLS, 90-day prune, computed-on-read) and marks feature flags **chartered but deferred** |
| 3 | PC-4 row enumerated no RPCs while the live `admin_*` family is 34-strong (44 PC-4 total) | Row now points at the **canonical enumeration** — `supabase/ownership.manifest.json` (PC-4) held complete by the gate-enforced `admin_*` -> PC-4 rule — instead of hardcoding a count that would drift again (pointer, not snapshot) |
| 4 | **NEW:** the ADR index (`decisions/README.md`) itself had **no ADR-U052 row** — the anatomy-freshness gate compares the stamp against this index, so the gate's own input was stale and the check would have passed wrongly | U052 row added; gate hardening below |
| 5 | **NEW:** the diagram's PC-1 box carried "feature flags" too — so U052 absorption had **diagram impact**, unlike the last four reviews | `ECOSYSTEM_ANATOMY_V6.svg` bumped v2.5 -> **v2.6**: box text swaps feature flags for telemetry sink; `<desc>`, `<title>`, caption updated |
| 6 | **NEW:** `docs/platform/core/README.md` marked `organisation-specification.md` and `governance-specification.md` "_(to be written)_" — both have existed since 2026-05-15 (its own sibling `CLAUDE.md` says so); its PC-1 line also carried the feature-flags claim | Both corrected. (`ROADMAP.md` "(to be written)" is accurate and stands) |
| 7 | **NEW (found at leg-4 close):** the RD-B gate pass (2026-08-09) never appended its `PERF-MEASUREMENT-LEDGER.md` row — the append ADR-U052 clause 5 mandates at every gate pass. Same register-then-forget class as the function-registration miss (AB-3, twice) | Row backfilled with a dated omission note; doc-health Section 11 gains a **measurement-ledger append check** (gate 4) |

**Reviewed with no anatomy impact** (recorded so the review is visible, not inferable): the RD-A/RD-B/RD-C
role-provenance and template-catalogue work (internal to the PC-3 row's "roles"), the group hold-state
vocabulary suspended/offline/resting (internal to "groups" / PC-4 moderation scope), and U051A2
(framework-internal; dispatch wraps untouched Core contracts).

## Leg 2 — the Tier-1 `has_permission` finding (docket item 1): VERIFIED LIVE, RULING ON THE BOARD

**The mechanism, re-verified against the live database today** (not inherited from the ADM-G dossier):
`has_permission`'s Tier-1 arm matches any permission held via a `group_type = 'system'` group **with no
context-group condition** (`20260222000000_rebuild_universal_group_pattern.sql:436-453`; live definition
confirmed by catalogue query). DeusEx is `group_type='system'`; `auto_grant_to_deusex` grants its role
every permission at birth. Therefore **`has_permission(<any platform admin>, <ANY group>, <ANY
permission>) = TRUE`** — every purely permission-gated door platform-wide silently passes platform
admins, including for groups they never joined.

This is **load-bearing, not theoretical**: the ADM-G suspension-quarantine verdicts were decided by it,
and `get_group_forum` passes non-member admins through it today. It is also exactly the shape ADR-U028's
amendment ("root-admin authority is role-based — authority flows from the role's permission set via the
`has_permission()` walk") says platform authority SHOULD take — the Tier-1 arm *is* that walk. What has
never been ruled is whether its context-free reach is law or accident. **Ruling A on the decision board.**

## Leg 3 — the sealed-threads admin-sight question (docket item 3): VERIFIED LIVE, RULING ON THE BOARD

**Re-verified live today:** `get_group_conversations` returns only `sealed_at IS NULL` rows (live
definition, comment "FEAT-PD012: sealed threads are not live"). Under preserve-and-seal (C-E board D2,
Option A), a departed or erased member's group threads are preserved but sealed — so **a bully's sealed
thread is invisible to the admin wing**, even for a suspended group where G-4 (ADM-G board) ruled that
admin sight includes group-kind conversations *because bullying evidence lives in messages*. H041's no-go
was render-what-the-contract-returns; the open question is whether the **contract** should arm sealed
rows for the admin plane. **Ruling B on the decision board.**

## Leg 4 — the `/admin/roles` + admin-plane deep-cold ADR-U043 pass (docket item 2)

**Protocol:** per the 2026-08-02 A-ADM gate pass — production `fringe-island.vercel.app`,
`perf-measure.mjs`, measurement FIM (`perf-antf@fringeisland.test`) admin-elevated via
`perf-adm-fixture.mjs up`, deep-cold = enforced zero traffic after `signin`, completion measured to
the unconditionally data-derived selector `[data-testid^="template-row-"]` with the ADR-U043
Amendment 2 dual signal (box-visible is the verdict number; locator-visible shown for the
harness-lag record). Fixture erased at teardown, residue-verified.

### Deep-cold — first authenticated navigation

| Window | Idle before nav | First page of session | Box-visible wall | Fan-out fires at | B2 <= 2 500 ms |
|---|---|---|---|---|---|
| 1 — **DISCLOSED PROTOCOL MISS: 18 min idle, short of the >= 20 min minimum** (timer arithmetic error, caught by reconstruction at run end; kept as a datum because the shape is unambiguously deep-cold — the nav drew a multi-second boot) | ~18 min | `/admin/roles` | **5 417 ms** (locator 5 561 ms) | 3 842 ms | **FAIL — 2.17x** |
| 2 — clean window | ~24 min | `/admin/roles` | **5 359 ms** (locator 5 799 ms) | 3 997 ms | **FAIL — 2.14x** |

The two windows agree to within ~1 % — which retroactively validates window 1's number and shows the
instance was fully deprovisioned well before the 20-minute line. Composition both times:
provisioning + shell dominate (fan-out fires only at ~3.9 s); the page's own 2 API reads run
0.3–1.5 s. Also > 3 s, which B6 independently classes as a defect. **Extends the standing labelled
pre-launch exception** (closed by decision at the A-NTF gate; A-ADM 08-02 extended it at 3.6–4.4 s;
this page sits at ~5.4 s — the A-NTF-era magnitude — worth one line in the Phase-4 cutover
conversation, not an investigation now: the composition is the established one and nothing here
contradicts it).

### Warm — fresh-context full loads (the strict B3 form), dual signal per U043 Amendment 2

| Run | Box-visible | Locator-visible | B3 <= 1 000 ms |
|---|---|---|---|
| 1 (first fresh context after the cold session) | **518 ms** | 957 ms | PASS |
| 2 | **415 ms** | 419 ms | PASS |
| 3 | **422 ms** | 441 ms | PASS |

**PASS with wide headroom** — box-visible 415–518 ms against the 1 000 ms ceiling; even the
locator signal passes everywhere (run 1's 439 ms locator lag over box is the known Playwright
`waitFor` slow mode the dual-signal amendment exists for). `/admin/roles` sits comfortably inside
the binding budget — unlike the admin *detail* pages, which were the 08-02 pass's ceiling-hugging
carried finding.

Fixture: `perf-adm-fixture.mjs down` (1 report, 1 elevation deleted) -> `perf-measure.mjs teardown`
(personal group verified gone) -> `verify` residue **{fimUsers: 0, reports: 0, elevations: 0}`.

## Leg 5 — doc-health-check (run inside the audit): EXECUTED, CLEAN

Full multi-section run (delegated, then spot-verified against disk). **Zero critical findings.** All
sections clean: terminology, architectural drift (22 concepts), deviation markers, schema drift (10
migrations since 08-01, each documented), archived-tree and deleted-file refs, snapshot banners,
parked items (0), maturity consistency (**91** `6-done` specs, 0 gaps), entity coverage, placeholders,
CLAUDE.md cascade (20 files, 0 flags), graduation tracker, gate-review flags (0 in the manifest).

**Four standard findings, all fixed in place:** the architecture README's two current-diagram pointers
still said v2.5 (stale the same hour v2.6 landed — Section 11 step 4 catching exactly its class);
FEAT-H045's L4 maturity cell lagged its own YAML (`5-in-cycle` vs `6-done`, canonical wins); two
relative-link depth errors (`backlog/tasks/README.md:26`, `TASK-AB-01:63`).

**Three judgment findings, dispositioned here:** `PENDING.md` had zero mention in the ADR index it
lives beside — one-line index presence added. FEAT-PC012's STORY-3 presented the retired email-invite
path with its ADR-U040 supersession note 88 lines below — marker added at the story itself (its Hub
twin FEAT-H015 already had one). ADR-U052's reference to the swept TASK-OBS-01 file is **deliberate
and carried** (ADRs are append-only history; recorded at the sweep) — left standing.

Anatomy freshness (Section 11) with the new index-completeness step: stamp matches newest ADR,
**53/53 index rows present with matching statuses**, zero retired vocabulary in the living pair,
snapshots bannered/watermarked.

---

## Findings converted into gates (the AB-6 rule: every audit converts findings into gates)

1. **The anatomy-freshness gate hardened against its own stale input** (finding 4): the
   `doc-health-check` anatomy-freshness section now checks the stamp against the `decisions/`
   **directory listing** as well as the index README, and treats an ADR file missing from the index as
   a finding in its own right. (Skill edit — steering-file carve-out; in the held PR.)
2. **Ruling A, if ratified as law, ships with a gate:** a platform conformance test pinning the Tier-1
   arm's exact shape (`group_type = 'system'`, granted, name match, no context condition) so a future
   rewrite that silently drops *or widens* it fails red.
3. **The registration-second-act pattern** (two recorded instances of shipping a function without
   registering it; the conformance gate catches it only when the platform suite runs) — process
   question on the board, not silently adopted.

## Decision board — RULED (Stefan, 2026-08-10, in-session)

**A -> A1** (ratify + pin): executed — ADR-U028 gains the Amendment "the Tier-1 context-free arm is
law", the anatomy carries the reach sentence under Platform Core, and the pinning conformance test
ships with this audit. **B -> B1** (arm, bounded): recorded as [TASK-SEAL-01](../backlog/tasks/TASK-SEAL-01-sealed-thread-admin-sight.md)
with the four bounds stated as part of the ruling; schema-gated cycle, slotting at Phase-4 cutover
planning — the deferral has an owner from birth (the AB-2 lesson). **C -> adopted**: the schema-gate
checklist line is live in `docs/platform/CLAUDE.md` (the reviewer bullet). **D** (merge) remains open
— the PR holds for the named nod.

The board as presented, for the record:

| # | Question | Options | Recommendation |
|---|---|---|---|
| **A** | Is `has_permission`'s context-free Tier-1 arm **law**? | **A1** ratify + document + pin with a conformance gate (no schema change; the arm is ADR-U028's role-walk realized; guard = only `group_type='system'` groups reach Tier-1, and system-group membership is governed — last-DeusEx floor) · **A2** restrict Tier-1 (Core contract change, schema gate, breaks the ADM-G verdicts' basis) · **A3** leave undocumented | **A1.** It is already load-bearing; A2 re-opens settled admin-plane behaviour pre-cutover for no named harm |
| **B** | Should the **contract** arm sealed threads for the admin plane? | **B1** arm, bounded: suspended-scope only, group-kind only, rendered with a sealed label, read through the audited admin door (durable read telemetry) — schema-gated cycle, slotting Stefan's · **B2** status quo: seal beats sight; record the moderation blind spot as deliberate law (the AB-2 non-goal shape) · **B3** purpose-bound arm: sealed rows visible only while a live moderation report references the group | **B1** — it extends G-4's own already-ruled line ("bullying evidence lives in messages") to the rows most likely to hold exactly that evidence; preserve-and-seal *preserved* precisely so legitimate review stays possible. B3 is the fallback if B1 feels too wide |
| **C** | The registration-second-act gap: adopt a pre-merge rule that any migration creating a function runs the platform conformance suite (or at minimum `function-classification-completeness`) before merge? | adopt / fold into the schema-gate checklist / decline | **Adopt as a schema-gate checklist line** — cheapest form that closes both recorded instances |
| **D** | The held PR (this audit): merge? | Carve-outs touched: `docs/platform/core/README.md`, the `doc-health-check` skill edit | Merge on your nod; everything else in the PR is routine docs |

**Rulings A and B change no code in this session either way** — A1 adds one test in a follow-up
commit on this branch if ratified now, or a task if not; B1/B3 are a future schema-gated cycle.

---

## Audit verdict

**The audit AB-6 scheduled is EXECUTED — all four docket items closed, doc-health clean, findings
converted into gates, rulings landed.** The Platform-Ops exit checklist's last pre-cutover row is
ticked; **Phase-4 cutover's entry condition is met** (pending the held PR's merge, ruling D).

- Stamp: U052 + U051A2 absorbed in substance; diagram v2.6; **six** drift findings fixed (the
  register's three plus three the sweep found: the ADR index's missing U052 row, the diagram's PC-1
  box, the core README's phantom "(to be written)"s).
- Docket 1 (Tier-1 `has_permission`): verified live, **ruled law (A1)** — ADR-U028 amendment +
  anatomy sentence + pin test `tier1-context-free-arm.test.ts` **4/4 green** (shape pin, total-reach
  pin incl. ghost-context, not-widened control, detachment control).
- Docket 2 (`/admin/roles` ADR-U043): deep-cold ~5.4 s x2 windows, labelled exception extended;
  **warm PASS wide** (415–518 ms box-visible). Ledger row appended.
- Docket 3 (sealed threads): verified live, **ruled B1 (arm, bounded)** — TASK-SEAL-01 filed with
  the four bounds as part of the ruling; slotting at Phase-4 cutover planning.
- Leg 5 (doc-health): **0 critical**; 4 standard findings fixed in place; 3 judgment findings
  dispositioned (2 fixed here, 1 deliberate-and-carried).
- Gates shipped by this audit: the Section-11 **index-completeness check** (a stale ADR index can no
  longer blind the freshness gate), the **Tier-1 arm pin test**, and ruling C's **schema-gate
  registration line** in the platform tier file.

**Audit honesty log** (a stamp over an unexamined process is the drift this audit exists to kill):

1. Window 1's cold nav ran at ~18 min idle — **short of the >= 20 min protocol** (timer arithmetic
   error, caught by clock reconstruction, disclosed in the table above). Window 2 was run clean at
   ~24 min; the two agree to ~1 %, so the datum was kept rather than discarded.
2. The pin test's first run **leaked two test users** (wrong field: `TestUser.id` does not exist —
   `user.id` does; `afterAll` crashed on the first cleanup call). Both purged via the
   consent-erasure bypass in the helper's own order, residue-verified **0/0/0**; the fix is in the
   committed test. The leak never reached an orphan: caught in the same session by the suite's own
   loud failure — the TASK-INT-03 instrument philosophy working as designed.
