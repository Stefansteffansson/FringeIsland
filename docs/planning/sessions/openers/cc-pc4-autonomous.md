# Autonomous L1→L3 session-opener — `PC-4 Governance`

**Instance authored:** 2026-05-15
**Authored from template:** [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md) (most-recent-touch commit `4646655`)
**Entity type:** Platform Core area (entity 4 of 4 in Platform Core; final Phase 2 entity)
**Predecessor bridge (chronological — tip-check anchor at §1 Check 3):** [`../2026-05-15_02_-_PC3-AMENDMENT-LANDED.md`](../2026-05-15_02_-_PC3-AMENDMENT-LANDED.md) (commit `af07206`)
**Predecessor bridge (substantive — derivation authority for Step 1 carry-forward):** [`../2026-05-14_02_-_PC3-STEP3-LANDED.md`](../2026-05-14_02_-_PC3-STEP3-LANDED.md) (commit `172ecd9`)

> Per-instance session-opener for the autonomous CC run executing PC-4 Governance L1→L3 derivation, end-to-end. **First instance of the autonomous L1→L3 template** (PC-1, PC-2, PC-3 all pre-dated it; their closing bridges remain authoritative substance inputs, but the template itself has never been exercised against a live derivation before this run). Three-step shape: cold derivation → code-informed stress-test → adjudication. At session-open, the autonomous CC reads this file as its first action and proceeds from §1.

---

## §1 Pre-flight checks — STOP

Before any state-read or substantive action, run all five checks. Hard-fail on any deviation; report findings and wait for the human's adjudication before proceeding.

