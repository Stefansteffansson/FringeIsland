# Changelog

All notable changes to the FringeIsland project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **The completion panel's "Review your journey" button no longer sits clickable-but-inert (FEAT-H021 post-6-done)** (2026-07-08) — Stefan's live walk minutes after 6-done: the button only set the canvas to the first step, so it did nothing whenever the canvas was already there — born inert on a completed enrolment with no step-instance record (the legacy-completed shape boots at step one) and permanently inert after one successful use; a successful jump could also land below the fold unseen (the panel renders above the canvas). Fixed red-first (2 reds → green): the page passes the panel its callback **only while it would do something** (on the first step the affordance retires — no fake doors, the H018 principle) and the entry scrolls the canvas into view. Unit **612/612**, E2E completion arc + `player.spec` unchanged green, `next build` + lint clean. Lesson for the retro: the E2E clicked the button but never asserted its *effect* — witnessing a click is not witnessing a change.
- **Re-enrolling after withdrawal now resumes the journey instead of restarting it (FEAT-PD003 post-6-done, the Q1 addendum)** (2026-07-07) — Stefan's read-through of the J-B close-out caught the gap the same day it shipped: the nodded Q1 made withdrawal a terminal `withdrawn` status so step-instance history *survives*, but re-enrolment inserted a **new** enrolment row — and the progress grain is keyed by `enrollment_id`, so the surviving history never carried into the new walk: the player restarted the traveller at step 1. The canon reading settled it (ADR-U044 §4 — the grammar's minimum change, *"this traveler has now had the experience of passing through this step"*, is a fact about the **traveller** and does not un-happen at withdrawal): **re-enrolment now reactivates the most recent withdrawn row** — same `enrollment_id`, instances carry, the player resumes where the traveller genuinely was. Both enrol contracts replaced in place (migration `20260707213500`, schema gate): every existing guard runs before the branch (visibility, keys, the one-directional dual-enrolment rule — reactivation is gated exactly like a fresh enrolment), `enrolled_at` is preserved as the original date while `enrolled_by_group_id` records the reactivator, the most-recent-withdrawn row wins when legacy-semantics leftovers left several, and the group fan-out fires on reactivation (members deserve to know the group re-entered). A deliberate "start over" affordance stays loops/respawn forward shape (DS-3), not Ferd. Red-first against the applied substrate → green; the withdraw→re-enrol→resume arc proven at integration and E2E tiers.
- **Revealed visibility: invited FIMs and group-wielders can finally reach the group (FEAT-H018/PC015 post-6-done)** (2026-07-06) — Stefan's walk, finding 3: after his group was admitted into another group he could not reach it **in any way** — the wielded memberships panel showed the host's name as plain text, and a private host answered "not found" because the visibility check only ever asked about *him*, never about the group he represents; likewise an invited FIM answered invitations **blind**. Principle ratified in the fix: *the no-leak rule protects UNREVEALED groups — an invitation or admission IS the group revealing itself.* Platform (migration `20260706170000`, `get_group_detail` replaced in place): two new viewer cases open the group's **face** — the caller's own `invited` membership (active groups only; look before you answer) and **wielding an active member-group** (ADR-U041 §2a substitution: acting as A carries A's standing, and a member sees its group, any lifecycle state); member-list rules, paused-darkness (PC013 Open Q3), and the stranger P0002 posture unchanged — keyless members of the acting group and strangers stay refused (guard-tested, labelled carried-forward). Hub: **group names are doors now** — linked in "You are invited" and in the wielded memberships panel. **Rider caught by the migration's own verification block:** `get_group_detail` had carried **anon EXECUTE since PC010** — one of the twelve inert-but-anon-executable contracts PC014's build-finding-4 documented for the parked pre-partition grant sweep; revoked in place per the touch-it-harden-it pattern (the sweep's remainder shrinks by one). Red-first (2 contract reds + 2 link reds) → unit **411/411**, full groups domain **187/187** (no old test pinned the reversed blind-answer premise), G-F journeys **2/2**, `next build` + lint clean.
- **Act-as selector offered hats with no standing + false empty-state copy (FEAT-H018/PC015 post-6-done)** (2026-07-06) — Stefan's first manual walk of G-F surfaced two facets of one root: the selector listed **every** wieldable group on **every** group page — including the current group itself (acting-as-itself is meaningless: wielding is outward-only, ADR-U041 §2c) and groups with no membership there — and, for a hatless context, the panel's empty state **claimed "can view this group"** for a group with zero standing in a *private* group (false: the Myself empty-state copy reused where its by-construction truth didn't carry). No access leaked — the substrate returned an empty set throughout; the sentence was the defect. Fixed three-part, red-first on all three tiers: `get_acting_contexts` **context-scoped** (`p_context_group_id` + `is_member_of_context`; DROP + CREATE so the zero-arg overload can't survive; migration `20260706150000`, schema gate); the page offers **only flagged contexts, never the current group** (the unflagged list still gates the memberships panel — the wielder's window stays); the acting empty state now reports the substrate's answer (*"{A} is a member here but holds no permission grants"*). Unit **410/410**, contract suite **27/27** (S4b: member-of-context true in B, false for self), journeys **2/2** (+ the on-own-page one-option assert), `next build` + lint clean.
- **Leadership-transfer affordance gating + honest fallback copy (FEAT-H017 post-6-done)** (2026-07-05) — the first real decline→DeusEx fallback in live testing surfaced two same-day Surface polish gaps: a plain member saw **"Hand over leadership"** (a door the contract always refuses — now rendered only for holders of the my-permissions **`assign_roles`** key; a permission key, never a role name, with the substrate still guarding sole-Steward-ness), and the nomination confirm/notice copy was **silent about the all-decline resolution** (both now name it: *if every nominee declines, the group passes to FringeIsland stewardship and the nominator leaves* — ADR-U019's never-headless outcome, working as designed and now never a surprise). Red-first (2 reds) → green: unit **386/386**, leadership E2E **5/5** re-run, `next build` + lint clean. **Routed to the G-F group-as-actor session:** DeusEx, as an active member post-fallback, appears in a Steward's nominate pick-list — whether it is nominatable at all is that session's question (no system-member flag in the payload; name checks are out by rule).
- **Group invitations showed a raw database error on a duplicate** (2026-07-05) — inviting someone who already had a membership row in the group (active, invited, or paused) surfaced the raw Postgres text *"duplicate key value violates unique constraint …"* on screen. The invite contracts (`invite_member`, and `invite_by_email`'s existing-FIM conversion branch — **FEAT-PC012**) now pre-check and raise a human, state-specific message ("this person is already a member of the group" / "…already has a pending invitation…" / "…is a paused member…") under the same `23505` the BFF maps to 409, with a `unique_violation` backstop so a race can't leak the raw text either. Pre-existing since Cycle G-C; caught in manual testing. Red-first (four message-level asserts in the new `invitation-contracts` `STORY-2b` block) → green; migration `20260705090321`, no schema change (two function bodies replaced), `anon` no-execute re-asserted; groups domain 157/157, lint clean. Scope per **ADR-U040** (ratified same day): `invite_by_email` is slated for retirement under the referral model but was fixed here because it is still live and the report came through its conversion branch. Task TASK-PC012-03 (schema gate).

### Added
- **Hub v2 Phase-3 — Journey completion, review mode & time display (Journeys Cycle J-C: JRN-11/12/13), `6-done`** (2026-07-08) — **A journey can now end — and stay open**: when a traveller completes their last required step, the platform itself detects the arrival and the Hub marks the moment — a gentle in-canvas completion panel (total engagement time + the calendar span, labelled as two different things), the header and step rail in their completed state — rendered **only on server confirm**, never optimistically (a failed save shows no milestone; the H020 optimistic tick + rollback ship unchanged). Completed journeys open in **review**: the same player in a read posture — every step navigable through the unchanged renderer registry, per-step time and completion marks on the rail, navigation recording nothing (background `enter` suppressed), while explicit re-engagement verbs on repeatable/optional steps still work — because **the milestone is not a lock** (the deliberate, gate-nodded loosening: enter/complete now admit `completed` enrolments; without it the completion flip would have dead-locked every optional and repeatable step). *Review* joins *Continue* wherever enrolments render (journeys cards + the detail panel), keyed on status. Platform half (**FEAT-PD004** — schema gate PR #134, **Q1–Q6 nodded "yes to all"**, migration `20260708120000`, **no new tables/columns/RLS — three contract re-issues**): completion detection **inside `complete_journey_step` on the transition edge under the enrolment row lock** (racing finals serialize; a racing withdraw is re-checked under the lock; idempotent — `completed_at` stamps **once, ever**, so a reactivated re-walk never re-stamps or re-notifies), the **solo party flips to `completed`** (the walker IS the party — `traveller_group_id = group_id`, no group-type introspection) while **via-group completion stays traveller-grain** (the party's row never flips — one member finishing never speaks for the group, invariants 4+8; J-D owns aggregates), the **V3 durable `journey_completed` notification row** (passive, addressed to the traveller's personal group only; delivery rides A-NTF; no backfill for the two legacy-completed rows — no edge can fire for them), **derived timing semantics** (per-step = completed engagements summed, open engagements cost nothing; total; wall-clock span served separately — one derivation, platform-side, so the Gimbal renders identical numbers), and the additive `completion`/`timing`/`journey_completed` payload keys (pre-existing keys byte-shape-pinned; **zero BFF changes** — the pass-through routes carry them untouched). Green, TDD red-first throughout: **PD004** 23 contract integration tests (**17 demonstrated red** — 13 missing-behaviour/key + 4 intended-red on the legacy guard; 6 pins) → **88/88** journeys, full sweep **392/392** (37 suites, no flake); **one labelled test adaptation, zero sibling adaptations** — the erasure-cascade proof rides the real `erase_fim_account` path, because a bare group-delete is impossible *by design* (`consent_records` ON DELETE RESTRICT + append-only — ADR-U034 working as intended); **H021** red-first per block (+32 unit tests) → **610/610** (83 suites); **E2E**: the completion/review arc green (walk → milestone on confirm → full reload → Review entry → review posture with **no `enter` fired** + times visible → explicit repeatable re-engagement) + clean isolated re-run, `player.spec`/`journeys.spec` unchanged; `next build` + lint clean. **The production waterfall (review boot + completion moment) rides the J-O3 area gate with Stefan's live walk — pending.** Process: FEAT-PD004 / FEAT-H021 → `6-done`, §L4 journeys + Hub inventories + both `features/README` indexes + completion plan (v5, J-C CLOSED) + root & Hub CHANGELOGs updated; the J-B→J-C boundary carried the **cycle retro** (`retro-2026-07-08.md` — the plain-English-walkthrough process change, the paired-suite adaptation budget, the 522 flake-class disposition, TASK-JB sweep) and a **clean doc-health run**; tasks TASK-JC-01..05 (`done`).
- **Hub v2 Phase-3 — The journey player & the ADR-U044 step substrate (Journeys Cycle J-B: JRN-6/7/8/9/10/18), `6-done`** (2026-07-07) — **The player core lands** (the area's heaviest cycle; the first schema-bearing DS-3 feature): an enrolled member now **walks their journeys** at the new **`/journeys/[id]/play`** player — Continue deep-links from every active enrolment (honest chooser when both a solo and a via-group enrolment exist), a **one-read boot** (`get_player_state`, single round trip by design) opening at the **resume pointer**, a step rail (order / required marks / completion ticks), **linear prev/next painting instantly from the in-memory payload** (the B5 ≤ 200 ms optimistic advance the completion plan mandated — the scoped, in-spec deviation from the mutations-re-read doctrine, confined to player progress marks) with **`enter_journey_step` firing as background auto-save** (failures never block; a "not saved — retry" indicator clears on success), **completion under required-step gating** (optimistic tick + rollback; locked steps name the blocking predecessor; a raced server P0001 lands in the same honest posture; completed non-repeatable steps render review posture, repeatable ones offer their verb again), and **every step kind DS-3 publishes rendering via a registry-keyed renderer map with a mandatory fallback** (JRN-18 — open vocabulary, `kind: string`, unknown kinds render as data, never crash; ask verbs always from the payload). Platform half (**FEAT-PD003** — schema gate PR #128, Open **Q1–Q7 nodded "yes to all"**, migration `20260707190000`): **ADR-U044 realized** — `content_families` (6 canon rows) + `step_kinds` (7 Tier-1 presets: default family + ask/change semantics) registries, **steps become rows** (`journey_steps` with the Designer beat-record columns; inline payloads tagged `pending-DS-4`), **per-traveller step-instances as the progress grain** (`journey_step_instances`, enrolment × traveller personal group × step; open-instance partial unique index; invariants 4+8 enforced by **contract-only posture** — zero policies, zero grants on steps + instances; registries SELECT-to-authenticated — Q4), the **count-agnostic, parity-guarded, reusable conversion** `_migrate_journey_content_steps()` (**returned exactly 47 at apply**; `seeds/05` now calls it so fresh stacks can't end up half-modelled), the **same-migration re-point** of `get_journey_catalog.step_count` + `get_journey_detail.steps[]` to rows (shapes preserved; `kind` = registry key), `journeys.sequencing_mode` (unconstrained TEXT, only `linear` exercised — Q2; `content` NULLed per converted journey), and the **carried FEAT-PD002 Q1 withdraw revisit landed: withdrawal is a terminal `withdrawn` status, never deletion** — step-instances survive as lived history, ADR-U031 erasure still cascades (proven), re-enrolment works (the active-party partial index + four labelled `status <> 'withdrawn'` consequence deltas across both enrol paths, `get_my_enrollments`, and the detail viewer block). Player contracts **deliberately not FIM-only** (traveller standing only — at J-E a Mist walks the onboarding journey through these same contracts, ADR-U045-forward); via-group completion rides the party group's `complete_journey_activities` key (an Observer watches, never completes — Q7); journey-level completion detection deliberately absent (J-C owns JRN-12). Hub half (**FEAT-H020**, no migration): 3 BFF routes (1 Edge+`dub1` read / 2 Node mutations — **route-policy conformance green, zero new exceptions**), the per-enrolment player session cache with sign-out invalidation, the page + `StepCanvas`/`StepRail`/`PlayerSkeleton` + the `step-renderers/` registry, Continue deep-links on the detail enrolment panel. Green, TDD red-first throughout (labelled exceptions honest): **PD003** 24 contract integration demonstrated red (absence classes recorded) → **61/61** across both journeys suites — with the J-A suite's fixtures moved to native rows and its withdraw tests **re-asserting the nodded Q1 semantics** (adaptations labelled, none weakened); full integration sweep **364/365** (the one failure: a Supabase-side Cloudflare 522 during fixture creation, green 24/24 isolated — infra flake, recorded on the PR); **H020** red-first across all three build blocks → unit **578/578** (81 suites); **E2E: the full player arc green** (enrol → walk → complete → leave → **resume from the substrate after full reload** → locked-reason; 1/1 + clean isolated re-run; `journeys.spec` 2/2); `next build` green — **after catching a real type-seam defect the unit tier missed** (`PlayerStep` re-export; the type gate earning its row again); lint 0 errors. **The production waterfall (player boot + step-nav B5) rides the J-O3 area gate with Stefan's live walk — pending.** Process: FEAT-PD003 / FEAT-H020 → `6-done`, §L4 journeys + Hub inventories + both `features/README` indexes + root & Hub CHANGELOGs updated, migration through the schema gate held-then-nodded, tasks TASK-JB-01..06 (`done`). The J-A→J-B boundary carried the **cycle retro** (`retro-2026-07-07.md` — the TASK-JA sweep, the stacked-PR and lint-rot lessons) and a **clean doc-health run** (three soft flags carried).
- **Hub v2 Phase-3 — Journey catalogue & enrolment (Journeys Cycle J-A: JRN-1/2/3/4 + the GRP-4 seam + the PC016 rider), `6-done`** (2026-07-07) — **The Journeys area opens** (first cycle of the [Journeys completion plan](docs/planning/hub-v2/phase-3-journeys-completion-plan.md); the **first DS-3 feature** and the **first Hub build under the [ADR-U043](docs/architecture/decisions/ADR-U043-performance-budgets.md) budgets**): a FIM can now **browse the published journeys** at the new **`/journeys`** catalogue (account menu — "Journeys"; cards with difficulty/duration/tags/step-count, an **Enrolled** badge from their own enrolments, honest empty state, deferred **skeleton grid** — the new B6 primitive, never a spinner-first screen), **open one whole** at `/journeys/[id]` (fields + the **steps overview** — title/kind/duration only, the player is J-B; the header seeds instantly from the cached catalogue card), and **travel it**: *Start this journey* (JRN-3 — the personal group as party, ADR-U020), **Enrol a group** offering **exactly the payload's `enrollable_groups`** (JRN-4, the ADR-U041 wielding walk — the Hub never computes eligibility; confirms name the group), and **Withdraw** behind a destructive `ConfirmModal` — with **frozen enrolments rendering a held state, no affordance, per the payload**. The **group page tells its journeys** (the G-A seam finally filled): the group-detail BFF composes the DS-3 summary as an **ADR-U042 failure-isolated slice** — never a `get_group_detail` field (one-way rule ADR-U023) — and a failed slice shows an honest unavailable section, never a broken page. Platform half (**FEAT-PD002**, DS-3 Journeys — schema gate PR #116, Open Q1–Q5 nodded "yes to all"): **six own-actor SECURITY DEFINER contracts over existing substrate, no new table** — `get_journey_catalog` / `get_journey_detail` (visibility mirrors `journeys_select_published` **verbatim** — Open Q3 recorded: `is_public=false` = published-but-owner-scoped; steps overview derived from the realized `content` JSONB, payload-stable across the J-B step-row swap; the viewer block carries `enrollable_groups` + the **gate-amended withdraw handles** — `individual_enrollment`, per-`enrolled_via` `enrollment_id`/`status`/`can_withdraw` — the J-A build finding: STORY-5's per-the-payload affordances were otherwise unrenderable), `enroll_self_in_journey` (FIM-only at J-A with the **ADR-U045 disposition tagged** for the J-E in-place replacement; the key resolves Tier-1 via the FI Members baseline role; **Open Q2 = the oracle's one-directional semantic homed substrate-side**: an active via-group enrolment blocks self-enrol, group-enrol never blocks on a member's solo travel — B-JRN-003's "detected" was app-layer-only in hub-legacy, the exact ADR-U038 anti-pattern this ends), `enroll_group_in_journey` (group-scoped key; group visibility = the full `get_group_detail` gate incl. the PC015 wields branch; **durable `group_journey_enrollment` notification rows** to active members, actor excluded — Open Q5 in-contract), `withdraw_from_journey` (**Open Q1: row deletion at J-A**; frozen refuses P0001 per B-SEC-003/004; group withdrawal `unenroll_from_journey`-gated), `get_my_enrollments` (kind-marked `individual`/`via_group`; a materialised Mist reads its own — empty until J-E), `get_group_enrollment_summary` (the seam read, never wider than the group's own window) — plus the **ADR-U038 direct-write narrowing on `journey_enrollments`** (**Open Q4: both** — the four sprint0 client-write policies dropped AND `INSERT/UPDATE/DELETE` revoked from `anon, authenticated` — **plus** the partial unique **active-party index** the 2026-02-21 rebuild lost: nothing structurally prevented duplicate enrolments until today; reads stay RLS-scoped). Rider (**FEAT-PC016**, PC-3): `get_my_pending_nominations()` on the `get_my_invitations` mirror (**server-clock** expiry, own-recipient, payload-embedded group names) and `hub/lib/groups/leadership.ts` **thinned to a pure relay** — the pending-nomination derivation has one home; **the 2026-07-06 compliance audit's LOW finding closes**. Hub half (**FEAT-H019**, no migration): 5 BFF routes (3 Edge+`dub1` reads / 2 Node mutations — **route-policy conformance green, zero new exceptions**), the journeys session-cache client, both pages, the enrolment block, the slice section, the nav entry, sign-out cache invalidation. **Performance DoD bound for the first time:** first paint = exactly 2 reads and zero duplicate fetches across auth-event churn (asserted), B6 skeleton deferral asserted; **the production waterfall rides the J-O3 area gate (Stefan's live walk, pending)**. Green, TDD red-first throughout (labelled exceptions honest): **PD002+PC016** 43 contract integration (39+2 demonstrated red — PGRST202 + the legacy write policies permitting what the narrowing forbids; 2 existing-substrate guards labelled), **H019** 54 unit red-first + 4 perf rows (labelled test-after) + **2 E2E journeys** (the solo arc; the wielding walk incl. the group page section). Full unit **509/509**, integration **341/341**, **E2E 58 passing** (56/57 in the concurrent full sweep — the one failure is the documented `entry.spec` flake-watch item, green 3/3 isolated; the 2 journeys E2E green in both runs), `next build` + lint clean (3 suppressions for the new `react-hooks/set-state-in-effect` plugin drift — pre-existing on main's groups page, disposition routed to the J-A retro). Process: FEAT-PD002 / FEAT-H019 / FEAT-PC016 → `6-done`, §L4 journeys + organisation + Hub inventories + all three `features/README` indexes updated, migrations `20260707130821` + `20260707145549` (schema gate — Q1–Q5 + the amendment nodded), tasks TASK-JA-01..09 (`done`); **task files returned this cycle (board J-D3)**.
- **Hub v2 Phase-3 — Group-of-groups & acting as a group (Groups Cycle G-F: MEM-10 depth-1), `6-done`** (2026-07-06) — **The Groups area's build scope closes** (MEM-9 forward-seam excepted, D2): a whole group can now **join another group and act through people it has empowered** — the governance decided the same day in **[ADR-U041](docs/architecture/decisions/ADR-U041-group-representation-by-permission.md)** (the G-E → G-F design session, run against the prepared decision board PR #92: *acting as a group is a permission; representatives are always people*). A Steward with `invite_members` **invites a group** by typeahead (public active engagement targets, cap 8; self/duplicate/**direct-cycle** refused with honest copy — Open Q2); the invited group's **wielders** (holders of the new **`act_as_group`** key — catalog 39→40, Steward-template-seeded **and backfilled into every existing Steward instance**, per-group widenable) find the pending invitation on **their group's own page** and answer **as the group** behind confirms that *name the wielding*; accept rides the proven `invited→active` path so the Member-instance auto-bind fires unchanged; the wielder can later **withdraw** (last-active-Steward and last-member refused honestly). The FEAT-H014 act-as shell became **real**: "Myself" plus every direct empowerment (never Tier-1 admin reach, never a chained hop — §2d: *the wielding actor is always a personal group*, the A-in-B-in-C session question), with **pure substitution** named on screen (*"Acting as X — these are X's powers here"*). Member surfaces stopped treating every member as a person: **kind badges** (Group / FringeIsland — the caretaker is visible, never hidden; unknown types render raw, open-set), count copy + **Close** key on the new `non_system_member_count` — **the Gracy case closes**: the last human alone with the caretaker finally sees Close — and the nominate pick-list offers **persons only** (§4; the substrate refuses too: eligibility excludes non-personal groups — closing the **live hole demonstrated red: the pre-migration contract accepted a DeusEx nominee**, FEAT-H017's routed rider). One PC014 carried-forward test asserted the old any-active-member posture and was amended same-day to pin the refusal (Post-6-done note in FEAT-PC014). Platform half (**FEAT-PC015**, PC-3 Organisation — schema gate PR #95 nodded + merged 2026-07-06): the key + seeds + instance backfill, `invite_group` / `search_invitable_groups` (the D3/DS-6 seam applied to groups), the wielded `respond_to_group_invitation` / `leave_group_as_group` (the ADR's two-step walk **in-contract**; the PC013 leave cascade mirrored), the acting-context reads, `nominate_steward` + `get_group_detail` **replaced in place**, the **audit-trace column** `status_changed_by_group_id` (§2b — the wielding human at audit level, never authorship; Open Q4) — **no new table, no trigger changes, no policy changes**; anon holds zero EXECUTE (verification-block-enforced). Hub half (**FEAT-H018**, no migration): 6 BFF handlers + the my-permissions `?acting=` substitution read (refusal copy verbatim; id-only telemetry), two new panels (the wielded memberships panel renders **only** for wielders — no fake doors), kind badges + non-system counts, tolerant readers for pre-extension payloads. Green: **PC015** 26 contract integration (20 demonstrated red incl. the DeusEx-nominee hole; 6 anon-floor guards labelled); **H018** 23 unit red-first + **2 E2E journeys** (the full wielded arc; the Gracy case — labelled journey-tier, post-implementation); full unit **408/408**, integration **288/288**, **E2E 54/55** (the one failure: `profile.spec` sign-out flaking under the full sweep only, green 3/3 isolated — joins the `entry.spec` watch item), `next build` + lint clean. **Depth stays 1** (D5; OQ-6 untouched, cited by name — the G-29 shorthand corrected per decision DB-7). Process: FEAT-PC015 / FEAT-H018 → `6-done`, §L4 organisation + Hub inventories + both `features/README` indexes + Groups plan G-F row + root & Hub CHANGELOGs updated, migration `20260706120000` (schema gate — Open Q1–Q5 + four in-default build decisions nodded), tasks TASK-PC015-01..03 + TASK-H018-01..03 (`done`).
- **Hub v2 Phase-3 — Leadership transfer, closure & deletion (Groups Cycle G-E: MEM-7/8, GRP-9), `6-done`** (2026-07-05) — The Groups area's **heaviest cycle closes the arc**: a group can now **change hands and end** — and the two G-D honest refusals became these flows. The sole active Steward who tries to leave is no longer walled at "assign another Steward first": the same moment **opens the transfer choice** — **nominate successors in ranked order** (an ordered pick-list sourced from the existing member list; the offer goes to the first nominee as a durable 7-day `stewardship_nomination` row; **nothing changes hands until someone accepts**) or **hand the group to FringeIsland** (`hand_stewardship_to_deusex`, the ADR-U019 last resort, styled as exactly that). The **nominee answers where their groups live** — a pending-nomination affordance on `/groups` (the **A-NTF re-home seam**: a minimal scoped read of their own unanswered, unexpired `stewardship_nomination` rows — deliberately not an inbox) showing the group and the window; **Accept** (ConfirmModal) makes them the Steward as the nominator departs; **Decline** relays "passed on" **without naming next-nominee-vs-DeusEx** — the routing is the contract's (decline→next-ranked, all-declined→DeusEx fallback: the group is **never left headless**). The **last member closes** the group deliberately (`close_group` — MEM-8, the retired "closing isn't available" wall; `status='closed'`, work frozen + owned non-public journeys reassigned to DeusEx, DS-4/DS-5 dispositions **tagged `pending-*`**, not built — D2), and a **`delete_group` holder deletes deliberately** (GRP-9 — **soft-terminal `status='archived'`**, Open Q5: the `journeys … ON DELETE RESTRICT` wall makes hard-delete impossible for journey-owning groups anyway, and the tombstone keeps forum authorship alive for DS-5/MEM-9; in-contract member notices — the remaining member's durable `group_deleted` row asserted E2E). **Four distinct intents, four distinct affordances, never conflated: Leave / Remove / Close / Delete** — Delete alone is `delete_group`-gated, danger-styled, explicitly confirmed. Platform half (**FEAT-PC014**, PC-3 Organisation — schema gate PR #80 nodded + merged 2026-07-05, paperwork PR #81): `nominate_steward` **replaced in place + hardened** (template-aware + active-membership Steward resolution — closing the sprint3 **v2-named-Steward `'Member'`-class bug** and the **paused-Steward blind spot**), `respond_to_stewardship_nomination` (accept / decline→next / decline→DeusEx; expiry predicate-based, no reaper), `hand_stewardship_to_deusex` + the shared `_transfer_stewardship_to_deusex` helper, `close_group`, `delete_group` — **no new table, no trigger changes**; `delete_group`'s cascade rides the established transaction-local `app.hard_delete_in_progress` flag (spec-premise correction: the last-leader trigger bypasses only on `'closed'`) and silences per-row exit spam in favour of the single in-contract notice. **Security closure (ADR-U038): the live sprint3 hole shut** — `handle_notification_action` + `_handle_stewardship_nomination_action` **dropped** (anon/PUBLIC execute + stewardship side effects dispatched on caller-supplied `action_data`; the crafted-`action_data` exploit demonstrated red — an outsider granted themselves Steward before the drop), the raw `groups_delete` RLS policy dropped, anon execute revoked across the surface — and the **Supabase default-privileges lesson banked**: new functions grant to `anon` directly, so every revoke names `anon`, not just PUBLIC (third confirmed instance; the pre-partition SECURITY DEFINER grant sweep now has its mechanism). Closure survivors pinned by test (Open decision, nodded): `close_group` counts **active** members only — paused/invited rows survive on the closed tombstone. Hub half (**FEAT-H017**, no migration): 5 BFF handlers + the one new read `GET /api/me/nominations` (Edge+`dub1`; house SQLSTATE map with the 409 **and** 400 contract messages passed through verbatim; **id-only telemetry — names and nominee id lists never in events, canary-asserted**); `DELETE /api/groups/[id]` is its own verb on the group resource, riding the Edge detail file per its in-file single-RPC precedent (recorded deviation from the spec's blanket Node-mutation line); the my-permissions read **additively carries the caller's contract-resolved `member_group_id`** (the pick-list's payload-driven self-exclusion — no extra fetch); the pending-nomination affordance is built to re-home into the A-NTF inbox without a rewrite. Green, TDD red-first throughout: **PC014** 48 contract integration (39 demonstrated red, incl. the anon-grant + caller-data adversarial reds and both closure arcs); **H017** 26 route/lib units + 17 component units (staged red: modules absent → fetchers green → routes green; 12 panel reds at collection) + **5 E2E journeys** on dedicated spec-created FIMs in their own contexts (nomination-accept across FIMs; the single-nominee decline→DeusEx fallback with the group persisting active; the direct hand-over; last-member close (`closed` asserted substrate-side); Steward delete with the remaining member finding the group gone — `archived` tombstone + their `group_deleted` row asserted). Full unit **385/385**, integration **262/262**, **E2E 53/53**, `next build` + lint clean (one pre-existing warning). **Finding, routed:** PC013's `leave_group` last-member refusal copy still says *"closing a group is not yet available"* — false since this cycle; a copy-only function-body migration is prepared separately through the schema gate. Process: FEAT-PC014 / FEAT-H017 → `6-done`, §L4 organisation (three PC014 rows) + Hub inventories + both `features/README` indexes + root & Hub CHANGELOGs updated (this bundled entry — PC014's half was merged 2026-07-05 and held for it), migration `20260705072252` (schema gate — Open Q1–Q5 + four build findings nodded), tasks TASK-PC014-01..03 + TASK-H017-01..03 (`done`).
- **Hub v2 Phase-3 — Group membership lifecycle (Groups Cycle G-D: MEM-4/5/6), `6-done`** (2026-07-04) — A group's membership is now **tendable in both directions**: a `pause_members` holder can **pause** a member from the member list (ConfirmModal) — the paused member keeps their roles but goes **permission-dark** (the substrate's own `has_permission()` `status='active'` filter — zero resolution changes, oracled B-RBAC) and the group steps out of their view (their `/groups` list omits it; a private group's detail answers not-found — **substrate truth asserted, not decorated**); an `activate_members` holder brings them back exactly as they were (preserved roles simply resolve again — the `invited→active` trigger fabric stays silent, asserted). Paused rows wear a **Paused badge visible only to management-key viewers** (Open Q3 — membership state is FIM data). A `remove_members` holder gets a **removal with the composed cascade the raw RLS path never had**: the target's unfinished enrolments in the group's non-public journeys freeze (`removed_from_group`), their role rows are cleaned up (the old path **orphaned** them), the membership leaves, and the durable `member_removed` row is written — paused members are removable too (the old path couldn't). Every member gets **Leave group**: the regular exit with the leaver's own freeze (`left_group`, the sprint2 shape verbatim), roles + membership cleanup, and `member_left` to the Stewards. **The two G-E exits are refused honestly instead of half-executed:** the sole active Steward and the last member get actionable copy ("assign another Steward first" / "closing a group is not yet available") — and the affordance is **never hidden client-side**. Platform half (**FEAT-PC013**, PC-3 Organisation — schema gate PR #71, nodded + merged same day): 3 new SECURITY DEFINER contracts + the internal-only `active_steward_count()` helper, **`leave_group` replaced in place** (Open Q1 — the pre-partition sprint2 monolith exposed the DeusEx handover + closure unspecced on the direct PostgREST path with existence-leaking refusals; the replacement narrows to the regular exit with house P0002 no-leak semantics; G-E re-lands MEM-7/MEM-8 from the legacy oracle), the additive `get_group_detail` `membership_status` amendment (management keys also imply member-list visibility — the minimal-permission pauser persona surfaced it at build), **the two member-exit DELETE policies dropped** (Open Q2, the G-A narrowing precedent — the raw paths bypassed freeze/roles/guards and let a sole Steward strand a group headless, demonstrated red before the drop; admin policies untouched, integration-asserted via a promoted platform admin), and **last-ACTIVE-Steward guards** contract-side (the raw-role-count trigger is blind to status flips, and **a paused Steward is not cover** — all three matrices asserted). Self-targets refused on pause/remove (Open Q4 — leave is the self-exit). Grant-audit finding: legacy `leave_group` carried EXECUTE-to-PUBLIC since sprint2 — revoked. **No new table, no trigger changes.** The DS-5 former-member-attribution disposition is tagged **`pending-DS-5`, not built** (D2 — MEM-9's forward-seam); the enrolment freezes are DS-3's satisfied-now dispositions, re-verified at the Journeys gate. Hub half (**FEAT-H016**, no migration): 4 BFF mutation handlers (SQLSTATE→HTTP; **the 409 message passes through verbatim — it carries the honest G-E copy the Surface renders in place**; id-only telemetry, canary-asserted), three independently-gated row affordances off the already-fetched my-permissions read (any key subset renders exactly that subset), one lifecycle ConfirmModal (Remove destructive), the Leave affordance with its own in-place refusal line, no new page and no new read. Green, TDD red-first (labelled exceptions: the regular-leave cascade asserts were green against the legacy body — carried-forward behaviour the replacement had to keep; one in-flight test-expectation correction — Tier-1 platform-baseline permissions are context-free and survive a group pause): **PC013** 24 contract integration (**21 demonstrated red** — PGRST202 + genuine semantic reds against legacy `leave_group`, which *executed* handover/closure on the suite's own fixtures); **H016** 13 route-unit + 10 panel unit (red-first; all 15 prior panel cases stayed green) + **5 E2E journeys** on dedicated spec-created FIMs (the pause round-trip incl. the paused member's honest absence + return; both G-E refusal copies live; removal; the regular leave). Full unit **341/341**, integration **210/210**, **E2E 48/48**, `next build` + lint clean (one pre-existing warning). Process: FEAT-PC013 / FEAT-H016 → `6-done`, §L4 organisation (Membership lifecycle row three-spec) + Hub inventories + both `features/README` indexes + Groups plan G-D row (with the **removal-premise correction**: the audit found the plan's "leave/removal cascades already exist" held for leave only) + root & Hub CHANGELOGs updated, migration `20260704192549` (schema gate — Open Q1–Q4 + two build amendments reviewed), tasks TASK-PC013-01/02 + TASK-H016-01..03 (`done`).
- **Hub v2 Phase-3 — Group invitations & joining (Groups Cycle G-C: MEM-1/2/3), `6-done`** (2026-07-04) — A group can now **grow**: an `invite_members` holder gets an **Invitations panel** on `/groups/[id]` — a **member-search typeahead** (partial name or **exact** email, capped at 8, already-member/already-invited hits disabled from the payload; the D3 decision executed as the **DS-6 re-home seam**) and an **invite-by-email** path whose copy is deliberately honest: *the invitation waits for them at sign-up — no email is sent yet* (the D4 decision; dispatch is the planted V3 seam). The panel's **pending list** shows both invitation kinds distinctly (membership invitations with invitee + inviter display identity; email invitations with a **payload-driven Expired badge** — expiry is predicate-based, no reaper exists or is built) with ConfirmModal cancels. The invitee side lives where groups live: a **"You are invited"** section on `/groups` (`get_my_invitations` — the **only window** onto invited memberships; every existing read filters them out by design) showing the invitation context only (name, description, inviter — never private-group detail), with **Accept** (the group appears in the list in the same refresh) and ConfirmModal **Decline** (re-invitation stays possible). **The email-invited newcomer's promise is kept end-to-end:** sign-up with the matching address auto-claims (the existing `handle_new_user` Step 8, exercised not modified) and the invitation is waiting on their first visit. Platform half (**FEAT-PC012**, PC-3 Organisation — schema gate PR #68, nodded + merged same day): **nine SECURITY DEFINER contracts over the existing invitation substrate, no new table, no policy changes** — `search_invitable_members()` (Open Q1: exact-only email matching; legacy's partial-email match is an enumeration primitive against PII and was not carried over; no emails in the payload; Mists/suspended/the `[Deleted User]` sentinel never appear), `invite_member()` (mirrors the `memberships_insert_invite` RLS predicate; non-invitable targets P0002 no-leak), `invite_by_email()` (lowercased + case-insensitive duplicate guard; **Open Q2: an existing FIM's email converts server-side to a membership invitation** — a stranded email row would never auto-claim, sign-up being the only claim trigger), `get_group_invitations()` + two cancels (**Open Q3: `invite_members`-gated** — third-party emails are PII), `get_my_invitations()`, `accept_group_invitation()` / `decline_group_invitation()` (the self-scoped RLS semantics composed; role auto-bind + the durable notification rows ride the existing triggers). **Two findings fixed:** the **FEAT-PC002 erasure gap** — account erasure now deletes pending email invitations addressed to the erased email (Art. 17, Open Q4; sent-by links `SET NULL` via the existing FK, asserted) — and a **real substrate defect caught red-first**: `auto_assign_member_role_on_accept` looked up the default role by `name='Member'` while v2-created groups name instances `'Member Role Template'`, so an accepted invitee silently received **no role at all**; fixed via `created_from_role_template_id` linkage with the short-name fallback for legacy groups. TRUNCATE revoked on `pending_email_invitations` + `group_memberships`; the direct email-INSERT residue surfaced at the gate, accepted (the G-B posture). Hub half (**FEAT-H015**, no migration): 8 BFF handlers (reads Edge+`dub1`; POST is `member_group_id` XOR `email`; SQLSTATE→HTTP house map; **id-only telemetry — email addresses and search queries never in events**, the search event carries a hit *count*); the detail page's **one refresh path extends to four reads** with the invitations read **chained off the fresh permissions payload** (nobody eats a 403 probe). Green, TDD red-first (labelled exceptions: 2 of STORY-7's existing-RLS verification asserts): **PC012** 26 contract integration (24 demonstrated red — incl. the accept test that exposed the trigger defect; the auto-claim arc via a real substrate sign-up; adversarial direct paths as plain member and Mist); **H015** 17 route-unit + 14 component unit (red-first at collection) + 3 E2E journeys on dedicated spec-created FIMs (the invitation arc across two contexts; the email-invited newcomer's arrival; decline + cancel — with the **Open Q2 conversion observed live**). Full unit **320/320**, integration **186/186**, **E2E 43/43**, `next build` + lint clean (one pre-existing warning). Process: FEAT-PC012 / FEAT-H015 → `6-done`, §L4 organisation (Membership lifecycle + the new Pending-invitation-claim row) + Hub inventories + both `features/README` indexes + Groups plan G-C row + root & Hub CHANGELOGs updated, migration `20260704144630` (schema gate — seven gate items reviewed), tasks TASK-PC012-01/02 + TASK-H015-01..03 (`done`).
- **Hub v2 Phase-3 — Group roles & permissions (Groups Cycle G-B: GRP-6/7/8), `6-done`** (2026-07-04) — A group's role structure is now **visible and shapeable** from the Hub: the `/groups/[id]` page carries a **Roles panel** (every role with its template-or-custom badge, holder count, and granted permissions as chips — legible to all members, management affordances only where the payload's **capability flags** say so), the member list wears **role chips** with a per-member **assign picker** and ConfirmModal removal, and a **"What I can do here"** view renders the member's effective permissions under the **honest v1 act-as selector** — one real context, "Myself" (group-as-actor wielding is unresolved governance, parked to G-F per PC011 Open Q1). **Escalation is structurally impossible, platform-side:** you cannot define a role granting what you don't hold (the definition-time wall — the verified `grp_insert` predicate mirrored into the contracts), and you cannot assign a role granting what you lack (`can_assign_role()`, the assignment-time wall); the **last-Steward / last-DeusEx invariants** refuse verbatim and the Surface shows their messages in place, never pre-computed. Platform half (**FEAT-PC011**, PC-3 Organisation — schema gate PR #65, nodded + merged same day): six SECURITY DEFINER contracts over the existing role substrate (**no new table, no policy changes** — the audited RLS stays as defense-in-depth) — `get_group_roles()` (fabric + viewer flags + the 44-key catalog riding the payload), `create_group_role()` (template instantiation via the copy trigger, or custom with explicit grants; **build-discovered trapdoor closed contract-side**: the copy trigger auto-links roles named `'<X>'` to `'<X> Role Template'` and copies its grants, so colliding custom names are refused), `update_group_role()` / `set_group_role_permission()` (per-group customisation incl. template-derived instances — Open Q2), `delete_group_role()` (custom + unheld only — Open Q3), `assign_member_role()` / `remove_member_role()` (riding the invariants + the existing notification triggers), plus the **additive `get_group_detail` members extension** (`member_group_id`, `roles[]`) and TRUNCATE revokes on all three role tables; GRP-8 needs no new function — the existing published `get_user_permissions()` is the read (its "empty for non-members" AC honestly **amended at build** to baseline-indistinguishability: the FringeIsland Members system-group baseline is global by design; a foreign private group answers byte-identically to a nonexistent one). Hub half (**FEAT-H014**, no migration): six BFF handlers (fabric + my-permissions on Edge+`dub1`; SQLSTATE map extended with 23505/P0001 → 409, invariant messages passed through; id-only telemetry — role names are member content) with the **template vocabulary composed into the fabric response** (`role_templates` is RLS-readable platform-side; no new contract). Green, TDD red-first (labelled exceptions: STORY-5's pinned existing RPC + STORY-6's existing-RLS verification asserts): **PC011** 32 contract integration (27 demonstrated red; adversarial direct INSERT/UPDATE/DELETE as plain member and Mist on all three tables); **H014** 20 route-unit + 19 component/page unit (red-first) + 2 E2E journeys (the delegation arc — Steward shapes a custom role from the checklist, assigns it, the assignee's "what I can do here" gains the capability, and the assignee's own escalation attempt is refused in place; the last-Steward refusal with the chip staying) — the E2E rewritten onto a **dedicated spec-created steward FIM** after the shared-session refresh-token contention broke the full run (found-and-fixed; profile.spec's sign-out journey revokes the shared token globally). Full unit **289/289**, integration **160/160**, **E2E 40/40**, `next build` + lint clean (one pre-existing warning). Process: FEAT-PC011 / FEAT-H014 → `6-done`, §L4 organisation (4 rows) + Hub inventories + both `features/README` indexes + Groups plan G-B row + root & Hub CHANGELOGs updated, migration `20260704090434` (schema gate — five gate items reviewed, incl. two direct-path residues accepted as defense-in-depth posture), tasks TASK-PC011-01/02 (`review`, house convention) + TASK-H014-01..03 (`done`).
- **Hub v2 Phase-3 — Group creation & stewardship (Groups Cycle G-A: GRP-1/2/3/5 + GRP-4 completion), `6-done`** (2026-07-04) — A FIM can now **create an engagement group** from *My Groups* and land inside it as its **Steward**, **open any of their groups** to a detail page (description, label, **lifecycle-status badge** — vocabulary-tolerant; member count; the **member list exactly as the group's settings allow**, with honest "member list hidden" copy), and **steward the settings in place** — name/description/label plus the **two independent visibilities** (who can find the group vs who can see its member list). **Private stays private:** a group the caller may not see is indistinguishable from one that doesn't exist (P0002 → 404, end to end). Platform half (**FEAT-PC010** — the **first PC-3 Organisation feature**): three own-actor `SECURITY DEFINER` contracts over existing substrate (**no new table**) — `create_engagement_group()` (atomic bootstrap: group + role instances from `group_template_roles` + creator active membership + **permission-derived Steward binding** via `assign_roles`, no role-name strings; FIM-only + active-account-only), `get_group_detail()` (member-or-public+active visibility; viewer block with the `can_manage_settings` **capability flag** the Surface gates on; member list per `view_member_list` or the public toggle; display-identity names), `update_group_settings()` (partial update; per-field catalog keys `edit_group_settings`/`set_group_visibility`/`control_member_list_visibility`; no path to `status`/`group_type`) — plus the **ADR-U038 direct-write narrowing on `public.groups`** (INSERT/TRUNCATE revoked from client roles — the verified hole let any authenticated caller, incl. a Mist, create an un-bootstrapped row; UPDATE column-scoped so even a Steward can't flip `status`/`group_type` directly) and the **idempotent `FringeIsland Members`/`DeusEx` seeding repair** (C3-1 fresh-DB gap; seeds sit outside the migration chain). **P3a rode along** as its own migration: the advisor-verified 14 FK covering indexes + the 2 remaining `auth_rls_initplan` wraps (the Identity→Groups boundary NFR bet, D1). Green, TDD red-first (labelled exceptions: the settable-column regression-guard + the dev-state seeding presence assert), full pyramid: **PC010** 19 contract integration (16 demonstrated red; adversarial direct INSERT/UPDATE incl. the Mist attack shape); **H013** 13 route-unit + 16 component/page unit (red-first) + 3 E2E (create→steward journey; the non-member honesty matrix on a spec-created second FIM — whose creation was itself refused until the ADR-U038 S3 consent metadata was supplied, the gate working; sessionless deep-link gate); full unit **249/249**, integration **128/128**, **E2E 38/38**, `next build` + lint clean (one pre-existing warning). Process: FEAT-PC010 / FEAT-H013 → `6-done`, §L4 organisation + Hub inventories + both `features/README` indexes + root & Hub CHANGELOGs updated, migrations `20260704075547` + `20260704075549` (schema gate).
- **Hub v2 Phase-3 — Per-device sessions (Cycle E, IDN-11), `6-done`** (2026-07-03) — A FIM can now see **every device they're signed in on** and **sign one out remotely** at the new **`/sessions`** surface (account menu — "Sessions"): one row per active session with an honest device line (derived from the raw user agent — no parser), IP, signed-in and last-active times, and a **"This device"** badge; per-row **Sign out** through a `ConfirmModal` (distinct copy on the current device, which signs out locally at once). **The revoked device finds out fast:** the platform emits a **server-originated, content-free hint** on a **private** Realtime channel (`account:<uid>:sessions`) and the client **verifies before acting** — `getUser()` against the Auth server, sign-out only on refusal, so a spoofed or stale hint is a no-op by construction — with **focus/visibility + slow visible-tab polling** as the guaranteed fallback (a missed hint costs latency, never security). This is the **first tenant of the ADR-U039 socket doctrine** (one socket per client; private channels via `realtime.messages` RLS; hints are never authority; durable-first), which Notifications/DMs inherit next. Platform half (**FEAT-PC009**, PC-2): two own-subject `SECURITY DEFINER` contracts over `auth.sessions` — `get_own_sessions()` (inventory; `is_current` via the JWT `session_id` claim; `auth.uid()`-direct so a **suspended** member keeps session control; FIM-only, a Mist is refused 42501) and `revoke_own_session()` (own-row delete, refresh tokens die by FK cascade; **P0002** for foreign-and-nonexistent alike — no existence leak; durable `session_revoked` audit row; the hint is exception-guarded so it can never fail the revocation). **No new table**; `admin_force_logout` was the mechanics precedent; feasibility gate + legacy-MVP instant-logout review 2026-07-03 (PR #55/#56). Green, TDD red-first (page-gate unit labelled test-after), full pyramid: **PC009** 9 contract integration (red-first, incl. adversarial Mist/cross-user direct-`rpc()` and channel-authorization probes); **H012** 9 route-unit + 9 panel + 8 session-guard (red-first) + 3 page-gate (test-after) + 3 E2E (incl. the **live two-context remote sign-out**); full unit **220/220**, integration **109/109**, **E2E 35/35**, `next build` + lint clean. Process: FEAT-PC009 / FEAT-H012 → `6-done`, §L4 identity + Hub inventories + both `features/README` indexes updated, migration `20260703154102` (schema gate).
- **Hub v2 Phase-3 — Private Journal (Cycle D, IDN-5), `6-done`** (2026-07-03) — A FIM now has a **private journal** at the new **`/journal`** surface (reachable from the account menu — "Journal"): write entries (optional title, plain text), read them newest-first with **keyset "load older"** paging, **edit in place**, and **delete through a `ConfirmModal`** — with an empty state that invites the first entry and a failed save that **preserves the typed text**. Private by construction: **no other member, no admin, no direct PostgREST caller can read an entry** — the new `journal_entries` table carries **no client-role grants** (every verb refused at the substrate, 42501) and all access flows through five own-subject `SECURITY DEFINER` RPCs (**FEAT-PD001**, the **first Platform-Domain feature**, owned by **DS-7 Intelligence** per the 2026-07-03 routing adjudication). Writes are **FIM-only** (a Mist is refused — ADR-U031 ephemerality stays out of v1) and require an active account; **reads and export survive suspension** (right-of-access, the PC008 precedent). **GDPR closed in v1:** account **erasure hard-deletes** every entry via the owner FK riding `admin_hard_delete_user`'s cascade (never sentinel-reassigned — proven end-to-end), and **"Download my data" now includes the journal** — the export route composes the versioned `get_own_journal_export()` section into the file as an additive `journal` key (present-and-empty when there are no entries; Domain sections arrive by surface composition — PC-4 never reads Domain tables). Green, TDD red-first (with the erasure/export substrate tests labelled test-after verification), full pyramid: **PD001** 11 contract integration (red-first) + 4 erasure/export integration; **H011** 12 unit (page gate + panel, red-first) + 3 export-composition route-unit (red-first) + the journal E2E journey; **full E2E 32/32** — restored by a found-and-fixed harness break (the e2e session user predated the ADR-U038 S3 consent gate; `global-setup` + `deleteE2EUser` updated); `next build` + lint clean. Process: FEAT-PD001 / FEAT-H011 → `6-done`, the Journal routing adjudicated to DS-7 (intelligence.md §L3 + Sources-status amendment; PC-2 pickup RESOLVED), §L4 DS-7 + Hub inventories + both `features/README` indexes updated, FEAT-H010 amended (composed download), migration `20260703084810`.
- **Hub v2 Phase-3 — Data export / GDPR (Cycle C, IDN-8), `6-done`** (2026-06-30) — A FIM can now **download a complete copy of their own data** at the new **`/export`** surface (reachable from the account menu — "Download my data"). One click fetches an assembled, machine-readable **JSON document** and saves it as `fringeisland-data-export.json` — the GDPR **right of access / data portability**. The download contains the member's **own** profile, account state, full **consent history**, and group memberships; the surface is a **faithful courier** (it never parses or reshapes the document, so future sections flow through unchanged) with honest **loading** + **error/retry** states and no double-fire. Built **platform-first, API-first** over a new **synchronous** export contract: the own-subject `get_own_data_export()` RPC (**FEAT-PC008** / `GET /api/account/export`) — a `SECURITY DEFINER` aggregation across Core-owned substrate (`users` profile/account, the append-only `consent_records` ledger, `group_memberships`) that resolves the caller via `auth.uid()` (so a **suspended** member can still exercise their right of access), returns one **versioned** document (`schema_version` 1), and records a durable **`data_export`** event in `admin_audit_log` (the accountability trail). **Own-subject throughout** — no cross-member exposure, no target parameter; **read-only** (no erasure — that is the later IDN-10 seam). **Out of scope (forward seams):** the member's **journey enrolments** (Domain-owned, DS-3) and the private **Journal** (IDN-5) are added as new export sections when those areas are built — PC-4 does not reach into Domain tables. Green, TDD red-first, full pyramid: **PC008** 7 integration + 3 route-unit; **H010** 8 unit (4 client + 4 panel) + the account-menu link + 3 E2E; full unit **159** + account integration **32**; `next build` + lint clean. Process: FEAT-PC008 / FEAT-H010 → `6-done`, PC-4 §L3 data-export row added (**G-35** narrowed to its feature-flag remainder), §L4 governance + Hub inventories + both `features/README` indexes updated, migration `20260630161155`.
- **Hub v2 Phase-3 — Consent & privacy / GDPR (Cycle B, IDN-6 + IDN-7 consent half), `6-done`** (2026-06-30) — A FIM can now **see and manage their own consent** at the new **`/consent`** surface (reachable from the account menu — "Privacy & consent"). The surface shows **effective state** (the current decision per purpose — Granted / Withdrawn / "Not yet decided" — with a quiet "policy updated" hint when a decision is stale, informational only) and the full append-only **consent history** (the GDPR proof trail). **Granular controls** let a member **grant or withdraw** a withdrawable purpose (e.g. `product_analytics`) through a **`ConfirmModal`** (never a browser dialog); the foundational `transcendence` consent renders **locked** (non-withdrawable). Every change confirms intent, calls the platform, then **re-reads** effective state (the single source of truth — no optimistic flip), and a failure surfaces a clear error with the decision visibly unchanged. Built **platform-first, API-first** over a new **granular-consent substrate**: a `decision` column on the existing append-only `consent_records` ledger + a data-driven **`consent_purposes`** catalog (label / withdrawability / policy-version per purpose — new purposes are rows, never a sealed enum; **ADR-U034 Amendment 1**), the own-subject `get_own_consent_state()` read (**FEAT-PC006** / `GET /api/account/consent`, IDN-6), and the withdrawability-gated, append-only `record_consent_decision()` write (**FEAT-PC007** / `POST /api/account/consent`, IDN-7 consent half; typed refusals 422 unknown-purpose / 409 non-withdrawable / 403 no-subject, `policy_version` stamped server-side). Own-subject throughout (no cross-member exposure); the append-only ledger is never mutated (a withdrawal is a new row). **Out of scope (split / deferred):** the **sharing-controls** half of IDN-7 (per-audience visibility, PC-3-coupled — no substrate yet, tracked as **G-34**), and any **re-consent flow** (drift is surfaced, not acted on). Green, TDD red-first, full pyramid: **PC006** 12 integration + 3 route-unit; **PC007** 7 integration + 7 route-unit; **H008** 8 ConsentView-unit + 4 E2E; **H009** 11 unit (6 controls + 5 orchestration) + 3 E2E; full unit **148** + consent integration **19** + consent E2E **6**; `next build` + lint clean. Process: FEAT-PC006 / PC007 / H008 / H009 → `6-done`, §L4 governance inventory + both `features/README` indexes updated, ADR-U034 Amendment 1 appended.
- **Hub v2 Phase-3 Identity — Account-state surfaces (IDN-9), `6-done`** (2026-06-29) — Account-state surfaces (IDN-9): the Hub reads a FIM's own account lifecycle state via the new `GET /api/account/state` contract (FEAT-PC004) and renders it honestly — a suspended account shows a "contact an admin" message (no self-reactivation), a closed account shows a terminal message — instead of dropping a switched-off member into a broken empty experience (FEAT-H006). Cycle A was split: IDN-12 self-service reactivation (FEAT-PC005 / FEAT-H007) is **deferred/parked** — it pairs with self-pause and needs a deactivation-origin field so a member can only reverse their own `paused` account, never an admin `suspended` hold (see `docs/planning/hub-v2/account-lifecycle-states-decision.md`).
- **Hub v2 Phase-3 Identity — FEAT-H004 (Mist→FIM transcendence + the farewell), `6-done`** (2026-06-27) — The IDN-2 Hub slice, consuming the paired **FEAT-PC002** substrate (no migration of its own). The FEAT-H003 become-a-FIM CTA becomes a real **in-place transcendence**: from a Mist session, `/become-a-fim` collects credentials + an explicit consent, then the Hub **converts** the anonymous session to permanent (Supabase auth `updateUser`, preserving the same `auth.users.id`) and **finalises** through `POST /api/auth/transcend` → the `finalise_transcendence` RPC (atomic `is_temporary⇒false` + "FringeIsland Members" enrolment + consent write). `AuthContext` re-derives identity **Mist→FIM** (from `is_anonymous`) and the FIM lands on `/groups` with the **same `personal_group_id`** — continuity, nothing restarts (the Hub copies no rows; id-preservation is platform-side). Consent is a required, legible gate enforced client- **and** server-side (no consent → no conversion, no finalisation); a finalisation failure is surfaced with no `/groups` navigation (no half-FIM UI — the platform RPC rolls back). The **farewell** adds a Mist-only "say goodbye" affordance that confirms through the new **`ConfirmModal`** design-system primitive (never `confirm()`) and calls `POST /api/auth/farewell` → `explicit_erase_mist`, then signs out to the sessionless entry (a FIM is never offered it; the erase RPC refuses a non-Mist). V4 transcendence/farewell telemetry (failures included) + the Notifications welcome-trigger seam; both RPCs go through the API boundary, never the browser (ADR-U009). **Out (forward seams, not built):** the founding-questions assessment + the metamorphosis-completion gate (ball / Beyond), consent-withdrawal/history UI, and FIM self-service account-erasure. Green, all red-first: **27 new Jest unit + 4 new integration + 3 new Playwright E2E**; full suite **54 unit + 31 integration + 15 E2E**; lint + build clean. Process: FEAT-H004 → `6-done`, §L4 row + `features/README` updated, `TASK-H004-01..03`.
- **Hub v2 Phase-3 Identity — FEAT-H002 (credentialed FIM sign-up), `6-done`** (2026-06-25) — The first Phase-3 build area, reusing the FEAT-H001 spine (no re-scaffold). A new person creates an account (full name, email, password) behind an explicit consent gate; the flow posts to a real hub route (`POST /api/auth/signup`) that enforces consent **server-side**, performs the Supabase auth `signUp` (the narrow auth exception), and drives the existing `handle_new_user` trigger to materialise the FIM end-to-end — profile (non-null `personal_group_id`), personal group named after the nickname (first word of the display name), zero-permission "Myself" role, "FringeIsland Members" enrolment, `show_real_name=false`, and B-INV-001 pending-invite auto-claim. On success the client `setSession`s the returned tokens and lands authenticated on `/groups` (empty state for a brand-new FIM — GRP-4 lists only engagement groups). Begins the Phase-3 vertical binding: consent captured + `account.created` audited (V1) and sign-up telemetry (V4) — both **structured seams**, since `admin_audit_log` is admin-only and the PC-1 sink isn't realised yet (a member-facing audit RPC is net-new substrate, deferred). **No migration** — rides the existing substrate. Green: 8 Jest integration (3 new) + 9 Playwright E2E (4 new); lint + build clean. Process: FEAT-H002 → `6-done`, §L4 row updated, `TASK-H002-01..04`.
- **Hub v2 Phase-2 walking skeleton — FEAT-H001 (sign in → land on your groups), `6-done`** (2026-06-24) — The first v2 slice built fresh under `hub/` (ADR-U032), TDD test-first, proving the architecture spine end-to-end **DB → API → frontend** (ADR-U009). An existing FIM signs in (IDN-3 thin) and lands on `/groups`, whose list is fetched through `GET /api/groups` reading the conformant substrate via PC-3 (`get_current_personal_group_id()` → active `group_memberships` → engagement `groups`), RLS-scoped — no direct table calls from the frontend. Stands up the extracted design-system layer (`hub/components/ui/`), the auth-guarded shell, and a wired **seam for each vertical**: V1 audit (`/api/auth/audit`), V2 RLS-backed fetch, V3 notification-bell mount, V4 telemetry (sign-in + groups-load, failures included), V5 none. Green: 5 Jest integration + 5 Playwright E2E; lint + build clean. Process: FEAT-H001 → `6-done`, §L4 feature-inventory seeded, `TASK-H001-01..05`. Deep Privacy/GDPR + PC-4 audit / PC-1 telemetry binding deferred to Phase-3 Identity.
- **Way-of-working refactor — Session A: scope-expanded cleanup + sub-folder CLAUDE.md scaffolding** (2026-04-17) — Extends Session 1 with the work the original bridge deferred: root `CLAUDE.md` rewrite, scope-expanded sweep fixes, and the five sub-folder `CLAUDE.md` files the architecture has expected since Decision #7 (2026-04-09) but that were never authored. Closes the "CLAUDE.md erosion" concern: the skill now protects architectural scaffolding from being pruned as drift.
  - **Five sub-folder `CLAUDE.md` files authored** (`docs/products/`, `docs/platform/`, `docs/studios/`, `docs/design-system/`, `docs/verticals/`) — Each follows a locked delta-first skeleton: header metadata → What makes this tier different → Verticals obligations on this tier → Rules that only apply at this tier → Gotchas → Where to go next. The `docs/platform/CLAUDE.md` pre-existed as a 15-line stub (found during re-sweep after the initial MCP search tool missed it); rewritten to full skeleton. Target ~85 lines each; actual 7.4–9.3 KB. All ADR references verified against filesystem before writing. Verticals section is tier-specific, not boilerplate — each tier has genuinely different obligations under Administration / Privacy / Notifications / Observability / Transactions.
  - **Root `CLAUDE.md` rewritten for Model A** — Removed retired "Session Management" block (boot-up/close-down ritual), Sprint Agent handoff, `old_products/` + `old_implementation/` Document Map rows, pre-refactor version pin, "Doc Structure — In Transition" section. Added: 4-skill routing table, Model A framing, canonical context loading order pointing at the tier-level `CLAUDE.md` files, one-paragraph Five Verticals section with ADR-U002 reference, promotion of PROCESS.md to top of Document Map. Replaced hardcoded test/table/wave numbers with "check the source" guidance (those change; the routing file shouldn't carry a stale snapshot of them).
  - **Section 7 (Expected placeholders) added to `doc-health-check` skill** — 16-entry registry of architecturally-expected-but-not-yet-authored files: `ECOSYSTEM_ROADMAP.md` (T3.5), `DEPENDENCIES.md` (T4.1), per-product and per-studio `DESCRIPTION.md` / `SPECIFICATION.md` / `ROADMAP.md` stubs. Procedure documents how Sections 3, 3.6, and 6 consult the registry before flagging findings. Prevents the erosion loop where each doc-health run would prune architectural scaffolding as drift. Validated on its own run — 10 scaffolding references correctly reclassified as "not drift" rather than "broken link."
  - **Memory entry #23 captured** — Records the discovered MCP `search_files` recursion blind spot (caused `docs/platform/CLAUDE.md` to be missed in the initial Step 1 sweep). Establishes the workaround protocol: use `list_directory` per subdirectory when coverage matters, or ask Stefan to run recursive `grep -r` / `find` / `Get-ChildItem -Recurse` in Claude Code and paste results. Captured so future Claude.ai sessions don't repeat the miss.
  - **Session A bridge + doc-health-check report** at `docs/planning/sessions/` — Execution log for the Session A work plus the CC-run doc-health-check output validating the refactor is internally consistent post-commit.

### Changed
- **`docs/README.md`** — Removed `old_universe/`, `old_products/`, `old_implementation/`, `old_INDEX.md` from the tree diagram. "Legacy Documentation" section rewritten: all three archived trees are now described as deleted with content migrated into the active trees, not as "source of truth pending migration."
- **`docs/planning/sessions/README.md`** — Full rewrite. Naming convention corrected from `YYYY-MM-DD-{topic}.md` to `YYYY-MM-DD_-_{TOPIC}.md` (matches the actual file convention). Dropped the 4-file curated index (had gone ~10× stale — 43+ session files existed) in favour of "directory listing is the canonical index" plus a short recent-highlights list that is cheap to keep fresh. Removed retired "Phase 4" language.
- **`docs/templates/domain-service-spec.md`** — Fixed stale path reference: `SESSION-BRIDGE-2026-04-10.md` → `2026-04-10_-_SESSION-BRIDGE.md` (matches the actual session file naming convention).
- **`docs/planning/PROCESS.md` footer** — Removed retired "Phase 2 of the doc restructure / restructure phase status" framing. Now references the 2026-04-17 refactor session bridge as the current state marker.
- **Five vertical spec scaffolds** (`docs/verticals/administration.md`, `privacy.md`, `notifications.md`, `observability.md`, `transactions.md`) — Cleaned of retired "Phase 3 scaffold / Phase 4 fill-in" language across the Status line, §5 Tooling bullets, §6 Failure modes placeholder, and the footer. Status now reads `Draft (scaffold — Ferd)`; pending items are described as "to be designed" / "to be refined as the tooling matures"; footer reframes the spec as a living document amended via `type:process` work items (per PROCESS.md §8). The one `../old_implementation/` directive reference (in `administration.md` §3) was cut; replacement guidance points at the live codebase.
- **`docs/architecture/ARCHITECTURE_ANATOMY_V1.md` Related Documents table** (CC-applied fix) — Three broken relative paths corrected (`../vision/VISION.md` → `../ecosystem/VISION.md`, `../vision/MANIFESTO.md` → `../ecosystem/MANIFESTO.md`, `../strategy/CONTRIBUTION_ARCHITECTURE.md` → `../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md`). Three directive `old_implementation/` links struck-through with notes pointing at live sources. `../decisions/INDEX.md` (doesn't exist) changed to `./decisions/` directory reference.
- **`docs/planning/waves/FERD-CAPABILITY-MAP.md:174`** (CC-applied fix) — Retired "Phase 3" language in privacy capability row → "wave Ferd". Same drift class as the vertical spec cleanup, caught by CC's recursive grep where Stefan's Claude.ai MCP search missed it.
- **`docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md:177`** — Removed directive reference to `../../old_products/ferd/planning/DEFERRED.md` (archived tree deleted). Replaced with pointer to the 2026-04-07 wave-redistribution session bridge (the live record of the redistribution decisions). Fixed bonus broken path on the same line: `../decisions/` → `../../architecture/decisions/` for the ADR-U022 link.
- **`.claude/skills/doc-health-check/SKILL.md` intro paragraph** — Updated from "eight sections, three of which (1.5, 3.5, 3.6) catch drift" to "nine sections, with Section 7 added to protect architectural scaffolding from being pruned as drift." Also added a new blind spot to Known gaps / skill calibration: README index file-count lag (Section 3 checks every listed file exists but not every existing file is listed; a README can pass while being 10× stale).

### Added
- **Way-of-working refactor — Session 1: Tier 1 cleanup + Tier 2 structural additions** (2026-04-17) — Executes the action list from the 2026-04-17 way-of-working review. After this work, PROCESS.md and the skills layer are internally consistent under Model A (feature specs with embedded stories in the ecosystem tree; no separate PRDs). Preceded by the 2026-04-17 review session that locked the 11 decisions this work implements.
  - **New skill: `doc-health-check`** at `.claude/skills/doc-health-check/SKILL.md` — Six-section audit (terminology drift, schema drift, path + README sync, parked items, maturity consistency, entity coverage) with a defined output format. Fires at cycle boundaries per DECISION-10 and on-demand after cross-cutting changes. Structurally based on the old `docs/planning/workflows/DOC_HEALTH_CHECK.md` but fully reworked for the active tree only; all stale path references and Model B assumptions discarded.
  - **PROCESS.md §6.5 "Skills as the execution layer"** — New section between §6 and §7 explicitly names the four execution skills (`ecosystem-decomposition`, `feature-development`, `wave-planning`, `doc-health-check`), what each produces, when each fires, and where each lives. Includes a lifecycle diagram mapping the four skills to feature progression. Resolves the headline finding from the 2026-04-17 review (PROCESS.md and the skills no longer describe separate worlds unaware of each other).
  - **Four retrospective scales documented** in `docs/planning/retrospectives/README.md` — Weekly Three Ls (`weekly-YYYY-MM-DD.md`), cycle retro (`retro-YYYY-MM-DD.md`), wave retro (`retro-wave-{name}.md`), quarterly audit (`audit-YYYY-Q#.md`). All four scales use the same template (`docs/templates/retrospective.md`); scope determines depth, not structure.
  - **`parked: true` + `parked_reason` YAML frontmatter fields** documented on the feature-spec template — The icebox mechanism under Model A (DECISION-11). Any feature at any maturity can be parked via these optional YAML fields; maturity and parked are orthogonal; both fields must be set together when parking; a single grep returns the full icebox across the ecosystem.
  - **Tech-debt allocation guideline** in PROCESS.md §3 cycle-boundary checklist — At least one bet per cycle should be tech-debt / NFR / process unless the backlog genuinely contains none. Explicit "don't invent debt to meet a quota" caveat.
  - **Session bridge** at `docs/planning/sessions/2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md` documenting this session's execution log, including extra cleanup items caught during PROCESS.md scans (§3 "Deferred and cross-wave work" Model B remnants, §7 tag format references, §7 maturity tag value completeness).

### Changed
- **PROCESS.md rewritten for Model A** — The single canonical way-of-working document is now internally consistent with the actual working model (feature specs with embedded stories in the ecosystem tree; skills as the execution layer).
  - **§1 Work item lifecycle** — Visual flow and maturity table rewritten: all maturity levels 0–4 live in `docs/{owner}/features/FEAT-*.md` with YAML `maturity:` tracking state. Maturity 5 adds TASK-*.md files; maturity 6 updates the same spec with Implementation notes. New "Parking work (the icebox mechanism)" subsection documents the `parked` YAML flag per DECISION-11. Removed references to `backlog/discovery.md`, `backlog/product.md`, `backlog/icebox.md`, `cycles/cycle-current.md` as phantom locations for items.
  - **§2 Work item types** — `feature`, `nfr`, and `tech-debt` types all point at `../templates/feature-spec.md` (stories embedded inline). Removed PRD + user-story references. Added explanatory paragraph on why a single template covers three work item types.
  - **§3 Cadence** — Cycle-boundary checklist expanded: `doc-health-check` skill invocation added; tech-debt allocation guideline added; "Deferred and cross-wave work" rewritten to reference the `parked` YAML flag and feature specs instead of `backlog/icebox.md` and "backlog entry or PRD."
  - **§6 Document lifecycle** — Trigger-artifact map rewritten: PRD row replaced with feature-spec row (fires at maturity 0-raw or higher, not at maturity 3). Stale `cycles/retro-*.md` paths corrected to `retrospectives/retro-*.md` (matching the actual directory). Added explanatory paragraphs: a single feature spec covers maturity 0 through 6 (no separate PRD artifact); execution mechanics live in the skills (forward-reference to §6.5).
  - **§7 Backlog tagging** — Maturity tag values extended from `0-raw`…`4-ready` to the full canonical set `0-raw`…`6-done`. Tag format subsection rewritten: YAML frontmatter in feature specs is primary; the free-form tag line is for TASK-*.md files and session notes.
  - **§8 How this process evolves** — Quarterly audit now points at `retrospectives/audit-YYYY-Q#.md` using the retrospective template per DECISION-09.
  - **Quick reference** — Every bullet rewritten for Model A. "New idea" points to a feature spec at maturity 0-raw under the owner; `OPEN_QUESTIONS.md` as fallback for unclear ownership. "Park something" documents the `parked` YAML flag. New bullet added: "How does a feature actually get built day-to-day?" points at `feature-development` skill.
  - **Header link fixed** — `../architecture/ARCHITECTURE_ANATOMY.md` → `../architecture/ARCHITECTURE_ANATOMY_V1.md` (the file that actually exists after the April 12 archiving).
- **`docs/templates/feature-spec.md`** — Added optional `parked: true` + `parked_reason` frontmatter fields as commented-out entries with inline semantic notes (orthogonality of maturity and parked; both fields must be set together when parking).
- **`docs/templates/README.md`** — Removed `user-story.md` entries (directory listing + Index table row); updated `feature-spec.md` row to note stories are embedded inline. Template count: 16 → 15.
- **`docs/planning/README.md`** — Removed phantom `DEFERRAL_PROTOCOL.md` + `PLANNING_PROTOCOL.md` references (cross-check confirmed neither file ever existed on disk). Added explanatory paragraph noting that deferral is covered in PROCESS.md §3 and research-first discipline is built into the §1 maturity pipeline — no separate protocol files exist or are needed. Also updated backlog description ("ephemeral TASK-*.md files for the active cycle") and retrospectives description (all four scales).
- **`docs/planning/retrospectives/README.md`** — Full rewrite to document all four retro scales (weekly/cycle/wave/quarterly audit), all using the same template, with naming-pattern quick reference.

### Removed
- **`docs/templates/user-story.md`** — Orphaned after DECISION-01 locked Model A; no skill or active file referenced it (cross-check via grep + direct listing). Stories are now embedded inline in feature specs using Given/When/Then acceptance criteria.
- **`docs/planning/workflows/BOOT_UP.md`**, **`CLOSE_DOWN.md`**, **`DOC_HEALTH_CHECK.md`** (old), **`WORKFLOW.md`** — Four stale pre-restructure workflow files. Their functional replacements are the four skills under `.claude/skills/` (DECISION-02 + DECISION-03). The old `DOC_HEALTH_CHECK.md` was mined for structural content before deletion; the new skill at `.claude/skills/doc-health-check/SKILL.md` supersedes it with Model A path references and active-tree scoping. Cross-check confirmed no active file referenced any of the four paths before deletion. (The `docs/planning/workflows/` directory itself is now empty — pending decision on whether to remove it.)

### Added
- **Journey Designer Discovery Session 01** (2026-03-20) — Foundational conceptual session establishing vocabulary, cosmology, and data model concepts for the FringeIsland journey system.
  - **Traveler** defined as any entity capable of embarking on a journey — decoupled from user accounts
  - **The Whisp** (renamed from "Vessel") — each member's personal future self, inhabiting the Other Side. Dual nature: Encounter + Companion
  - **Whisperers** — collective name for all Whisps walking the Other Side
  - **Three Worlds** cosmology — Ordinary World, Safe Harbour (FringeIsland), The Other Side
  - **Four route types** — Fixed (curriculum), Hybrid (guided-adaptive), Traveler-Initiated (personal quest), AI-Generative (universe-driven)
  - **Universal step grammar** — Present → Ask → Change, operating at two levels: Nodes (waypoints) and Beats (atomic units)
  - **Six content families** — Witness, Reflect, Decide, Act, Encounter, Rest
  - **The Road** as first-class object between nodes — co-owned by designer (conditions) and universe (content)
  - **Encounter family** — two dimensions: Origin (planned/emergent/triggered) × Other (NPC/FIM/group/inner self/Whisp)
  - **Companion model** — Traveler + Companionship Record (consistent with Universal Group architecture)
  - **Pacing system** — node duration (4 types), road duration (3 modes), journey completion (4 triggers), journey states: active/paused/complete/integrated
  - **Session doc:** `docs/old_products/ferd/sessions/2026-03-20-JOURNEY_DESIGNER_SESSION.md`

### Changed
- **ROADMAP.md rewritten to v3.0** — Replaced obsolete Phase 1/2/3/4 model with Wave 1 (Ferd) / Wave 2 (Hamn) / Wave 3 / Wave 3+ framing per `PRODUCTS_AND_PLATFORM.md`. Ferd completion history preserved. Journey Designer positioned as central Wave 2 concern with Session 01 vocabulary integrated.
- **DEFERRED_DECISIONS.md updated to v1.5** — Added 4 items explicitly parked in Session 01: Seasons and Episodes, NPC behaviour authoring, Whisp practical UX, Three Worlds UI design. All deferred to Wave 2 (Hamn) specification sessions.

- **Journey Enrollment API Routes (ADR-009 compliance)** — Created API-first enrollment routes, refactored all frontend components to use them instead of direct Supabase access.
  - **`POST /api/v1/journeys/[id]/enroll`** — Enroll individual (personal group) or group in a journey. Validates auth, checks for duplicate enrollments, enforces `enroll_group_in_journey` permission via `has_permission()` for group enrollments. Returns 201 with enrollment record.
  - **`GET /api/v1/journeys/enrollments`** — Returns all active enrollments for the current user (individual + via group memberships). Includes journey details (title, description, difficulty, duration) and group name. Tags each enrollment as `individual` or `group`.
  - **`DELETE /api/v1/journeys/[id]/enroll`** — Unenroll from a journey (sets status to `paused`). Supports individual and group unenrollment with permission checks.
  - **Refactored:** `EnrollmentModal.tsx` — enrollment writes now go through POST API route instead of direct Supabase inserts.
  - **Refactored:** `app/journeys/[id]/page.tsx` — enrollment status check now uses GET enrollments API route.
  - **Refactored:** `app/my-journeys/page.tsx` — fetches all enrollments via GET API route instead of 3 direct Supabase queries.
  - All routes follow existing auth pattern: JWT Bearer token → service client → `has_permission()` RPC.

- **Sprint 4 — Platform Exit (v0.2.36)** — Admin-assisted cascade exit from all engagement groups + decommission.
  - **`admin_exit_user_from_platform(p_target_user_id)` RPC** — SECURITY DEFINER function iterates all active engagement group memberships for target user. Applies per-group logic: L1 (regular leave) for regular members, L2 (sole Steward → DeusEx handover) for sole Stewards, L3 (group closure) for last member. L4 nomination explicitly skipped (admin exit always uses L2). After all groups processed: user decommissioned (`is_decommissioned=true`, `is_active=false`), auth sessions deleted, audit log entry created.
  - **Safety guards:** Self-exit blocked, already-decommissioned users rejected, DeusEx members (platform admins) rejected, non-admin callers rejected.
  - **Admin UI:** "Exit Platform" button added to UserActionBar in the Account category. ConfirmModal with danger variant explains the cascade. `executeExitPlatform` handler processes per-user with error collection, broadcasts force-logout to connected clients.
  - **Migration:** `20260228144747_sprint4_platform_exit.sql`
  - **Behaviors:** B-EXIT-001 (Group Cascade), B-EXIT-002 (Decommission After Exit), B-EXIT-003 (Safety Guards), B-EXIT-004 (Audit Trail)
  - **Tests:** 10 new integration tests (4 safety guards + 1 no-groups + 3 single-group scenarios + 1 multi-group + 1 audit log)
  - **Full admin suite:** 106/106 tests passing, zero regressions
  - **ALL 5 LIFECYCLE SPRINTS COMPLETE** (S0→S1→S2→S3→S4)

- **Sprint 3 — Smart Notifications + Steward Nomination (v0.2.35)** — Actionable notification infrastructure and Track 1 stewardship nomination flow.
  - **F3: Smart notification schema** — 5 new columns on `notifications`: `action_type` (TEXT), `action_data` (JSONB), `action_taken` (TEXT), `action_taken_at` (TIMESTAMPTZ), `expires_at` (TIMESTAMPTZ). Consistency constraint: `action_taken` requires `action_type` to be set. Index on pending actions for efficient queries.
  - **F3-UI: Actionable notification UI** — `NotificationContext` updated with `handleAction()` method that calls `handle_notification_action` RPC. `NotificationBell` renders Accept/Decline buttons for smart notifications, shows loading spinners during action, displays "Accepted"/"Declined" badges for actioned notifications, and "Expired" badge for timed-out notifications. Auto-marks as read on action.
  - **F3-Handler: `handle_notification_action` RPC** — SECURITY DEFINER function validates ownership (recipient must match caller's personal group), actionability (must have `action_type`, no prior action), expiry check, and action validity per type. Dispatches type-specific side effects for `stewardship_nomination` type.
  - **L4: Stewardship nomination (Track 1)** — `nominate_steward(p_group_id, p_nominee_ids)` RPC allows sole Steward to nominate ranked successors. Sends smart notification to first nominee with 7-day expiry. On accept: nominee gets Steward role, original Steward removed from group (L1 flow). On decline: next nominee notified. If all decline: DeusEx fallback (L2 flow). Prevents self-nomination, non-member nomination, duplicate in-progress nominations.
  - **Internal helper:** `_handle_stewardship_nomination_action()` — handles accept (grant Steward, remove original member, freeze enrollments, notify group) and decline (advance to next nominee or DeusEx fallback).
  - **Migration:** `20260228125730_sprint3_smart_notifications.sql`
  - **Behaviors:** B-NOTIF-001 (Smart Notification Schema), B-NOTIF-002 (Actionable Notification UI), B-NOTIF-003 (Notification Action Handler), B-GRP-011 (Stewardship Nomination Track 1)
  - **Tests:** 19 new integration tests (11 smart-notifications + 8 stewardship-nomination)

- **Sprint 2 — Leave Group Core (v0.2.34)** — Three leave-group scenarios implemented as a single `leave_group(p_group_id)` SECURITY DEFINER RPC.
  - **L1: Regular member leave** — Membership deleted, roles cascade-removed, non-public journey enrollments frozen (`status='frozen'`, `frozen_reason='left_group'` in progress_data), Steward(s) notified via existing `member_left` trigger. Public/platform journey enrollments unaffected. Forum posts show "Former Member" at query time (no data mutation).
  - **L2: Sole Steward → DeusEx handover** — DeusEx added as group member with Steward role (idempotent), pending invitations (`added_by_group_id`, `invited_by_group_id`) transferred to DeusEx, then L1 flow executes. Custom notifications: all members get `stewardship_transferred`, DeusEx gets `stewardship_required`.
  - **L3: Group closure (last member leaves)** — `groups.status` set to `'closed'`, all non-public journey enrollments frozen (`frozen_reason='group_closed'`), non-public journeys `created_by_group_id` transferred to DeusEx, DeusEx notified (`group_closed`) if orphaned journeys exist. Public journeys NOT transferred.
  - **Updated trigger:** `prevent_last_leader_removal()` now bypasses when `groups.status = 'closed'` (allows role cleanup on group closure).
  - **Validation:** Rejects non-engagement groups (personal/system), non-active groups, non-members.
  - **Migration:** `20260228120745_sprint2_leave_group_core.sql`
  - **Behaviors:** B-GRP-008 (Regular Member Leave), B-GRP-009 (Sole Steward DeusEx Handover), B-GRP-010 (Group Closure)
  - **Tests:** 17 new integration tests (7 L1 + 4 L2 + 6 L3)
  - **Full suite:** 630/630 tests passing, zero regressions

- **Sprint 1 — Foundation Schema (v0.2.33)** — Two infrastructure changes that enable leave-group lifecycle features (Sprint 2).
  - **F1: `groups.status` column** — New TEXT column with CHECK constraint (`active`, `closed`, `archived`, `suspended`). Default: `active`. Partial index `idx_groups_status_active` for common query path. Updated `groups_select` RLS policy: non-admin users only see `status = 'active'` groups, personal groups always visible, platform admins see all.
  - **F2: "FringeIsland Journeys" engagement group** — Created platform-owned engagement group. DeusEx added as member with Steward role. Re-seeded all 8 predefined journeys with `created_by_group_id` pointing to FI Journeys group (journeys were lost during D15 rebuild). `created_by_group_id` set to DeusEx to prevent globalTeardown orphan sweep.
  - **Migration:** `20260228111514_sprint1_foundation_schema.sql`
  - **Behaviors:** B-GRP-007 (Group Status Visibility), B-JRN-008 (Platform Journey Ownership)
  - **Tests:** 19 new integration tests (9 group-status + 10 platform-ownership)
  - **Full suite:** 504/504 tests passing, zero regressions

### Fixed
- **Sprint 0 — Security Fixes (v0.2.32)** — Fixed 4 security gaps identified in lifecycle roadmap analysis. Defense-in-depth: both RLS and UI enforcement for all fixes.
  - **S1: Non-public journey visibility (RLS)** — `journeys_select_published` now enforces `is_public`. Non-public journeys visible only to owning group members, enrolled users, or platform admins. New SECURITY DEFINER helper: `is_enrolled_in_journey()`.
  - **S2: Non-public journey enrollment gating (RLS)** — INSERT policies on `journey_enrollments` now validate `is_journey_enrollable()`. Non-members cannot enroll in non-public journeys via direct API. New SECURITY DEFINER helper: `is_journey_enrollable()`.
  - **S3: Frozen enrollment UI enforcement** — JourneyPlayer now detects `status = 'frozen'`, shows amber banner, blocks step completion, blocks navigation to unvisited steps, skips all progress writes. My Journeys shows "Review Steps" label and grey progress bar for frozen enrollments.
  - **S4: Frozen enrollment RLS enforcement** — `enrollment_update_own` and `enrollment_update_group` policies now include `AND status != 'frozen'` in USING clause. Only service_role (admin) can modify frozen enrollments.
  - **Migration:** `20260228102720_sprint0_security_fixes.sql`
  - **Behaviors:** B-SEC-001, B-SEC-002, B-SEC-003, B-SEC-004 (all verified)
  - **Tests:** 19 new security integration tests (10 journey-access + 9 frozen-enrollment)
  - **Full suite:** 485/485 tests passing, zero regressions

- **Personal group RLS visibility** — Other users' personal groups were invisible under the `groups_select` RLS policy, causing display names to show as "Unknown" across 6 surfaces (forum posts, DM list, conversation headers, group member list, invite modal). Added `group_type = 'personal'` condition to `groups_select` policy. Personal groups are identity containers (name + avatar) and are safe to expose to all authenticated users. Zero application code changes needed.
  - **Migration:** `20260227110556_fix_personal_group_rls_visibility.sql`
  - **Surfaces fixed:** ForumSection/ForumPost, messages page, conversation page, group detail member list, InviteMemberModal

### Added
- **Display Name / Nickname System** — Users can set a nickname and toggle between displaying their real name or nickname platform-wide. Personal group `name` is the single source of truth for display identity across all social surfaces (forums, messages, navigation, member lists). Real name visibility is opt-in (off by default). Admins always see real names.
  - **New columns on `users`:** `nickname` (TEXT NOT NULL), `display_preference` ('real_name' | 'nickname'), `show_real_name` (BOOLEAN, default false)
  - **New trigger:** `sync_personal_group_display_name()` — AFTER UPDATE on `users` keeps personal group name in sync with display preference
  - **Updated `handle_new_user()` trigger** — Sets nickname to first name, creates personal group with nickname (not full name)
  - **AuthContext expanded** — `UserProfile` now includes `nickname`, `display_preference`, `show_real_name`, `display_name` (resolved via personal group JOIN)
  - **All social surfaces migrated** — Navigation, Messages, Conversations, InviteMemberModal now resolve display names from personal group `name`
  - **InviteMemberModal search** now matches `nickname` + `full_name` + `email`; shows `full_name` only if `show_real_name = true`
  - **Profile edit page** — New fields: nickname, display preference radio buttons, show real name toggle, live preview
  - **28 new integration tests** — `display-name.test.ts` (16 tests) + `display-name-rls.test.ts` (12 tests) covering B-DISP-001 through B-DISP-011
  - **11 behavior specs** in `docs/specs/behaviors/display-name.md`
  - **Migration:** `20260227095615_add_display_name_system.sql`

### Added
- **Enhanced Member Invitations: User Search Typeahead** — InviteMemberModal now includes debounced typeahead search (300ms) that queries users by name or email, shows avatar + name + email in dropdown, and excludes current group members and self. Max 8 results.
- **Enhanced Member Invitations: Pending Email Invitations** — Stewards can now invite non-users by email. Creates `pending_email_invitations` record with 30-day expiration and UUID token. When the person signs up, `handle_new_user()` trigger auto-claims the invitation and creates a `group_memberships` row with `status='invited'`. Simulated email service (`lib/email/send.ts`) logs to console — swap one file for Resend/SendGrid later.
- **New table: `pending_email_invitations`** — Stores pending invitations for non-users with RLS policies using `has_permission('invite_members')`.
- **New API route: `/api/invitations/send-email`** — POST endpoint for sending simulated invitation emails, with JWT auth and permission validation.
- **14 new integration tests** — `pending-invitations.test.ts` (10 tests: RLS, storage, trigger auto-claim, expiration, case-insensitive matching) + `user-search.test.ts` (4 tests: name/email search, limit, no results).
- **2 new behavior specs** — B-GRP-006 (User Search Typeahead) in `groups.md`, B-INV-001 (Pending Email Invitations) in new `invitations.md`.

### Changed
- **InviteMemberModal refactored** — Two-flow modal: existing user (typeahead select → standard invite) vs non-user (email → pending invitation + simulated email). New `existingMemberGroupIds` prop for client-side member filtering.
- **`handle_new_user()` trigger updated** — Added Step 8: claims all non-expired pending email invitations matching the new user's email, creating `group_memberships` rows with `status='invited'`.

### Technical Details
- **Migration:** `20260223140126_enhanced_member_invitations.sql`
- **New files:** `lib/email/send.ts`, `app/api/invitations/send-email/route.ts`, `docs/specs/behaviors/invitations.md`, `docs/features/active/enhanced-member-invitations.md`
- **Modified:** `components/groups/InviteMemberModal.tsx`, `app/groups/[id]/page.tsx`

---

### Added
- **D15 Hardening: `personal_group_id` immutability trigger** — New `enforce_personal_group_id_immutability` trigger on `public.users` prevents UPDATE from changing or NULLing `personal_group_id` after it's set. Security invariant: personal group is the user's identity in the universal group pattern.
- **D15 Hardening: 10 new integration tests** — `personal_group_id` non-null after signup (1), immutability trigger protection (3), groups-join-groups with engagement group actors (4), Myself role zero permissions (2). Total RBAC tests: 162 → 171.
- **D15 Hardening: 5 behavior specs** — B-D15-001 through B-D15-005 documenting immutability, groups-join-groups, engagement group actors, Myself role permissions, and admin auth resolution chain.

### Changed
- **D15 Universal Group Pattern — Schema Rebuild** — Consolidated 71 incremental migrations into 5 clean migrations. Core change: `group_memberships.user_id` → `member_group_id` (group-to-group only). Every user represented by a personal group. Column renames across 10+ tables (`added_by_user_id` → `added_by_group_id`, `created_by_user_id` → `created_by_group_id`, etc.). Old migrations archived to `supabase/migrations/archive/`.
- **D15 Frontend Migration (28 steps)** — All 26 production files migrated to new column names and Universal Group Pattern. 36 files total including tests and types. "Group Leader" → "Steward" terminology throughout.
- **D15 Residual Fixes** — Fixed broken enrollment query in `AdminDataPanel.tsx` (dead `users!journey_enrollments_user_id_fkey` → `groups!journey_enrollments_group_id_fkey`). Fixed last-Steward UI protection in group detail page (`'Group Leader'` → `'Steward'`). Fixed stale UI text and comments.

### Fixed
- **Stale comments in test files** — Updated 7 comment locations across 4 test files to reflect D15 column renames (`user_id` → `member_group_id`, `added_by_user_id` → `added_by_group_id`, `author_user_id` → `author_group_id`) and terminology ("Group Leader" → "Steward", "Travel Guide" → "Guide"). Renamed `travelGuideRole` → `guideRole` variable in deletion tests.
- **Performance Tier 2A: Parallelized group detail page queries** — Refactored `fetchGroupData` in `app/groups/[id]/page.tsx`: eliminated 3 redundant queries (membership check, member count, current user roles — all derived from existing query results), parallelized remaining 4 queries into 2 `Promise.all` steps. Also parallelized `refetchMembers` (member profiles + roles fetched in parallel). Expected improvement: ~1.2s → ~300-400ms.
- **Performance Tier 2B: Fixed N+1 on My Groups page** — Created `get_group_member_counts` RPC function (SECURITY DEFINER, batch UUID array input). Refactored `app/groups/page.tsx`: replaced N individual count queries with single RPC call, parallelized group data + counts into one `Promise.all`. For 10 groups: 12 HTTP requests → 3 (2 parallel steps).
- **Performance Tier 3A: Debounced commonGroupCount** — Admin panel's common group count computation now uses 300ms debounce with proper cleanup, preventing rapid-fire queries during quick user selections.
- **Performance Tier 3B: Deduplicated admin stats** — Filter changes now only re-fetch users count (the only filter-dependent stat). Static stats (groups, journeys, enrollments) are cached after first load. Full refresh triggered only after admin actions.

### Planned
- Phase 1.6: Polish and Launch

---

## [0.2.28] - 2026-02-20

### Fixed
- **Realtime notification/messaging errors** — Added `notifications` table to `supabase_realtime` publication (was missing, causing CHANNEL_ERROR). Fixed unstable supabase client references in NotificationContext, MessagingContext, and ConversationPage using `useMemo`.
- **MessagingContext self-message recount** — Added sender_id check to skip recounting unread messages for the sender's own messages.
- **ConversationPage missing error callback** — Added error status handler to Realtime subscription.

### Added
- **Admin user filter toggles** — Three-toggle pill UI (Active, Inactive, Decommissioned) replacing single "Show decommissioned" checkbox. Default: Active + Inactive ON, Decommissioned OFF. Server-side PostgREST `.or()` filters with `and()` sub-conditions for accurate filtering.
- **Admin Select All / Select Page / Deselect All** — "Select All" fetches all matching user IDs via paginated API endpoint (`idsOnly=true`), batching in groups of 1000 to overcome Supabase row limit.
- **Auto force-logout on deactivate/decommission** — Both admin actions now call `admin_force_logout` RPC to invalidate existing JWT sessions immediately, closing the session continuity gap.

### Technical Details
- **Migration:** `20260220161033_add_notifications_to_realtime_publication.sql`
- **New exports:** `UserFilters`, `DEFAULT_USER_FILTERS`, `buildStatusFilterString()` in `lib/admin/user-filter.ts`
- **New API params:** `showActive`, `showInactive`, `idsOnly` on `/api/admin/users`
- **New function:** `queryAdminUserIds()` with batch pagination (1000/batch)
- **Unit tests:** 19 passing for user filter logic

---

## [0.2.27] - 2026-02-20

### Fixed
- **CRITICAL: Auth deadlock in Supabase SSR client** — Restructured AuthContext to resolve user profile in a separate `useEffect` instead of inside `onAuthStateChange`. The `@supabase/ssr` `createBrowserClient` holds an internal lock during auth state callbacks; making DB queries inside the callback caused the query to hang indefinitely, leaving `userProfile` null and all pages stuck on loading spinners.
- **Navigation null safety** — Added optional chaining for `full_name` access (`full_name?.charAt(0)`) and safe `alt` attribute on avatar Image component.
- **Admin API 401 on cookie-based auth** — AdminDataPanel now passes JWT via `Authorization: Bearer` header instead of relying on `@supabase/ssr` chunked cookie parsing, which the API route couldn't decode.

### Changed
- **Dropped admin SELECT RLS policies (Tier 2C)** — Removed `has_permission()` from SELECT policies on `users`, `group_memberships`, `user_group_roles`, and `groups` tables. Admin queries already use `service_role` API route (Tier 1B), so these policies were unnecessary and added latency to ALL authenticated queries. This is a hotfix that also completes Performance Tier 2C.
- **Simplified groups SELECT policy** — Reduced from 5 OR branches to 4 (removed `has_permission()` branch).

### Technical Details
- **Migration:** `20260220120833_hotfix_drop_admin_select_policies.sql`
- **Modified Files:** `AuthContext.tsx`, `Navigation.tsx`, `AdminDataPanel.tsx`
- **Root Cause:** `@supabase/ssr` `createBrowserClient` deadlocks when DB queries are made inside `onAuthStateChange` callbacks

---

## [0.2.26] - 2026-02-20

### Added
- **Performance Tier 1: Quick Wins** — system-wide responsiveness improvements
  - **Tier 1A: Database indexes** — 3 composite indexes for `has_permission()` and RLS optimization (`groups.group_type`, `group_memberships(group_id, user_id, status)`, `user_group_roles(user_id, group_id)`)
  - **Tier 1B: Admin service_role API route** — `/api/admin/users` bypasses RLS entirely using service_role key; JWT validation + admin authorization at route level; 11 TDD integration tests
  - **Tier 1C: Shared UserProfile context** — AuthContext resolves `auth_user_id → users.id` once after login; 20+ files refactored to use shared `userProfile` context; eliminates 4-6 duplicate HTTP requests per page load

### Changed
- **AuthContext** (`lib/auth/AuthContext.tsx`) — added `userProfile` state, `resolveProfile` callback, `refreshProfile` function
- **AdminDataPanel** — users panel now fetches via `/api/admin/users` API route instead of client-side Supabase query
- **20+ page/component files** — migrated from per-component `userData` resolution to shared `userProfile` from `useAuth()`

### Technical Details
- **New Files:** 4 (`admin-users-query.ts`, `app/api/admin/users/route.ts`, `admin-users-api.test.ts`, `add_performance_indexes.sql`)
- **Modified Files:** 25 (AuthContext, Navigation, 15+ pages, 5+ components)
- **Test Coverage:** 517 total (414 integration + 99 unit + 4 setup), all passing
- **Migration:** `20260220103052_add_performance_indexes.sql`

---

## [0.2.25] - 2026-02-20

### Added
- **Admin Sub-Sprint 3C: Wire Actions (UI)** — all 10 admin action buttons fully functional
  - **NotifyModal** (`components/admin/NotifyModal.tsx`) — title + message form, calls `admin_send_notification` RPC
  - **MessageModal** (`components/admin/MessageModal.tsx`) — DM compose form, find-or-create conversation per user, audit log with `user_count`
  - **GroupPickerModal** (`components/admin/GroupPickerModal.tsx`) — searchable engagement group picker with 3 modes (invite/join/remove), intersection filtering for remove mode
  - **ConfirmModal integration** — deactivate (warning), decommission (danger), hard delete (danger), force logout (warning), join group (warning), remove from group (danger)
  - **Status message banner** — auto-clearing success/error messages (5s timeout, dismiss button)
  - **Action-in-progress overlay** — prevents double-clicks during async operations
  - **Data refresh pattern** — `refreshTrigger` prop on AdminDataPanel forces re-fetch after mutations
  - **Common group count computation** — real-time intersection query for Remove button enablement

### Changed
- **Admin page** (`app/admin/page.tsx`) — fully wired `handleAction` with all 10 action cases; added `useAuth`, modals, execute functions, audit logging
- **AdminDataPanel** — added `refreshTrigger` prop for parent-triggered re-fetch

### Technical Details
- **New Files:** 3 (`NotifyModal.tsx`, `MessageModal.tsx`, `GroupPickerModal.tsx`)
- **Modified Files:** 2 (`app/admin/page.tsx`, `components/admin/AdminDataPanel.tsx`)
- **Test Coverage:** 506 total (403 integration + 99 unit + 4 setup), all passing (1 pre-existing flaky timeout)
- **No new migrations** — all DB layer was completed in v0.2.24

---

## [0.2.23] - 2026-02-20

### Added
- **Admin Sub-Sprint 3B: UI Foundation** (selection model, action bar, dashboard refinements)
  - **Users Panel Selection** (B-ADMIN-013) — checkbox column, click-to-toggle, Shift+click range select, header checkbox, cross-page persistence, selection counter
  - **UserActionBar component** (B-ADMIN-014) — 10 action buttons in 3 groups (Communication/Account/Group), context-sensitive disabling with reasons, destructive action styling
  - **Pure function modules** in `lib/admin/`:
    - `user-filter.ts` — AdminUser type, filterUsers, computeUserCount, getUserStatLabel
    - `selection-model.ts` — toggleSelection, rangeSelect, selectAllVisible, deselectAllVisible, isAllVisibleSelected
    - `action-bar-logic.ts` — computeActionStates, isDestructiveAction, clearsSelectionAfterAction, ACTION_CATEGORIES
  - **99 unit tests** across 3 test suites in `tests/unit/admin/`

### Changed
- **Admin Dashboard** (B-ADMIN-002 revised) — stat card renamed "Active Users" to "Users"; count reflects filter state (active + inactive by default, decommissioned on toggle)
- **AdminDataPanel** — users panel shows `is_active`/`is_decommissioned` status badges (Active/Inactive/Decommissioned); "Show decommissioned" toggle; selected row highlighting; decommissioned rows visually muted

### Technical Details
- **New Files:** 4 (`lib/admin/user-filter.ts`, `lib/admin/selection-model.ts`, `lib/admin/action-bar-logic.ts`, `components/admin/UserActionBar.tsx`)
- **New Test Files:** 3 (`tests/unit/admin/user-filter.test.ts`, `tests/unit/admin/selection-model.test.ts`, `tests/unit/admin/action-bar-logic.test.ts`)
- **Modified Files:** 2 (`app/admin/page.tsx`, `components/admin/AdminDataPanel.tsx`)
- **Test Coverage:** 480 total (377 integration + 99 unit + 4 setup), all passing

---

## [0.2.20] - 2026-02-16

### Added
- **Group deletion notifications** — BEFORE DELETE trigger on `groups` notifies all active members (except the deleter) with group name pre-rendered in body
- **Auto-assign Member role on invitation acceptance** — AFTER UPDATE trigger on `group_memberships` automatically assigns Member role when status changes from 'invited' to 'active'
- **`can_assign_role()` DB function** — anti-escalation enforcement at RLS level; user must hold `assign_roles` permission AND every permission on the target role
- **`is_group_creator()` SECURITY DEFINER helper** — avoids nested RLS when checking group creator in policies
- **Bootstrap case for group_roles INSERT** — group creator can create roles when no Steward exists yet (chicken-and-egg fix)
- **Permissions SELECT policy** — authenticated users can now read the `permissions` catalog table
- **Backfill Member role for existing groups** — ensures all active engagement group members have the Member role

### Changed
- **`user_group_roles` RLS policies** — replaced `is_active_group_leader()` with `has_permission('assign_roles')` + `can_assign_role()` anti-escalation
- **`copy_template_permissions_on_role_create()` trigger** — now SECURITY DEFINER to bypass RLS during group creation bootstrap
- **AssignRoleModal** — added `userPermissions` prop; filters out roles the user can't assign (anti-escalation at UI level)
- **RoleFormModal** — added self-lockout warning when removing `manage_roles`/`assign_roles` from own role; warning in footer area (always visible)
- **NotificationBell** — notifications no longer navigate anywhere; clicks only mark as read; unread notifications sorted first in dropdown
- **GroupCreateForm** — improved error handling and retry logic for role creation during bootstrap
- **RoleManagementSection** — passes user permissions to AssignRoleModal; improved refresh after role changes
- **Invitations page** — removed client-side Member role assignment (now handled by DB trigger)

### Fixed
- **Agnes 403 on role assignment** — RLS INSERT policy on `user_group_roles` was using pre-RBAC `is_active_group_leader()` check
- **New members missing roles after invitation acceptance** — client-side role assignment blocked by RLS; moved to DB trigger
- **Group creation 403 on group_roles** — bootstrap chicken-and-egg: creator had no `manage_roles` permission during initial setup
- **Template permission copy failing during bootstrap** — trigger function was not SECURITY DEFINER
- **Orphaned groups with no roles** — groups created before bootstrap fix had no Steward/Member roles; backfilled
- **Notification 404 on deleted groups** — clicking "Group Deleted" notification navigated to non-existent group page
- **Notification badge count mismatch** — unread notifications hidden below dropdown fold; fixed by sorting unread first

### Technical Details
- **New Migrations:** 9 (permissions SELECT policy, member role backfill, user_group_roles RLS, auto-assign trigger, missing member roles backfill, bootstrap INSERT fix, template permissions SECURITY DEFINER, orphaned groups backfill, group deletion notifications)
- **Modified Components:** 9 (AssignRoleModal, RoleFormModal, RoleManagementSection, PermissionPicker, NotificationBell, GroupCreateForm, group detail page, groups page, invitations page)
- **New DB Functions:** 3 (`can_assign_role`, `is_group_creator`, `notify_group_deleted`)
- **New DB Triggers:** 2 (`assign_member_role_on_accept`, `notify_group_deleted`)

---

## [0.2.19] - 2026-02-16

### Added
- **RBAC Sub-Sprint 4: Role Management** (manage_roles permission, RLS policies, UI components)
  - `manage_roles` permission added to catalog (total now 42 permissions)
  - `description` column on `group_roles` table
  - `manage_roles` backfilled to Steward role template (now 25 permissions) and all existing Steward instances
  - `manage_roles` added to Deusex system role (now 42 permissions)
  - Two SECURITY DEFINER helpers: `get_group_id_for_role()`, `get_permission_name()` (bypass nested RLS)
  - `RoleManagementSection` component — lists group roles with create/edit/delete buttons
  - `RoleFormModal` component — create/edit role modal with name, description, and permission picker
  - `PermissionPicker` component — category-grouped checkbox UI with anti-escalation enforcement
  - **B-RBAC-018 through B-RBAC-025 behavior specs** — role management behaviors
  - **47 integration tests** for role management (`tests/integration/rbac/role-management.test.ts`)

### Changed
- `prevent_last_leader_removal` trigger — now checks `created_from_role_template_id` instead of role name (safe against role renaming)
- RLS policies on `group_roles` — replaced `created_by_user_id` checks with `has_permission('manage_roles')`
- RLS policies on `group_role_permissions` — `manage_roles` + anti-escalation (must hold permission being granted)
- Group detail page — added Roles section (gated by `manage_roles` permission)

### Technical Details
- **New Migrations:** 2 (`20260216140506_rbac_role_management.sql`, `20260216140740_rbac_role_management_fix_nested_rls.sql`)
- **New Components:** 3 (`RoleManagementSection`, `RoleFormModal`, `PermissionPicker`)
- **Test Status:** 319/319 passing (47 new + 272 existing, zero regressions, 2x QA runs)
- **Security Review:** Anti-escalation enforced at RLS level; template roles cannot be deleted; nested RLS solved with SECURITY DEFINER helpers

---

## [0.2.18] - 2026-02-16

### Changed
- **RBAC Sub-Sprint 3: UI Migration** (isLeader → hasPermission across all components)
  - `app/groups/[id]/page.tsx` — replaced `isLeader` boolean with `usePermissions(groupId)` hook; 6 UI gates now use specific permissions (`edit_group_settings`, `view_member_list`, `remove_roles`, `assign_roles`, `invite_members`)
  - `app/groups/[id]/edit/page.tsx` — replaced `isLeader` with `hasPermission('edit_group_settings')`; added `hasPermission('delete_group')` gate on Danger Zone
  - `ForumSection.tsx` — removed `isLeader` prop, added internal `usePermissions(groupId)` hook, passes `hasPermission('moderate_forum')` as `canModerate`
  - `ForumPost.tsx` + `ForumReplyList.tsx` — renamed `isLeader` prop to `canModerate`
  - `EnrollmentModal.tsx` — replaced `group_roles.name = 'Group Leader'` query with `has_permission` RPC checking `enroll_group_in_journey`

### Added
- **B-RBAC-013 through B-RBAC-017 behavior specs** — UI permission gating behaviors
- **34 integration tests** for UI permission gating (`tests/integration/rbac/ui-permission-gating.test.ts`)
- **Updated DEFERRED_DECISIONS.md** — resolved 6 stale entries (Permission Inheritance, Group-to-Group, Subgroups, Notifications, Forum, DM)

### Technical Details
- **Files Modified:** 6 UI components (no database changes)
- **Test Status:** 272/272 passing (34 new + 238 existing, zero regressions)
- **Security Review:** Fail-closed behavior confirmed; loading states prevent unauthorized content flash

---

## [0.2.17] - 2026-02-16

### Added
- **RBAC Sub-Sprint 2: Permission Resolution** (has_permission + usePermissions hook)
  - `has_permission(p_user_id, p_group_id, p_permission_name)` SQL function — two-tier resolution (system groups always active + context group scoped)
  - `get_user_permissions(p_user_id, p_group_id)` SQL function — batch fetch returning deduplicated TEXT[] array
  - `usePermissions(groupId)` React hook — fetches permission set, provides synchronous `hasPermission()` lookup
  - Both SQL functions: SECURITY DEFINER, search_path='', fail closed (NULL→false)
  - Short-circuit optimization: system group match returns immediately without checking context group
- **B-RBAC-008 through B-RBAC-012 behavior specs** — `docs/specs/behaviors/rbac.md`
- **24 integration tests** for permission resolution (engagement group, system group, edge cases, Deusex all-permissions)

### Technical Details
- **New Migration:** 1 (`20260216111905_rbac_permission_resolution.sql`)
- **New Functions:** 2 (`has_permission`, `get_user_permissions`)
- **New Files:** 4 (migration, usePermissions hook, 2 test suites, session log)
- **Test Status:** 238/238 passing (24 new + 214 existing, zero regressions)

---

## [0.2.16] - 2026-02-16

### Added
- **RBAC Sub-Sprint 1: Schema Foundation**
  - `group_type` column on groups (system/personal/engagement)
  - Personal group creation on signup (handle_new_user extended)
  - 3 system groups: FI Members, Visitor, Deusex (with roles and permissions)
  - Role template permissions (57 rows across 4 templates)
  - `copy_template_permissions` trigger for automatic permission initialization
  - Role renaming: Group Leader→Steward, Travel Guide→Guide
- **B-RBAC-001 through B-RBAC-007 behavior specs**
- **57 integration tests** for RBAC schema foundation

### Technical Details
- **New Migrations:** 4 (schema+permissions, system groups, personal groups+rename, reference rename)
- **Test Status:** 218/218 passing (57 new + 161 existing)

---

## [0.2.15] - 2026-02-15

### Added
- **Direct Messaging System** (Phase 1.5-B complete)
  - `conversations` table: 1:1 user pairs with sorted participant IDs, unique constraint, per-participant read tracking
  - `direct_messages` table: immutable messages with content validation, sender enforcement via RLS
  - `is_conversation_participant()` SECURITY DEFINER helper for RLS policies
  - `can_update_conversation()` SECURITY DEFINER helper enforcing column-level update restrictions (own `last_read_at` only)
  - `update_conversation_last_message_at()` trigger keeps inbox sorted by most recent message
  - `notify_new_direct_message()` trigger creates notification for recipient (not sender) with message preview
  - 5 RLS policies: conversations SELECT/INSERT/UPDATE, direct_messages SELECT/INSERT
  - Realtime publication for both tables (live message delivery)
- **Messages Inbox** (`/messages`) — conversation list with unread indicators, last message preview, time formatting
- **Conversation View** (`/messages/[conversationId]`) — real-time chat with auto-read marking, optimistic message display
- **MessagingContext** — global provider for unread conversation count, Realtime subscription, visibility change refresh
- **"Message" button** on group member list — find-or-create conversation, navigate to chat
- **Notification routing** — `new_direct_message` notifications route to `/messages/{conversationId}`
- **B-MSG-001 through B-MSG-006 behavior specs** — `docs/specs/behaviors/messaging.md`
- **19 integration tests** for direct messaging (send, privacy/RLS, uniqueness, inbox, notifications, read tracking)

### Technical Details
- **New Migration:** 1 (`20260215134017_add_direct_messaging.sql`)
- **New Tables:** 2 (`conversations`, `direct_messages`)
- **New Functions:** 4 (`is_conversation_participant`, `can_update_conversation`, `update_conversation_last_message_at`, `notify_new_direct_message`)
- **New Files:** 5 (migration, MessagingContext, messages page, conversation page, messaging behavior specs)
- **Modified Files:** 4 (layout.tsx, Navigation.tsx, NotificationBell.tsx, group detail page)
- **Test Status:** 157/157 passing (19 new messaging tests + 138 existing)

---

## [0.2.14] - 2026-02-14

### Added
- **Notification System + Group Forum** (Phase 1.5-A complete)
- See commit `ec4bd66` for full details

---

## [0.2.13] - 2026-02-11

### Added
- **B-ROL-001, B-ROL-002, B-ROL-003 behavior specs** — `docs/specs/behaviors/roles.md` fully documented
  - B-ROL-001: Role Assignment Permissions (INSERT/DELETE RLS, bootstrap, helpers)
  - B-ROL-002: Role Template Initialization (group creation flow, partial-impl note)
  - B-ROL-003: Role Visibility Rules (SELECT policy on `user_group_roles`)
- **`role-assignment.test.ts`** — 8 integration tests covering B-ROL-001 (INSERT side) and B-ROL-003 (SELECT side) with authenticated clients; previously these were untested
- **`scripts/delete-groups-admin.js`** — admin utility to safely delete groups by owner email (dry-run + delete modes)

### Fixed
- **Dev dashboard: Phase timeline** — Phase 1.4 was missing; Phase 1.5 was falsely shown as complete. Root cause: regex patterns in `roadmap-parser.ts` weren't anchored to `### Phase X.Y:` headings. Fixed with a 300-char headed window approach.
- **Dev dashboard: Test stats** — Tests showed 0% (0:0). Root cause: regex expected `tests (N passing` format but `PROJECT_STATUS.md` uses `tests, **N/N passing**`. Fixed with dual-format regex.
- **Documentation count errors** — Corrected behavior count (21→20), migration count (29→33 files), test count (110→118) in `PROJECT_STATUS.md` and `groups.md`

### Security
- **`SET search_path = ''` applied to all 9 public functions** — resolves all 9 Supabase Security Advisor "Function Search Path Mutable" warnings
  - `get_current_user_profile_id`, `get_current_role`, `is_group_leader`, `is_active_group_leader`, `is_active_group_member_for_enrollment`, `group_has_leader`, `update_updated_at_column`, `validate_user_group_role`, `prevent_last_leader_removal`
  - All table references fully qualified with `public.` prefix inside function bodies

### Technical Details
- **New Migration:** 1 (`20260211192415_fix_function_search_path.sql`)
- **New Files:** 4 (migration, roles.md, role-assignment.test.ts, delete-groups-admin.js)
- **Modified Files:** 4 (roadmap-parser.ts, parsers.ts, PROJECT_STATUS.md, groups.md)
- **Test Status:** 118/118 passing ✅

---

## [0.2.12] - 2026-02-11

### Added
- **Group Deletion** (B-GRP-005 complete)
  - "Danger Zone" section in `/groups/[id]/edit` with confirmation modal
  - DELETE RLS policy on `groups` table: Group Leaders can delete their groups
  - Cascade deletes: memberships, roles, role assignments, enrollments all removed
- **Catalog Table RLS Policies** — `group_templates`, `role_templates`, `role_template_permissions`, `group_template_roles` now have SELECT policies for authenticated users (were silently blocking all reads)
- `scripts/apply-migration-temp.js` — reliable migration application via Supabase management API (bypasses CLI tracking issues)

### Fixed
- **Group creation end-to-end** — Three cascading RLS gaps that prevented group creation:
  1. `group_memberships`: no INSERT policy allowed `status='active'` (bootstrap case missing) → added "Group creator can join their own group"
  2. `role_templates`: 406 Not Acceptable — no SELECT policy → added USING(true) policy
  3. `group_templates`: empty dropdown — same missing SELECT policy → fixed
- **Role assignment 403** — `user_group_roles` INSERT policy was a placeholder (self-assign only since Jan 25); replaced with proper Group Leaders policy + bootstrap self-assign when no leader exists yet
- **Role removal silently failing** — no DELETE policy existed on `user_group_roles`; added Group Leaders can remove roles
- **Group cascade delete blocked** — `prevent_last_leader_removal` trigger fired during CASCADE delete of a group, blocking it; fixed with early return when group no longer exists
- **B-AUTH-002 inactive user blocking** — `AuthContext.signIn()` now queries `users.is_active` after successful auth; auto signs out and throws if profile is inactive/blocked
- **Migration tracking** — `scripts/apply-migration-temp.js` established as canonical approach for applying migrations when `db push` fails due to date-only version conflicts

### Security
- `group_has_leader()` SECURITY DEFINER helper — avoids self-referential RLS recursion when checking if a group has a leader from inside an INSERT policy
- Bootstrap INSERT policies now properly scoped: only the group creator can self-add, only when preconditions are met

### Technical Details
- **New Migrations:** 4 (`20260211181225`, `20260211182333`, `20260211183334`, `20260211183842`)
- **New Files:** 5 (4 migrations + apply-migration-temp.js)
- **Modified Files:** 4 (edit page, deletion test, AuthContext, signin test)
- **Test Status:** 110/110 passing ✅

---

## [0.2.11] - 2026-02-10

### Added
- **Journey Player** — Full step-by-step content delivery system at `/journeys/[id]/play`
  - `ProgressBar` component: reusable progress indicator (blue → green at 100%)
  - `StepSidebar` component: step list with ✅/⬤/○ indicators, locked future steps, progress summary
  - `StepContent` component: renders step description, instructions, and type-aware action button
  - `JourneyPlayer` component: orchestrates navigation, progress saving, completion detection, review mode
  - Step navigation with Previous / Next buttons and sticky footer
  - Required-step completion gating (can't advance past required step without completing)
  - Progress saved to `journey_enrollments.progress_data` JSONB on every action
  - Resume from last position (`current_step_id` in progress_data)
  - Completion detection: marks enrollment `status: 'completed'` when all required steps done
  - Review mode for completed journeys (free navigation, no gating)
  - Unenrolled users redirected back to journey detail page
- **My Journeys Improvements**
  - "Continue" button now navigates to `/journeys/[id]/play` (was `/my-journeys`)
  - Smart button labels: Start / Continue / Review based on progress state
  - In-progress bar showing completed steps vs. total steps
- **Testing Infrastructure Improvements**
  - `tests/integration/suite-setup.ts`: global delay injection (`beforeAll` 2s + `beforeEach` 800ms)
  - `signInWithRetry` helper in `tests/helpers/supabase.ts` with exponential backoff
  - 4 domain-split test scripts: `test:integration:auth`, `test:integration:groups`, `test:integration:journeys`, `test:integration:rls`

### Changed
- `lib/types/journey.ts`: Added `JourneyProgressData`, `StepProgressEntry`, `PlayerEnrollment` interfaces; extended `JourneyStep` with `description`/`instructions` fields; `JourneyEnrollment.progress_data` now typed as `JourneyProgressData`
- `app/journeys/[id]/page.tsx`: Enrolled button now links to `/play` with label "Start Journey"
- `jest.config.js`: Added `suite-setup.ts` to integration project's `setupFilesAfterEnv`
- `package.json`: Added 4 domain-split `test:integration:*` scripts

### Fixed
- Integration test flakiness: 12/90 tests were failing randomly due to Supabase auth rate limiting causing silent sign-in failures → unauthenticated queries → RLS blocks → cascading null results. Fixed with inter-test delays.
- My Journeys group name display bug (`enrollment.group.name` was `(enrollment as any).groups.name`)

### Technical Details
- **Phase 1.4 Progress**: 85% → 100% complete ✅
- **New Files**: 6 (4 components, 1 page, 1 test setup)
- **Modified Files**: 6 (types, 2 pages, jest config, package.json, test helpers)
- **Test Status**: 90/90 passing (stable, verified on multiple consecutive runs)

---

## [0.2.10] - 2026-01-31

### Added
- **Journey Enrollment System** (Phase 1.4 Part 2 - Complete)
  - EnrollmentModal component (`components/journeys/EnrollmentModal.tsx`)
    - Two enrollment types: Individual or Group
    - Group enrollment restricted to Group Leaders
    - Fetches user's leader groups dynamically
    - Validates existing enrollments before submission
    - Beautiful modal UI with success state
  - My Journeys page (`/my-journeys`)
    - Two tabs: "Individual Journeys" and "Group Journeys"
    - Journey cards with status badges (active, completed, paused, frozen)
    - Difficulty badges and duration display
    - Empty states with "Browse Catalog" CTAs
    - Continue/Review buttons for each journey
  - Journey Detail Page Updates
    - Checks enrollment status (individual OR group)
    - Dynamic enrollment buttons based on status:
      - Not enrolled: "Enroll in Journey" (opens modal)
      - Enrolled individually: "View My Journeys" (green button)
      - Enrolled via group: "Enrolled via [Group Name]" (info badge)
    - Login redirect preserves journey URL
  - Navigation Updates
    - Added "My Journeys" link (📚) to global navigation
    - Active state handling for `/my-journeys` route
- **Database Migration** (`20260131_fix_journey_enrollment_rls.sql`)
  - Fixed infinite recursion in RLS policy
  - Removed nested enrollment check from database level
  - Dual enrollment prevention handled in application layer
- **TypeScript Types**
  - Added `EnrollmentWithJourney` interface for My Journeys page

### Changed
- Supabase query patterns updated to avoid `.in()` subquery issues
  - Fetch group IDs first, then use array in `.in()` method
  - Works around browser client limitations
- Data mapping for Supabase foreign key returns
  - Transforms plural (`journeys`, `groups`) to singular (`journey`, `group`)
  - Ensures component data structure consistency

### Fixed
- RLS policy infinite recursion error for journey enrollments
- Supabase query compatibility with browser client
- Navigation avatar image warning (added `sizes` prop)
- Journey data structure mismatch in My Journeys page

### Technical Details
- **Phase 1.4 Progress**: 75% → 85% complete
- **New Files**: 3 (EnrollmentModal, My Journeys page, RLS fix migration)
- **Modified Files**: 4 (Journey Detail page, Navigation, Journey types, My Journeys)
- **Business Rules Enforced**:
  - No dual enrollment (individual + group for same journey)
  - Only Group Leaders can enroll groups
  - Unlimited journey enrollments allowed
  - Enrollment status: active, completed, paused, frozen

---

## [0.2.9] - 2026-01-27

### Added
- **Error Handling System** (Complete implementation)
  - ErrorBoundary component (`components/ui/ErrorBoundary.tsx`)
  - Route error page (`app/error.tsx`) with "Try Again" functionality
  - Global error handler (`app/global-error.tsx`) for critical errors
  - Custom 404 page (`app/not-found.tsx`) with branded messaging
  - Integrated ErrorBoundary into root layout
  - Development mode shows detailed error information
  - Production mode shows user-friendly messages
  - Recovery options: "Try Again", "Go Home", "Reload App"

### Changed
- **Navigation Component** - Now displays for logged-out users
  - Shows "Sign In" and "Get Started" buttons on homepage
  - Consistent navigation UI across entire application
- **Homepage** - Removed duplicate navigation component
  - Cleaner code structure
  - Relies on global Navigation component

### Fixed
- Duplicate navigation code eliminated
- Improved error resilience across the app
- Better user experience when errors occur

### Technical Details
- Error boundaries catch component-level errors
- Next.js error pages handle route and global errors
- All error pages are client components
- Ready for error tracking service integration (Sentry, LogRocket, etc.)

---

## [0.2.8] - 2026-01-27

### Added
- **Journey System - Catalog & Browsing** (Phase 1.4 Part 1)
  - Journey catalog page (`/journeys`) with grid layout
  - Search functionality (title and description)
  - Filter by difficulty level (beginner, intermediate, advanced)
  - Filter by topic/tags
  - Results counter and clear filters option
  - Journey detail page (`/journeys/[id]`) with comprehensive layout:
    - Hero section with gradient background
    - Breadcrumb navigation
    - Two-tab interface (Overview and Curriculum)
    - Expandable step list with step details
    - Sticky sidebar with journey metadata
    - "Enroll in Journey" CTA button (placeholder)
- **Database Migration #9**: Seed 8 predefined journeys
  - Leadership Fundamentals (180 min, Beginner)
  - Effective Communication Skills (240 min, Beginner)
  - Building High-Performance Teams (300 min, Intermediate)
  - Personal Development Kickstart (150 min, Beginner)
  - Strategic Decision Making (270 min, Advanced)
  - Emotional Intelligence at Work (210 min, Intermediate)
  - Agile Team Collaboration (200 min, Intermediate)
  - Resilience and Stress Management (180 min, Beginner)
- **TypeScript Types**: Complete journey type definitions (`lib/types/journey.ts`)
  - Journey, JourneyContent, JourneyStep interfaces
  - JourneyEnrollment, JourneyFilters types
  - Type guards and utility types
- **Navigation Update**: Added "Journeys" link (🗺️) to global navigation bar

### Technical Details
- Migration file: `20260127_seed_predefined_journeys.sql` (uses first active user as creator)
- Journey content stored as JSONB with structured steps
- All journeys marked as published and public
- Responsive design works on mobile, tablet, and desktop
- Error handling for missing or unpublished journeys
- Loading states for async data fetching

### Implementation Stats
- **New Files**: 4 (migration, types, 2 pages)
- **Modified Files**: 1 (Navigation.tsx)
- **Lines of Code**: ~1200
- **Database Records**: 8 journeys with complete metadata and content

---

## [0.2.7] - 2026-01-26

### Added
- **Edit Group Page** (`/groups/[id]/edit`)
  - Edit group name, description, label
  - Toggle public/private visibility
  - Toggle show member list setting
  - Authorization check (Group Leaders only)
  - Responsive form with validation
- **Invite Member Modal Integration**
  - Connected InviteMemberModal to Edit Group page
  - "Invite Members" button on edit page
  - Modal shows member invitation form
  - Real-time invitation count updates

### Changed
- **Navigation Component**: Added invitation badge refresh on custom events
- **Edit Group Page**: Full implementation with all group settings

### Fixed
- Invitation count now updates when members are invited
- Navigation refreshes automatically after group changes

### Technical Details
- Phase 1.3 Group Management: 100% COMPLETE
- All core group management features implemented
- Ready for Phase 1.4: Journey System

---

## [0.2.6.2] - 2026-01-26

### Added
- **Role Assignment UI** (Complete implementation)
  - Promote member to Group Leader button
  - Assign/remove role modal (AssignRoleModal component)
  - Role badge display on member list
  - Multiple roles per member support
  - Last leader protection (cannot remove last leader)

### Changed
- Member list shows role badges for all assigned roles
- Role management integrated into group detail page
- State updates properly after role changes

### Fixed
- Last leader × button now completely hidden (not just disabled)
- Role state synchronization after changes
- isLeader state properly updated after role assignments

### Technical Details
- New component: `components/groups/AssignRoleModal.tsx`
- Updated: Group detail page with role management
- Full integration of role assignment with existing permissions

---

## [0.2.6.1] - 2026-01-26

### Fixed
- **AssignRoleModal**: Fixed role assignment logic
  - Now correctly checks for existing roles before adding
  - Prevents duplicate role assignments
  - Improved state management after role changes

---

## [0.2.6] - 2026-01-26

### Added
- **Role Assignment Modal** (Initial implementation)
  - Modal component for assigning/removing roles
  - Displays available roles for the group
  - Shows which roles member currently has
  - Assign/remove functionality
  - Database integration with user_group_roles table

### Changed
- Group detail page now includes "Assign Role" button for leaders
- Member state updates after role changes

### Technical Details
- New component: `components/groups/AssignRoleModal.tsx`
- Uses Supabase RPC or direct queries for role management

---

## [0.2.5] - 2026-01-26

### Added
- **Member Management System**
  - Invite members by email (stores as 'invited' status)
  - Accept/decline invitations (dedicated `/invitations` page)
  - Leave groups (with last leader protection)
  - Remove members (Group Leaders only)
  - InviteMemberModal component for email invitations
- **Global Navigation Bar**
  - `components/Navigation.tsx` with sticky header
  - Real-time invitation count badge
  - User avatar dropdown menu
  - Active route highlighting
  - Responsive design
- **Confirmation Modal System**
  - Reusable `ConfirmModal` component
  - Replaced all browser `alert()` and `confirm()` calls
  - Consistent UX for destructive actions
  - Custom titles and messages
- **Database Trigger**: Last leader protection
  - Prevents removing last Group Leader from a group
  - Migration #8: `20260126_last_leader_protection.sql`
  - Automatically reverts changes that would leave group without leader
- **New RLS Policies** (6 total):
  - View invitations policy
  - Accept invitations policy
  - Decline invitations policy
  - Leave groups policy
  - Remove members policy
  - Invite members policy

### Changed
- Replaced all `window.alert()` with ConfirmModal
- Replaced all `window.confirm()` with ConfirmModal
- Member status now includes 'invited' state
- Group detail page shows invitation status
- Invitation page shows pending invitations with accept/decline buttons

### Fixed
- Last leader can no longer be removed from group
- Member status transitions properly enforced
- Authorization checks for member management actions

### Technical Details
- Migration #8 added to prevent last leader removal
- Navigation uses Next.js Image component for avatars
- Real-time invitation count using Supabase count queries
- Modal system uses React portals for proper rendering

---

## [0.2.4] - 2026-01-25

### Added
- **Group Detail Page** (`/groups/[id]`)
  - Dynamic route for viewing individual group details
  - Shows group name, description, label, visibility settings
  - Member list with user avatars and names
  - Role display for each member
  - Group metadata (created date, member count)
  - Breadcrumb navigation (Groups > Group Name)
  - Responsive card-based layout

### Changed
- Groups page now links to individual group detail pages
- Improved group card UI with hover effects

### Technical Details
- Fetches group data with member information from Supabase
- Uses Next.js dynamic routing with `[id]` parameter
- Displays user avatars from Supabase Storage
- Shows role information from user_group_roles junction table

---

## [0.2.3] - 2026-01-25

### Added
- **Group Creation Page** (`/groups/create`)
  - Form to create new groups
  - Select from group templates
  - Set group name, description, and label
  - Configure visibility (public/private)
  - Configure member list visibility
  - Automatic Group Leader role assignment
- **Groups List Page** (`/groups`)
  - View all groups user belongs to
  - Filter by user's groups
  - Create new group button
  - Group cards with metadata
- **RLS Policies**: Group creation and viewing
  - Users can create groups
  - Users can view groups they belong to
  - Group creators automatically get Group Leader role

### Changed
- Default landing page after login: `/groups` (not `/profile`)
- Navigation structure updated to prioritize groups

### Technical Details
- Creates group with selected template
- Automatically creates default roles from template
- Assigns creator as Group Leader
- Uses Supabase RLS for authorization
- Responsive design with Tailwind CSS

---

## [0.2.2] - 2026-01-25

### Added
- **User Profile Editing** (`/profile/edit`)
  - Edit full name
  - Edit bio
  - Update profile data
  - Validation and error handling
- **Avatar Upload**
  - Upload profile pictures to Supabase Storage
  - Image preview before upload
  - Automatic resize/optimization
  - Stored in `avatars` bucket
  - URL saved in `users.avatar_url`
- **Enhanced Profile Page** (`/profile`)
  - Display avatar (or initials if no avatar)
  - Show full name and bio
  - Edit profile button
  - User metadata display
  - Improved layout and styling

### Technical Details
- Supabase Storage bucket: `avatars` (public, 2MB limit)
- Avatar upload uses `createClient` from client-side
- Image handling with browser FileReader API
- Profile updates use optimistic UI patterns
- Soft delete preserves avatar URLs

---

## [0.2.1] - 2026-01-24

### Fixed
- **Supabase Integration**: Verified database connection working
- **Environment Variables**: Confirmed `.env.local` properly configured
- **Build Process**: Ensured Next.js builds successfully
- **TypeScript**: Resolved any type errors

### Technical Details
- Database connection tested and verified
- All Supabase client/server utilities working correctly
- Ready for feature development

---

## [0.2.0] - 2026-01-23

### Added
- **Complete Authentication System**: Full Supabase Auth integration
  - User registration (signup) with email, password, and display name
  - User login with email/password authentication
  - User logout functionality
  - Session management with automatic persistence
  - Protected routes (profile page with redirect logic)
  - Auth context (`AuthContext`) for global state management
  - `useAuth()` hook for accessing auth state in components
- **Auth UI Components**:
  - Reusable `AuthForm` component for login and signup
  - Login page at `/login` route
  - Signup page at `/signup` route
  - Profile page at `/profile` route (protected)
  - Updated homepage with auth-aware navigation
- **Database Triggers for User Lifecycle**:
  - Automatic user profile creation trigger on signup
  - Soft delete trigger when user account is deleted
  - Users marked as `is_active = false` instead of hard deletion
- **Database Schema Fixes**:
  - Fixed user creation trigger to use `full_name` column (not `display_name`)
  - Changed `users.auth_user_id` constraint from CASCADE to SET NULL
  - Changed related table constraints to RESTRICT for data integrity
- **Security Enhancements**:
  - Enabled Row Level Security (RLS) on users table
  - Added RLS policies for user data access (view and update own profile)
  - Users can only access their own profile data
- **Documentation**:
  - Complete authentication implementation guide
  - Migration file: `20260123_fix_user_trigger_and_rls.sql`

### Changed
- Updated `app/layout.tsx` to wrap app with AuthProvider
- Modified homepage to show different content for logged-in vs logged-out users
- Profile page now fetches and displays user data from database

### Fixed
- User creation trigger now correctly handles `full_name` field
- Soft delete properly preserves user data instead of deleting records
- Auth state management prevents race conditions during page loads

### Technical Details
- Authentication: Supabase Auth with email/password
- Session: Stored in browser, auto-refreshes on page load
- Database: PostgreSQL with RLS policies enforced
- Phase: Authentication ✅ Complete (Phase 2 - 20%)

---

## [0.1.2] - 2026-01-21

### Added
- **Next.js Project Setup**:
  - Initialized Next.js 16.1 with App Router
  - Configured TypeScript
  - Set up Tailwind CSS
  - Created basic project structure
- **Supabase Integration**:
  - Created Supabase client utilities (`lib/supabase/client.ts` and `lib/supabase/server.ts`)
  - Configured environment variables
  - Tested database connection
- **.gitignore**: Comprehensive ignore rules for Node.js, Next.js, and common editors

### Changed
- Project moved from planning phase to implementation phase
- Updated README with current status

### Technical Details
- Next.js 16.1 with App Router
- TypeScript strict mode enabled
- Tailwind CSS configured
- Supabase connection working
- Phase: Foundation ✅ Complete

---

## [0.1.1] - 2026-01-20

### Added
- **Complete Database Schema Deployment**:
  - Successfully deployed complete database schema to Supabase
  - 13 tables created (all core and authorization tables)
  - 40 permissions seeded into database
  - 5 role templates seeded (Platform Admin, Group Leader, Travel Guide, Member, Observer)
  - 4 group templates seeded (Small Team, Large Group, Organization, Learning Cohort)
  - All indexes, triggers, and RLS policies successfully deployed
  - Validation trigger added for user_group_roles to ensure role-group consistency

### Fixed
- Replaced CHECK constraint with trigger in `user_group_roles` table (PostgreSQL doesn't support subqueries in CHECK constraints)
- Updated migration script with corrected user_group_roles validation approach

### Technical Details
- Database: Fully operational with 13 tables, RLS enabled on all tables
- Seed Data: 40 permissions, 5 role templates, 4 group templates
- Phase: Database Implementation ✅ Complete

---

## [0.1.0] - 2026-01-20

### Added
- **Database Schema v2.0**: Complete PostgreSQL schema with proper dependency ordering
  - Core tables: users, groups, group_memberships, journeys, journey_enrollments
  - Authorization tables: permissions, role_templates, group_templates, role_template_permissions, group_template_roles, group_roles, group_role_permissions, user_group_roles
  - Row Level Security (RLS) policies for all tables
  - Comprehensive indexes for performance optimization
  - Seed data for permissions, role templates, and group templates
- **Migration Script**: `fringeisland_migration.sql` for automated database setup
- **Architecture Documentation**:
  - `ARCHITECTURE_OVERVIEW.md`: Overall system design and core concepts
  - `DATABASE_SCHEMA.md`: Complete database schema with RLS policies
  - `AUTHORIZATION.md`: Detailed permission system design
  - `DOMAIN_ENTITIES.md`: Core business entities and relationships
  - `ROADMAP.md`: Implementation phases and milestones
  - `DEFERRED_DECISIONS.md`: Architectural decisions postponed to later phases
- **Project Documentation**:
  - `README.md`: Project overview, vision, and current status
  - `CHANGELOG.md`: Version history and changes tracking
  - `.gitignore`: Git ignore rules
- **Supabase Project**: Created FringeIslandDB database instance

### Changed
- Reorganized database table creation order to resolve foreign key dependency issues
- Updated documentation structure for better clarity and navigation

### Technical Details
- Stack: Next.js 16.1, TypeScript, React, Supabase (PostgreSQL)
- Database: PostgreSQL with Row Level Security
- Authorization: Flexible node/group-based permission system
- Phase: Architecture & Planning → Database Implementation

---

## Project Waves

> This section previously used a Phase 1/2/3/4 model. The project now uses a wave model. For current roadmap and wave status, see [docs/old_products/ferd/planning/ROADMAP.md](docs/old_products/ferd/planning/ROADMAP.md) and [docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md](docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md).

- **Wave 1 (Ferd):** Core web platform — ~95% complete as of v0.2.37
- **Waves 2–6:** Eid → Hamn → Heim → Brim → Urd — see [docs/old_products/INDEX.md](docs/old_products/INDEX.md)

---

## Notes

### Versioning Strategy
- **0.x.x**: Pre-release development versions
- **1.0.0**: First production-ready release with core features
- **x.y.z**: Major.Minor.Patch following semantic versioning

### Contributing
Currently in early development phase. Contribution guidelines will be added when the project reaches a stable state.

### Database Migrations
- Each database schema change documented with migration scripts
- Migration files located in `supabase/migrations/` directory
- **Migrations**:
  - ✅ `20260120_initial_schema.sql` - Initial database setup
  - ✅ `20260123_fix_user_trigger_and_rls.sql` - User lifecycle and RLS
  - ✅ `20260126_group_rls_policies.sql` - Group viewing and creation
  - ✅ `20260126_member_invitation_rls.sql` - Member invitation system
  - ✅ `20260126_member_management_rls.sql` - Accept/decline/leave/remove
  - ✅ `20260126_last_leader_protection.sql` - Last leader protection trigger
  - ✅ `20260127_seed_predefined_journeys.sql` - 8 predefined journeys (v0.2.8)

---

**Project**: FringeIsland  
**Repository**: https://github.com/Stefansteffansson/FringeIsland  
**Maintainer**: Stefan Steffansson  
**License**: TBD
