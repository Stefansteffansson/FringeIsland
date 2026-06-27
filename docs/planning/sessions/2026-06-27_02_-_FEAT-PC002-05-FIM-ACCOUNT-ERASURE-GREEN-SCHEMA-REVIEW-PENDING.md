# Session bridge — FEAT-PC002-05: FIM account-erasure green at `review` (closes the PC002 build)

**Date:** 2026-06-27 (build session; follows `2026-06-27_01` which landed 01-04)
**Session type:** build (platform, TDD red-first) — the last task of FEAT-PC002
**Status:** **PC002-05 built and green; schema-review gate CLEARED by Stefan (2026-06-27).** All 5 FEAT-PC002 tasks `done`; **feature flipped `5-in-cycle → 6-done`** (+ identity §L4 row + §L3 substrate-latent→shipped cells ×3 + §8 Q8/Q10 maturity + `features/README.md` index). **PR #4 merge pending** the delayed full-suite re-confirmation (anon rate-limit recovery). See §"Session close update" at the foot.
**Participants:** Stefan + Claude

> Picks up the `2026-06-27_01` bridge. Since that bridge, `idn-2-build` (01-04) was merged to `main` via PR #2 and the fuller-auto docs via PR #3; tasks 01-04 remain at `review`. This session built PC002-05 (FIM account-erasure, ADR-U034 §5) on a fresh branch off `main`, red-first.

---

## What was built (TDD red -> green, demonstrated red first)

One additive migration + one integration suite.

| Task | Story | Migration | What |
|---|---|---|---|
| **PC002-05** | S5 crit-4 (+ S4 DoR) | `20260627120000_…fim_account_erasure` | `erase_fim_account(uuid)` — admin-gated (`manage_all_groups`); refuses Mists (`42501`, collision-free boundary); anonymises the consent **subject link** under the `app.consent_erasure_in_progress` bypass while **retaining** the consent **event** (GDPR proof); delegates teardown to the existing `admin_hard_delete_user` (sentinel reassignment + cascade), reused as-is. |

**Tests:** `hub/tests/integration/auth/fim-account-erasure.test.ts` — **4 tests, 4 green** (red-first). Applied to dev DB + repaired.

## Key design decisions (ADR-U034 §5 anonymise-vs-retain, finalised this session)

- **Admin path, not self-service.** GDPR account-erasure is an admin/ops action. `erase_fim_account` requires `manage_all_groups` and delegates to `admin_hard_delete_user`, whose auth re-check passes because the JWT actor is unchanged across the SECURITY DEFINER call. A Hub self-service "delete my account" affordance (if ever) would route through this same privileged path — named as a forward seam, not built (out of scope: No Hub UX).
- **Anonymise-first is structural, not procedural.** The consent FK `ON DELETE RESTRICT` blocks a raw hard-delete of a consented FIM (`23503`). `erase_fim_account` NULLs `subject_user_id`/`subject_group_id` first (clearing the FK), keeping `purpose`/`policy_version`/`captured_at` as proof. The append-only trigger is bypassed only via the controlled `app.consent_erasure_in_progress` flag.
- **Collision-free reaper<->consent boundary (crit-3) made enforceable.** `erase_fim_account` refuses `is_temporary = true`: Mists are the reaper's / `explicit_erase_mist`'s and hold no consent; account-erasure is FIM-only. The two erasure paths can never touch the same row.
- **No Platform Core change.** `admin_hard_delete_user` is reused unmodified — the change is purely additive (one new function), so no "ask-first: change shared platform code" trip and no ADR-U015 bump.

## Process notes worth keeping

- **Pass-at-red guard (again).** The deny + Mist-boundary tests assert the specific `42501`, not merely "an error" — so the function-missing `PGRST202` is a genuine red, not a vacuous pass. The anonymise+retain test was red on `error.toBeNull()`. The 4th test is **labelled characterization (test-after)**: it locks the consent FK `RESTRICT` (`23503`) — already true from the consent migration, so honestly not TDD.
- **Anon sign-in rate limit.** The integration suite shares one Supabase anonymous-sign-in budget; rapid re-runs tripped `Request rate limit reached` in pre-existing Mist suites (mist-substrate/session/continuity/transcendence) — **environmental, not a regression** (signup, which uses no anon, stayed green; the new suite is green in isolation). Mitigation added: `signInAnonWithRetry` (backoff) **local to the new test file**. The pre-existing Mist suites have no such retry (latent fragility, not touched this session).

## Cascade-spec verification (crit-2 / STORY-4 DoR)

