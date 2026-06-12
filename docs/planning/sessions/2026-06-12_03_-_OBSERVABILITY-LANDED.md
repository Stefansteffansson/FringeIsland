# Session bridge: 2026-06-12 (3) — Observability L1->L3 derivation complete

**Session:** 2026-06-12, single-session autonomous run (tenth template instance, SECOND VERTICAL, baseline `ca43284`, one rider).
**Opener:** [`openers/archive/observability-descent-opener.md`](./openers/archive/observability-descent-opener.md) (archived at this commit).
**Predecessor:** [`2026-06-12_02_-_PRIVACY-LANDED.md`](./2026-06-12_02_-_PRIVACY-LANDED.md).

## Observability L1->L3 derivation completes at this commit batch — the second of the five verticals is specified

The V4 spec at `docs/verticals/observability/SPECIFICATION.md` is populated in place (commit `2cd3a4a`): §3 Tooling (five entries, realized/to-be-selected split honest — structured logger missing with 69 bare `console.*` sites as the realized posture; metrics/tracer/error-reporter to-be-selected; audit log partial, realized for admin actions only and characterized), §4 Failure modes (seven structural modes under the second-order-recursion preamble — V4 is the detection layer for the other four; its failures present as silence), §5 Open questions (3 standing kept with Q2 enriched as a privacy seam + 2 new: immutable-audit-trail-vs-Art.17 with realized sentinel evidence, telemetry lawful basis), §6 Obligations (Platform Core 11, Domain Services 7, Surfaces 7 — the U012 recording side landed; the operational/member-facing constitutional split made explicit per tier), §7 Cross-cutting checklists (12 items), Sources-status block (Step 2 verification record). Status `draft` -> `active`; `last_updated` 2026-06-12. The scaffold-era §6 bullets were rewritten freely per the gate's no-ratified-content inversion (Session B left V4 untouched — verified). Two consequential commits landed: the verticals tier file's quoted canonical example + the entity stub's parenthetical synced to the revised §6 Domain Services trio (`7dd4b9e`, the gate-named extra agreement surface, fired as predicted); a PENDING.md entry parking the role-based root-admin principle (`0c1902c`, ratified mid-run — see below).

## Session arc

