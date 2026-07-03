# Architecture

**Purpose:** Structural models and binding decisions that constrain the entire FringeIsland ecosystem.

**This is for:** ADRs, the layered anatomy, the domain entity model, dependency diagrams, and any document that answers "how is the system structured and why did we make this choice?" These are technical and constraining — they shape what every product, service, and studio can and cannot do.

**This is NOT for:** Service descriptions or feature specs (→ `docs/platform/`), point-in-time planning snapshots (→ `docs/planning/reference/`), or vision-level ecosystem strategy (→ `docs/ecosystem/`).

---

## Structure

```
docs/architecture/
├── README.md                              ← you are here
├── ARCHITECTURE_ANATOMY_V1.md             ← original L0-L7 layered anatomy (archived reference)
├── DOMAIN_ENTITIES.md                     ← core domain model: entities, relationships, business rules
├── ECOSYSTEM_ANATOMY_V5.svg               ← current ecosystem anatomy diagram (v2.3, June 2026)
├── ECOSYSTEM_ANATOMY_V4.svg               ← superseded anatomy diagram (kept as history)
├── DOMAIN_SERVICE_DEPENDENCIES.svg        ← domain service dependency flow
│
└── decisions/                             ← Architecture Decision Records (ADRs)
    ├── README.md                          ← ADR index with full table
    ├── ADR-U001 through ADR-U022          ← migrated from old_universe (April 2026)
    ├── ADR-U023                           ← Platform Core / Domain Services decomposition
    ├── ADR-U024                           ← Wave model semantics
    ├── ADR-U025 through ADR-U028          ← reconciliation Session B (equipment profiles, studio decomposition, Mist lifecycle [U027 -> U031], governance by scope)
    └── ADR-U029 through ADR-U039          ← Hub v2 rebuild era (Whisp split, greenfield rebuild + coexistence, Mist lifecycle + reaper + consent, perf co-location/Edge/JWT, API-boundary doctrine, realtime socket doctrine)
```

---

## Key documents

| Document | Purpose |
|----------|---------|
| ARCHITECTURE_ANATOMY_V1.md | Original L0-L7 layered anatomy. Superseded by ADR-U023 (Platform Core / Domain Services decomposition), but contains unique rationale (build order, vertical descriptions, cascade principle). Kept as architectural history. |
| DOMAIN_ENTITIES.md | Core domain model: User, Group, Journey, Role, Permission, Enrollment. Entity properties, relationships, business rules, state transitions. The only place these are documented. |
| ECOSYSTEM_ANATOMY_V5.svg | Current ecosystem anatomy (v2.3, June 2026) — products as equipment profiles (ADR-U025), Universe Studio as parent (ADR-U026), Mist lifecycle in PC-2 (ADR-U031, supersedes U027), governance by scope in PC-4 (ADR-U028). Supersedes V4. |
| ECOSYSTEM_ANATOMY_V4.svg | Superseded anatomy (v2.2, April 2026) — kept as architectural history; carries the pre-reconciliation entity model. |
| DOMAIN_SERVICE_DEPENDENCIES.svg | How domain services depend on each other and on Platform Core; studios (children of Universe Studio, ADR-U026) write to their domain services |
| decisions/README.md | Full ADR index — 31 ADRs (U001-U031) |
