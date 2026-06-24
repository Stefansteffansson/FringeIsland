# Session bridge — Hub v2 Phase-1 gate PASS → Phase-2 kickoff: hub/ relocation + walking-skeleton foundation

**Date:** 2026-06-24 (immediately follows session `2026-06-24_01`)
**Session type:** decision + build
**Status:** Closed — Phase 2 walking skeleton underway; `hub/` foundation + auth bootstrap build green and pushed. Feature build (login → /groups + TDD) is the next chunk.
**Participants:** Stefan + Claude

> Durable artifact so the next session can pick up without re-reading the transcript. All 8 commits below are pushed; `main` is in sync with origin.

---

## Session summary

Walked Stefan through the Phase-1 gate brief; he gave the verdict **PASS**. Flipped the Hub v2 plan (Phase 1 → Done, Phase 2 → Active), recorded the verdict, cleared the two non-blocking cleanups, and teed up Phase 2 with a walking-skeleton kickoff doc. Then, in order: recorded the **CQ-016 run-now split**, assessed and recorded **vertical readiness**, and — on Stefan's "kick off the walking skeleton" — made the foundational build decisions and started building.

The big structural decision was **where v2 code lives**. Stefan pushed back hard on a `hub-v2/` directory ("what about v3, v4…?"), which was the right instinct: code directories name the *permanent surface*, not the rebuild iteration. Result: **ADR-U032** — the new Hub builds under **`hub/`** (version-free), the old Hub MVP was relocated to **`hub-legacy/`** (frozen oracle), and the repo becomes a **monorepo of surfaces** (`hub/`, later `gimbal/`, studios). Then authored **FEAT-H001** (the walking-skeleton spec), ran a **doc-health** pass on the restructure, scaffolded **`hub/`** as an npm workspace (builds green), and wired the **auth bootstrap** (Supabase session plumbing + a clean `AuthProvider` + active proxy middleware, builds green).

## What was decided

- **Phase-1 gate: PASS** (Stefan, 2026-06-24). The three deliverables are good enough to build Phase 2 on. Two non-blocking cleanups cleared: SPEC §L3 "42 seeded permissions" → **44**; substrate-audit "(deliverable 3, pending)" → done. *Locked.*
- **CQ-016 splits into two sessions of very different size.** (A) **Framing slice** — "does the DESCRIPTION convey the ambition?" + a trajectory sketch — is *runnable now* in one focused session (framing, not experience-mechanics, so **not** blocked). (B) **Full trajectory design** — wave-staging the six experiential mechanisms — is multi-session and **deferred**, blocked on the universe-mechanics fundamentals + CQ-010/012/014. Runs **parallel** to the build; its DESCRIPTION/§L3/ROADMAP reconcile must land before Phase 3 reaches the experiential areas. *Locked* (Stefan + Claude).
- **Vertical readiness: 4 of 5 build-ready** (Administration, Notifications, Observability, Transactions); **Privacy/GDPR is the fresh-design one** (consent store, export pipeline, erasure cascade, Mist TTL all unrealized) — the same finding as the gate's Mist gap, from the privacy angle. The walking skeleton wires the *seam* per vertical; the deep Privacy build is Phase-3 Identity. *Recorded in `phase-2-kickoff.md`.*
- **ADR-U032 — Hub v2 coexistence via a separate clean tree.** New Hub = `hub/` (permanent, no version in the path, ever); old Hub relocated to `hub-legacy/` (read-only oracle, deleted at Phase-4 cutover); `supabase/`, `docs/`, `scripts/` shared at root; Phase-4 cutover = delete `hub-legacy/`. **Naming principle:** "v2" names the *rebuild project* (lives in `docs/planning/hub-v2/` + git history), never a code path. *Locked* (Stefan chose separate-tree, then move old → `hub-legacy/`).
- **npm workspaces** is the monorepo wiring (lightest setup per ADR-U032): root `package.json` is the workspace manager; `hub/` is the app. The **per-app `package.json` split** (root reduced to tooling-only) is **deferred** — root currently keeps a superset of deps so the dashboard + session hooks keep working. *Locked (interim).*
- **FEAT-H001** (walking skeleton) authored at **4-ready**: sign in (IDN-3) → land on `/groups` (GRP-4), `DB→API→frontend` via PC-3, a seam wired for each vertical. *Locked.*

## What was produced

- commit `9e1e315` — Phase-1 gate **PASS** recorded: README flip (Phase 1 → Done, Phase 2 → Active), gate-brief verdict, new `phase-2-kickoff.md`, prior-session bridge updated, + the two cleanups (SPEC 44, substrate-audit cross-ref).
- commit `1f63081` — **CQ-016** run-now split in `OPEN_QUESTIONS.md` + a "Parallel thread" pointer in the hub-v2 README + a row in the `universe-discovery/` discovery backlog (dashboard now surfaces CQ-016 in both the Open-questions and Discovery-backlog panels).
- commit `79f50d1` — **vertical-readiness** snapshot block added to `phase-2-kickoff.md`.
- commit `2e92d7f` — **relocate old Hub → `hub-legacy/`** (180 files, `git mv`, 100% similarity) + **ADR-U032** + `hub-legacy/README` + corrected Hub `CLAUDE.md` note.
- commit `de9f85a` — **FEAT-H001** walking-skeleton spec + features index.
- commit `069d46e` — **doc-health Section 3**: fixed 2 stale repo-location refs (hub `SPECIFICATION` L2; products tier `CLAUDE.md`).
- commit `3a95d75` — **`hub/` scaffold foundation** (npm workspace; Next 16.1.4 / React 19 / Tailwind 4 / TS strict configs copy-with-corrected; minimal shell; `next build` green).
- commit `3ff4818` — **auth bootstrap** (Supabase client/server/middleware + `proxy.ts` + clean `AuthContext`; `next build` green, `.env.local` loaded, proxy middleware active).
- `hub/.env.local` — copied from the root `.env.local` (same shared Supabase project); gitignored (secrets out of the repo).

