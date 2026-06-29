# Session bridge — Cycle A built: IDN-9 `6-done`, IDN-12 parked (account lifecycle)

**Date:** 2026-06-29 (build session; follows `2026-06-28_05` which decomposed Cycle A to 4-ready)
**Session type:** Build (`feature-development`). Platform-first through the schema gate, red-first, full pyramid.
**Status:** **IDN-9 (FEAT-PC004 + FEAT-H006) is built, `6-done`, and merged.** **IDN-12 (FEAT-PC005 + FEAT-H007) was descoped and parked** after a governance gap was found mid-build (see below).
**Branch/PR:** `feat/cycle-a-idn9-account-state` → [PR #19](https://github.com/Stefansteffansson/FringeIsland/pull/19) (merged, `--delete-branch`). `main` synced (`0b0a1c7`).
**Participants:** Stefan + Claude

---

## The pivot — a governance gap caught at build (Stefan)

Cycle A was decomposed as IDN-9 (read/render) + IDN-12 (self-service reactivation). Building IDN-12, Stefan spotted the hole: `public.users` records the off-but-not-closed state on two booleans with **no record of who switched the account off**. Today the **only** producer of that state is an **admin** (`admin_update_user_status(target,false)`) — there is no self-pause. So as-specced self-reactivation would let a member **reverse an admin hold**.

**Decision (2026-06-29, locked with Stefan):** split the off state into two origin-distinguished states and retire the ambiguous "deactivated":

| State | Meaning | Returns to active by |
|---|---|---|
| **active** | normal | — |
| **paused** | member self-pause | the member |
| **suspended** | admin hold | an admin only — never the member |
| **decommissioned / closed** | permanent | nobody (terminal) |

Canonical record: [`../hub-v2/account-lifecycle-states-decision.md`](../hub-v2/account-lifecycle-states-decision.md). "suspended" reuses the existing `groups.status` word (admin hold). **Build cut:** ship IDN-9 render only (safe, fixes the broken empty screen); defer IDN-12.

## What shipped (`6-done`)

| Spec | What |
|---|---|
| **FEAT-PC004** | `get_own_account_state()` — `SECURITY DEFINER`, `search_path=''`, own-row via `auth.uid()`, **no `is_active` filter** (the point: a switched-off member reads their own RLS-hidden row). Returns `jsonb {is_active, is_decommissioned, state}`; `state` is an **open** label (`active`/`suspended`/`decommissioned`). Additive `GET /api/account/state` (cookie SSR auth — PC003 house style, **not** `/api/v1/`+Bearer). Migration `20260629054349`. |
| **FEAT-H006** | `AccountStateProvider` (root layout) resolves the FIM's state once per session; `AccountStateGate` renders an honest standalone surface **instead of** the chrome when not active: suspended → "contact an admin" (NO reactivation), decommissioned → terminal, unknown → safe default; loading + error/retry; Mist/sessionless pass through. Quiet "Account: active" line in profile settings. Hardened `AccountMenu` sign-out (the new provider's re-render on the auth flip tipped a known race; final `router.replace('/')` makes the landing deterministic). |

## Parked (deferred from Cycle A)

**FEAT-PC005 + FEAT-H007 (IDN-12)** — frontmatter `parked: true` + precise `parked_reason`; "Parked" section in each body. Unblock sequence: (1) add a **deactivation-origin** field on `public.users` (Platform Core schema change → schema gate + **ADR**; default unknown-origin off-accounts to `suspended`), (2) build **self-pause** (the producer of `paused`, part of the IDN-10 exit/lifecycle seam), (3) gate `reactivate_own_account()` to member-origin `paused` only.

## Schema gate (how it was handled)

Migration authored + integration tests written + **demonstrated red** (`function get_own_account_state does not exist`), then **paused for Stefan's explicit apply nod**. On approval: `apply-migration-temp.js` → `repair --status applied` → `migration list` (local/remote in sync). Read-only, additive, no RLS change, no new columns. Merge was the second gate (Stefan's nod on PR #19).

## Verification — full pyramid green

- Platform integration (PC004): **6/6** — three states + own-row boundary + RLS-unchanged guard + empty case, vs real Postgres + RLS.
- Full platform integration suite: **exit 0** (no regression — PC004 purely additive).
- Hub unit: **119/119** (11 new H006 tests); **lint clean**; **`next build` clean** (the type gate).
- Playwright E2E: **22/22** — 4 new account-state journeys + a fixed sign-out race.
- **Red-first throughout** (every behaviour demonstrated red before its implementation). One integration assertion (the RLS-unchanged guard) is a pre-existing-invariant guard, labelled as such — not a red-first proof.

## Resume HERE — next session

Per the phase-3 plan, after Cycle A comes **Cycle B — Consent & privacy / GDPR (IDN-6 → IDN-7)** (consent store already exists, PC002/ADR-U034; needs a PC-4 read/update contract + UI). Cycles B–E can reorder; IDN-10 (F) is last. **IDN-12 stays parked** until its prerequisites (origin field + self-pause) land — it is no longer a near-term cycle. Decompose Cycle B to `4-ready` (decompose session), then build (build session), per the alternating cadence.

## Carry-forward reminders

- **IDN-12 prerequisites** (above): origin field (schema + ADR) + self-pause, then origin-gated reactivation. Decommissioned stays terminal; suspended stays admin-lift-only.
- **Vocabulary body-rename residual (flagged, NOT done this session):** the four account-lifecycle spec **bodies** still use "deactivated" (~82 of 150 doc-wide occurrences are in FEAT-PC004/H006/PC005/H007). The decision record + each spec's Implementation-notes/Parked section **authoritatively supersede** them with "suspended," so it is documented supersession, not silent drift — but a deliberate **rename pass** (careful, per the rename-pass discipline: point the word at its new referent, grep all instances, no new canon) should reconcile the bodies, ideally at the next `doc-health-check` cycle boundary. Out-of-scope "deactivat*" hits in legacy/reference/other-feature docs are unrelated and should not be swept blindly.
- **`paused` not yet encoded** anywhere — before encoding an account `paused` state, collision-check `paused` against membership/enrollment status (it appears in archived status sets).
- **IDN-10 forward-seam untouched** (Cycle F, blocked on DS-3/DS-5) — its four hooks remain as tracked in `phase-3-identity-completion-plan.md`. Self-pause (needed by IDN-12) is part of this seam's area.
- **API convention** for these features: realized as `/api/account/state` + cookie `@supabase/ssr` auth (PC003 house style); the spec text's `/api/v1/`+Bearer is still directional/unrealised across the new Hub.

## Close-ritual notes

`main` synced at `0b0a1c7`. `npm run dashboard` refreshed (564 files indexed). **No full `doc-health-check` run this session** — not a clean cycle boundary (Cycle A is half-open: IDN-12 parked), and the in-session reconciliation already updated both §L4 summaries + both `features/README` indexes + CHANGELOG + the phase-3 plan (links verified resolving). The vocab body-rename + a parked-spec sweep (doc-health §4) are the two items a doc-health pass should pick up next. This bridge is the entry point for the next session.
