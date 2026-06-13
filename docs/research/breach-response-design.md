# Breach-response design (GDPR Art. 33/34) — five-vertical joint-design record

*Authored 2026-06-13 at the breach-response joint-design spike (brief: [`breach-response-spike-brief.md`](../planning/sessions/openers/archive/breach-response-spike-brief.md), archived at session close). This is the **design record**, not an obligation source — each obligation lands in its owning vertical spec (V1 §5 Q5, V2 §5 Q5, V3 §5 Q6, V4 §5 Q3 and §6). This document **cites**; it does not supersede. Where it and a spec disagree, the spec wins.*

---

## Constitutional anchor

The MANIFESTO's safety commitment — *"you are always in control of your own story"* — is the reason this process exists in the shape it does. Breach notification is that promise's worst-day face: telling members fast and honestly is a mission act, not only a compliance act. Two design choices below follow directly from this anchor: the risk rubric **biases toward member notification** when self-reflection content is exposed, and the now-scale on-call gap is **named honestly** rather than papered over.

---

## 1. The spine

The end-to-end story no single spec held before this spike: **detect -> assess -> clock -> notify authority -> notify members -> record.** Each station has one named owner.

| Station | What happens | Owner |
|---|---|---|
| 1. Detect | A breach-candidate signal is emitted | V4 Observability (platform instrumentation duty) |
| 2. Assess | A human triages the signal — "is this a personal-data breach?" | V1 Administration (triage) + V2 Privacy (risk rubric) |
| 3. Clock | The 72-hour Art. 33 window starts at **awareness**, not at signal | V1 declares awareness; recorded in the register |
| 4. Notify authority | Lead DPA notified unless the breach is unlikely to risk members | V2 owns the duty; V1 owns the act |
| 5. Notify members | High-risk breaches only; Art. 34 content | V2 owns content rules; V3 owns the channel |
| 6. Record | Every breach logged regardless of notification (Art. 33(5)) | V4 records; V2 exposes (ADR-U012 split) |

---

## 2. Jurisdiction assumption

Lead supervisory authority = **Integritetsskyddsmyndigheten (IMY)**, Sweden's data protection authority, on a **provisional Sweden-establishment assumption** (set 2026-06-13). This is a working assumption, not a settled fact: the runbook carries the obligation to **confirm the establishment jurisdiction before scaling EU personal-data processing**, and to revisit the lead authority if establishment changes.

V5 Transactions §5 Q4 (tax-registration posture) is the adjacent unresolved question — **cited, not resolved here.** The two share the "where is the platform legally situated?" root but are answered on different timelines; this spike does not touch V5 Q4.

---

## 3. Who declares (Q1)

The incident is **declared by the legal/governance care-domain seat** — a role, not a person (ADR-U028 role-based authority; authority gates through the one permission mechanism). This reuses the "legal" axis already named among the Universeers' five care domains in V1 §5 Q4 (admin-role granularity) rather than minting a new role.

**Pre-launch reality:** Stefan holds every seat, so in practice Stefan declares. The design names the *seat* so that when admin-role granularity splits (V1 §5 Q4), incident-declaration already has a home and does not need re-litigating.

---

## 4. Becoming aware (Q2)

GDPR's clock starts not at the first signal but when the declarer has a **reasonable degree of certainty** that a personal-data compromise has occurred. The handoff:

**V4 breach-candidate signal -> V1 triage (initial assessment) -> awareness declared = clock start.**

Both **signal-time** and **awareness-time** are timestamped into the breach register. This dual timestamp is the **anti-gaming control**: a signal cannot be left un-triaged to delay the clock, because the gap between the two times is itself auditable. Triage must be prompt.

**Breach-candidate signals** (drawn from V4 §4 failure modes): RLS-denial / private-by-default inversion; payload leak; a retroactively-discovered audit gap; and a processor-side report from Stripe (Art. 33(2), see §8).

---

## 5. Risk rubric (Q3)

V2 owns the rubric; the V1 declarer applies it; the result and its rationale are recorded in the register entry. Three bands:

| Band | Test | Action |
|---|---|---|
| 0 — Unlikely to risk | e.g. data was encrypted with key uncompromised, already public, or non-identifiable | Register only — no notification |
| 1 — Risk | Identifiable personal data exposed / altered / lost, consequences bounded | Notify authority within 72h; **no** member notice |
| 2 — High risk | Tier-A data + identifiable + confidentiality loss (presumptive) | Notify authority **and** members |

Six grading factors (EDPB-derived, FringeIsland-tuned):

1. **Data sensitivity tier.** Tier A: journal text, assessment results, cord health, Whisp dialogue, home region. Tier B: identifiers, group membership. Tier C: operational / pseudonymous data.
2. **Volume** of members and records affected.
3. **Identifiability** — ease of linking the data to a real person.
4. **Compromise type** — confidentiality (exposure), integrity (alteration), or availability (loss).
5. **Severity of consequences** — *with an explicit FringeIsland clause:* self-reflection content can harm a member disproportionately to its legal category, and exposure affecting vulnerable members pushes the grade up.
6. **Mitigations in place** — encryption, fast containment, etc.

**The bias rule:** when Tier-A self-reflection content is exposed, the rubric defaults toward member notification. This means *more* member notices, not fewer — the deliberate cash-out of the MANIFESTO anchor.

---

## 6. Authority notification (Q4)

Art. 33(3) content template, carried in the runbook:

