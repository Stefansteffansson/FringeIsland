# docs/old_products/ Restructuring Proposal

**Date:** 2026-04-06
**Status:** DRAFT — awaiting approval before execution
**Trigger:** ADR-U022 amendment (6-wave saga arc)

---

## 1. SUMMARY

**What changes:**
- `hamn/` content archived (old Wave 2 scope no longer matches Wave 3 Hamn)
- Four new wave folders created: `eid/`, `heim/`, `brim/`, `urd/`
- `hamn/` scaffold rebuilt for Wave 3 scope
- `docs/old_products/INDEX.md` rewritten for all six waves
- ~50 files updated to correct "Hamn (Wave 2)" → new wave numbering
- ~13 files updated to correct `docs/old_products/hamn/` path references

**What stays:**
- `ferd/` structure unchanged (no files move, no renames)
- All `_archive/` content untouched (historical record)
- ADR-U022 already correct (source of truth)

**What gets archived:**
- 6 substantive hamn/ files → `hamn/_archive/2026-04-06-wave2-content/`

---

## 2. FERD — Specific Changes Required

### 2a. No structural changes to ferd/

The ferd/ folder structure stays exactly as-is. No files move, rename, or get archived as part of this restructuring.

### 2b. Cross-reference updates within ferd/

These ferd/ files contain references that will break or become incorrect:

| File | Issue | Action |
|------|-------|--------|
| `ferd/specification/PRODUCT_SPEC.md` (line ~59, ~162) | "Wave 2 (Hamn)" | Update to "Wave 2 (Eid)" or "later waves" as appropriate |
| `ferd/specification/REQUIREMENTS.md` (line ~40) | "Postponed to Hamn (Wave 2)" | Update wave references |
| `ferd/planning/ROADMAP.md` (lines ~15-21, ~87, ~157, ~181, ~202, ~218) | Entire Wave 2/3/3+ model is stale — still shows Hamn as Wave 2, uses old 4-wave structure | **Major update needed** — rewrite wave table and Wave 2+ sections to reflect 6-wave arc |
| `ferd/planning/LIFECYCLE_DECISIONS.md` (lines ~70, ~218, ~241) | "Wave 2 (Hamn)" | Update wave references |
| `ferd/planning/DEFERRED.md` (~20 occurrences) | "Wave 2 (Hamn)" throughout | Bulk update — change "Wave 2 (Hamn)" to correct wave assignments |
| `ferd/development/DOC_HEALTH_CHECK.md` (lines ~41, ~184) | "Wave 2" label for hamn | Update wave label |
| `ferd/sessions/2026-01-SESSION-01-bridge.md` (lines ~30, ~141) | "Wave 2: Hamn" | Update (session file — consider whether historical record should be preserved as-is) |
| `ferd/sessions/2026-02-SESSION-03-*.md` (3 files) | "Wave 1 (Ferd) → Wave 2 (Hamn) → Wave 3 → Wave 3+" | Update wave sequence |

### 2c. Ferd ROADMAP.md vs new WAVE_OVERVIEW.md

**Situation:** The ferd ROADMAP.md contains a wave overview table (lines 15-21) that uses the old 4-wave model. A new `WAVE_OVERVIEW.md` could live at the docs/old_products/ level as a cross-product wave reference.

**Proposal:**
- **Keep** `ferd/planning/ROADMAP.md` as Ferd-specific — it tracks Ferd milestones 1.1–1.6 and post-launch priorities. This is product-scoped.
- **Update** the wave overview table within ROADMAP.md to reference the 6-wave arc (brief table with links, not duplicating ADR-U022 content).
- **Do NOT create** a separate WAVE_OVERVIEW.md at docs/old_products/ level — ADR-U022 is the canonical wave reference, and the products/INDEX.md table will serve as the product-level wave overview. Adding another file would create drift risk.

---

## 3. OLD HAMN CONTENT — Proposed Disposition

### Assessment

All substantive hamn/ files were written for the OLD Wave 2 scope (journey creation, marketplace, native apps, AI). The NEW Wave 3 Hamn scope (design system, accessibility, UX/UI redesign) is fundamentally different. None of the content files can be adapted in place.