1. **Working directory.** Run `pwd`. Expected: `/d/WebDev/GitHub/FringeIsland` (or equivalent Windows-style absolute path resolving to the same location). Hard-fail if otherwise.
2. **Current branch.** Run `git branch --show-current`. Expected: `main`. Hard-fail if otherwise.
3. **Tip commit.** Run `git log --oneline -1`. Expected: tip at or after `af07206` (the PC-3 amendment closing-bridge commit). Hard-fail if tip is earlier. (Tip may be later — STATUS.md amendment commits + template-revision commits + opener-authoring commits may sit between `af07206` and session-open; any of those are acceptable.)
4. **Working tree state.** Run `git status`. **Expected modified-unstaged carry-forwards (named explicitly per PC-3 amendment §13 revision candidate #1 — Check 4 enumeration completeness):**
   - `CLAUDE.md` (pre-existing across sessions; context-mode plugin injection; outside scope; acceptable)
   - `docs/planning/sessions/openers/cc-execute-prompt.md` (pre-existing carry-forward; outside scope; acceptable)
   - No other modifications. No untracked files in `docs/platform/`, `docs/architecture/decisions/`, `docs/planning/sessions/`, or `docs/platform/core/governance-specification.md`'s parent directory. Hard-fail on any other modification or untracked file.
5. **Autonomous template at expected baseline.** Run `git log --oneline -1 -- docs/templates/autonomous-l1-l3-session-opener.md`. Expected: most-recent-touch at `4646655` or later. Hard-fail if earlier (template missing or rolled back). **Soft-flag if later** (template has been revised between opener-authoring and session-open) — surface the delta and adjudicate before proceeding; the opener instance was substituted against the `4646655` baseline and may need re-reading against the revised template.

After all five pass, report each check's outcome and proceed to §2.

---

## §2 State-read pass (ordered)

Read these files in order. Stop at any point if a read fails or content diverges materially from what's described; surface and wait for adjudication.

**Chronological vs substantive predecessor distinction.** Two predecessor bridges play different roles in this opener:
- **Chronological predecessor** is the PC-3 amendment closing bridge (`af07206`). Its role is the tip-check anchor at §1 Check 3 and the immediate context for what landed on `main` between PC-3 close and PC-4 entry. Its substantive content (D3 fold-back at PC-3, P-O1 citation augment-in-place, SS-11 update) does not feed PC-4 derivation directly — those findings have been folded into the PC-3 canonical spec and inherit into PC-4's authority chain via the amended PC-3 spec at `058d9e5`, not via this bridge.
- **Substantive predecessor** is the PC-3 closing bridge (`172ecd9`). Its §Pickup lists → PC-4 Governance section is the load-bearing carry-forward block for PC-4's derivation. Its A-candidate ledger snapshot is the baseline for §8 below.

Reads in this order:

1. **`docs/planning/sessions/2026-05-15_02_-_PC3-AMENDMENT-LANDED.md`** — chronological predecessor. Primary read for the chronological hop; substance is informational (cite for `058d9e5` spec amendment context, then proceed).
2. **`docs/planning/sessions/2026-05-14_02_-_PC3-STEP3-LANDED.md`** — substantive predecessor. **Load-bearing.** §Pickup lists → PC-4 Governance, §A-candidate ledger snapshot at PC-3 close, §Discipline posture for PC-4 entry session, and §Session-open prompt for CC are the authority inputs.
3. **`docs/planning/sessions/2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`** — Experiment B comparison-phase bridge; *load-bearing for autonomous discipline carry-forwards*. Sections "Substance findings — where the two tracks diverge", "Methodology findings", and "Dispositions" are the durable inputs. The §Carry-forward to PC-4 entry section names the Step 2 disk-evidence scope expansion this run inherits.
4. **`docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`** — PC-2 entity bridge; still authoritative for cross-entity findings and Q6 deferred-amendment routing. Note: PC-2 amendment landed at `f715c70` (closing bridge `2026-05-15_01`); Experiment A's 10 findings are folded; cross-entity-finding shapes still apply.
5. **`docs/planning/sessions/2026-05-04_01_-_PC1-L1-L3-COMPLETE.md`** — PC-1 entity bridge; Finding #4 two-tier centralization channel and Finding #3 `admin_audit_log` routing. **Finding #3 is the canonical PC-4 inheritance** for `public.admin_audit_log` ownership — read at full anchor specificity.
6. **`docs/platform/core/organisation-specification.md`** — PC-3 canonical spec at commit `058d9e5` (post-amendment). Shape reference and authority for the PC-3 carry-forward block named at §3 below. Note especially §L3 Step 2 C3-5 (rebuild-migration table enumeration with `admin_audit_log` named) and §L3 Step 3 amendment-time block (D3 outcome (a) rationale, SS-21).

Then verify against disk per the disk-of-record discipline (§6 below):

- Spec at `docs/platform/core/governance-specification.md` — confirm does NOT yet exist (the autonomous run creates it). If it exists, hard-fail and surface — the run cannot proceed against an unexpected pre-existing spec.
- ADRs in `docs/architecture/decisions/` referenced by the predecessor bridges — confirm presence and amendment state as described (ADR-U006 at `edf72d3`; ADR-U007 at `3697732`; ADR-U018 at `dd84a02`).
- Entity-level CLAUDE.md at `docs/platform/core/governance/CLAUDE.md` — confirm does NOT yet exist (autonomous run creates the directory + the file). PC-3 precedent: `docs/platform/core/organisation/CLAUDE.md` exists; same shape for PC-4.
- This session-opener instance file existence at its landing path (`docs/planning/sessions/openers/cc-pc4-autonomous.md`).
- PC-3 canonical spec at `docs/platform/core/organisation-specification.md` reflects commit `058d9e5` amendment-time block (D3 outcome (a) fold-in, P-O1 augment-in-place at three anchors, SS-21).

---

## §3 Authority chain for cold derivation

The authoritative inputs for Step 1 are exactly these — no more, no less:

- **L1:** root `CLAUDE.md` + `docs/platform/CLAUDE.md`
- **Sub-tier:** `docs/platform/core/CLAUDE.md`
- **L2 inventory line:** `- **Governance (PC-4)** — DeusEx, audit, moderation, platform rules` (from `docs/platform/core/README.md` line 12)
- **Architectural authority:** ADR-U023 (Platform Core / Domain Services decomposition) + ADR-U006 (universal group pattern, post-PC-3 amendment) + ADR-U007 (three-layer permission model, post-PC-3 amendment) + ADR-U018 (typing vs growth-vocabulary, post-PC-3 amendment) + any ADR specifically constraining governance (audit / moderation / DeusEx surfaces)
- **Template:** `docs/templates/platform-core-spec.md`
- **Predecessor carry-forward block (entity-specific, named at §5a below):** PC-3 closing bridge §Pickup lists → PC-4 Governance + Experiment B comparison-phase bridge §Carry-forward to PC-4 entry + PC-3 amendment closing bridge §Pickup lists → PC-4 entry pickup

**Cold-derivation discipline.** Do *not* read `supabase/migrations/`, `lib/`, `app/`, `tests/`, `proxy.ts`, `next.config.ts`, or any existing `FEAT-*` files during Step 1. The candidate L3 inventory is derived from L1 + L2 + ADRs + carry-forward priors only. Step 2's stress-test pass is the structural mechanism for grounding the candidate against disk reality; sourcing capabilities from disk at Step 1 contaminates derivation and breaks the three-step pattern.

---

## §4 Three-step work shape

PC-3 ran as a split-session (Steps 1+2+3 across three sessions). PC-1 and PC-2 ran single-session. This autonomous run may take either shape; the template is shape-agnostic. What's required is that all three steps land, in order, with the checkpoints below. Recommendation for PC-4: shape per the run-time judgment of the autonomous CC against scope at §5a checkpoint; default to single-session if §5a checkpoint surface shows scope comparable to PC-1/PC-2 (which were single-session); split if scope matches PC-3 (which was three-session).

---

## §5a Step 1 — cold derivation

**Activity.** Author the candidate L3 inventory from upstream authority only. Write to `docs/platform/core/governance-specification.md` the L2-owned sections (§1–§8 per the platform-core-spec template) and the L3-owned capability inventory + dependency chain + external dependencies + Sources-status block.

**Carry-forward priors** — held actively throughout cold derivation:

- **P-O1** — *Cold derivation drifts toward Supabase-canonical actor primitives where this repo overrides.* The actor primitive in this repo is `get_current_personal_group_id()` (a four-hop chain through `auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`), NOT `auth.uid()` directly. Flag any §3/§5/§6 prose that drifts toward `auth.uid()` as actor primitive and correct in place at Step 1 if the drift is structural, or surface at Step 2 for adjudication if subtle. **PC-3 amendment commit `058d9e5` cites P-O1 at three anchors (§3 SQL helpers, §6 actor-primitive partition, §L3 capability "Personal-group actor primitive" row) — read those for the augment-in-place shape PC-4 inherits.**
- **D7** — *Role-name vocabulary canonical artifact is named-constant lookup table (TEXT-keyed), not a PostgreSQL ENUM.* The four FringeIsland role names (Steward, Guide, Member, Observer) live as TEXT values in `role_templates`. Cold derivation should pin this at §5 storage if PC-4 touches role-name resolution.
- **X3** — *Signature drift between ADR text and disk is a recurring class of finding.* Where this entity's §6 references function signatures from ADRs (e.g. `is_platform_admin()`, any audit-write functions), record both the ADR's documented signature and the expected disk signature; Step 2 settles the actual disk signature, Step 3 routes any drift to an ADR amendment.
- **X5** — *Service-role escalation is open-coded across multiple sites; two-tier centralization framing applies.* Gap A (substrate — service-role client construction) and Gap B (auth-flow plumbing — JWT-verify + profile-resolve) are distinct centralization decisions; both are PC-1 Finding #4's channel. **PC-4 governance scope very likely surfaces service-role-using code paths** (admin-tier operations are the canonical X5 territory); route findings into the two-tier framing.
- **Finding #4** — *Secrets/credentials substrate is app-tier, not database-tier.* If PC-4 surfaces app-tier substrate adjacent to secrets or credentials, route to Finding #4's Phase-2 close-out / candidate ADR / tier-shape revision channel — do not re-derive a separate escalation path.

**Entity-specific priors (from the carry-forward block named at §3):**

- **admin_audit_log ownership** — PC-1 Finding #3 confirmed at full disk-anchor specificity at PC-3 Step 2 C3-5: `public.admin_audit_log` table + audit-content schema + access policies route to PC-4; PC-1 retains trigger-as-primitive. The rebuild migration crosses PC-1/PC-3/PC-4/DS-* boundaries (18 tables in one 2,223-line artifact). **§2 Concepts and §5 Storage should explicitly claim ownership of `admin_audit_log` at Step 1.** Step 2 verifies disk against the cold ownership claim.
- **DeusEx vocabulary grandfathering containment** — PC-3 §L3 Step 3 Q9 resolution (b): DeusEx vocabulary layer-bounded (schema-tier + admin-helper-tier; absent from API-route layer). PC-4 §3-confirm DeusEx vocabulary stays at admin-helper-tier (no PC-4-tier propagation expected per PC-3 Step 2 C3-4). **§3 contract surface should §3-confirm DeusEx vocabulary containment** rather than expanding it to a PC-4-tier surface.
- **Service-role governance soft-edge** — optional carry per PC-1 Finding #5: if PC-4 surfaces admin-tooling secrets or service-role escalation patterns, route to Finding #4 channel.
- **`handle_new_user` cross-seam check** — PC-2/PC-3 accept-seam stands; PC-4 §6 / §5 confirms no new cross-seam triggers introduced by Governance (admin operations are SECURITY DEFINER RPCs, not triggers).
- **`group_role_permissions` naming drift** — PC-3 amendment closing bridge §Pickup lists → PC-4 entry pickup: cold-derived `role_permissions` (PC-3 §5) vs disk-canonical `group_role_permissions` (PC-3 §L3 Step 2 C3-5) naming drift. Surfaced mid-fold-back at PC-3 amendment; routed to PC-4 entry or doc-health-check. PC-4 should §3-confirm naming alignment for any tables it owns or references; if PC-4 references the PC-3 permission table, use disk-canonical naming. (This is an inherited disposition, not a PC-4 capability surface; surface if PC-4's contract surface touches it.)
- **Multi-role memberships (D3)** — **RESOLVED at PC-3 amendment** (commit `058d9e5`, D3 outcome (a) PC-3-relevant slice folded at §2 + §5 + §L3). PC-3 owns the multi-role-per-membership semantic via `public.user_group_roles` composite-PK junction; PC-4 inherits no governance-shape from D3. Prior retained as historical record of cross-track surfacing at Experiment B comparison phase; no live application at PC-4 cold derivation.

**Watches armed at Step 1:**

- **A-candidate #9** — *Framework-provided contract mechanisms are invisible to cold derivation.* Before declaring the entity's contract surface at §3 / §7, explicitly check for framework-provided mechanisms (PostgREST RPC for `admin_*` orchestration RPCs especially; Next.js Server Actions; etc.). If the cold position is "speculative third shape" because the contract surface is unclear, flag for Step 2 verification rather than commit to a placeholder. **#9 was ratified at Experiment B comparison phase via convergent evidence; PC-4 is the first cross-entity recurrence test** (DS-* was the original ratification target, but PC-4 recurrence within Platform Core is the closer test).
- **Hypothesis pruning trade-off.** Prior-loaded context (this template, the carry-forwards above) reduces speculative-third-shape generation — useful, but with a cost. PC-3 manual-side did not generate a group-hierarchy hypothesis because of prior-loading; PC-3 autonomous side did, and cleanly disconfirmed it at Step 2 (a clean PW-2 instance). PC-4 should NOT over-prune speculative hypotheses at Step 1 just because priors are loaded. If a structural shape feels plausible but cannot be confirmed from upstream alone, write it down as a §8 question with PW-2-style "speculative as third shape" tagging; Step 2 will resolve.
- **L2-line altitude.** Stress-test the entity's L2 inventory line at the start of Step 1 — `- **Governance (PC-4)** — DeusEx, audit, moderation, platform rules`. Does any item read as domain-scope, or is one item missing that would be a domain-agnostic primitive? Record at §L3 sources-status if the line wants revision; the revision itself happens at Step 3.

**Step 1 checkpoint surfacing.** After the candidate spec is composed (§1–§8 + §L3 capability inventory + Sources-status block + dependency chain + external dependencies), pause and surface a structured summary to the human BEFORE the first Write. The summary names: capability count by internal area; the L2-line altitude finding (if any); the §8 open questions count; any prior carry-forward whose application was non-obvious; any speculative-third-shape hypothesis tagged for Step 2; any drift from the template that the entity's substance required. Wait for ratification before Write.

**Single-Write vs split-Edit at Step 1.** Single Write of the full spec is preferred for autonomous runs (per PC-3 autonomous-track precedent: one commit, 539 lines). If multi-Edit work is needed, sub-batch-of-1 cadence applies (see §6). **A-candidate #5 ratification watch:** sub-batch-of-1 on a fresh entity is the ratification candidate; if this run uses single-Write, frame at §13 that A#5 was sidestepped (not falsified) and the ratification awaits a future multi-Edit run.

---

## §5b Step 2 — code-informed stress-test pass

**Activity.** Open existing artifacts as adversarial input. Compare candidate against artifacts. Produce a structured delta in three classes (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity findings) and surface phase-wide observations.

**Direction of authority preserved.** Code stress-tests the candidate. Code never sources the candidate. Updates to the candidate happen only where the architecture *agrees* with the disk-evidence finding, never because the code says so. Code that has no architectural home becomes a Class 3 cross-entity finding, not a capability added to this entity's inventory.

**Step 2 disk-evidence scope** — load-bearing per the Experiment B comparison-phase methodology finding (which named scope-of-disk-reading as the central differentiator between manual-track and autonomous-track outputs). This run MUST read all of the following, organised as clusters with cluster-by-cluster surfacing (see "Step 2 cadence" below):

- **Canonical-table reads.** `supabase/migrations/` in cumulative-forward order (per A-candidate #8 — cumulative-forward read order surfaces mid-stream retractions that single-snapshot reads miss). Read every migration that touches PC-4's tables (especially `admin_audit_log` and any moderation / governance-policy tables), functions, RLS policies, or triggers; trace forward from earliest to latest.
- **Migration archeology.** `supabase/migrations/archive/` for retired migrations relevant to PC-4. The D15 monolithic rebuild commit (`ce58227`) absorbed 71 prior migrations; pre-rebuild migrations live in archive only. Archeology surfaces the entity's lineage and any asymmetric-recovery findings (P11-class: things lost during consolidation, not recovered). **Particularly relevant for PC-4:** the P11 archeology cluster pickup at PC-3 close named role-template-related table losses; PC-4 should record whether any governance-related artifacts were lost in the rebuild.
- **Framework-mechanism evidence.** `lib/hooks/` (especially any `useAdmin*.ts` / audit-log-related patterns) and `lib/utils/supabase/` (`client.ts`, `server.ts`, `middleware.ts`) — these reveal what the published contract surface actually is at the framework level, independent of any custom API routes. PostgREST RPC as canonical public HTTP API surface was the load-bearing PC-3 finding here; A-candidate #9's recurrence test fires here for PC-4.
- **Admin orchestration.** `lib/admin/` — admin-tier helpers, callerUserId / sentinel-UUID / literal-NULL calling conventions, service-role construction patterns. **`lib/admin/` is PC-4's home territory** — the deepest disk-evidence-scope cluster of this run; allocate proportional time.
- **createClient survey.** `app/api/*` survey of every `createClient` instance. PC-3 found 5 sites / 6 instances (5 service-role-using routes, one with 2 createClient calls). Per-route survey: which permissions gate the route, what business logic justifies the custom route over PostgREST RPC, whether the auth-flow plumbing is duplicated. **The three permissions PC-3 surfaced as gating X5 routes — `invite_members`, `enroll_group_in_journey`, `manage_all_groups` — are PC-3-permission-table-rows but X5-instances of governance-tier routes; PC-4 may surface additional admin permissions gating additional X5 routes.**
- **Type drift.** `lib/types/*` — drift between TypeScript type definitions and disk reality (often by omission rather than commission; PC-3 found `display_preference` aligned but `group_type` / `status` missing from `lib/types/group.ts`). Check `lib/types/admin*.ts` and any audit-log-related types if they exist.
- **Mop-up greps.** For each disk-anchor pattern surfaced in cold draft, run targeted greps to confirm enumeration scope. Per SS-16 / SS-17 discipline (enumeration-claim-scoping): state the patterns searched + report scope as "no hits within [patterns]" rather than "no hits anywhere."

**Step 2 cadence — cluster batch-and-report.** PC-3 introduced cluster batch-and-report at Step 2 (vs PC-1/PC-2 single-pass). It worked. Recommended for this run:

- Open one cluster at a time (e.g. Cluster A = migrations 1–6 at first date range; Cluster B = migrations 7–11 at second date range; Cluster lib-1 = `lib/hooks/` + `lib/utils/supabase/`; Cluster admin-1 = `lib/admin/`; Cluster api-1 = `app/api/*` createClient survey).
- After each cluster, compose findings against the candidate spec and surface the cluster's three-class output (Class 1 confirms / Class 2 entity-internal deltas / Class 3 cross-entity findings) BEFORE opening the next cluster.
- Cluster-by-cluster surfacing is the autonomous-run substitute for the bouncing-partner cycle's per-cluster ratification — it produces a structured pause that catches retractions early.

**Two retractions to watch for, both surfaced at PC-3 Step 2 via the cumulative-forward + framework-mechanism disciplines:**

- **Single-snapshot vs cumulative-forward retraction.** A function or table that "does not exist" in one migration may be defined in a later migration; read cumulative-forward to surface. (PC-3 Cluster A claimed `is_platform_admin()` did not exist; Cluster B's migration 10 defined it — retraction. A-candidate #8 ratified.) For PC-4 specifically: `is_platform_admin()` is squarely in governance territory; check disk against any cold-derived signature.
- **PW-2 retraction via framework-mechanism awareness.** The cold-derived "speculative third shape" for the contract surface may turn out to be canonical when the framework's published mechanism is checked. PostgREST RPC is the canonical PC-3 contract surface; PC-4 admin orchestration may sit on the same canonical surface or on `lib/admin/` helpers — disk-evidence settles.

**Step 2 checkpoint surfacing.** After all clusters land and the §L3 Step 2 block is composed (three-class output + phase-wide observations + Sources-status amendments), pause and surface a structured summary BEFORE the Write. The summary names: total finding counts by class; any retractions of cold positions; any new A-candidates surfaced; whether PW-1 (schema-predates-partition) and any speculative-third-shape hypotheses tagged at Step 1 confirmed or retracted; Step 3 work scope as it emerges from the findings. Wait for ratification before Write.

---

## §5c Step 3 — adjudication

**Activity.** Resolve §8 open questions, author the §L3 Step 3 block, apply spec amendments to §3/§5/§6/§7/§L4 per Step 2 findings, author ADR amendments where Step 3 resolutions warrant, produce pickup lists for downstream entities. Author the closing bridge.

**Required deliverables — not pickup:**

- **Spec amendment.** A combined spec amendment commit landing §L3 Step 3 block + cross-section amendments (per PC-2 + PC-3 precedent). For autonomous single-Write runs, the spec may instead be authored in one Write per §5a + §5b + §5c, with Step 3 outputs included from the start.
- **ADR amendments at entity close.** Per Experiment B comparison-phase disposition #5: ADR amendments are in-scope work, not pickup. PC-3 produced three append-only Option A amendments (ADR-U006, ADR-U007, ADR-U018), one per Q-resolution requiring ADR work. Each ADR amendment is a separate commit with explicit provenance citing the spec commit and the Step 2 disk anchors. Three shape variants are precedented and all legitimate:
  - **THREE-COMPONENT SCOPE** (ADR-U006 precedent): new Implementation commitments section with three named components of implementation.
  - **FOUR-COMPONENT SCOPE** (ADR-U007 precedent): same shape, four components.
  - **THREE-DISTINCTION SCOPE** (ADR-U018 precedent): clarification-of-intent shape codifying three distinctions that were already implicit; introduces a framing paragraph between lead and scope block.
  - Choose by substance — components-of-implementation for adds; distinctions-clarifying-scope for codifying implicit framings.
- **Pickup lists** for downstream entities — at PC-4 close, downstream is Domain Services (DS-1 through DS-7 + Extension System) and Phase 2 close-out. Each pickup entry names the receiving entity, the substance routed, and the disk anchors (commit SHAs + file/line citations).
- **Closing bridge** at `docs/planning/sessions/2026-05-15_NN_-_PC4-LANDED.md` (NN = next available index for the closing-session date; update date if the closing session lands on a different day). Always required regardless of single-or-multi-session run shape (Phase 2 close-out reads it). Intra-session bridges (Step-1-landed, Step-2-landed) are optional and only authored if the run splits across sessions. The closing bridge follows the standard session-bridge template + the additional sections specified in §11 below.

**Fold-back required for canonical runs.** Class 2 entity-internal deltas surfaced at Step 2 must be inline-folded into the final §1–§8 text at Step 3. Do NOT preserve them as-cold-with-deltas-flagged-only-in-Step-2-block (the "preserve-as-cold" shape is a legitimate methodology variant for experiment runs per Experiment B comparison-phase disposition #6, but PC-4 onward are canonical runs — fold-back is required). After Step 3, §1–§8 should read as if the candidate were authored with full disk awareness from the start; Step 2 block documents the journey, §1–§8 documents the destination.

**Step 3 checkpoint surfacing.** Before authoring §L3 Step 3 block, surface the Q-resolution slate to the human (which §8 questions are pre-resolved by Step 2 findings; which need Step 3 disposition decisions; which are deferred or routed downstream). Before drafting each ADR amendment, surface its scope (which Q-resolution drove it; which shape variant; what disk anchors are cited). Wait for ratification at each surface point.

---

## §6 Self-checking discipline — Tripwire #4 substitute

The bouncing-partner cycle in manual-track runs catches a class of errors (oldText stale-context recovery, cross-section anchor confusion, commit-shape under-inspection, OLDFEAT head-truncation) as structural byproduct. Autonomous runs do not have this catch-surface. The Experiment B comparison-phase named this absence as a real risk; the disciplines below substitute structurally for what the bouncing-partner produces ambient.

**Hard rules:**

- **Fresh-read before every Edit; never construct `oldText` from memory.** Second-touch Edits on previously-emitted content fail when in-context memory diverges from disk content. Re-read the file before constructing the `oldText`. The rule applies even when the prior Edit landed in the same session; Tripwire #4 sub-shape "oldText stale-context recovery" came from PC-3 Step 3 Edit 6.5.a where exactly this divergence fired.
- **Structural-inventory-before-defect-assertion.** Before claiming a real defect in composed content (heading-count mismatch, duplicated section, missing reference), do a structural inventory of the composed draft (heading count, sentence count, token-occurrence audit). PC-3 Step 1 logged three false-positives caught this way; the discipline converts a potential full-rebounce cycle into a single-round-trip verification.
- **Enumeration-claim-scoping** (SS-16/SS-17). For any enumeration-based verdict: state the patterns searched and report scope as "no hits within [patterns]" rather than "no hits anywhere." Verdict-scope generalization beyond actually-searched patterns is the SS-17 sub-shape A failure mode; pattern-variant blindness (e.g. missing `INSERT INTO permissions` without schema qualifier when grepping `INSERT INTO public.permissions`) is sub-shape B.
- **Verify-before-asserting on commit-shape claims.** Before claiming a commit's body shape from `git log --oneline`, fresh-read the full commit body with `git log -1 --format=%B <sha>`. `--oneline` is structurally insufficient for shape claims.
- **Cross-section fresh-read before second-touch Edits.** When a Step 3 Edit touches a section that was previously emitted in Step 1 or Step 2, fresh-read the section's current disk state before composing the new Edit. Cross-section anchor confusion (PC-3 Step 3 Edit 4c) came from in-context memory of a section that had been amended off-cycle.
- **Listing commands use explicit counts.** State-read pass commands that list directories use `ls dir/ | wc -l` or full `ls dir/`, never `head`-truncated previews. PC-3 Step 3 caught a near-miss where `ls docs/TMP/OLDFEAT/ | head -3` produced an enumeration-scope claim of "3 files" against a directory of 18.

**Methodology-framing space.** Autonomous runs can reach meta-altitude observations (Experiment A predicted they couldn't; PC-3 autonomous side disproved this — its P-O1 promotion framing was sharper than manual side's). The template does not prescribe how to be sharp, but it makes space for it: surface methodology-framing observations alongside substance findings throughout the run, not only at §13 post-run capture.

---

## §7 Carry-forward priors (named)

The carry-forwards in §5a are restated here in tabular form for quick reference. Each prior has a name, a one-line statement of the pattern, and the source citation for traceability.

| Prior | Statement | Source |
|---|---|---|
| **P-O1** | Cold-derivation drifts Supabase-canonical actor primitive (`auth.uid()`) where this repo overrides (`get_current_personal_group_id()`). | Experiment A bridge (2026-05-04_03) Group C item 8; PC-3 §L3 sources-status; PC-3 comparison-phase bridge promotion; PC-3 amendment commit `058d9e5` three-anchor augment-in-place. |
| **D7** | Role-name vocabulary canonical artifact is named-constant lookup table (TEXT-keyed), not PG ENUM. | Experiment A bridge Group C item 9; PC-3 §5. |
| **X3** | Signature drift between ADR text and disk is recurring; both shapes must be recorded; drift routes to ADR amendment. | Experiment A bridge Group B item 5; PC-3 §6 + ADR-U007 amendment. |
| **X5** | Service-role escalation is open-coded across multiple sites; two-tier centralization framing (Gap A substrate + Gap B auth-flow) applies. | PC-3 §L3 Step 2 C3-2; PC-1 Finding #4 channel reframe. |
| **Finding #4** | Secrets/credentials substrate is app-tier, not database-tier; route to Finding #4 channel rather than re-derive. | PC-1 entity bridge (2026-05-04_01) Finding #4 program-level carry-forward. |
| **~~Multi-role memberships (D3)~~** | **RESOLVED at PC-3 amendment** (commit `058d9e5`, D3 outcome (a); PC-3-relevant slice folded at §2 + §5 + §L3). Prior retained as historical record of cross-track surfacing; no live application at PC-4 or beyond. | Experiment B autonomous-track Step 2 finding D3; comparison-phase bridge disposition #1; PC-3 amendment closing bridge (2026-05-15_02) §Findings disposition table. |
| **admin_audit_log ownership** (PC-4-entity-specific) | `public.admin_audit_log` ownership routes to PC-4 (table + schema + access policies); PC-1 retains trigger-as-primitive. | PC-1 entity bridge Finding #3; PC-3 closing bridge (2026-05-14_02) §Pickup lists → PC-4; PC-3 §L3 Step 2 C3-5 full-disk-anchor specificity. |
| **DeusEx vocabulary grandfathering containment** (PC-4-entity-specific) | DeusEx vocabulary layer-bounded (schema-tier + admin-helper-tier; absent from API-route layer); PC-4 §3-confirm no PC-4-tier propagation. | PC-3 §L3 Step 3 Q9 resolution (b); PC-3 closing bridge §Pickup lists → PC-4 Governance. |
| **`group_role_permissions` naming drift** (inherited disposition) | Cold-derived `role_permissions` (PC-3 §5) vs disk-canonical `group_role_permissions` (PC-3 §L3 Step 2 C3-5). Surface if PC-4's contract surface touches it; route to PC-4 entry pickup or doc-health-check. | PC-3 amendment closing bridge (2026-05-15_02) §Pickup lists → PC-4 entry pickup. |

---

## §8 A-candidate ledger — watches at PC-4 entry

The program-level A-candidate ledger spans #1–#9. Status snapshot for PC-4's entry, with promotion-watch criteria where applicable:

- **#1 Latent-vs-delta distinction** — promotion-watch (carry-forward).
- **#2 Tier-shape escalation channel** — promotion-watch (carry-forward).
- **#3 Database-shaped L2 framing assumption** — promotion-watch (carry-forward).
- **#4 Schema-predates-partition (PW-1)** — *promotion-ready*; expected to recur at PC-4 Step 2 (the rebuild migration `ce58227` crosses PC-1/PC-3/PC-4/DS-* boundaries per PC-3 §L3 Step 2 C3-5). PC-3 disk-anchored at full specificity. Promotion to named program-level pattern at Phase 2 close-out (after PC-4 lands).
- **#5 Multi-Edit gate emission discipline (sub-batch-of-1)** — *RATIFICATION CANDIDATE at this entity entry*. Autonomous runs may use single-Write shape and sidestep #5; if multi-Edit work is needed, sub-batch-of-1 is the default cadence. Frame explicitly in the post-run capture (§13): did the run use single-Write, sub-batch-of-1, or larger batches, and did any emission failures surface? **PC-4 Step 1 + Step 2 + Step 3 exercise the discipline on a fresh entity; this is the cross-entity-replication step canonical to ratification.**
- **#6 Cold-derivation-with-priors as methodology variant** — promotion-watch armed at Step 1.
- **#7 Tool-payload verification (structural-inventory-before-defect-assertion)** — held throughout; carry-forward.
- **#8 Single-migration-snapshot vs cumulative-forward read order** — *RATIFIED at PC-3 Step 2*; carry-forward. Named-program-pattern promotion at Phase 2 close-out if recurrence at PC-4 Step 2 confirms.
- **#9 Framework-provided contract mechanisms invisible to cold derivation** — *RATIFIED at Experiment B comparison phase (SS-11 augment-in-place at PC-3 amendment); promotion-watch armed for cross-entity recurrence.* PC-4 is the first cross-entity recurrence test within Platform Core (DS-* remains the originally-named target but PC-4 lands first).

---

## §9 Disciplines in effect

All durable disciplines from PC-1 / PC-2 / Experiment A / Experiment B / PC-3 chain / PC-2 amendment / PC-3 amendment remain active:

- **State-read at session-open and after permission gates / tool-result clusters.** Tripwire #4 disk-of-record verification (see §6 above for autonomous-specific sub-shapes).
- **Verify-before-asserting** — applies to commit-shape claims, enumeration scope, cross-section content, and any second-touch Edit.
- **No Greek characters as labels.** ASCII-only identifiers (numbers, letters, descriptive names). Hard rule.
- **Move-and-correct disposition.** First-time-right is not the goal; wrong-shaped findings are signal. Surface and correct rather than block.
- **Sub-batch-of-1 multi-Edit cadence default** if multi-Edit work is needed. Sub-batch-of-3 is opt-in only if discipline earns it.
- **Append-only Option A** for ADR amendments (three shape variants precedented — see §5c).
- **In-commit-consistency.** Fix inconsistencies introduced by an Edit in the same commit batch when detected pre-commit; do not defer to doc-health-check.
- **Forward-only correction.** Prior commits carry their own provenance; do not rewrite history.
- **Canonical specs on `main` via deliberate provenance-citing commits.** This run is canonical, not experimental; Experiment B comparison phase is closed.
- **OLDFEAT (`docs/TMP/OLDFEAT/`) read disposition:** blindness invariant carries forward to PC-4 (default per template). STATUS.md Amendment sessions table shows OLDFEAT reconciliation as `Pending`; no post-Experiment-B reconciliation has landed. Listing only at state-read; no content reads. Disposition may be revisited at Phase 2 close-out.

---

## §10 Output expectations and commit shape

Per-entity commit count depends on session shape:

**Single-session autonomous run (one Write shape):** 2–5 commits expected — (i) combined spec write covering Step 1 + Step 2 + Step 3 outputs; (ii) entity-level CLAUDE.md creation at `docs/platform/core/governance/CLAUDE.md` (the directory does not yet exist; create); (iii) N ADR amendment commits per Q-resolutions requiring ADR work (sub-batch-of-1 across ADRs); (iv) closing bridge; (v) STATUS.md row update marking PC-4 row Done + Phase 2 close-out row status update (separate `chore(planning)` commit per opener-authoring discipline at `4f68400` / `b2181ed` / similar precedents).

**Multi-session autonomous run (split across sessions per PC-3 precedent):** 6–10 commits expected — Step 1 spec write + entity-CLAUDE creation + Step-1-landed bridge + Step 2 spec amendment + Step-2-landed bridge + Step 3 spec amendment + N ADR amendments + closing bridge + STATUS.md row update.

**Phase 2 close-out is a separate session and a separate commit batch**, NOT part of the PC-4 per-entity commit count above. Per PC-3 closing bridge §Discipline posture for PC-4 entry session: *"Phase 2 close-out arrives after PC-4 lands."* The PC-4 closing bridge routes pickup items to Phase 2 close-out per §11 below; Phase 2 close-out's session-opener instance is a separate authoring with its own STATUS.md row.

**No push to origin** at session close. The human dispositions push as a deliberate next step.

---

## §11 Closing bridge — required sections

The closing bridge at `docs/planning/sessions/2026-05-15_NN_-_PC4-LANDED.md` (NN = next available index; update date if the closing session lands on a different day) follows the standard `docs/templates/session-bridge.md` shape, with these additional sections required for autonomous L1→L3 runs:

- **Explicit closure statement:** "*PC-4 Governance L1→L3 derivation completes at this commit batch.*" Matches PC-1 / PC-2 / PC-3 bridge precedent. **Phase 2 close-out statement** should accompany since PC-4 is the final Platform Core entity: "*Platform Core Phase 2 derivation closes at this commit batch.*"
- **Pickup lists** for downstream entities — DS-1 through DS-7 + Extension System + Phase 2 close-out items. By receiving entity, with substance + disk anchors.
- **A-candidate ledger snapshot** at PC-4's close — final status for #1 through #N (including any new candidates surfaced). Phase 2 close-out adjudicates promotion of #4 (PW-1) and #8 (cumulative-forward) to named program-level patterns; #5 (sub-batch-of-1) and #6 (cold-derivation-with-priors) ratification verdict; #9 (framework-mechanisms) cross-entity recurrence verdict.
- **PW status** at PC-4's close — confirmation or retraction for any PW-armed at Step 1.
- **Methodology data points** captured this run — bridge-prose observations distinct from substance findings.
- **Carry-forward to next entity** — Phase 3 entry (DS-1 World Model is the next sequenced autonomous-track entity per STATUS.md). What DS-1's session-opener instance must inherit; any Platform-Core-scoped pickup channels closing at Phase 2 close-out vs remaining open into Phase 3.
- **Phase 2 close-out routing** (PC-4-specific section since PC-4 is final-of-tier) — route the six pickup items named at PC-3 closing bridge §Session-open prompt for CC to the Phase 2 close-out work item (separate session after PC-4 lands, separate commit batch per PC-3 closing bridge framing: *"Phase 2 close-out arrives after PC-4 lands"*; see §10 above). Do NOT adjudicate inline at PC-4 close; pickup-list format per standard closing-bridge convention. Items by source-named letter: (a) P1 four-mode + P11 archeology cluster with PC-4 evidence; (b) PW-1 / A#8 / A#5 / A#6 / A#7 / A#9 promotion to named program-level patterns; (c) Finding #4 two-tier centralization adjudication; (d) ADR-U007 stale-signature doc-hygiene flag; (e) `ecosystem-decomposition` skill update for stress-test pattern at n=4; (f) fitness-check three-day turnaround at phase level.
- **Template revision disposition** — adjudicates whether the run's §13 post-run methodology capture surfaced durable findings warranting a `docs/templates/autonomous-l1-l3-session-opener.md` amendment. Either *no revision proposed* (with one-line rationale) or *revision proposed* (with the specific change). **First-instance-stress-test framing applies** (see §13 below). The Revision history table at the top of the template is updated in the same commit when a revision lands.

---

## §12 Scope boundaries

- **Blindness invariants.** OLDFEAT is still under the blindness invariant from Experiment B per STATUS.md (`OLDFEAT reconciliation` row marked `Pending`). Do not consume `docs/TMP/OLDFEAT/` content (listing only at state-read pass per §9). Revisit disposition at Phase 2 close-out if scope-of-PC-4 surfaces governance-relevant OLDFEAT artifacts; default is carry-forward.
- **Cross-entity findings.** Class 3 findings route to pickup lists per §11; do NOT amend other entities' specs from within PC-4's run. (PC-2 amendment landed at `f715c70`; PC-3 amendment landed at `058d9e5`; both deferred-finding sets are folded — no amendment-pickup-targeting needed during PC-4. Section dropped per opener authoring: PC-2 amendment closed deferred findings at commit `53fe0a2`; section content no longer load-bearing.)
- **`docs/platform/core/CLAUDE.md` anticipatory-language stale bullet** — known stale per PC-3 closing bridge doc-health-check pickup ("Where to go next" bullet about entity-level CLAUDE.md files becoming imminently expected). **Dispose at PC-4 close** — replace anticipatory wording with present-tense reflecting the now-established entity-level CLAUDE.md pattern. Pattern has been locked since 2026-04-26 (G-26 / locked decision); PC-3 has `docs/platform/core/organisation/CLAUDE.md` on disk; PC-4 creates `docs/platform/core/governance/CLAUDE.md` during this run. The right disposition has been clear for weeks; PC-4 close is the natural commit boundary. Single Edit to the sub-tier CLAUDE.md's "Where to go next" bullet; lands either in the PC-4 closing-bridge commit batch or as a separate `docs(platform-core)` housekeeping commit alongside.

---

## §13 Post-run methodology capture (required)

After Step 3 lands and BEFORE the closing bridge is authored, the autonomous run answers the following prompts. Output flows into the closing bridge's Methodology data points section AND informs the closing bridge's Template revision disposition section.

**First-instance-stress-test framing.** PC-4 is the **first** instance of the autonomous L1→L3 template. PC-1, PC-2, and PC-3 all pre-dated it; their closing bridges fed substance into this template's authoring but never exercised it. Comparable first-instance run: the PC-2 amendment session, which was the first instance of the spec-amendment template and surfaced **seven** template-revision candidates at closing-bridge commit `70cbd15`. The PC-3 amendment session (second instance, small-scope) surfaced three additional candidates plus one lower-priority. **Plausible expectation for PC-4 first-instance run: 3–8 template-revision candidates.** Don't anchor too hard on the high end — small-scope PC-3 amendment showed that a tightly-scoped run can produce a parsimonious capture. But don't anchor low either: first-instance discipline-shape gaps surface across §-sections that haven't been exercised together before, and the autonomous-specific disciplines (§6 self-checking, §5b cluster batch-and-report cadence) are first-stress-tested here. **Capture posture: generous rather than parsimonious. Brevity is fine when there is genuinely nothing to surface; padding is not. If three candidates surface, three candidates land; if eight surface, eight land.**

The five prompts:

1. **What worked well from this template that the next run should keep?** Name specific sections, disciplines, or scope items that demonstrably helped. Be concrete — "§5b Step 2 disk-evidence scope" is more useful than "the scope sections."
2. **What in this template was redundant, confusing, or got in the way?** Sections that duplicated other sections; instructions that contradicted; scope items that didn't apply to PC-4; disciplines that fired noise rather than catch. Be concrete. **The added §1 Check 5 (autonomous template baseline at `4646655`) is a candidate for first-instance evaluation** — did it earn its place, did it fire spuriously, did it catch a real divergence? Surface verdict at this prompt.
3. **What discipline or scope item did you wish was named that wasn't?** Things that, with hindsight, would have helped at Step 1 / Step 2 / Step 3 had they been in the template.
4. **What new substance prior or scope item did you surface that the next entity (DS-1) should inherit?** Cross-entity findings that don't fit existing pickup channels; recurring patterns not yet named; carry-forward priors not yet in §7.
5. **Any new A-candidate or PW-class methodology observation worth promotion-watching?** Patterns that appeared at PC-4 for the first time, or recurrences of existing watches that warrant promotion.

The post-run capture is structural reflection, not informal aside. Its length scales with run scope — a single-session entity might produce a half-page; a complex multi-session entity might produce two pages.

---

## §14 Start sequence

Begin with §1 Pre-flight checks. If all five pass, proceed to §2 State-read pass. Then §5a Step 1 cold derivation. Surface the §5a checkpoint before the first Write.

---

*End of instance.*
