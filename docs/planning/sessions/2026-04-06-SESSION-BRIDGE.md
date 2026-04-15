# Session Bridge — 2026-04-06
# For use at the start of the next session

**Platform:** FringeIsland — Immersive Edutainment
**Wave:** Ferd (Wave 1) — v0.2.37
**Repo:** Stefansteffansson/FringeIsland
**Supabase:** https://jveybknjawtvosnahebd.supabase.co

---

## What Was Accomplished This Session

### 1. Wave naming locked
Six-wave arc confirmed and named per ADR-U022:

| Wave | Name | Meaning |
|------|------|---------|
| 1 | Ferd | Voyage, departure |
| 2 | Eid | Passage, narrow crossing |
| 3 | Hamn | Harbour |
| 4 | Heim | Home |
| 5 | Brim | Edge, horizon |
| 6 | Urd | Fate, the deep well |

Naming system is Old Norse maritime — no special characters (å, ä, ö).
Wave numbers may still shift; folder numbering deferred until wave assignments fully locked.

### 2. docs/old_products/ restructured
Claude Code executed full restructuring per ADR-U022:
- Four new wave folders created: `eid/`, `heim/`, `brim/`, `urd/`
- Old `hamn/` Wave 2 content archived to `hamn/_archive/2026-04-06-wave2-content/`
- `hamn/` rebuilt for Wave 3 scope (design system, accessibility, UX redesign)
- ~40 files updated with correct wave labels
- `WAVE_REDISTRIBUTION.md` created at `docs/old_products/` — populated with all TBD items

### 3. Roadmap documents created
Full six-wave roadmap produced and added to repo:

**`docs/old_products/ROADMAP.md`** — consolidated single-view of all waves, all items, all status tags

**Per wave:** `planning/WAVE_OVERVIEW.md` — mission, done-when criteria, study dependencies, open questions

**Per wave:** `planning/study/` — individual study-phase files per feature (🔴/🟡 items)

**Per wave:** `architecture/study/` — architecture study files (Ferd only: system-anatomy, api-ring, verticals, conformance-audit)

### 4. Development philosophy formalised
New gate introduced for every single item:

```
Concept → Study → Specify → Build
```

Status tags:
- 🟢 Ready to specify
- 🟡 Needs study
- 🔴 Needs concept work

The `study/` subfolder in both `planning/` and `architecture/` is the physical manifestation of this gate.

### 5. Studio naming locked
- **Journey Studio** — authoring tool for journeys (v.1 through v.4 across waves)
- **FringeIsland Studio** — world-building tool for Dreamineers (v.1 through v.3)
- **Arc Studio** — narrative authoring tool for seasons and episodes (v.1 in Urd)

---

## Current State of the Repo

```
docs/old_products/
├── ROADMAP.md                    ← NEW — consolidated 6-wave overview
├── WAVE_REDISTRIBUTION.md        ← NEW — items pending wave assignment
├── ferd/
│   ├── planning/
│   │   ├── WAVE_OVERVIEW.md      ← NEW
│   │   └── study/                ← NEW — 10 feature study files
│   └── architecture/
│       └── study/                ← NEW — 4 architecture study files
├── eid/  heim/  brim/  urd/      ← NEW scaffold folders
└── hamn/
    └── _archive/2026-04-06-wave2-content/  ← archived old Wave 2 content
```

---

## Immediate Next Actions (in order)

### 1. Commit (if not done)
```
docs: restructure products/ for 6-wave arc + add roadmap files

- Rebuild docs/old_products/ around Ferd→Eid→Hamn→Heim→Brim→Urd (ADR-U022)
- Archive old Wave 2 Hamn content
- Create scaffold folders for eid/, heim/, brim/, urd/
- Add ROADMAP.md, WAVE_OVERVIEW.md and study/ files per wave
- Add WAVE_REDISTRIBUTION.md — pending wave assignment triage
- Update ~40 files: wave labels, cross-references, session headers
```

Also archive `docs/old_products/RESTRUCTURING_PROPOSAL.md` →
`docs/old_products/ferd/sessions/2026-04-06-documentation-restructuring-proposal.md`

### 2. WAVE_REDISTRIBUTION.md triage session
Read `docs/old_products/WAVE_REDISTRIBUTION.md` and assign every TBD item to the correct new wave. This is a scope decision session, not a labelling exercise. Some items will reveal that wave scopes need adjustment. Treat findings that change the roadmap as valid inputs — update WAVE_OVERVIEW.md files accordingly.

### 3. Architecture study phase (Ferd critical path)
This is the single most important unblocked work. Read the four files in `docs/old_products/ferd/architecture/study/` and run a dedicated study session for each:

**Order matters — do in this sequence:**
1. `system-anatomy.md` — lock the L0-L7 layer definitions
2. `api-ring.md` — lock the principles and enforcement rules
3. `verticals.md` — lock the Ferd scope for all five verticals
4. `conformance-audit.md` — unblocked only after 1-3 are locked

### 4. Claude Code conformance audit
Once the architecture is locked, hand the locked documents to Claude Code:
- Audit the existing codebase against the anatomy
- Produce a violations report categorised by severity
- Blocking violations must be resolved before new Ferd features are built

---

## Critical Path Visual

```
WAVE_REDISTRIBUTION.md triage
        ↓
Lock system-anatomy.md
        ↓
Lock api-ring.md
        ↓
Lock verticals.md
        ↓
Claude Code conformance audit
        ↓
Resolve blocking violations
        ↓
Study phase per Ferd feature (planning/study/)
        ↓
Specify (BDD/Gherkin)
        ↓
Build (TDD)
```

---

## Key Decisions Locked (do not revisit)

| Decision | Detail |
|----------|--------|
| Wave arc | Ferd → Eid → Hamn → Heim → Brim → Urd |
| Wave overlap | Waves roll — one winds down as next builds up |
| Folder numbering | Deferred until wave assignments fully locked |
| study/ subfolder | Used in both planning/ and architecture/ for pre-specification items |
| Session file policy | Add header note to affected sessions, never rewrite historical content |
| Wave redistribution | Handled separately — not part of the migration |
| Mobile-ready now | Backend contracts built for Wave 2 (mobile) during Wave 1 |

---

## Watch Points for Next Session

These are tensions or risks identified in the session analysis that will need attention:

- **Conformance audit may require rebuilding existing work** — treat findings as potentially reordering the Ferd sequence, not just adding a remediation task
- **WAVE_REDISTRIBUTION.md triage is a scope session** — some items will require wave overview updates, not just label changes
- **The Whisp needs a defined "done" state** — before beginning the Whisp concept session, agree what outputs would move it from 🔴 to 🟡
- **The research triptych (Ikigai, Theory U, Kegan) is not yet connected to the roadmap** — worth addressing during the Eid concept sessions

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 App Router (`proxy.ts` not `middleware.ts`) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase / PostgreSQL |
| Auth | Supabase Auth |

Key patterns: `users.full_name` (not `display_name`) · Default landing `/groups` · `ConfirmModal` not alerts · Permissions via groups and roles only · DeusEx = platform super-admin group

---

*Bridge generated: 2026-04-06*
*Session type: Planning / Architecture / Documentation*
*Next session focus: WAVE_REDISTRIBUTION.md triage*
