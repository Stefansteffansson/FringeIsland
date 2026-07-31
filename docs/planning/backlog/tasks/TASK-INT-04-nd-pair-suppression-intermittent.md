# The N-D suppression PAIR test is intermittent in fleet, green in isolation

---
id: TASK-INT-04
title: "FEAT-PD016 'PAIR: a muted category is not delivered AND an unmuted sibling still is' fails ~2 runs in 5 when the notifications directory runs together"
status: done
assigned_to: unassigned
priority: medium
feature: FEAT-PD016
owner: platform/domain/communication
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 2
---

## What happens

`tests/integration/notifications/preference-and-dispatcher-contracts.test.ts` → STORY-2 → *"PAIR: a muted category is not delivered AND an unmuted sibling still is"* fails intermittently when the whole `tests/integration/notifications` directory runs, and passes reliably on its own.

**Observed 2026-07-28, A-NTF area gate: 2 failures in 5 full-directory runs (89/89 on the other three). 25/25 green in isolation, repeatedly.**

## Why it is filed rather than dismissed

It was called a fleet flake on the first occurrence, on the strength of one isolation pass and one clean re-run. **That call was premature and the second failure retracted it.** Two failures in five runs is not a flake profile; it is an order- or state-dependent defect that happens to pass more often than it fails. Filed so the next person does not repeat the dismissal.

## CAPTURED 2026-07-28 — and the hypothesis below was REFUTED

The failure was caught on **run 4 of 8** consecutive full-directory runs (runs 1–3 green, 100/100 each). Full logs preserved. **There was no assertion failure at all** — `grep` for expectation output on the failing run returns zero. The run died on the PAIR test's **very first line**:

```
● FEAT-PD016 … › PAIR: a muted category is not delivered AND an unmuted sibling still is

  runAdminSql failed: {"message":"upstream connect error or disconnect/reset
  before headers. reset reason: connection termination"}

  at runAdminSql (tests/helpers/supabase.ts:319:11)
  at rawPreference (preference-and-dispatcher-contracts.test.ts:217:5)
  at Object.<anonymous> (preference-and-dispatcher-contracts.test.ts:459:7)
```

`:459` is `await rawPreference(...)` — the test never reached either assertion.

**So `MUTED_KIND = 'member_left'` is not implicated, and neither half of the PAIR fails.** The suppression logic was never the problem. `runAdminSql` was the only helper in the file with **no retry** — `createTestUser`, `signInWithRetry` and `withAnonRateLimitRetry` all had one — against a management API (`api.supabase.com`) that intermittently resets connections.

**Why it looked order-dependent, and wasn't.** It is per-call failure probability times call volume. `preference-and-dispatcher-contracts.test.ts` alone makes **25+** `runAdminSql` calls, and a full directory run makes many times that; the isolated file makes few enough to almost never hit a reset. That reproduces the observed profile exactly — ~2 in 5 in fleet, 25/25 in isolation — with no ordering, no state leakage, and no involvement of any notification kind. Transport-error counts across the captured runs: **0, 0, 0, 1** — the 1 being the only failing run.

Same class as [`TASK-INT-01`](./TASK-INT-01-auth-admin-es256-flake.md)'s ES256 flake: an upstream dev-DB infrastructure fault, not a product defect.

## Fix applied

`isManagementApiTransient` + a bounded 4-attempt exponential backoff in `runAdminSql`, on the `isAuthAdminTransient` model — narrow by design, with `tests/unit/helpers/management-api-transient.test.ts` existing chiefly for its **negative** cases: a missing column, a constraint violation, a missing function, a `42501`, a `P0001` domain refusal and an auth failure must all still fail fast and loudly.

**Retry is safe here, and the captured message is why:** *"reset **before headers**"* means the proxy never established the upstream connection, so the statement did not execute. A retry cannot double-apply a write.

**The PAIR discipline is untouched** — no assertion was weakened, because no assertion was ever failing.

### The first fix was incomplete, and the verification streak is what caught it

Run 1 of the 10-run confirmation failed on a **second face of the same outage**:

