# Cascade-plan Session 4b — closing bridge

**Date:** 2026-05-02 (second bridge of the day; first was 4a's closing bridge).
**Session type:** Tier-CLAUDE content audit and migration — middle session of the 4a/4b/4c split that emerged when 4a's wide-first sweep produced more candidates than the cascade-plan bridge had anticipated.
**Predecessor bridges:** [`2026-05-02_01_-_CASCADE-SESSION-4A.md`](./2026-05-02_01_-_CASCADE-SESSION-4A.md) (4a closing — sized 4b's plate); [`2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md`](./2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md) (cascade plan).
**Status:** Closed. Seven commits landed locally; not pushed (sleep-on-it review per cascade-plan working pattern).

---

## Status

Session 4b is complete. The plate inherited from 4a (F1 cluster, F2 mechanical migration, F4-wide audit) was extended during execution to include the §Critical gotchas section migration as a structural decision, surfaced when F4-wide's wide-first sweep flagged the section's bundling of platform-DB + Hub-SSR + universal gotchas as a structural wrong-framing post-cascade-plan. Three workstreams shipped, all in the platform/gotchas neighborhood, all decided together. The §Architecture and §Development workflow root migrations (R2-R6, R8) split out as 4c per the scoping decision made when F4-wide produced more candidates than 4a anticipated.

The branch is twenty-two commits ahead of origin/main (4a's seven + 4a bridge + 4b's seven + earlier work). Push timing at Stefan's discretion after sleep-on-it review.

## What landed

Seven commits in dependency order. All seven read independently with reviewable diffs:

| # | Commit | Subject | Concern |
|---|---|---|---|
| 1 | `2dea4a1` | `docs(platform): annotate two-zones framing as intra-tier sibling content` | F1 adjudication. Reading 1 with Candidate B annotation including the platform-only-has-sub-tiers refinement. |
| 2 | `613f228` | `docs(platform): migrate "Platform Core changes are rare by design" to core sub-tier` | F2 migration. Cross-reference rewrite as structural-relationship note rather than removal. |
| 3 | `e9dc74a` | `docs(templates): update platform-core-spec inbound references after F2 migration` | F2 consequence sweep. Three template path updates (lines 20, 124, 133). |
| 4 | `d589556` | `docs(hub): add SSR-deadlock and ssr-cookies gotchas` | §Critical gotchas migration part 1: Hub additions placed in existing React-idioms and Supabase-facts clusters. |
| 5 | `6f7757c` | `docs(platform): consolidate gotchas section, absorb root migrations` | §Critical gotchas migration part 2: platform consolidation 4 → 9 bullets with Q1 split, discipline-first cluster ordering, four prefacing-clauses dropped. |
| 6 | `17d2400` | `docs(root): replace §Critical gotchas with pointer to tier locations` | §Critical gotchas migration part 3: root reduction. One-sentence pointer with three flavour hints calibrated against Candidate A. |
| 7 | `936af21` | `docs(how-we-work): drop "critical gotchas" from /CLAUDE.md canonical-sources line` | §Critical gotchas migration consequence sweep. Inbound-reference at 04-execution-build-loop.md:92. |

The §Critical gotchas migration's three migration commits + one consequence sweep follow the Hub-then-platform-then-root sequencing locked in 4b's plan-back. This kept routing intact at every intermediate state — root's full §Critical gotchas section remained available while destinations were being populated; only after both destinations had content did root collapse to the pointer. Reversed order would have briefly orphaned the pointer's targets.

## What was decided during the session

Five decisions made during the session that future sessions should know:

**F1 adjudication — Reading 1 with Candidate B annotation, with the platform-only-has-sub-tiers refinement.** Three readings considered (tier-by-defensible-reading; special-case sub-tier asymmetry with policy refinement; misplaced — distribute or relocate). Reading 1 won — the two-zones framing is intra-tier sibling content, the same shape as the policy's "cross-tier relationships" by analogous reading, and platform is the only tier with sub-tiers so the question only arises here. The annotation includes the platform-uniqueness sentence as load-bearing — it answers *why* the policy is silent, not just that it is. Reading 2 rejected because promoting the silence to canonical policy text covering one tier only would itself be a categorisation error against the policy's own logic. Reading 3 rejected because the framing is symmetric — distributing forces every reader to reassemble the asymmetry from two halves, with drift surface in inverse-form rules.

**F2 cross-reference disposition — rewrite as structural-relationship note, not remove.** When the declarative form ("Platform Core changes are rare by design") moved from `platform/CLAUDE.md` to `platform/core/CLAUDE.md`, the existing `core/CLAUDE.md` authoring-discipline bullet's upward pointer became stale. The rewrite preserved the connection between conclusion and authoring-discipline as co-located rules ("The rule above states the conclusion. This bullet spells out how to meet that bar"). Removal would have lost the rule-cluster connection without the prose hint.

**§Critical gotchas section migration as a structural decision, not bullet-by-bullet.** F4-wide's wide-first sweep flagged the section's bundling as a structural wrong-framing post-cascade-plan — the section was correct pre-cascade-plan (root was the only home) but mis-shaped after. Treating the section's existence at root as the structural question (rather than treating each of the ten bullets as an independent migration) produced a single coherent decision: the section migrates down, root retains a one-sentence pointer. An N-rules-to-migrate frame would have masked the section-level decision; the wide-first posture surfaced it naturally.

**Q1 split — SECURITY DEFINER discipline as separate bullet from recursion-trap pattern.** During platform consolidation, the question arose whether to merge root #3 (SECURITY DEFINER discipline rules) into existing platform B (recursion-trap pattern), or split. Split locked: the discipline is constraint-on-when-to-reach-for-it, B is the prescription-for-a-specific-case; merging would put a constraint and a prescription in one bullet, which would read as conflicting unless the reader stitched carefully. The split surfaced the structural difference; the merge would have saved a bullet at the cost of clarity.

**Q3 one-line pointer at root — single-source-of-truth pattern.** When root §Critical gotchas reduced to a pointer, the wording deliberately hinted at flavour without enumerating downward primitives ("Postgres, RLS, migrations" for platform, "Hub-stack" for Hub). Three flavour hints calibrated against Candidate A — five would tip into enumeration that pre-empts lower files' content and creates back-reference incoherence if categories shift. Single-source-of-truth-at-root for routing: the pointer lives in one place and downstream files don't restate routing in parallel. Option (b) of commit 4's three options (rewriting the canonical-sources line to point at tier files alongside root) was rejected for exactly this reason — parallel routing creates drift surface.

## Methodology observations

Five observations for future-session reference. The wide-first sweep posture surfaced more methodology data than 4a or any prior cascade-plan session.

**Observation 1 — Candidate E's second-instance data point (PROMOTED).** 4a's bridge named the "wide-first sweep finds things narrow sweep misses" pattern as Candidate E and called it adjacent evidence pending a second instance. 4b's wide-first sweep found the §Critical gotchas section's structural wrong-framing — the section's bundling of platform-DB + Hub-SSR + universal gotchas was load-bearing pre-cascade-plan and mis-shaped post-cascade-plan, but neither the cascade-plan bridge nor 4a's bridge named it as a target. Without the wide-first posture, 4b would have likely treated the gotcha bullets as ten independent migration candidates and missed the section-level decision entirely. Candidate E now has two named data points and is methodologically robust — wide-first sweep is the right default for cascade migrations going forward, and N-rules-locked framing is the failure mode to avoid at plan-back time.

**Observation 2 — Reconciliation lifts tail-claims into new structures created by source migration (NEW candidate, adjacent to E).** Specific instance: during §Critical gotchas migration's platform consolidation, the "every new SECURITY DEFINER function is a privilege-escalation surface" sentence was sitting in existing platform B's tail — a claim about SECURITY DEFINER discipline carried as a tail-clause inside a bullet whose primary subject was a different concern (the recursion-trap pattern). Root #3's migration created bullet 1 (SECURITY DEFINER discipline) as a new destination structure with the discipline as its primary subject. Reconciling B against the new bullet 1 revealed that the tail-claim fit naturally as bullet 1's substance, and the reorganisation lifted it. Pattern: when a source migration creates a new destination structure (a new bullet, sub-section, or heading), that new structure can absorb tail-claims from existing destination bullets that had been carrying the same shape of content embedded as asides. Adjacent to Candidate E but distinct — E is about what wide-first sweep finds at the *source* layer; this is about what reconciliation surfaces by creating new destination structure that re-homes content already at *destination*. Recognition test for second-instance: a tail-claim in an existing destination bullet is lifted into a new destination bullet created by source migration, where the lifted claim fits as the primary subject. Promote on second instance.

**Observation 3 — Surface-draft cycle's load-bearing role when the diff is the first visibility of proposed text.** Commits 2, 3, and 6 carried shape-locking-for-downstream-inheritance content. Stefan held the approval prompt at commit 2 (platform consolidation), commit 3 (root reduction), and again at commit 6 (root pointer text), each time asking for the full proposed text in chat before sign-off. The IDE diff would have been technically correct but provided no reviewable substance because the diff was the first time the proposed text appeared anywhere — a section-level rewrite's substance is the *shape* of the new section as content (verification-matrix-able, prose-level-critiquable), not as a pre-applied delta. Calibration: the actual driver is consequential-surface-area-and-first-visibility-of-proposed-text, not the section-vs-bullet shape itself. The two correlate in 4b's data — section-level rewrites tended to be the first visibility, mechanical bullet additions had been pre-discussed or were trivially small — but a mechanical bullet with novel wording would also warrant chat surfacing, and a section-level rewrite where the prose was already surfaced piecemeal during reconciliation analysis would not. Commits 4 and 7 went apply-then-commit because their substance was either pre-discussed (Hub additions following an existing cluster pattern Stefan signed off on at the disposition stage) or trivially small (consequence-sweep dropping a stale word from a list line).

**Observation 4 — Consequence-sweep-as-separate-commit pattern held twice.** F2's template path-update was its second commit; §Critical gotchas's how-we-work line update was its fourth commit. Both were consequences of upstream migrations becoming stale; both were granular per cascade-plan D4. The pattern: when a migration's last destination commit lands, inbound references to the old location become stale on that commit and the consequence-sweep follows in a separate commit with explicit "consequence-sweep of commit X" framing in the body. git log audit trail then reads coherently across the migration sequence.

**Observation 5 — Adjacent observation on parallel sibling rules across sub-tiers.** F2's inbound-reference sweep found that `domain/CLAUDE.md` carries a parallel sibling rule ("Domain's default is 'yes, within a service' — but the service's identity is locked"), framed inversely to Core's "default is no." The two sub-tiers each carry their own stability-zone-appropriate version of the "what's rare and what isn't" rule, which is structurally correct — each sub-tier owns its own posture. Worth noting because it confirms that the cascade decomposition's one-rule-per-sub-tier pattern works even when the rules are inverse-framed. Not a methodology candidate; an adjacent confirmation that F1's Reading 1 logic generalises (intra-tier sibling content can live at tier as a framing or at sub-tier as the stability-zone-specific application of the framing).

## What this session did NOT do

- **No §Architecture or §Development workflow root migrations.** Six items (R2 Components, R3 DB access, R4 Security, R5 RBAC, R6 UI rules, R8 Development workflow testing) inherited as 4c.
- **No B.2 follow-on work.** Four untracked HUB-L3-NARRATIVE files in `docs/products/hub/` travel forward unchanged for 4c's intermediate state and beyond until B.2 resumes.
- **No push to origin.** Twenty-two commits ahead of `origin/main` at session close. Push at Stefan's discretion after sleep-on-it review per cascade-plan working pattern.
- **No five-row policy refinement on intra-tier sibling relationships.** Reading 2 of F1 considered this and was rejected — the silence is correctly-not-over-specifying for a single-tier case (only platform has sub-tiers), not a gap to fill.
- **No update to the cascade-plan bridge.** Bridges are permanent records; this closing bridge is the audit trail for 4b's decisions and surface-draft cycles.
- **No expected-placeholders registry update.** Section 7 of `doc-health-check`'s cascade-consistency procedure expects placeholder entries to advance during entity-CLAUDE-authoring sessions (Sessions 2 and 3); 4b authored no entity-CLAUDE files (only tier-and-root content audit), so no registry change.

## Next-session orientation

**4c — §Architecture and §Development workflow root migrations.** Six items inherited from 4b's wide sweep:

| ID | Subject | Verdict | Destination |
|----|---------|---------|-------------|
| R2 | §Architecture, "Components" bullet (App Router, `'use client'`, `/components/ui/`) | migrate-down | Hub |
| R3 | §Architecture, "DB access" bullet (`lib/supabase/client.ts`, `lib/supabase/server.ts`, RSC framing) | migrate-down | Hub |
| R4 | §Architecture, "Security" bullet (RLS / triggers / `is_platform_admin()` SECURITY DEFINER) | migrate-down | platform |
| R5 | §Architecture, "RBAC" bullet (four roles, `has_permission()`) | migrate-down | platform/core |
| R6 | §Architecture, "UI rules" bullet (`ConfirmModal`, members + roles + isLeader example) | migrate-down | Hub |
| R8 | §Development workflow, testing domain list | generalisable-rewrite-candidate; may split | Hub-product domains (groups, journeys, communication) + platform-tier domains (rls, rbac, admin, security) |

R8 is the only judgment-heavy item — the npm scripts are universal repo tooling, but the domain enumeration mixes Hub-product and platform-tier domains. The migration may split rather than land cleanly at one destination; resolve at the migration step, not pre-decided.

**Reading list for 4c:**
- This bridge.
- 4a closing bridge — for the cascade-plan working pattern continuity.
- Cascade-plan bridge — for D4 granularity rules.
- Root [`CLAUDE.md`](../../../CLAUDE.md) — current state of §Architecture and §Development workflow sections.
- [`docs/platform/CLAUDE.md`](../../platform/CLAUDE.md) — destination for R4.
- [`docs/platform/core/CLAUDE.md`](../../platform/core/CLAUDE.md) — destination for R5.
- [`docs/products/hub/CLAUDE.md`](../../products/hub/CLAUDE.md) — destination for R2, R3, R6.

**Entry point:** read this bridge → list root §Architecture + §Development workflow content → confirm the six items match the F4-wide register → plan-back the commit shape (likely six commits per granularity, possibly fewer if R2/R3/R6 cluster cleanly into a single Hub-additions commit; possibly more if R8 splits into multiple destination commits).

**4c is the last cascade-plan execution session.** After 4c lands, the cascade-plan workstream is structurally complete: skill edits + entity-CLAUDE files + tier-CLAUDE content audit all done. A cascade-plan close-out bridge may be appropriate at that point — separate from any individual session bridge — to record the plan's full execution arc and close out the candidate ledger (Candidates A, B, D, E status; the new "reconciliation-surfaces-destination-mis-placements" candidate from this session's Observation 2). Worth deciding at 4c open or 4c close whether to author that as a separate artifact.

## Open questions / risks

- **R8 split disposition.** The testing domain list mixes platform-tier and Hub-product domains. Migration disposition is genuinely judgment-driven — keep the npm scripts at root with no domain enumeration; split the enumeration across platform and Hub; rewrite to point at where domains are owned. 4c decides.
- **R1 (root stack line) watch-point.** Root's stack line ("Next.js 16.1, TypeScript, Tailwind, Supabase") reads as "current state where one entity dominates today" — defensible at root per the policy's may-contain row. Will surface as a real edit when Gimbal becomes active. Not 4c's call; flagging for whichever session opens with Gimbal-as-active.
- **Cascade-plan close-out approach.** When/whether to author a cascade-plan close-out bridge separate from individual session bridges. Worth deciding at 4c boundary.
- **Push cadence.** Twenty-two commits ahead of `origin/main` is sizeable. Sleep-on-it review per cascade-plan working pattern; push timing at Stefan's discretion. Push could land at 4c open (clearing 4b's commits before adding 4c's), or at cascade-plan close (one large push covering the full execution arc). Either is defensible.
- **Candidate-ledger growth pressure.** 4a's bridge flagged that candidate-ledger growth is partly authoring-pressure, not only legitimate observation accumulation. 4b's bridge adds one new candidate (Observation 2) and one promotion (Observation 1). Two movements per session is sustainable but warrants vigilance; three or more is the ceiling, and 4a hit that with two collapses-during-review correcting. If 4c adds more on top of 4b's two, the candidate-ledger-split decision flagged at 4a deserves opening rather than continuing to accumulate.

## Notes for posterity

4a sized 4b for three items (F1 cluster, F2, F4-wide) as "a clean three-item plate." 4b's F4-wide wide-first sweep produced eleven items + one structural wrong-framing — substantially more than 4a anticipated. The 4a/4b/4c split decision (locked at the start of 4b's execution after the wide sweep) kept each working session sized appropriately rather than forcing one oversize session. Methodology data point: when wide-first sweep finds more than plan-back anticipated, splitting the inherited plate across multiple sessions is the right move — cascade-plan's working pattern is robust to mid-workstream re-scoping when the discipline is honest about what was found.

The §Critical gotchas migration's structural wrong-framing recognition is a clean Candidate E demonstration: the section's bundling was load-bearing pre-cascade-plan and mis-shaped post-cascade-plan, but neither the cascade-plan bridge nor 4a's bridge had named it as a target. The wide-first sweep against the five-row policy surfaced it naturally during 4b's F4-wide. Without the wide-first posture, 4b would have treated the gotcha bullets as ten independent migration candidates and missed the section-level decision entirely.

The seven 4b commits represent two distinct sequencing patterns. F1 + F2 + F2-consequence are plan-back-anticipated single-decision migrations with simple destination-and-consequence structure. The §Critical gotchas migration is a structural-decision-with-three-destinations-and-one-consequence-sweep (Hub additions + platform consolidation + root reduction + how-we-work consequence). Both patterns ship cleanly under the same D4 granularity rule (one logical concern per commit), but the second pattern needed Hub-then-platform-then-root sequencing to keep routing intact at every intermediate state. Worth carrying forward as a sequencing pattern for future cascade migrations: when a single migration has multiple destinations, sequence destinations-first then source-last so the source's routing remains accurate at every intermediate state.

Cascade-plan Session 4b closed.

---

*End of bridge.*
