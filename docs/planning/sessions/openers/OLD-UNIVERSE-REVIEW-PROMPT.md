# CC Prompt: old_universe Review and Decommission

## Context

FringeIsland recently completed a major documentation restructuring (April 2026).
The new ecosystem documentation tree lives in:

- `docs/ecosystem/` — vision and manifesto
- `docs/products/` — product descriptions and feature specs
- `docs/platform/` — platform core and domain services
- `docs/studios/` — Journey Studio, Universe Studio, Arc Studio
- `docs/planning/` — waves, cycles, backlog, sessions, reference
- `docs/architecture/decisions/` — ADRs (pending migration)
- `docs/verticals/` — five cross-cutting verticals
- `docs/templates/` — all document templates
- `docs/research/` — research reports

The old documentation lives in `docs/old_universe/`. This session's job is to:
1. Review every file in `docs/old_universe/`
2. Determine what should be migrated to the new tree
3. Determine what is superseded and can be deleted
4. Execute the migration and cleanup
5. Decommission `docs/old_universe/` entirely

---

## Step 1: Full inventory with assessment

Read every file in `docs/old_universe/` and produce a structured assessment.
For each file, state:
- **File path**
- **Summary** — what does it contain? (2-3 sentences)
- **Recommendation** — one of:
  - `MIGRATE` — valuable content not captured in new tree, needs a home
  - `SUPERSEDED` — content exists in better form in new tree, safe to delete
  - `ADR-MIGRATE` — is an ADR, migrate to `docs/architecture/decisions/`
  - `RESEARCH-KEEP` — research content, move to `docs/research/`
  - `DELETE` — no value, safe to delete
- **Migration target** — if MIGRATE or ADR-MIGRATE, where should it go?

Organise the assessment by subdirectory:
- `docs/old_universe/architecture/`
- `docs/old_universe/community/`
- `docs/old_universe/decisions/` (ADRs)
- `docs/old_universe/processes/`
- `docs/old_universe/research/`
- `docs/old_universe/strategy/`
- `docs/old_universe/vision/`

---

## Step 2: Present the assessment before acting

DO NOT move or delete any files yet. Present the full assessment to Stefan
and wait for confirmation before proceeding.

Flag any files where you are uncertain about the recommendation — Stefan
will make the final call.

---

## Step 3: Execute after confirmation

Once Stefan confirms the assessment (possibly with modifications):

1. Migrate ADRs to `docs/architecture/decisions/`
   - Update `docs/architecture/decisions/README.md` with the full ADR index
2. Migrate any MIGRATE files to their confirmed destinations
3. Move RESEARCH-KEEP files to `docs/research/` if not already there
4. Delete all SUPERSEDED and DELETE files
5. Delete `docs/old_universe/` if empty after migration
6. Update `docs/architecture/decisions/README.md` to list all migrated ADRs
7. Update `docs/README.md` if old_universe is referenced there
8. Commit all changes with message:
   `chore(docs): migrate old_universe content, decommission old_universe/`

---

## Key reference documents to read first

Before starting the assessment, read these to understand the new structure:

- `docs/ecosystem/VISION.md` — constitutional document
- `docs/ecosystem/MANIFESTO.md` — cultural companion
- `docs/products/hub/DESCRIPTION.md` — Hub identity
- `docs/planning/waves/FERD-CAPABILITY-MAP.md` — current capability state
- `docs/planning/reference/ECOSYSTEM_ANATOMY_V3.svg` — ecosystem anatomy
- `AGENTS.md` — agent conventions and prefix table

---

## Known facts to inform your assessment

- `docs/old_universe/decisions/` contains ADR-U001 through ADR-U022 —
  all 22 are active locked decisions referenced in the codebase.
  All should be migrated to `docs/architecture/decisions/`.
- `docs/old_universe/vision/MANIFESTO.md` is already migrated to
  `docs/ecosystem/MANIFESTO.md` — mark as SUPERSEDED.
- `docs/old_universe/vision/VISION.md` is superseded by the new
  `docs/ecosystem/VISION.md` — mark as SUPERSEDED.
- `docs/old_universe/architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` is
  already copied to `docs/planning/reference/` — mark as SUPERSEDED.
- `docs/old_universe/architecture/ECOSYSTEM_ANATOMY_V2.svg` is superseded
  by V3 in `docs/planning/reference/` — mark as SUPERSEDED.
- Research reports in `docs/old_universe/research/` (Kegan, Theory U,
  What Fills a Life) are valuable for Dreamineer/content design work
  and should move to `docs/research/`.

---

## Output format for Step 1

```markdown
# old_universe Assessment

## docs/old_universe/architecture/

| File | Summary | Recommendation | Migration target |
|------|---------|----------------|-----------------|
| ARCHITECTURE_ANATOMY.md | ... | SUPERSEDED | — |
| DOMAIN_ENTITIES.md | ... | MIGRATE | docs/platform/domain/DOMAIN_ENTITIES.md |
...

## docs/old_universe/decisions/

| File | Summary | Recommendation | Migration target |
|------|---------|----------------|-----------------|
| ADR-U001-layered-anatomy-framework.md | ... | ADR-MIGRATE | docs/architecture/decisions/ |
...

[continue for each subdirectory]

## Summary counts
- MIGRATE: N files
- ADR-MIGRATE: N files
- RESEARCH-KEEP: N files
- SUPERSEDED: N files
- DELETE: N files
- Total: N files
```
