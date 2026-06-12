# Session bridge: 2026-06-12 (2) — Privacy/GDPR L1->L3 derivation complete

**Session:** 2026-06-12, single-session autonomous run (ninth template instance, FIRST VERTICAL, baseline `ca43284`, zero riders).
**Opener:** [`openers/archive/privacy-descent-opener.md`](./openers/archive/privacy-descent-opener.md) (archived at this commit).
**Predecessor:** [`2026-06-12_01_-_PHASE-3-CLOSE-OUT-LANDED.md`](./2026-06-12_01_-_PHASE-3-CLOSE-OUT-LANDED.md).

## Privacy/GDPR L1->L3 derivation completes at this commit batch — the first of the five verticals is specified

The V2 spec at `docs/verticals/privacy/SPECIFICATION.md` is populated in place (commit `e53e836`): §3 Tooling (five entries, gaps named honestly — consent store partial; export pipeline, erasure cascade, Art. 30 register, member-facing access trail all to-be-designed/missing), §4 Failure modes (six structural modes with detection + recovery), §5 Open questions (3 standing + 4 new), §6 Obligations (Platform Core 10, Domain Services 9 with DS-7 expanded to five sub-obligations, Surfaces 8), §7 Cross-cutting checklists (12 items), Sources-status block (Step 2 verification record). Status `draft` -> `active`; `last_updated` 2026-06-12. The four ADR-U027/Session-B-ratified Shadow bullets and the S43 home-sharing obligation were kept verbatim (refine-don't-re-derive held). One consequential edit landed (commit `d308392`): PROCESS.md §5 DoD gains the generic vertical-checklists line — one line covering all five verticals as they populate, instead of itemizing.

## Session arc

§1 pre-flight (all five passed; the root-CLAUDE context-mode re-injection discarded via Edit-removal, fifth instance; CRLF stat-noise judged by diff content-emptiness) -> §2 state-read (five predecessor docs + all disk verifications passed; G-03 re-verified with a noted numbering drift: its prose uses the pre-skeleton section numbers — substance identical) -> THE ENTITY-SHAPE ADJUDICATION GATE (first firing as standing §4 text; ratified: standard three-step RUN shape, vertical-spec skeleton, in-place Edit-shaped population) -> Step 1 cold derivation (checkpoint printed in full, ratified, landed as sequential Edits — A#5 sub-batch-of-1) -> Step 2 stress-test (both polarities; ONE RETRACTION — see §13) -> Step 3 adjudication (Q-slate 0 resolved / 4 held / 3 routed; tier-CLAUDE agreement check ALL FIVE AGREE, zero consequential tier edits; DoD reflection sanctioned and landed; status -> active) -> close-out.

## Ratified decisions (all by Stefan, 2026-06-12, this session)

1. **The entity-shape gate:** template shape applies unchanged; landing path = in-place population of the existing canonical scaffold; Step 1 Edit-shaped. The gate's four named deviations (obligations-as-L3; inverted §5b; sparse-L4; Edit-shaped Step 1) sufficed — see §13.
2. **Step 1 content** as checkpointed: obligation counts 6->10 / 4->9 / 2->8; checklist 7->12; no L2 §1-§2 touch; Art. 33/34 cited in §4 as recovery-side law with the process gap carried as Q5 (not a scope edit).
3. **Step 2 block:** the §3 retraction correction (TTL sweep is lock-only; the realized erasure-adjacent artifact is the `[Deleted User]` sentinel reassignment); Q4 enriched with the realized two-event evidence; Sources-status remark recorded.
4. **Step 3 slate:** Q1/Q2/Q3/Q6 HOLD, Q4/Q5/Q7 ROUTE; zero ADR amendments (U027 TTL stays deferred-by-design); zero tier-CLAUDE consequential edits (all five rows agree with revised §6 — the studios "previews" obligation exists as that file's own preview-PII rule, no row edit needed); PROCESS.md §5 one-line DoD reflection; status `active`.

## Forward-commitment classification

The obligation inventory is forward law by construction (verticals own no capabilities). The realized substrate satisfies a subset today: RLS coverage is 19/19 at the live baseline (PW-5 re-verified, both methods); the `display_preference`/group-visibility substrate is a global-preference precursor to the per-viewer display-form obligation; the `[Deleted User]` sentinel reassignment is the one realized erasure-adjacent mechanism. Everything consent-, export-, erasure-, and opt-out-shaped is UNREALIZED (dual-method zeros) — matching §3's to-be-designed honesty. The products tier currently queries Supabase directly (53 `createClient` occurrences in `app/`) — the platform-side-filtering obligation binds forward; reconciliation is downstream (SS-16/17 scope recorded).

## Pickup lists

**Observability vertical (next in G-03 order; its opener must inherit):**
- **Same gate shape:** entity-shape adjudication gate fires pre-Step-1 (standing §4 text); vertical-spec skeleton; in-place Edit-shaped population of `docs/verticals/observability/SPECIFICATION.md`; entity CLAUDE.md existence to verify at state-read.
- **The ADR-U012 audit-trail split now has its Privacy side landed:** V2 §6 Platform Core carries "Observability records data-access events; Privacy exposes them." The Observability derivation must land the recording side (data-access events as first-class instrumentation).
- **Q5 breach-response seam:** detection is V4's side (Art. 33's 72-hour clock starts at detection); process is V1's. V2 §4/§5 carry the dependency explicitly.
- **RLS-denial observability:** named in the platform tier row and now load-bearing for V2 §4 detection (consent drift, private-by-default inversion). Candidate V4 §6 obligation.
- **Content-free event payloads:** the DS-7 carry-forward (privacy invariants bind event payloads) — candidate V4 §6 obligation; V2's no-role-bypass and private-by-default obligations are the binding source.
- **Calibration note:** unlike V2's absence-polarity zeros, V4 has REALIZED substrate — `admin_audit_log` is a live baseline table (19-table set) and structured-log/observability vocabulary should be swept fresh, not assumed zero.
- **Tool-level catches to inherit (sandbox):** `find` is a false tool in the ctx sandbox (returned 0 where `ls` shows 19 live migrations); glob-expansion `grep` false-emptied (0 where git grep shows 38/50). `git grep` is the reliable method; judge every zero by output lines; dual-method on every zero.
- **The retraction lesson (binding as authoring discipline):** never assert realization from ADR prose at Step 1 — ADR-U004 says "a pg_cron job cleans up"; disk says pg_cron is zero. Realization claims need a disk anchor or explicit lock-only marking.

**Erasure-cascade design channel (future FEAT/ADR work):** Q4 carries the realized two-event evidence (membership-exit soft-flag per ADR-U021, display logic unrealized; platform-exit sentinel reassignment, realized) — the regime-grade Art. 17 line is the candidate ADR's question.

**Research-spike channel:** Q7 capture provenance / non-member rights (DS-4-routed, now spec-held).

**No service-routed Class 3 amendments:** ownership discipline held — obligations levied, no DS spec touched, no §8 question resolved from the obligation side.

## A-candidate ledger snapshot at Privacy close

- **A#1, A#2, A#3, A#6, A#7** — carry forward as framings (not exercised against an entity that owns no capabilities).
- **A#5 sub-batch-of-1: FIRST REAL FIRING** — the Edit-shaped Step 1 landed as seven sequential section Edits after a full printed checkpoint; clean, no mid-batch contradiction. Verdict: the cadence translates to Edit shape without modification.
- **PW-5: 19-table baseline re-verified** (per-file git-grep counts + line extraction; RLS 1:1). **PW-1/PW-MARCH1/PW-T1: no object** at a no-capability entity.
- **New candidate (n=1): Step-1-realization-claims-need-disk-anchor** — the retraction's lesson, candidate template text for §5a if it recurs.

## PW status at Privacy close

PW-5: held (re-verified 19/19 with RLS 1:1). Others: no object (the entity owns no SQL surface; inverted applicability as the opener predicted — P-O1/D7/X5/Finding#4/D3 noted inverted, X3 not fired).

## Methodology data points (§13 capture)

1. **Did the entity-shape gate's named deviations suffice?** YES — all four held (obligations-as-L3; inverted §5b both-polarity scope; sparse-L4 untouched; Edit-shaped Step 1), and no fifth deviation was forced by the vertical's substance. The standing-§4 gate text is sufficient for the four remaining verticals on this evidence. One sub-observation for the gate's future firings: the obligation-refinement boundary ("refine, never cold-rewrite ratified content") did real work — four Shadow bullets and S43 survived verbatim inside an otherwise rewritten §6.
2. **RETRACTION-RATE DATA POINT: 1** — the first non-zero against a calibrated opener in ten runs (PC-4 7/9, then nine zeros, now 1). Per the close-out verdict, non-zero-against-calibrated is signal: the signal here is Step-1-author discipline, not opener calibration — the opener §5b explicitly flagged "realized vs lock-only" as to-verify and named the sentinel; the Step 1 draft asserted the U004 pg_cron sweep as realized anyway (from ADR prose). The correction is recorded in the spec's Sources-status block. Lesson banked as the n=1 candidate above.
3. **The seven close-out revisions, first run as template text — all held:** §5b body-content read-set (no migration-name shorthand used), §3 tier-CLAUDE domain-noun sweep (FIRED: all five sibling rows consumed as boundary law; drove the §6 absorption and the Step 3 agreement check), §5b seeds rule (FIRED: both seed artifacts confirmed at predicted lines; the sentinel's live wiring discovered through it), §3 constitutional-docs slot (FIRED, first full three-doc consumption: VISION #4 + #8, MANIFESTO member-privacy-over-commercial-opportunity, PRINCIPLES-AI privacy-never-sacrificed-for-AI all anchor §1/§6 content), §13 series verdict (consumed; produced this data point), §4 entity-shape gate (fired, sufficed), §6 tool-level catch class (FIRED THREE TIMES, held every time — sandbox `find` false tool, sandbox glob-grep false-empty twice; all zeros re-judged by git grep output lines).
4. **First Edit-shaped Step 1:** print-full-checkpoint-then-sequential-Edits worked without friction; the Write-shaped template language needed no amendment beyond what the gate already named.
5. **Entity-specific priors all fired productively:** GDPR-articles-not-paraphrase (Art. 6/15/17/20/30 cited throughout §3/§6/§7; the 15/20 distinction shaped the export-pipeline tooling entry), DS-7-named-explicitly (five sub-obligations), erasure-overpromise gotcha (the §7 erasure item carries the AI-model-state qualifier inline; §6 DS-7 says qualify-never-promise), over-prescription-kills-verticals (rules not inventories throughout §6).

## Template revision disposition

NO REVISION PROPOSED. The n=1 candidate (Step-1-realization-claims-need-disk-anchor) rides as a watch item for the Observability run; the gate text and the seven close-out revisions held as-is.

## Carry-forward confirmations

CODE stayed a correction target (createClient survey recorded as scope, no code touched). ASCII-only labels held. OLDFEAT: not listed, not read. Sessions append-only. The settled classifications were consumed, never reopened (the Extension System bridge's confirmations list + the close-out's confirmed routings; the folded U027/S43 content refined in place, never re-derived). Zero PENDING.md dispositions (no Privacy item existed). **Zero new ADRs; zero ADR amendments.** The cross-tier-write channel, PC-1 Finding #4, and the avatars-bucket routing were not touched. Concurrent `docs/novel/` activity: none observed.

## Repo state at session close

- `e53e836` — docs(verticals): Privacy/GDPR SPECIFICATION.md L1->L3 (Steps 1+2+3, ratified)
- `d308392` — docs(planning): PROCESS.md section-5 DoD vertical-checklists line (sanctioned consequential edit)
- this commit — closing bridge + opener archived
- STATUS.md close follows. **No push to origin** — Stefan dispositions push.
