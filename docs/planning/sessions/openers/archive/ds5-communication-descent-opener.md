# Autonomous L1->L3 session-opener - DS-5 Communication

**Instance authored:** 2026-06-10
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `766e134` - carries the DS-4-adjudicated revisions: empty-result verification at template §6, ADR-enumeration-by-grep + citation-precision at template §3 - both BIND this run as template text, no longer instance riders)
**Entity type:** Domain Service (entity 5 of 8 in Platform Domain, Phase 3)
**Predecessor bridge (chronological - tip-check anchor at Section 1 Check 3):** [`../2026-06-10_05_-_DS4-LANDED.md`](../2026-06-10_05_-_DS4-LANDED.md) (closing-bridge commit `b42627f`; STATUS.md close `63d076f`, the template-revision landing `766e134`, and the novel-draft commit `2fe74d5` are acceptable interveners)
**Substantive predecessors (derivation authority for Step 1 carry-forward):** the DS-4 closing bridge (pickup block "DS-5 Communication (next entity; its opener must inherit)" - inherited in full below), the DS-3 closing bridge (mixed forward-commitment precedent; journey-scoped social surfaces boundary), and the Session B conformance register Section 3 DS-5 row

> Per-instance session-opener for the autonomous CC run executing DS-5 Communication L1->L3 derivation, end-to-end. **Fifth instance of the autonomous L1->L3 template.** Three-step shape: cold derivation -> code-informed stress-test -> adjudication. The stated Step 2 expectation is **CODE-RICH** (calibrated at opener authoring - Section 5b): `forum_posts`, `conversations`, `direct_messages`, `notifications` live in the 19-table baseline; `lib/messaging/`, `lib/notifications/`, `lib/types/messaging.ts` and messaging surfaces exist. Expect a **non-zero Step 2 with a mixed forward-commitment profile** (the DS-3 shape, not the DS-1/2/4 shape). Single-session expected; split fallback per the template.
>
> **No FIRST DECISION at this descent.** PENDING.md carries no DS-5 naming watch-item (verified at authoring: its two sections are the Whisp split - consumed-only, promotion at DS-7 - and the resolved DS-3 rename). Vocabulary check: "Communication" is the ADR-U023 canonical name; no collision found. The first ratification gate is the Step 1 checkpoint (DS-4 precedent).

---

## Section T - candidates and watches riding this instance

The DS-4 adjudication landed the two former riders as template text (`766e134`: empty-result verification at §6 n=4; ADR-enumeration-by-grep + citation-precision at §3 n=3) - those bind from the template. Riding THIS instance:

1. **Candidate #4 - migration-name-as-shorthand.** No decisive firing at n=4 opportunities. A code-rich entity with 10 live + 16 archived DS-5-vocabulary migration files is its best chance yet. Held as a Step 2 watch; **if it rides again, retirement adjudication at Phase 3 close-out** (DS-4 disposition).

---

