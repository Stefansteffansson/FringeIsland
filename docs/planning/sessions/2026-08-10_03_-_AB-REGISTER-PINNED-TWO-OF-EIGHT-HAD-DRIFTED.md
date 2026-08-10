# Session bridge — the AB register is pinned, and two of eight had drifted

**Date:** 2026-08-10 (session 19) · **Wave:** Ferd · **Cycle:** none active
**Continues:** [`2026-08-10_02`](./2026-08-10_02_-_RDC-03-RULED-AND-CLOSED-THE-FILING-WAS-WRONG-BOTH-WAYS.md) — **discharges its "Queued" item.**

---

## READ THIS FIRST

1. **`TASK-AB-01` is done and merged** (PR #482, `97c6982`). All eight AB items are pinned in one
   place — **[`docs/planning/hub-v2/AB-REGISTER.md`](../hub-v2/AB-REGISTER.md)** — each rechecked
   against the live system. **Read the register, not the board rows.** The completion plan's rows
   77-87 remain the 2026-07-31 settlement and now point at the register.
2. **`main` was RED on the GC-1 conformance gate and is now green.** FEAT-PC029 (RD-C, merged
   earlier the same day) shipped `admin_delete_role_template` and `role_template_undeletable_reason`
   without registering them in `supabase/ownership.manifest.json`. 228 live functions vs 218
   declared. Registered PC-4 / PC-3; platform conformance **22/23 -> 23/23**.
3. **The AB-6 audit is now DUE.** Every precondition cycle is closed. It is the last unexecuted
   pre-cutover row on the Platform-Ops exit checklist. **Its docket is five, not four** — see Next.
4. **One question is unowned and needs a ruling** — AB-2's pre-session logging question, homed to a
   cycle that closed without ruling it. It is Stefan's call, not an audit finding.

## What the recheck was for

The risk was never that the AB items were unfinished. It is that they were recorded as finished, and
the AB-6 full anatomy audit would **stamp the map on top of those records without rechecking them** —
certifying drift rather than removing it. That is worse than not auditing, because afterwards the map
carries a fresh stamp.

Four of eight held clean. Two had drifted. That ratio is the argument for having done it.

## AB-2 — a settled clause that the build contradicted

The board row says the recorder accepts a null actor "because signup is pre-session". **The shipped
contract refuses**: `record_auth_event` resolves the actor and raises a typed `28000` when there is
none (`20260731190000:40-49`, confirmed against the live definition).

The change is defensible and was compensated at the caller — `signup` persists durably only once a
session exists (`hub/app/api/auth/signup/route.ts:70`), the pending-confirmation edge staying
mirror-only, stated in a comment rather than hidden. The requirement changed during the ADM-A build
and the board row was never updated.

**The dangling half:** both the migration comment and the route comment defer the question — *do
pre-session and failed-auth moments deserve durable security logging?* — to **ADM-D. ADM-D closed
2026-08-02 without ruling it.** Two pieces of shipped code point at an owner that never ruled. This
is a ruling, not an investigation.

## AB-3 — the structure held; the gate it installed was red

AB-3's entire point is *core by declaration, never by silent default — unclassified fails red*. The
gate worked exactly as designed; the registration step was skipped. Eight of the ten undeclared
functions were legitimately covered by the `^ds\d+_lifecycle_` prefix rule; two were real.

**This is the second instance of this exact miss** — commit `9e5f38a` ("register the new function")
was the first. Two instances is a pattern: shipping a new function and registering it are separate
acts, and the second is easy to drop in a session that ends on a green *feature* suite.

## The anatomy drift claims — all three confirmed, one understated

| Claim | Verdict |
|---|---|
| The stamp lags ADR-U052 | **CONFIRMED.** `U052` appears **zero** times in `ARCHITECTURE_ANATOMY.md`. ADR-U051 Amendment 2 is also absent. |
| The PC-1 row lacks the sink | **CONFIRMED.** Line 72 still advertises **feature flags**, which ADM-15 established have zero substrate and zero reading code. |
| The PC-4 admin-RPC enumeration is "~20 strong" | **CONFIRMED, AND UNDERSTATED.** Line 75 enumerates no RPCs at all. Live: **34 `admin_*` functions**, 44 PC-4 total. |

Finding only these three would mean the audit did not look.

## Where the board was right

AB-1 (sink live, **4,874** telemetry rows — built *and* producing), AB-4 (the narrowed Art. 15 split
written into the manifest exactly as settled, citation and all), AB-5 (TASK-INT-05 genuinely honoured
in the ADM-B opener, not waved through), AB-7 (`hub/app/admin/` route group, ADM-16 at
`admin/audit`, Console-as-entity still deferred and unre-opened).

**AB-8 has moved on rather than drifted:** its "deferred five" is now a deferred **three**
(ADM-13/14/15) — ADM-7 and ADM-17 were re-scoped into Ferd at the gate close and have both shipped.

## Numbers at close

Platform conformance **22/23 red -> 23/23 green** · ownership-direction unit **12/12** · live public
functions **228**, all classified · live `admin_*` **34**, zero misfiled outside PC-4 ·
`admin_audit_log` **6,868** rows carrying all four auth action strings · `telemetry_events` **4,874**
rows · dashboard refreshed (**843** files) · discovery worktree clean and synced to `97c6982` ·
**zero open PRs**.

## Standing items

- **The carried list, minus one:** Phase-4 cutover · G-3 journeys deferral · `TASK-RDA-03` ·
  `TASK-E2E-02/03` · `hub/SPECIFICATION.md` -> `./ROADMAP.md` placeholder · the
  `done`-no-longer-implies-sweepable tension · deferred Eid piles. **AB-6's docket is no longer
  "carried" — it is next.**
- **E2E-04's integration-tier half** (W-7 PAIR cells) — still un-owned, still no mechanism.
- **New — the registration-is-a-second-act pattern** (AB-3, twice now) has no gate of its own. The
  conformance suite catches it, but only if someone runs the *platform* suite before merging.
- **Retired:** the AB-register pinning queue.

## Next

**AB-6 — the FULL anatomy audit, in a fresh session** (Stefan's call, 2026-08-10). It is the last
pre-cutover row; Phase-4 cutover follows it.

**Its docket is five:**

1. The Tier-1 `has_permission` finding
2. The `/admin/roles` + admin-plane deep-cold ADR-U043 pass
3. The sealed-threads admin-sight safety question
4. **The anatomy stamp** — U052, U051 Amendment 2, the PC-1 sink row, the PC-4 enumeration
5. **New from this pin** — AB-2's unowned pre-session logging question (a ruling, not a finding)

**Starting conditions the fresh session should not have to re-derive:**

- The register at [`AB-REGISTER.md`](../hub-v2/AB-REGISTER.md) is the verified state of the audit's
  own inputs. It was written so the audit does not have to trust the board. **Trust it and move on**
  — its claims carry `file:line` and live-catalogue evidence.
- The three anatomy-drift claims are **starting conditions, not results**. An audit that reports only
  those did not look.
- `doc-health-check` was **not** run at this close — deliberately. AB-6 subsumes it, and running it
  the session before would be a rehearsal, not a check. Run it inside the audit.
- The dev DB is `FringeIslandDB` / `jveybknjawtvosnahebd`. The one-checkout, one-dev-DB rule applies.

## Close ritual

- [x] PR #482 merged on Stefan's explicit approval ("okay merge"); verified by `mergedAt` +
      `origin/main` ancestry, not by the command's silence
- [x] `main` green on the platform conformance suite (the gate this session found red)
- [x] Dashboard refreshed — 843 files
- [x] Discovery sweep — worktree clean, not ahead; `main` merged back into `discovery` and pushed
- [x] Session bridge written (this file)
- [ ] `doc-health-check` — **deferred into AB-6 by design** (see Next)
