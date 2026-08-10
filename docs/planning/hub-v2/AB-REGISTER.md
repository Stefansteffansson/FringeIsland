# The AB register — all eight items, pinned and verified against the live system

**Pinned:** 2026-08-10 (TASK-AB-01) · **Wave:** Ferd · **Owner:** platform/core
**Source of the items:** [`phase-3-platform-ops-completion-plan.md`](./phase-3-platform-ops-completion-plan.md) rows 77-87 (board SETTLED 2026-07-31, Stefan: all rows as recommended).

## What the AB register is

Eleven rows (AB-1a..AB-1d, AB-2..AB-8) settled at the **Platform-Ops (A-ADM) area-open board**, carried
forward by name ever since. They are **unrelated pieces of carried work — not a sequence, not a ladder,
not stages**. Any plan that treats "AB-5 then AB-6" as progression is working from a wrong model. The
only ordering relation in the whole register is the one AB-6 itself states.

**AB-6 is the audit *cadence ruling*, not an audit.** It is the standing rule saying *when* full anatomy
audits run. What is scheduled is a full anatomy audit **per** AB-6 — after A-ADM closes, before Phase-4
cutover. Phrases like "Phase-4 cutover / AB-6" in session bridges read AB-6 as a work item; that is
shorthand for "the audit AB-6 requires", not the rule itself.

## How this pin was made

Every "done / closed / verified executed" claim below was **rechecked against the live system** — the
dev database (`FringeIslandDB`, project `jveybknjawtvosnahebd`), the migration set, the ownership
manifest, and the running test suites. Nothing in the State column is inherited from the board.

This matters because the risk was never that these items were unfinished. It is that they were recorded
as finished, and the full anatomy audit would then stamp the map on top of those records without
rechecking them — certifying drift rather than removing it. **One of the eight was wrong, and one was
red on `main` at the moment of checking.**

---

## The register

