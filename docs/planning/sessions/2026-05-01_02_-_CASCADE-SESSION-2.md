# Cascade-plan Session 2 — closing bridge

**Date:** 2026-05-01
**Session type:** Entity-`CLAUDE.md` authoring, batch 1 — Hub substantive plus stubs across products and studios.
**Predecessor bridges:** [`2026-05-01_01_-_CASCADE-SESSION-1.md`](./2026-05-01_01_-_CASCADE-SESSION-1.md) (Session 1 closure recommending Session 2 as next), [`2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md`](./2026-04-27_01_-_AGENT-CONTEXT-CASCADE-PLAN.md) (cascade plan whose Decision 4 sequenced this session).
**Status:** Closed. Two commits landed locally; bridge to be committed separately. Push timing covered below.

---

## Status

Session 2 of the cascade plan is complete. The cascade now has its first entity-level `CLAUDE.md` (Hub, substantive) plus minimal stubs at every active products-and-studios entity directory. Sessions 3 and 4 can proceed against named, canonical structure for everything in the products and studios tiers; Session 3 inherits the locked stub shape from this session, Session 4 inherits the Hub file as the migration destination.

The session executed two planned authoring commits with no in-session deviations and no stop-and-fix corrections. Both landed cleanly with reviewable diffs. The plan-back / surface-draft / dry-run-then-commit rhythm held without surprises through this session's authoring. Restrained framing — the absence of surfaced inconsistencies is appropriately small evidence at one application session, not a methodology claim.

The branch is two commits ahead of `origin/main` from this session, ten ahead total counting Session 1's seven that were closed but not pushed.

## What landed

Two commits in dependency order:

| Commit | Subject | Concern |
|---|---|---|
| `367a3f3` | `docs(hub): author entity CLAUDE.md with Hub-specific rules` | First substantive entity-level `CLAUDE.md` in the cascade. Authors the destination for the five G-30-named Hub-specific rules (`useAuth()` server-component failure, `refreshNavigation`, `proxy.ts`, `sb_publishable_*` key format, realtime-channel narrowing). The rules remain at tier and root level until Session 4's migration. |
| `d72f7b8` | `docs(entities): add minimal CLAUDE.md stubs for active products + studios` | Five mechanical stubs (Gimbal, Game, Journey Studio, Universe Studio, Arc Studio). Single logical concern (active-entity-no-spec-no-rules-locked); single commit per Session 1's "one logical concern" discipline. Sub-entity stubs for `gimbal/ios/` and `gimbal/android/` deferred per Decision 2. |

The two planned authoring commits each touch one logical concern and read independently. No stop-and-fix commits this session — Session 1's "expect latent inconsistencies during execution" Observation 1 did not fire here, partly because Session 2's substance was application of Session 1's locked decisions rather than authoring new structural rules.

## What was decided during the session

Six decisions made during the session that future sessions should know.