### Proposed disposition of each file

| File | Assessment | Action |
|------|-----------|--------|
| `specification/PRODUCT_SPEC.md` | Entirely old-scope (Journey Designer, Whisp, Marketplace, native apps). 0% overlap with new Wave 3 scope. | **Archive** |
| `specification/REQUIREMENTS.md` | 82 requirements for old scope. Only 1 accessibility req (NFR-HA-001). 0 design system reqs. | **Archive** |
| `planning/DEFERRED.md` | Items deferred FROM old Hamn TO "Wave 3" — now contradictory (items would be deferred to themselves). | **Archive** |
| `planning/RESEARCH.md` | 8 research questions all about AI, NPCs, journey authoring. None relevant to design/accessibility. | **Archive** |
| `VISION_TO_SPEC_MAPPING.md` | Historical analysis. Contains the ONLY substantive design system mention (Section E) and accessibility analysis (B14, B16). Partial salvage value. | **Archive** (with note: reference for new Wave 3 planning) |
| `INDEX.md` | Navigation stub with "Wave 2" label. | **Archive old version, create new** |
| `planning/INDEX.md` | Wave-agnostic structure. | **Retain and update** |
| `specification/INDEX.md` | Wave-agnostic structure. | **Retain and update** |

### Archive location

**Proposed:** `docs/old_products/hamn/_archive/2026-04-06-wave2-content/`

This keeps the old content within the hamn product folder for traceability, rather than a top-level `docs/old_products/_archive/`. Rationale: the content was written *for* Hamn — it's Hamn's history, even though the wave number changed.

Archive structure:
```
hamn/_archive/2026-04-06-wave2-content/
├── README.md                    # Explains why these were archived
├── PRODUCT_SPEC.md              # Old Wave 2 product spec
├── REQUIREMENTS.md              # Old Wave 2 requirements (82)
├── DEFERRED.md                  # Old Wave 2 deferrals
├── RESEARCH.md                  # Old Wave 2 research questions
├── VISION_TO_SPEC_MAPPING.md    # Vision analysis (partial salvage value)
└── INDEX.md                     # Old Wave 2 navigation index
```

The README.md would contain:
```
# Archived: Hamn Wave 2 Content

**Archived:** 2026-04-06
**Reason:** ADR-U022 amendment reassigned Hamn from Wave 2 to Wave 3.
The new Wave 3 scope (design system, accessibility, UX/UI redesign)
differs fundamentally from the old Wave 2 scope (journey creation,
marketplace, native apps). These files preserve the old specification
work for reference.

**Note:** VISION_TO_SPEC_MAPPING.md contains the only substantive
design system and accessibility analysis — useful input for new
Wave 3 planning.
```

---

## 4. NEW FOLDERS — List of Folders and Scaffold Files

### 4a. New wave folders to create

Each new wave folder follows the standard template. All content files are `.gitkeep` placeholders except INDEX.md.

**eid/ (Wave 2 — Passage, crossing)**
```
docs/old_products/eid/
├── INDEX.md
├── architecture/
│   └── decisions/
│       └── .gitkeep
├── development/
│   ├── agents/
│   │   ├── contexts/
│   │   │   └── .gitkeep
│   │   └── learnings/
│   │       └── .gitkeep
│   ├── features/
│   │   └── .gitkeep
│   └── specs/
│       └── .gitkeep
├── planning/
│   └── .gitkeep
├── sessions/
│   └── .gitkeep
└── specification/
    └── .gitkeep
```

**heim/ (Wave 4 — Home)** — same structure as eid/

**brim/ (Wave 5 — Edge, horizon)** — same structure as eid/

**urd/ (Wave 6/Beyond — Fate, origin)** — same structure as eid/

### 4b. hamn/ rebuild

After archiving old content, hamn/ retains its existing folder structure (which already matches the template) but gets:
- New `INDEX.md` (Wave 3 label, new scope description)
- Retained `planning/INDEX.md` and `specification/INDEX.md` (updated labels)
- Empty scaffold in all other folders (already has .gitkeep files)

