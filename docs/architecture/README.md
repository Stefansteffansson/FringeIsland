# Architecture

**Purpose:** Structural models and binding decisions that constrain the entire FringeIsland ecosystem.

**This is for:** ADRs, the layered anatomy, the domain entity model, dependency diagrams, and any document that answers "how is the system structured and why did we make this choice?" These are technical and constraining — they shape what every product, service, and studio can and cannot do.

**This is NOT for:** Service descriptions or feature specs (→ `docs/platform/`), point-in-time planning snapshots (→ `docs/planning/reference/`), or vision-level ecosystem strategy (→ `docs/ecosystem/`).

---

## Structure

```
docs/architecture/
├── README.md                              ← you are here
├── ARCHITECTURE_ANATOMY.md                ← living anatomy overview (derived — canon wins)
├── ARCHITECTURE_ANATOMY_V1.md             ← original L0-L7 layered anatomy (frozen historical reference)
├── DOMAIN_ENTITIES.md                     ← core domain model: entities, relationships, business rules
├── ECOSYSTEM_ANATOMY_V6.svg               ← current ecosystem anatomy diagram (v2.4, July 2026)
├── ECOSYSTEM_ANATOMY_V5.svg               ← superseded anatomy diagram (kept as history)
├── ECOSYSTEM_ANATOMY_V4.svg               ← superseded anatomy diagram (kept as history)
├── DOMAIN_SERVICE_DEPENDENCIES.svg        ← domain service dependency flow
│
└── decisions/                             ← Architecture Decision Records (ADRs)
    ├── README.md                          ← ADR index with full table
    ├── ADR-U001 through ADR-U022          ← migrated from old_universe (April 2026)
    ├── ADR-U023                           ← Platform Core / Domain Services decomposition
    ├── ADR-U024                           ← Wave model semantics
    ├── ADR-U025 through ADR-U028          ← reconciliation Session B (equipment profiles, studio decomposition, Mist lifecycle [U027 -> U031], governance by scope)
    └── ADR-U029 onward                    ← Hub v2 rebuild era and after — the index README is the canonical, always-current list
```

---

## Key documents

| Document | Purpose |
|----------|---------|
| ARCHITECTURE_ANATOMY.md | **The living anatomy overview** — derived one-stop prose companion to the current diagram; canon wins; carries the "Reflects decisions through: ADR-U0XX" freshness stamp (checked by doc-health Section 11). |
| ARCHITECTURE_ANATOMY_V1.md | Original L0-L7 layered anatomy. Superseded by ADR-U023 (Platform Core / Domain Services decomposition), but contains unique rationale (build order, vertical descriptions, cascade principle). Frozen historical reference — see its banner. |
| DOMAIN_ENTITIES.md | Core domain model: User, Group, Journey, Role, Permission, Enrollment. Entity properties, relationships, business rules, state transitions. The only place these are documented. |
| ECOSYSTEM_ANATOMY_V6.svg | **Current ecosystem anatomy** (v2.4, July 2026) — v2.3 refreshed per ADR-U029 (Whisp split by face), ADR-U031 (Mist lifecycle citation), ADR-U038 (platform-side contracts / BFF). Supersedes V5. |
| ECOSYSTEM_ANATOMY_V5.svg | Superseded anatomy (v2.3, June 2026, reconciliation Session B) — kept as architectural history; watermarked. |
| ECOSYSTEM_ANATOMY_V4.svg | Superseded anatomy (v2.2, April 2026) — kept as architectural history; watermarked; carries the pre-reconciliation entity model. |
| DOMAIN_SERVICE_DEPENDENCIES.svg | How domain services depend on each other and on Platform Core; studios (children of Universe Studio, ADR-U026) write to their domain services |
| decisions/README.md | Full ADR index — the canonical, always-current list |
