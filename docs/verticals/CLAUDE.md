# CLAUDE.md — Verticals tier

**Applies to:** anything under `docs/verticals/` — the five vertical directories (each containing a `SPECIFICATION.md` and a `features/` subdirectory) and any related checklist or tooling documentation.
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → the specific vertical's `SPECIFICATION.md` (e.g. `privacy/SPECIFICATION.md`).
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to verticals-tier work.

---

## What makes this tier different

Verticals are **obligations on every tier, not services** (ADR-U002). There are five of them, locked: V1 Administration · V2 Privacy/GDPR · V3 Notifications · V4 Observability · V5 Transactions. They don't own code, don't have APIs, don't have features in the same sense products and services do. What they own is a **promise** — a cross-cutting concern that every platform, domain service, product, and studio must fulfil regardless of what else they're doing.

Working at this tier means writing or maintaining the five canonical spec files that define what each vertical obligates. These specs are read by every feature-spec author (to complete the Vertical Impact section) and by the `doc-health-check` skill (to verify DoD compliance). A vertical spec that's vague, aspirational, or inconsistent with reality makes every downstream feature spec weaker. Precision at this tier is load-bearing.

The five vertical directories already exist (`administration/`, `privacy/`, `notifications/`, `observability/`, `transactions/`), each containing a `SPECIFICATION.md` authored from `../templates/vertical-spec.md`. Work at this tier is almost always refinement — tightening scope, populating failure modes, adding concrete checklists — rather than greenfield authoring.

---

## What each vertical spec must specify

Every vertical's `SPECIFICATION.md` is partitioned across three decomposition levels — L2, L3, and L4 — each owning a different range of sections. The partition is enforced by `../templates/vertical-spec.md` and verified by the `doc-health-check` skill; no level modifies a section owned by another. The authorship split is documented in detail in `.claude/skills/ecosystem-decomposition/SKILL.md`.

What each level owns, and the discipline that makes a vertical spec useful rather than decorative:

### L2 — Purpose, scope, and constitutional shape

Derived from Vision and the ecosystem anatomy. Revised when the vertical's scope, tooling, or failure profile materially changes.

- **Purpose (§1)** — Why this vertical exists and what goes wrong if it isn't satisfied. Not platitudes ("privacy matters"); concrete failure consequences ("mishandled money is the fastest way to destroy trust"). One paragraph, high signal.
- **Scope (§2)** — What the vertical covers, specifically enough to be enforceable. "Privacy" alone is too vague to act on; "lawful basis, consent capture, export, erasure, AI opt-out, records of processing" is a scope that a feature spec can check itself against.
- **Tooling and infrastructure (§3)** — What shared infrastructure exists so this vertical is cheap to satisfy. If every feature has to reimplement the obligation, the tooling is missing — flag it.
- **Failure modes (§4)** — What breaks when the vertical is violated, how it's detected, how it's recovered. This is structural — describes the vertical itself — and is what distinguishes an enforceable vertical from an aspirational one.
- **Open questions (§5)** — Decisions still owed. Each is a candidate ADR or spike. Open questions are honest; unacknowledged gaps are drift.

### L3 — Obligation inventory