```
runAdminSql failed: {"message":"SyntaxError: Unexpected token '<',
  \"<!DOCTYPE \"... is not valid JSON"}
```

The proxy answered with an **HTML error page**, so `res.json()` threw on the `<` before any predicate could see a message. The pattern-matching fix did exactly what it was designed to do — declined to retry an unrecognised failure and failed fast — and was simply blind to this shape.

**Adding a third regex would have invited a fourth.** The fix is structural instead: `runAdminSql` now has two branches, and only one needs a pattern.

- **Thrown** (socket reset, or an HTML page that breaks `res.json()`) → **transient by construction, retried without matching.** A thrown error can never be a SQL answer, because Postgres always replies with a well-formed JSON body. Nothing real can hide here.
- **Reported** (a JSON body carrying `error`/`message`) → judged by the narrow predicate, so a bad column or a violated constraint still fails fast.

The HTML signature is deliberately asserted **false** in the predicate's unit tests, so a later reader does not "fix" it by widening the regex and re-opening the over-matching risk.

Worth keeping in view: **one captured failure was enough to refute the hypothesis but not enough to characterise the fault.** The streak was not ceremony.

## What was known before the capture (kept — the hypothesis was wrong, and that is worth seeing)

- The test mutes `membership` for its own member, then inserts a muted-category row and a control-category row, asserting the first is suppressed and the second is delivered.
- `MUTED_KIND` was changed at this gate from `invitation_received` to `member_left`, because `invitation_received` moved to the non-suppressible `asks` category (migration `20260727180000`, board GB-3). **The intermittency was first observed after that change**, which makes the new constant the prime suspect — but it is a suspect, not a diagnosis. It was not confirmed, and the failure detail was never captured on a failing run.
- Both halves of the PAIR are candidates. Which one fails is **not yet known** — every attempt to capture the assertion output landed on a passing run.
- `member_left` is emitted organically by real membership changes (`leave_group`, member removal), so a plausible mechanism is a sibling suite's teardown emitting a `member_left` to this member between the baseline read and the assertion. Muting should suppress it — unless the emission lands before the preference row is written.

## Acceptance

- [x] Capture the actual assertion failure on a failing run — **done 2026-07-28, run 4 of 8, logs preserved.** The instruction not to proceed on the hypothesis was the right one: there was no assertion failure, and the hypothesis was wrong.
- [x] Name which half fails and why — **neither half fails.** The test dies at `rawPreference`, its first line, on an unretried management-API connection reset; it never reaches an assertion.
- [x] Fix the cause, not the symptom — `runAdminSql` gained the bounded retry every sibling helper already had. **No assertion was weakened, because no assertion was failing.**
- [x] 10 consecutive full-directory runs green — **10/10, 100 tests each, 2026-07-28** (after the structural fix; the first attempt at this streak is what exposed the HTML-page face above).

**One honest limit on what that streak proved — since answered by evidence.** All ten runs completed with **no transient occurring at all**, so the retry path was never exercised by them; they proved stability, not that the retry works.

**Then the logging earned itself.** Across three subsequent full `tests/integration` runs the retry fired **twice**, both times recovering into a green 715-test suite, and the first one was the HTML-page face exactly:

```
runAdminSql: transient transport failure, retrying (attempt 1/4):
  {"message":"SyntaxError: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"}
```

So the fix is confirmed by observation, not only by diagnosis. Note it took ~3 800 tests' worth of running to see two events — which is why the ten-run streak saw none, and why a silent retry would have left this unmeasurable indefinitely. Worse, until this task added logging, a retry that DID fire would have been indistinguishable from a healthy run — the retry said nothing.

**Both retries now log.** `runAdminSql` and `createTestUser` each emit a `console.warn` naming the attempt and the message. A swallowed retry is a silent failure, which is against the tier's own no-silent-failures law and is precisely the shape that let 11 150 orphaned personal groups accumulate unseen (TASK-INT-03). `createTestUser`'s retry had been silent since TASK-INT-01, so the ES256 flake's real frequency was never measurable either. It is now — for both.

## Verification

`cd hub && npx jest tests/integration/notifications --runInBand`, repeated. Before this task: ~2 failures in 5.
