# Mist reconciliation register (Shadow -> Mist rename + re-scope)

**Authored:** 2026-06-21 (Step 1 audit, read-only). **Brief:** [`docs/planning/sessions/openers/mist-reconciliation-brief.md`](../sessions/openers/mist-reconciliation-brief.md).
**Authority:** discovery Statements 47-48 (`docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`, commit `28cc770`). Discovery outranks every other artifact; on conflict, the artifact is corrected to match the discovery, never the reverse.
**Status:** **STEP 1 RATIFIED by Stefan 2026-06-21.** Inventory approved; decisions A-F ruled (see foot). Step 2 (rectify) in progress, keystone first. AMBIGUOUS items that surface mid-rectification stay open for Stefan.

This register IS the worklist. Each cluster carries a completion checkbox; AMBIGUOUS items stay open for Stefan.

---

## The decision rule (from the brief, restated)

For each occurrence, exactly one verdict:
- **RENAME -> Mist** - means the anonymous, pre-signup entrant / its lifecycle / data / access. Rewrite to Mist.
- **KEEP (place-3 menace)** - means (or should now mean) the hostile place-3 / sleep-paralysis entity. Leave the word.
- **NEEDS-MECHANICS-UPDATE** - the file models the tier's behaviour; fold in the new mechanics (accretion, two-paths-one-gate, presence/assessment ephemerality, Whisp-carried/cord-kept). Usually co-occurs with RENAME.
- **NOVEL-FLAG-ONLY** - under `docs/novel/`. Record, never edit. Corrected at a future novel-reconciliation via the conformance register.
- **HISTORICAL - LEAVE** - append-only provenance (discovery log, session bridges, archived openers, retrospectives, superseded-ADR bodies). Forward-only; do not rewrite. The ADR *status line* is the one exception (U027).
- **AMBIGUOUS -> ASK STEFAN** - cannot be confidently placed. See the decisions section at the foot.

---

## Headline findings (read these first)

1. **The active tree is uniformly RENAME.** Across all active ADRs, universe cores, platform/products/verticals specs, and the current architecture set, **every "Shadow" occurrence is the anonymous-entrant sense.** There is **no place-3-menace "Shadow" anywhere in the active tree** - the menace sense currently has no foothold with that word. So in the active tree the dangerous "two meanings" collision does not actually fire: there is nothing to mis-replace. The KEEP/menace cases exist only in the thinking tree (`portal-ideas`) and the novel.
2. **No schema/code rename.** 71 code hits on "shadow" are all Tailwind `shadow-*` CSS classes - zero entity uses. The entity is keyed in schema as **`Visitor` system group + `Guest` role** (live `supabase/seeds/04_system_groups.sql`; one archived migration). Out of scope per the brief; deferred as a code-correction target (now Visitor/Guest -> **Mist**, not Shadow).
3. **A mechanics ambiguity, not just a noun.** Statement 47 distinguishes the **consent event** ("becoming a FIM" = transcendence in U027 vocabulary) from the **completion event** ("metamorphosis" = the ball appears). They coincide on the anonymous path and are ordered on the signup-first path. This is NOT a transcendence->metamorphosis blanket rename. See decision A.
4. **Volume.** ~510 total "shadow" lines. ~255 are bulk HISTORICAL/NOVEL/research (wholesale dispositions below). ~255 are the active worklist across ~70 files.

---

## Order of work (authority order from the brief)

Keystone first (ADR-U031), then by authority. Clusters below are in build order.

---

### Cluster 0 - KEYSTONE: author ADR-U031, supersede ADR-U027

