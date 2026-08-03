# Session bridge — the RB board settled; HYG-A decomposed to 4-ready under the two-mode hold model (Active / Resting / Suspended); build opens in a FRESH session

**Date:** 2026-08-03 (second session) · **Wave:** Ferd · **Area:** post-A-ADM re-scope (cycle HYG-A)
**Follows:** [`2026-08-03_01_-_A-ADM-GATE-CLOSED-WALK-COMPLETE-PHASE-3-BUILD-DONE.md`](./2026-08-03_01_-_A-ADM-GATE-CLOSED-WALK-COMPLETE-PHASE-3-BUILD-DONE.md)

---

## READ THIS FIRST — the next session BUILDS cycle HYG-A

Stefan's nod landed and PR #388 is MERGED: the specs are 4-ready on main. **Deliberately left for a fresh session** (context headroom for the wide migration; this session's history carries three superseded draft vocabularies that must not bleed into authored SQL). Open with:

1. [FEAT-PC023](../../platform/core/features/FEAT-PC023-group-suspension-enforcement-contracts.md) + [FEAT-H038](../../products/hub/features/FEAT-H038-suspension-integrity-and-state-honesty.md) — the paired 4-ready specs; both enumeration dossiers are embedded in PC023 (write doors AND read doors, migration file:line each).
2. [TASK-HYGA-01](../backlog/tasks/TASK-HYGA-01-pc023-group-suspension-enforcement.md) first (platform: one schema gate — **held with red evidence + apply commands for NAMED approval**, never applied without it), then [TASK-HYGA-02](../backlog/tasks/TASK-HYGA-02-h038-suspension-integrity-hub.md) (Hub; STORY-1..4 can build ahead of the apply).
3. The plan of record is [phase-3-platform-ops-completion-plan.md](../hub-v2/phase-3-platform-ops-completion-plan.md) **v12** — the RB board (SETTLED), the RB-6/RB-7 two-mode amendment, and the naming + permission settle all live there.
4. After HYG-A closes: decompose **ADM-E** (bulk actions + the W-5 bounded members list), then **ADM-F** (ADM-17 role-template editor, design skeleton in the gate record), then the **AB-6 FULL audit** — the Phase-4 cutover's entry condition.

## The model (settled by Stefan this session, in three steps)

**States: Active / Resting / Suspended** (the Social Gathering family — vetted; `resting` is the only new DB value; the hard semantics land on the shipped `suspended`; the draft `offline` never ships).

- **Resting (the visible steward-fix hold):** content readable; member writes refuse `P0001 'group is resting'`; **`rest_group` permission holders act fully and control the state** (one key = toggle + act-during-rest, seeded to the Steward template, auto-granted to platform admins; symmetric member-plane `rest_group()`/`wake_group()`, telemetry-mirrored, no admin-audit row — the close/delete precedent); exits (leave/pause/decline/cancel/withdraw) stay open.
- **Suspended (the hard hazard hold):** findable + labeled everywhere, content quarantined below the admin plane **at the contracts AND the RLS read policies**; no actions for anyone, exits included; **every transition touching suspended is admin-only** (no steward path out; no direct suspended→resting); audited admin wrappers `admin_rest_group`/`admin_wake_group` + amended `admin_suspend_group` (`active|resting → suspended`).

**Recorded verdicts:** DMs stay live across suspension (pair-grain — person hazards are member-suspension's job) · own-data exports unaffected by holds (Art. 15/20) · resting (placed) ≠ paused (chosen) · the verb is "rest", never "put to rest" · W-3's steward post re-reads as a true violation (the walk group was in the hard state — the walk's instinct was right).

## Hard-won substrate discoveries (all disk/live-verified, embedded in PC023 §Problem)

1. **Only 8 of ~30 member-facing group write doors check group status** — the ubiquitous status *mention* is a visibility gate that short-circuits for members.
2. **`leave_group` traps members of held groups today** (`20260719190205:300-302`) — amended in the spec.
3. **The four legacy membership/role tables carry 13 live write policies + grants** (authenticated AND anon) — closed at the gate.
4. **SELECT is live for authenticated + anon on all content tables** (verified live) — the C-series left reads on RLS by design, so **quarantine cannot be contract-only**; the read policies gain not-suspended arms, with `is_conversation_participant()` as the conversations-family chokepoint.
5. **The substrate is the inverse of the model**: `groups_select` hides non-active rows (findability broken) while content stays open — both directions get fixed.

## Decisions made this session

1. RB-1..RB-8 settled as recommended ("go with recommended") · 2. **RB-6/RB-7 AMENDMENT** — the two-mode hold model (Stefan's directive) · 3. Off-line findability refinement (findable + labeled, not invisible) · 4. **Naming settle** — Active/Resting/Suspended over the Community Center and Cozy Venue families (collision evidence in the plan) · 5. **`rest_group` permission model** — one key, symmetric, Steward + admin auto-grant; suspended transitions admin-only · 6. Build in a fresh session (this bridge's reason-for-being).

## PR ledger

#387 board opened (merged, fuller-auto) · #388 decomposition — board settled + HYG-A 4-ready, reworked twice in place (two-mode amendment, then naming + permission model) — **HELD → Stefan's nod → MERGED** · close PR (this bridge + dashboard).

## Verification at close

PR #388 content on origin/main (fast-forward `41b6715`, nine files) · rename sweep for stale draft vocabulary run with a positive control (19 `rest_group` hits; zero stale hits) · live-DB checks run this session: write policies/grants (13 + write grants), SELECT grants (authenticated + anon, seven tables) · specs' payload walk complete (every H038-rendered field traces to a named key; canonical refusal strings recorded as contract surface).

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [ ] doc-health-check — not owed (no cycle boundary; the vocabulary rename is contained to the nine PR files, swept with a control; the NEXT cycle close re-checks)
- [x] Task sweep — nothing owed (TASK-HYGA-01/02 are the open cycle's tasks, deliberately alive)
- [x] Discovery sweep — run after the close PR merges (last step)
