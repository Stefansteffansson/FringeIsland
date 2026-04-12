# Platform

**Purpose:** What the platform services actually are — their descriptions, APIs, and feature specs. The living documentation of Platform Core and Platform Domain as they exist and evolve.

**This is for:** Service descriptions, feature specs owned by PC/PD, API contracts, and any document that answers "what does this service do and how does it work?"

**This is NOT for:** Binding architectural decisions (→ `docs/architecture/`), ecosystem-level strategy (→ `docs/ecosystem/`), or point-in-time planning snapshots (→ `docs/planning/reference/`).

---

## Structure

```
docs/platform/
├── README.md                              ← you are here
├── CLAUDE.md                              ← agent context for platform work
├── DEPENDENCIES.md                        ← cross-product dependency table (to be written)
│
├── core/                                  ← Platform Core (PC) — domain-agnostic foundation
│   ├── README.md                          ← PC overview (Infrastructure, Identity, Organisation, Governance)
│   └── features/                          ← feature specs owned by Platform Core
│
├── domain/                                ← Platform Domain (PD) — FringeIsland-specific services
│   ├── README.md                          ← PD overview (7 services + Extension System)
│   └── features/                          ← feature specs owned by Domain Services
│
└── extensions/                            ← Extension System contracts and patterns
```

---

## Two-tier structure

```
              ┌────────────────────────────────────────┐
              │     Products + Studios (consumers)     │
              └──────────────────┬─────────────────────┘
                       Platform API (contract)
              ┌──────────────────┴─────────────────────┐
              │           Platform Domain (PD)         │
              │   World Model · Narrative Engine ·     │
              │   Experience Engine · Content ·        │
              │   Communication · Discovery ·          │
              │   Intelligence · Extension System      │
              └──────────────────┬─────────────────────┘
                      Internal API (contract)
              ┌──────────────────┴─────────────────────┐
              │            Platform Core (PC)          │
              │   Infrastructure · Identity ·          │
              │   Organisation · Governance            │
              └────────────────────────────────────────┘
```

- **Platform Core (PC)** — domain-agnostic foundation. Four areas: Infrastructure (PC-1), Identity (PC-2), Organisation (PC-3), Governance (PC-4).
- **Platform Domain (PD)** — FringeIsland-specific services. Seven services (DS-1 through DS-7) plus the Extension System.

## Boundaries

- **Internal API** — between Platform Core and Platform Domain. Domain services consume Core via this contract; Core never depends upward on Domain.
- **Platform API** — between Platform (as a whole) and Products + Studios. Products and studios never bypass it to talk to the database directly. See ADR-U009 (API-first frontend-agnostic).
