Doc Health Check — 2026-04-17 — Post Session 1 (way-of-working refactor + sub-folder CLAUDE.md scaffolding)

Sections run:
1.   Terminology drift            — skipped: no renames this session
1.5  Architectural drift           — 13 concepts checked / 1 critical directive found / 1 fixed / 0 flagged as backlog
2.   Schema drift                  — skipped: no migrations this session
3.   Path + README sync            — 4 stale refs fixed / 0 README updates needed / clean
3.5  Archived-tree leak            — 5 old_*/ refs found in active files / 3 directive / 2 historical / 3 fixed / 0 flagged
3.6  Deleted-file refs             — 8 deleted filenames checked / 0 directive refs in active files / clean (all hits in reference snapshots or scaffolding per Section 7)
4.   Parked items                  — skipped: no parked features in the tree
5.   Maturity consistency          — skipped: no feature specs exist in the active ecosystem tree yet
6.   Entity coverage               — 14 entities checked / 0 gaps flagged / 10 pending-per-registry / clean
7.   Expected placeholders         — 16 registry entries reviewed / 0 newly authored / 0 newly introduced / 16 still pending / clean

Critical findings:
- docs/planning/waves/FERD-CAPABILITY-MAP.md:174 — "Phase 3" language in active capability map (privacy row) — fix applied in-place: "Phase 3" → "wave Ferd"
- docs/architecture/ARCHITECTURE_ANATOMY_V1.md:526-528 — Three directive links to old_implementation/ files presented as "Current implementation state" — fix applied in-place: struck through with notes pointing to live sources (supabase/migrations/, lib/supabase/, root CLAUDE.md)
- docs/architecture/ARCHITECTURE_ANATOMY_V1.md:525 — Link to ../decisions/INDEX.md which doesn't exist — fix applied in-place: changed to ./decisions/ (the directory)
- docs/architecture/ARCHITECTURE_ANATOMY_V1.md:529-531 — Three broken relative paths (../vision/VISION.md, ../vision/MANIFESTO.md, ../strategy/CONTRIBUTION_ARCHITECTURE.md) — fix applied in-place: corrected to ../ecosystem/VISION.md, ../ecosystem/MANIFESTO.md, ../ecosystem/strategy/CONTRIBUTION_ARCHITECTURE.md

Backlog items created:
- (none — all findings were within the 5-minute fix threshold)

Placeholders confirmed scaffolding (per Section 7 registry):
- docs/products/hub/README.md:13 — references hub/ROADMAP.md — scaffolding, not drift
- docs/products/hub/DESCRIPTION.md:80 — references hub/ROADMAP.md — scaffolding, not drift
- docs/products/gimbal/README.md:17 — references gimbal/ROADMAP.md — scaffolding, not drift
- docs/products/game/README.md:12 — references game/ROADMAP.md — scaffolding, not drift
- docs/platform/core/README.md:18 — references core/ROADMAP.md — scaffolding, not drift
- docs/platform/domain/README.md:27 — references SPECIFICATION.md + ROADMAP.md — scaffolding, not drift
- docs/planning/PROCESS.md:121,137,221 — references ECOSYSTEM_ROADMAP.md + core/ROADMAP.md — scaffolding, not drift
- docs/templates/product-roadmap.md:6 — references ECOSYSTEM_ROADMAP.md — scaffolding, not drift
- docs/templates/product-description.md:45 — references SPECIFICATION.md + ROADMAP.md — scaffolding, not drift
- docs/templates/product-specification.md:6 — references ROADMAP.md — scaffolding, not drift

Table updates made during this run:
- Section 1.5 table — 0 rows added (no new concepts retired this session; the Phase model row was already present)
- Section 3.6 table — 0 rows added (no new files deleted this session)

Entity coverage detail (Section 6):
- Hub: active (features/ exists), DESCRIPTION.md present, SPECIFICATION.md pending (registry T3.3), ROADMAP.md pending (registry T3.4)
- Gimbal: pre-scope, README.md present, DESCRIPTION.md pending (registry), no active features
- Game: pre-scope, README.md present, DESCRIPTION.md pending (registry), no active features
- Platform Core: active (features/ exists), README.md present, SPECIFICATION.md pending (registry), ROADMAP.md pending (registry)
- Platform Domain: README.md present, 0 service specs authored yet (6 services listed in README as to-be-written)
- Journey Studio: pre-scope, README.md present, DESCRIPTION.md + SPECIFICATION.md pending (registry)
- Universe Studio: pre-scope, README.md present, DESCRIPTION.md + SPECIFICATION.md pending (registry)
- Arc Studio: pre-scope, README.md present, DESCRIPTION.md + SPECIFICATION.md pending (registry)
- Design System: README.md + CLAUDE.md present, no features/ yet — pre-scope, fine
- Verticals: all 5 specs exist as scaffolds — fine

Files written today — drift check:
- Root CLAUDE.md — CLEAN (mentions of old_* and PRDs are context-setting, not directive)
- docs/products/CLAUDE.md — CLEAN
- docs/platform/CLAUDE.md — CLEAN
- docs/studios/CLAUDE.md — CLEAN
- docs/design-system/CLAUDE.md — CLEAN
- docs/verticals/CLAUDE.md — CLEAN (Phase references are meta-documentation about drift, not drift itself)
- docs/verticals/administration.md — CLEAN
- docs/verticals/privacy.md — CLEAN
- docs/verticals/notifications.md — CLEAN
- docs/verticals/observability.md — CLEAN
- docs/verticals/transactions.md — CLEAN

Notes:
- PLATFORM-EXIT-GAP-ANALYSIS.md (reference snapshot) still uses "Phase 3" / "Phase 4" language in 3 places. Not fixed — reference snapshots are point-in-time records. If this snapshot is ever refreshed, the phase language should be updated then.
- FERD-CAPABILITY-MAP.md:271 cites "Binding rule (REQUIREMENTS.md, 2026-04-05)" — classified as historical provenance, not a directive to load REQUIREMENTS.md. Left as-is.
- PRODUCTS_AND_PLATFORM.md:177 links to old_products/ferd/planning/DEFERRED.md for historical wave-redistribution context — classified as historical. The link works (file exists in the archived tree).
- ARCHITECTURE_ANATOMY_V1.md's Related Documents table was in significant disrepair (3 broken relative paths + 3 directive archived-tree links + 1 missing INDEX.md). All fixed in-place. The struck-through old_implementation entries preserve the historical record while marking them as superseded.
- The research document "The solo developer's complete guide..." uses "Phase 1-4" generically (not FringeIsland's phase model) — not drift.
- docs/platform/domain/README.md:14 lists "DS-6 Discovery (discovery.md)" — this is a domain service name, not the retired backlog file discovery.md. Not drift.
- No feature specs (FEAT-*.md) exist yet in the active ecosystem tree. Section 5 will become relevant when the first feature is specified under Model A.
- The doc-health-check skill's Section 7 (expected placeholders) successfully prevented 10+ false positives that Sections 3, 3.6, and 6 would have flagged as broken links or entity coverage gaps.