Derived fresh from L1 (Vision) and L2 (the L2 sections above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — reconciliation against existing artifacts is a separate activity, downstream of derivation (see the `ecosystem-decomposition` skill).

- **Obligations on each tier (§6)** — Separate subsections for **Platform Core**, **Domain Services**, and **Surfaces** (Products + Studios + Design System). Each subsection names concrete asks ("Identity service stores consent state per user, per category"). If the ask varies by service or product, list per-service/per-product. Vague obligations here propagate vagueness into every feature spec.
- **Cross-cutting checklists (§7)** — Short, machine-checkable checklist a developer can run against any new feature. These feed directly into Definition of Done (PROCESS.md §5). A good checklist item is verifiable without interpretation.
- **Sources-status block** — Records remarks produced by the `ecosystem-decomposition` skill's prerequisite-check pause mechanic, with cross-references to the gap register. Empty by default.

### L4 — Feature inventory summary (vertical-owned features)

Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. **Often sparse by design**: most obligations are satisfied by other owners' features via their own L3 Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted (feature-inventory maintenance discipline; `doc-health-check` Section 8).

- **Summary of vertical-owned features** — Table mapping obligations to V-prefix feature specs, with maturity column. If the vertical owns no V-prefix features (the common case for now), this section is a single fallback line stating that all obligations are satisfied by other owners' features.
- **Obligations without shared infrastructure** — Obligations from §L3 that cannot currently be satisfied by shared tooling. A smell signal: each obligation listed here is a candidate for a future V-prefix feature.

---

## Rules that only apply at this tier

- **The five verticals are locked — don't add a sixth.** ADR-U002 locks the set at five and explains why. A sixth vertical requires an ADR that either splits an existing one or absorbs something currently handled elsewhere — never "we needed a new concern." The five cover every cross-cutting obligation at the current architectural decomposition.
- **Obligations must be tier-specific, not generic.** "Every service must log" is weak. "Each service emits one log entry per API call at the appropriate level, increments a metric for count + duration, and writes an audit-log entry for every security-relevant action" is enforceable. Rewrite any bullet that sounds like a slogan until it sounds like a checklist.
- **Checklists feed DoD.** Every item in §7 of a vertical spec (Cross-cutting checklists, under L3) is a candidate DoD check. When a vertical spec adds a checklist item, the corresponding DoD section in PROCESS.md §5 should reflect it — don't let the two drift.
- **Every feature spec addresses every vertical — no blank slots.** This is enforced in AGENTS.md as an always-do. The vertical specs are what those feature-spec sections check themselves against. A vertical spec that's too vague to check against is a vertical that gets skipped in Vertical Impact sections; the vagueness becomes invisible.
- **Open questions are owned.** §5 of every spec (Open questions, under L2) is a list of candidate ADRs and spikes. When a vertical spec carries an open question for more than one wave boundary without progress, surface it — unresolved questions at the verticals tier mean every downstream feature is making an implicit assumption about something that should be an explicit decision.
- **Vertical specs are not retired; they evolve.** Unlike feature specs that reach 6-done and stop changing, vertical specs stay live. Legal landscape shifts, new privacy regulations land, new observability tools appear. Versioning via amendment (like ADR-U002's 2026-04-12 amendment) is the pattern, not deletion and re-authoring.

---

## Gotchas (tier-specific)

- **Over-prescription kills verticals.** A privacy spec that tries to enumerate every field in every table will be wrong within a month. Specify the *rule* ("every new personal data field has a documented lawful basis") not the *inventory*. Let the feature specs and code be the current inventory; the vertical spec is the invariant.
- **"Applies to every tier" is not the same as "is identical on every tier."** Each tier has its own obligations. Privacy on Platform Core is about RLS and consent storage; Privacy on Surfaces is about affordance design. The spec's §6 must show the difference, not paper over it with shared language.
- **Vertical specs and the Five Verticals section in each tier's `CLAUDE.md` must agree.** Each tier-level `CLAUDE.md` has a "Verticals: obligations on this tier" section. Those sections derive their content from these specs. If a vertical spec changes its §6 obligations (Obligations on each tier, under L3), the four sibling tier-level CLAUDE.md files may need matching updates. The `doc-health-check` skill's Section 1 (terminology drift) does not currently catch this — verify manually when editing.
- **Retired phase-model language is drift.** The original scaffolds (pre 2026-04-17) carried "Phase 3 scaffold / Phase 4 fill-in" footers. That framing is drift per the `doc-health-check` skill's Section 1.5 (Phase 1/2/3/4 model is superseded by the wave model). As of 2026-04-17 the five spec footers read "Scaffold — refine in place …". If old phase-model language reappears, rewrite the footer to reference the current wave or use the scaffold-living-document framing.
- **"old_*" tree references are drift.** Those trees no longer exist (deleted 2026-04-12 and 2026-04-15). The spec scaffolds originally pointed at `../old_implementation/` for some content; those references were cut in the 2026-04-17 fix. When adding new content, cite the live codebase or current docs — never the deleted trees.

---

## Where to go next

- **Feature ID prefix at this tier:** `V` (Verticals). See `docs/verticals/README.md`.
- **The five spec files:** [`administration/SPECIFICATION.md`](./administration/SPECIFICATION.md) · [`privacy/SPECIFICATION.md`](./privacy/SPECIFICATION.md) · [`notifications/SPECIFICATION.md`](./notifications/SPECIFICATION.md) · [`observability/SPECIFICATION.md`](./observability/SPECIFICATION.md) · [`transactions/SPECIFICATION.md`](./transactions/SPECIFICATION.md).
- **Template:** [`../templates/vertical-spec.md`](../templates/vertical-spec.md) — the canonical shape every spec follows.
- **Relevant ADRs:** U002 (five cross-cutting verticals) · U010 (privacy as dedicated vertical) · U011 (transactions via Stripe Connect) · U012 (observability as dedicated vertical) · U013 (i18n/a11y constraints) · U022 (named waves) · U024 (wave model semantics).
- **Relevant skills:** [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when refining a vertical spec; [`doc-health-check`](../../.claude/skills/doc-health-check/SKILL.md) to verify vertical checklists are kept in sync with DoD.
- **Sibling tier CLAUDE.md files:** [`../products/CLAUDE.md`](../products/CLAUDE.md) · [`../platform/CLAUDE.md`](../platform/CLAUDE.md) · [`../studios/CLAUDE.md`](../studios/CLAUDE.md) · [`../design-system/CLAUDE.md`](../design-system/CLAUDE.md) — each has a "Verticals: obligations on this tier" section that derives from these five specs.
