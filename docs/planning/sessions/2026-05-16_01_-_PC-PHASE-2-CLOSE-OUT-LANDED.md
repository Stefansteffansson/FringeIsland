# Session bridge: 2026-05-16 (1) — Platform Core Phase 2 close-out complete

**Filename convention:** `YYYY-MM-DD_NN_-_TOPIC.md`
**Date:** 2026-05-16 (first bridge of 2026-05-16)
**Session type:** Phase-level close-out. **First instance** of a phase close-out session — no template precedent; no opener instance authored (deliberate scope decision at session-open). Ten accumulated pickup items adjudicated; one skill update landed; routings recorded for downstream sessions.
**Chronological predecessor:** `2026-05-15_03_-_PC4-LANDED.md` (commit `2d29ea4`) — PC-4 Governance closing bridge + Platform Core Phase 2 derivation close.
**Substantive predecessors:** PC-1 (`2026-05-04_01`), PC-2 (`2026-05-04_02`), PC-3 (`2026-05-14_02`), PC-4 (`2026-05-15_03`) closing bridges, plus Experiment B comparison-phase bridge (`2026-05-14_03`).
**Session-opener instance:** **None.** First-instance phase close-out shape — no template exists; no opener authored; session ran directly as adjudication-walk against the ten accumulated pickup items enumerated in the substantive predecessors.

---

## Session arc

Single-session adjudication walk. Source bridges (PC-1 + PC-2 + PC-3 + PC-4 closing bridges + Experiment B comparison-phase bridge + STATUS.md) read at session-open per state-read discipline. Ten accumulated pickup items walked in order; each adjudicated with explicit outcome and routing. Three artifacts produced: skill update (lands at commit `e9c8a54`); this bridge; STATUS.md row update (pending). Sub-batch-of-1 multi-Edit cadence held throughout skill update work (5 Edits across 2 files at sub-batch-of-1; no emission failures).

---

## Platform Core Phase 2 close-out completes at this commit batch

**Phase close statement.** All ten accumulated pickup items from PC-1 + PC-2 + PC-3 + PC-4 closing bridges adjudicated. Skill update lands at `e9c8a54` (five named disciplines + stress-test pattern ratified at n=4 + G-31 closed). Routings recorded for PC-1 amendment session, DS-1 entry, and DevOps-tier pickup. This bridge + STATUS.md update pending in same commit batch.

Phase 3 (Platform Domain) is the next phase. Next session in queue per STATUS.md after this bridge lands: PC-1 amendment session (sequenced before any Phase 3 entity entry per Phase 2 close-out routing) OR DS-1 World Model entry — sequencing decision routes to next session-open.

---

## Adjudications

Ten items walked. Each entry: brief framing + outcome + routing.

### Item 1 — A-candidate promotions