## Section 1 - Pre-flight checks - STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for Stefan's adjudication before proceeding. Material divergence halts; non-material citation corrections bundle into the Step 1 checkpoint (DS-4 precedent, now template text).

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `766e134` (the DS-4-adjudicated template-revision landing; the DS-4 closing bridge `b42627f` + STATUS close `63d076f` precede it). Acceptable interveners: this opener's authoring commit + its STATUS.md update; novel-path commits (shape (b) below). Hard-fail if earlier.
4. **Working tree state.** Run `git status`. Expected: clean, with TWO named acceptable shapes:
   - **(a) Root `CLAUDE.md` context-mode re-injection** (registered re-occurrence): modified with the diff solely the appended "context-mode - MANDATORY routing rules" block (insertions only). Disposition: **discard** (`git checkout -- CLAUDE.md`; if the permission classifier denies, Edit-removal is the sanctioned fallback - both outcomes precedented). Verify the diff is SOLELY that block first.
   - **(b) Concurrent `docs/novel/` activity** - a parallel writer is active in this repo (commits `a733879`, `2fe74d5` precedent). Novel-path commits at or after the tip anchor, and untracked files under `docs/novel/`, are acceptable interveners, NOT hard-fails. Do not read, modify, or commit them.
   - Anything else unnamed in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`: **hard-fail**.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `766e134` exactly. Hard-fail if earlier; soft-flag and adjudicate if later.

**Generic environment note (DS-3 + doc-health precedent):** the auto-mode permission classifier can deny seemingly-routine actions at novel sites. Standing fallback: surface the denial, ask Stefan, use the narrowest sanctioned alternative. Do not work around silently.

---

## Section 2 - State-read pass (ordered)

Read these files in order. Stop on material divergence; surface and wait. Non-material citation corrections bundle into the Step 1 checkpoint.

1. **`docs/planning/sessions/2026-06-10_05_-_DS4-LANDED.md`** - chronological + substantive predecessor. Load-bearing: the DS-5 pickup block (code-rich expectation; the Q7 attachment seam routed here; the SETTLED profile-media classification; ADR-U021 joining the binding set; the branch-gated cord-health consumption); the PC-1 avatars-bucket routing (NOT this run's work - do not absorb).
2. **`docs/planning/sessions/2026-06-10_04_-_DS3-LANDED.md`** - the mixed forward-commitment precedent (6 partial / 9 full-forward) this run's Step 2 expects to resemble; the cross-tier-write and Finding #4 pickups (NOT this run's work - do not absorb).
3. **`docs/planning/sessions/2026-06-10_-_SESSION-B-CONFORMANCE-REGISTER.md`** - Section 3 DS-5 row, this run's work-order seed (verified at authoring, line 164): *"DS-5 Communication | CONSTRAINED | branch-gated cord-health visibility (glanceable/invited/self-first); village social surfaces FIM-only"*. Also Section 6 for standing residue.
4. **`docs/architecture/decisions/PENDING.md`** - confirm: no DS-5-relevant parked decision (the Whisp split is consumed-only; promotion waits for DS-7).
5. **`docs/platform/domain/content.md`** - DS-4's canonical spec. Read for: **§8 Q7 (THE routed seam this descent owns):** *"Are forum/DM attachments DS-4 assets (one content substrate) or DS-5-owned conversation artifacts (conversational state stays whole)? Routes to the DS-5 descent per the sibling-provisional rule; DS-4 claims nothing here."* Resolve from the DS-5 side; on ratification the sanctioned cross-entity amendment is to `content.md` §8 Q7. Also §8 Q2 (SETTLED - see Section 5a) and §2's "conversation or feed attachments (DS-5's seam)" boundary line.
6. **`docs/platform/domain/journeys.md`** - DS-3's canonical spec. Sibling-provisional re-check: DS-3 claims *"conversation or feeds, including journey-scoped social surfaces (DS-5 Communication - DS-5 consumes enrolment context, DS-3 holds no conversational state)"* (§2) and its consumers line names *"DS-5 consumes enrolment context for journey-scoped communication surfaces"* (§3/§6). Confirm or revise from the DS-5 side.
7. **`docs/platform/domain/world-model.md`** - DS-1's canonical spec. Sibling-provisional re-check: §3 Cord operations names *"read a friend's cord health **only along a grown branch** (glanceable not diagnostic, invited not imposed, self first - the branch-gated visibility that DS-5 consumes)"*; the §6 Branch-gated visibility resolution row names Privacy as the consent surface. Confirm the consumption direction from the DS-5 side.
8. **`docs/platform/domain/narrative.md`** - DS-2's canonical spec (light read). Sibling-provisional re-check: §2 "conversation or feeds (DS-5)"; the §L3 19-table attribution names DS-5 territory.
9. **Canonical cores:** the cosmology core (the village and near-side social fabric; branches as grown friendship; the FIM-only intrinsic gates - where DS-5's surfaces live in the world); the roles core (Steward/Guide/Member/Observer - who speaks where); the universe-discovery files where the cores cite them. **Authority-chain texture note:** DS-5's register row traces to the cosmology core (village, branches) + ADR-U021/U027 more than to product locks - closer to the DS-1/DS-2 texture than DS-4's ADR-heavy chain. Flag any canon-sub-page gap per the DS-3 precedent (proceed with remark; Sources-status carries it).
10. **`docs/platform/domain/README.md` + `docs/platform/domain/CLAUDE.md`** - sub-tier rules; the DS-5 L2 inventory line (verified at authoring, line 13): `- **DS-5 Communication** (`communication.md`) - DM, forums, activity feeds`.
11. **ADRs (enumerated by domain-noun grep at authoring; re-verify membership against the decisions listing AND verify attributed text against the ADR files - template §3 text since `766e134`).** Sweep terms used: message/conversation/forum/thread/feed/notif/communicat/post/attachment/anonymi/DM/chat. The adjudicated binding set, with what each file actually says:
    - **U023** (decomposition) - Communication named in the seven-services block; services "communicate through the Internal API".
    - **U021 (THE entity-specific lock - forum anonymisation soft-flag):** posts retain their original `author_id`; display logic shows "Former Member" based on **current membership status, not the stored author field**; rejoining restores the name automatically; **historical data is never mutated**; deletion rejected because *"a thread where half the replies have disappeared is worse than a thread with 'Former Member' attributions."*
    - **U002 (five verticals - load-bearing boundary text):** *"Notifications as part of L5 Communication - rejected because notifications are triggered by events at every layer, not just L5. Placing it in L5 incorrectly implies it only relates to communication."* Notifications vertical = "internal listener, outward deliverer". This is the law for the notifications-boundary structural question (Section 3).
    - **U016** (cascade specification-first) - the cascade template carries an explicit *"Communication: [what happens to messages/forums]"* slot; the motivating incident names incomplete soft-delete handling in "groups, journeys, forum posts and more". Lifecycle cascades must specify DS-5 effects.
    - **U027** (Shadow lifecycle) - the privacy protection is *"ephemerality, not refusing to store"*; the Shadow's own generated data has TTL + explicit-erase; **"the village and deep place 3 are FIM-only (S45)"** - the register row's second constraint traces here. Shadow-generated DS-5 state (posts, messages) inherits the ephemerality posture; cascade-spec with PC-2 before build.
    - **U003** (Supabase backend) - "Supabase Real-time for subscriptions" named in the decision; the realtime substrate DS-5 consumes.
    - **U007** (three-layer permission model) - `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` disk signature; Tier-1/RLS split-by-context with `is_platform_admin()`. Gates DS-5 writes.
    - **U006** (universal group pattern) - forums/feeds scope to groups; U021's "current membership status" display resolves against this substrate.
    - **U028** (governance by scope) - the gate-by-scope law applied to communication scopes. **Citation-precision note:** U028's grep hits are false positives ("dry-run thread #1" is a product-lock thread, not a forum thread); membership is via the general law, not entity-specific text.
    - **U025/U026** (equipment-grain law; studios law) - boundary input: feature-keying stays at surfaces; no studio writes to DS-5.
    - **Recorded false positives (excluded with rationale):** U001 ("forums" inside a rejected alternative), U010 ("communicates"), U022/U024 ("communicate strategic priority"), README index row.
12. **`docs/planning/sessions/openers/STATUS.md`** - confirm the DS-5 row is `In flight` with this opener linked.

Then verify against disk (template §6 discipline; empty-result verification binds as template text):

- Spec at `docs/platform/domain/communication.md` - confirm does NOT yet exist (verified absent at opener authoring). If it exists, hard-fail and surface.
- Entity CLAUDE.md at `docs/platform/domain/communication/CLAUDE.md` - confirm does NOT yet exist (the `communication/` directory itself does not exist at authoring). **Registered expected placeholder:** `.claude/skills/doc-health-check/SKILL.md` Section 7 carries its row (line ~442 at authoring). When this run authors the file, **remove that registry row in the same commit** (registry rule 2; classifier-fallback note at Section 1).
- `decisions/PENDING.md` state as described.
- This opener at its landing path (`archive/` it at session close per the only-live-artifacts rule).

---

## Section 3 - Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these - no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md`
- **Sub-tier:** `docs/platform/domain/CLAUDE.md`
- **L2 inventory line:** `- **DS-5 Communication** (`communication.md`) - DM, forums, activity feeds`
- **Canonical cores (hard precedence):** cosmology (village, branches, near-side social fabric, FIM-only gates) + roles (who speaks where) per Section 2 item 9, plus the universe-discovery files where the cores cite them.
- **Conformance constraint:** the register Section 3 DS-5 row (branch-gated cord-health visibility glanceable/invited/self-first; village social surfaces FIM-only).
- **Architectural authority:** the ADR set at Section 2 item 11, with U021 as the entity-specific lock and U002's notifications-rejection text as boundary law.
- **Template:** `docs/templates/domain-service-spec.md` (slug `communication`).
- **Sibling seams (boundary input, NOT capability source):** `content.md` (Q7 - the routed seam), `journeys.md` (enrolment-context consumption), `world-model.md` (branch-gated cord-health), `narrative.md` (light) - consulted only for the named seams; DS-5 capabilities derive from the cores + ADRs, never from sibling specs.
- **Predecessor carry-forward:** the DS-4 bridge's DS-5 pickup block + Section 7 priors.

