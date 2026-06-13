# Session bridge: 2026-06-13 (1) — Breach-response joint-design spike complete

**Session:** 2026-06-13, the breach-response joint-design spike executed from its brief ([`openers/archive/breach-response-spike-brief.md`](./openers/archive/breach-response-spike-brief.md), archived at this close). Interactive joint-design shape — CC drafts, Stefan ratifies at printed gates — *not* an autonomous L1->L3 template instance. Single session, no code.
**Predecessor:** [`2026-06-12_07_-_VERTICALS-CLOSE-OUT-LANDED.md`](./2026-06-12_07_-_VERTICALS-CLOSE-OUT-LANDED.md) (marked this spike RIPE and five-vertical at the verticals close-out).

## What the spike produced

The end-to-end breach-response story no single spec held before — **detect -> assess -> clock -> notify authority -> notify members -> record** — designed once, jointly, with each piece landed back in its owning vertical spec. The design record lives at [`docs/research/breach-response-design.md`](../../research/breach-response-design.md); the obligations live in the specs. The report cites; it does not supersede.

## How the session ran

Three ratified design gates, then a print-batch-before-gate write:

1. **Gate 1 — Foundations.** The six-station spine with named owners; the jurisdiction assumption; who declares (Q1); "becoming aware" (Q2). Ratified.
2. **Gate 2 — Graded response.** Risk rubric (Q3); authority-notice content (Q4); member-notice reconciliation (Q5); vendor path (Q6). Ratified.
3. **Gate 3 — Record & posture + landing map.** Breach register (Q7); on-call posture (Q8); the spec-by-spec landing map and the no-ADR call. Ratified.

The five input holdings were disk-verified against the brief's citations before any design was built (verify-before-asserting). The full draft batch — four spec advances plus the report — was printed in chat before any write (print-batch-before-gate).

## Adjudications (all by Stefan)

1. **Jurisdiction:** Sweden, provisional — lead supervisory authority = Integritetsskyddsmyndigheten (IMY). The runbook carries the obligation to confirm establishment before scaling EU personal-data processing.
2. **Declarer:** the legal/governance care-domain seat (role, not person; ADR-U028 role-based authority; the V1 §5 Q4 axis), not a newly minted role.
3. **Becoming-aware control:** signal -> triage -> awareness-declared = clock start, with dual signal-time/awareness-time timestamps as the anti-gaming control.
4. **Risk rubric:** three bands over six factors, with a FringeIsland Tier-A self-reflection-content clause biasing toward member notification (more notices, not fewer — the MANIFESTO anchor cashed out as a grading rule).
5. **Member-notice ownership:** V3 owns channel mechanics (compelled-category send + channel-compromise fallback); V2 owns content rules (Art. 34 floor vs content-minimisation ceiling).
6. **Vendor path:** Art. 33(2) Stripe path; clock starts at receipt of the processor report; feeds V2's sub-processor rule; **V5 untouched** (mode 6's citation unchanged).
7. **Breach register:** a distinct recording surface (not `admin_audit_log`), an instance of the ADR-U012 record/expose split — V4 records, V2 exposes.
8. **No standalone ADR:** declarer-seat clarifies ADR-U028 + V1 §5 Q4; register instantiates ADR-U012 — both clarifies-existing, so they land as spec amendments (the V1-close promotion-as-amendment rule).

## Deliverables landed

- **Design record (new):** [`docs/research/breach-response-design.md`](../../research/breach-response-design.md) — spine, jurisdiction, roles, becoming-aware, rubric, both notification paths, vendor path, register schema, on-call posture, landing record, open seams. Indexed in `docs/research/README.md` (new "Design records" section).
- **Four spec advances** (each appended in place to its existing open question, following the dated-decision convention):
  - V2 Privacy §5 Q5 — **Resolved**.
  - V1 Administration §5 Q5 — **Resolved**.
  - V3 Notifications §5 Q6 — **Closed**.
  - V4 Observability §5 Q3 — **Advanced**; §6 Platform Core — two new obligations (breach register; escalate-to-human).
- **V5 Transactions** — untouched, as scoped.

## Methodology observations (close capture)

1. **First interactive joint-design spike against the autonomous-descent body of work.** The gated draft-ratify shape (verify -> design gates -> print-batch -> write -> close) ran cleanly in one session; distinct from the autonomous L1->L3 template, which is why this spike gets no pipeline-table row — only a revision-log entry.
2. **Cross-spec ownership held without leakage.** Each of the five halves stayed with its owner; the report integrates and cites rather than absorbing obligations. The "seam to design, not an obligation grab" framing from V3 Q6 was honored — V3 took channel mechanics only, content stayed with V2.
3. **The disk-anchor / verify-before-asserting discipline carried from the verticals series into a non-autonomous session** — the five holdings were re-verified against the brief's line citations before design, and the report's brief-link was pointed at the live path, not a forward-assumed archive path, until the archive move actually happened.

## Open seams (cited, deliberately not resolved)

- **V2 §5 Q1** — DPO/contact-point at current scale.
- **V5 §5 Q4** — tax-registration posture (shares the establishment root with the jurisdiction assumption).
- **V4 §5 Q3** — full on-call rotation at later scale (now-scale posture committed).
- **Establishment confirmation** — the Sweden/IMY assumption must be confirmed before scaling EU personal-data processing.

## Open disposition (Stefan's, pending)

**The next pipeline head remains undesignated** (carried from the verticals close-out; a Hub re-derivation is under discussion — see that bridge's Open disposition). This spike was a scheduled side-quest off the RIPE marker, not the next pipeline entity. STATUS carries no Next row.

## Carry-forward confirmations

Sessions append-only. ASCII-only labels held. No new ADR; no ADR amendment. The five specs stay the owners of their halves; the report cites, does not supersede. Erasure-cascade and research-spike channel rosters untouched. No code touched. **No push to origin** — Stefan dispositions push.

## Repo state at session close

- Four spec files advanced in place (V1/V2/V3/V4 §5/§6); `docs/research/breach-response-design.md` created; `docs/research/README.md` indexed.
- Brief archived to `openers/archive/`; report brief-link re-pointed to the archived path.
- this commit — closing bridge + STATUS.md revision-log entry (no Next designation).