**Framing.** Five A-candidates (A#1 latent-vs-delta, A#5 sub-batch-of-1 multi-Edit cadence, A#6 cold-derivation-with-priors, A#8 cumulative-forward read order, A#9 framework-provided contract mechanisms) accumulated promotion-ready signals across PC-1 through PC-4. Question per candidate: promote to named discipline in the `ecosystem-decomposition` skill, or hold as bridge-prose framing.

**Outcome.** Three promoted (A#5, A#8, A#9 — concrete watch-rules with clear "do this when X" shape, applicable at DS-* L1→L3 work in the near future). Two held (A#1, A#6 — useful framings rather than concrete rules; promoting would be writing for the sake of writing).

**Routing.** Promoted candidates land in skill update at commit `e9c8a54` under new sub-section "Named disciplines (ratified at n=4)". A#1 and A#6 remain in bridge-prose lineage.

### Item 2 — PW-1 promotion

**Framing.** Schema-predates-partition pattern surfaced at PC-2, PC-3, and PC-4 Step 2 work. Three-entity recurrence = promotion threshold. Rule's job: catch the wrong reaction of "the partition must be wrong" or "the schema must be wrong" when actually the mismatch is temporal (schema was built before the partition was drawn).

**Outcome.** Promoted to named discipline in the `ecosystem-decomposition` skill.

**Routing.** Lands in skill update at commit `e9c8a54` (PW-1 paragraph under "Named disciplines"). The 11-day substrate-completion-window observation from PC-4 (Item 10) is referenced as historical anchor but not promoted as a separate sub-pattern.

### Item 3 — P-O1 promotion

**Framing.** Cold derivation drifts toward Supabase-canonical `auth.uid()` as the actor primitive; this repo overrides with a four-hop chain through `users.personal_group_id`. PC-3 and PC-4 both surfaced instances where cold drafts drifted and needed Step 2 catch. Already carried as a "prior" in opener instances but never promoted to skill-level.

**Outcome.** Promoted to named discipline in the `ecosystem-decomposition` skill.

**Routing.** Lands in skill update at commit `e9c8a54` (P-O1 paragraph under "Named disciplines"). DS-1 entry inherits the rule by skill-load rather than by per-instance opener carry-forward.

### Item 4 — PC-1 Finding #3 reframing

**Framing.** PC-1 spec originally said "trigger is the primitive for audit-log writes." PC-4 Step 2 revealed three coexisting audit-write patterns with differing integrity properties: (a) SECURITY DEFINER direct-INSERT in admin RPC bodies (5 sites); (b) SECURITY DEFINER trigger-mediated audit with admin-gating (2 trigger functions); (c) anon-key client RLS-gated INSERT at UI tier (7 sites). Reframing: "audit-write discipline is mechanism-agnostic at the substrate; three coexisting patterns with differing integrity properties."

**Outcome.** Reframing routed to PC-1 amendment-list (deferred; not folded at Phase 2 close-out). Phase 2 close-out confirms the routing only.

**Routing.** PC-1 amendment-list. Joins Finding #4 (Item 5) as PC-1 amendment scope. Per STATUS.md: PC-1 amendment is `Sequenced: After PC-4 entry` — sequencing relative to Phase 2 close-out and DS-1 entry routes to next session-open.

### Item 5 — PC-1 Finding #4 two-tier centralization

**Framing.** Service-role escalation open-coded across 5 sites / 6 `createClient` instances. Two tiers: Gap A (substrate — service-role client construction) and Gap B (auth-flow plumbing — JWT-verify + profile-resolve chains). PC-4 contributes 2 of the 5 sites (`lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`). Concrete fix: introduce `lib/supabase/server.ts` admin-tier helper to close both gaps at PC-4 sites simultaneously. Question: write the helper at Phase 2 close-out, or route to feature-spec cycle?

**Outcome.** Routed to PC-1 amendment-list. Writing infrastructure code at Phase 2 close-out blurs adjudication/coding lines; the helper touches 5 sites across PC-1, PC-3, PC-4 scope, which is feature-spec-shaped work, not phase-close-out work. PC-1 amendment session adjudicates whether helper introduction lands at amendment-time or routes further to FEAT-PC-* feature spec.

**Routing.** PC-1 amendment-list. Helper-introduction disposition deferred to PC-1 amendment session.

### Item 6 — Cross-tier write discipline

**Framing.** PC-4 admin RPCs directly mutate Domain-Service-owned tables (`journey_enrollments`, `journeys`, `notifications`). Question: should Platform Core entities write directly to Domain-Service-owned tables, or should Domain Services publish primitives that PC-4 calls? Affects DS-1 cold derivation: does DS-1 World Model accept that PC-4 writes to its tables, or does DS-1 own a primitive like `enroll_group_in_journey()`?

**Outcome.** Routed to Phase 3 entry as substrate question DS-1 must adjudicate. Phase 2 close-out does not resolve. Right answer needs DS-1's contract surface derived first; pre-deciding at Phase 2 close-out would contaminate DS-1's cold derivation.

**Routing.** DS-1 entry session-opener instance must carry this as a Step 1 watch-flag. Step 2 surfaces evidence; Step 3 adjudicates.

### Item 7 — PC-3 enumeration-completeness gaps

**Framing.** PC-4 Step 2 work surfaced five enumeration-completeness gaps in the already-amended PC-3 spec (DeusEx UI-tier containment widening, admin RPC family missing 3 of 6 from C3-5 enumeration, DeusEx three-semantic-function widening, §7 three-justification rule phrasing refinement, DeusEx three-casing historical-context refinement). Question: is "auto-pickup channel" warranted as a standing pattern, or do these stay as normal amendment-list pickups?

**Outcome.** Stay as normal PC-3 amendment-list pickups. n=1 isn't a pattern; auto-pickup channel framing earns naming only if DS-1 Step 2 surfaces a similar rate of enumeration-completeness gaps in already-closed PC-1/PC-2/PC-3/PC-4 specs.

**Routing.** PC-3 amendment-list (already on STATUS.md as Done — but the five sub-pickups remain available for a future PC-3 amendment session if scope warrants reopening). No new STATUS.md row needed; the gaps live in the PC-4 closing bridge §Pickup lists → PC-3 Organisation block.

### Item 8 — P11 archeology DevOps-tier pickup

**Framing.** DeusEx system-group bootstrap not recovered post-D15 (archive migration `20260217163643_deusex_bootstrap.sql` created DeusEx system-group membership + role; no active migration recreates). PC-4 governance non-functional on fresh-DB deploy without manual seeding OR archive bootstrap. Plus P-RC2 historical anchor: pre-D15 `admin_audit_log` carried inline RLS policies; D15 rebuild ENABLEd RLS but DROPPED policies; fix_test_regressions + fix_rc7 re-created.

**Outcome.** Routed to DevOps-tier pickup. Fresh-DB deployability work that is not architectural, not entity-scope, not amendment-shape. Fires when fresh-DB deployment becomes a near-term concern.

**Routing.** DevOps-tier pickup recorded in this bridge §Carry-forward. Resolution work: either port `20260217163643_deusex_bootstrap.sql` back into active migrations OR document as a manual deploy step. Sequencing TBD per DevOps-tier priorities.

### Item 9 — Doc-hygiene anticipatory-language sweep

**Framing.** Sub-tier `CLAUDE.md` files with anticipatory language that's gone stale. The canonical example (`docs/platform/core/CLAUDE.md` "Where to go next" bullet) was already disposed at PC-4 close (commit `56fee09`). Question: is a broader doc-hygiene sweep warranted at Phase 2 close-out?

**Outcome.** Declined. PC-4 close already handled the known stale bullet. Broader doc-hygiene is `doc-health-check` skill territory and fires at cycle boundaries, not phase boundaries. Sweeping at phase close-out duplicates existing discipline.

**Routing.** No action. `doc-health-check` skill covers ongoing doc-hygiene at cycle cadence.

### Item 10 — Substrate-completion-window observation

**Framing.** PC-4 surfaced an 11-day window for governance substrate construction (pre-D15 design + D15 monolithic consolidation + post-D15 hotfixes). This is a finer-grained sub-shape of PW-1 (schema-predates-partition): substrate gets built across a multi-day window with consolidation + hotfix shape, not a single moment.

**Outcome.** Not promoted. n=1 (PC-4 only); the 11-day window is a specific historical artifact of D15. If DS-1 / DS-2 Step 2 surfaces similar substrate-completion-window evidence, naming earns at that point.

**Routing.** Recorded in this bridge as a sub-shape watch under PW-1. No skill text changes for the sub-shape; the PW-1 paragraph in the skill cites D15 (`ce58227`) as the canonical instance.

---

## Artifacts landed this session

**Commit `e9c8a54` — skill update + gaps closure.** `.claude/skills/ecosystem-decomposition/SKILL.md` revised first-instance framing line for the stress-test pattern (n=2 → n=4 ratification); new sub-section "Named disciplines (ratified at n=4)" added with A#5 + A#8 + A#9 + PW-1 + P-O1. `docs/ecosystem/how-we-work/gaps.md` G-31 closed (deleted from Quick index, body prose, Medium priority list); G-29 body's "Connection to G-31" paragraph revised; status count 28 → 27; last-updated date 2026-05-01 → 2026-05-16. Five Edits at sub-batch-of-1 cadence across two files; no emission failures.

**This bridge.** `docs/planning/sessions/2026-05-16_01_-_PC-PHASE-2-CLOSE-OUT-LANDED.md` — phase close-out adjudication record.

**STATUS.md row update (pending).** Phase 2 close-out row → Done; next item set to PC-1 amendment OR DS-1 entry per next-session adjudication.

---

## Routings to downstream sessions

| Item | Routing target | Substance |
|---|---|---|
| 4 PC-1 Finding #3 reframing | PC-1 amendment-list | Three-pattern audit-write reframe: SECURITY DEFINER direct-INSERT (5 sites) + SECURITY DEFINER trigger-mediated (2 functions) + anon-key client RLS-gated INSERT (7 sites). Per PC-4 §L3 Step 2 C2-5 + C3-2. |
| 5 PC-1 Finding #4 two-tier centralization | PC-1 amendment-list | Gap A substrate + Gap B auth-flow plumbing; PC-4-scope concrete fix is `lib/supabase/server.ts` admin-tier helper introduction. Helper-introduction disposition deferred to PC-1 amendment session (write at amendment OR route further to FEAT-PC-* feature spec). |
| 6 Cross-tier write discipline | DS-1 entry session-opener | Direct UPDATEs vs Domain-Service-published primitives. Affects DS-1 World Model + DS-2 Narrative Engine + DS-3 Experience Engine + DS-5 Communication contract surfaces. Step 1 watch-flag; Step 2 evidence; Step 3 adjudication. |
| 8 P11 archeology + P-RC2 | DevOps-tier | Fresh-DB deployability: DeusEx bootstrap restoration (port archive migration to active OR document manual step) + RLS-policy-DROP discipline at D15-style rebuilds. Fires when fresh-DB deploy becomes a concern. |
| 10 Substrate-completion-window | PW-1 sub-shape watch | Recorded as historical anchor under PW-1 in skill; naming earns at n=2 if DS-* Step 2 surfaces similar substrate-completion-window evidence. |

---

## A-candidate ledger snapshot at Phase 2 close-out

| Candidate | Phase 2 close-out verdict |
|---|---|
| **A#1 Latent-vs-delta distinction** | Held as bridge-prose framing. Not promoted; useful framing rather than concrete watch-rule. |
| **A#2 Tier-shape escalation channel** | Held; no Phase 2 evidence of recurrence beyond original PC-1 surfacing. Carries forward as promotion-watch into Phase 3. |
| **A#3 Database-shaped L2 framing assumption** | Held; no Phase 2 evidence of recurrence. Carries forward as promotion-watch into Phase 3. |
| **A#4 (PW-1) Schema-predates-partition** | **PROMOTED.** Lands in skill at commit `e9c8a54`. Three-entity recurrence (PC-2 + PC-3 + PC-4) + 11-day substrate-completion-window historical anchor at PC-4 (D15 commit `ce58227`). |
| **A#5 Sub-batch-of-1 multi-Edit cadence** | **PROMOTED.** Lands in skill at commit `e9c8a54`. Ratified at PC-4 Step 3 (29 Edits at sub-batch-of-1; no emission failures). |
| **A#6 Cold-derivation-with-priors as methodology variant** | Held as bridge-prose framing. Not promoted; useful framing rather than concrete watch-rule. |
| **A#7 Tool-payload verification (structural-inventory-before-defect-assertion)** | Held; ratified discipline throughout Phase 2; no separate skill-text needed (already covered in skill Quality checklist). |
| **A#8 Cumulative-forward read order** | **PROMOTED.** Lands in skill at commit `e9c8a54`. Ratified at PC-3 Step 2; tier-agnostic at PC-4. |
| **A#9 Framework-provided contract mechanisms** | **PROMOTED.** Lands in skill at commit `e9c8a54`. Four-context convergent evidence at PC-4 (admin RPCs via PostgREST from lib + route + UI tiers). |
| **P-O1 Repo-specific actor primitive** | **PROMOTED.** Lands in skill at commit `e9c8a54`. Ratified at PC-3 + PC-4 Step 2. |

Five promotions to skill; two held as bridge-prose framings; three other watches carry forward into Phase 3 (A#2, A#3, A#7).

---

## Methodology data points — first-instance phase close-out

First instance of a phase close-out session shape. Observations captured for future phase close-outs (Phase 3, Phase 4, Phase 5):

- **No opener template needed at first instance.** Authoring an opener-instance template for a single phase close-out (which won't recur for months) is process overhead, not discipline. Skipping the opener and running adjudication directly held cleanly; no information loss; no missed checkpoints. Future phase close-outs may inherit the same shape (template-less direct adjudication walk) unless DS-* close-out scope materially differs.

- **Adjudication-walk shape worked.** Ten items walked sequentially with per-item framing + recommendation + ratification cycle. Compact format (3-5 sentences per item) sufficient; no item required extended bouncing. Items 1 + 2 + 3 (A-candidate promotions) consumed most of the methodology-decision weight; items 4 + 5 + 6 + 7 + 8 + 9 + 10 were faster routing decisions.

- **Three-artifact landing shape.** Skill update + closing bridge + STATUS.md update is the natural Phase 2 close-out artifact scope. No new permanent artifact (e.g., named-program-pattern catalog file) was warranted — promoted patterns belong in the skill that uses them, not in a separate parking-lot doc. Discipline check: develop what gets used in the near future; revise as we go.

- **Phase close-out reframes accumulating pickups; it does not execute amendments.** Items 4 + 5 routed to PC-1 amendment-list rather than folding inline at phase close-out. Distinct from entity close-out (which can fold inline). Future phase close-outs should preserve this distinction — phase close-out is the moment to *recognize* program-level patterns and *route* accumulated pickups, not to execute the amendments themselves.

- **No §13 framework needed without an opener template.** Five-prompt §13 capture (the autonomous L1→L3 / spec-amendment template convention) presumes a template under stress-test. With no template, methodology capture happens as bridge-prose observations like the above. Future phase close-outs may stress-test that decision; if a template emerges (e.g., DS-* close-out makes phase close-out recurrence visible), §13 capture re-enters scope.

---

## Carry-forward to next sessions

**To next session (PC-1 amendment OR DS-1 entry — sequencing decision at next session-open):**

- Five skill rules now active in `ecosystem-decomposition` skill (A#5, A#8, A#9, PW-1, P-O1) — DS-1 entry inherits by skill-load, not by per-instance carry-forward.
- Stress-test pattern ratified at n=4; standing methodology. DS-1 Step 1 + Step 2 + Step 3 inherit the pattern by skill-load. The skill text says "ratified across four Platform Core entities" — DS-1 is the first cross-tier instance and may surface fresh observations.

**To PC-1 amendment session (when sequenced):**

- Item 4 (PC-1 Finding #3 reframing) — three-pattern audit-write codification. Per PC-4 §L3 Step 2 C2-5 + C3-2.
- Item 5 (PC-1 Finding #4 two-tier centralization PC-4-scope anchor) — Gap A + Gap B at `lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`. Helper-introduction disposition.

**To DS-1 entry session-opener authoring:**

- Item 6 (Cross-tier write discipline) — substrate question at Step 1 watch-flag.
- All five skill rules are now active discipline — DS-1 opener does NOT need to re-list them as carry-forward priors (they're skill-resident).

**To DevOps-tier (sequencing TBD):**

- Item 8 (P11 archeology + P-RC2 historical anchor) — DeusEx bootstrap restoration + RLS-policy-DROP discipline.

**To PW-1 watch (Phase 3 ongoing):**

- Item 10 (Substrate-completion-window observation) — if DS-* Step 2 surfaces similar 11-day-style substrate-completion-window evidence, sub-shape earns naming at that point.

**Holding watches for Phase 3:**

- A#2 (Tier-shape escalation channel), A#3 (Database-shaped L2 framing assumption), A#7 (Tool-payload verification).
- A#1 (Latent-vs-delta) + A#6 (Cold-derivation-with-priors) — held as bridge-prose framings; promotion only if a concrete "do this when X" rule emerges in Phase 3 use.

---

## Tripwires

| # | Description | Status |
|---|---|---|
| 4 | Disk-of-record verification before asserting | ACTIVE — held cleanly throughout. State-read at session-open verified all six predecessor bridges + STATUS.md against disk; gaps.md G-31 references verified at all three locations before delete; skill SKILL.md fresh-read in full before drafting additions; both Edits dry-run before apply. No false-positive defect assertions; no oldString-mismatch failures across five Edits. |
| 6 | Discipline-as-deferral | NOT FIRING — discipline-stack altitude held throughout. Sub-batch-of-1 cadence preserved at all gates; no compounding errors. Move-and-correct disposition applied at the user's mid-session prompt to simplify scope (named-program-pattern catalog file → skill update only; opener-instance authoring → skipped entirely). Both simplifications absorbed cleanly. |

Tripwires #1, #2, #3, #5 — closed in prior bridges; not re-engaged this session.

---

## Repo state at session close

- Branch `main`. Three commits land this session at this bridge authoring point: `e9c8a54` (skill update + gaps closure) + this bridge + STATUS.md update pending. After this bridge + STATUS.md update commits land, branch will be 8 commits ahead of `origin/main` (was 5 at session-open — PC-4 chain at `0f1dc7e` + `096d4e6` + `56fee09` + `2d29ea4` + `96afbe7`; +3 this session).
- Pre-existing modified-unstaged carry-forwards: `CLAUDE.md` and `docs/planning/sessions/openers/cc-execute-prompt.md`. Both carried across sessions; not committed this session.
- **No push to origin** per Phase 2 close-out convention. The user dispositions push as a deliberate next step.

---

## Discipline posture for next session

All durable disciplines remain in effect:

- State-read at session-open and after permission gates / tool-result clusters. Tripwire #4 disk-of-record verification.
- Verify-before-asserting on commit-shape claims, enumeration scope, cross-section content, and any second-touch Edit.
- No Greek characters as labels (ASCII-only identifiers; hard rule).
- Move-and-correct disposition; first-time-right is not the goal.
- Sub-batch-of-1 multi-Edit cadence default (now skill-resident per Item 1 A#5 promotion).
- Append-only Option A for ADR amendments (three shape variants precedented — see PC-3 closing bridge).
- In-commit-consistency and forward-only correction.
- Canonical specs on `main` via deliberate provenance-citing commits.
- OLDFEAT blindness invariant carries forward (STATUS.md OLDFEAT reconciliation row still Pending; not adjudicated at Phase 2 close-out; future cycle).
- Iterative way of working — develop what is used in the near future; revise as we go.

---

*End of bridge.*
