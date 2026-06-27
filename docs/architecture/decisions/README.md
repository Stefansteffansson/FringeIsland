# Architecture Decision Records (ADRs)

One file per significant architectural decision, MADR format. Numbered sequentially: `ADR-UNNNN-title.md`.

**Template:** `../../templates/adr.md`
**Status values:** Proposed / Accepted / Superseded by ADR-UNNNN / Deprecated

---

## ADR Index

| ID | Title | Status | Tags |
|----|-------|--------|------|
| ADR-U001 | [Layered anatomy framework](ADR-U001-layered-anatomy-framework.md) | Superseded by ADR-U023 | platform-core |
| ADR-U002 | [Five cross-cutting verticals](ADR-U002-five-cross-cutting-verticals.md) | Accepted | vertical |
| ADR-U003 | [Supabase backend platform](ADR-U003-supabase-backend-platform.md) | Accepted | platform-core |
| ADR-U004 | [Visitor anonymous sign-in](ADR-U004-visitor-anonymous-sign-in.md) | Accepted | platform-core |
| ADR-U005 | [Profile data flexible table](ADR-U005-profile-data-flexible-table.md) | Accepted | platform-core |
| ADR-U006 | [Universal Group Pattern](ADR-U006-universal-group-pattern.md) | Accepted | platform-core |
| ADR-U007 | [Three-layer permission model](ADR-U007-three-layer-permission-model.md) | Accepted | platform-core |
| ADR-U008 | [Step type extensibility](ADR-U008-step-type-extensibility.md) | Accepted | domain-service |
| ADR-U009 | [API-first frontend-agnostic](ADR-U009-api-first-frontend-agnostic.md) | Accepted | platform-core |
| ADR-U010 | [Privacy dedicated vertical](ADR-U010-privacy-dedicated-vertical.md) | Accepted | vertical |
| ADR-U011 | [Transactions Stripe Connect](ADR-U011-transactions-stripe-connect.md) | Accepted | vertical |
| ADR-U012 | [Observability dedicated vertical](ADR-U012-observability-dedicated-vertical.md) | Accepted | vertical |
| ADR-U013 | [Design system i18n a11y](ADR-U013-design-system-i18n-a11y.md) | Accepted | design-system |
| ADR-U014 | [Feature flags infrastructure](ADR-U014-feature-flags-infrastructure.md) | Accepted | platform-core |
| ADR-U015 | [API versioning](ADR-U015-api-versioning.md) | Accepted | platform-core |
| ADR-U016 | [Cascade specification first](ADR-U016-cascade-specification-first.md) | Accepted | platform-core |
| ADR-U017 | [Journeys content templates](ADR-U017-journeys-content-templates.md) | Accepted | domain-service |
| ADR-U018 | [No hardcoded group types](ADR-U018-no-hardcoded-group-types.md) | Accepted | platform-core |
| ADR-U019 | [DeusEx authority last resort](ADR-U019-deusex-authority-last-resort.md) | Accepted | platform-core |
| ADR-U020 | [Pairs are groups](ADR-U020-pairs-are-groups.md) | Accepted | platform-core |
| ADR-U021 | [Forum anonymisation soft flag](ADR-U021-forum-anonymisation-soft-flag.md) | Accepted | domain-service |
| ADR-U022 | [Named waves](ADR-U022-named-waves.md) | Accepted | platform-core |
| ADR-U023 | [Platform Core / Domain Services decomposition](ADR-U023-platform-core-domain-services-decomposition.md) | Accepted | platform-core · domain-service |
| ADR-U024 | [Wave model semantics](ADR-U024-wave-model-semantics.md) | Accepted | platform-core |
| ADR-U025 | [Products as equipment profiles](ADR-U025-products-as-equipment-profiles.md) | Accepted | product |
| ADR-U026 | [Studio decomposition — Universe Studio as parent](ADR-U026-studio-decomposition-universe-studio-parent.md) | Accepted | studio |
| ADR-U027 | [Shadow identity lifecycle](ADR-U027-shadow-identity-lifecycle.md) | Superseded by ADR-U031 | platform-core |
| ADR-U028 | [Governance by scope](ADR-U028-governance-by-scope.md) | Accepted | platform-core · vertical |
| ADR-U029 | [Whisp ownership split by face](ADR-U029-whisp-ownership-split-by-face.md) | Accepted | domain-service |
| ADR-U030 | [Hub v2 greenfield rebuild](ADR-U030-hub-v2-greenfield-rebuild.md) | Accepted | product |
| ADR-U031 | [Mist identity lifecycle](ADR-U031-mist-identity-lifecycle.md) | Accepted | platform-core |
| ADR-U032 | [Hub v2 rebuild — coexistence via a separate clean tree](ADR-U032-hub-v2-coexistence-separate-tree.md) | Accepted | product |
| ADR-U033 | [Scheduled reaper for Mist ephemerality — pg_cron as the platform scheduler](ADR-U033-mist-ephemerality-reaper.md) | Accepted | platform-core |
| ADR-U034 | [Consent substrate — append-only consent records at transcendence](ADR-U034-consent-record-substrate.md) | Accepted | platform-core |

---

## Conventions

- ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.
- ADR-U001 through U022 were extracted from a monolithic `ARCHITECTURE_DECISIONS.md` on 2026-04-05. They retain their original narrative structure with standardised headers added.
- ADR-U023 onward use the full MADR template format.
- All new ADRs use the template at `../../templates/adr.md`.
