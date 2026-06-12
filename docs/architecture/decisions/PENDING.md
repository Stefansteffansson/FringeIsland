# Pending ADRs

ADR topics identified but not yet written. Promote using `../../templates/adr.md`.

---

## Whisp L2 ownership — split by face (DS-1 world-presence / DS-7 being)

**Identified:** 2026-06-10 (DS-1 descent session, Phase 1 Decision 1; ratified by Stefan).
**Resolves:** the long-flagged cascade gap (named in `how-we-work/assets/01-decomposition-cascade.svg`; deliberately absent from DS-1's box in `ECOSYSTEM_ANATOMY_V5.svg`).
**The decision:** the Whisp has no single L2 owner; ownership splits along the two faces the beings core itself names ("two framings, one entity"):

- **DS-1 World Model** owns the Whisp's **world-presence state**: position on the cord (Void distance), cord state (length/dial, stuck/dead outcomes, health/integrity channel), anchor chain, severance tier, respawn position.
- **DS-7 Intelligence** owns the Whisp **as a being**: dialogue, the empty-fills-by-growth mechanism, the senses/Big-5 model, the maturity/internalisation arc (the cord's *salience* channel is DS-7-derived, rendered through DS-1's cord), guard railing.
- **Dependency direction:** DS-7 consumes DS-1 (the intelligence acts in the world; the world never depends on the intelligence). The entity stays canonical in the beings core; neither service owns "the Whisp" outright.

**Why ADR-grade:** draws a Domain-Service boundary (ADR-U023 territory). An eighth Whisp service was considered and rejected: it would own almost no data of its own — a thin orchestrator over DS-1 + DS-7 state. Promote when the DS-7 descent runs (the second consumer of the boundary), using `../../templates/adr.md`.
**PROMOTED (appended 2026-06-11, DS-7 descent, ratified by Stefan):** this entry is **ADR-U029** (`ADR-U029-whisp-ownership-split-by-face.md`) — the first PENDING-to-ADR promotion of the descent series. The promotion executed the parked candidate verbatim in substance; the DS-7 derivation surfaced nothing contradicting the split, and the salience-channel shape resolved as a push through DS-1's contract (`world-model.md` §8 Q7 / `intelligence.md` §8 Q3). This entry is thereby fully resolved.

---

## DS-3 rename — "Experience Engine" -> journey-named (decide at the DS-3 descent)

**Identified:** 2026-06-10 (DS-1 descent session, anatomy/naming challenge; noted for the DS-3 descent at Stefan's direction — not executed now).
**The problem:** since ADR-U025, *experience* is identity-layer vocabulary ("one experience, one shared core"; products as surfaces of one experience; studios as a mode inside it). DS-3's name collides with the platform's biggest word while owning something much narrower: journeys, steps, progress, enrolments. Fails the vocabulary-vetting bar (newcomer intuition + collision check), and the collision grew as canon matured.
**The candidate:** rename to **Journey Engine** (or plain **Journeys**) — *journey* is the exact canon word for what DS-3 owns, and it makes the studio affinity legible (Journey Studio -> Journey Engine, as World Studio -> World Model).
**Decide alongside:** the "Engine" suffix asymmetry — only DS-2 Narrative Engine and DS-3 carry it; either both keep it or both drop it ("Narrative" / "Journeys").
**Ripple when executed:** domain README service line; `docs/templates/domain-service-spec.md` slug enum (`experience-engine`); domain `CLAUDE.md` enumerations; STATUS.md pipeline row; ECOSYSTEM_ANATOMY_V5 + DOMAIN_SERVICE_DEPENDENCIES SVGs; register-style label sweeps. Cheapest before DS specs multiply — weigh timing at DS-3 entry.
**Related watch-items (no action, recorded 2026-06-10):** DS-1 "World Model" collides mildly with AI-vocabulary "world model"; DS-6 "Discovery" collides with "the universe-discovery" log (decide at DS-6's charter re-derivation); DS-7 "Intelligence" kept deliberately — renaming it "Whisp" would break the cosmology-neutral naming lock platform entities honour.
**Engine-suffix outcome (appended 2026-06-10, DS-2 descent FIRST DECISION, ratified by Stefan):** the suffix **drops on both**. DS-2 landed as **Narrative** (`docs/platform/domain/narrative.md`, slug `narrative`); its rename ripple (template slug enum, domain README line, CLAUDE.md enumerations, STATUS.md row, world-model/infrastructure consumer labels, V5 + dependency SVG labels) executed in the DS-2 descent commits. The "Decide alongside" suffix half of this entry is thereby decided; DS-3's own rename to a journey-named, suffix-free form (candidate: **Journeys**) still executes at the DS-3 descent per this entry's ripple list.
**Rename EXECUTED (appended 2026-06-10, DS-3 descent FIRST DECISION, ratified by Stefan):** DS-3 is **Journeys** (`docs/platform/domain/journeys.md`, slug `journeys`) — the candidate this entry named, suffix-free per the DS-2 half-decision. The ripple executed in the DS-3 descent commits via the sweep-then-enumerate discipline (repo-wide label sweep as the enumeration source; this entry's ripple list as the completeness floor): template slug enum, domain README line, domain CLAUDE.md enumerations, sibling-spec consumer/slug labels, doc-health registry row path, V5 + dependency SVG labels, STATUS.md row, living-doc label sweeps (historical session records and the discovery log untouched — append-only). This entry is thereby fully resolved; the related watch-items below (DS-1 / DS-6 / DS-7 names) remain open as recorded.
**DS-6 watch-item RESOLVED-BY-KEEPING (appended 2026-06-11, DS-6 descent FIRST DECISION, ratified by Stefan):** DS-6 stays **Discovery** (`docs/platform/domain/discovery.md`, slug `discovery`) — the collision with "the universe-discovery" log dispositioned as tolerable (the log is a hyphen-qualified thinking-tree artifact; vocabulary vetting rejected every rename candidate: Search/Catalog/Marketplace each name one foot of the charter's three, Wayfinding collides with the Wayfinder role template and strains the cosmology-neutral naming lock, Navigation names the foot the charter re-derivation removed). Decided at the charter re-derivation this watch-item gated, per the DS-1 anatomy-challenge verdict — the charter shrank (people-finding stays branch-routed in DS-1; DS-6 is the published world's find-layer; see `discovery.md` §L3 Step 3). No ripple — no rename. The remaining watch-items (DS-1 / DS-7 names) stay open as recorded.

---

## Root-admin authority is role-based — `is_platform_admin()` must walk the permission set

**Identified:** 2026-06-12 (V4 Observability descent, Step 2 audit-log characterization; principle ratified by Stefan).
**The principle:** platform-admin capability flows from holding the role whose permission set grants administration (group + role + permissions, the `has_permission()` walk); membership in DeusEx alone confers nothing.
**The deviation:** `is_platform_admin()` (live since `20260223171200_fix_rc7_admin_user_ops.sql`; ~20 call sites, ~9 RLS policies including `admin_audit_log`) checks membership-in-DeusEx by group name and skips the role walk. The divergence is reachable today: the data model is complete (seeds wire a DeusEx role holding ALL permissions; `auto_assign_deusex_role_on_accept` couples membership to role), but role removal is possible while membership persists — a role-stripped DeusEx member loses admin per `has_permission()` yet keeps it at every proxy site.
**Why it exists:** RC7 replaced "broken" `has_permission()`-based Tier-1 RLS policies — the archived policies passed a profile id where the rebuilt function expects an acting group id (signature-drift family); the function itself likely works when called with the right key. Diagnose before fixing.
**Why ADR-grade:** clarifies ADR-U028 (DeusEx as the root-admin group) — group membership is the *container*, the role's permission set is the *authority*. Candidate U028 clarification or standalone ADR.
**When:** adjudicate at the V1 Administration derivation (next in G-03 order, which owns admin-access semantics) or before the first feature that builds on `is_platform_admin()` (practically: the Console work, ADR-U028 Ferd routing), whichever comes first. The code fix is mechanical — one SECURITY DEFINER function body rewritten to check a designated permission via the Tier-1 walk.

---

*(ADR-U027 and ADR-U028 were promoted on 2026-06-10, batch G-3.)*
