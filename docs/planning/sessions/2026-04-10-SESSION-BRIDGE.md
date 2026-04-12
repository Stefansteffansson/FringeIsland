# Ecosystem Decomposition Session Bridge — 2026-04-10

**Session:** Ecosystem Decomposition Levels 1-3
**Participants:** Stefan + Claude (Opus)
**Status:** Levels 1-2 complete, Level 3 drafted with updates pending

---

## Session outputs (all in `docs/TMP/ecosystem-session/`)

### Documents to move to final locations

| File in staging | Final location | Action |
|---|---|---|
| `VISION.md` | `docs/ecosystem/VISION.md` | Move (replace any existing) |
| `MANIFESTO.md` | `docs/ecosystem/MANIFESTO.md` | Copy from `docs/old_universe/vision/MANIFESTO.md` if not already in staging, then move |
| `HUB-DESCRIPTION.md` | `docs/products/hub/DESCRIPTION.md` | Move |

### Documents already executed by CC during session

| Instruction file | Status |
|---|---|
| `VERTICAL-IMPACT-INSTRUCTIONS.md` | Executed — vertical impact section added to feature-spec template, decomposition skill, AGENTS.md |
| `EXTENSIBILITY-CHECK-INSTRUCTIONS.md` | Executed — extensibility check added to same three files |

### CC-produced analysis documents (stay in staging as reference)

| File | Purpose |
|---|---|
| `HUB-DESCRIPTION-CC.md` | CC's version of Hub description — used for gap analysis |
| `GROUP-MODEL-CURRENT-STATE-CC.md` | Full group/membership/role/permission model analysis |
| `PLATFORM-EXIT-GAP-ANALYSIS-CC.md` | Platform exit flow analysis with GDPR gaps |
| `ADMIN-DEUSEX-GAP-ANALYSIS-CC.md` | DeusEx admin capabilities gap analysis |

---

## Decisions made this session

### Level 1 — Vision

1. **VISION.md is constitutional** — one page, links outward. Does not absorb the Manifesto or World Model depth.
2. **Manifesto stays separate** — moves to `docs/ecosystem/MANIFESTO.md` as cultural companion to VISION.md.
3. **World Model depth** — lives in `docs/platform/domain/world-model/` (directory to be created). VISION.md references Three Worlds as structural concept only.

### Level 2 — Hub Description

4. **Hub is FIM-facing only.** No journey authoring in Ferd. Seed data journeys are sufficient.
5. **Visitors are a real user type** — anonymous sessions (ADR-U004), activity accumulates, soft transition to member on signup.
6. **Five user-facing roles in the Hub:** Visitor, Member, Steward, Dreamineer, DeusEx.
7. **Dreamineers are broader than "narrative creators"** — they're the contributor community across the ecosystem. Hub supports their community participation; Studios hold their authoring tools.
8. **The Journal belongs to Platform Core — Identity.** It's the FIM's personal accumulation surface. Not a journey artifact, not a communication tool. Profile is public face, Journal is private face. Must be available in Hub and later Gimbal.
9. **Under-18s are outside scope** for legal reasons.

### Structural decisions

10. **Vertical impact section** added to feature-spec template, decomposition skill, and AGENTS.md. Every feature spec must address all five verticals (Privacy/GDPR, Notifications, Administration, Observability, Transactions) or mark "None."
11. **Extensibility check** added to the same three places. No hardcoded enums, sealed type systems, or closed permission sets.
12. **Extension System is later-wave scope** but Ferd architecture must not close it off. Design constraint, not a build item.

### Level 3 — Ferd scope decisions

13. **Forums and DM are Ferd.** Simple forum (post, reply). DM: 1-1 messages and group messages with add/remove/leave.
14. **Journal is Ferd.** Simple CRUD version, expanded in later waves.
15. **Journey progress, pause, leave, resume, completion are all Ferd.**
16. **Group-in-group is Ferd.** Full system, not just schema-ready. Groups are fundamental — includes transitive permission resolution, circularity prevention, nesting UI.
17. **Platform exit (self-service) is Ferd.** FIMs must be able to leave the platform on their own.
18. **Audit log viewer UI is Ferd.**
19. **Content reporting/moderation (simple) is Ferd.** Report button + admin review queue.
20. **GDPR consent store is Ferd.**
21. **Data export is Ferd.** FIMs must be able to download their data.
22. **Feature flags infrastructure is Ferd.**
23. **Real-time subscriptions** scoped to DMs and notification bell for Ferd. Forums and progress tracking can use simpler approaches.

---

## CC instruction: Produce final Ferd capability map