**Cold-derivation discipline.** No reads of `supabase/migrations/`, `lib/`, `app/`, `components/`, `tests/`, or FEAT-* files at Step 1. Knowing THAT `forum_posts`/`conversations`/`direct_messages`/`notifications` exist (bridge carry-forward + this opener's calibration) is prior; reading their shape is contamination. `docs/planning/reference/2026-04_hub-l3-working-set/` is NOT derivation input.

**Structural question 1 this descent owns - the attachment seam (DS-4 §8 Q7, routed here).** Are forum/DM attachments DS-4 assets (one content substrate, referenced opaquely by ID like beats/steps do) or DS-5-owned conversation artifacts (conversational state stays whole)? DS-4 claimed nothing. Cold derivation proposes the answer; ratification gates it; the sanctioned cross-entity amendment on ratification is to `content.md` §8 Q7.

**Structural question 2 this descent owns - the notifications boundary.** ADR-U002 explicitly **rejected** notifications-as-communication ("notifications are triggered by events at every layer, not just L5"); the Notifications vertical is the cross-cutting listener/deliverer. Yet a realized `notifications` table sits in the 19-table baseline attributed to DS-5 territory, `lib/notifications/` exists, and the L2 line ("DM, forums, activity feeds") is silent on notifications. Cold derivation must place the boundary: what (if anything) of notification substance is DS-5-owned (e.g. in-surface activity/feed delivery as a communication surface) vs vertical obligation (event-listening + outward delivery), WITHOUT contradicting U002. The realized table's placement is then a Step 2 classification against the ratified boundary - route per the architecture, not the code.

---

## Section 4 - Three-step work shape

Step 1 cold derivation -> Step 2 stress-test (A#8 cumulative-forward) -> Step 3 adjudication with forward-commitment classification. Stated expectation: code-rich, mixed forward-commitment profile (DS-3 shape). Single-session expected; choose at the Step 1 checkpoint with Stefan.

---

## Section 5a - Step 1 - cold derivation

**Activity.** Author the candidate L3 inventory from upstream authority only. Write to `docs/platform/domain/communication.md` the L2 sections 1-7 (+ service-level invariants block per the DS-1/2/3/4 additive precedent) and the L3 inventory + dependency chain + external dependencies + Sources-status.

**Derivation scope (from the register row + L2 line + cores + ADRs + routed seam):** direct messages / conversations (pair and group grain); group-scoped forums (threads, posts, replies); activity feeds; journey-scoped social surfaces (consuming DS-3 enrolment context - DS-3 holds no conversational state); **membership-status attribution display** (U021's soft-flag law: "Former Member" by current membership, data never mutated, deletion rejected); branch-gated cord-health visibility consumption (DS-1's gate; glanceable/invited/self-first; Privacy holds the consent surface); **village social surfaces FIM-only** (U027 S45 intrinsic gate); Shadow-communication ephemerality (U027: Shadow-generated posts/messages inherit TTL-erasure + atomic transcendence migration); communication lifecycle cascades (U016's "what happens to messages/forums" slot - member exit, group retirement, account decommission); realtime delivery substrate consumption (U003); write gating per U007/U028 (gate-by-scope); the attachment seam answer (structural question 1); the notifications boundary answer (structural question 2).

**SETTLED - do not re-litigate (consume only):**
- **Profile/avatar media is PC-2/PC-3 identity-presentation substrate** (DS-4 Step 2 classification, ratified; `content.md` §8 Q2). Avatars in messaging/forum surfaces are *consumption* of that substrate - not a DS-5 or DS-4 boundary question.
- **The Whisp split is decided** (PENDING.md); DS-5 owns no face. Whisp dialogue is not DS-5 conversational state. The Whisp-split ADR promotion waits for DS-7.

**Carry-forward priors:** the five named disciplines (A#5 per-phase, A#8, A#9, PW-1, P-O1), D7, and the Section 7 table. At a code-rich entity expect most to fire; P-O1/D7 pin any gating prose.

**Watches armed at Step 1:** A#9 (framework mechanisms - **Supabase Realtime is a framework-provided delivery contract: check whether realtime channels/subscriptions constitute the realized contract surface before declaring a speculative one**; note the calibration texture: DS-5's client mechanism is React contexts (`MessagingContext.tsx`, `NotificationContext.tsx`), not `use*` hooks); hypothesis pruning (plausible-but-unconfirmable shapes become §8 questions tagged speculative-third-shape); L2-line altitude (the line "DM, forums, activity feeds" predates the register row's constraints - it names neither the cord-health visibility consumption, the FIM-only village gating, the U021 anonymisation law, nor notifications in any posture; revision is a plausible Step 3 output).

**Step 1 checkpoint surfacing.** After the candidate is composed, pause and surface to Stefan BEFORE the first Write: capability count by area; the attachment-seam position (structural question 1); the notifications-boundary position (structural question 2); the three sibling re-check positions (journeys enrolment context; world-model cord-health; narrative conversation-or-feeds); L2-line altitude finding; §8 question count; speculative-third-shape tags; single-vs-split choice; any state-read citation corrections bundled. Wait for ratification.

**Single-Write preferred; A#5 per-phase; the ratified Write holds uncommitted until Step 3** (template text).

---

## Section 5b - Step 2 - code-informed stress-test pass

**Direction of authority preserved.** Code stress-tests the candidate; never sources it.

**Expectation - stated for Step 2 to verify rather than assume (calibrated at opener authoring 2026-06-10):** DS-5 is **CODE-RICH** - `forum_posts`, `conversations`, `direct_messages`, `notifications` live in the 19-table baseline (PW-5; re-verify the count rather than inherit); **10 live migration files + 16 archived** carry DS-5 vocabulary (forum_posts/direct_messages/conversation/notification sweep); `lib/messaging/MessagingContext.tsx`, `lib/notifications/NotificationContext.tsx`, `lib/types/messaging.ts` exist; **14 files** across `app/` + `components/` carry forum/DM/conversation/notification vocabulary; **zero** messaging-named hooks in `lib/hooks/` (contexts carry the client mechanism). Expect a **non-zero Step 2 with a mixed forward-commitment profile** (the DS-3 shape: realized substrate partially covering some capabilities, others full-forward) - NOT zero-delta, and NOT necessarily retraction-heavy (the deltas-not-retractions refinement: rich priors, second code-rich data point). **Record the retraction-rate data point** (series: PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0).

**Clusters, sized to the code-rich expectation (sandboxed sweeps per the DS-3/DS-4 context-economy precedent):** **Cluster S structural survey first** (directory-level scope-survey before any deep-read; per-file one-line classification of `lib/messaging/`, `lib/notifications/`, the 14 surface files); migrations cumulative-forward (A#8) for message/conversation/forum/thread/feed/notification/post/attachment vocabulary **including `archive/`** (16 archived hits - PW-MARCH1's richest site yet: did D15 consolidation lose DS-5 substrate? **#4 migration-name-as-shorthand's best chance** - classify by content, never by filename); framework-mechanism check (Supabase Realtime channels/policies - A#9's named site; notification delivery mechanisms); `lib/types/messaging.ts` + contexts scope-survey (PW-T1 both directions); `app/api` createClient survey on messaging/notification routes; attachment-artifact sweep (does any realized attachment substrate exist to classify against the ratified Q7 answer?); mop-up greps - **scope the noisy terms carefully** (`post` collides with HTTP POST and "post-bootstrap"; `feed` with "feedback"; `thread` with concurrency prose; `message` with error messages - state patterns and exclusions per SS-16/17; empty-result verification binds on every zero-hit claim, template text).

**Boundary classifications to run against ratified Step 1 positions (not skip):** the `notifications` table + `lib/notifications/` against the ratified notifications boundary (structural question 2); any realized attachment substrate against the ratified Q7 answer; avatar consumption in messaging surfaces confirms the SETTLED PC-substrate reading (consumption evidence only - the bucket-provisioning finding is already routed to PC-1, do not re-raise).

**Cadence:** template text - cluster self-reflection between, surface ONCE at end with the three-class block + structured summary; per-cluster composition is not a gate.

**Step 2 checkpoint surfacing.** Finding counts by class; the boundary classifications; retraction-rate data point + whether deltas-not-retractions held; PW-1/PW-MARCH1/A#9/#4 outcomes; Step 3 scope. Wait for ratification before Write.

---

## Section 5c - Step 3 - adjudication

**Required deliverables - not pickup:**

- **Spec** (combined Write committed at the Step 3 gate; fold-back Edits sub-batch-of-1 if needed; Class 2 deltas fold inline - fold-back REQUIRED at a code-rich entity, DS-3 precedent).
- **Seam resolutions folded where they belong:** the ratified amendment to `content.md` §8 Q7 (the ONE sanctioned cross-entity edit from structural question 1), plus any ratified revisions from the three sibling re-checks (journeys.md / world-model.md / narrative.md - each gated individually at the Step 3 checkpoint; confirmations need no edit).
- **Entity CLAUDE.md** at `docs/platform/domain/communication/CLAUDE.md` + **same-commit registry-row removal** from `.claude/skills/doc-health-check/SKILL.md` Section 7 (classifier-fallback note at Section 1; DS-4 precedent: the Edit was permitted).
- **Pickup lists** - DS-6 (feed/forum content in discovery surfaces, if touched), DS-7 (Whisp-split promotion reminder rides; AI in communication surfaces if touched), Verticals (Notifications vertical receives the ratified boundary; Privacy receives the cord-health consent surface + Shadow-communication posture), Hub/Gimbal (messaging surfaces at FEAT time), doc-health channel. Anchors per entry.
- **Closing bridge** at `docs/planning/sessions/2026-06-10_NN_-_DS5-LANDED.md` (NN next available; adjust date if the session crosses midnight), per Section 11. **Archive this opener in the close batch.**
- **PENDING.md:** no disposition expected (no parked DS-5 decision); ADR amendments only if a Q-resolution warrants (U021 is the likeliest candidate if the anonymisation law needs extension to DM/feed surfaces - append-only Option A; STOP and surface if any resolution contradicts U002/U021/U027).

**Step 3 checkpoint surfacing.** Q-resolution slate before the Step 3 block; each cross-entity edit's scope before landing. Wait for ratification at each surface point.

---

## Section 6 - Self-checking discipline - Tripwire #4 substitute

Template-resident hard rules bind, now including **empty-result verification as template text** (every empty listing or zero-hit enumeration that feeds a claim is verified by a second, differently-shaped method; `find` specifically has produced false-empties; the contrast between methods is itself evidence - record what each shape found). Plus: fresh-read before Edit; structural-inventory-before-defect-assertion; SS-16/17 enumeration-claim-scoping (the noisy-term list at Section 5b); verify-before-asserting on commit shapes; cross-section fresh-read; explicit-count listings.

---

## Section 7 - Carry-forward priors (named)

| Prior | Statement | Source / status |
|---|---|---|
| **Five named disciplines (ratified n=4)** | A#5 (per-phase), A#8 cumulative-forward, A#9 framework-mechanisms (site here: Supabase Realtime), PW-1 schema-predates-partition (site here: the four realized tables predate the DS partition), P-O1 actor primitive `get_current_personal_group_id()`. | Phase 2 close-out; template text. |
| **D7** | Role names are TEXT-keyed `role_templates` rows, never enums. | Experiment A; PC-3 §5. |
| **PW-5 19-table baseline** | End-state schema is 19 tables; re-verify rather than inherit. Four are DS-5-attributed: `forum_posts`, `conversations`, `direct_messages`, `notifications`. | DS-2 bridge; DS-4 re-verified. |
| **Anonymisation soft-flag law (U021)** | Attribution is display logic over current membership; stored data never mutated; deletion rejected. The entity-specific lock. | ADR-U021. |
| **Notifications-vertical law (U002)** | Notifications-as-communication explicitly rejected; the vertical is "internal listener, outward deliverer". Structural question 2 resolves WITHIN this law. | ADR-U002. |
| **Shadow-communication ephemerality (U027)** | Shadow-generated DS-5 state inherits TTL-erasure + atomic transcendence migration; village + deep place 3 FIM-only (S45). | ADR-U027; DS-3/DS-4 §6 precedent. |
| **Cascade slot (U016)** | Lifecycle cascades carry an explicit "Communication: [what happens to messages/forums]" slot. | ADR-U016. |
| **Settled profile-media classification** | Avatars in DS-5 surfaces are PC-2/PC-3 substrate consumption; do not re-litigate. | DS-4 Step 2, ratified; content.md §8 Q2. |
| **Whisp split (DECIDED)** | DS-5 owns no face; Whisp dialogue is not DS-5 state; promotion at DS-7. | PENDING.md. |
| **Sibling-provisional rule** | DS-1/2/3/4 claims against DS-5 are provisional; this descent re-checks them (the Q7 seam + three sibling lines). | Sibling Sources-status blocks. |
| **Cross-tier write discipline** | If DS-5 surfaces cross-tier writes at Step 2, frame into the channel anchored at DS-3 - do not resolve here. | PC-4 C3-7; DS-3 bridge pickup. |
| **TS-type vs runtime (PW-T1)** | Type-vs-runtime coverage check both directions at Step 2 (`lib/types/messaging.ts` is the named site). | PC-4. |
| **Cluster S structural survey** | First-cluster broad survey; at a code-rich entity it sizes the deep-read. | PC-4; DS-3/DS-4 sandboxed-sweep precedent. |
| **Equipment-keying law (U025)** | Features key on equipment at surfaces; platform capabilities never key. | ADR-U025; DS-3/DS-4 precedent. |

---

## Section 8 - A-candidate ledger - watches at DS-5 entry

- **A#1, A#2, A#3, A#6, A#7** - carry forward as framings.
- **Retraction-rate series:** PC-4 7/9; DS-1 0; DS-2 0; DS-3 0; DS-4 0. Record DS-5's point - the second code-rich entity; tests whether deltas-not-retractions holds with rich priors. The series settles at Phase 3 close-out.
- **PW-MARCH1** - 16 archived migration files carry DS-5 vocabulary: its richest firing site yet. Did the D15 consolidation lose communication substrate (asymmetric recovery)? Verify, don't assume either way.
- **#4 migration-name-as-shorthand** - rides this instance (Section T); best chance yet; retirement adjudication at Phase 3 close-out if no decisive firing.
- **Empty-result verification + ADR-enumeration-by-grep/citation-precision** - now template text (`766e134`); no longer instance riders; §13 reports whether they held as template text (fifth-instance framing).

---

## Section 9 - Disciplines in effect

All durable disciplines remain active: canonical-core precedence (hard); ratify judgment calls with Stefan before canonical edits (checkpoints at 5a/5b/5c; the Q7 amendment and any sibling re-check edits are explicit gates); commit at phase gates with the single-session cadence; CODE stays a correction target; trust disk over memory; sessions append-only; the 2026-04 Hub L3 working set is NOT derivation input; any new assertion-bearing diagram joins the doc-health registry same-session; ASCII-only labels; Ferd non-closure (conversation kinds, feed kinds, notification-event kinds - registries, never sealed enums); move-and-correct; in-commit consistency; append-only Option A for any ADR amendment; OLDFEAT blindness invariant (listing only).

---

## Section 10 - Output expectations and commit shape

**Single-session run:** 4-6 commits - (i) combined spec Write (Steps 1+2+3, post-Step-3-ratification) + the ratified `content.md` §8 Q7 amendment + any ratified sibling re-check edits + the domain README/CLAUDE.md enumeration updates; (ii) entity CLAUDE.md + doc-health registry-row removal (same commit); (iii) closing bridge with §13 capture + this opener archived; (iv) STATUS.md close (separate small commit). **No push to origin** - Stefan dispositions push.

---

## Section 11 - Closing bridge - required sections

Standard session-bridge shape plus: explicit closure statement ("*DS-5 Communication L1->L3 derivation completes at this commit batch*"); pickup lists by receiving entity; forward-commitment classification (expectation: MIXED - the DS-3 shape; classify per capability); A-candidate ledger snapshot incl. the retraction-rate point, the #4 verdict (fire or ride-to-retirement-adjudication), and PW-MARCH1's outcome at its richest site; PW status; §13 capture as a primary section; carry-forward to DS-6 Discovery (next per STATUS order); template revision disposition (fifth-instance verdicts on the fourteen cumulative revisions; land or ride with rationale).

---

## Section 12 - Scope boundaries

- **No rename; no FIRST DECISION.** DS-5's name is unchallenged (verified: no PENDING.md watch-item; no collision).
- **Cross-entity edits:** ONLY the ratified `content.md` §8 Q7 amendment + any individually-ratified sibling re-check revisions. All other Class 3 findings route to pickups.
- **The cross-tier-write and PC-1 Finding #4 pickups anchored at DS-3 are NOT this run's work.**
- **The avatars-bucket un-migrated-infrastructure note routed to PC-1 at DS-4 is NOT this run's work** - avatar consumption evidence at Step 2 does not reopen it.
- **Profile/avatar media classification is SETTLED; the Whisp split is DECIDED** - consume, never reopen.
- **DS-6 identity re-derivation watch** - untouched.
- **The Notifications vertical's own obligation-inventory derivation is NOT this run's work** - structural question 2 places the DS-5/vertical boundary only.
- **OLDFEAT blindness invariant** - listing only.
- **Concurrent `docs/novel/` activity is out of scope** - do not read, modify, or commit novel-path files.

---

## Section 13 - Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge: answer the five template prompts. **Fifth-instance framing:** report whether the fourteen cumulative template revisions held as template text - specifically the two newly-landed at `766e134` (empty-result verification; ADR-enumeration-by-grep + citation-precision) at their first run as template text rather than instance riders; adjudicate rider #4 (fire, or ride to retirement adjudication at Phase 3 close-out); record the retraction-rate point and whether deltas-not-retractions held at the second code-rich entity; capture whether the cosmology-leaning authority chain (village/branches over product locks) read differently from DS-4's ADR-heavy texture. Generous capture posture; padding is not.

---

## Section 14 - Start sequence

Begin with Section 1 Pre-flight checks. If all five pass, proceed to Section 2 State-read pass. Then Section 5a cold derivation (no FIRST DECISION gate - the first ratification surface is the Step 1 checkpoint, which must include the attachment-seam position, the notifications-boundary position, and the three sibling re-check positions). Surface the checkpoint before the first Write.

---

*End of instance.*
