# A-ADM gate — ADR-U043 measurement pass (2026-08-02)

Closes the measurement leg of the [Platform-Ops area gate](./2026-08-02-platform-ops-area-gate.md): the eight admin surfaces built across ADM-A..D, all justified standalone reads (admin-only, outside the overview bundle — ADR-U042 guardrail 3).

**Environment:** production `fringe-island.vercel.app` (deploy carrying #378 verified route-by-route before measuring) · same Supabase project · authenticated real path · the measurement FIM (`perf-antf@fringeisland.test`) provisioned by the standing harness, **platform-admin-elevated for this pass**, plus one seeded open report (fabricated target — the drift-honesty render is a legitimate real read); all of it erased at teardown (report deleted, de-elevated, FIM torn down — verified).
**Protocol:** ADR-U043 + Amendment 1 via [`hub/scripts/perf-measure.mjs`](../../hub/scripts/perf-measure.mjs) `coldnav-path`. Deep-cold = **≥ 20 min enforced zero traffic** (22.5 min actual, two separate windows: 08:34–08:56 and 08:56–09:19 UTC). Completion measured to **data-derived selectors** (`admin-nav-members`, `admin-group-row-*`, `admin-member-row-*`, `membership-row-*`, `admin-report-row-*`, `resolve-panel`, `admin-audit-row-*`).

## Headline

**Cold is 3.6–4.4 s, provisioning-dominated, and extends the standing labelled pre-launch exception — measurably better than the ~5.5 s A-NTF era.** Everything warm passes the B3 ceiling **except the two detail pages**, whose fresh-context full loads cross 1.0 s in 3 of 5 runs (up to 1.13×) — the A-NTF "ceiling-hugging" class has crossed the line, and that is a named carried finding for the gate verdict.

## Results

### Deep-cold — first authenticated navigation after ≥22 min idle

| First page of session | Wall | Fan-out fires at | B2 budget | Verdict |
|---|---|---|---|---|
| `/admin` (window 1) | **3 638 ms** | 2 844 ms | ≤ 2 500 ms | **FAIL** — 1.46× |
| `/admin/members` (window 2) | **4 395 ms** | 3 083 ms | ≤ 2 500 ms | **FAIL** — 1.76× |

The cost is provisioning + shell (the page's own reads don't even start until ~2.8–3.1 s; the reads themselves run 0.3–1.1 s). Mean ≈ 4.0 s vs the A-NTF era's ≈ 5.5 s — same class, smaller. Also > 3 s, which B6 independently classes as a defect. **Extends the standing labelled pre-launch exception** (closed by decision at the A-NTF gate; no investigation commissioned — the composition was established there and nothing here contradicts it).

### Semi-warm — second navigation of the cold session

| Page | Wall |
|---|---|
| `/admin/members` (after `/admin`) | 1 445 ms |
| `/admin/audit` (after `/admin/members`) | 939 ms |

### Warm — fresh-context full loads (the strict B3 form; first-contact round excluded, shown for honesty)

| Page | First-contact | Warm runs | B3 ≤ 1 000 ms |
|---|---|---|---|
| `/admin` | 938 | 466 / 419 | PASS, wide |
| `/admin/groups` | 1 710 | 920 / 942 | PASS — ceiling-hugging |
| `/admin/members` | 1 452 | 964 / 953 | PASS — ceiling-hugging |
| `/admin/members/[id]` | — | 1 127 / 1 060 / 495 | **2 of 3 runs OVER** (1.06–1.13×) |
| `/admin/moderation` | 910 | 923 / 586 | PASS |
| `/admin/moderation/[id]` | 1 077 | 1 036 / 476 | **1 of 2 runs over** (1.04×) |
| `/admin/audit` | 937 | 923 / 415 | PASS |

Fresh-context full load is deliberately the strict form (uncached bundles — the A-NTF soft-nav class ran 272–399 ms where its fresh-context ran 937). The **carried finding**: the admin *detail* pages cross the 1.0 s ceiling in this form — the same family A-NTF carried at 937-with-63-ms-spare, now over the line. Both pages fire only 2 API reads with the slowest at 231–302 ms warm; the wall is dominated by bundle + hydration + "unaccounted" (up to ~500 ms). Options for the verdict: **accept-as-carried** (admin-only surfaces, pre-launch, soft-nav bound comfortably below) or **commission a warm investigation** (the A-NTF precedent when 937 ms was flagged).

## Method notes (adding to the A-NTF set)

- **A state-conditional testid is not a completion selector.** `state-badge` renders only for non-active members; the harness watched a fully-loaded page time out three times because the fixture was active. Selectors must be unconditionally data-derived (`membership-row-*` fixed it).
- **Two MSYS traps cost three dead runs before a single number landed:** Git Bash rewrites `/admin` arguments into `C:/Program Files/Git/admin` (`MSYS_NO_PATHCONV=1` required), and `PERF_ENV` is the env-*file* path, not a label. Neither failure mode produces a nonzero pipeline exit if the output is filtered — run the control before believing a silent run.
- The idle windows survive harness crashes (a dead sleeper sends no traffic) — only successful navigation restarts the clock.

## Ledger

One row appended to the [perf ledger](../reference/PERF-MEASUREMENT-LEDGER.md) in the same PR as this record.