- nature of the breach, including categories and approximate counts of affected data subjects and records;
- contact point for more information (the DPO/contact-point question is **V2 §5 Q1 — cited, not resolved**);
- likely consequences of the breach;
- measures taken or proposed.

**Phased notification** (Art. 33(4)) is permitted when full facts are not yet known: notify on time with what is known and supplement later, rather than wait past the 72-hour window.

---

## 7. Member notification (Q5)

The reconciliation of two rules that pull in opposite directions:

- **Art. 34 is the floor** — the notice must say *enough* for members to protect themselves: nature of the breach, contact point, likely consequences, measures taken/proposed, in clear and plain language.
- **V3's content-minimisation is the ceiling** — *no more than enough*: nothing beyond those required elements, and no extraneous personal data carried in the notice itself.

**Compelled-category bypass.** The breach notice is a lawfully-compelled category (already named in V3's §7 checklist), so it bypasses member preference suppression — but it still publishes through the shared dispatcher, not via direct sends.

**Channel-compromise fallback.** If the breach may have compromised the primary delivery channel (account/email), Art. 34(3)(c) public communication applies. The runbook mandates an out-of-band / public notice whenever primary-channel integrity is in doubt.

**Ownership split:** V3 owns the channel mechanics (compelled-category send + fallback); V2 owns the content rules (the floor-vs-ceiling reconciliation above).

---

## 8. Vendor breaches (Q6)

Stripe is a named V2 sub-processor. Under **Art. 33(2)**, a processor must notify the controller without undue delay after becoming aware of a breach. Therefore:

- A Stripe-side breach -> Stripe notifies the platform -> **the platform's clock starts at receipt of Stripe's report** (that is the platform's "becoming aware").
- The **sub-processor contract must guarantee**: prompt notification, sufficient detail for the platform to meet its own Art. 33/34 duties, and cooperation.

This feeds **V2's sub-processor rule.** It does **not** change V5 mode 6's citation (which already points at "V2's breach machinery — the Art. 33/34 seam"), so **V5 Transactions is untouched** by this spike.

---

## 9. The breach register (Q7)

Art. 33(5) requires every breach to be documented regardless of whether it was notified. A breach is an **incident, not an admin act**, so it does **not** belong in `admin_audit_log` (admin-acts-only today). The register is a **distinct recording surface** — an instance of the existing ADR-U012 record/expose split (V4 records; V2 exposes the member-rights / authority-facing view), not a new architectural boundary.

Each entry carries:

- incident ID;
- signal-time and awareness-time (the §4 dual timestamp);
- declarer seat;
- affected data categories and sensitivity tier;
- approximate subject and record counts;
- compromise type;
- risk band with factor rationale (§5);
- notification decisions, with timestamps (authority Y/N; members Y/N);
- measures taken;
- status;
- cross-reference to the source V4 signal(s).

---

## 10. On-call posture (Q8)

**Honest now-scale answer:** there is one human and no 24/7 monitoring. The truthful minimum credible path is that breach-candidate signals route to an **active alert channel the operator actually checks** (push/email), on a documented review cadence — *not* logged-and-unseen, which is V4's own "recorded but unseen" failure mode (§4).

**The residual risk is named, not hidden:** a breach occurring during an unavailable window can burn part or all of the 72-hour clock until alerting tooling lands. This is stated plainly rather than papered over (no-silent-cap discipline).

**Later-scale obligation:** a real escalation rotation tied to the legal/governance seat once admin granularity splits. V4 owns the escalation tooling; V1 owns who answers (V4 §5 Q3 / V1 §5 Q5 seam).

---

## 11. Landing record

What this spike changed, and where:

| Spec | Section | What landed |
|---|---|---|
| V2 Privacy | §5 Q5 | Resolved: spine, rubric ownership, member-notice content rules, register-exposes role, sub-processor guarantee, Sweden/IMY assumption, DPO cited to §5 Q1 |
| V1 Administration | §5 Q5 | Resolved: legal/governance seat declares; signal->triage->awareness handoff; runbook ownership incl. Art. 33(3) template + phased posture |
| V3 Notifications | §5 Q6 | Closed: V3 owns channel mechanics (compelled-category send + channel-compromise fallback); content rules cited to V2 |
| V4 Observability | §5 Q3 + §6 Platform Core | Advanced: now-scale breach-signal escalation posture + named residual risk; §6 gains the breach-register recording duty and the escalate-to-human obligation |
| V5 Transactions | — | Untouched (vendor path does not change mode 6's citation) |

**No standalone ADR.** The declarer-seat decision *clarifies* the existing ADR-U028 role model and V1 §5 Q4 axes; the register *instantiates* the existing ADR-U012 split. Both are clarifies-existing, so they land as spec amendments, not new architectural boundaries (the V1-close promotion-as-amendment vs standalone-ADR rule binds).

**Tooling demands route out, not in.** This spike builds no code or tooling. Where the runbook *demands* tooling (alerting/escalation, the breach-register store, a public-notice fallback channel), those demands route to the normal pickup channels — they are not this spike's to build.

---

## Open seams (cited, deliberately not resolved here)

- **V2 §5 Q1** — DPO/contact-point at current scale.
- **V5 §5 Q4** — tax-registration posture (shares the establishment-jurisdiction root with §2).
- **V4 §5 Q3** — full on-call rotation at later scale (now-scale posture committed; rotation deferred).
- **Establishment confirmation** — the Sweden/IMY assumption (§2) must be confirmed before scaling EU personal-data processing.