Using the draft capability map from this session plus the three analysis documents (GROUP-MODEL-CURRENT-STATE.md, PLATFORM-EXIT-GAP-ANALYSIS.md, ADMIN-DEUSEX-GAP-ANALYSIS.md), produce a final comprehensive Ferd capability map.

### Capabilities to ADD to the draft map

**Platform Core — Organisation (PC-3):**
- Group-in-group: engagement group joins engagement group
- Circularity prevention trigger (D11 — designed, not built)
- Transitive permission resolution in `has_permission()` (designed, not built)
- Max membership depth setting (designed, not built)
- Subgroup browsing/management UI
- Attribution chains for nested membership display

**Platform Core — Identity (PC-2):**
- Self-service platform exit ("Delete my account" flow)
- PII scrubbing on decommission (email, name, bio, avatar)
- Auth record cleanup on decommission
- Data export (FIM downloads their own data)
- GDPR consent store (consent per purpose, timestamps, withdrawal)

**Platform Core — Governance (PC-4):**
- Audit log viewer UI
- Group status management UI (archive, suspend, reactivate)
- Journey admin controls (unpublish, remove)
- Content reporting system (report button + reports table)
- Content moderation queue (admin review + act on reports)
- Hard delete guard (must call exit_platform first, not raw CASCADE)
- System group management (view FI Members, [Deleted User])
- Login/session audit trail

**Domain Services — Communication (DS-5):**
- DM handling on platform exit (display "[Former Member]", preserve other party's history)
- Forum post handling on exit (already designed via ADR-U021, needs implementation verification)

**The Hub — UI Surface:**
- Platform exit UI (settings/account page with "Leave FringeIsland")
- Data export UI
- Consent management UI
- Content report button (on forum posts, messages, profiles)
- Audit log viewer page
- Group status management in admin dashboard
- Journey admin controls in admin dashboard
- Moderation queue page
- Group-in-group management UI (add group to group, view nested structure)
- Journal UI (simple CRUD)

### Capabilities to UPDATE status

Cross-reference against the actual codebase (not just docs) to confirm:
- Feature flags (#4) — check if anything exists
- Real-time subscriptions (#5) — confirm scope of current usage
- DeusEx group (#23) — confirmed Done per GROUP-MODEL-CURRENT-STATE.md
- Group types (#15) — confirmed Done per GROUP-MODEL-CURRENT-STATE.md (CHECK constraint exists)
- Platform exit backend — confirmed Partial (L1/L2/L3 exists, gaps identified in PLATFORM-EXIT-GAP-ANALYSIS.md)
- Admin UI — confirmed Partial (user panel + DeusEx management + fix-orphans exist, per ADMIN-DEUSEX-GAP-ANALYSIS.md)

### Design constraint to include at top of map

> All Ferd platform capabilities must be designed with extension points in mind. No hardcoded enums, no closed type systems, no sealed permission sets. The Extension System is a future wave, but Ferd must not close it off.

### Output

Save the final capability map to `docs/TMP/ecosystem-session/FERD-CAPABILITY-MAP-FINAL.md`.

Also save a version that CC has validated against the actual codebase to confirm all "Done" and "Partial" statuses.

---

## What comes next (future sessions)

1. **Review and lock the final Ferd capability map** — Stefan reviews CC's output
2. **Level 4: Write feature specs** — starting with retroactive documentation of already-built features (maturity 6-done), then specs for not-started capabilities
3. **Populate `docs/planning/waves/ferd.md`** with all feature references + DoD checklist
4. **Delta check** — cross-reference old_*/ files against new feature specs
5. **Create `docs/platform/domain/world-model/` directory** — individual documents per world, per concept
6. **Update `docs/ecosystem/README.md`** — navigation for the ecosystem tree
7. **Lock ecosystem anatomy v2** piece by piece
8. **Update PROCESS.md** — Shape Up mechanisms, task lifecycle

---

## Memory-critical items

If this conversation is lost, the essential new information from this session:

- VISION.md and Hub DESCRIPTION.md written and staged
- Journal belongs to Platform Core — Identity
- Manifesto final location: `docs/ecosystem/MANIFESTO.md`
- Vertical impact + extensibility checks added to feature template, skill, AGENTS.md
- Ferd scope includes: group-in-group (full), self-service platform exit, audit log viewer, content reporting/moderation, GDPR consent store, data export, feature flags, simple Journal, forums, DM (1-1 + group), journey progress/pause/leave/resume/completion
- Real-time subscriptions scoped to DMs + notification bell for Ferd
- Three CC analysis documents produced as reference: group model, platform exit gaps, admin gaps