| | What it is | Verified state | Evidence (checked 2026-08-10) |
|---|---|---|---|
| **AB-1** | Telemetry sink: Postgres-native durable event store, PC-1-owned, fire-and-forget recorder; 90-day retention; ADM-1 computes on read; docs-side perf ledger | **HOLDS** | `telemetry_events` created at `supabase/migrations/20260731180000_adm_a_pc018_telemetry_store_and_statistics.sql:33`; `record_telemetry_event` `:56`; `prune_telemetry_events` `:87`. **Live: table present, 4,874 rows** — the sink is not just built, it is producing. [ADR-U052](../../architecture/decisions/ADR-U052-telemetry-sink-and-analytics-posture.md) **Accepted** (line 3). Ledger present at [`PERF-MEASUREMENT-LEDGER.md`](../reference/PERF-MEASUREMENT-LEDGER.md). TASK-OBS-01 swept at the A-ADM gate close ([tasks README](../backlog/tasks/README.md):64). |
| **AB-2** | `recordAuditEntry`'s durable home (AC3-O6) — PC-4 `record_auth_event()` writing `admin_audit_log`, four callers, **"null-actor accepted"**, append-only, telemetry mirror kept, A-OPS naming fixed | **HOLDS EXCEPT ONE CLAUSE — the null-actor clause is FALSE.** See finding 1. | `record_auth_event` at `20260731190000_adm_a_pc019_auth_event_audit.sql:29`. All four callers wired: `hub/app/api/auth/{signup,audit,transcend,farewell}/route.ts`. **Live proof: `admin_audit_log` holds 6,868 rows carrying all four action strings** (`account.created`, `auth.sign_in`, `identity.transcended`, `mist.explicit_erase`). A-OPS naming: **zero hits** under `hub/`. |
| **AB-3** | GC-13/AC3-O5 — full four-way PC-1..PC-4 split of the CORE function declaration, plus the pinned mechanical rule `admin_* -> PC-4`; unclassified fails red | **STRUCTURE HOLDS; THE GATE IT INSTALLED WAS RED ON `main`.** See finding 2. | Split is real in `supabase/ownership.manifest.json`: PC-1 5 · PC-2 20 · PC-3 68 · PC-4 44 (135 core functions; the board said "~100" — growth since). Mechanical rule enforced at `hub/tests/integration/platform/function-classification-completeness.test.ts:100`; **zero `admin_*` misfiled outside PC-4**. |
| **AB-4** | `admin_audit_log` Art. 15 shape — split by row direction: actor-rows exported, target-of-third-party-admin-action rows exempt under a narrowed citation | **HOLDS** | `ownership.manifest.json` -> `export.tables.admin_audit_log` carries `representation: "audit_trail section ... rows where the member is the ACTOR ... added ADM-D FEAT-PC022"` and `exemption.scope: "partial"` with the narrowed reason (third-party identity, visible-by-effect, moderation integrity) and the citation naming migration `20260802120000`, `schema_version` 2. Executed exactly as settled. |
| **AB-5** | ADM-8 sequencing — ratify **ADM-8-early**, cycle ADM-B immediately after the foundation cycle; TASK-INT-05 an in-cycle precondition | **HOLDS** | ADM-B ran immediately after ADM-A. [FEAT-PC020](../../platform/core/features/FEAT-PC020-group-administration-contracts.md) + [FEAT-H035](../../products/hub/features/FEAT-H035-group-administration-view.md) both `maturity: 6-done` (line 9 each). TASK-INT-05 closed **in the ADM-B opener**, 45 caretaker relics retired ([area gate](./2026-08-02-platform-ops-area-gate.md):18). The precondition was honoured, not skipped. |
| **AB-6** | The audit **cadence ruling** — gates are the always-on audit; bounded delta-audits after big builds; **one more FULL audit after A-ADM closes, before Phase-4 cutover**; then only at structural inflection points; every audit converts findings into gates | **STANDING — and its scheduled audit is now DUE.** See finding 3. | Ruling recorded at plan row 85 and [area gate](./2026-08-02-platform-ops-area-gate.md):27. Every precondition is complete: ADM-E, ADM-F, ADM-G, N-E, and RD-A/RD-B/RD-C all closed (RD-6 put all of them ahead of AB-6). It is the last unexecuted pre-cutover row on the Platform-Ops exit checklist. |
| **AB-7** | Console-routed rows (ADR-U028), Ferd shape — build the Console-routed surfaces that make the Ferd cut inside the **Hub shell under a distinct admin route group**; Console-as-entity stays deferred | **HOLDS** | `hub/app/admin/` is exactly that route group: `audit/`, `groups/[id]/`, `members/[id]/`, `moderation/[id]/`, `roles/[id]/`, `page.tsx`, with `hub/app/api/admin/{audit,groups,reports,roles,statistics,users}`. ADM-16 lives at `hub/app/admin/audit/page.tsx`. The U025/U028 Console-as-entity decision remains deferred and unre-opened. |
| **AB-8** | The Ferd cut across the 18 ADM rows — **in:** ADM-1..6, 8, 9, 10, 11, 12, 16, 18 (thirteen); **deferred with dated activation:** ADM-7, 13, 14, 15, 17 | **HOLDS, AND HAS MOVED ON: the deferred five are now a deferred THREE.** See finding 4. | All five deferrals CALLED at the gate close ([area gate](./2026-08-02-platform-ops-area-gate.md):88): 13/14/15 as proposed; **ADM-7 and ADM-17 re-scoped into Ferd** — and both have since shipped ([FEAT-H039](../../products/hub/features/FEAT-H039-bulk-member-actions-and-bounded-list.md) `6-done`; [FEAT-PC025](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) + [FEAT-H040](../../products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md) `6-done`). ADM-13/14/15 confirmed absent from `hub/app/admin/`. |

