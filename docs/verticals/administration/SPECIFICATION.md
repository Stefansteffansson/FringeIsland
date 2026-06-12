# Vertical — V1: Administration & Moderation

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V1
name: Administration
owner: Stefan
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: active
last_updated: 2026-06-12
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Administration covers platform-level operator capabilities (user management, group management, content moderation, abuse response). Every domain service and surface must expose the hooks that admins need to inspect, intervene, and remediate. Without administration, the platform is ungovernable. This vertical guarantees that operators always have the tools to keep the platform safe, lawful, and consistent with the cosmological constitution — without requiring database surgery.

Per ADR-U028 (governance by scope, ratified 2026-06-10), administration is not one undifferentiated operator plane — it splits by **scope**. **Community-scoped care** (a Steward moderating their own group, a Guide facilitating their journey) stays **woven in-place** in the FIM experience: the affordance appears where the care happens, with no admin-panel detour. **Universe-scoped administration** (platform operations, portfolio, economy, legal) lives on **the Console** — the back-of-house surface and the home of universe-scoped admin ("the Console" is the working name; the fiction name is deferred). The Console is a surface, not a new permission system: one permission mechanism throughout (the universal group pattern, ADR-U006/U007).

### 2. Scope

Scoped per ADR-U028 — in-place community-care affordances vs Console surfaces:

**In-place community care (woven into the FIM experience):**
- Content reporting and moderation affordances where the care happens (flagging, in-group moderation by Stewards/Guides) — Ferd routing: in-place
- Appeal flows initiated in-experience
- Self-service platform-exit stays in-experience (a member leaving is not an admin act)

**Universe-scoped administration (the Console):**
- Platform admin role assignment (DeusEx system group; enterprise-plane seats — Universeers, the FringeIsland Council, DeusEx — per ADR-U028)
- User account inspection, suspension, deletion
- Group inspection, takeover, dissolution
- Content-moderation operations (review queues, takedown)
- Audit trail of every administrative action; the audit-log viewer is a Console surface — Ferd routing: Console
- Feature flags — Ferd routing: Console

### 3. Tooling and infrastructure

