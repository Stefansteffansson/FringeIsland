# Session bridge — 2026-09-03 (3): two of the four ruled items built and HELD at their schema gates — H017-01 retired (#600), journey pause/resume (#601)

**Continuation of `2026-09-03_02`** (the next-session brief). Stefan opened with "what's next according to our bridge document" and then "start!". This session took the four ruled items in the brief's order and stopped after the second, with both held for the named approval. Items 3 and 4 are **not started**.

## Live state (verified at close — cite, don't re-derive)

- `main` = `origin/main` = discovery, clean, at #599 + this bridge. Two branches are pushed with open, **held** PRs; neither touches the other's files, both branched from main.
- **PR #600 — `task/h017-01-retire-pending-nominations-chain` (TASK-H017-01, retire).** Migration `20260903090000` drops `get_my_pending_nominations()`; the route, `fetchPendingNominations()`, the `PendingNomination` type, the six-cell contract suite, three route + two relay unit cells, and the manifest entry are gone. Red at HEAD: the new absence suite 2 red / 1 labelled pin; the classification gate red on the now-unregistered live function. Green at HEAD: lint, typecheck, `next build`, unit 183 suites 1532/1532. FEAT-PC016 reads "superseded by the bell, retired"; the Hub §L3 MEM-7 + §L4 rows, PC-3 §L3, both READMEs, the conformance register, the N-C rider, root + Core CHANGELOGs updated. No `hub/CHANGELOG.md` entry (nothing member-visible).
- **PR #601 — `task/jrn-pause-01-journey-enrolment-pause-resume` (TASK-JRN-PAUSE-01, build).** Migration `20260903100000`: `pause_journey_enrollment` / `resume_journey_enrollment` (own walk only, P0001 names the state, progress untouched, Mist-callable) **plus the finding the task predicted** — both DS-3 lifecycle-fact handlers froze `status = 'active'` rows only, so a paused walk would have sheltered from a member's departure and a group's closure; re-issued byte-identical except three predicates (`in ('active', 'paused')`), extracted from `20260719190205`, self-verified at apply. Hub: Pause/Resume on the detail block, the `/journeys` card and in the player, ConfirmModal-free, cache write-through, BFF route pair with the durable leg. Red at HEAD: 11 contract cells (the two cascade cells red for the RIGHT reason on today's substrate), the classification gate red on the two registered-but-unapplied contracts, 15 unit cells; green after the build: unit 183 suites 1560/1560, lint 0/0, typecheck, build. E2E `journey-pause.spec.ts` written, runs in the post-apply set.
- **Substrate posture unchanged:** client roles hold no table DML (SEC-02); both new adversarial cells assert the grant's 42501 and are labelled pins.

## The two gates — what the named approval unlocks

Each PR body carries the apply + repair commands and its post-apply verification set. **A gate merge unlocks only on an explicitly named approval** ("ok merge #600" / "ok merge #601"), never a generic go-on. Order does not matter — they are independent — but running both post-apply sets back to back means two integration invocations against the one DB: never concurrently (the teardown sweep).

- **#600 reviewer notes:** a DROP, so no ACL to read; the direct-caller answer is PGRST202 for everyone. Post-apply: the absence suite 3/3, the platform slice, the groups slice, the two bell-walking E2E journeys.
- **#601 reviewer notes:** read the two applied contracts' ACLs (no bare `=X/`, no `anon=X`). **ADR-U047 rule 7** describes the member-departed / group-closed handlers as freezing "active" enrolments — after apply they freeze active OR paused. Recorded in FEAT-PD002 STORY-8 and the migration header, *not* silently fixed; the ADR amendment is a carve-out and Stefan's call at the gate. Post-apply: the pause suite 12/12, the platform + journeys + groups slices, and the E2E set (`journey-pause`, `player`, `journeys`, `frozen-and-group-progress`).

## Decisions and findings this session (Claude's, within the rulings — say so if any should be reversed)

1. **FEAT-PC016 keeps `maturity: 6-done`** and carries a RETIRED title suffix + banner + notes: the maturity ladder records what was built; the vocabulary has no "retired" value and inventing one was the wrong kind of new canon. The README/§L3 rows say "6-done · retired 2026-09-03".
2. **Pause is Mist-callable** (actor gate = resolvable + active account, not FIM-only like withdraw), because the task's "the Mist page's walk resolution treats a paused walk as a walk" only makes sense if a Mist can pause their one onboarding walk. The Mist page already resolves the walk by kind, not status — no change needed there.
3. **Own walks only — no group-walk pause this cycle** (a group's walk pauses by the group's lifecycle, not one member's act); recorded as a No-go in both specs. The key-holding Steward gets 42501 like anyone else.
4. **The player's own/via signal is `progress_sharing.available`** (`v_enr.group_id <> v_actor` in PD005) — used to render Pause on own walks only; the contract refuses the rest regardless.
5. **A lint find, fixed and recorded:** a plain async handler with try/catch/finally in the `/journeys` page body made the React Compiler lint bail out of the page *silently* — an injected synchronous setState inside the effect went unreported. `useCallback` restored the analysis (the probe fires again on both pages). Separately, the two `react-hooks/set-state-in-effect` suppressions on `/journeys` and the player became genuinely unused (their targets gained a second caller) and were removed, reason left in the comments. Memory `reference_react_compiler_lint_bailout` carries the probe method.
6. **Hub source files are mixed CRLF/LF per file** despite `core.autocrlf=true`; two scripted edits missed on hardcoded `\r\n`. Edit scripts are now ending-agnostic (memory `reference_windows_find_and_crlf_traps` §4).

## Not done — plainly

- **TASK-SEAL-02** (sealed-thread message read for the admin plane) and **TASK-DB4-01** (sanction communication — decompose first with `ecosystem-decomposition`): not started. Entry points unchanged from `2026-09-03_02`.
- **The E2E `journey-pause.spec.ts` has not run** — it needs the applied contracts. It is in #601's post-apply set.
- **ADR-U047 rule 7 amendment** — flagged, not written (carve-out).
- **`ferd.md`** — still the placeholder; the Ferd close waits on the four.

## House rules that bit this session — carry them

- Print the full `git status` and compare `main` to `origin/main` before every commit chain (done both times; the obsidian-git plugin is disabled but the rule stands).
- `next build` regenerates `.next/types`; a **deleted route** leaves a stale `validator.ts` that fails typecheck AND build with "Cannot find module" — clear `.next/types` + `.next/dev/types` before the gates after any route deletion.
- A scratch heredoc without its terminator swallows the rest of a Bash script silently; a stray `python -` waits on stdin forever. Both cost a round each.
- `find` / `sort` are the Windows binaries in the sandbox; `git ls-files` and `awk` are the safe forms.

## After the four: the Ferd close

Unchanged: write `ferd.md` (the 97 specs, the DoD), walk the quality gates (the deep-cold ADR-U043 pass needs Stefan's walking first), the "v2 is the Hub" verdict line, a ruling on CQ-014, the wave retro, then Eid kickoff.
