# Hub v2 — Phase-1 review findings register

**Status:** In progress · **Opened:** 2026-06-22 · **Reviewer:** Stefan
**Resolution log (2026-06-22):** **F-04 applied** — SPECIFICATION §L3 (A-COI intro + 7 COI rows + 2 external-dep rows + Sources-status provenance entry), DESCRIPTION, OPEN_QUESTIONS (CQ-009 note), and both tours (HUMAN Ch. 6 + TECHNICAL COI section/table/deps); the "Mentor" *entity* is retired and recast onto the dialogic, AI-driven Whisp (mentoring kept as a *function*). See [`F-04-whisp-amendment-proposal.md`](./F-04-whisp-amendment-proposal.md). **F-02** (Ch. 1 GDPR hard-delete) and **F-03** (Ch. 3 player) fixed in HUMAN.md. **Remaining:** F-01 (founding-question sweep), F-05 (A-ADM capability), F-07 (research + OQ). Not yet committed.
**Loop:** [PROCESS.md §9 — Build-informed spec evolution](../PROCESS.md) (capture -> triage -> resolve-with-provenance -> propagate).
**First batch source:** Stefan's read of [`docs/products/hub/tours/HUMAN.md`](../../products/hub/tours/HUMAN.md) (a *derivative* of Hub SPECIFICATION §L3 — not authoritative).

> **Why a register.** Nothing is fixed silently. Each item is logged, triaged into one of three buckets, and routed. Tour-only items fix the tour; upstream-bearing items amend the owning spec *first* (with provenance), then the tour re-derives; open questions go to OPEN_QUESTIONS.md.

**Triage key.**
- **TOUR-ONLY** — the tour misreads/over-editorialises what the spec already says correctly. Fix `HUMAN.md` (and check `TECHNICAL.md`). Cheap.
- **UPSTREAM** — the canon itself (§L3 / DESCRIPTION / an ADR) is wrong, missing, or diverged. Amend the owning spec, then re-derive the tour. The valuable kind.
- **OPEN-Q** — exposes something undecided/strategic. Route to `OPEN_QUESTIONS.md`.

---

## Findings