### 4c. INDEX.md content for each new wave

Each wave INDEX.md follows this template:
```markdown
# [Name] (Wave [N]) — Product Documentation

**Wave:** [N] — [Name] ([Meaning])
**Status:** Not started — scaffold only
**Scope:** [Brief scope description — TBD for most waves]

---

## Folders

| Folder | Purpose |
|--------|---------|
| `architecture/decisions/` | [Name]-specific ADRs |
| `development/` | Agents, features, specs, workflow |
| `planning/` | Roadmap, deferrals, research |
| `sessions/` | Design and planning sessions |
| `specification/` | Product spec, requirements |

---

## Related

- [Products Index](../INDEX.md)
- [ADR-U022 — Named Waves](../../old_universe/decisions/ADR-U022-named-waves.md)
- [Products & Platform Strategy](../../old_universe/strategy/PRODUCTS_AND_PLATFORM.md)
```

### 4d. Total new files/folders to create

| Type | Count |
|------|-------|
| New directories | 40 (4 waves × 10 dirs each) |
| New INDEX.md files | 4 (one per new wave) |
| New .gitkeep files | 28 (4 waves × 7 each) |
| Archive README.md | 1 |
| Rebuilt hamn/INDEX.md | 1 |
| **Total new files** | **34** |

---

## 5. CROSS-REFERENCE AUDIT

### 5a. Files with `docs/old_products/hamn/` path references (13 files)

These files contain links or path references to `docs/old_products/hamn/` that must be verified after restructuring. Since hamn/ is being rebuilt in place (not moved), most paths remain valid — but the content they point to will change.

| File | Reference | Status After Restructuring |
|------|-----------|---------------------------|
| `docs/old_INDEX.md:17` | `products/hamn/INDEX.md` — "See Hamn (Wave 2) docs" | Path valid, label needs update → "Wave 3" |
| `docs/old_INDEX.md:65` | `products/hamn/` — "awaiting specification" | Label needs update |
| `docs/old_implementation/INDEX.md:13` | "hamn/ (future) — created when Wave 2 development begins" | Update → "Wave 3" |
| `docs/old_products/INDEX.md:12` | Hamn row — "Wave 2, Not started" | **Rewrite entire file** (see Section 6) |
| `docs/old_universe/processes/PLANNING_PROTOCOL.md:70,81` | `products/hamn/planning/RESEARCH.md` | Path valid (file will be empty/new after archive) |
| `docs/old_universe/processes/INDEX.md:20` | `products/hamn/planning/` | Path valid |
| `docs/old_universe/processes/DEFERRAL_PROTOCOL.md:83,104` | `products/hamn/planning/DEFERRED.md` | Path valid (file will be empty/new after archive) |
| `docs/old_products/ferd/development/DOC_HEALTH_CHECK.md:41,184` | `docs/old_products/hamn/**/*.md` — "Wave 2" label | Label needs update |
| `docs/old_products/ferd/sessions/2026-04-05-documentation-restructuring-execution.md:40` | `docs/old_products/hamn/` — "awaiting specification content" | Historical session — leave as-is |
| `docs/old_products/ferd/sessions/2026-04-05-requirements-review-doc-health.md:65-66` | hamn spec/deferred paths | Historical session — leave as-is |
| `docs/old_products/ferd/development/_archive/...` (4 files) | Various hamn references | **Archive — do not update** |

### 5b. Files with stale "Hamn (Wave 2)" or old wave numbering (~50 files)

**Tier 1 — Root files (HIGH PRIORITY — read every session)**

| File | Occurrences | Action |
|------|-------------|--------|
| `CLAUDE.md` | 2 (lines ~45, ~129) | Update wave model line and Hamn doc reference |
| `README.md` | 1 (line ~130) | Update Hamn wave label |
| `PROJECT_STATUS.md` | 2 (lines ~75, ~168) | Update wave references |
| `SPRINT.md` | 1 (line ~84) | Update "Wave 2 (Hamn)" |
| `CHANGELOG.md` | 3 (lines ~26, ~27, ~1046) | Update wave references |

**Tier 2 — Universe docs (shared foundations)**

