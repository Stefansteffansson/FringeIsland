# Vertical — V2: Privacy, GDPR & AI Consent

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V2
name: Privacy/GDPR
owner: Stefan
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: active
last_updated: 2026-06-12
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Personal data protection is non-negotiable. This vertical guarantees that every byte of personal data we hold is collected lawfully, used minimally, exported on request, and deleted on request — including data fed to or derived from AI systems. Trust is the precondition for everything else FringeIsland tries to do. Privacy failures don't just cost fines; they break the relationship the platform needs with its users to function at all.

### 2. Scope

- Lawful basis for every category of personal data (GDPR Art. 6)
- Consent capture and consent withdrawal flows
- Data minimisation in collection and storage
- Right of access (export)
- Right to erasure (delete)
- AI training opt-out and AI personalisation opt-out
- Records of processing (GDPR Art. 30)
- Sub-processor list maintained and disclosed
- Cross-border transfer posture
- Shadow (anonymous entrant) data minimisation and ephemerality (ADR-U027)
- Per-region, per-audience, revocable sharing of the FIM's private home (universe-discovery S43)

### 3. Tooling and infrastructure

- **Consent store (partial).** Consent state is authoritative in Platform Core: PC-2 Identity holds per-member, per-category consent. What exists today is the posture, not the tooling — no shared consent API, no per-category schema. Named waiting consumers: transcendence consent-capture (ADR-U027) and DS-7 bucket-level consent (PC-2 surface).
- **Export pipeline (to be designed).** Must serve both right of access (GDPR Art. 15 — a copy of the data plus its processing context) and portability (Art. 20 — member-provided data in a structured, commonly-used, machine-readable format). Distinct rights, distinct outputs; one pipeline must not collapse them. Per-service export hooks (§6) are the feed.
- **Erasure cascade (to be designed).** Art. 17 across every service's owned data, including AI-derived data (DS-7, scope-qualified per §5). Must reconcile with ADR-U021's no-data-mutation posture: the membership-exit soft-flag is not Art. 17 erasure — the cascade needs a regime-grade unlink/anonymise path (§5 Q4). No Shadow-path erasure mechanism is realized (the ADR-U004 pg_cron cleanup is lock-only); the one realized erasure-adjacent mechanism is the `[Deleted User]` sentinel reassignment on platform exit (seeded sentinel group + permission-gated reassignment function).
- **Records of processing (Art. 30) — missing.** No data map exists. Per-service category/lawful-basis declarations (§6) are the input; the register itself is unowned tooling.
- **Member-facing access trail (missing; shared with V4 Observability).** ADR-U012 splits the audit trail: Observability records data-access events, Privacy exposes them to the member. No exposure surface exists.

Missing shared tooling is a flag, not a failure: each gap above is a candidate entry for §L4's "Obligations without shared infrastructure."

### 4. Failure modes

- **Unlawful collection.** A feature ships collecting personal data with no documented Art. 6 basis. Detected at feature-spec time by the Vertical Impact review (§7), retroactively by the Art. 30 register exercise. Recovered by stopping collection and documenting a basis or deleting the data.
- **Consent drift.** Consent state and actual processing diverge — personalisation continues after opt-out, or an unconsented category is processed. Detectable only if consent is checked at the platform layer (PC-2 authoritative; tiers ask, never infer) and denials are observable. Recovered by halting processing and purging derived outputs where feasible.
- **Erasure shortfall.** An Art. 17 request completes against primary rows but copies survive — logs, search indexes, AI-derived data, exports. The platform has told the member something untrue. Detected by erasure-cascade verification (owned data must be enumerable to be checkable); structural until the cascade exists. Recovered by completing the erasure and assessing the Art. 33/34 notification duty.
- **Shadow durability leak.** Shadow-generated data survives past TTL/explicit-close; or transcendence migrates data without captured consent; or the sweep erases a mid-migration joiner. Tested platform invariants (ADR-U027): detected by sweep-correctness and migration-atomicity tests. The mid-migration case is prevention-only.
- **Private-by-default inversion.** A surface renders private data (home region, journal, assessment result, cord health) without explicit FIM action. Detected via RLS-denial observability and component-level privacy-state handling; recovered by closing the leak, auditing the access trail, assessing Art. 33/34.
- **Breach without notification.** A personal-data breach goes undetected or unnotified within Art. 33's 72-hour window (supervisory authority) / Art. 34 (member). Detection depends wholly on V4 Observability instrumentation; the response process does not yet exist (§5 Q5).