Both FEAT-PC002 §"Cascade specification" tables verified against the shipped substrate — **match at every layer**, no discrepancy. The Mist→FIM transcendence cascade's Privacy row ("account-erasure becomes retention-bound") is now **realised** by `erase_fim_account`.

## What is still open

- **Schema-review gate (Stefan).** All 5 PC002 migrations (4 from `2026-06-27_01` + this one) + their RLS/cascade specs await human approval. On approval: FEAT-PC002 `5-in-cycle → 6-done`, + identity §L4 feature-inventory row, + identity-spec §L3 Privacy "latent" consent cell → "shipped", + `features/README.md` index — **in one commit, deferred to post-review** (not done this session, by design).
- **Merge.** This branch is **not merged** (schema-gate carve-out). PR opened for review.
- **Hub half (FEAT-H004)** — untouched: anon->permanent conversion + the transcendence/consent gate + "say goodbye" farewell + a future self-service account-erasure affordance, consuming these RPCs. Separate product layer.
- **Full-suite green** — re-run after the anon rate-limit window recovers (the only failures were rate-limit on pre-existing anon suites; see Process notes).

## For the next session

- **If schema review passes:** flip FEAT-PC002 → `6-done` (+ §L4 row + §L3 latent→shipped + `features/README.md`) in one commit; merge the PC002 branch(es). Then FEAT-H004 (Hub half of IDN-2) is the next product layer.
- **Read order:** this bridge -> `2026-06-27_01` bridge -> FEAT-PC002 (§"Cascade specification" + STORY-5) -> ADR-U034 §5 -> migration `20260627120000` -> `admin_hard_delete_user` (in `20260223171200_fix_rc7_admin_user_ops.sql`).
- **Orientation:** tests `cd hub && npx jest --selectProjects integration --runInBand --testPathPatterns fim-account-erasure`; migration via `node scripts/apply-migration-temp.js <file>` then `bash supabase-cli.sh migration repair --status applied <ts>`.

---

## Session close update (2026-06-27)

Stefan **reviewed the migration line-by-line in plain language, probed the anonymise-vs-retain design** (the genuine "an anonymised receipt can't prove a *named* person consented" tension — acknowledged: the substrate proves the *process*/audit trail, and the deletion log is the per-person defence; full anonymisation was the deliberate, privacy-pure choice, with a one-way-fingerprint alternative left on the table), and **consented to the schema + migration.**

**Closure carried out (one commit on `idn-2-pc002-05`):**
- FEAT-PC002 frontmatter `5-in-cycle → 6-done`; identity §L4 inventory row → `6-done`; `features/README.md` index `4-ready → 6-done`.
- identity §L3 Privacy consent cells ×3: "substrate latent per §8 Q8 / X4" → "substrate shipped per ADR-U034 / FEAT-PC002 … capture for this flow still future (transcendence only)".
- identity §8 Q8 + Q10: stale "(4-ready)" → "(6-done)"; Q8's "stays latent / §L3 cells remain accurate" clause superseded with a dated "shipped 2026-06-27" note (the live L3/L4 vs §8 tension closed). §L3-Step-3 / SS-2 historical records left verbatim per the augment-in-place discipline.
- All 5 task files `→ done`.

**Anon rate-limit hardening (Stefan-approved):** the prior full-run failures were `Request rate limit reached` — the integration suite shares one per-project anonymous-sign-in budget (`rate_limit_anonymous_users`, default **30/hour/IP**) and rapid re-runs exhausted it. Fixed two ways: (1) raised the **dev** project's `rate_limit_anonymous_users` 30→150 via the Management API; (2) added a shared `withAnonRateLimitRetry` test helper (exponential backoff) and wired it across every anon-sign-in caller (`mist-substrate`, `mist-reaper`, `mist-transcendence`, `mist-session`, `mist-continuity` via `beginMistSession`, and `fim-account-erasure`). **Full hub suite now 27/27 green in a single clean run.** (Production keeps a modest limit by design — the throttle is anti-abuse for real anonymous visitors; CAPTCHA is the lever if high anon volume is ever wanted.)

**Still open:** **PR #4 ready to merge** (schema gate cleared, full suite green) — pending the merge nod. A full doc-health-check at the cycle boundary remains the formal mechanism to sweep §8 open-questions reconciliation. **Next product layer: FEAT-H004 (Hub half of IDN-2).**

*Note: `npm run test:integration` from the repo **root** also sweeps the unmaintained `hub-legacy` workspace (and its babel config chokes on `import type`); run hub-scope tests from `hub/` (`cd hub && npm run test:integration`).*