### F-01 — Drop the founding-question editorialising (General + per-chapter + Epilogue)
**Stefan:** Skip the repeated "this area is about *Who am I / What do I want / How do I get there*" framing, and the Epilogue's speech organising the architecture around those questions. The questions are fundamental and the FIM works them with their Whisp; the platform *supports* them by its anatomy but the tour should not sermonise about them.
**Triage:** TOUR-ONLY (the questions stay canon — VISION.md, `universe/personal-growth/three-questions.md`; only the tour's framing is removed).
**Owning artifact:** `HUMAN.md` (check `TECHNICAL.md`). **Watch (not in scope unless you say so):** whether §L3's "Founding question(s) served" column also wants a lighter touch — defer.
**Disposition:** Pending your confirm. Cheap rewrite once F-04 lands (the two interact — Whisp is who works the questions with the FIM).

### F-02 — Reactivation overstated vs GDPR hard delete (Ch. 1)
**Stefan:** "The Hub will eventually let you reactivate… the door open… decisions about identity rarely once-and-for-all" is only part true — a **hard delete is a full GDPR erasure with no reactivation**.
**Triage:** TOUR-ONLY. Canon already distinguishes reversible (deactivate / decommission — IDN-9, IDN-12) from irreversible (ADM-4 hard delete, a true cascade; behaviour inventory confirms reactivating a decommissioned user is blocked). The tour just blurred them.
**Owning artifact:** `HUMAN.md`. **Disposition:** Fix — carve out hard delete as final/irreversible (GDPR).

### F-03 — "Deliberately quiet" journey player is not inherent (Ch. 3)
**Stefan:** The player is not *deliberately* quiet — its actions are decided by the journey's creator in the **Journey Studio**.
**Triage:** TOUR-ONLY. Canon already says the player renders whatever the creator/DS-3 publishes (JRN-18; the tour's own later paragraph). "Deliberately quiet" is an editorialisation that contradicts creator-authored variability.
**Owning artifact:** `HUMAN.md`. **Disposition:** Fix — the player faithfully renders what the journey's creator designs (quiet or not).

### F-04 — The companion is the WHISP, not a "Mentor"; and the Whisp is dialogic, not passive (Ch. 6) [HIGH]
**Stefan:** The Hub will NOT offer a "Mentor." It offers a **Whisp** — the FIM's inner warm, positive voice, in **constant dialogue** with the FIM. The later line "Whisp is not someone you talk to — it is a kind of internal-state surface" is therefore also wrong. How the Whisp works is described in detail in the universe canon.
**Triage:** **UPSTREAM — load-bearing.** Grounded against canon:
- ADR-U029: *"the Whisp is… each FIM's inner dialogue AND their avatar… two framings, one entity"*; DS-7 owns *"the Whisp as a being: dialogue, …"*. ADR-U031: Mists carry their own Whisp.
- "Mentor" appears only in `OPEN_QUESTIONS.md` — **not** ratified canon. §L3's A-COI "Mentor" construct (COI-1..COI-5) is a derivation that drifted from the canonical Whisp.
**Owning artifacts (in order):** beings core `docs/ecosystem/universe/beings/README.md` (+ the planned `whisp.md`) is the authority → amend **SPECIFICATION §L3 A-COI** (recast Mentor capabilities onto the dialogic Whisp; fix COI-6's "internal-state surface" framing) → **SPECIFICATION external-deps** (DS-7 "AI Mentor lifecycle") and **DESCRIPTION** (DS-7 "AI mentor") → re-derive `HUMAN.md` Ch. 6.
**Disposition:** Deliberate spec correction (not a quick edit), grounded in the beings core. **Does not block the Phase-1 gate or Phase 2** — A-COI is post-Ferd (no substrate, no oracle). But it must be corrected before A-COI is built, and the spec shouldn't carry the wrong concept meanwhile. Candidate for an amendment pass.

### F-05 — Missing admin capability: remove user(s) from a *specific* group/groups (Ch. 8)
**Stefan:** Platform Operations lacks the ability for an admin to remove single or multiple users from a *specific* group or groups.
**Triage:** UPSTREAM (capability gap). §L3 A-ADM has ADM-6 (sweep from *every* group) and Steward-scoped MEM-5 (remove from *one* group), but no DeusEx/admin-scoped targeted removal from named group(s).
**Owning artifact:** SPECIFICATION §L3 A-ADM (add a capability) → re-derive `HUMAN.md`. **Disposition:** Add an A-ADM row (admin targeted group removal, single + bulk); moderate.

### F-07 — The Hub reads as "just a platform"; the intended purpose is higher (Finally)
**Stefan:** The tour frames the Hub as a platform for journeys + notes + communication + Whisp, but the real intent is "much higher and advanced purposes." Maybe later? Pointer: read `docs/ecosystem/universe` and `docs/ecosystem/thinking`.
**Triage:** OPEN-Q / strategic. Signals the product-layer derivation (DESCRIPTION / §L3) may under-scope the universe vision. Likely correlated with F-04 (the experience layer lagging the universe canon).
**Owning artifact:** `OPEN_QUESTIONS.md` (strategic scope) + Hub DESCRIPTION scope boundary. **Disposition:** Log as a vision-altitude scope question; revisit DESCRIPTION/§L3 against the universe canon. I have not yet read `universe/` + `thinking/` in full — that's the grounding step before any answer.

---

## Themes (meta)

- **The product layer drifted ahead of the universe canon on the Whisp** (F-04), and the Hub's described ambition is narrower than the universe intent (F-07). Together this echoes the standing principle *fundamentals-before-experience-design*: the §L3 derivation predates full absorption of the universe canon (beings, Whisp, the three-questions model). The near-term build areas (Identity, Groups, Journeys, Communication, Notifications) are unaffected; the **companion/insight + vision-scope layer** is where the reconciliation is owed.
- **Gate impact:** none of these block the Phase-1 gate's purpose (Phase-2 readiness). F-04/F-05/F-07 become tracked spec corrections; F-01/F-02/F-03 are tour cleanups. The gate brief's "Pass" stands; these add to the tracked follow-ups.

## Next actions (proposed — awaiting Stefan)
1. **Confirm the triage** above (especially F-01 tour-only and F-04 upstream).
2. **Tour-only batch (F-01, F-02, F-03):** I fix `HUMAN.md` in one pass — but I'd sequence it *after* F-04 since Ch. 6 + the founding-question framing both depend on the Whisp correction.
3. **F-04 (Whisp):** I first read the beings core + Whisp canon in full, then propose the §L3 A-COI amendment (deliberate, provenance-cited). This is the big one.
4. **F-05:** draft the A-ADM capability addition.
5. **F-07:** I read `universe/` + `thinking/`, then we frame the scope question in OPEN_QUESTIONS.md.
