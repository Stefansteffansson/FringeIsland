# Wave 1: Ferd — Voyage / Departure

---
name: ferd
status: cooldown
started: 2026-04-10
target_completion: 2026-09-05
---

**Status (2026-09-05):** the build is complete — the last Ferd item, DB-4 sanction communication (FEAT-PD021 / PC030 / H049), landed 2026-09-03 — and the close ritual is running under the [Ferd close plan](../hub-v2/2026-09-05-ferd-close-plan.md). `status:` reads `cooldown` until Stefan declares the wave closed against the Definition of Done below (declaring a wave complete is a human call — `wave-planning` skill, "Ask first"); the close flips it to `completed`. Live state: the most recent bridge under [`../sessions/`](../sessions/) and the front door [`../cycles/cycle-current.md`](../cycles/cycle-current.md). Written 2026-09-05 from [`../../templates/wave-spec.md`](../../templates/wave-spec.md) as the close's first deliverable (Audit V AC5-2, Cycle COR-E W3).

## Theme

Ferd is the departure — the foundation every later wave stands on. It is everything needed for the first usable FringeIsland: **who can be here and how they arrive** (the Mist arriving anonymously and becoming a FIM by consent; sign-up, sign-in, sign-out, and leaving with one's data; the account lifecycle of pause, suspension and deletion; consent, export and sessions as self-service), **how people gather** (engagement groups with Stewards, roles and permissions; invitations, membership lifecycle, leadership transfer and closure; groups acting as groups), **what they do together** (journeys with enrolment, a player, completion and review; the private journal), **how they talk** (direct and group conversations, the group forum, announcements, live updates), **how they hear** (the notification bell, typed actions, preferences with the categories nobody can mute), and **how the platform is kept** (the DeusEx admin plane: members, groups, moderation, audit, role templates, holds with a member-facing reason). The four studies and the 2026-04 overview named these as fundamentals, communications and administration; the [capability map](./FERD-CAPABILITY-MAP.md) of 2026-04-10 is the dated scoping baseline (staleness banner inside — never read it as a tracker).

Built API-first (ADR-U009, ADR-U038): every feature as a paired platform contract (Platform Core or a Domain Service, below the Platform API as RPC / RLS / trigger / grant) and a Hub surface over it, with the five verticals as obligations on each (ADR-U002). The build itself was the Hub v2 rebuild ([`../hub-v2/README.md`](../hub-v2/README.md)): Phases 0–4 from 2026-06-15 to the cutover of 2026-08-12, then the post-cutover cycles (role distribution, hygiene, the leftovers pass, the anatomy corrections COR-A…E) through DB-4 on 2026-09-03. The wave was named in ADR-U022 (2026-03) and scoped on 2026-04-10 — the `started` date above; the repository predates it (first commit 2026-01-17, the hub-legacy the rebuild replaced).

**Named in the 2026-04 overview, not in Ferd:** internationalisation — deferred by dated ruling to the Eid design-system activation ([TASK-I18N-01](../backlog/tasks/TASK-I18N-01-i18n-externalisation-deferred-to-eid.md), `wave: eid`).

## Features in scope

100 feature specs tagged `wave: ferd` in the ecosystem tree, every one at maturity `6-done` (census 2026-09-05; the specs' YAML is canonical — the `doc-health-check` skill §5 keeps this list honest). The owner holds the feature; this file only links.

### Products

#### Hub (49)
- [x] [FEAT-H001: Walking skeleton](../../products/hub/features/FEAT-H001-walking-skeleton-sign-in-and-groups.md) — Hub — maturity: 6-done
- [x] [FEAT-H002: Credentialed FIM sign-up](../../products/hub/features/FEAT-H002-credentialed-fim-sign-up.md) — Hub — maturity: 6-done
- [x] [FEAT-H003: Mist identity on arrival](../../products/hub/features/FEAT-H003-mist-identity-on-arrival.md) — Hub — maturity: 6-done
- [x] [FEAT-H004: Mist transcendence and farewell](../../products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md) — Hub — maturity: 6-done
- [x] [FEAT-H005: Member profile and sign-out](../../products/hub/features/FEAT-H005-member-profile-and-sign-out.md) — Hub — maturity: 6-done
- [x] [FEAT-H006: Render account state](../../products/hub/features/FEAT-H006-render-account-state.md) — Hub — maturity: 6-done
- [x] [FEAT-H007: Self-service account reactivation](../../products/hub/features/FEAT-H007-self-service-account-reactivation.md) — Hub — maturity: 6-done
- [x] [FEAT-H008: Render consent state](../../products/hub/features/FEAT-H008-render-consent-state.md) — Hub — maturity: 6-done
- [x] [FEAT-H009: Update consent decisions](../../products/hub/features/FEAT-H009-update-consent-decisions.md) — Hub — maturity: 6-done
- [x] [FEAT-H010: Download my data](../../products/hub/features/FEAT-H010-download-my-data.md) — Hub — maturity: 6-done
- [x] [FEAT-H011: Private journal](../../products/hub/features/FEAT-H011-private-journal.md) — Hub — maturity: 6-done
- [x] [FEAT-H012: Per-device sessions](../../products/hub/features/FEAT-H012-per-device-sessions.md) — Hub — maturity: 6-done
- [x] [FEAT-H013: Group creation & stewardship surfaces](../../products/hub/features/FEAT-H013-group-creation-and-stewardship.md) — Hub — maturity: 6-done
- [x] [FEAT-H014: Group roles & permissions surfaces](../../products/hub/features/FEAT-H014-group-roles-and-permissions.md) — Hub — maturity: 6-done
- [x] [FEAT-H015: Group invitations & joining surfaces](../../products/hub/features/FEAT-H015-group-invitations-and-joining.md) — Hub — maturity: 6-done
- [x] [FEAT-H016: Group membership lifecycle surfaces](../../products/hub/features/FEAT-H016-group-membership-lifecycle.md) — Hub — maturity: 6-done
- [x] [FEAT-H017: Leadership transfer, closure, and deletion surfaces](../../products/hub/features/FEAT-H017-leadership-transfer-and-closure.md) — Hub — maturity: 6-done
- [x] [FEAT-H018: Group-of-groups & acting as a group](../../products/hub/features/FEAT-H018-group-of-groups-and-acting-as-a-group.md) — Hub — maturity: 6-done
- [x] [FEAT-H019: Journey catalogue & enrolment surfaces](../../products/hub/features/FEAT-H019-journey-catalogue-and-enrolment.md) — Hub — maturity: 6-done
- [x] [FEAT-H020: Journey player](../../products/hub/features/FEAT-H020-journey-player.md) — Hub — maturity: 6-done
- [x] [FEAT-H021: Journey completion and review](../../products/hub/features/FEAT-H021-journey-completion-and-review.md) — Hub — maturity: 6-done
- [x] [FEAT-H022: Frozen-enrolment read-only mode and group progress views](../../products/hub/features/FEAT-H022-frozen-mode-and-group-progress.md) — Hub — maturity: 6-done
- [x] [FEAT-H023: Onboarding arrival and carry-over](../../products/hub/features/FEAT-H023-onboarding-arrival-and-carry-over.md) — Hub — maturity: 6-done
- [x] [FEAT-H024: Ask capture and review substance](../../products/hub/features/FEAT-H024-ask-capture-and-review-substance.md) — Hub — maturity: 6-done
- [x] [FEAT-H025: Messages — DM and group conversations](../../products/hub/features/FEAT-H025-messages-dm-and-group-conversations.md) — Hub — maturity: 6-done
- [x] [FEAT-H026: Group forum & attribution in the Hub](../../products/hub/features/FEAT-H026-group-forum-and-attribution.md) — Hub — maturity: 6-done
- [x] [FEAT-H027: Live updates for the inbox, the open conversation, the unread badge, and the group forum](../../products/hub/features/FEAT-H027-live-messages-forum-and-badge.md) — Hub — maturity: 6-done
- [x] [FEAT-H028: Announcements on group page + home, forum edit/delete-own within the window, content reporting (COM-8/9/12/13 surface half)](../../products/hub/features/FEAT-H028-announcements-edit-window-and-reporting.md) — Hub — maturity: 6-done
- [x] [FEAT-H029: Pause or delete my account](../../products/hub/features/FEAT-H029-pause-or-delete-my-account.md) — Hub — maturity: 6-done
- [x] [FEAT-H030: Notification bell and inbox](../../products/hub/features/FEAT-H030-notification-bell-and-inbox.md) — Hub — maturity: 6-done
- [x] [FEAT-H031: Notification typed actions (Accept/Decline in the bell)](../../products/hub/features/FEAT-H031-notification-typed-actions.md) — Hub — maturity: 6-done
- [x] [FEAT-H032: Live notification bell, reconnect reconciliation, and the first-paint cleanup](../../products/hub/features/FEAT-H032-live-notification-bell-and-reconnect-reconciliation.md) — Hub — maturity: 6-done
- [x] [FEAT-H033: Notification preferences & the operator nudge console](../../products/hub/features/FEAT-H033-notification-preferences-and-operator-nudge-console.md) — Hub — maturity: 6-done
- [x] [FEAT-H034: Admin dashboard & durable audit wiring](../../products/hub/features/FEAT-H034-admin-dashboard-and-durable-audit-wiring.md) — Hub — maturity: 6-done
- [x] [FEAT-H035: Group administration view](../../products/hub/features/FEAT-H035-group-administration-view.md) — Hub — maturity: 6-done
- [x] [FEAT-H036: Member administration view](../../products/hub/features/FEAT-H036-member-administration-view.md) — Hub — maturity: 6-done
- [x] [FEAT-H037: Moderation and audit view](../../products/hub/features/FEAT-H037-moderation-and-audit-view.md) — Hub — maturity: 6-done
- [x] [FEAT-H038: Suspension integrity and state honesty](../../products/hub/features/FEAT-H038-suspension-integrity-and-state-honesty.md) — Hub — maturity: 6-done
- [x] [FEAT-H039: Bulk member actions and the bounded list](../../products/hub/features/FEAT-H039-bulk-member-actions-and-bounded-list.md) — Hub — maturity: 6-done
- [x] [FEAT-H040: The role-template editor (/admin/roles per RB-4](../../products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md) — Hub — maturity: 6-done
- [x] [FEAT-H041: The suspended-group admin content view (WF-2 per the settled G-board](../../products/hub/features/FEAT-H041-suspended-group-admin-content-view.md) — Hub — maturity: 6-done
- [x] [FEAT-H042: Invitations answer in the bell + the /groups landing focus](../../products/hub/features/FEAT-H042-invitation-bell-answers-and-groups-landing-focus.md) — Hub — maturity: 6-done
- [x] [FEAT-H043: Role provenance on group roles, template retirement in the admin plane, and group-side role removal](../../products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md) — Hub — maturity: 6-done
- [x] [FEAT-H044: Available-roles view, diff-on-copy ceremony, admin publish surface, and the three passive distribution notices](../../products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md) — Hub — maturity: 6-done
- [x] [FEAT-H045: Retired role templates collapse behind a disclosure in the admin catalogue, and a never-offered template gains a guarded delete](../../products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md) — Hub — maturity: 6-done
- [x] [FEAT-H046: Wielded content affordances](../../products/hub/features/FEAT-H046-wielded-content-affordances.md) — Hub — maturity: 6-done
- [x] [FEAT-H047: Wielded conversation affordances](../../products/hub/features/FEAT-H047-wielded-conversation-affordances.md) — Hub — maturity: 6-done
- [x] [FEAT-H048: Wielded announcement affordances](../../products/hub/features/FEAT-H048-wielded-announcement-affordances.md) — Hub — maturity: 6-done
- [x] [FEAT-H049: Sanction communication surfaces](../../products/hub/features/FEAT-H049-sanction-communication-surfaces.md) — Hub — maturity: 6-done

No Gimbal shell feature is in Ferd — the Hub is the Ferd surface (ADR-U025: products are equipment profiles over one platform; the Gimbal is Brim's).

### Platform

#### Platform Core (30)

#### Infrastructure (1)
- [x] [FEAT-PC018: Telemetry event store & platform statistics](../../platform/core/features/FEAT-PC018-telemetry-event-store-and-statistics.md) — Platform Core (infrastructure) — maturity: 6-done

#### Identity (7)
- [x] [FEAT-PC001: Mist anonymous-identity substrate (arrival)](../../platform/core/features/FEAT-PC001-mist-anonymous-substrate.md) — Platform Core (identity) — maturity: 6-done
- [x] [FEAT-PC002: Mist ephemerality reaper + atomic transcendence + consent substrate](../../platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md) — Platform Core (identity) — maturity: 6-done
- [x] [FEAT-PC003: Self-service profile read + update](../../platform/core/features/FEAT-PC003-self-service-profile.md) — Platform Core (identity) — maturity: 6-done
- [x] [FEAT-PC004: Account-state read](../../platform/core/features/FEAT-PC004-account-state-read.md) — Platform Core (identity) — maturity: 6-done
- [x] [FEAT-PC005: Self-service account reactivation](../../platform/core/features/FEAT-PC005-self-service-account-reactivation.md) — Platform Core (identity) — maturity: 6-done
- [x] [FEAT-PC009: Session inventory & targeted revocation](../../platform/core/features/FEAT-PC009-session-inventory-and-revocation.md) — Platform Core (identity) — maturity: 6-done
- [x] [FEAT-PC017: Account lifecycle self-service](../../platform/core/features/FEAT-PC017-account-lifecycle-self-service.md) — Platform Core (identity) — maturity: 6-done

#### Organisation (8)
- [x] [FEAT-PC010: Group creation & settings contracts](../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC011: Group role & permission contracts](../../platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC012: Group invitation & joining contracts](../../platform/core/features/FEAT-PC012-group-invitation-and-joining-contracts.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC013: Group membership lifecycle contracts](../../platform/core/features/FEAT-PC013-group-membership-lifecycle-contracts.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC014: Leadership transfer, closure, and deletion contracts](../../platform/core/features/FEAT-PC014-leadership-transfer-and-closure-contracts.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC015: Group-of-groups membership & acting contracts](../../platform/core/features/FEAT-PC015-group-of-groups-membership-and-acting-contracts.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC016: get_my_pending_nominations() — retired 2026-09-03 (TASK-H017-01)](../../platform/core/features/FEAT-PC016-pending-nominations-read-contract.md) — Platform Core (organisation) — maturity: 6-done
- [x] [FEAT-PC023: Group availability enforcement contracts (resting + suspended)](../../platform/core/features/FEAT-PC023-group-suspension-enforcement-contracts.md) — Platform Core (organisation) — maturity: 6-done

#### Governance (14)
- [x] [FEAT-PC006: Member consent read](../../platform/core/features/FEAT-PC006-member-consent-read.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC007: Consent decision write](../../platform/core/features/FEAT-PC007-consent-decision-write.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC008: Member data export](../../platform/core/features/FEAT-PC008-member-data-export.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC019: Durable auth-event audit binding](../../platform/core/features/FEAT-PC019-durable-auth-event-audit-binding.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC020: Group administration contracts](../../platform/core/features/FEAT-PC020-group-administration-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC021: Member administration contracts](../../platform/core/features/FEAT-PC021-member-administration-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC022: Moderation and audit-read contracts](../../platform/core/features/FEAT-PC022-moderation-and-audit-read-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC024: Bounded member enumeration](../../platform/core/features/FEAT-PC024-bounded-member-enumeration-contract.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC025: Role-template editing contracts (ADM-17 platform half per RB-4/RB-5](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC026: Suspended-group admin access contracts (WF-2 per the settled G-board](../../platform/core/features/FEAT-PC026-suspended-group-admin-access-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC027: Role-template provenance stamp, central retirement, and group-side removal of adopted roles](../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC028: Role-template publication scope, group-scoped offer read, diff-on-copy contracts, and the three passive distribution notices](../../platform/core/features/FEAT-PC028-role-template-publication-scoped-offer-and-diff-on-copy-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC029: Server-computed delete eligibility on the template list, and a hard delete guarded to templates that were never offered and were never adopted](../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md) — Platform Core (governance) — maturity: 6-done
- [x] [FEAT-PC030: Sanction communication contracts](../../platform/core/features/FEAT-PC030-sanction-communication-contracts.md) — Platform Core (governance) — maturity: 6-done

#### Platform Domain (21)

#### Journeys (6)
- [x] [FEAT-PD002: Journey catalogue & enrolment contracts](../../platform/domain/features/FEAT-PD002-journey-catalogue-and-enrolment-contracts.md) — Platform Domain (journeys) — maturity: 6-done
- [x] [FEAT-PD003: Journey step substrate and per-traveller progress contracts](../../platform/domain/features/FEAT-PD003-journey-step-substrate-and-progress-contracts.md) — Platform Domain (journeys) — maturity: 6-done
- [x] [FEAT-PD004: Journey completion, timing, and review-read contracts](../../platform/domain/features/FEAT-PD004-journey-completion-timing-review-contracts.md) — Platform Domain (journeys) — maturity: 6-done
- [x] [FEAT-PD005: Group journey progress, sharing consent, and frozen-walk contracts](../../platform/domain/features/FEAT-PD005-group-progress-sharing-frozen-contracts.md) — Platform Domain (journeys) — maturity: 6-done
- [x] [FEAT-PD006: Onboarding designation and first-arrival contracts](../../platform/domain/features/FEAT-PD006-onboarding-designation-and-arrival-contracts.md) — Platform Domain (journeys) — maturity: 6-done
- [x] [FEAT-PD007: Step-response capture and review-substance contracts](../../platform/domain/features/FEAT-PD007-step-response-capture-contracts.md) — Platform Domain (journeys) — maturity: 6-done

#### Communication (14)
- [x] [FEAT-PD008: Conversation & message contracts (DM + group grain)](../../platform/domain/features/FEAT-PD008-conversation-and-message-contracts.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD009: Forum & attribution contracts (group forum + membership-status display + ds5 lifecycle relocation)](../../platform/domain/features/FEAT-PD009-forum-and-attribution-contracts.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD010: Realtime hint emission](../../platform/domain/features/FEAT-PD010-realtime-hint-emission.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD011: Announcements, windowed own-edits, and content-report contracts (COM-8/9/12/13 platform half; ADR-U049)](../../platform/domain/features/FEAT-PD011-announcements-window-and-reports-contracts.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD012: Lifecycle dispositions & own-communication export contracts](../../platform/domain/features/FEAT-PD012-lifecycle-dispositions-and-export-contracts.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD013: Notification routing contracts and category registry](../../platform/domain/features/FEAT-PD013-notification-routing-contracts-and-category-registry.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD014: Actionable-notification dispatch, acting-invitation fan-out, and convergence](../../platform/domain/features/FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD015: Notification realtime hint, nudge policy, and reconnect reconciliation](../../platform/domain/features/FEAT-PD015-notification-realtime-hint-and-reconnect-reconciliation.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD016: Notification preference contracts & the shared suppression dispatcher](../../platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD017: Bell-answerable personal invitations (dispatch, typed response, all-doors convergence)](../../platform/domain/features/FEAT-PD017-bell-answerable-personal-invitations.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD018: Member-erasure conversation disposition](../../platform/domain/features/FEAT-PD018-member-erasure-conversation-disposition.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD019: Wielded content authorship](../../platform/domain/features/FEAT-PD019-wielded-content-authorship-acting-in-content-contracts.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD020: Group-addressed notification delivery](../../platform/domain/features/FEAT-PD020-group-addressed-notification-delivery.md) — Platform Domain (communication) — maturity: 6-done
- [x] [FEAT-PD021: Sanction notification kinds](../../platform/domain/features/FEAT-PD021-sanction-notification-kinds.md) — Platform Domain (communication) — maturity: 6-done

#### Intelligence (1)
- [x] [FEAT-PD001: Personal Journal primitive](../../platform/domain/features/FEAT-PD001-personal-journal-primitive.md) — Platform Domain (intelligence) — maturity: 6-done

### Studios

None in Ferd. Journey Studio v1 is Eid's first study ([`studies/eid/journey-studio-v1.md`](./studies/eid/journey-studio-v1.md)); the Ferd journeys are seeded content under the Domain journeys contracts.

## Wave completion criteria (Definition of Done)

Walked, with evidence per line, in the close's DoD walk record under [`../hub-v2/`](../hub-v2/) (`2026-MM-DD-ferd-dod-walk.md`). Nothing closes on a placeholder; a line that cannot be evidenced stays open and is named in the record.

### Feature completeness
- [ ] All 100 listed features have maturity = 6-done, each with filled Implementation notes (doc-health §5 / §7; the census above).
- [ ] End-to-end user journey verified — the critical path: arrive as a Mist → become a FIM with consent → land on My groups → create an engagement group, invite, assign roles → enrol in a journey (self, and as a group), walk it, pause and resume, complete and review → converse (a DM, the group forum, an announcement) and hear about it in the bell → the admin plane: suspend a group with a reason, the member sees the wall and the reason and the bell notice, reactivate → export my data; pause or delete my account. Evidence: (a) the E2E fleet green on the test project (ADR-U053) and (b) the live walks — A-ADM (2026-08-02), the twelve-scenario post-area walk (2026-08-06), RD-B (2026-08-09), the wielded-forum walk (2026-08-19), DB-4 legs 1/2/3/7 (2026-09-04) and legs 4/5/6/8 (the close).

### Quality gates
- [ ] All tests pass on the test project: the unit tier, the full integration tier (including the platform conformance family — the rings, grants, retention, exposure register, production fuse), the E2E fleet; teardown census clean after each.
- [ ] Lint, typecheck and `next build` clean; CI green on `main` HEAD.
- [ ] No critical/high security vulnerabilities: `npm audit` over the production dependencies and the Supabase security advisor (ERROR level) both clear — or every remaining item ruled, with the reason and the owner recorded.
- [ ] RLS on every `public` table, the SECURITY DEFINER surface pinned (search_path on every function, `anon` executes none, the sealed set leaks nothing) — the platform conformance family, and a live census of both projects at the walk.

### Documentation
- [ ] Every decision of the wave has an ADR; none left `Proposed` at close; the index consistent with the files.
- [ ] Platform API contracts documented for every shipped contract: the §L4 rows in the Platform Core and Domain Service specifications, the ownership manifest v2 with its exposure classes, and the exposure-register gate green.
- [ ] The product specification (Hub) and the anatomy pair reflect what shipped — the anatomy stamp fresh (doc-health §11) and the cycle-boundary doc-health run clean.

### Retrospective
- [ ] Wave retrospective completed ([`../retrospectives/retro-wave-ferd.md`](../retrospectives/retro-wave-ferd.md)); the done `TASK-*` files swept after the link check.
- [ ] Ecosystem roadmap updated (`../../ecosystem/ECOSYSTEM_ROADMAP.md`) — or the G-04 decision (waves vs roadmaps) taken and recorded with the deferral's reason.
- [ ] The front door repointed to the Eid kickoff, the close plan CLOSED and this file `status: completed` — in the same change.

## Carried out of Ferd (owned, not lost)

Deferred work leaves with an owner and a wave tag (PROCESS.md §3 "Deferred and cross-wave work"):

- **To Eid by ruling:** i18n externalisation ([TASK-I18N-01](../backlog/tasks/TASK-I18N-01-i18n-externalisation-deferred-to-eid.md)); the dated No-gos inside the Ferd specs that name Eid (notification digests — FEAT-PD015 NB-6; the nudge saving — FEAT-PD016; the affected-member communication deferral on FEAT-PC021 / FEAT-H036 that DB-4 partly discharged) — each stays in its spec, where a future contributor finds the context.
- **Open on the backlog, still `wave: ferd`:** [TASK-FORUM-01](../backlog/tasks/TASK-FORUM-01-reply-addressing-and-collapse.md) (forum reply addressing and collapse, `todo`) — re-tagged or bet on at the Eid kickoff, not carried silently (PROCESS.md §3 backlog triage).
- **Stefan's, from the close's board** ([plan](../hub-v2/2026-09-05-ferd-close-plan.md)): the three production commands of the ADR-U053 cutover, the Vercel Preview → test wiring, the E2E smoke job in CI, leaked-password protection.
