# FEAT-PD005: Group journey progress, sharing consent, and frozen-walk contracts — consent opens the window, permissions hold the door, the freeze explains itself

---
id: FEAT-PD005
title: Group journey progress, sharing consent, and frozen-walk contracts
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Three gaps, one cycle (J-D — JRN-14/16/17):

1. **The freeze never explains itself.** Enrolment freezes exist (`status='frozen'` + `progress_data.frozen_reason`/`frozen_at`, written by the PC013/PC014 membership-lifecycle cascades — reasons `left_group`, `removed_from_group`, `group_closed`, `group_archived`), and `get_player_state` already serves a frozen walk read-only (no status guard on the read; P0001 on the writes — the read/write asymmetry *is* frozen mode). But the reason never reaches the payload, so JRN-14's "read-only mode **with explanation**" has nothing to render. And the freeze cascades themselves were built in the Groups area — bridge `_14` commissions their **re-verification at this area** as red-first tests where JRN-14 builds, including a recorded disposition for the documented closed-vs-archived last-leader-trigger asymmetry.
2. **Nothing serves a Steward or Guide any group progress at all.** `get_player_state` reads the **caller's** instances only (its own comment promises: "J-D adds the consent-gated Steward/Guide reads as separate contracts"), and `get_group_enrollment_summary` is journey-level (which journeys, what status), not step-grain. JRN-16/17 need the reads — but DS-3 invariant 4 (developmental privacy: Stewards and Guides cannot see a member's private developmental data) and invariant 8 (no comparative-progress surface, ever) mean the contract must be **consent-derived and non-comparative by construction**, not filtered at the surface.
3. **The consent mechanism for this doesn't exist yet.** `consent_records` is append-only with an open `purpose` vocabulary (only `'transcendence'` in flight), and the only contracts are self-only (`get_own_consent_state`, `record_consent_decision`). There is no cross-subject consent check anywhere — J-D designs the first one.

## Solution sketch

**No new tables, columns, or RLS policies.** New SECURITY DEFINER contracts over the existing substrate + one seed addition (a permission key) + one additive re-issue of `get_player_state`.