- **`is_platform_admin()` SECURITY DEFINER helper (realized — with a parked deviation).** The RLS-side platform-admin gate (live since `fix_rc7_admin_user_ops.sql`; ~20 call sites, ~9 RLS policies including `admin_audit_log`), composing with `has_permission()` per the split-by-context partition (ADR-U007 amendment (b)). It currently checks DeusEx membership by group name and skips the role walk — a name-based proxy for the role-based principle parked at `../../architecture/decisions/PENDING.md` ("Root-admin authority is role-based", 2026-06-12), which names this derivation as its adjudication point. The data model is complete (the seeded DeusEx role holds the permissions); the proxy is the deviation, not the model.
- **DeusEx system group (realized).** The human root-admin group (roles core; ADR-U028): seeded with a role holding all permissions (`supabase/seeds/04_system_groups.sql`); membership-to-role coupling on accept and last-member guards against root-admin lockout are trigger functions in the 2026-02-22 rebuild (`auto_assign_deusex_role_on_accept`, `prevent_last_deusex_role_removal`, `prevent_last_deusex_membership_removal`). ADR-U019's authority of last resort is the permission profile inside this group's role.
- **Admin lifecycle primitives (realized — the human-operated cascade substrate, ADR-U002).** A family of `admin_*` SECURITY DEFINER functions in live migrations (hard-delete, decommission, status update, force-logout, platform exit, admin notification), wired to operator pages (`app/admin/`, `app/admin/deusex/`, `app/admin/fix-orphans/` — the last is ADR-U019's realized recovery surface) over the user-lifecycle states `is_active`/`is_decommissioned`. Irreversible paths use the supervised-bypass discipline (ADR-U006 amendment (c)).
- **In-place community moderation (realized slice).** ADR-U028's in-place pattern exists on disk at the forum: a `moderate_forum` permission in the seeded catalog (`supabase/seeds/01_permissions.sql`) enforced by a `forum_update_moderate` RLS policy (the 2026-02-22 rebuild) — community-scoped care gated by a per-group permission, not by platform-admin status. The slice is the pattern's proof, not its coverage: reporting/flagging, review queues, and takedown are unbuilt.
- **Audit log (partial — realized for admin actions; characterized at the V4 derivation).** `admin_audit_log` is live (the 2026-02-22 group-keyed rebuild; RLS-layer insert-only gated by `is_platform_admin()`; one deliberate erasure-side mutation path — the `[Deleted User]` sentinel reassignment). V4 owns the recording law (V4 §3/§6); V1 owns the operator plane around it: the Console's audit-log viewer is the operator read surface going forward (ADR-U028 Ferd routing), consuming through Platform APIs, never direct storage queries.
- **The Console (planned — ADR-U028; nothing realized).** The back-of-house surface for universe-scoped administration ("the Console" is the working name; the fiction name is deferred): audit-log viewer and feature-flag management per the Ferd routing; economy management (ADR-U011/U028). A surface, not a permission system — every Console affordance authorizes through the universal group pattern.
- **Feature flags (design-locked, unrealized — ADR-U014).** U014 locks the shape — flags as an Infrastructure database configuration table read through a helper function, toggleable without redeploy — and ADR-U028 routes flag management to the Console. Nothing is realized: no flag table, no helper function exists on disk. Named here so the deploy-dark transition U014 anticipates has a tooling owner before the first feature needs it.

### 4. Failure modes

Administration is the vertical where a human is always the actor (ADR-U002); its failure modes are about human power — missing where care is needed, unaccountable where power is exercised, or indistinguishable from judgment where the constitution demands care.

- **Orphaned group.** A group's last Steward leaves and no recovery fires: members are stranded with no role-holder to admit, moderate, or wind down. ADR-U019 is the law (DeusEx becomes Steward, then restores autonomy by reassignment); detection is a structural invariant check (no group without a Steward-capable role-holder); recovery substrate exists as a manual operator surface (`app/admin/fix-orphans/`). The dangerous variant is silent: an orphaned group nobody notices.
- **Un-audited admin act.** An admin capability path exists without an audit write — power exercised that no one can attribute, review, or appeal. The recording law is V4's; V1's stake is accountability: an un-audited admin act cannot be reviewed or appealed, so remediation degrades to fiat. Detected at feature-spec review (the audit slot, ADR-U016) and by audit-coverage reconciliation; recovered by closing the path and recording that the window existed.
- **Scope leak.** A universe-scoped affordance woven into the member experience — a Console operation reachable inside the FIM experience, or platform-operations vocabulary surfacing where care should read as care (ADR-U028 violation; the MANIFESTO's mutual-respect line is the deeper law: admin power visible inside the experience reads as being sized up). Detected at design review against the scope-routing rule (§6/§7); recovered by relocating the affordance to the Console.
- **Moderation-as-judgment.** The constitutional failure mode: a care affordance lands as measurement — member-visible strikes, flags, reputation marks, public moderation states. MANIFESTO: "to be seen without being sized up; to be met without being measured." ADR-U028's split is the structural answer (care stays in-place and warm; operations stay back-of-house); this mode is what its violation feels like from inside. Detected at design review; recovered by removing the judgment artifact — remediation state is between the platform and the affected member.
- **Admin-authority divergence.** The capability model and the realized check disagree about who is an admin — today's reachable instance: a role-stripped DeusEx member loses admin per the `has_permission()` walk yet keeps it at every `is_platform_admin()` proxy site (the parked PENDING deviation). Detected by reconciling the authorization-check families against the model (§6); recovered by the parked mechanical fix — one function body rewritten to walk the permission set.
- **Appeal-less remediation.** A member is suspended, content taken down, a group dissolved — with no recourse path. Care becomes verdict; the platform's power is experienced as judgment without a hearing (MANIFESTO; §5 Q1 owns the workflow). Detected at feature-spec review: every remediation affordance names its appeal route or cites §5 Q1 explicitly. Recovered by retrofitting recourse and reviewing acts taken while none existed.
- **Compromised admin seat.** An attacker holding a DeusEx seat holds the full permission set — the root-admin blast radius is total by design. Containment primitives exist (`admin_force_logout`, `admin_update_user_status`); the last-member guards bound the inverse failure (self-lockout of the root-admin group). Detected through V4's security-relevant audit trail; recovered by seat revocation, forced logout, and audit review of the compromised window — which is why the un-audited-act mode is this mode's force multiplier.

### 5. Open questions

1. **Appeal workflow: in-app or out-of-band?** Appeals initiate in-experience (§2, ADR-U028); the workflow behind them — who reviews, on what timeline, with what escalation to the enterprise plane — is undecided. Candidate spike when the first remediation affordance is specified.
2. **Content moderation: how AI-assisted?** The constitutional floor is fixed (PRINCIPLES-AI): AI does not act without human sign-off; guard rails are human-authored and bidirectional. AI may flag, triage, and surface — remediation is a human act (ADR-U002: administration is human-operated). The open question is the assist boundary: what AI triage is acceptable before the human decision, and how the flagging rail also protects against over-moderation drift.
3. **Regional moderation: do we need per-jurisdiction moderation rules?**
4. **Admin-role granularity.** Today's model is one DeusEx role holding all permissions. Does universe-scoped administration differentiate seats (moderation vs lifecycle vs economy vs legal — the Universeers' five care domains suggest the axes)? The roles core carries the Universeers'-internal-structure question (consumed here, not resolved); the role-stripped divergence (§4) shows the cost of leaving granularity implicit. Candidate ADR alongside the parked root-admin principle.
5. **Breach-response process (V1's half of V2 §5 Q5).** Detection is V4's (landed); the 72-hour Art. 33/34 duty's process half — who declares an incident, who notifies, the runbook — is operator-plane work this vertical owns. Seams with V4 §5 Q3 (on-call posture: V4 owns escalation tooling; V1 owns who answers). Candidate joint spike with V2/V4.

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- Admin authority is role-based: platform-admin capability flows from holding the role whose permission set grants administration (the group + role + permission walk, ADR-U006/U007); membership in any group — including DeusEx — confers nothing by itself. Realized checks that proxy this (the `is_platform_admin()` name-based membership check) are documented deviations with a named reconciliation path (PENDING; adjudicated by this spec).
- One permission mechanism: no parallel admin permission system, ever. Universe-scoped seats are the enterprise plane (Universeers, the Council, DeusEx); community-scoped roles are the PC-3 templates; no other ad-hoc admin roles (ADR-U028).
- Every significant lifecycle event has a complete cascade specification before implementation (ADR-U016): the cascade documents every layer — Platform Core, each Domain Service, each vertical; triggers and RLS do the heavy lifting; application code does not patch layer-by-layer.
- Admin primitives live here: lifecycle operations are SECURITY DEFINER functions owned by Platform Core, exposed through Platform APIs; surfaces wrap primitives, never mutate admin state directly.
- Every admin primitive writes an audit entry through the shared writer (V4 records; V1 demands no un-audited admin path exists) — an admin operation without its audit write is incomplete, not shipped-minus-logging.
- Administration is human-operated (ADR-U002): no automated process exercises admin authority. Automation may detect, stage, and propose; a human executes — the same sign-off law PRINCIPLES-AI fixes for AI applies to all automation on the admin path.
- Destructive operations are graduated and guarded: soft states precede hard ones (suspend / decommission before delete); irreversible operations are deliberate, use the supervised-bypass discipline (ADR-U006 amendment (c)), and are never the default affordance.
- Last-resort stewardship is a platform invariant (ADR-U019): no group without a Steward-capable role-holder; when the last Steward leaves, DeusEx becomes Steward, and the goal is restoration of group autonomy by reassignment, not retained control.
- The root-admin group is never emptied or locked out: last-member/last-role guards protect the recovery path itself (the realized `prevent_last_deusex_*` shape is the pattern).
- Feature flags are Infrastructure configuration (ADR-U014): a database-backed flag read through a shared helper, toggleable without redeploy; every flag change is an admin act — audited and scoped; flag management is a Console surface (ADR-U028). Unrealized today; this obligation is the tooling's specification when it lands.
- Scope gates structurally (ADR-U028): universe-scoped operations check enterprise-plane authority; community-scoped operations check per-group roles; a community-scope check never authorizes a universe-scope act.

#### Domain Services

- Each service exposes admin inspection over its owned data — list and inspect at operator scope, through Platform APIs, gated by the permission walk (never by role or group name, ADR-U007).
- Each service exposes remediation primitives for its owned content — takedown, force-edit, retire — as deliberate operations distinct from owner self-service, each writing an audit entry through the shared writer (V4).
- Each service declares its lifecycle-cascade entries (ADR-U016): what happens in this service when a member is suspended, decommissioned, hard-deleted, or exits the platform; when a group dissolves or is taken over; when content is retired. A lifecycle event with no cascade entry for a service is unimplementable — not implicitly a no-op.
- Community-scoped moderation is a service capability surfaced in-place (ADR-U028): the service owns the moderation operation (permission-gated per-group — the realized `moderate_forum` shape); the surface weaves the affordance where the care happens. No service may require a Console detour for community-scoped care.
- No judgment artifacts: no service computes or stores member-visible moderation state — strike counts, reputation marks, flags on profiles. Remediation state is between the platform and the affected member (MANIFESTO; V2's no-role-bypass is the privacy face of the same law).
- Admin inspection of member data is purpose-bound and audited: operator access reads what the operation requires, with every access recorded (V4's data-access events); private developmental data (journals, Whisp dialogue, assessment results) is never exposed to moderation tooling by default — escalated access is a defined circumstance, not a browse capability (V2 §6).
- Force-archive and takeover are separate flows (ADR-U019/U028): DeusEx intervention on creator content happens only in defined circumstances (abandonment, policy violation), designed explicitly per feature spec — never a generalization of owner self-service.
- Remediation against Shadows works without identity (ADR-U027): abuse response on an anonymous session is session-scoped (terminate, block) and never demands PII — voluntariness is structural; Shadow data handled in remediation stays inside the ephemerality rules.

#### Surfaces (Products · Studios · Design System)

- Every admin affordance sits behind a real permission gate resolved by the platform — never client-side hidden, never a hardcoded role or group name in surface code (ADR-U007).
- Each surface routes admin affordances by scope (ADR-U028): community-scoped care affordances appear in-place in the FIM experience (where the care happens); universe-scoped admin surfaces (audit-log viewer, feature flags, economy/portfolio/legal operations) appear only on the Console, never woven into the member experience.
- Products: admin actions are wrapped and named for the role using them — a Steward sees care vocabulary, a DeusEx operator sees operations vocabulary; raw admin primitives are never exposed; every admin action from a surface is auditable and reversible where feasible.
- In-place care affordances read as care: the language, placement, and weight of community-scoped moderation belong to the experience, not to a back office — no admin-panel detour, no operations vocabulary inside the world (ADR-U028; MANIFESTO).
- Every remediation a member can experience carries its recourse in-experience: appeals initiate where the member is (§2); a surface that ships a takedown without its appeal affordance ships half a flow (§5 Q1 owns the workflow).
- Studios: the Dreamineer lifecycle (pause, revise, retire, hand over) is self-service through the studio surface; force flows are visually and structurally separate — a creator must never wonder whether they or the platform acted.
- Design system: admin contexts use the destructive-variant affordances the design system owns (larger targets, clearer copy, slower defaults); confirmation is a designed moment, never `window.confirm`.
- Console surfaces consume admin primitives through Platform APIs, never by querying storage directly (V4 §6 precedent for the audit viewer, generalized to every Console tool).

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] New table has an admin list/inspect path through a Platform API, gated by the permission walk
- [ ] New admin-capable mutation writes an audit entry via the shared audit writer
- [ ] New admin affordance is permission-gated server-side — no client-side hiding, no hardcoded role or group names
- [ ] New admin affordance is routed by scope (ADR-U028): community-scoped care in-place; universe-scoped on the Console
- [ ] New lifecycle event has its complete cascade specification before implementation (ADR-U016)
- [ ] New destructive admin action uses the design system's destructive variant with a designed confirm step (never `window.confirm`)
- [ ] New irreversible operation has a soft-state precursor and uses the supervised-bypass discipline
- [ ] New remediation affordance names its appeal route (or cites §5 Q1 explicitly)
- [ ] New moderation affordance produces no member-visible judgment artifact (no strikes, scores, flags, public moderation states)
- [ ] New admin path is human-executed — automation detects, stages, proposes; a human signs off
- [ ] New deploy-dark feature is gated by an Infrastructure feature flag (ADR-U014), not an environment branch
- [ ] New admin read of member data is purpose-bound and emits a data-access audit event

### Sources-status block

- **2026-06-12 (L1→L3 descent, Step 2 stress-test).** Compliance polarity: six distinct `admin_*` SECURITY DEFINER functions in live migrations (hard-delete, send-notification, force-logout, update-status, decommission, platform-exit; redefinitions across the rebuild, `fix_test_regressions`, `fix_rc7`, and `sprint4_platform_exit` — functions counted, not definition sites). DeusEx wiring realized: ALL-permissions role seeded at `04_system_groups.sql`; accept-coupling and last-member/last-role guards are rebuild-migration trigger functions (Step 1's seeds attribution corrected in §3 — citation precision, zero substance change). `moderate_forum` (seeds L49) + `forum_update_moderate` (rebuild L1882) confirmed — the realized in-place moderation slice. Lifecycle states wired: `app/admin/page.tsx` calls `admin_update_user_status` / `admin_decommission_user` / `admin_force_logout` / `admin_hard_delete_user` via RPC. `is_platform_admin` concentrated in `fix_rc7` (19 occurrences; 4 files across migrations/lib/app), consistent with the PENDING entry's ~20 sites. `admin_audit_log` presence confirmed (live rebuild + archived origin); characterization consumed from V4 §3, not re-run. Permission catalog 44 rows exact. Absence polarity (dual-method, judged by output lines): feature flags (ADR-U014 — zero; broader "flag" sweep returned only two unrelated comment hits), content reporting/flagging, review/moderation queues, takedown, group takeover/dissolution, appeal flows, the Console surface — all zero. Zero Step 1 retractions.

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
