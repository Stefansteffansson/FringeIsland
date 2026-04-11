# Session Bridge — 2026-04-11

**Session:** Ecosystem Decomposition — Documentation Cleanup + Level 4 Preparation
**Participants:** Stefan + Claude
**Status:** Session complete — ready for next session

---

## What was accomplished this session

### 1. Ferd Capability Map finalised

The codebase-verified final map (`docs/planning/waves/FERD-CAPABILITY-MAP.md`)
was confirmed as authoritative. 110 capabilities, 33 done, 24 partial, 47 not
started. 10 launch blockers identified, 2 critical (self-service exit, PII
scrubbing). Draft map superseded.

### 2. Feature spec template locked

`docs/templates/feature-spec.md` updated with:
- `owner` + `consumers` replaces `product` / `service` / `studio`
- `consumers` = products and studios only (inter-service deps in body)
- `## Implementation notes` section for maturity 6-done specs
- `## Solution sketch`, `## Appetite`, `## Rabbit holes` omitted for 6-done specs

### 3. Feature ID prefix table locked

| Prefix | Owner |
|--------|-------|
| PC | Platform Core |
| PD | Platform Domain |
| H | Hub |
| G | Gimbal |
| GM | The Game |
| JS | Journey Studio |
| US | Universe Studio |
| AS | Arc Studio |
| DS | Design System |
| V | Verticals |

### 4. Studios renamed Designer → Studio

Journey Designer, Universe Designer, Arc Designer →
**Journey Studio**, **Universe Studio**, **Arc Studio**

Rationale: "Studio" captures full Dreamineer lifecycle (design, deploy,
manage, retire) — not just authoring.

Folders renamed: `journey-designer/` → `journey-studio/` etc.
16 files updated, 3 folders renamed across docs/, templates/, skills/.

### 5. Skills updated

- `ecosystem-decomposition` — YAML schema (owner/consumers), body order
  (forward vs retroactive modes), studio names, prefix table, GM added
- `feature-development` — Ask first boundary scoped to forward specs only
- `wave-planning` — already clean, no changes needed

### 6. All staged files moved to final locations

| File | Final location |
|------|---------------|
| VISION.md | docs/ecosystem/VISION.md |
| HUB-DESCRIPTION.md | docs/products/hub/DESCRIPTION.md |
| FERD-CAPABILITY-MAP-FINAL.md | docs/planning/waves/FERD-CAPABILITY-MAP.md |
| GROUP-MODEL-CURRENT-STATE-CC.md | docs/planning/reference/GROUP-MODEL-CURRENT-STATE.md |
| PLATFORM-EXIT-GAP-ANALYSIS-CC.md | docs/planning/reference/PLATFORM-EXIT-GAP-ANALYSIS.md |
| ADMIN-DEUSEX-GAP-ANALYSIS-CC.md | docs/planning/reference/ADMIN-DEUSEX-GAP-ANALYSIS.md |
| SESSION-BRIDGE-2026-04-10.md | docs/planning/sessions/SESSION-BRIDGE-2026-04-10.md |
| ECOSYSTEM_ANATOMY_V3.svg | docs/planning/reference/ECOSYSTEM_ANATOMY_V3.svg |
| DOMAIN_SERVICE_DEPENDENCIES.svg | docs/planning/reference/DOMAIN_SERVICE_DEPENDENCIES.svg |

### 7. Repository cleanup

Deleted: `SPRINT.md`, `PROJECT_STATUS.md`, `docs/planning/ROADMAP.md`,
`folders_and_files.md`, `docs/TMP/repo-tree.md`, `dev_databases/`

Moved: `cleanup-test-users.js` → `scripts/`

### 8. README audit (38 files)

All READMEs in new tree (excluding old_*) reviewed and updated for:
- Correct studio names and folder paths
- New prefix table including GM
- owner/consumers YAML convention
- Wave/cycle terminology (not sprints/phases)
- Accurate file references