### 5. Open questions

1. Do we need a Data Protection Officer (DPO) at our scale?
2. How do we handle erasure for data that has been embedded into AI model state?
3. Where do we sit on the spectrum from "GDPR-only" to "global highest standard"?
4. **Erasure vs the no-mutation posture (ADR-U021 seam).** Membership-exit anonymisation is a display-time soft-flag; an Art. 17 request requires regime-grade unlinking or true anonymisation of authored content. Where is the line? Candidate ADR when the erasure cascade is designed. Realized evidence: the platform already distinguishes the two events — membership exit is display-time soft-flag (ADR-U021, display logic not yet realized); platform exit reassigns authorship to the `[Deleted User]` sentinel (realized). Neither is yet regime-grade Art. 17; the line still needs drawing.
5. **Breach response (Art. 33/34).** The 72-hour notification duty exists from the first byte of personal data; no detection-to-notification process is defined. Candidate spike; seams with V1 Administration (process) and V4 Observability (detection).
6. **Anonymised-aggregate research posture.** The privacy model sanctions aggregate exploration only with explicit informed consent under enterprise stewardship — which consent category, which stewardship gate, in or out of Ferd?
7. **Capture provenance and non-member rights (DS-4 routing).** Real-world capture implicates bystanders, private interiors, location traces — GDPR obligations to people who are not members. Needs the routed research spike before obligations can be authored.

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- Consent state is authoritative here: PC-2 Identity stores consent per member, per category, with capture context (what was consented, when, against which notice version). Every other tier queries it — asks, never infers
- Every personal-data category Platform Core stores has a documented lawful basis (GDPR Art. 6) — the platform's input to the Art. 30 record
- Every table holding FIM data has RLS; every SQL function reading FIM data runs least-privilege (`SECURITY DEFINER` only when strictly required, always with `search_path = ''`); every API endpoint returning FIM data filters at the platform level — never return over-broad results for a downstream tier to filter
- The storage layer respects erasure (Art. 17) cascading through all owned data — and erasure is verifiable: owned data must be enumerable or the cascade cannot be checked
- Export hooks distinguish right of access (Art. 15) from portability (Art. 20) — different rights, different outputs
- Shadow data minimisation (ADR-U027): the anonymous entrant (Shadow) receives a server-issued anonymous identity with no PII; no personal data is collected beyond what the Shadow itself generates in-session
- Shadow ephemerality (ADR-U027): the Shadow's own generated data is erased on a short TTL after inactivity and on explicit close (explicit-erase path); the exact TTL/inactivity threshold is a configuration this vertical owns jointly with PC-2 Identity (deferred by design). Shared-world content merely read by the Shadow is out of scope
- Whisp dialogue is treated as potentially personal data regardless of the Shadow's anonymity — it is the most sensitive class of Shadow-generated data and carries full minimisation and erasure obligations
- Transcendence consent-capture (ADR-U027): becoming a FIM is the one moment Shadow data binds durably; consent is captured atomically with the data migration, and a last-moment joiner must not be erased mid-migration (the TTL sweep honours the explicit-erase path and the mid-migration guard)
- The access trail over a member's data is itself member-facing data (ADR-U012): Observability records data-access events; Privacy exposes them — "what has been done with my data?" is answered by a Platform API, not a support ticket

#### Domain Services

- Each service declares which personal-data categories it stores and the Art. 6 lawful basis for each — the per-service input to the Art. 30 record
- Each service implements export (honouring the Art. 15 / Art. 20 distinction) and erasure (Art. 17) for its owned data, including service-local stores and search indexes
- The Intelligence service (DS-7) carries additional obligations — AI-derived data is also user data:
  - Inferences, embeddings, and accumulated profile buckets are personal data even when not row-shaped; they carry the same export and erasure obligations (erasure scope against AI model state is unsettled — qualify, never promise; §5 Q2)
  - Personalisation and recommendation signals are processed only under per-bucket consent state held in PC-2 (at Ferd: declared interests only)
  - AI-training opt-out and AI-personalisation opt-out are distinct member choices, both enforced at the point of processing — not at the point of display
  - Every external AI provider is a sub-processor: named on the sub-processor list before personal data flows, with what is sent bounded by the member's consent state
  - Validated-instrument results dissolved beneath dialogue are assessment results — private-by-default class data however informally gathered