| File | Occurrences | Action |
|------|-------------|--------|
| `docs/old_universe/vision/VISION.md` (line ~325) | "Wave 2 — Hamn" | Update to 6-wave structure |
| `docs/old_universe/vision/VISION_DECISIONS.md` (lines ~80, ~165) | "Wave 2 (Hamn)" | Update |
| `docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md` (lines ~155, ~168, ~179) | Wave 2/3/3+ sections | **Major update** — rewrite wave sections for 6-wave arc |
| `docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md` (lines ~429-431, ~512) | "Wave 2 — Hamn" | Update to 6-wave references |
| `docs/old_universe/architecture/DOMAIN_ENTITIES.md` (line ~239) | "Wave 2/Hamn" | Update |
| `docs/old_INDEX.md` (lines ~17, ~61, ~65) | "Hamn (Wave 2)" | Update |
| `docs/old_implementation/INDEX.md` (line ~13) | "Wave 2" | Update |

**Tier 3 — Ferd product docs** (see Section 2b above for full list)

| File | Occurrences | Action |
|------|-------------|--------|
| `ferd/specification/PRODUCT_SPEC.md` | 2 | Update |
| `ferd/specification/REQUIREMENTS.md` | 1 | Update |
| `ferd/planning/ROADMAP.md` | ~8 | **Major update** — rewrite wave overview |
| `ferd/planning/LIFECYCLE_DECISIONS.md` | 3 | Update |
| `ferd/planning/DEFERRED.md` | ~20 | Bulk update |
| `ferd/development/DOC_HEALTH_CHECK.md` | 2 | Update |
| `ferd/sessions/` (5 active session files) | ~10 total | See decision below |

**Tier 4 — Implementation docs**

| File | Occurrences | Action |
|------|-------------|--------|
| `docs/old_implementation/ferd/baseline/BASELINE.md` | ~10 (lines ~219-592) | Update wave references |

**Tier 5 — Archive files (DO NOT UPDATE)**

| File | Occurrences | Notes |
|------|-------------|-------|
| `ferd/planning/_archive/2026-03-20-DEFERRED_DECISIONS_snapshot.md` | ~15 | Historical snapshot — leave as-is |
| `ferd/sessions/_archive/` (2 files) | ~4 | Historical — leave as-is |
| `ferd/development/_archive/` (4 files) | ~8 | Historical — leave as-is |

### 5c. Session files — preservation decision needed

**Question for human judgement:** Session files (e.g., `2026-01-SESSION-01-bridge.md`, `2026-02-SESSION-03-*.md`) are historical records of design conversations. Updating "Wave 2 (Hamn)" in these files changes the historical record. Options:

1. **Update them** — keeps all docs consistent, but rewrites history
2. **Leave as-is** — preserves historical accuracy, but creates inconsistency
3. **Add a note at top** — e.g., "Note: This session predates ADR-U022 amendment. Wave references use the original numbering."

**Recommendation:** Option 3 — add a note, leave content as-is. Session files are historical artifacts.

### 5d. Old "Wave 3" references that now conflict

These files use "Wave 3" to mean the OLD unnamed expansion wave. Under the new scheme, Wave 3 = Hamn. These need updating to the correct new wave assignment (likely Wave 4/Heim or later):

| File | Current Reference | Issue |
|------|-------------------|-------|
| `docs/old_universe/vision/VISION.md` (~334, ~341) | "Wave 3 — The World Expands", "Wave 3+" | Now conflicts with Hamn = Wave 3 |
| `docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md` (~168, ~179) | "Wave 3", "Wave 3+" | Same conflict |
| `docs/old_products/ferd/planning/ROADMAP.md` (~157, ~181) | "Wave 3: The World Expands", "Wave 3+" | Same conflict |
| `docs/old_products/hamn/planning/DEFERRED.md` (~31-174) | Items deferred to "Wave 3" | These items need reassignment |
| `docs/old_products/ferd/planning/DEFERRED.md` (~168-803) | Items deferred to "Wave 3" | These items need reassignment |
| `docs/old_products/hamn/specification/REQUIREMENTS.md` (~233, ~568, ~1002) | "deferred to Wave 3" | Being archived — no action needed |
| `docs/old_implementation/ferd/baseline/BASELINE.md` (~270, ~595) | "Wave 3" | Needs reassignment |
| `docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md` (~432) | "Game — Wave 3+" | Needs reassignment |

