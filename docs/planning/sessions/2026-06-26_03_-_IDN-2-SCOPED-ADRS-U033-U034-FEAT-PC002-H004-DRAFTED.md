# Session bridge — IDN-2 scoped: ADR-U033 + ADR-U034 accepted, FEAT-PC002 ↔ FEAT-H004 drafted at 4-ready

**Date:** 2026-06-26 (follows session `2026-06-26_02`)
**Session type:** scoping / decision (L4 + ADRs) — not a build
**Status:** Open — IDN-2 is **scoped and unblocked**: the two blocking decisions are resolved as ADRs (Accepted), and the paired specs **FEAT-PC002** (platform) ↔ **FEAT-H004** (Hub) are drafted at **4-ready**. doc-health-check ran **clean** (no critical findings). **Not committed, not pushed** (Stefan gates). Dashboard refresh + commit are the open close-ritual items.
**Participants:** Stefan + Claude

> Durable handoff. Picks up the prior bridge's deferred IDN-2 (FEAT-H004 ↔ FEAT-PC002) and turns it from "blocked on two decisions" into "decided + specced, ready to build." No code was written — this is the scoping pass.

---

## Session summary

Opened by choosing focus (Stefan: **scope IDN-2** over opening Groups). Loaded `ecosystem-decomposition`. Surfaced the two blockers grounded against the ADRs/specs (not asked blind), resolved them with Stefan via three decisions, wrote two ADRs, then derived the paired feature specs and reconciled the §L4 summaries. Closed with doc-health-check (clean) and this bridge. Also did the opening one-line tidy (`.gitignore`).

## What was decided / locked

Three decisions (all Stefan's recommended-option picks), then ratified as Accepted ADRs:

1. **Reaper mechanism → [ADR-U033](../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md) (Accepted).** Enable **pg_cron** (verified available `1.6.4`, not yet enabled) as the platform scheduler; a scheduled `SECURITY DEFINER` sweep of **expired un-transcended Mists** + an explicit-erase path; **inactivity-based TTL** as PC-2 config (not hardcoded); race guard honours ADR-U031's "no erase mid-migration." Operationalises ADR-U004's named pg_cron job; resolves ADR-U031 stage-3's deferred TTL.
2. **Consent substrate → [ADR-U034](../../architecture/decisions/ADR-U034-consent-record-substrate.md) (Accepted).** **Append-only** consent-record table, **PC-2-owned** (Privacy levies obligations, PC-4 consumes), captured **atomically at transcendence**, **open** purpose identifier (no sealed enum). Resolves identity-spec §8 Q8 / X4. Ownership (PC-2 vs PC-4) ratified to **PC-2**.
3. **Recording → two ADRs, then specs** (Stefan's pick). Done in that order.

**Three scoping insights that shaped the specs (locked):**
- **Persistence-and-consent ≠ metamorphosis-completion.** IDN-2 delivers ADR-U031 stage-4's **persistence-and-consent** half only (data binds, consent captured, `is_temporary→false`, Members enrolment). The **ball / Beyond unlock** (gated on "all founding questions answered") is **forward-looking** — the founding-questions assessment is unbuilt — so it is named as a seam, not built. Keeps us out of premature experience design.
- **Continuity = id-preservation, not a copy.** Supabase anon→permanent conversion keeps the same `auth.users.id`, so the Mist's rows carry over unchanged; transcendence is a **finalise-in-place** (flag flip + Members + consent), not a cross-account migration.
- **Reaper ↔ consent boundary is collision-free.** Consent records exist **only post-transcendence**; the reaper reaps **only pre-transcendence Mists** — so the reaper's hard-delete cascade never touches a row carrying durable consent proof.

## What was produced (docs — uncommitted)

- **New ADRs:** `ADR-U033-mist-ephemerality-reaper.md`, `ADR-U034-consent-record-substrate.md` (both **Accepted**). Reciprocal links added into ADR-U031 (Resolved by) + ADR-U004 (Operationalised by).
- **New specs (4-ready):** `docs/platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md` (reaper + atomic transcendence + consent substrate; both ADR-U016 cascade specs — erasure, transcendence; full vertical impact; stability posture; §8 Q8/Q10/X4 resolved). `docs/products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md` (in-place become-a-FIM with consent gate + continuity; the "say goodbye" explicit-erase farewell).
- **Reconciliation edits:** identity-spec §8 (Q8 + Q10 → **Resolved**), §L4 (FEAT-PC002 row added, stale "without specs" bullet dropped, intro + features-without-capabilities updated; §L3 "latent" cells left intact — accurate until the substrate ships). Hub `SPECIFICATION.md` §L4 (FEAT-H004 row + coverage note). ADR index README (added missing **U032** + U033/U034 → 34 files = 34 rows). Both `features/README` indexes.
- **Tidy:** `.gitignore` now ignores `hub-legacy/tests/e2e/.auth/*.json` (the long-standing untracked artifact).

## Verification (doc-health, this session)

- **doc-health-check clean — no critical findings.** Sections 3/5/8 run + 1.5/3.6 mandatory passes; 2/4/6/9/10 skipped (no trigger). All new cross-refs resolve (programmatic link audit over 11 changed files). Both specs 4-ready-honest (stories + G/W/T, valid frontmatter, 0 template placeholders). §L4 summaries consistent with disk. One placeholder confirmed scaffolding (hub ROADMAP.md, registry T3.4).
- **Grounded fact:** pg_cron is **available but not enabled** on FringeIslandDB (`jveybknjawtvosnahebd`) — `default_version 1.6.4`, `installed_version: null`. Supporting `pg_net` / `pgmq` / `http` likewise available-but-off.

## What is still open

- **Close-ritual (Stefan's disposition):**
  - **`npm run dashboard`** — refresh the overview snapshot (not yet run this session).
  - **Commit + push** — this session's work is **uncommitted**; prior session `2026-06-26_02` (FEAT-H003/PC001 6-done) was reportedly pushed at `376ae70`, so this is the first uncommitted layer on top. Gated on Stefan.
  - **Maturity confirm:** both specs set to **4-ready** — Stefan to confirm or downgrade to 3-specified after a story-level read.
- **Accumulation gap still LIVE** — the reaper is specced (FEAT-PC002) but **not built**; anon Mist rows still accumulate until it ships. Unchanged risk posture, now with a clear close path.

## For the next session — building IDN-2

- **Build order:** **FEAT-PC002 first** (platform substrate), then **FEAT-H004** (Hub consumes it) — dependency order, per the FEAT-H003↔PC001 precedent. Load `feature-development`.
- **FEAT-PC002 is schema-heavy** → **schema-review gate** (tasks land at `review`, not `done`): one migration enabling pg_cron + the sweep/explicit-erase functions, the transcendence finalisation function, and the **consent table + RLS** (new table → RLS without exception). All `SECURITY DEFINER` + `search_path = ''`. TDD red-first (standing steer): integration tests against the real DB, including the **concurrent reap-vs-transcend** race window and the **append-only** consent enforcement.
- **FEAT-H004** consumes via Supabase SDK (anon→permanent conversion) + the PostgREST/`/api/v1` finalisation + explicit-erase RPCs — no table calls (ADR-U009). `ConfirmModal` for the farewell; identity re-derivation Mist→FIM without querying in `onAuthStateChange`.
- **Read order:** this bridge → ADR-U033 + ADR-U034 → FEAT-PC002 (cascade specs + stories) → FEAT-H004 → identity-spec §8/§9/§L4.
- **Orientation:** anon sign-in ON; live Supabase wired (`hub/.env.local`); tests `cd hub && npm test`.