§1 pre-flight (all five passed; the root-CLAUDE context-mode re-injection discarded via Edit-removal, sixth instance; CRLF stat-noise judged by diff content-emptiness) -> §2 state-read (five predecessor docs + all disk verifications passed; G-03 re-verified with the same pre-skeleton numbering drift Privacy noted; PENDING.md located at `docs/architecture/decisions/` and verified entry-free for Observability) -> THE ENTITY-SHAPE ADJUDICATION GATE (second vertical firing; ratified: standard three-step RUN shape, vertical-spec skeleton, in-place Edit-shaped population; both V4-specific deltas surfaced) -> Step 1 cold derivation (checkpoint printed in full with the rider-compliance statement, ratified, landed as eight sequential Edits — A#5 sub-batch-of-1) -> Step 2 stress-test (both polarities; ZERO RETRACTIONS — the rider fired and closed its banked class; see §13) -> MID-RUN ADJUDICATION (Stefan challenged the `is_platform_admin()` characterization; the authorization-model survey escalated to a ratified architectural principle and the series' second PENDING-item authoring) -> Step 3 adjudication (Q-slate 0 resolved / 3 held / 2 routed; tier-CLAUDE agreement check ALL FOUR SIBLINGS AGREE; the quoted-example surface STALE — smallest sync sanctioned and landed; DoD reflection no-op confirmed; stub stays stub; status -> active) -> close-out.

## Ratified decisions (all by Stefan, 2026-06-12, this session)

1. **The entity-shape gate:** template shape applies unchanged; in-place population of the existing canonical scaffold; Step 1 Edit-shaped. The four standing deviations carried; the two V4-specific gate deltas (no-ratified-content inversion; the tier-file quoted-example surface) both did real work.
2. **Step 1 content** as checkpointed: obligation counts 2->11 / 3->7 / 2->7; checklist 5->12; questions 3->5 (Q2 enriched in place); no L2 §1-§2 touch (the constitutional operational/member-facing split landed as tier-specific §6 obligations); rider-compliance statement accepted.
3. **Step 2 block:** §3 audit-log verification sentence refined (RLS-layer insert-only verified; policy-shaped not mechanism-complete; the sentinel-reassignment mutation path is the erasure side, not tampering; live table is the 2026-02-22 group-keyed rebuild); Q4 enriched with the realized actor-pseudonymisation evidence; Sources-status record landed.
4. **The role-based root-admin principle (mid-run, on Stefan's challenge):** platform-admin capability flows from holding the role whose permission set grants administration; DeusEx membership alone confers nothing. The realized `is_platform_admin()` is a name-based membership proxy (~20 call sites, ~9 RLS policies) with a reachable divergence (role removal while membership persists). Parked at `docs/architecture/decisions/PENDING.md` (`0c1902c`) for the V1 derivation or pre-Console implementation, whichever first; the §3 wording tweak records the proxy honestly.
5. **Step 3 slate:** Q1/Q2/Q3 HOLD, Q4 ROUTE (erasure-cascade design channel — the audit-trail face of the same candidate ADR), Q5 ROUTE (research-spike channel, joint V2/V4); zero ADR amendments; tier-CLAUDE check all four siblings agree, quoted-example sync sanctioned (`7dd4b9e`); DoD reflection NO-OP (PROCESS.md:196 generic line, `d308392`); entity-CLAUDE stub STAYS STUB (no trigger shape fired; quote-sync is not substantiation); status `active`.

## Forward-commitment classification

The obligation inventory is forward law by construction. The realized substrate satisfies a thin slice: `admin_audit_log` (group-keyed rebuild, RLS insert-only, admin acts only) satisfies the security-relevant-audit obligation for the administrative class; error boundaries exist but collect nothing; everything else — structured logging (69 bare console sites; 4 API routes with catch-all `console.error` only), RLS-denial recording, data-access audit events, metrics, tracing, alerting, dashboards — is UNREALIZED (dual-method zeros), matching §3's honesty. The structured-log obligation's realized scope is 4 API routes today because the products tier queries Supabase directly (the 53-`createClient` posture; SS-16/17 reconciliation downstream).

## Pickup lists

**Administration vertical (next in G-03 order; its opener must inherit):**
- **Same gate shape:** entity-shape adjudication gate fires pre-Step-1 (standing §4 text); vertical-spec skeleton; in-place Edit-shaped population of `docs/verticals/administration/SPECIFICATION.md`; entity CLAUDE.md expected as a deliberate stub (cascade Session 3 names Privacy + Transactions as the substantive pair) — verify at state-read.
- **A FIRST-DECISION candidate EXISTS (unlike V4):** the PENDING.md role-based root-admin entry (`0c1902c`) names the V1 derivation as its adjudication point — candidate ADR-U028 clarification. The V1 opener must carry it.
- **Rich compliance polarity (the richest substrate yet):** `admin_audit_log` fully characterized this run (group-keyed rebuild at `20260222`; RLS insert-only via `is_platform_admin()`; sentinel-reassignment mutation path); `admin_hard_delete_user` + `admin_exit_user_from_platform` (full lifecycle cascades with audit writes); the DeusEx seeds wiring (`04_system_groups.sql`: DeusEx role holding ALL permissions; `auto_assign_deusex_role_on_accept`; `prevent_last_deusex_*` guards); admin read surfaces (`app/admin/`, `app/admin/deusex/`, `app/admin/fix-orphans/`); the `is_platform_admin()` proxy itself. Calibrate fresh, characterize, don't re-discover.
- **The authorization-check taxonomy (this run's survey, reusable):** capability checks via `has_permission()` (59 call sites, ~27 policies — the full group+role+permission walk); visibility/state checks via the bare-membership helper family (`is_active_group_member` et al.); the DeusEx name proxy (20 sites, ~9 policies). V1 owns reconciling the three families against the model.
- **U012 split, both sides now landed:** V4 §6 carries the recording side; V2 §6 carries the exposure side; V1 consumes the Console audit-log-viewer routing (ADR-U028 Ferd routing — "audit-log viewer and feature flags to the Console").
- **Breach-response process seam:** detection is V4's (landed: §6 PC detection-signals obligation); process is V1's (V2 §5 Q5 names it). V4 §5 Q3 (on-call posture) seams with V1's operational ownership.
- **Charter ADRs:** U002 ("Administration — lifecycle events are human-operated cascades"), U028 (governance by scope; the Console; DeusEx as root-admin group).
- **Tool-level catches carry:** `find` false tool in the ctx sandbox; glob-expansion grep false-empties; `git grep` reliable; judge every zero by output lines; dual-method on every zero.
- **The rider is n=2 with a decisive firing** — see Template revision disposition.

**Erasure-cascade design channel:** V4 Q4 joins V2 Q4 there — the audit-trail face (immutability vs Art. 17; realized actor-pseudonymisation precedent: the sentinel reassignment on `admin_audit_log.actor_group_id`).

**Research-spike channel:** V4 Q5 telemetry lawful basis (joint V2/V4; blocks member-wide telemetry tooling).

**No service-routed Class 3 amendments:** ownership discipline held — V2 consumed as authority, never amended; no DS spec touched.

## A-candidate ledger snapshot at Observability close

- **A#5 sub-batch-of-1: second clean Edit-shaped firing** (eight sequential section Edits after a full printed checkpoint; plus three Step 2 Edits and two Step 3 Edits, all sequential). The cadence is now precedented at n=2 on Edit shape.
- **A#1, A#2, A#3, A#6, A#7** — carry as framings (no capability-owning entity).
- **PW-5: no fresh baseline count needed** (no SQL surface owned; the 19-table baseline consumed from the Privacy bridge; `admin_audit_log` membership confirmed).
- **Rider candidate Step-1-realization-claims-need-disk-anchor: n=2, FIRST DECISIVE FIRING** (see §13).

## PW status at Observability close

PW-5 consumed, not re-run (no object). P-O1/D7/X3/X5/Finding#4/D3: inverted applicability as the opener predicted, except X3 (signature drift) which FIRED with a real object — the RC7 "broken" `has_permission()` Tier-1 policies passed a profile id where the rebuilt function expects an acting group id; recorded in the PENDING entry as the diagnose-before-fixing note.

## Methodology data points (§13 capture)

1. **Did the rider fire, and did it close the retraction class it was banked against? YES, decisively.** The archived origin migration's prose ("immutable audit log... No UPDATE or DELETE for anyone") is exactly what a rider-less Step 1 would have cited as realized immutability — and disk shows a rebuilt table with a deliberate mutation path. The rider forced "property to verify, not assume" at Step 1; Step 2 characterized instead of retracting. **RETRACTION-RATE DATA POINT: 0** (eleventh run; series: 7/9, nine zeros, 1, 0). The Privacy lesson generalized: the rider's class is "realization asserted from prose" — migration comments are prose too.
2. **Did the gate's two V4-specific deltas suffice? YES.** The no-ratified-content inversion held (scaffold bullets rewritten freely; nothing demanded verbatim preservation); the tier-file quoted-example surface FIRED exactly as predicted (the DS-trio rewrite made the example stale; the named Step 3 check caught it; smallest sync landed at `7dd4b9e`). No template text bent at the second vertical.
3. **The stub-CLAUDE disposition (first stub-entity run): the stub shape HELD under derivation pressure.** None of the stub's three trigger shapes fired (no direct regulatory regime; no vendor API; the constitutional split expressed cleanly at tier grain). The only touch was the quote-sync — wording, not substantiation.
4. **NEW SHAPE: mid-run adjudication minted a PENDING entry from Step 2 evidence.** Stefan's challenge on the `is_platform_admin()` characterization opened an unplanned authorization-model survey (three check families characterized); the finding escalated to a ratified architectural principle and the series' second PENDING-item authoring (`0c1902c`) — the first minted mid-run rather than at a descent's FIRST DECISION. The shape: Step 2 characterization evidence + owner challenge -> principle ratification -> PENDING parking with a named adjudication point. Cost was bounded (two survey passes); the discipline held (no code touched; routing not resolution).
5. **The sibling-vertical authority slot (first firing): clean.** V2 bound exactly where the opener predicted (recording side, detection dependencies, content-free payloads) and was never amended. The inverted constitutional slot also held — MANIFESTO-as-constraint shaped §4's constitutional failure mode and the per-tier split obligations.
6. **Entity-specific priors all fired productively:** read-only/passive posture (landed as the fail-open/fail-loud obligation and §4's watcher mode); over-prescription-kills-verticals (rules not inventories throughout §6); the recursion framing (§4's preamble and second-order detection notes).

## Template revision disposition

NO REVISION LANDED. **The rider rides at n=2 with one decisive firing** — promotion adjudication to standing §5a text at the Administration run's close or the verticals close-out, on this evidence: two instances (Privacy retraction = the without-case; V4 = the with-case where it demonstrably prevented the same class). The gate text and all standing revisions held as-is at the second vertical.

## Carry-forward confirmations

CODE stayed a correction target (the `is_platform_admin()` deviation parked, not fixed; the authorization survey read, never wrote). ASCII-only labels held. OLDFEAT: not listed, not read. Sessions append-only. The settled classifications were consumed, never reopened (the Extension System confirmations list; the close-out routings; the Privacy Step 3 dispositions — V2's Q-slate consumed via its Q5 detection seam, never reopened). Zero PENDING.md dispositions of pre-existing items (the new entry is an authoring, not a disposition). **Zero new ADRs; zero ADR amendments.** The cross-tier-write channel, PC-1 Finding #4, and the avatars-bucket routing were not touched. Concurrent `docs/novel/` activity: none observed.

## Repo state at session close

- `2cd3a4a` — docs(verticals): Observability SPECIFICATION.md L1->L3 (Steps 1+2+3, ratified)
- `7dd4b9e` — docs(verticals): tier-file canonical example + entity-stub quote synced (sanctioned consequential edit)
- `0c1902c` — docs(architecture): PENDING - root-admin authority is role-based (ratified mid-run)
- this commit — closing bridge + opener archived
- STATUS.md close follows. **No push to origin** — Stefan dispositions push.
