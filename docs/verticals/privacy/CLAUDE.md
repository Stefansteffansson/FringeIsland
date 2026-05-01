# CLAUDE.md — V2: Privacy / GDPR

**Applies to:** anything under `docs/verticals/privacy/` — the Privacy/GDPR `SPECIFICATION.md`, its `features/` subdirectory (currently empty; V-prefix features are sparse by design), and any Privacy-specific checklist or tooling documentation.
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (verticals tier) → **this file** → [`SPECIFICATION.md`](./SPECIFICATION.md) (the section appropriate to the task).
**Reads as a delta.** Assumes root and verticals-tier `CLAUDE.md` are already loaded. Contains only what's specific to authoring the Privacy/GDPR vertical spec.

---

## What makes this entity different

Privacy is the only vertical whose obligations are shaped by an **external regulatory regime** rather than by internal architectural choices. GDPR is a body of law with named articles, defined terms of art, and case-law-shaped expectations about what specific phrases mean. The other four verticals levy obligations the platform itself defines (Administration's audit posture, Notifications' delivery semantics, Observability's instrumentation discipline, Transactions' Stripe Connect contract); Privacy levies obligations the platform inherits from a regulator. That asymmetry shows up in how the spec is authored: where other vertical specs are free to invent terminology that fits the platform, Privacy's spec must use GDPR's terms with GDPR's meanings — or must explicitly distinguish where platform language departs from the regime.

The second authoring asymmetry is **AI**. The Intelligence service (DS-7) creates a category of personal data — model-derived inferences, embeddings, training contributions — that doesn't fit GDPR's original-2018 mental model cleanly. The spec carries this as a per-service obligation rather than a generic one because the ambiguity is real and AI-shaped, not because it's incidentally about a particular service.

---

## Rules that only apply at this entity

- **Cite GDPR articles where the obligation tracks a named provision; don't paraphrase.** Lawful basis is GDPR Art. 6, records of processing is Art. 30, right of access is Art. 15, right to erasure is Art. 17. When the spec's obligation tracks one of these, the article is named explicitly. This is not legalism — it lets a future author check the platform's interpretation against the regime, lets external auditors trace obligations to their source, and prevents quiet drift from the regime's meaning. Paraphrased GDPR ("users can ask for their data") loses the load-bearing distinction between Art. 15 (access) and Art. 20 (portability) that the platform's export pipeline must respect.
- **Treat AI-derived data as user data; obligate the Intelligence service (DS-7) explicitly.** When an obligation involves consent, export, or erasure of personal data, the spec's §6 Domain Services subsection names DS-7 in addition to (not instead of) the generic per-service obligation. AI-derived data — embeddings, model-state contributions, inferences — is personal data under GDPR even when it doesn't look like a row in a user-owned table. The explicit DS-7 carve-out keeps this visible at the obligation level rather than buried in a future feature spec where it can quietly slip.

---

## Gotchas

- **Don't promise erasure semantics the platform can't deliver against AI model state.** Right-to-erasure under Art. 17 has well-defined obligations against rows in databases; it has unsettled obligations against state embedded in trained model weights or vector indexes. The spec's §5 carries this as an open question deliberately. When an obligation is being authored — in §6, §7, or in feature-spec Vertical Impact sections referencing this spec — the temptation is to write "the user's data is erased everywhere it appears." That sentence, written without qualification, commits the platform to a discipline it doesn't currently have a tooling answer for. Either qualify the scope (erasure within database state; AI-state erasure tracked as open question) or don't write the obligation at all until §5's open question is closed. Over-promising at the obligation level propagates over-promising into every downstream feature spec.

---

## Where to go next

- **Feature ID prefix at this entity:** `V` (Verticals — shared across all five). See [`../README.md`](../README.md). Currently no Privacy-owned V-prefix features authored — most Privacy obligations are satisfied via other owners' Vertical Impact sections rather than Privacy-owned features.
- **The spec:** [`SPECIFICATION.md`](./SPECIFICATION.md) — §L2 (purpose, scope, tooling, failure modes, open questions); §L3 §6 (obligations on Platform Core, Domain Services, Surfaces); §L3 §7 (cross-cutting checklists feeding DoD); §L4 (V-prefix feature inventory, currently sparse).
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — verticals-tier rules (locked-set discipline, tier-specificity, DoD feed, no blank slots, owned open questions, never-retired) apply here without restatement. The tier file's RLS-vs-affordance gotcha names Privacy as its concrete example of "applies-to-every-tier is not identical on every tier" — that example is generic-pattern illustration and is not restated here.
- **Relevant ADRs:** U002 (five cross-cutting verticals) · U010 (privacy as dedicated vertical).
