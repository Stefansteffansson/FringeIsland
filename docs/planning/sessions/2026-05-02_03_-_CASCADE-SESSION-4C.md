# Cascade Session 4c — Closing Bridge

**Date:** 2026-05-02
**Status:** Complete. Eight commits. All migrations from the inherited F4-wide register + two new findings from wide-first sweep (F1, F2) executed. Cascade-plan track close-out is a separate bridge dated 2026-05-03 (per the two-bridges decision made at 4c's bridge boundary).

---

## What shipped

The plate inherited from 4b (six-item F4-wide register: R2 Components, R3 DB access, R4 Security, R5 RBAC, R6 UI rules, R8 Testing) was extended during execution by two new findings from the wide-first sweep — **F1** (API-first bullet's Hub-specific instantiation embedded in universal kernel) and **F2** (Database migrations subsection). Eight migrations executed, eight granular commits per cascade-plan D4.

Root §Architecture trimmed to six universal-kernel bullets (Two trees, Wave model, Five verticals, API-first kernel, Auth pointer, State pointer). Root §Development workflow trimmed to TDD opener + skill pointer.

| # | SHA | Subject |
|---|-----|---------|
| 1 | `e4a27c4` | `docs(hub): absorb root §Architecture Components rule as repo-organisation bullet` |
| 2 | `2b72465` | `docs(hub): absorb root §Architecture DB access rule and reject stale RSC framing` |
| 3 | `234de35` | `docs(hub): absorb root §Architecture API-first instantiation; trim root bullet to universal kernel` |
| 4 | `c81cb83` | `docs(hub,products): split root §Architecture UI rules — ConfirmModal to Hub, loading-states + related-state to products tier; resolve products-tier pointer-line` |
| 5 | `b7a9cef` | `docs(platform/core): absorb root §Architecture RBAC rule as temporary Identity-area anchor pending entity file authoring; verify consumption-rule already covered at platform-tier line 41` |
| 6 | `c24f910` | `docs(root): delete §Architecture Security bullet — RLS / trigger / is_platform_admin sub-claims already covered at platform-tier (Rules + Gotchas)` |
| 7 | `2214f8d` | `docs(platform): absorb root §Development workflow Database migrations as new H2 section; fold .sh/.bat prerequisite in; reclassify destination from platform/core to platform tier` |
| 8 | `5de68cb` | `docs(platform,hub): split root §Development workflow Testing — Jest integration tests to platform tier (categorise-by-test-target, not by domain-name owner); Playwright E2E to Hub` |

Root cleanup bookend: verify-only sweep. No edits needed; each migration commit cleaned its source at the time of migration. Inbound-reference sweep across `docs/` confirmed no broken pointers from 4c's migrations.

---

## Notes for posterity

**Two new sequencing patterns surfaced during 4c that 4b's two-pattern taxonomy didn't cover.** 4b named two: plan-back-anticipated single-decision migrations (F1/F2 single-destination shape) and structural-decision-with-multiple-destinations (§Critical gotchas shape). 4c added two more.

- **Asymmetric two-half migration shape (R5).** Source content has internal split where one half migrates substantively (newly authored at destination) and the other half is verified-already-covered (no new authoring). R5's role enumeration migrated to platform/core as new content; R5's consumption rule was verified already covered at platform tier line 41 — pure port-down would have authored a duplicate alongside the existing rule.

- **Verification-and-delete shape (R4).** Source content is wholly already covered at the destination in equal-or-fuller form. Migration authors no new content; the pattern's outcome is verify-and-delete from source. R4's three sub-claims (RLS-on-tables, trigger-validation, `is_platform_admin()` for admin-RLS) were each at platform tier in stronger framing than root carried. No platform-tier edit and no platform/core edit; root deletion only.

Both patterns require destination-read posture to identify. Pure port-down would either author duplicates (R5's consumption half) or migrate content alongside its existing canonical form (R4 entirely).

**Stop-and-fix-in-same-session at R3.** Root's DB access bullet carried pre-API-first framing ("server client for RSC table queries") that contradicted Hub's narrow-exception rule (no table reads or writes). Pure port-down would have imported the contradiction. Migration paired the port-down with an in-place stale-framing rejection — the new Hub bullet explicitly names and refuses the incorrect framing rather than silently omitting it. A reader coming from a generic `@supabase/ssr` mental model gets corrected in-place.

**Destination reclassification from wide-first acceptance at F2.** F2's wide-first acceptance named "platform/core" as destination on the framing "schema is Infrastructure, not platform-broad." Surface-draft destination-read corrected to platform tier: migrations apply to both Core and Domain Services; sibling sub-tiers don't inherit from each other; owner-of-code (Infrastructure-area tooling) ≠ owner-of-documentation (every platform contributor running migrations). The wide-first sweep got the *what* right and the *where* wrong; surface-draft caught the where before commit.

**Hypothesis verification before option selection at R8.** R8's three-option framing presupposed that domain-names-in-test-script-paths reflect tier ownership — a presumption that made auth's cross-cutting placement awkward under any of the three options. Cheap verification (read `package.json` + sample test-file headers) revealed domain names refer to what the *code under test* manages, not which tier the tests exercise. Every `test:integration:<domain>` is platform-tier integration testing regardless of domain name. The auth test file's own inline comment names the distinction explicitly: *"This tests RLS enforcement at the API level. For true route protection testing (middleware, redirects, browser navigation), implement E2E tests with Playwright."* The codebase had already encoded the categorisation axis the surface-draft was reasoning toward; the documentation was lagging the code's self-understanding.

The auth-as-cross-cutting awkwardness dissolved by changing categorisation axis from domain-name-owner to test-target — not by ruling on where auth lives but by recognising the testing-script question is about what the test exercises, not where the underlying flow lives.

---

## Methodology observations

**Observation 1 — Verification-and-delete pattern (R4) [NEW candidate, first-instance].**

Recognition test: source content is already substantively covered at the destination, in equal-or-fuller form; migration would author no new content. The pattern's outcome is verify-and-delete from source.

Distinct from R5's asymmetric-migration shape: in R5, only the consumption half is verification-and-delete (the implementation half is genuine new authoring). R4 is verification-and-delete throughout — no new authoring at any destination.

Distinct from Candidate E (wide-first sweep finds things narrow misses): E covers what wide-first sweep finds at the *source* layer; verification-and-delete is about what destination-read reveals after a migration target has been identified at the source layer.

Awaits second-instance evidence to promote.

---

**Observation 2 — Destination-classification-by-readership-via-cascade (F2) [NEW candidate, first-instance].**

Recognition test: ask which contributors need to find this content via their natural cascade load; place at the level closest to entity where all relevant contributors are still on a shared cascade path — not at the level where the underlying code lives. Owner-of-code ≠ owner-of-documentation.

R8 surfaces a sibling-pattern (destination-classification-by-test-target) which is a distinct member of the same family — both are instances of "destination-read reveals deeper classification axes." The broader meta-pattern is unnamed and not yet candidate-elevated; F2 + R8 together produce adjacency evidence without sufficient strength to name the broader pattern as candidate. Premature generalisation of F2's specific candidate to absorb R8 would itself be an authoring-pressure failure mode (parallel to adding new candidates without evidence).

Awaits second-instance evidence on F2's specific recognition test (cascade-load readership) to promote.

---

**Observation 3 — Candidate A applying at new level (R6) [strengthening adjacency, not new].**

R6's three sub-rules split along scope-of-application: ConfirmModal-vs-browser-dialogs went to Hub as Hub-specific instantiation; loading-states and update-related-state went to products tier as universal-product UX rules. The principle "tier-level rules describe the discipline (loading states; related-state updates); entity-level rules describe the instantiation (ConfirmModal)" is Candidate A's no-downward-primitive-enumeration principle applied at tier-vs-entity level — rather than 4a's intra-file-vs-cross-file evidence. Same principle, scale-agnostic across levels.

Verification: when Gimbal authors its ConfirmModal-equivalent, does the tier rule apply unchanged? Yes ("always show loading states" applies to Gimbal natively). Does the tier rule mention Hub's specific primitive? No — and that's what makes it correctly placed.

Continued accumulation strengthening Candidate A's robustness across scales. Not new candidate territory.

---

**Observation 4 — Migration moments expose inherited imprecisions [adjacency to out-of-scope-fix discipline].**

Consequence-sweep at root cleanup surfaced an inherited imprecision carried verbatim from root through F2: the .sh/.bat rule's unconditional "never the .bat form" wording is overstated relative to AGENTS.md's environment-conditional treatment (Claude Code uses .sh; Claude Desktop uses .bat). The migration carried the imprecision rather than introduced it — the qualifier *"Claude Code runs in bash"* implicitly scopes the rule but leaves the surface wording overstated.

Adjacency for out-of-scope-fix discipline: migrations expose inherited imprecisions but don't always fix them. Same shape as 4b's out-of-scope-fix discipline pattern (cascade-plan track is migration-scoped; correcting inherited imprecision is a separate concern). Eventual home for the .sh/.bat rule's environment-conditional framing is AGENTS.md (canonical environment-conditional anchor), with platform tier deferring there.

Not 4c's to fix; tracked for follow-up.

---

## Candidate-ledger state from 4c's findings

Scoped to 4c-specific evidence (cross-session synthesis is the close-out bridge's job, not this bridge's):

- **Candidate A** — adjacency strengthening from R6 (no-downward-enumeration applies at tier-vs-entity level, scale-agnostic across levels).
- **Candidate E** — additional accumulation from 4c's wide-first sweep (F1 + F2 as new findings beyond the inherited register; R3's stale-framing identification at the source layer).
- **NEW first-instance candidates:** verification-and-delete (R4); destination-classification-by-readership-via-cascade (F2). Both await second-instance evidence to promote.
- **Adjacency observations** (not candidate-elevated):
  - Broader meta-pattern around destination-read revealing classification axes (F2 + R8 sibling-pattern; not yet candidate-named pending more evidence).
  - Source-read parallel to destination-read when source is code rather than documentation (R8 hypothesis-verification where the auth test file's own inline comment encoded the categorisation axis the surface-draft was reasoning toward).
  - Migration moments expose inherited imprecisions (Observation 4 above, adjacent to out-of-scope-fix discipline).

**Calibration check.** Two new candidates plus continued accumulation for two existing candidates plus three adjacency observations. "Warrants vigilance" range per 4b's calibration framework, not "ceiling" range. 4c producing real findings from execution evidence rather than authoring-pressure. The candidate-ledger discipline carried forward from 4b is being tested through 4c and the test result is visible — strict candidate boundaries (R8 not absorbed into F2's candidate; broader meta-pattern named as adjacency rather than promoted) preserved across the session.

---

## Soft findings noted but not fixed

- **.sh/.bat imprecision** — see Observation 4. Out-of-scope-fix discipline applied. Eventual home: AGENTS.md as canonical environment-conditional anchor, with platform tier deferring there.

---

## Forward-flag for cascade-plan close-out bridge (2026-05-03)

The cascade-plan close-out bridge is dated 2026-05-03, authored after 4c's nine commits (eight migrations + this bridge) are pushed and slept on. Push-cadence-and-sleep discipline applies more strongly to the close-out (highest-consequence bridge of the three; speaks to the arc not to one session); close-out benefits from authoring against pushed state, not local work-in-progress.

**Close-out reads pushed state, not local work-in-progress.** Cite commit hashes from `origin/main`, not from local commits. The push-then-sleep discipline isn't ceremonial — it's what makes the close-out a retrospective document rather than a same-session continuation.

Distinct from session bridges by reader and by content type:

- **Reader:** session bridges' reader is the next session's opener (already loaded predecessor bridges, executing against locked decisions). Close-out's reader is anyone reading retrospectively — future cascade-plan-style session, contributor trying to understand current root-CLAUDE shape, methodology audit.
- **Content type:** session bridges report their own session's work; they don't claim arc-level findings that depend on multiple sessions' evidence. Close-out is where multi-session synthesis lands.

The close-out's load-bearing content is **testing the 2026-04-27 cascade-plan bridge's predictions**. Did the locked decisions (D1–D5) hold under execution pressure? Did the anticipated work-shape match what actually surfaced? Where did the methodology evolve beyond the plan?

**Close-out is itself the test case for the candidate-ledger split decision flagged at 4a.** If close-out finds the ledger needs splitting, that's where the decision lands. If the ledger remains tight, the deferral held through 4b and 4c continues. The decision converges at close-out — it does not predate it.

Content scope for tomorrow's authoring (forward-flag, not draft):

1. Cascade-plan execution outcome vs. 2026-04-27 plan's predictions.
2. Candidate-ledger state across all three sessions (A, B, E promoted; two new first-instance candidates from 4c; adjacency observations from across the arc).
3. The candidate-ledger split decision flagged at 4a — current state's verdict (open now or continue deferral).
4. Working-pattern findings: wide-first sweep, surface-draft cycle calibration, consequence-sweep-as-separate-commit, bouncing-partner pattern as methodology.
5. What the cascade-plan didn't anticipate: the 4a/4b/4c split itself; new methodology candidates emerging in execution; verification-and-delete shape; destination-reclassification-from-wide-first-acceptance shape.

Not for 4c bridge to draft. The boundary between session bridge (4c-evidence-only) and close-out bridge (cross-session synthesis) is the discipline that keeps both honest.

---

**Push 4c's nine commits before authoring close-out.** Sleep on it. Close-out tomorrow.
