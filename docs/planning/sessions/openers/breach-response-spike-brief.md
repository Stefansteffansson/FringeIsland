# Spike brief — Breach-response joint design (Art. 33/34, five-vertical)

**Authored:** 2026-06-12, at the verticals close-out (the close-out marked this spike RIPE — [`2026-06-12_07_-_VERTICALS-CLOSE-OUT-LANDED.md`](../2026-06-12_07_-_VERTICALS-CLOSE-OUT-LANDED.md)).
**Shape:** interactive joint-design spike — NOT an autonomous L1->L3 template instance. CC drafts, Stefan ratifies at printed gates (print-batch-before-gate binds). Single session expected. No code.
**Start prompt:** `Read docs/planning/sessions/openers/breach-response-spike-brief.md and proceed.`

---

## Purpose

GDPR Art. 33 obliges the platform to notify the supervisory authority within 72 hours of *becoming aware* of a personal-data breach; Art. 34 obliges it to notify affected members when the risk to them is high. The duty exists from the first byte of personal data — it does not wait for launch scale. Each of the five vertical specs holds one face of the answer and names the others; no artifact holds the end-to-end story: **detect -> assess -> clock -> notify authority -> notify members -> record**. This spike designs that story once, jointly, and lands each piece back in its owner.

Constitutional anchor: the MANIFESTO's safety commitment ("you are always in control of your own story") — breach notification is that promise's worst-day face. Telling members fast and honestly is a mission act, not just a compliance act.

## Inputs — the five holdings (disk-verified 2026-06-12)

| Spec | Holding | Where |
|---|---|---|
| V2 Privacy | The duty itself: section-4 "Breach without notification" failure mode; **section-5 Q5 names this spike** ("no detection-to-notification process is defined. Candidate spike") | `docs/verticals/privacy/SPECIFICATION.md` L62, L70 |
| V4 Observability | Detection: section-6 PC detection-signals obligation ("V2 names breach detection — Art. 33's clock starts at detection"); section-4 "Recorded but unseen" failure mode names the Art. 33 seam; section-5 Q3 on-call posture seams here | `docs/verticals/observability/SPECIFICATION.md` L91, L56 |
| V1 Administration | The human process: **section-5 Q5 is V1's half of V2 Q5** ("who declares an incident, who notifies") | `docs/verticals/administration/SPECIFICATION.md` L78 |
| V3 Notifications | The member-delivery channel: **section-5 Q6 is the Art. 34 channel half**; the section-7 checklist already carries the lawfully-compelled category ("Member preference can suppress this notification (unless its category is lawfully compelled, e.g. breach notice)") | `docs/verticals/notifications/SPECIFICATION.md` L67, L122 |
| V5 Transactions | The vendor face: section-4 mode 6 (member-data leak to the payment vendor) invokes "V2's breach machinery (the Art. 33/34 seam)" — a processor-side breach (Art. 33(2): processor notifies controller) feeds the same pipeline | `docs/verticals/transactions/SPECIFICATION.md` L73 |

Related law already settled (consume, don't reopen): the U028 root-admin amendment (authority is role-based — incident roles gate through the one permission mechanism); V4's no-silent-drop law; V3's external-delivery content-minimisation; V2's sub-processor rule (Stripe named on the list).

## Questions the spike must answer

1. **Who declares?** Which role (not person) declares a personal-data incident, and through what authority chain (universal group pattern; the U028 role-based amendment binds). Pre-launch reality: Stefan is every role — design the role anyway.
2. **What is "becoming aware"?** The V4-signal -> human-assessment handoff: which detection signals are breach-candidate signals, who triages them, and at what point the 72-hour clock legally starts.
3. **How is risk graded?** Art. 33 notifies the authority unless the breach is unlikely to risk members; Art. 34 notifies members only on high risk. Who grades, against what written rubric, and where is the grading recorded.
4. **Authority notification:** which supervisory authority (lead-authority/establishment question — name the jurisdiction assumption explicitly; do NOT resolve V5 Q4's registration posture here, just cite it), with what content template.
5. **Member notification:** Art. 34's required content vs V3's external-delivery content-minimisation — reconcile the two (a breach notice must say enough; V3's law says no more than enough); delivery channel(s) when the breach may have compromised the primary channel; the compelled-category mechanics V3's checklist already names.
6. **Vendor breaches:** the Stripe-side path (Art. 33(2) processor duty -> platform's clock) and what the sub-processor contract must guarantee (feeds V2's sub-processor rule; V5 consumes).
7. **The breach register (Art. 33(5)):** every breach documented regardless of notification — where does it live (seam: `admin_audit_log` is admin-acts-only today; V4 records / V2 exposes per the U012 split), and what does each entry carry.
8. **On-call posture (V4 Q3 seam):** what is the minimum credible alert-to-human path at current scale — answer honestly for now-scale, design the obligation for later-scale.

## Deliverables

1. **The spike report / runbook design** — one document carrying the end-to-end process skeleton, the role definitions, the grading rubric, and the notification content rules. Landing-path lean: `docs/research/breach-response-design.md` (the canonical *obligations* land in the specs, not here; this is the design record). Stefan ratifies the path at the session.
2. **Sanctioned spec amendments** (ownership discipline — each spec's own section-5/section-6 edited only on ratification): V2 Q5 and V1 Q5 resolved or advanced to named decisions; V3 Q6 channel half closed or sharpened; V4 enriched only if the design adds a detection/on-call obligation; V5 untouched unless the vendor path changes mode 6's citation.
3. **A PENDING entry or candidate ADR** only if a durable architectural principle emerges (e.g., incident-response ownership as a named role) — the promotion-as-amendment vs standalone-ADR selection rationale from the V1 close binds (clarifies-existing -> amendment; new-boundary -> ADR).

## Scope boundaries

- No code, no tooling builds (the runbook may *demand* tooling; demands route to pickup channels).
- Do not resolve V5 Q4 (tax registration posture), U027 Shadow threads, or any other vertical's unrelated open questions.
- Sessions append-only; no ADR amendment without explicit sanction; the five specs stay the owners of their halves — the spike report cites, it does not supersede.
- Erasure-cascade and research-spike channel rosters are not this spike's to modify.

## Session close expectations

Closing bridge at `docs/planning/sessions/{DATE}_NN_-_BREACH-RESPONSE-SPIKE-LANDED.md`; this brief archived to `openers/archive/`; STATUS.md revision-log entry. No push without Stefan's disposition.