- The service owning the FIM's private home enforces granular sharing (universe-discovery S43; see `../../ecosystem/universe/personal-growth/privacy-model.md`): per-region, per-audience, and revocable — the FIM can open one room to one audience and keep the rest locked, and the FIM holds the only key by default
- Cord-health / Whisp-state visibility follows the branch rule (glanceable, invited, self-first): a consent surface, never a broadcast; the Whisp's internal state is private unless the FIM chooses otherwise
- Search and discovery indexing mirrors membership scope: nothing becomes discoverable to an audience wider than the source content's own; a member's search history and saved searches are their own personal data — exportable, erasable, never surfaced to others
- No role-based bypass: no service exposes a member's private developmental data to Stewards, Guides, or any role by virtue of role alone — visibility flows from the member's own sharing acts
- No aggregate derived from private journeys is visible to other FIMs; anonymised aggregates only with explicit informed consent, responsible handling, and clear member benefit, under enterprise stewardship
- Real-world capture (DS-4) may implicate non-members — bystanders, private interiors, location traces. Until §5 Q7 closes, features must not treat captured content as rights-clear by default

#### Surfaces (Products · Studios · Design System)

- Every collection point names the lawful basis and links to the privacy policy
- Consent toggles are reachable from account settings, not buried
- Products render only what the viewer is authorised to see (display form, visibility scope, consent) — ask for exactly what's needed; never over-fetch and filter client-side
- Export and erasure request flows are product-tier UI deliverables, even though the data and pipelines live in Platform Core
- Transparently-shared groups capture explicit informed consent from every participant at join; openness is a norm, never a forfeiture — members retain control over what they contribute
- Studios: attribution is creator-controlled (public, pseudonymous, or anonymous); metadata, authorship chains, collaboration records, and previews never leak a real identity without opt-in
- Design system: components rendering FIM data resolve privacy state at the component level (the platform supplies the correct display form per viewer + viewed + settings); empty/redacted states are first-class visual states
- No surface requires PII from a Shadow; transcendence is the only moment identity is asked for (ADR-U027 — voluntariness is structural)

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New personal data field has a documented lawful basis (GDPR Art. 6)
- [ ] New personal data field has an export path honouring the Art. 15 / Art. 20 distinction
- [ ] New personal data field has an erasure path covering database state (AI-model-state erasure is an open question — never promised)
- [ ] New personal-data category is declared by its owning service for the Art. 30 record
- [ ] New table holding FIM data has RLS and least-privilege access paths
- [ ] New AI feature honours both the AI-training and the AI-personalisation opt-out
- [ ] New external processor (including any AI provider) is on the sub-processor list before personal data flows
- [ ] New collection point has a privacy notice
- [ ] New Shadow-touching feature preserves ephemerality (TTL after inactivity + explicit-erase path; no durable Shadow data outside the transcendence path)
- [ ] New home-content surface honours per-region, per-audience, revocable sharing (S43)
- [ ] New visibility of one member's data to another flows from the member's sharing state, never from the viewer's role alone
- [ ] New search/discovery indexing mirrors the membership scope of what it indexes

### Sources-status block

- **2026-06-12 (L1→L3 descent, Step 2 stress-test).** Absence nouns (`consent`, `gdpr`, `erasure`, `data_export`, `opt_out`) dual-verified zero across live migrations, archive, seeds, `lib/`, `app/`; `privacy` zero live, one archive comment hit. RLS coverage 19/19 on the live table baseline (PW-5 re-verified, both methods). Shadow/anonymous-auth substrate is lock-only (ADR-U004 mechanism, U027 lifecycle: zero realization; only the seeded Visitor baseline group exists). Products tier queries Supabase directly today (53 `createClient` occurrences in `app/`) — §6's platform-side-filtering obligation is forward law; reconciliation is downstream. One Step 1 retraction corrected at Step 2: §3 had asserted the Shadow TTL sweep as realized; it is lock-only, and the realized erasure-adjacent artifact is the `[Deleted User]` sentinel reassignment.

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