- **`set_journey_progress_sharing(p_enrollment_id, p_share boolean)`** — self-only consent write for group walks: inserts a `consent_records` row (subject = caller; `purpose = 'journey_progress_visibility'`; `capture_context` carrying `{enrollment_id, group_id, share}`), latest-record-wins per (subject, purpose, enrolment). Append-only substrate honoured — revocation is a newer row, never a mutation. Refused on solo walks (nothing to share to — the walker is the party).
- **`get_group_journey_progress(p_enrollment_id)`** — the JRN-16/17 read. Gate: traveller standing on the party (P0002 conceal for outsiders), then `has_permission(actor, party_group, 'view_group_progress')` (42501 for members without it — the enrolment is visible to them already; the *progress window* is what the permission holds). Payload: the step skeleton (order/title/required — no content bodies), **all active members listed neutrally** (membership is already group-visible; alphabetical, never ordered by progress), each either `sharing: false` (nothing else — not even counts include them) or `sharing: true` with **completion marks only** (per-step done/open, required-progress count, instance-derived `traveller_completed`) — **no timing** (time stays the traveller's own record, JRN-11), and a group-level `aggregate` (per-step completed counts) computed **over sharing members only** with an explicit basis marker.
- **`get_player_state` re-issue (additive):** a `freeze {reason, frozen_at}` block surfaced from `progress_data` when frozen (open reason vocabulary — consumers must fallback-render unknown reasons), and a `progress_sharing {available, sharing}` block so the traveller's own toggle state boots with the player. Pre-existing keys byte-shape-pinned.
- **Permissions:** the seeded catalog pair `view_group_progress` / `view_others_progress` (discovered live-wired to the Steward and Guide templates at build — no new seeding; no enum, no role-name matching anywhere; `has_permission` only).
- **The freeze re-verification (the bridge `_14` commission, verbatim from the Groups plan):** red-first tests demonstrate the four MEM-5/6/7/8 cascade writers produce `frozen` + the correct reason, that frozen walks read and refuse writes as designed, and the closed-vs-archived last-leader-trigger asymmetry is driven both ways with its disposition recorded at the gate.

## Appetite

One cycle (one focused day, the J-A/J-B/J-C shape): red suite → migration at the schema gate → green + sweep.

## Rabbit holes

- **Consent-state reduction:** latest-record-wins per (subject, purpose, enrolment-context) is the whole model — do not build a consent-state table, a cache, or a revocation flag (append-only means the log *is* the state).
- **Small-group de-anonymization:** resist "aggregate over everyone, it's only counts" — over a two-member party a count is a member's data. Aggregates derive from sharing members only, full stop (Q4).
- **Cascade re-design:** the re-verification pins what PC013/PC014 *do*; it does not redesign them. If a pinned truth looks wrong (e.g. which statuses freeze), that's a board question with evidence, not an in-cycle rewrite.
- **Timing in leader reads:** tempting, excluded (Q5) — it is the sharpest comparative surface and nothing in JRN-16/17 requires it.

## No-gos

- No new tables, columns, or RLS policies; no consent-substrate schema change (`purpose` is open text by design).
- No delivery of anything (A-NTF); no notification rows for sharing flips or progress reads.
- No cross-group or cross-journey aggregates; no platform-admin progress surface (Console scope, ADR-U028).
- No unfreeze/refreeze contracts (the cascades own freeze state; IDN-10's own flows are parked — this feature only *records* what its tests close for that disposition).
- No comparative framing in any payload key — no rankings, percentiles, or member ordering by progress (invariant 8 is structural, not copy).

## Stories

### STORY-1: The freeze cascades hold, and the walk explains itself (JRN-14 + the bridge `_14` commission)
As the platform, I want the four membership-lifecycle freezes re-verified where the frozen walk renders, so that frozen mode rests on demonstrated cascades, not remembered ones.

**Acceptance criteria:**
- Given each of the four writers (MEM-5 remove → `removed_from_group`, MEM-6 leave → `left_group`, MEM-8 closure → `group_closed`, GRP-9 archive → `group_archived`), when the cascade fires, then the affected enrolment(s) take `status='frozen'` with the matching `progress_data.frozen_reason` and `frozen_at` — pinned red-first against the live substrate, including *which rows each cascade targets* and *which enrolment statuses it touches* (the completed-then-frozen interplay is pinned as-built and surfaced at the gate).
- Given a frozen enrolment, when `get_player_state` is called by a traveller with standing, then the full walk returns read-only with the additive `freeze {reason, frozen_at}` block; when `enter_journey_step`/`complete_journey_step` are called, then P0001 refuses exactly as today.
- Given a traveller whose membership ended with the freeze (`left_group`, `removed_from_group`, and closure/archive where the cascade ends memberships), when they call `get_player_state` on the frozen enrolment, then the **read admits them through their lived record** — own instances on the enrolment ground read standing where active membership is gone (Q9) — while enter/complete and every other write keep the active-membership gate unchanged. The J-C walkthrough's "P0002 conceals after leaving" truth is superseded for *reads on frozen walks only*, by this cycle's decision.
- Given the last-leader-removal trigger, when closure and archive are each driven end-to-end, then the closed-vs-archived asymmetry (bypass on `closed` only) has a demonstrated truth and a recorded disposition (Q8) — fix or working-as-intended, decided at the gate with the evidence.

### STORY-2: Sharing is the traveller's own, append-only decision (PC-4 consent)
As a traveller on a group walk, I want to opt my progress in or out of my group leads' view, so that visibility is my explicit, revocable act — never a default.

**Acceptance criteria:**
- Given a via-group active or completed walk, when I call `set_journey_progress_sharing(enrollment, true|false)`, then a new `consent_records` row appends (subject = me; `purpose='journey_progress_visibility'`; context carrying the enrolment) and the latest row wins — no UPDATE, no DELETE, ever (the append-only trigger stays untouched).
- Given I have never decided, then I am not sharing (private by default — invariant 4); given I flip to `false` after `true`, then the very next progress read excludes me (revocation is immediate, no grace window).
- Given a solo walk (walker is the party) or an enrolment I have no standing on, then the call refuses (P0001 / P0002 respectively) — there is no one to share to, or nothing to see.

### STORY-3: The progress window is role-held and consent-shaped (JRN-16/17)
As the platform, I want the group progress read gated by standing, permission, and consent in that order, so that no layer of the door depends on a surface behaving.

**Acceptance criteria:**
- Given a caller who is not an active member of the party group, when `get_group_journey_progress` is called, then P0002 conceals existence; given an active member without `view_group_progress`, then 42501 refuses; given a Steward or Guide under the default templates, then the seeded permission admits them.
- Given an admitted caller, then every active party member appears exactly once, alphabetically by display name — and a member with no sharing consent contributes `sharing: false` and **nothing else**: no marks, no counts, no timestamps, and no inclusion in any aggregate number.
- Given a sharing member, then their entry carries per-step completion marks, the required-progress count, and instance-derived `traveller_completed` — and **no timing keys exist anywhere in the payload** (Q5).
- Given a member who leaves or is removed after sharing, when the read runs, then they no longer appear at all (standing gates the roster; their consent row persists inert in the append-only log).

### STORY-4: The aggregate is honest about its basis (JRN-16, invariant 8)
As the platform, I want group-level numbers derived only from what consent exposes, so that an aggregate is never a side-channel into a private walk.

**Acceptance criteria:**
- Given N active members of whom M share, then `aggregate.per_step[].completed_count` counts over the M sharing members only, and the payload carries `members.total = N` and `members.sharing = M` so the surface can label the basis honestly.
- Given zero sharing members, then the aggregate serves zero-counts with `sharing = 0` — never fabricated coverage, never an error.
- Given any payload shape choice, then no key orders, ranks, or positions members relative to each other (entries are alphabetical; per-step counts carry no member identities).

### STORY-5: The player payload carries the new blocks additively
As the platform, I want `get_player_state` to boot the freeze explanation and the traveller's own sharing state, so that the Hub renders both with zero extra reads.

**Acceptance criteria:**
- Given a frozen enrolment, when `get_player_state` returns, then `freeze.reason`/`freeze.frozen_at` are present (open vocabulary — an unrecognized reason still serves verbatim); given any non-frozen status, then the block is null.
- Given a via-group walk, then `progress_sharing {available: true, sharing: <latest consent>}` returns; given a solo walk, then `available: false`.
- Given any enrolment the caller has standing on, then every pre-existing key is byte-shape-unchanged (pinned by the red suite, the PD004 posture).

### STORY-6: Privacy holds under erasure and adversarial reads (invariants 4 + 8)
As the platform, I want the new surfaces proven against the lifecycle's sharpest edges, so that the area's hardest privacy design ships demonstrated.

**Acceptance criteria:**
- Given a sharing member erased via the house path (`erase_fim_account`, DeusEx-called — never a bare-delete simulation, retro-2026-07-08-j-c §4), when the progress read runs, then they are gone from roster and aggregate and nothing developmental orphans.
- Given a non-sharing member, then no sequence of calls by any admitted leader reveals their step state — asserted by exhaustive payload-key walk, not by absence of a known key.
- Given the traveller's own `get_player_state`, then it is unchanged in what it reveals (own data only) — the new contracts never widen it.

## Platform dependencies

- FEAT-PD003/PD004 entirely (the instances grain; the three player contracts; completion derivation).
- PC-3: `has_permission` two-tier resolution + the four-hop actor chain; the role templates receiving the seeded key.
- PC002/PC006/PC007 consent substrate (`consent_records` append-only; the self-only read/write contracts as the pattern; the open `purpose` vocabulary).
- PC013/PC014 freeze cascades (re-verified here, not re-designed).

## Cross-product impact

FEAT-H022 is the paired consumer — payload-walked at decomposition. The Gimbal inherits both contracts unchanged (API-first, ADR-U009); because consent shaping happens in the contract, a second surface cannot accidentally over-render.

## Vertical impact

- **Privacy/GDPR:** The feature *is* a privacy design: developmental data crosses the traveller boundary only through explicit, append-only, revocable consent (invariant 4); aggregates derive from consenting members only (small-party de-anonymization refused by construction); nothing comparative exists in any payload (invariant 8); erasure proven via the house path. Consent purpose joins the open vocabulary; the log is the audit trail.
- **Notifications:** None — no rows, no delivery; sharing flips are self-actions.
- **Administration:** None new (freeze cascades stay PC013/PC014's; no admin progress surface — ADR-U028).
- **Observability:** House SQLSTATE mapping on all three contracts (P0001/P0002/42501); consent decisions self-audit via the append-only log; freeze provenance readable from `frozen_reason`/`frozen_at` + cascade migrations.
- **Transactions:** None.
- **Extensibility:** `frozen_reason` and `purpose` stay open text (consumers fallback-render); `view_group_progress` is a seeded catalog row wired to templates, never a hardcoded role check; no enums, no sealed sets; the aggregate's `basis` marker leaves room for future consent grains without a key change.

## Performance budget

N/A (no surface) — but budget-load-bearing for FEAT-H022: `get_group_journey_progress` is one round trip (roster + instances + latest-consent reduction over one enrolment's members — bounded by party size, no cross-group scan, no N+1); the `get_player_state` additions compute from rows already fetched (one jsonb read + one consent lookup). The Hub's group-progress panel is a justified standalone read (ADR-U042) fetched on demand.

## Open spec questions (the J-D gate board — defaults are recommendations, decided at the schema gate)

1. **Contract shape.** Default: one read (`get_group_journey_progress`) serving both JRN-16 and JRN-17 (aggregate + per-member in one payload), one write (`set_journey_progress_sharing`), one additive `get_player_state` re-issue. One gate, one payload to keep honest.
2. **Role gate.** *(Revised at build, 2026-07-08 — the decomposition default said "new seeded permission"; the live catalog proved richer.)* `view_group_progress` **and** `view_others_progress` already exist, seeded and template-wired (Steward + Guide; 97 instantiated role grants live) — no seeding at all. The catalog's own grain is used: `view_group_progress` ("View aggregated group progress") admits the window (roster + honest-basis aggregate); `view_others_progress` ("View other members' journey progress") additionally opens the per-member marks. `has_permission` resolution; 42501 for members without the base key, P0002 concealment for non-members. No role-name matching.
3. **Consent mechanism.** Default: `purpose = 'journey_progress_visibility'`, per-enrolment scope via `capture_context.enrollment_id`, latest-record-wins, written by a dedicated self-only SECURITY DEFINER contract (keeps the purpose vocabulary clean and the context server-authored; the PC007 two-arg contract stays untouched). *(Refined at build, 2026-07-08 — ADR-U034 Amendment 1 conventions apply: the purpose is a seeded `consent_purposes` catalog row (withdrawable, `policy_version` stamped server-side), the flip rides the house `decision` column ('granted'/'withdrawn'), and PC007's effective-state idempotency posture is kept at the per-enrolment grain. One accepted wrinkle for the gate: `get_own_consent_state()`'s per-purpose effective projection stays coarse for this enrolment-scoped purpose — the precise per-walk state is served by `get_player_state.progress_sharing`; the append-only history remains exact.)*
4. **Aggregate basis.** Default: sharing members only, with `total`/`sharing` counts serving the honesty label. The alternative (aggregate over all members) is refused on invariant-4 grounds: over a small party a count is a member's data.
5. **Timing in leader reads.** Default: none, v1 — completion marks only. Time is the traveller's own record (JRN-11) and the sharpest comparative surface (invariant 8). A future consent grain could opt it in without a shape break.
6. **Non-sharing members' representation.** Default: listed (membership is already group-visible) with `sharing: false` and nothing else. "Not shared" is the unmarked default state (opt-in norm), so listing it reveals no decision — while omitting members entirely would make the roster lie.
7. **Freeze surfacing.** Default: additive `freeze {reason, frozen_at}` on `get_player_state`, reason verbatim from `progress_data` (open vocabulary; all four live reasons render, unknown reasons fall back surface-side). No backfill, no reason normalization migration.
8. **The closed-vs-archived last-leader asymmetry.** Default: drive both cascades red-first, present the demonstrated truth at the gate, and record the disposition there (fix in-cycle only if the evidence shows a real hole; otherwise working-as-intended with reasoning). This satisfies the Groups-plan verbatim commitment without pre-judging it.
9. **Read standing for frozen walks (found by the decomposition payload walk — the J-C bridge routed this interplay here).** Two of the four freeze reasons exist *because* membership ended, yet `_enrollment_traveller_standing` admits active members only — as shipped, the very travellers JRN-14 serves are P0002-concealed from their own frozen walks. Default: **reads gain lived-record standing** — `get_player_state` and the enrolment listing (`get_my_enrollments`, so the frozen card actually renders as a door) admit a caller with own instances on the enrolment when active membership is gone; every write keeps the active-membership gate; concealment for callers with neither is unchanged. Grounding: the walk is the traveller's own developmental record (invariant 4 protects it *for* them, not from them); the alternative (membership-only) makes JRN-14 unreachable for `left_group`/`removed_from_group` and silently erases access to lived history. Rejoin-restores-more stays true either way.

## Standing obligations this feature advances

- **The bridge `_14` freeze re-verification** (Groups-plan verbatim commitment) — discharged by STORY-1's suite; recorded in Implementation notes at 6-done.
- **IDN-10's enrolment-freeze disposition (G-36 hook #4)** — at 6-done, the Implementation notes record what this cycle's demonstrated freeze truths close for IDN-10 (the DS-3 close-condition side); the parked IDN-10 specs remain owed by the next cooldown (standing, unchanged).