**⚠️ REQUIRES HUMAN DECISION:** The old "Wave 3" and "Wave 3+" content (The World Expands, The Game) needs to be mapped to specific new waves (Heim? Brim? Urd?). This is a **scope decision**, not a mechanical rename. The restructuring can proceed without this — but these references will remain stale until the work package redistribution is completed.

---

## 6. INDEX.md UPDATE — Proposed New Content

```markdown
# Products

**Purpose:** Product-specific documentation. Each wave has its own
specification, architecture, planning, sessions, and development docs.

See [ADR-U022](../old_universe/decisions/ADR-U022-named-waves.md) for the
naming rationale and saga arc narrative.

---

## Waves

| Product | Wave | Name Meaning | Status | Description |
|---------|------|-------------|--------|-------------|
| [Ferd](./ferd/) | Wave 1 | Journey, departure | 95% complete | Web platform — groups, journeys, RBAC, admin |
| [Eid](./eid/) | Wave 2 | Passage, crossing | Not started | Scope TBD — work package redistribution pending |
| [Hamn](./hamn/) | Wave 3 | Harbour | Not started | Design system, accessibility, UX/UI redesign |
| [Heim](./heim/) | Wave 4 | Home | Not started | Scope TBD |
| [Brim](./brim/) | Wave 5 | Edge, horizon | Not started | Scope TBD |
| [Urd](./urd/) | Beyond | Fate, origin | Not started | Scope TBD |

*Wave scopes beyond Ferd are placeholders pending work package redistribution
(see ADR-U022 amendment history).*

---

## The Arc

> You set out (Ferd) → You navigate the passage (Eid) → You find harbour (Hamn)
> → You arrive home (Heim) → You stand at the edge (Brim) → You touch something
> older than the journey itself (Urd)

---

## Related

- [ADR-U022 — Named Waves](../old_universe/decisions/ADR-U022-named-waves.md)
- [Universe Tier](../old_universe/) — Shared foundations
- [Implementation Tier](../old_implementation/) — Live code state
- [Root Index](../INDEX.md)
```

---

## 7. RISKS

### 7a. Scope assignment ambiguity (HIGH)

ADR-U022 says "Work package redistribution across new wave boundaries to follow separately." This has NOT been done yet. The old Wave 2 content (journey creation, marketplace, AI, native apps) needs to be assigned to specific new waves (Eid? Hamn? Heim?). Until this happens:
- New wave folder scopes (except Ferd) are placeholders
- Old "deferred to Wave 2/3" references can't be mechanically updated — they need human judgement on where each item now belongs
- **Mitigation:** Proceed with structural changes now. Mark scope assignments as TBD. Handle work package redistribution as a separate follow-up task.

### 7b. Ferd DEFERRED.md bulk update (~20 occurrences) (MEDIUM)

This file contains ~20 references to "Wave 2 (Hamn)" as deferral targets. Each deferral needs human review to determine the correct new wave assignment. A mechanical find-replace would be wrong — some items may go to Eid, others to Hamn, others further.
- **Mitigation:** For now, update the label format only (e.g., "Hamn" without wave number) and flag for redistribution review.

### 7c. Session file historical integrity (LOW)

Updating wave references in session files rewrites history. These are records of actual conversations.
- **Mitigation:** Add a header note to affected sessions instead of modifying content (see Section 5c).

### 7d. Dead link in archive (INFORMATIONAL)

`docs/old_products/ferd/development/_archive/.../DATABASE_CURRENT-shared.md` line 341 references `/docs/old_implementation/hamn/baseline/INDEX.md` which doesn't exist. Pre-existing issue, not caused by this restructuring. No action needed.

### 7e. No content loss risk (CONFIRMATION)

All old hamn/ content is being archived within `hamn/_archive/`, not deleted. Git history also preserves all file states. No content loss is possible.

