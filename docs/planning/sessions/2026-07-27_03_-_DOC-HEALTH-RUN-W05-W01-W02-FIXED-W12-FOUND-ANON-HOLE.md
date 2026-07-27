# Session bridge — doc-health run, three walk findings fixed, and W12 found an anon-EXECUTE hole

**Date:** 2026-07-27 (session 03) · **Wave:** Ferd · **Area:** A-NTF gate remediation + the owed doc-health check
**Follows:** [`2026-07-27_02_-_A-NTF-WALK-DONE-GATE-HELD-W05-ESCALATED.md`](./2026-07-27_02_-_A-NTF-WALK-DONE-GATE-HELD-W05-ESCALATED.md)

---

## One-paragraph state

`main` at `4cf7f6a`, tree clean, **no open PRs**, discovery synced **0/0**, dashboard refreshed (7 tabs, **735** files). **Five PRs merged:** #315 (the owed doc-health-check), #316 (W-05), #317 (W-01 + W-02), #318 (W12 roll-up + anon-EXECUTE repair, schema gate, **applied and verified live**), #319 (sign-out scope). The A-NTF gate is **still HELD** — three of its blocking items are discharged, five remain. **The most important thing this session produced was not a fix: it was the W12 audit, which found seven contracts reachable by the anonymous PostgREST role.**

## What shipped

| PR | What |
|---|---|
| **#315** | `doc-health-check` full run — the item owed across four bridges |
| **#316** | **W-05** — a network hiccup no longer signs a member out of every device |
| **#317** | **W-01 + W-02** — the inbox answers a click; page-side mark-all clears the badge |
| **#318** | **W12 per-RPC roll-up (Appendix A)** + the anon-EXECUTE repair migration |
| **#319** | Sign-out is local to the browser, not global |

**Suite state:** Hub unit **996/996** (131 suites) · integration **95/95** across `platform` + `notifications` (those two directories, *not* a full-suite run) · notification E2E **10/10**, profile + sessions E2E **7/7** · `next build` clean, eslint 0.

## The W12 finding — read this if you read nothing else

**Seven A-NTF contracts were executable by `anon`.** The 2026-07-06 lockdown removed `anon` from the DEFAULT PRIVILEGES for functions, but **not** Postgres's built-in default, which grants `EXECUTE TO PUBLIC` on every new function — and `anon` inherits PUBLIC. Every migration must therefore revoke PUBLIC *explicitly*. N-A, N-B and N-C all wrote `REVOKE … FROM PUBLIC, anon`. **N-D wrote `FROM anon` alone on all seven of its contracts, which is a no-op against a privilege held via PUBLIC.**

**Blast radius, measured:** of **181** functions in `public`, exactly those 7 — the lockdown holds everywhere else, so N-D was the sole regression since it landed.

**Nothing was exploitable.** All seven refuse anon *in the body*, probed live under `SET LOCAL ROLE`: `42501 platform admin required` ×4, `28000 no active subject` ×3. What failed was the **grant layer**, which ADR-U038 L27 names as an enforcement surface in its own right precisely because PostgREST is reachable with the public anon key.

Repair `20260727120000` applied and verified live: **7 → 0** anon-executable, the stray trigger grant closed, member and operator doors confirmed still open. Pure REVOKE plus `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` so the next migration cannot inherit the trap.

**The prevention matters more than the fix.** `anon-execute-lockdown.test.ts` was a **hardcoded list** — it could only ever catch functions that existed when it was written, which is exactly how this escaped. It now asserts the **invariant**: zero anon-executable functions in `public`, allowlist empty by design. Full evidence: [Appendix A](../hub-v2/2026-07-27-notifications-area-gate.md#appendix-a--w12-per-rpc-gate-verification-roll-up).

## Decisions taken

**Sign-out is local to the browser** (Stefan, this session). `signOut()` defaults to `scope: 'global'`, so signing out on a laptop silently ended the member's phone too — the opposite of the convention every comparable system follows (Google, Microsoft, Facebook, Apple, GitHub, Slack all treat it as device-local, with "sign out everywhere" behind a separate named control beside a device list). All five sign-out call sites are now local. **"Sign out everywhere" is deliberately deferred** — it is a *new capability* needing a platform bulk-revoke contract (today only `DELETE /api/sessions/[id]` exists), so it wants a paired spec, not a slipped-in change.

## Corrections made this session, worth knowing

- I told Stefan `profile.spec` STORY-4 **depended** on the global sign-out scope. **It does not** — STORY-4 asserts only local effects. The real relationship was the reverse: global sign-out *server-revoked the shared storageState session*, which is why `sessions.spec` uses fresh logins. Making sign-out local **removed** a suite hazard. FEAT-H012 carried the wrong claim and is corrected in place.
- FEAT-H012's Implementation notes claimed *"network failure is never treated as refusal"* — the written intent, which the code did not honour. Corrected in the W-05 amendment rather than quietly overwritten.
- Two of my own W-01/W-02 unit cases first failed on **my** harness errors (a role-name selector where the buttons carry testids; the `ConfirmModal` gate on Accept). The code was right; the tests were wrong.
- W-05's finding had been *fixed* without its finding entry being *marked*. The findings doc now carries status lines for W-01, W-02 and W-05.

## Where the next session starts

The gate's remaining five, in the order I'd take them:

1. **NB-8** — Mist-posture proof. No decision needed.
2. **The email-deferral recording** — small, clears the board. Distinct from W-08 (the member-facing sentence).
3. **U049 §8 Q1 (adapter ownership)** + **the DS-5 spec advance (carrying W-09 and W-04)** — bring these as **one decision board**, not dripped questions. W-09's rule is already ruled (*asks are not news*; registry split, the surgical `action_type IS NOT NULL` exemption **rejected** because `invitation_received` carries no `action_type` and that is the common case). **W-04 must be handled with it** or the letter reaches the member and still goes nowhere.
4. **The 937 ms warm ceiling-hugger** — needs a deployed environment and an enforced idle window, so last.
5. **Then the task sweep** — `TASK-NC-01..04`, `TASK-NC-06`, `TASK-ND-01..05` still held pending gate closure. **`TASK-NC-05` must survive**; its owed measurement is done, so re-check whether it can finally close. Deletion is a carve-out.
6. **Then A-ADM** — the sixth and last Phase-3 area, where [`TASK-OBS-01`](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md) lands at area open.

Still open, unrelated to the gate: the **W-03** and **W-07** seams (W-07 could ride a page-refresh fix; W-03 is a consequence of the copy law, not a slip).

## Close ritual

- [x] `npm run dashboard` — refreshed (7 tabs, 735 files)
- [x] Session bridge (this file)
- [x] Discovery sweep — worktree clean, `main` merged back into `discovery`, pushed, synced **0/0**
- [x] All five PRs merged, branches deleted, `main` at `4cf7f6a`, tree clean, no open PRs
- [x] `doc-health-check` — **run this session** (#315), which was its own item 0. **Considered again at close and judged not owed:** the only cross-cutting change since is migration `20260727120000`, a pure REVOKE whose schema effect is documented in Appendix A, the root CHANGELOG and the migration header itself. Recorded rather than silently skipped, per the area retro's "locally honest checkbox" learning.
