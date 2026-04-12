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
├── ECOSYSTEM_ANATOMY_V3.svg               ← current ecosystem anatomy diagram
├── DOMAIN_SERVICE_DEPENDENCIES.svg        ← domain service dependency flow
│
└── decisions/                             ← Architecture Decision Records (ADRs)
    ├── README.md                          ← ADR index and migration status
    ├── PENDING.md                         ← placeholder
    └── (ADR-U001–U022 pending migration from old_universe/decisions/)
```

---

## Key documents

| Document | Purpose |
|----------|---------|
| ARCHITECTURE_ANATOMY_V1.md | Original L0-L7 layered anatomy. Conceptually superseded by Platform Core / Domain Services decomposition, but contains unique rationale (build order, vertical descriptions, cascade principle). Kept as architectural history. |
| DOMAIN_ENTITIES.md | Core domain model: User, Group, Journey, Role, Permission, Enrollment. Entity properties, relationships, business rules, state transitions. The only place these are documented. |
| ECOSYSTEM_ANATOMY_V3.svg | Current ecosystem anatomy — Platform Core, Domain Services, Products, Studios, Verticals |
| DOMAIN_SERVICE_DEPENDENCIES.svg | How domain services depend on each other and on Platform Core |
