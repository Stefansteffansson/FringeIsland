# Session bridge — 2026-08-15 → 2026-08-16: gates executed, the return journey green, PD020 shipped end-to-end

**Continuation of the `2026-08-15_02` bridge** (which closed with #544/#545 held at the gate). This bridge is the delta: everything after Stefan's "approved PR #544 and #545".

## Gate executions (all merges verified via `gh pr view mergedAt`, never assumed)

| PR | What | Approval |
|---|---|---|
| #544 | **TASK-DM-02** — erased authors render 'Unknown' (three leak sites) | "approved PR #544 and #545" (2026-08-15); function-classification gate run green from the branch first |
| #545 | **TASK-IDN-01** — the 30-day grace blueprint (stash trigger, restore door, hourly reaper) | same |
| #547 | **The promised IDN-01 E2E** — the return journey (delete → sign back in → restore door names the date → identity whole), green **3/3** with the whole account-lifecycle spec | fuller-auto (tests only) |
| #548 | **FEAT-PD020** — group-addressed expansion trigger; dead letters retired by construction | "ok merge when green" (2026-08-16) — all three PR checks verified SUCCESS before merge |
| #549 | TASK-PD020-1 closure | fuller-auto |

## The E2E run paid for itself (#547, two spec fixes)

- **A latent optimistic-send race fired for the first time**: the departure journey's DM bubble renders with a "Sending…" label before the row exists, so `getByText` passed while the substrate read behind it answered null. Fixed: wait for the confirmed state, then `expect.poll` the substrate. Found (not caused) — the race predates this session.
- The departure journey's terminal-outcome assertion gained **the restore door as the third honest post-delete outcome** (login form / closed card / restorable surface), and the return journey needed a full `goto` mount after login (the SPA hop out of /login didn't reliably resolve the gate's provider).

## FEAT-PD020 — built same-session, 6-done, merged

- **Migration `20260815223000`**: `ds5_expand_group_addressed_notification` as `trg_ds5_aa_expand_group_addressed` (BEFORE INSERT, alphabetically ahead of the N-D dispatcher). Engagement-group recipients expand to `act_as_group` holders ∪ Stewards (one level, DISTINCT, actor excluded NULL-safely); personal/system pass through byte-identical (recursion bounded by shape; PD014 untouched). Disposition re-addresses stranded rows created_at-preserved, NOTICEs counts.
- **Red-first 4 behavioural + 1 labelled guard → 5/5**; full notifications slice green across all 9 suites; conformance gates 15/15; spec carries Implementation notes + the plain-English walkthrough.
- **The 4-ready spec had a false premise, caught at build**: it claimed the trigger mount was same-owner ("GC-8 n/a") — the manifest says `notifications` is `vertical:notifications`, so the mount is cross-owner and now carries its GC-8 license (N-D suppression precedent). Lesson recorded in the spec: the mechanism walk must read the manifest, not reason from the solution sketch.
- **Two labelled sibling adaptations, found by the post-apply slice run (the grep sweep missed both — neither asserts on recipient rows):** N-C's "unresolvable recipient" cell used an engagement-group insert — the exact dead-letter shape this feature retires — adapted to a system-group recipient; N-D's suite ran on jest's 30s default timeout, which the #543 rate-limit backoff legitimately exceeds — aligned to the 180s sibling standard.
- **The #543 throttle backoff had its first live shakedown**: 18 RATE-LIMITED retries rode out mid-slice; the one genuine-looking failure was the timeout mismatch above, not the throttle. The mechanism works; the timeout floor was its one sharp edge, now filed off.
- **Changelog catch-up**: #544/#545 had merged without their owed entries (the which-CHANGELOG trap, again) — root + hub entries for both landed with #548's own.

## Open items for the next session

1. **The last 4-ready pair: FEAT-PD019 tranche 1 + FEAT-H046 (the wielded forum).** Build order: platform half first (`p_acting` on the three forum contracts under the two-limb PC015 gate — `20260706120000:331,464`; wielded writes stamp `author_group_id`; the ladder's identity gate widens to engagement groups + additive `kind` key, **rebasing on DM-02's merged ladder body in `20260815190000`**), then the Hub half (banners, composer confirm naming the wielding, Group badges on `kind`, and STORY-4 — the hat-staleness loop through PD020's now-live delivery). Each half ~one session; platform half holds at the schema gate.
2. **PD020's prod-apply NOTICE** — when `20260815223000` reaches production, its log line reports the re-address counts for the 6 live dead letters (STORY-3's real verification). Glance at the deploy output.
3. **Wave assignment** — PD019/PD020/H046 sit at `wave: unassigned`; wave-planning's call, no urgency.
4. doc-health-check: **deliberately skipped** this close — no renames/deletions/restructures; every doc change rode its own PR. Next cycle boundary runs it as usual.
5. Environment note: dev DB now carries the PD020 trigger + both 2026-08-15 gate migrations + the hourly `member-deletion-reaper` cron (job runs at :37). A DB reset/reseed re-runs all migrations (they're migration-carried, no manual re-flip needed) — but the ds5_config hint-flag caveat from the Hopper bridge still stands (`realtime_hint_platform_announcements` reverts to 'false' on reseed).
