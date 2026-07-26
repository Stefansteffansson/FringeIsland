# A-NTF N-D — the preference-home adjudication + the full N-D decision board

**Date:** 2026-07-26 · **Wave:** Ferd · **Area:** A-NTF (Notifications), Cycle N-D (the area's last)
**Status:** adjudication SETTLED with reasoning (Part 1, mine to reason out); board PRESENTED WHOLE, awaiting Stefan (Part 2)
**Follows:** [`../sessions/2026-07-25_02_-_A-NTF-N-C-BUILT-BELL-LIVE-PUBLICATION-EMPTY.md`](../sessions/2026-07-25_02_-_A-NTF-N-C-BUILT-BELL-LIVE-PUBLICATION-EMPTY.md)

---

# PART 1 — Where notification preferences live (the three-way tension, adjudicated)

## The three claims, verified verbatim on disk

Every one of the three was read at its cited line rather than carried from the
filing, and the filing's own summary turns out to be **incomplete** — the DS-5
spec contradicts *itself*, which makes it a four-way tension, not three-way.

| # | Document | Line | What it actually says |
|---|---|---|---|
| 1 | `docs/verticals/notifications/SPECIFICATION.md` (V3) §6 | `:84` | "Notification preferences are member state stored in **Platform Core (PC-2)**: per-category, per-channel. Consent state stays authoritative in Core; surfaces and DS-5 read and present it, never own it." (reinforced at `:46` "preferences storage is a Platform Core obligation (§6)" and `:108` "the preference UI surfaces in products, the state lives in Core") |
| 2 | `docs/products/hub/SPECIFICATION.md` §L3 | `:288` | NTF-10 external deps → "V3, **PC-4** (preference persistence)". Reinforced in the cross-entity table at `:366` — PC-4 Governance is attributed "…GDPR consent state, data export request flow, feature flags" for "A-NTF (NTF-10)" |
| 3 | `docs/platform/domain/communication.md` §Entities | `:44` | "Notification preference \| A FIM's per-kind/per-channel delivery choices. Consent state itself stays authoritative in Platform Core. \| **DS-5 tables**" |
| **3b** | **the same file**, §L3 capability table | **`:126`** | **"Notification preferences & consent surface \| … \| PC-2 (consent authoritative in Core)"** — the DS-5 spec names PC-2 in its own dependency column while its §Entities row claims the table. **Not previously recorded.** |

Also verified: `docs/platform/domain/communication.md:56` already enumerates
"preference get/set" inside DS-5's §"Notification operations" **contract** —
so DS-5's spec claims both the table (`:44`) and the contract (`:56`).

## The adjudication: the table and the contract are DS-5's. Consent stays in Core.

### 1. The house already settled this exact shape — for consent — and the answer was a *split*, not a winner

ADR-U034 + the G-35 reconciliation (`docs/platform/core/governance-specification.md:264`)
resolved an identical three-way muddle by separating two questions that the
three documents above conflate:

> "The substrate *table* (`consent_records`) is **PC-2-owned** (FEAT-PC002 / IDN-2);
> the consent-state *governance* contract (member-facing read/write + the purpose
> catalog + withdrawability policy) is **PC-4**."

So "where does it live" is always **two** questions: which tier owns the *table*,
and which owns the *member-facing contract*. Read that way, claims 1–3 stop being
three answers to one question and become three answers to different questions —
V3 §6 is talking about ownership-of-state, Hub §L3 is naming the contract the Hub
calls, and DS-5 §Entities is naming the table. That is why nobody noticed the
conflict for four cycles: each document is locally coherent.

### 2. But the consent split does not transplant, because preferences fail the Core bar

`docs/platform/core/CLAUDE.md:20` sets the bar for putting anything in Core:
*"this cannot be modelled in Domain or via Extensions," not "this would be
cleaner in Core"* — and it requires naming what was considered in Domain and why
it was rejected. Preferences can plainly be modelled in Domain. That alone
defaults them **out** of Core.

### 3. The decisive argument: a Core-homed preference table inverts a named tier rule

A preference row is `(member, category, channel) → allowed`. Its `category` must
be FK-enforced against `public.notification_categories` — the registry N-A built
and **DS-5 owns** (`20260723120000_n_a_notification_registry_and_contracts.sql:35`).

If the preference table lives in Core, that FK points **Core → Domain**. From
`docs/platform/CLAUDE.md:38`:

> "Domain Services may depend on Platform Core; Platform Core never imports from
> Domain Services. **Breaking this rule creates circular dependencies in SQL
> functions that PG17 silently miscompiles.**"

This is not a style preference — it is a tier rule with a named failure mode.
Note the asymmetry that makes DS-5 the *only* clean home: DS-5 → Core reads are
permitted, so a DS-5-homed preference table can still consult Core for consent.
The reverse cannot.

### 4. The three escape hatches from #3 are each worse than the disease

- **Drop the FK** (free-text category keys in Core). This re-opens precisely the
  defect N-A closed. V3 `:42` states the old disease in its own words: *"free-typed
  `type` means preferences cannot suppress by category yet."* Regressing to it to
  protect a doc line is indefensible.
- **Duplicate the catalog into Core.** Two registries drift; the drift's failure
  mode is a category that exists in DS-5 but not Core's copy, so its preference is
  unfindable and the notification **sends anyway**. That is V3 §5 `:55`'s named
  failure mode — *"Preference or consent bypass… a consent violation in trust
  terms even when lawful."*
- **Put the whole category registry in Core.** Re-tiers a shipped, FK-referenced
  DS-5 table to relocate its dependent. Tail wagging dog, and a Core change that
  fails the `core/CLAUDE.md:20` bar.

### 5. Preference is not consent — and both V3 and DS-5 already say so

V3 `:55` calls preference state "**consent-adjacent** member state (V2)" —
adjacent, not identical. DS-5 `:44` is explicit: "Consent state itself **stays
authoritative in Platform Core**." So the sentence at V3 `:84` conflates two
things its own §5 distinguishes: consent (Core, `consent_records`, append-only,
PC-2 table / PC-4 contract) versus preference (current-state, mutable, DS-5).

The grain difference is already registered as a gap. `gaps.md:189` (**G-34**), on
IDN-7's sharing-controls half:

> "it is **current-state preference data, a different grain from the append-only
> consent ledger**"

**This corrects a premise in the N-D framing.** The completion plan
(`phase-3-notifications-completion-plan.md:77`) says N-D "Depends on … **IDN-7's
preference-persistence pattern**". IDN-7 has no preference-persistence pattern:
its realized half (FEAT-PC006/PC007) is an *append-only consent ledger*, and its
actual preference-shaped half — sharing controls — is **G-34: unbuilt, no
substrate**. What N-D can reuse from IDN-7 is the **contract shape** (own-subject
`SECURITY DEFINER` get/set, typed refusals `22023/42501/28000`, own-rows-only RLS,
BFF route), not the storage pattern. Copying the append-only ledger for
preferences would be an active mistake — a mutable toggle does not want an
immutable history, and it would make every read a
`DISTINCT ON … ORDER BY created_at DESC`.

### Ruling

| Question | Answer |
|---|---|
| The preference **table** | **DS-5** — `public.notification_preferences`, FK to `notification_categories(key)`, actor column a personal-group id (the P-O1 chain, every DS-5 actor column's shape) |
| The preference **get/set contract** | **DS-5** — already enumerated at `communication.md:56`; own-subject, `SECURITY DEFINER`, IDN-7's *contract* idiom |
| **Consent** state | **Unmoved** — PC-2 table / PC-4 contract, per ADR-U034 + G-35. The dispatcher consults consent; it never re-homes it |
| The **UI** | Hub, reading through the contract, never the table (V3 `:108`, `:84`'s surviving half) |
| Docs to amend | V3 `:84` (split consent from preference); Hub `:288` + `:366` (PC-4 → DS-5 for NTF-10); `communication.md:126` (align with its own `:44`); `communication.md:194` (retire the tension note) |

Cheap corroboration that this is where it was always going: N-C put the
operator's nudge toggle in **`ds5_config`**, not in Core, and that migration's own
comment (`20260725120000:90`) reads *"the operator surface arrives with N-D's
preferences work."* The substrate has been drifting to DS-5 by construction.

## What it costs if this is wrong

Honest framing first: **it is not a performance question.** Core and Domain share
one Postgres, so a cross-tier read costs nothing measurable. Anyone arguing this
on dispatcher latency is arguing the wrong axis. The costs are structural.

**If we ship to Core and the ruling above was right:**

1. **A silently-miscompiled dispatcher.** `platform/CLAUDE.md:38` names the
   consequence of a Core→Domain dependency in SQL functions: PG17 *silently*
   miscompiles. The suppression check is on the write path of every notification —
   the worst possible place for a fault that does not announce itself.
2. **Muted notifications that arrive anyway** — if we take the drop-the-FK or
   duplicate-the-catalog escape. This is V3's named "Preference or consent bypass"
   failure mode, and V3 grades it in trust terms, not legal ones: *"a consent
   violation in trust terms even when lawful."* A member who muted a category and
   got it anyway does not file a bug; per V3 `:29` it is "a one-way ticket out of
   the member's trust."
3. **Reversal is a cycle, and it is not a pure code move.** Preference rows are
   member-authored trust decisions, so backing out means a cross-tier data
   migration of exactly the data you least want to fumble, plus re-pointing the
   dispatcher, plus retiring a PC-4 contract and a Hub route. Call it a cycle of
   rework and one irreversible-if-botched migration.
4. **A Core precedent that outlives the mistake.** Core is the heavily-reviewed
   stability zone (ADR-U023). A preference table landing there says "member
   settings go in Core", and the next four settings features inherit it. That is
   the expensive part — not this table, the ones that cite it.

**If we ship to DS-5 and Core was right:** the cost is materially smaller, which
is itself an argument. `notification_preferences` is a small, self-contained,
own-rows-only table with one contract in front of it. Moving it to Core later is a
table move plus a contract re-home, with no FK inversion to unpick — because
Domain→Core was already the legal direction. **The asymmetry is the argument:
DS-5 is the cheaper thing to be wrong about.**

**If we do nothing and leave the tension standing** (the status quo through four
cycles): the next agent to touch preferences reads whichever of the four lines it
loads first, and the cascade's load order makes that partly a coin toss. The N-A
filing was right to route it here rather than guess.

---

# PART 2 — The N-D decision board, presented whole

Recommendations are marked. Rows are independent unless noted. `ND-1` is Part 1's
ruling, restated as a confirm-or-override.

| # | Decision | Options | Recommendation | Scale / cost consequence |
|---|---|---|---|---|
| **ND-1** | Preference home | (a) DS-5 table + DS-5 contract · (b) Core table (PC-2 or PC-4) + PC-4 contract · (c) split: Core table, DS-5 contract | **(a)** — Part 1 | (b) needs a Core→Domain FK (a named tier rule with a silent-miscompile failure mode) or drops FK integrity and re-opens the defect N-A closed. (a) is also the cheaper mistake to reverse |
| **ND-2** | **Every one of the six live categories is `lawful_basis = 'transactional'`** (verified on the live DB). V3 §7 `:122` allows preference to suppress "unless its category is lawfully compelled". If transactional reads as compelled, **NTF-10 ships a preferences page where every switch is disabled** | (a) `lawful_basis` is a GDPR processing-basis field, *not* a suppressibility field; add a separate `member_suppressible BOOLEAN DEFAULT true` to `notification_categories`, seed `account` = false · (b) transactional ⇒ not suppressible; ship the page with 6 disabled rows · (c) re-classify some categories to `consent` | **(a)** — one column, data-driven, keeps V3 §7's checklist honest without touching GDPR semantics. Seed `account` false because muting your own suspension/participation-state notices harms *you* | This is the row that decides whether N-D ships a working feature or a dead page. (c) is the trap: `lawful_basis` drives GDPR posture and export/consent behaviour, so re-labelling a category to unlock a UI toggle would move a legal field for a cosmetic reason |
| **ND-3** | Channels in Ferd. `in_app` is real; **email is abstraction-only** — V3 `:42`/`:133`: `lib/email/send.ts` is a `console.log`, zero email vendor in `package.json` (dual-method verified) | (a) store `in_app` + `email` in the model, **enforce both** in the dispatcher, **render `in_app` only** · (b) store + render both (an email toggle that changes nothing) · (c) `in_app` only, add the channel dimension later | **(a)** | NTF-10 *is* "per-category × per-channel" — (c) halves the capability and is a re-scope, not a MINIMAL cut. (b) is a promise we can't keep: a member switching email off would believe something happened. (a) costs one extra column and means preferences already bind the day email goes live |
| **ND-4** | Nudge-toggle admin UI (`ds5_config.realtime_hint_platform_announcements`, currently `'false'`) — N-C deferred it here | (a) minimal DeusEx toggle + a **live cost line** ("sending now ≈ N messages", N = reachable population) · (b) bare toggle · (c) defer to Eid | **(a)** | The 857/1,274 measurement exists but lives in a bridge. An operator flipping this pays a headcount-sized cost N-C proved is charged *whether or not anyone is listening*. Showing N at the point of decision is the cheapest possible guardrail and closes the item honestly |
| **ND-5** | The general per-category nudge switch (N-C cut it as gold-plating) | (a) fold into ND-2's `notification_categories` as a `nudge` column — same table, same admin surface as ND-4 · (b) separate feature · (c) drop | **(a)** | Near-zero marginal cost once ND-2 adds a column and ND-4 builds the admin surface. Building it standalone is what made it gold-plating; riding along is what makes it cheap |
| **ND-6** | The shared-topic optimisation for platform-wide announcements (ADR-U039 Amendment 1, ~25× cheaper) | (a) **defer to Eid**, record the rationale · (b) build in N-D · (c) build behind a flag | **(a)** | **The saving is currently zero.** N-C's NC-2 already defaults the platform-announcement nudge **off**, so the 857-send fan-out is not being paid — the optimisation only pays once someone flips ND-4's toggle on. Building it now optimises a path that is switched off, and it changes the channel taxonomy inside the U039 rails (a topic every member may read inverts the per-member privacy rationale, and needs its own receive policy). Do it when ND-4's cost line shows a number someone actually wants smaller |
| **ND-7** | Scope confirm | MINIMAL as instructed: **no** quiet hours, **no** frequency caps, **no** digest (Eid+, NB-6) | confirm | Recorded so the Eid boundary inherits it explicitly |
| **ND-8** | Schema gate | One migration: `notification_preferences` + 2 columns on `notification_categories` (ND-2, ND-5) + get/set contracts + dispatcher suppression | ship the PR **held at the gate** with the red test and apply commands in the body | Per the standing rule — the gate merges only on an explicitly-named nod, never a generic "go on" |

## Not on the board — already settled, recorded here so it isn't re-litigated

- **TASK-INT-02 is cleared, and the suite is fully green: 666/666, 55 suites, 0
  failed.** Both reds were stale assertions; **neither was user-facing.** The
  `create_group_conversations` backfill invariant the filing flagged as possibly
  user-facing **holds on the live DB — 0 missing of 416** — so no member ever lost
  the affordance. The arithmetic reconciles exactly with the N-C sweep (663 + 3 =
  666), so **no red is left fenced-by-name and N-D's own run is readable as a
  gate** — which was the whole reason the task was sequenced before this cycle.
  Full detail and evidence in [`../backlog/tasks/TASK-INT-02-two-undiagnosed-integration-reds.md`](../backlog/tasks/TASK-INT-02-two-undiagnosed-integration-reds.md).
- **A third instance of one process defect** (sibling assertions not adapted when
  shipped semantics change: N-B's payload, A-COM RIDER-3's emit topology). Routed
  to the A-NTF area retro with a proposed mechanical check — see TASK-INT-02
  "Findings raised".
