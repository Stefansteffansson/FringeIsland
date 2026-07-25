# Session bridge — A-NTF N-C decomposed and built; the bell is live, the publication is empty

**Date:** 2026-07-25 (session 02) · **Wave:** Ferd · **Area:** A-NTF (Notifications), Cycle N-C
**Follows:** [`2026-07-25_01_-_PC002-NOTES-BACKFILLED-DOC-HEALTH-REFIND-RULE.md`](./2026-07-25_01_-_PC002-NOTES-BACKFILLED-DOC-HEALTH-REFIND-RULE.md)

---

## One-paragraph state

N-C opened, decomposed, and **built end-to-end in one session**. Both halves are `6-done`: **FEAT-PD015** (the emit trigger, the operator nudge policy, the fourth receive policy, and NB-7's publication DROP) and **FEAT-H032** (the live bell, reconnect reconciliation, and the `/groups` first-paint cleanup). The bell now updates within a second of a notification being written, catches up after a dropped socket or a hidden tab, and `supabase_realtime` is **empty** — the legacy `postgres_changes` push is gone. Eight PRs merged (#285–#290 plus the retry fix and the task widening); `main` at the N-C close; discovery synced. **The decomposition audit shrank the cycle before it started** — three of four planned build items were already realized. One question remains open for Stefan (ADR-U039's draft stamp), and one measurement is owed (the ADR-U043 `/groups` before/after, which needs a deployed environment).

## What this session actually found

**The audit was the highest-value hour of the cycle.** The completion plan's N-C bullet described four build items. Verified against migrations *and* the live DB, three were already done:

- **The realtime substrate exists on both sides.** A-COM C-C shipped `ds5_emit_hint` and three receive policies; `hub/lib/realtime/manager.ts` states in its own docstring that *"the notification bell joins at A-NTF by calling `registerTenant`, with no manager edit"*. It held exactly — the manager diff came back **empty**. `useCommChannel` also turned out to be topic-generic despite its comm-flavoured name, so reconnect reconciliation was reuse, not construction.
- **NB-3 (the announcement in-app adapter) was already shipping end-to-end.** The C-D rider had populated `body`, `announcement` is a registered kind under category `platform`, and the surface renders kind-agnostically. **Downgraded from a build item to verify-and-record.**
- **"A server primitive the SILENT oracle needs fresh tests for" — there is no new primitive.** The deployed reads suffice; what was missing was the *tests*.

**The cycle's real open question was the emit site, and it was not where the plan assumed.** There is **no trigger on `public.notifications`**, and `INSERT INTO public.notifications` appears at **~38 sites across 11 migrations** — delivery triggers live on *source* tables. So ADR-U039:31's "the insert trigger emits a hint" had nothing to attach to. Settled as **one `AFTER INSERT` trigger on the table**, catching every writer by construction.

## Decisions taken (Stefan, 2026-07-25)

| # | Decision |
|---|---|
| NC-1 | **One `AFTER INSERT` trigger** on `public.notifications`, reusing `ds5_emit_hint` unchanged. Row-level, not statement-level: both emit the same message count, so granularity is not the volume lever. |
| NC-2 | **Platform-wide announcements do not nudge by default — and it is an operator toggle, not a hardcoded rule.** Stefan's own proposal, and better than the fixed policy offered. Shipped as data (`ds5_config`, the `pc2_config` pattern), fail-quiet. Community-scoped announcements still nudge. |
| NC-2a | The toggle's **admin UI is N-D's**, with the preferences surface and the dispatcher that already owns suppression (NB-5). The general per-category switch is also N-D's — named as gold-plating and cut. |
| NC-3 | NB-3 **already realized** → verify-and-record. |
| NC-4 | Nominations rider cuts to the slice, adoption and dead trio; **`/api/me/nominations` deliberately kept** (FEAT-H017-owned; ADR-U042 guardrail 3). Filed as `TASK-H017-01`, **widened** to the whole superseded chain. |
| NC-5 | One tenant (the bell in `AppShell`), not two. |
| Gate | **PR #285 merged on a named nod ("ok merge #285")** — the schema-gate rule honoured. |

**Still open — Stefan's call, not taken:** **ADR-U039 is still `Status: Proposed`** after four realizations, and its §31 "serves the legacy app until Phase-4 cutover" rationale is now void (NB-7 executed). ADR edits are a fuller-auto carve-out and no approval was given, so the ADR is untouched; the supersession is recorded in FEAT-PD015 only. **Recommended:** accept it, and append a dated amendment to §31 rather than rewriting it (the append-only rule).

## The billing finding — it sharpens the default

Stefan asked whether a platform-wide nudge reaches all members or only those logged in. The answer has a cost consequence that had **not** been in the budget. Per Supabase's pricing docs:

> *"A broadcast message counts as one message sent plus one message per subscribed client that receives it."*

Because ADR-U039 gives every member a private topic, **the send is per recipient**: a platform-wide announcement is billed `N sends + (online) receives`, and **N is charged whether or not anyone is listening**. Measured: the largest observed single announcement produced 857 delivery rows to 857 recipients against a 1,274-member population.

