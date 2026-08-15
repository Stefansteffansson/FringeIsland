# Session bridge — 2026-08-13 → 2026-08-15: the Hopper walk

**Span:** one continuous session across three days. **Mode:** Stefan walking the live deploy (fringe-island.vercel.app) with seven fresh fixtures (the Hoppers: Albin, Beppe, Cecar, Dylan, Erik, Fredrik, Gunnar); Claude verifying every find against substrate + logs, fixing small things immediately (red-first), registering big things. Found-and-fixed cadence throughout.

## Shipped (all merged to main)

| PR | What | Gate |
|---|---|---|
| #530 | **TASK-TRX-01** — `finalise_transcendence` carries the entered identity (name/nickname/email + personal-group rename, same atomic txn; backfill repaired the stranded live row). Migration `20260813204500`. | Schema gate, executed on named approval ("ok merge 530", 2026-08-14) |
| #531 | **TASK-TRX-02** — identity held at `'mist'` through the transcend window; caches invalidated + `refreshNavigation` on success (the poisoned-panels race). | fuller-auto |
| #535 | Group-page **members-only honesty**: Forum/Announcements/Conversations sections render "…is for members of this group" on a 403 instead of the malfunction fallback. New `hub/lib/http/status-error.ts`. | fuller-auto |
| #538 | **role_assigned/role_removed remapped `membership` → `roles`** (data migration `20260815143000`, ruled option A) + the missing **Preferences link** in the Notifications header. 3 labelled cell adaptations (see config ruling below). | fuller-auto (data-only registry change, explicit ruling) |
| #532/533/534/536/537/539 | Docs: task closures, deferral registrations, findings. | fuller-auto |

**The original bug's loop closed end-to-end:** Erik (repaired) self-enrolled in "Who am I?" — the exact journey that bounced him as a Mist — 2026-08-15 13:21, substrate-clean.

## Config ruling (NOT in any migration — the bridge is its record)

**`ds5_config.realtime_hint_platform_announcements = 'true'`** (Stefan, 2026-08-14): platform announcements now emit live bell hints (verified: 7 hints / 7 recipients).
- **A DB reset/reseed silently reverts this to `'false'`** (the N-C seed default). Re-flip after any reseed.
- At-scale caveat stands: N members = N `realtime.send` per announcement; a shared broadcast topic is the eventual fix (parked with launch posture).
- The dispatcher suite pinned the seed default and went red two days later — adapted in #538 to config-aware cells (mechanism proven under both states, value restored). **Lesson, worth binding: a config-value change that alters shipped behaviour gets the same sibling-assertion sweep as a migration.**

## Ruled + registered (the build queue for "soon")

- **TASK-IDN-01** (RULED, high): self-deletion adopts the standard grace-period blueprint — 30-day window, restore-on-login, reaper hard-erase (Mist-reaper pattern + `admin_hard_delete_user` mechanics), honest copy with the date. Found because "delete my account for good" currently retains email + `auth.users` credentials indefinitely. Schema-gated.
- **TASK-ACT-01** (registered, high, REAFFIRMED): acting-as stops at the permissions panel — a wielded group's content powers have no doors anywhere (Hub or substrate). Plus the **dead-letter class**: 6 notification rows addressed to "Albin group 1" that no human can ever read (role/participation family, growing). One board owns both.
- **TASK-DM-02** (registered): erased authors render the forbidden literal "[Deleted User]" where the C-B display law says "Unknown" — scrub-in-place feeds the ladder's rung 1. Fix direction rides IDN-01's mechanism choice.
- **COM-9 composer** deferral: sixth row in the platform-ops deferred register (no activation date).

## Proven live (no action needed)

DM-01 content tombstone (first live proof — Beppe's sacrifice: bodies erased, survivor's words intact, shape intact) · rejoin-restores-attribution (COM-14 rung 1, watched live) · steward hand-over ceremony incl. leave cascade + sole-steward refusal + DeusEx-fallback warning honoured · ask-vs-news category law (asks ring through muting; news respects it; dispatcher suppression exact) · acting empowerment via custom role (`act_as_group`) + no-fake-doors both directions + paused-hat honesty · DM outlives shared membership (person-anchored, by design) · report → moderation → dismissal loop with content snapshot at report time · public-group face for ex-members.

## Environment facts worth keeping

- **Management-API throttling** (`ThrottlerException: Too Many Requests`) masqueraded as a 57-red mass failure: repeated back-to-back integration-slice runs + session-long MCP SQL traffic burn the budget; failures land in `runAdminSql` fixture plumbing of untouched suites and VARY run to run. Space out slice runs; never re-run to "confirm" a mass red. Observation: `isManagementApiTransient` does not classify ThrottlerException as retryable — possibly a helper gap, not filed.
- **Beppe is spent** (self-deletion fixture). Six Hoppers remain; Erik carries transcendence history, Gunnar carries leave/rejoin history.
- doc-health-check: **deliberately skipped** this close — the session's migrations (one function body, one registry UPDATE) carried their doc updates inline; no renames/deletions/restructures occurred. Next cycle boundary runs it as usual.

## Next session starts here

1. **TASK-ACT-01 board** (queued for "the next pause") — wielded content actions + dead-letter delivery semantics + hat-staleness; scope order question included.
2. **TASK-IDN-01 board + build** ("we'll build it soon") — grace length default 30d, restore UX, wipe scope, suppression-record question. TASK-DM-02 rides the mechanism choice.
3. **Full notifications slice at close: 117/121 (7/8 suites), NOT claimed green.** The run's own teardown hit `ThrottlerException` — the Management-API budget was still constrained, so the 4 reds are consistent with the throttle class but unverified (suite names not captured; the run's output was tail-truncated). The four suites this session actually touched ran **42/42 clean** in an earlier drained window. **Next session opens with one fresh slice run** (before any DB-heavy work, not after) — if any red survives a genuinely quiet window, it gets the J-E treatment: verify at main HEAD, fence found-vs-caused, own diagnosis.