**Sub-entity stubs for `gimbal/ios/` and `gimbal/android/` deferred.** The cascade plan's Decision 4 enumerated table listed these as Session 2 stubs. Decision 2's principle ("opt-in by divergence; not authored speculatively") read in tension with that table's enumeration: Gimbal has no codebase, no specification, no rules — there is nothing to diverge from, let alone divergence sharp enough to warrant a sub-entity file. The judgment: when Decision 4's enumerated table conflicts with Decision 2's principle, the principle governs. Recorded in Gimbal's `CLAUDE.md` as a deliberate deferral ("considered and deferred per Decision 2"), not as a TODO — TODOs invite speculative stubbing; recorded deferrals invite deliberate revisits at the right moment (Gimbal's L2 specification or first iOS/Android code, whichever is sooner). This is the canonical precedent for any future session facing a Decision-2-vs-Decision-4 conflict shape: the principle governs.

**Hub's `CLAUDE.md` deliberately omits a verticals section.** All four populated tier `CLAUDE.md` files (products, platform, studios, design-system, verticals-tier) carry a "Verticals: obligations on this tier" section because every tier has tier-specific verticals obligations. Entity files only need them when the entity diverges from tier within a vertical. Hub doesn't, today. Restating the heading with no delta would violate "monotonically informative" per the cascade policy. The five-row content policy table itself is silent on whether entity files conditionally include a verticals section; that policy-text gap is flagged for a future cascade-policy refinement (see "Open questions / risks" below). The same omission logic applied to all five stubs and is now the default for entity files at this point in the cascade.

**Sibling-entities and relevant-skills lines omitted from stubs.** Hub's substantive file carries both lines because they are operative — Hub has rules with cross-product implications and `FEAT-H*` work that genuinely routes to a specific skill. Stubs have neither. Including the lines for shape-symmetry-with-substantive-files would be empty repetition: shape-symmetry-without-content is exactly what the "monotonically informative" principle exists to prevent. The tier file's "Where to go next" already enumerates siblings one click away; the load-order's skill step already routes to the matching skill. Stubs keep only what is genuinely operative even in stub state — feature ID prefix and the tier-file pointer.

**Hub file uses a back-reference pattern between Rules and Gotchas for rules with both architectural-commitment and operational-consequence dimensions.** `proxy.ts` and the realtime-channel narrowing both belonged in "Rules that only apply at this entity" (commitment side) and in "Gotchas" (consequence side). Drafting initially landed both rules in both sections; the surface-draft-for-review cycle caught the duplication and prompted the consolidation. Resolution: keep the architectural commitment in Rules (where the entity-specificity rationale also lives), and replace the Gotchas mention with a one-line back-reference plus any consequence-flavored content that Rules doesn't carry. Asymmetric back-reference lengths are correct — `proxy.ts`'s back-reference is one line because Rules already carries the why; the realtime back-reference is two sentences because the consequence (third-channel-attaching-to-a-table breaks "no table reads") is genuinely additive. The pattern is flagged as a candidate methodology observation below; one instance is not yet a pattern.

**The locked stub shape is now established.** Header block (title, applies-to, load-order, "reads as a delta" statement); "Status" section with two paragraphs (entity state + cascade state); "Where to go next" section with two pointers (feature ID prefix + tier file). Deliberate omissions: no "What makes this entity different," no Rules section, no Gotchas section, no verticals section, no relevant-ADRs line, no relevant-skills line, no sibling-entities line. Per-entity variations are deliberate-and-named in commit `d72f7b8`'s body. Session 3 inherits this shape rather than re-deriving it.

**Surface-for-review threshold calibrated to "judgment-heavy or shape-locking-for-downstream-inheritance."** The Hub draft, the revised Hub draft, the locked stub shape, and this bridge were surfaced for review before commit; the five stubs themselves were not (mechanical application of the locked shape, comparative-read-before-commit was sufficient internal discipline). Calibrations about communication discipline are decisions, not methodology observations — methodology observations are about the work; this is about the interaction shape. Session 3 may need to recalibrate if its verticals + platform sub-tier work has different judgment-density. If Session 3 applies the same calibration without explicit instruction, the calibration generalises; if it defaults to surface-everything or surface-nothing, the calibration was Session-2-specific and worth re-deciding session-by-session.

## Findings worth registering

Two findings from this session — distinct from methodology observations because both have natural retirement conditions baked in.

**Finding 1 — The five-row content policy is silent on verticals-section conditionality at entity level.** The policy's "must contain / may contain / must not contain" rows for entity level address rules-and-gotchas categorisation but do not name whether the verticals section is conditional on entity-specific divergence from tier. Session 2 applied a conditional rule (omit unless the entity diverges) consistently across Hub and the five stubs, but the rule lives only in this bridge and in two commit bodies. A future entity-file author who wants to verticals-symmetrize for shape consistency has no policy text to consult. Worth one line in either root `CLAUDE.md`'s policy table or in `ecosystem-decomposition`'s "Agent context cascade" section. Either home is defensible — root `CLAUDE.md`'s policy table for canonical-rule status, the skill section for full-mechanism context. Future cascade-policy refinement work picks one; not Session 2's call.

**Finding 2 — Inbound-cross-reference sweep is needed during Session 4's tier-and-root-to-Hub migration.** When the five Hub-specific rules migrate out of `docs/products/CLAUDE.md` and root `CLAUDE.md`'s Architecture section into `docs/products/hub/CLAUDE.md`, every inbound cross-reference to the migrated rules needs to be updated atomically. Known instances: `SPECIFICATION.md` §L2 §3 (currently points at `../CLAUDE.md` Gotchas for `useAuth()`; post-migration should point at `./CLAUDE.md`), `SPECIFICATION.md` §L2 §4 (same shape for `refreshNavigation`), `AGENTS.md`, root `CLAUDE.md`'s Architecture section (which mentions `useAuth()`, `proxy.ts`, and `refreshNavigation` inline), and any skill files that reference the rules. Session 4's migration grep should look broadly rather than enumerate the list above; the enumerated list is a starting set, not a complete inventory. Recorded in Hub commit `367a3f3`'s body and now elevated here so it is findable from the bridge index without requiring readers to dig through commit messages.

## Methodology observations — two flagged candidates, deliberately not elevated

Two candidates surfaced this session, neither yet elevated. Each names its second-instance test explicitly so elevation is a falsifiable bet rather than informal lore. Per Session 1's discipline ("methodology observations earn elevation through second-instance evidence, not through compelling-on-first-instance rhetoric"), these are flagged for future sessions to either elevate or let fall away.

**Candidate A — Back-reference pattern between Rules and Gotchas in entity files.** When a rule has both an architectural-commitment dimension and an operational-consequence dimension, keep the commitment in "Rules that only apply at this entity" and replace the Gotchas mention with a one-line back-reference (plus any consequence-flavored content that Rules doesn't carry). The pattern surfaced once in this session — Hub's `proxy.ts` and realtime-channel-narrowing rules. **Second-instance test:** Session 4's migration commits will move five rules into Hub's file. If the same commitment-in-Rules / consequence-as-one-line-back-reference-in-Gotchas split is the natural shape for `useAuth()`, `refreshNavigation`, and `sb_publishable_*` as well, the pattern holds across migrations of distinct rule kinds (React idioms, framework facts, Supabase facts) and is worth elevating to a named methodology observation in Session 4's closing bridge or as an `ecosystem-decomposition` skill edit. If the pattern only fits the two rules where it currently sits and forces awkward shapes for the others, the candidate falls away as a one-off rather than a generalisable pattern.

**Candidate B — Categorization-rationale-in-file as a discipline.** When a categorization could plausibly be challenged by a future author who doesn't read git history (and they won't), the rationale belongs in the file itself, briefly — not just in the commit body. `proxy.ts`'s entity-specificity rationale ("this rule is Hub-specific because Gimbal will not run Next.js, not because the rule is 'obviously about Hub'") is locked in Hub's `CLAUDE.md` itself. `sb_publishable_*`'s equivalent rationale lives only in commit `367a3f3`'s body — a less robust placement, deliberately not upgraded in Session 2 because doing so would re-open Hub's file's surface area for a marginal gain. **Second-instance test:** Session 4 migrates `sb_publishable_*` into Hub's file. At that point the question becomes whether to upgrade its rationale to in-file. If Session 4 does upgrade, and any other rule arriving in an entity file in the future also gets its rationale recorded in-file rather than commit-body-only, that is two instances supporting the discipline as a generalisable pattern — elevate. If Session 4 chooses commit-body-only and the pattern stays a one-off (`proxy.ts`), the candidate falls away.

Naming the second-instance test up front turns elevation into a bet a future session can either confirm or retire deliberately. Without the named test, candidates accumulate as informal lore that nobody knows how to retire.

## Predicted-and-held outcomes

Honest count of "the discipline is working" evidence from this session, framed restrainedly.

- **Arc Studio's Urd-scope caveat held to one sentence** as predicted in the plan-back to Stefan, did not grow into a paragraph that would have justified splitting the stub commit. The wave-state sentence pattern absorbed the caveat cleanly.
- **The five stubs' variation table held during authoring** without surprises. The comparative-read-before-commit found no deviations from the predictions in the plan-back. Predictions made before authoring were correct against execution.
- **Session 1's plan-back-then-execute rhythm was applied with the same care this session and surfaced no latent inconsistencies.** Session 1's Observation 1 explicitly framed surfacings as a normal mode of execution; their absence in an application session is expected, not evidence the rhythm doesn't fire when it needs to.

## What this session did NOT do

- **No tier-`CLAUDE.md` content audit or migration.** That is Session 4. Session 2 authored the destination (Hub's `CLAUDE.md`) so Session 4 has a target for the five Hub-specific rules currently at tier and root level.
- **No verticals or platform sub-tier `CLAUDE.md` authoring.** That is Session 3. The Session 1 bridge's "(where appropriate) verticals" loose phrasing was resolved in favour of the cascade-plan's enumerated sequencing — verticals + platform sub-tier in Session 3.
- **No cascade-policy-text refinement.** Finding 1's verticals-section conditionality gap is flagged but not fixed.
- **No push of Session 1's commits or Session 2's.** Push timing covered below; Session 1's deferral was right at the time but is now used up.
- **No `doc-health-check` Section 7 registry population.** Session 1's bridge anticipated this would happen during Sessions 2 and 3 for "imminently expected" placeholders. The entities Session 2 touched all received real `CLAUDE.md` files (substantive or stub); none became "imminently expected placeholders." Section 7 population is genuinely Session 3's concern (verticals and platform sub-tier directories become imminently expected once Session 2 lands).
- **No edit to the cascade-plan bridge or to Session 1's closing bridge.** Bridges are permanent records; this closing bridge is the audit trail for any Session 2 deviations from prior bridges' framings.

## Push timing — discretion is now used up

Session 1's closing bridge framed push as "Stefan's discretion." That was the right framing at the time — Session 1 was the foundational mechanism, and the conservative default of holding the push gave one more inspection point before things went canonical. That justification is now used up. Session 1 closed cleanly, the cascade-plan held under execution in Session 2, and holding the unpushed commits back further creates an asymmetry where Session 3's reading list cites paths (the Hub file, the five stubs, the cascade policy in root `CLAUDE.md`) that aren't yet on origin/main. Future-Stefan or future-Claude reading through origin/main to orient would see the cascade-plan bridge committing to a five-row policy that isn't there until they scroll back through unpushed commits — small papercut, real one.

The push pattern for this session: push the ten substantive commits (Session 1's seven plus Session 2's two) when this bridge's draft has been reviewed; commit this bridge separately and push it on its own afterwards. Bridges sometimes surface things during their own writing; one cycle of "sleep on it" before this bridge becomes permanent record is cheap insurance against an "amended" or "fixup" trace on something already public.

This is not criticism of Session 1's deferral. Session 1's deferral was right then; pushing now is right now. The two facts are coherent across time, not contradictory.

## Open questions / risks

- **Verticals-section conditionality not in policy text.** Finding 1 above. Session 4 is the natural place for the policy refinement if the gap surfaces during the migration audit; otherwise a separate cascade-policy refinement pass.
- **Five-row policy table source-of-truth drift.** Carried forward from Session 1's bridge unchanged. The canonical five-row table lives in root `CLAUDE.md`; the skill files reference it without restating. `doc-health-check` Section 9's load-order integrity check is the cycle-boundary verification mechanism. Session 2 added five new files referencing the policy; the cross-reference surface area grew but the source-of-truth count is still one. Worth a deliberate spot-check on the next cycle-boundary doc-health run.
- **Sub-entity precedent application.** The deferral of `gimbal/ios/` and `gimbal/android/` is now the canonical Decision-2-over-Decision-4 precedent. Session 3 and Session 4 may face other Decision-4-enumeration-vs-Decision-2-principle conflicts as they execute. The principle governs in those cases too; the precedent is the audit trail.
- **G-29 (entity-`CLAUDE.md` coverage) remains unresolved.** Session 2 authored entity `CLAUDE.md` files for every active products-and-studios entity. The gap's underlying motivation — that no entity-level `CLAUDE.md` existed anywhere — is empirically reduced; the gap entry stays in `gaps.md` because resolution requires Session 3 (verticals + platform sub-tier) and the platform-core / platform-domain entity directories being instantiated as L2 work in some future session. Per `gaps.md`'s discipline ("when a gap is resolved, delete its entry here"), G-29 is deleted only when fully closed; the partial reduction is an intermediate state without a label. Worth surfacing here so a future reader of `gaps.md` doesn't see G-29 still listed and assume Session 2 didn't deliver against it.
- **Surface-for-review calibration generalisability.** Decision 6 above. Worth watching during Session 3 — does the calibration ("judgment-heavy or shape-locking-for-downstream-inheritance") apply naturally, or does Session 3's substance want different boundaries?

## Notes for posterity

Session 2 was an application session, not a structural-mechanism session. Session 1 set up the cascade structure; Session 2 instantiated it for the products and studios tiers. The shape of the work was different — less authoring of mechanism, more applying of locked decisions — and the failure modes were different too. Session 1 surfaced a latent inconsistency (four-row → five-row). Session 2 surfaced none, partly because the locked decisions held, and partly because the discipline that would catch them (plan-back → surface-draft → dry-run → commit) was applied with the same care.

The locked stub shape, the verticals-omission default, and the back-reference pattern in entity files are all small structural decisions that compound. Session 3 inherits all three. Session 4 inherits the migration target (Hub's file) and the inbound-cross-reference-sweep watch-point. The cascade is now structurally complete through products and studios — every active entity has a `CLAUDE.md`, the locked stub shape is established, Hub's substantive file authors the destination for migration. The operational efficiency Session 1's load-bearing case anticipated (a sub-agent in Hub loading only its own rules) arrives when Session 4's migration moves the five Hub-specific rules out of tier and root and into Hub's file. Sessions 3 and 4 extend the structural completeness to the full cascade and complete the migration that makes it operational.

Cascade-plan Session 2 closed.

---

*End of bridge.*