So the dominant cost tracks **headcount, not concurrency** — "hardly anyone is online" is not a mitigation. **Named forward optimisation for N-D:** a *shared* topic for platform-wide announcements would cost `1 send + one per listener` (~25× cheaper at today's scale). Legitimate for that one case because the content is identical for, and visible to, every member — so the per-member privacy rationale doesn't bind. Out of scope here: it changes the channel taxonomy.

## Honest record — five corrections, all mine

1. **A vacuous test, caught by green-at-red.** 19 red-first written, only 18 failing. The culprit asserted "platform emits zero hints" and "the row is readable" — **both true before the migration existed**. Refitted with a community control so suppression must be *selective*.
2. **A false negative in my own assertion.** The initplan-form regex rejected *correct* policy SQL, because Postgres re-renders wrapped sub-selects with an alias and inner parens. Caught by checking the assertion against the applied policy instead of trusting it.
3. **Two E2E assertion bugs of the same class, made twice.** I pinned an absolute badge count (it read 3 — the live path worked, my expectation was wrong). I then made counts relative but left an absolute *precondition*, which passed alone and failed in the full suite. Everything is now a `>=` delta.
4. **A real leak of my own, found at E2E.** The coalescing timer was module-level and nothing cancelled it on teardown — a hint arriving moments before sign-out would fire ~250 ms later and send a still-mounted bell to fetch **with a dead session**. Closed in the teardown; guarded by a unit test. Found investigating an intermittent `profile.spec.ts` failure whose pre-#289 control passed 3/3 — **causation not proven** (it is intermittent), but the leak was real and has not recurred in 4 clean runs.
5. **I nearly credited my own fix for someone else's.** The retry I added to `createTestUser` did **not** unblock the cycle: the green run logged **zero** ES256 occurrences, so the retry never fired. Supabase's upstream fix did.

## TASK-INT-01 — vendor confirmed, but do not close it

Supabase replied confirming an Auth incident ([`cqjl192cn8sz`](https://status.supabase.com/incidents/cqjl192cn8sz), 2026-07-25 14:11–14:45 UTC) and shipped a fix. **Two caveats, both load-bearing:**

1. **Their window does not cover our observations.** Our first ES256 hit was **2026-07-22**, three days earlier, and the runs that lost 26/26 tests here were ~16:30–17:15 UTC — *after* their "Resolved". Their timeline plausibly marks when they noticed, not the fault's span.
2. **No DB restart is warranted** — the broken component was theirs, and the 26/26 green suite is stronger evidence than a restart.

Moved to `review`, not `done`; it needs several clean days. The `createTestUser` retry landed anyway as defence in depth (narrow by design — only the known signature retries, so it cannot soften a real regression).

## Ritual checklist

- [x] Both specs `6-done` with Implementation notes; all four §L4 / README rows updated in the same commit
- [x] The three ADR-U039:33 channel amendments — Hub `SPECIFICATION.md` §L2 §4 (`:38`, `:99`) **and `docs/products/hub/CLAUDE.md`** (steering file; Stefan's "close them out" taken as the nod)
- [x] `CHANGELOG.md` entry added
- [x] Conformance gate 6/6 · unit 967/967 (129 suites) · E2E 86/86 · `next build` clean · notifications integration slice 26/26
- [ ] **PENDING at the time of writing: the FULL integration sweep** (all domains, `--runInBand`). Started at the close and still running when this bridge was committed; the slice-level and conformance results above are green and are what the `6-done` notes claim — the whole-suite sweep is a DoD item and its result is recorded in the session's closing report, not assumed here.
- [x] Discovery sweep — synced throughout
- [x] Session bridge (this file)
- [ ] **OWED: the ADR-U043 `/groups` before/after measurement.** A deep-cold sample needs ≥20 min enforced idle on a deployed environment, so it could not be taken in-session. The change removes one concurrent substrate read from a B2/B3 path; the number must be *shown*, not asserted. Tracked on `TASK-NC-05` and the area-gate checklist.
- [ ] Full `doc-health-check` not run — no renames, restructures or deletions this session; the touched sections were verified directly.

## Found, not caused

- **The `CHANGELOG.md` has no N-A or N-B entries** — it jumps from 2026-07-21 to this cycle. Both shipped and are recorded in their specs and bridges. Flagged in-file rather than back-filled from outside their cycles; routed to the area gate.
- **The ownership manifest is inconsistent about trigger functions** — only 1 of 5 DS-5 trigger functions on the live DB is listed, and the shared `ds5_emit_hint` helper is absent entirely.
- **A pre-existing broken link** in `docs/products/hub/SPECIFICATION.md` (`./ROADMAP.md`).
- **Stale ephemeral task files** from the closed N-A and N-B cycles (`TASK-NA-01..05`, `TASK-NB-01..05`) are still in the backlog; the skill says they are deleted after the cycle retrospective.

## Where the next session starts

**N-D is the last A-NTF cycle** — preferences + the shared dispatcher (NTF-10, NB-5), and the natural home for three things this cycle deliberately deferred: the **nudge toggle's admin UI**, the **general per-category nudge switch**, and the **shared-topic optimisation** for platform-wide announcements.

**Before or at N-D's boundary, the backlog triage that PROCESS.md §3 now requires is due** — and this is its first real test. Standing tasks: `TASK-MIST-01`, `TASK-DOC-003`, `TASK-DOC-005`, `TASK-OBS-01`, `TASK-E2E-01`, `TASK-FORUM-01`, `TASK-INT-01`, `TASK-H017-01`, plus the stale N-A/N-B files above. `TASK-DOC-003` and `TASK-OBS-01` are on their **third** carry — bet, re-scope, or drop with a reason.

**Area-gate items still standing:** the ADR-U043 measurement pass + Stefan's live walk, the U049 §8 Q1 adapter-ownership answer, the NB-8 Mist-posture proof, the email-deferral recording, the DS-5 spec advance, W12 per-RPC verification, and the ADR-U039 acceptance question above.
