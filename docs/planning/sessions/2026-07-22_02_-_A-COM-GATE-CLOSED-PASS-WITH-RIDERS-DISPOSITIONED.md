# Session bridge — 2026-07-22 (2): A-COM gate CLOSED — pass with riders dispositioned

**Verdict (Stefan, 2026-07-22, verbatim): "verdict is pass-with-riders-dispositioned."** The [gate record](../hub-v2/2026-07-21-communication-area-gate.md) verdict section is closed; the completion-plan checklist reads 11/11.

## What this session did (continuation of 2026-07-22_01)

Stefan walked all 10 live-walk scenarios on production with registered accounts (dev-login steward / Gracy member / DeusEx admin / Alice as the scenario-10 sacrifice, deleted 14:41 UTC per audit log). Every finding was run to ground **during** the walk, red-first, and merged before the verdict:

- **RIDER-1** — `create_group_conversations` seeded to role TEMPLATES only at C-A; `has_permission()` resolves via instances → 160 role instances across 84 pre-C-A groups lacked it (the "New conversation" button hid). Backfill migration `20260722100000` (C-D's ratified pattern), applied on named nod; invariant test green; comm suite 105/105 serially (the 14 parallel-run failures were the known shared-dev-DB trap).
- **RIDER-2** — group-conversation **leave** had contract + BFF route + client but **no rendered affordance** (the tier split delegated leave to the integration tier, which never crosses the surface). Wired `Open | Leave` on participant rows; leave re-lists from the confirmed response (row flips to Join = rejoin). E2E leg added walking join→open→leave→rejoin with history intact (labelled not-yet-run at commit time; runs post-walk).
- **RIDER-3** — forum **edits** emitted no realtime hint (C-C hint layer predates C-D's edit window; "no socket work" carry — a sequencing gap, never a decision). Migration `20260722170000` adds `forum_post_edited` (WHEN content-changed AND NOT is_deleted; C-C shape byte-for-byte); tenant subscribes. Applied on named nod ("ok apply and merge rider-3"); realtime suite 14/14; PD010/H027 dated amendments.
- **RIDER-4** — post-reactivate `/groups` painted "Failed to load your invitations." on a healthy account. **Server-evidenced** (postgres log 14:26:33 + audit log): an overview-bundle read fired while PAUSED adopted 42501-refusal slices into the consume-once bootstrap cache; the post-reactivate landing consumed the stale rejection (third instance of the stale-consume-once class). Fix: reactivation is a **cache boundary** — `invalidateAllCaches()` on success before landing. Two clean instrumented repros documented (both all-200 — the bug needs the nothing-consumes-under-the-gate ordering).
- **Script errors (3, honestly recorded):** forum thread titles are a **non-feature by design** (PD009:78); platform-announcement compose belongs to **A-ADM's Console** (H028:99 — A-COM ships the read side only); plus the original scenario-4 draft. Scripts corrected in place, errors kept visible.
- **Wording items (2, Stefan: "fix now"):** closed-account card's exit reads **"Return to the front page"** (`signOutLabel` prop; paused/suspended keep "Sign out"); tombstone copy is the neutral **"This post was removed"** (no-distinguishing no-go holds; self-deletes no longer claim a moderator acted; A-ADM routing discharged).
- **Filed for later (Stefan: "note it, leave the build as is"):** [TASK-FORUM-01](../backlog/tasks/TASK-FORUM-01-reply-addressing-and-collapse.md) — reply collapse + addressing (surface-only) + the 2-vs-3-tier depth cap as a recorded open decision (mind the "2 levels" vocabulary collision with Facebook's rule — theirs = 2 reply tiers under a comment, ours = 1 reply tier; the task pins this).
- Also this session: DeusEx password reset+verified for the walk (`Walk-2026-DeusEx!` — **rotate before launch**); RIDER-4 repro fixtures erased to zero residue; PR #235 (both held migrations) merged on the earlier named nod; observation recorded that a titleless forum reads as unfinished (retro question).

## Open at close — the next ceremony

1. **Area retro** (A-COM close). Riding it: **doc-health-check** (schema migrations + spec amendments this session = cross-cutting), **TASK-C\* ephemeral-task cleanup** (CA/CB/CC/CD/CE/CF per the ephemeral-tasks rule), and the carried observations: group-page 12-14-read fan-out (warm 941-993 ms vs the 1.0 s B3 letter — NOT exception-covered), titleless-forum experience question, TASK-FORUM-01, Vercel Pro scale-to-one parked decision.
2. **A-NTF opens** after the retro — inherits C-C realtime conventions (`account:<auth_uid>:notifications` topic named in PD010's taxonomy), the U048 split, announcement live-delivery (H028 §99's named forward home), D4 comes due (MEM-2 email dispatch), NTF-6 closes against COM-13's store.
3. Standing carries unchanged: TASK-MIST-01, TASK-DOC-003/004, TASK-OBS-01, TASK-E2E-01, logo, launch checklist.

## Session-facts a successor needs

- One shared dev/prod Supabase DB (`jveybknjawtvosnahebd`): never two integration suites concurrently; serial re-run is the answer to parallel-run failures.
- The live-walk script (v2, registered accounts + direct group links) is reusable protocol shape: `../hub-v2/2026-07-22-acom-live-walk-script.md`.
- Migrations applied this session (all repaired into history): `20260721220000` (export grant), `20260722100000` (RIDER-1 backfill), `20260722170000` (RIDER-3 edit hint).