### 9. Template updates (6 files)

`task.md`, `studio-description.md`, `product-description.md`,
`wave-spec.md`, `domain-service-spec.md`, `vertical-spec.md` — all updated
with new terminology, prefix table, and YAML conventions.

---

## Decisions locked this session

1. **Feature spec ownership model:** one owner (unambiguous), explicit consumers
   (products/studios only — inter-service deps in body)
2. **Retroactive specs (6-done):** Implementation notes replaces Solution sketch;
   Appetite and Rabbit holes omitted
3. **Feature ID prefixes:** PC, PD, H, G, GM, JS, US, AS, DS, V (locked)
4. **Studio names:** Journey Studio, Universe Studio, Arc Studio (locked)
5. **Studio philosophy:** full lifecycle, not authoring-only
6. **consumers field:** products and studios only, not platform services
7. **Vertical numbering:** V1=Administration, V2=Privacy/GDPR (preserved)

---

## Outstanding items — carry to next sessions

### Immediate next session: old_universe review and decommission

Use `OLD-UNIVERSE-REVIEW-PROMPT.md` (in docs/TMP/ or outputs) to kick off.

Key facts:
- ADR-U001 through ADR-U022 in `docs/old_universe/decisions/` — all active,
  all need migration to `docs/architecture/decisions/`
- Research reports (Kegan, Theory U, What Fills a Life) — move to docs/research/
- MANIFESTO.md and VISION.md in old_universe/vision/ — already migrated,
  mark SUPERSEDED
- DOMAIN_SERVICE_DEPENDENCIES.svg and ECOSYSTEM_ANATOMY_V2.svg in
  old_universe/architecture/ — V3 already in reference/, both SUPERSEDED

### After old_universe: Level 4 — retroactive feature specs

36 retroactive specs needed (maturity 6-done). Start with platform core,
work outward to Hub UI. Suggested order:
1. Platform Core — Infrastructure (3 specs: PC001-PC003)
2. Platform Core — Identity (4 specs: PC004-PC007)
3. Platform Core — Organisation (10 specs: PC008-PC017)
4. Platform Core — Governance (3 specs: PC018-PC020)
5. Domain Services — Experience Engine (3 specs: PD001-PD003)
6. Domain Services — Communication (1 spec: PD004)
7. Hub UI (10 specs: H001-H010)
8. Design System (2 specs: DS001-DS002)

Use CC to batch-write specs (4-5 at a time), review each batch before
proceeding to the next.

### Also outstanding

- `docs/planning/PROCESS.md` — needs Shape Up mechanisms added
  (appetite, betting table, cooldown, circuit breaker, WIP at review,
  task lifecycle). 32 files still reference deleted SPRINT.md — update
  in a dedicated pass alongside PROCESS.md update.
- ADRs migration — blocked on old_universe review session
- `docs/TMP/` — still contains repo-tree-2.md if CC generated one;
  delete after this session

---

## Memory-critical items

If this conversation is lost, the essential new information:

- Feature spec template: owner + consumers, Implementation notes for 6-done
- Prefix table locked: PC, PD, H, G, GM, JS, US, AS, DS, V
- Studios: Journey Studio, Universe Studio, Arc Studio (not Designer)
- Studio folders: journey-studio/, universe-studio/, arc-studio/
- 38 READMEs updated, 6 templates updated
- old_universe decommission is next dedicated session
- Level 4 retroactive specs start after old_universe session
- OLD-UNIVERSE-REVIEW-PROMPT.md exists in docs/TMP/ for next session

---

## File locations for next session

| What | Where |
|------|-------|
| Old universe review prompt | docs/TMP/OLD-UNIVERSE-REVIEW-PROMPT.md |
| Ferd capability map | docs/planning/waves/FERD-CAPABILITY-MAP.md |
| Feature spec template | docs/templates/feature-spec.md |
| Skills | .claude/skills/ |
| Session bridges | docs/planning/sessions/ |