- [x] **NEW: `docs/architecture/decisions/ADR-U031-mist-identity-lifecycle.md`** (DONE 2026-06-21) - the anonymous identity is the **Mist**; "Shadow" reassigned to the place-3 menace; the U027 lifecycle (anon auth, ephemerality, atomic transcendence) **preserved and renamed**; add the accretion/consent-gate mechanics and the assessment/presence ephemerality; define transcendence (consent) vs metamorphosis (completion) per decision A; cite Statements 47-48 and predecessor U027 (which renamed U004's "Visitor").
- [x] **`docs/architecture/decisions/ADR-U027-shadow-identity-lifecycle.md`** (13 hits) (DONE 2026-06-21) - **HISTORICAL body (LEAVE), STATUS-LINE EXCEPTION:** flip status to "Superseded by ADR-U031" + one-line pointer at top. Body stays intact as the record of what was decided. (Verdict: HISTORICAL-LEAVE + status edit.)
- [x] **`docs/architecture/decisions/README.md:40`** (DONE 2026-06-21) - index row "ADR-U027 | Shadow identity lifecycle | Accepted" -> marked Superseded by U031; U031 row added. (RENAME, index.) **Doc-health note:** the index is missing rows for the existing ADR-U029 and ADR-U030 (pre-existing drift, unrelated to this pass) - flag for Step 3 doc-health-check.

---

### Cluster 1 - ADR cross-references (accepted ADRs that cite the anonymous tier)

These are accepted (not superseded) ADR bodies. Recommended treatment: **pointer-edit** (correct the noun + add "(the Mist, ADR-U031)"), NOT a rewrite - see decision D.

- [x] `ADR-U025-products-as-equipment-profiles.md:57` (DONE 2026-06-21) - "(Shadow + FIM)" -> "(Mist + FIM; the Mist was the Shadow, renamed per ADR-U031)". RENAME (pointer); status not flipped (D).
- [x] `ADR-U029-whisp-ownership-split-by-face.md:61` (DONE 2026-06-21) - cross-ref -> "ADR-U031 (Mist lifecycle - Mists carry their own Whisp from the start; supersedes ADR-U027, which called the Mist the Shadow)". RENAME (pointer); status not flipped (D).
- [x] `ADR-U004-visitor-anonymous-sign-in.md` (title + body, 1 shadow hit at :12 + the Visitor body) (DISPOSITIONED 2026-06-21: LEFT) - **HISTORICAL-LEAVE** (predecessor ADR; "Visitor" is the era-correct mechanism name). Supersession chain U004 -> U027 -> U031 recorded in U031, not by editing U004.

---

### Cluster 2 - Universe cores (canonical; brief item 2)

- [ ] **`docs/ecosystem/universe/roles/README.md`** (4: L0 line :20, Shadow def :33, transcendence :39, retired-names Visitor->Shadow :125) - **RENAME + NEEDS-MECHANICS.** Keystone-canonical: rewrite the Shadow definition as the **Mist** (hyaline, accretion, two paths/one gate, Whisp carried from start); change retired-names **Visitor -> Mist**; ADD a canonical entry for **Shadow = place-3 menace** and a retired-name note that old-sense "Shadow (anonymous entrant)" -> Mist.
- [ ] **`docs/ecosystem/universe/cosmology/README.md`** (7: :57,:105,:142,:178,:181,:182,:218) - **RENAME + NEEDS-MECHANICS.** Access table + "no ball" rows -> Mist. This is also where place-3 lives: **make the place-3-menace "Shadow" sense explicit** (KEEP-target now populated).
- [ ] `docs/ecosystem/universe/beings/README.md:22` - "everyone has one, Shadow or FIM" -> Mist or FIM. RENAME.
- [ ] `docs/ecosystem/universe/community/README.md:18` - identity states Shadow/FIM -> Mist/FIM. RENAME.
- [ ] **`docs/ecosystem/universe/personal-growth/privacy-model.md`** (2: :55 + status :3) - **RENAME + NEEDS-MECHANICS** (ephemerality now extends to assessment + presence layers; "no trait-profile pre-consent").
- [ ] `docs/ecosystem/universe/README.md:42` - roles-tier description -> Mist. RENAME.
- [ ] **`docs/ecosystem/VISION.md:39`** (constitutional) - "Entrants begin as **Shadows** ... may **transcend**" -> Mist + metamorphosis/transcendence per decision A. **RENAME + NEEDS-MECHANICS; constitutional - careful edit.**
- [ ] **`docs/ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md`** (12: "Group 0 - Shadows" :23 + :24,:26,:28,:52,:62,:72,:82,:92,:101,:103,:105) - **RENAME + NEEDS-MECHANICS** (the whole Group-0 section models the tier; "move through ... like a shadow" prose needs rewording so the figure-noun and the simile don't collide).
- [ ] `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md:162` - "Shadow experience" -> Mist. RENAME.
- [ ] `docs/ecosystem/strategy/README.md:29` - index "Shadows, FIMs" -> Mists. RENAME.

---

### Cluster 3 - Architecture

- [ ] **`docs/architecture/ECOSYSTEM_ANATOMY_V5.svg`** (2: `<desc>` :4 "Identity PC-2 with the Shadow lifecycle"; label :271 "Auth, profile, sessions, Shadow lifecycle") - **RENAME** (current canonical anatomy, June 2026 - must be corrected). "Shadow lifecycle" -> "Mist lifecycle".
- [ ] **`docs/architecture/DOMAIN_ENTITIES.md`** (2: :9, :57) - **RENAME + NEEDS-MECHANICS.** "anonymous, ephemeral **Shadow** identity state precedes the FIM ... (ADR-U027)" -> Mist + ADR-U031.
- [ ] `docs/architecture/README.md` (2: :27, :38) - index lines describing U027 + the V5 SVG -> Mist/U031. RENAME.
- [ ] **`docs/architecture/ARCHITECTURE_ANATOMY_V1.md`** (4 shadow: :9,:81,:171,:512; +many "visitor") - **AMBIGUOUS -> decision B.** Self-marked era-correct historical reference (banner at :8 "Role and visitor terminology inside is era-correct"). Recommend HISTORICAL-LEAVE + a one-line pointer that identity terms are superseded by U031.

---

### Cluster 4 - Platform core + the keystone spec

- [ ] **`docs/platform/core/identity-specification.md`** (10: §9 "Shadow lifecycle" header :229 + :227,:231,:233,:235,:236,:237,:240,:262,:272) - **THE KEYSTONE SPEC. RENAME + NEEDS-MECHANICS (heavy).** This is where the lifecycle lives. Fold in: accretion (progress-not-trait), two-paths-one-gate, metamorphosis vs transcendence (decision A), presence/assessment ephemerality + unlinkability, no pre-consent inference. Rename §9 to "Mist lifecycle (ADR-U031)"; keep the U004 anonymous-auth mechanism cite.
- [ ] `docs/platform/core/infrastructure-specification.md` (2: :65, :171) - **RENAME.** "PC-2's Shadow TTL sweep per ADR-U004/U027" -> Mist TTL sweep per ADR-U004/U031.

---

### Cluster 5 - Domain services (7 specs + CLAUDE files + README)

Mechanically uniform: noun swap **Shadow -> Mist** and cross-ref **ADR-U027 -> ADR-U031**. The ephemerality claims themselves are canon-true and carry forward (U031 preserves U027's posture and widens it). NEEDS-MECHANICS is light here (mostly the presence/assessment-ephemerality extension where a spec models data-layer ephemerality). RENAME (+ light NEEDS-MECHANICS).

- [ ] `docs/platform/domain/README.md` (3: :11,:12,:13) - Shadow-to-FIM transcendence continuity; Shadow-capture / Shadow-communication ephemerality.
- [ ] `docs/platform/domain/journeys.md` (21) + `journeys/CLAUDE.md` (3) - Shadow enrolment/transcendence continuity, loop-state ephemerality.
- [ ] `docs/platform/domain/content.md` (20) + `content/CLAUDE.md` (4) - Shadow-capture ephemerality (incl. blobs).
- [ ] `docs/platform/domain/world-model.md` (16) + `world-model/CLAUDE.md` (3) - Shadow cord state ephemerality; anon-readable shared world.
- [ ] `docs/platform/domain/intelligence.md` (15) + `intelligence/CLAUDE.md` (3) - one Whisp per person Shadow-or-FIM; Shadow-Whisp TTL.
- [ ] `docs/platform/domain/communication.md` (9) + `communication/CLAUDE.md` (2) - Shadow-communication ephemerality; village FIM-only.
- [ ] `docs/platform/domain/discovery.md` (6) + `discovery/CLAUDE.md` (2) - Shadow/anon read parity; trace TTL.
- [ ] `docs/platform/domain/narrative.md` (5) + `narrative/CLAUDE.md` (2) - "no per-Shadow state at this derivation"; anon-readable published structure.

> Note for Cluster 5: each of these files also embeds the schema-identifier reality (some reference the data layer). The noun rename is canonical; none of these instruct a schema change.

---

### Cluster 6 - Products + the Hub v2 Phase-1 trio (THE GATE BLOCKER)

- [ ] `docs/products/CLAUDE.md` (3: :13,:36,:51) - "Shadows before FIMs", "anonymous entrant ... Shadow" -> Mist. RENAME + NEEDS-MECHANICS (the "Shadows-before-FIMs" tier rule becomes "Mists-before-FIMs").
- [ ] `docs/products/hub/CLAUDE.md` (2: :71,:73) - RENAME.
- [ ] `docs/products/hub/DESCRIPTION.md` (1: :21) - RENAME + NEEDS-MECHANICS (Hub Phase-1 trio target).
- [ ] **`docs/products/hub/SPECIFICATION.md`** (10: :72,:74,:78,:127,:156,:182,:186,:187,:235,:381) - **RENAME + NEEDS-MECHANICS.** Hub Phase-1 trio target; IDN-1/IDN-2/JRN-5 + the §L2 §3 U027 reflection. Re-ground on Mist/U031.
- [ ] `docs/products/hub/tours/HUMAN.md` (2: :30,:72) + `tours/TECHNICAL.md` (5: :95,:101,:102,:119,:205) - **RENAME** (current Hub narrative docs - decision E). 
- [ ] **`docs/planning/hub-v2/README.md`** (1: :11) - RENAME ("the Shadow lifecycle is the one substantial gap").
- [ ] **`docs/planning/hub-v2/substrate-audit.md`** (11) - **RENAME + NEEDS-MECHANICS + careful.** References both the canonical name (Shadow gap -> Mist gap) AND the schema identifiers (`Visitor`/`Guest` -> rename **on build** now to Mist, not Shadow). U004/U027 cites -> U004/U031.
- [ ] **`docs/planning/hub-v2/behaviour-inventory.md`** (7) - same as substrate-audit: canonical rename + the "vocabulary drift Visitor/Guest -> Shadow" line becomes "-> Mist".

> **Sequencing gate:** these trio outputs (Hub DESCRIPTION + SPECIFICATION, substrate-audit, behaviour-inventory) were written against the old Shadow meaning. Per the brief, **the Hub v2 Phase-1 gate must not pass until they are re-grounded on Mist/U031.** This pass clears that dependency.

---

### Cluster 7 - Verticals

- [ ] **`docs/verticals/privacy/SPECIFICATION.md`** (10: :42,:49,:60,:91,:92,:93,:94,:123,:137,:144) - **RENAME + NEEDS-MECHANICS.** The brief flags this specifically: the four U027 Shadow bullets + S43 in §6 are kept-verbatim and must be re-grounded on Mist/U031 (and widened to presence/assessment ephemerality, no pre-consent inference). Privacy is active and cites U027 directly.
- [ ] `docs/verticals/notifications/SPECIFICATION.md` (4: :57,:66,:90,:129) - RENAME ("a Shadow holds no durable address" -> Mist).
- [ ] `docs/verticals/administration/SPECIFICATION.md` (1: :113) - RENAME (remediation without identity).
- [ ] `docs/verticals/transactions/SPECIFICATION.md` (1: :82) - RENAME ("Shadows cannot transact").

---

### Cluster 8 - Planning reference + capability map

- [ ] `docs/planning/waves/FERD-CAPABILITY-MAP.md:7` - terminology note "'visitor' reads as Shadow" -> Mist. RENAME.
- [ ] `docs/planning/reference/ADMIN-DEUSEX-GAP-ANALYSIS.md:171` - "Shadow/visitor account management" -> Mist. RENAME (light).
- [ ] `docs/planning/reference/legacy-feature-docs/README.md:15` - "read ... as Shadow" -> Mist. RENAME (light; reference snapshot - leave its referenced legacy bodies).
- [ ] `docs/ecosystem/thinking/OPEN_QUESTIONS.md:131` - the 2026-06-10 note narrowing the visitor question -> Mist + U031. RENAME + NEEDS-MECHANICS (light).

---

## Bulk dispositions (wholesale - no per-line edits)

| Bucket | Files / count | Verdict | Action |
|---|---|---|---|
| **Discovery log (session-01)** | `2026-05-18_universe-discovery-session-01.md` (63) | **HISTORICAL - LEAVE** | Append-only; 47-48 already supersede by addition. Do not touch. |
| **Session bridges + archived openers + STATUS** | `docs/planning/sessions/**` (139, incl. this brief's 21) | **HISTORICAL - LEAVE** | Record of what was decided when. (`openers/STATUS.md` is a live opener index - leave; it asserts no canon.) |
| **Novel** | `docs/novel/**` (39) | **NOVEL-FLAG-ONLY** | Record, never edit. *The Shimmer* keeps "Shadow" as a locked term for the crossing/anonymous sense; now divergent; corrected at a future novel-reconciliation via the conformance register. |
| **Research reports** | `docs/research/**` (14) | **HISTORICAL / N-A - LEAVE** | Generic literary "shadow" (Zelda Dark World "Shadow version"; shadow archetype) - external-research description, not our entity. |

---

## Decisions A-F - RATIFIED by Stefan 2026-06-21

- **A. transcendence vs metamorphosis - RULED: they are the SAME event, not two.** Do NOT bind "transcendence" to consent and "metamorphosis" to completion as two ordered events - that contradicts Path 1. Consent and completion are **two conditions whose timing differs by path, not two events.** The rule to apply (lands as an explicit paragraph in ADR-U031's decision section, so it is canon not buried here):
  - **Metamorphosis = transcendence = one event** (lore name / threshold name = two faces of the same moment; preserves U027's "in the fiction it grants the ball; on the platform it grants persistence; same threshold, two faces").
  - It fires only when **BOTH** conditions hold: all questions complete **AND** consent given. Path 2 (anonymous) = one moment; Path 1 (signup-first) = the *later* condition gates it, i.e. **completion** (consent already happened at the door) - it does **not** fire at signup.
  - **Consent is a precondition** of metamorphosis, not a synonym for a separate event.
  - Why not signup-fires-in-Path-1: that would imply the Whisp delivers and the cord first pays out at signup - wrong, since S48 ties the cord's first paying-out to the ball, i.e. to completion.
  - **Terminology:** keep "transcendence" as the spec/platform term and "metamorphosis" as the lore term for that same single event; introduce no second event.
- **B. `ARCHITECTURE_ANATOMY_V1.md` - APPROVED:** HISTORICAL-LEAVE + one pointer line to ADR-U031.
- **C. Thinking tree - APPROVED (leave as exploratory record).** Nuance per Stefan: if `universe-discovery/README.md` reads as a **current-orientation index** (not a dated log), add a single pointer line ("anonymous tier: see S47-48 / ADR-U031"); if it reads as a **log**, leave it. CC's judgment on which (assessed at rectification time). `onboarding-summary` and `portal-ides` left untouched; `portal-ideas` "Shadow-side" noted as now-consonant with the re-scope (candidate for a later cosmology pass).
- **D. Accepted-ADR cross-refs (U025:57, U029:61) - APPROVED:** pointer-edit, **do NOT flip their status** (not superseded, just citing a renamed thing). A light "(Shadow, now Mist per U031)" at the reference site is enough.
- **E. Hub tours (`HUMAN.md`, `TECHNICAL.md`) - APPROVED:** RENAME. Fold in mechanics **only where a tour actually describes the tier's behaviour**; otherwise just the noun.
- **F. Schema identifiers (Visitor/Guest) - APPROVED: no action this pass.** **Register note:** the deferred build-time rename target is now **Mist** (not Shadow) - whoever picks up the code rename (`supabase/seeds/04_system_groups.sql`; archived `20260216071649_rbac_system_groups.sql`; Hub v2 substrate-audit "rename on build") inherits **Mist** as the destination.

---

## Step 2 / Step 3 (not started)

- **Step 2 (rectify):** cluster-by-cluster in the order above, keystone first. Per file: dry-run, verify diff, apply (ASCII-only). One logical cluster per commit. Commit form: `docs(scope): ... (Shadow -> Mist; cites discovery S47-S48, ADR-U031)`. Register each cluster's completion here.
- **Step 3 (close):** register gap **G-34** in `docs/ecosystem/how-we-work/gaps.md` if the pass spans >1 session; run `doc-health-check`; update the Hub v2 Phase-1 gate note; write a closing bridge; commit/push on Stefan's disposition.