---

## 8. EXECUTION SEQUENCE

### Phase A — Preparation (safe, no breaking changes)

| Step | Action | Risk |
|------|--------|------|
| A1 | Create `hamn/_archive/2026-04-06-wave2-content/` directory | None |
| A2 | Create archive `README.md` | None |
| A3 | Create 4 new wave folders with scaffold (`eid/`, `heim/`, `brim/`, `urd/`) | None |
| A4 | Create INDEX.md for each new wave folder | None |

### Phase B — Archive old hamn/ content

| Step | Action | Risk |
|------|--------|------|
| B1 | Move 6 old hamn/ content files to archive folder | Low — old paths become empty |
| B2 | Rebuild `hamn/INDEX.md` with Wave 3 label | None |
| B3 | Update `hamn/planning/INDEX.md` and `hamn/specification/INDEX.md` labels | None |

### Phase C — Update docs/old_products/INDEX.md

| Step | Action | Risk |
|------|--------|------|
| C1 | Replace `docs/old_products/INDEX.md` with new 6-wave content | None |

### Phase D — Cross-reference updates (Tier 1 — root files)

| Step | Action | Risk |
|------|--------|------|
| D1 | Update `CLAUDE.md` wave references | Low |
| D2 | Update `README.md` wave references | Low |
| D3 | Update `PROJECT_STATUS.md` wave references | Low |
| D4 | Update `SPRINT.md` wave references | Low |
| D5 | Update `CHANGELOG.md` wave references | Low |

### Phase E — Cross-reference updates (Tier 2 — universe docs)

| Step | Action | Risk |
|------|--------|------|
| E1 | Update `docs/old_INDEX.md` | Low |
| E2 | Update `docs/old_implementation/INDEX.md` | Low |
| E3 | Update `docs/old_universe/vision/VISION.md` wave sections | Medium — scope decision needed |
| E4 | Update `docs/old_universe/vision/VISION_DECISIONS.md` | Low |
| E5 | Update `docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md` | Medium — scope decision needed |
| E6 | Update `docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md` | Medium — scope decision needed |
| E7 | Update `docs/old_universe/architecture/DOMAIN_ENTITIES.md` | Low |
| E8 | Update `docs/old_universe/processes/` (3 files) | Low |

### Phase F — Cross-reference updates (Tier 3 — ferd docs)

| Step | Action | Risk |
|------|--------|------|
| F1 | Update `ferd/planning/ROADMAP.md` (major — rewrite wave sections) | Medium |
| F2 | Update `ferd/planning/DEFERRED.md` (~20 occurrences) | Medium — needs human review per item |
| F3 | Update `ferd/planning/LIFECYCLE_DECISIONS.md` | Low |
| F4 | Update `ferd/specification/PRODUCT_SPEC.md` | Low |
| F5 | Update `ferd/specification/REQUIREMENTS.md` | Low |
| F6 | Update `ferd/development/DOC_HEALTH_CHECK.md` | Low |
| F7 | Add header notes to 5 active session files | Low |

### Phase G — Cross-reference updates (Tier 4 — implementation docs)

| Step | Action | Risk |
|------|--------|------|
| G1 | Update `docs/old_implementation/ferd/baseline/BASELINE.md` | Medium — scope decision needed |

### Phase H — Verification

| Step | Action | Risk |
|------|--------|------|
| H1 | Run grep for remaining "Wave 2.*Hamn" or "Hamn.*Wave 2" outside _archive/ | None |
| H2 | Verify all new folder structures exist with correct .gitkeep files | None |
| H3 | Verify no dead links introduced by checking all markdown link targets | None |
| H4 | Git commit | None |

---

## Estimated Scope

| Category | Count |
|----------|-------|
| New directories | ~40 |
| New files (INDEX.md, .gitkeep, README.md) | ~34 |
| Files moved to archive | 6 |
| Files with content updates (non-archive) | ~35-40 |
| Files intentionally NOT updated (archive/sessions) | ~25 |
| **Human decisions required** | **2** (session file policy, work package redistribution) |

---

*This proposal is ready for review. No files have been modified.*