## What is still open

- **The rest of FEAT-H001 (the next build chunk):** login UI (Story-1), the `/groups` API-first read path via PC-3 with RLS scoping (Story-2), the design-system layer's first primitives, the five vertical seams (telemetry/audit/bell/RLS), then the TDD pair (Jest integration + Playwright E2E) green (Story-3), then `FEAT-H001` → `6-done`.
- **Process debt:** `FEAT-H001` was implemented-against before the feature-development skill's pre-implementation step — it is **not yet bumped to `5-in-cycle`**, has **no task files**, and **no §L4 row** in the Hub `SPECIFICATION`. Settle at the start of the next chunk.
- **CQ-016 framing slice** — runnable now, still unrun (the substantive parallel thread).
- **Key-format check** — `hub/.env.local` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy naming); confirm the value is the current `sb_publishable_*` format (Hub gotcha), refresh if it's a legacy `eyJ…` JWT.
- **Carried from `2026-06-24_01`:** cascade-wide growing-count sweep (pointer-not-snapshot); `ARCHITECTURE_ANATOMY_V1.md` pre-canon "AI Mentor" reconciliation.

## Tensions and contradictions

- **"Clean from line one" vs. copy-with-correction.** The auth-session plumbing was ported near-verbatim (it's standard `@supabase/ssr` boilerplate); the `AuthContext` was written fresh. Reasonable here, but the copy-vs-rewrite line will recur per area — keep it deliberate.
- **§L4 deferral vs. the skill.** The gate brief said §L4 is "intentionally empty until Phase 3," but the feature-development skill wants the §L4 row at the `5-in-cycle` transition (Phase 2). FEAT-H001 is the first feature; its row lands at the bump. Minor process tension to settle, not a contradiction.
- **Root `package.json` is an interim superset** (still lists app deps) rather than the clean tooling-only target — intentional, to avoid breaking the dashboard/hooks before the per-app split.

## Non-obvious insights

- **The dashboard is fully generated from source docs** (`scripts/dashboard/sources.json` maps each panel to a doc section). Never hand-edit `docs/dashboard/index.html`; edit the source + `npm run dashboard`. The **"Discovery backlog" panel is hand-maintained** in `universe-discovery/README.md` (distinct from the auto-derived "Open questions" panel sourced from `OPEN_QUESTIONS.md`).
- **The naming principle generalises:** a code directory names the permanent surface; the rebuild iteration lives in git history + the planning epoch. This is why there will never be a `hub-v3/`, and why `gimbal/`/studios slot in as siblings cleanly.
- **The relocation was a pure `git mv`** (180 files at 100% similarity) — history fully preserved; the oracle's code is unchanged, only moved.

## For the next session

- **Read order:** `hub-v2/README.md` → `hub-v2/phase-2-kickoff.md` (has the vertical-readiness block + the seam-vs-deep-build split) → `products/hub/features/FEAT-H001-*.md` → `decisions/ADR-U032-*.md` → this bridge.
- **Immediate focus:** resume the FEAT-H001 build. Start by settling the process debt (bump → `5-in-cycle`, create task files, add the §L4 row), then **TDD** the slice test-first: login → `/groups`. The live Supabase is wired (`hub/.env.local`).
- **Orientation:** `hub/` is the new Hub (boots, auth wired); `hub-legacy/` is the frozen oracle (read-only, copy-with-correction). Run the Hub with `npm run dev` from root (delegates to the `hub` workspace).
- **Big parallel thread:** the CQ-016 framing slice — runnable now, independent of the build.
- **Locked vs open:** the gate PASS, ADR-U032 + the relocation, the vertical-readiness split, and FEAT-H001's scope are locked; the FEAT-H001 *implementation* and the CQ-016 framing slice are open.

---

## Open items

### Immediate
- [ ] Resume **FEAT-H001 build**: bump → `5-in-cycle` + task files + §L4 row, then TDD login → `/groups` (test-first) against the live substrate.
- [ ] Confirm `hub/.env.local` key is `sb_publishable_*` format (refresh if legacy `eyJ…`).

### Near-term
- [ ] **CQ-016 framing slice** (runnable now) — does the DESCRIPTION convey the ambition? + trajectory sketch.
- [ ] Per-app **`package.json` split** (root → tooling-only; `hub-legacy/` its own if it needs to run).
- [ ] Tidy the stray untracked `hub-legacy/tests/e2e/.auth/user.json` (gitignore gap from the move).

### Deferred
- [ ] Cascade-wide **growing-count sweep** (pointer-not-snapshot).
- [ ] `ARCHITECTURE_ANATOMY_V1.md` pre-canon "AI Mentor = parallel self" reconciliation.
- [ ] **CQ-016 full trajectory design** — blocked on the universe-mechanics fundamentals + CQ-010/012/014.