*(AB-1a..AB-1d are the four sub-rows of AB-1 — sink shape, retention/aggregation, consent posture, and the ADR-U043 measurement ledger. All four are carried by AB-1's HOLDS above.)*

---

## What the recheck actually found

### Finding 1 — AB-2's "null-actor accepted" is false against the built contract

The board row says the recorder accepts a null actor because signup is pre-session. **The shipped
contract does the opposite: it refuses.** `record_auth_event` resolves the actor and raises a typed
`28000` when there is none (`20260731190000_adm_a_pc019_auth_event_audit.sql:40-49`), confirmed against
the live definition. The requirement was changed during the ADM-A build and the board row was never
updated.

The change is defensible and was compensated at the caller: `signup` persists durably only once a
session exists (`hub/app/api/auth/signup/route.ts:70`), and the pending-confirmation edge stays
mirror-only. That is a **recorded limitation, not a silent gap** — the route says so in a comment.

The deferral had no home. Both the migration comment and the route comment deferred the question —
*whether pre-session and failed-auth moments deserve durable security logging* — to **ADM-D**, which
**closed on 2026-08-02 without ruling it.**

### RULED 2026-08-10 (Stefan): a deliberate NON-GOAL

Settled at the pin rather than carried onto the audit docket, because it needed a judgment call, not an
investigation. Durable first-party logging of pre-session and failed-attempt auth moments is **not**
something this platform does.

The facts the ruling rests on, verified rather than assumed:

- Both durable writers are `authenticated`-only — `record_auth_event` (`20260731190000:60`) and
  `record_telemetry_event` (`20260731180000:83`). The `emitTelemetry` "mirror" the code comments lean
  on is **console + in-memory only** (`hub/lib/observability/telemetry.ts:19-24`), not durable. So a
  pre-session moment leaves nothing durable anywhere today.
- **The headline case cannot be fixed at this seam.** A failed sign-in never reaches the Hub — the
  client calls Supabase Auth directly and `/api/auth/audit` runs only after a success. No change to
  `record_auth_event` would make wrong-password attempts visible; that needs a GoTrue auth hook.
- Supabase Auth already keeps auth logs and rate-limits sign-in. A partial first-party duplicate is
  worse than pointing at the real source.
- Granting `anon` a write path into a 90-day-retained table is an unauthenticated-flood surface.

**Accepted consequences:** pending-confirmation sign-ups and failed sign-ups leave no durable
first-party record; failed sign-ins live only in Supabase's logs.

**Activation point:** Phase-4 cutover planning, via a GoTrue auth hook — not by loosening either grant.

Recorded in the document that made the deferral: [FEAT-PC019](../../platform/core/features/FEAT-PC019-durable-auth-event-audit-binding.md)
§Implementation notes, and at the live comment in `hub/app/api/auth/signup/route.ts`. The applied
migration `20260731190000` keeps its original inline comment — migrations are history and are not
rewritten (platform-tier rule); its "ADM-D question" wording is superseded by this ruling.

### Finding 2 — AB-3's structure holds, but the gate it installed was RED on `main`

AB-3's whole point is the invariant *core by declaration, never by silent default — unclassified fails
red*. At the moment of checking, `main` had **228 live public functions against 218 declared**. Eight of
the ten were legitimately covered by the `^ds\d+_lifecycle_` prefix rule. **Two were genuinely
unclassified:**

- `admin_delete_role_template` — an `admin_*` function, so it also sat outside the pinned mechanical rule
- `role_template_undeletable_reason`

Both ship from **FEAT-PC029** (`20260810090000_rd_c_pc029_role_template_catalogue_disposal.sql:196` and
`:72`) — the RD-C work merged earlier the same day. `function-classification-completeness.test.ts` was
failing on `main`, exactly as designed. The gate worked; the registration step was skipped.

**Fixed in this session** (`supabase/ownership.manifest.json`): `admin_delete_role_template` -> PC-4 per
the mechanical rule and its nine `admin_*_role_template` siblings; `role_template_undeletable_reason` ->
PC-3 alongside `apply_role_template_update`, `get_available_role_templates`, `get_role_copy_diff`, and
`role_fabric_entry`. Platform conformance went **22/23 red -> 23/23 green**; ownership-direction unit
12/12.

This is the second recorded instance of the same miss — commit `9e5f38a` ("register the new function")
was the first.

### Finding 3 — AB-6's audit is due, and its docket is four items plus this pin's carry

Every gating cycle is closed. The docket, per [session 2026-08-06_02](../sessions/2026-08-06_02_-_RITUALS-DISCHARGED-BOARD-CLOSED-RD-A-4-READY.md):34:

1. the Tier-1 `has_permission` finding
2. the `/admin/roles` + admin-plane deep-cold ADR-U043 pass
3. the sealed-threads admin-sight safety question
4. **the anatomy stamp** — flagged at its third consecutive boundary in that bridge, and it has been carried at every boundary since

This pin added a fifth — the unowned AB-2 pre-session logging question — and then **closed it the same
day**: Stefan ruled it a deliberate non-goal (finding 1). **The docket stands at four.**

**The three known anatomy-drift claims are all confirmed — and one is understated:**

| Claim | Verdict |
|---|---|
| The stamp lags ADR-U052 | **CONFIRMED.** `U052` appears **zero** times in `ARCHITECTURE_ANATOMY.md`; the stamp reads "through ADR-U048 A1 + ADR-U051 A1 (2026-07-31)". ADR-U051 Amendment 2 is also absent. |
| The PC-1 row lacks the sink | **CONFIRMED.** Line 72 reads "Supabase, PostgreSQL, RLS, Storage, feature flags" — no telemetry sink. It still advertises **feature flags**, which ADM-15 established have zero substrate and zero reading code. |
| The PC-4 admin-RPC enumeration is "~20 strong" | **CONFIRMED, AND THE CLAIM UNDERSTATES IT.** Line 75 enumerates no RPCs at all ("the Console, DeusEx, audit, moderation, platform rules"). Live count: **34 `admin_*` functions**, 44 PC-4 total. |

Finding only these three would mean the audit did not look — they are its starting conditions, not its results.

### Finding 4 — AB-8's deferred five is now a deferred three

ADM-7 and ADM-17 were re-scoped into Ferd at the gate close and have both shipped. The register that
Stefan asked to be restated plainly at area close should now read **three** deferred capabilities:

| Row | Plain terms | Activation |
|---|---|---|
| ADM-13 | Auto-grant verification screen | when G-29 closes; ships under the AB-7 shell |
| ADM-14 | Platform policy settings | when the first real policy consumer appears |
| ADM-15 | Feature flags | Phase-4 cutover planning at the earliest |

### Where the board was right

AB-1, AB-4, AB-5 and AB-7 were recorded accurately and survived every check — including AB-4, whose
narrowed Art. 15 citation is written into the manifest exactly as settled, and AB-5, whose TASK-INT-05
precondition was genuinely honoured rather than waved through. Four of eight clean is the useful half of
this result: the recheck was not a formality, and it was not a massacre either.

---

## Corrections propagated out of this pin

- **`phase-3-platform-ops-completion-plan.md` row 81 (AB-2)** — dated correction on the null-actor clause.
- **`phase-3-platform-ops-completion-plan.md` note 4** — `admin_exit_user_from_platform` was correctly
  reported dropped at C-F (`20260721161500:611`), but ADM-C **re-created it** the following day as the
  fresh ADM-6 contract (`20260801190000:451`, declared PC-4, live today). The note predicted this
  outcome; its "no longer exists" sentence is now stale rather than wrong.
- **`supabase/ownership.manifest.json`** — the two PC029 registrations (finding 2).

## What this pin does not do

It does not run the AB-6 audit. It verifies the audit's own inputs so that the audit does not stamp the
map on top of unchecked records. The audit itself remains the last pre-cutover row.
