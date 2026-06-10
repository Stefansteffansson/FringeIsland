# Platform Core — Infrastructure (PC-1)

<!-- Valid area slugs: infrastructure | identity | organisation | governance -->

---
slug: infrastructure
owner: platform/core/infrastructure
consumers: [platform/domain/world-model, platform/domain/narrative, platform/domain/experience-engine, platform/domain/content, platform/domain/communication, platform/domain/discovery, platform/domain/intelligence, platform/extensions, products/hub, products/gimbal, studios/universe-studio/world-studio, studios/universe-studio/arc-studio, studios/universe-studio/journey-studio, design-system]
status: proposed
last_updated: 2026-06-10
tier: Platform Core
tags: [platform-core:infrastructure]
feature_prefix: PC
---

> One file per Platform Core area. Platform Core is the domain-agnostic foundation everything else depends on. Each area (Infrastructure, Identity, Organisation, Governance) has its own SPECIFICATION.md; there is no PC-wide SPECIFICATION.md (locked 2026-04-26). This file is the inward-facing build spec for one area: what it owns, what it exposes, what it depends on, and how stable it is.

**Authorship note.** L2 owns §L2 below (identity, boundaries, technical shape). L3 owns §L3 (capability inventory). L4 (feature-inventory summary) is deferred to a later phase per the Phase 2 = L1→L3 scope decision. No level modifies a section owned by another.

**Derivation note (this draft).** Step 1 (cold derivation) authored 2026-05-03 as the first cold-derivation of Phase 2 (Platform Core L1→L3). Authority chain: root `CLAUDE.md` (L1 routing) + `docs/platform/CLAUDE.md` (L1 tier identity) + `docs/platform/core/README.md` (L2 inventory) + ADR-U023 (Platform Core / Domain Services decomposition) + this template (format). Code, migrations, and any existing `FEAT-PC###.md` were **not read** during Step 1 cold derivation, per the cold-derivation discipline of the L3 stress-test pattern. Step 2 (code-informed stress-test pass against `supabase/migrations/`, `lib/`, and `app/`) ran 2026-05-04; the three-class output (confirms / entity-internal delta / cross-entity findings) is recorded in §L3 *Step 2 — code-informed stress-test findings* below. Step 3 (adjudication, producing pickup lists for PC-2 / PC-3 / PC-4 / DS-5 plus the Finding #4 escalation path) is the next move.

**Stress-test pattern instance count.** This is the second instance of the code-informed L3 stress-test pattern (n=1 was Hub Block B.2, closed `2026-04-30_02_-_BLOCK-B2-HUB-L3-CLOSE.md`). The pattern held across substantively different entities (PC-1 vs Hub) with different findings shape (lateral-routing pressure absent at Hub B.2; here, four lateral findings plus one tier-shape-question finding). Per the framing accepted 2026-05-04, the pattern promotes to standing methodology; three methodology-refinement signals surfaced during this instance are logged as A-candidates and travel with the promotion (see the next session bridge for ledger).

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision, the platform-tier `CLAUDE.md`, the ecosystem anatomy (ADR-U023), and the L2 inventory line in `core/README.md`. Revised when the area's boundaries, contract surface, dependencies, or stability posture change. Changes here are rare by design — see §7.*

### 1. Purpose

PC-1 Infrastructure owns the platform's foundational technical substrate — the database engine, row-level security primitives, object storage, feature flags, migration discipline, and the connection-role conventions every tier consumes. It is the foundation of the strict upward dependency chain: Identity, Organisation, Governance, every Domain Service, every Surface, and every Extension all sit on top of it.

PC-1 is **domain-agnostic**: it owns no FringeIsland-specific concepts (no journeys, no universes, no narrative arcs). Its responsibility ends at primitives — how data is stored, how access is controlled, how schema evolves, how runtime configuration switches. The moment a question becomes "what does this mean in our world" (a journey step, a season, a Whisp), the responsibility has crossed into a Domain Service or higher.

PC-1 is **not the vendor**: Supabase and PostgreSQL are vendor substrate that PC-1 consumes. PC-1 owns the *platform-side wiring* — which extensions are enabled, what migration discipline holds, what RLS posture every table inherits, how SECURITY DEFINER is used, what feature-flag pattern downstream consumers rely on.

### 2. Concepts

| Entity | Definition | Persisted in |
|--------|-----------|--------------|
| Migration | A timestamp-ordered DDL change applied via the `supabase-cli.sh` workflow. Never rewritten after apply. | `supabase/migrations/{timestamp}_{name}.sql` |
| RLS policy | A row-visibility/mutation rule attached to a table, enforced by PostgreSQL on every query under non-bypass roles. | Inline DDL within a migration; per-table |
| SECURITY DEFINER function | A function executing with the definer's privileges rather than the caller's. Always declared with `search_path = ''` to prevent search-path attacks. | DDL within a migration |
| Trigger | A row-event handler used for validation patterns CHECK constraints can't express (cross-row, cross-table, subquery-bearing) and for audit-substrate hooks. | DDL within a migration |
| Storage bucket | A namespace for stored objects (files/blobs) provided by Supabase Storage; access governed by bucket-level policies analogous to RLS. | Supabase Storage |
| Storage object | An individual file/blob held inside a bucket; addressable, optionally signed-URL accessible. | Supabase Storage |
| Feature flag | A named runtime-configurable switch consulted by code to gate behaviour, with admin-side toggle surface. | A PC-1-owned `feature_flags` table (substrate; specific schema is L4) |
| Database extension | A PostgreSQL extension enabled at the project level (e.g. `pgcrypto`, `pg_trgm`); version-pinned. | Supabase project configuration; recorded in initial migration |
| Connection role | One of `anon`, `authenticated`, `service_role` (and any project-level roles); determines RLS evaluation context and bypass behaviour. | Supabase / PostgreSQL role definitions |
| Schema-history record | The applied-migration log that records which migrations have been replayed against the live database. | `supabase_migrations.schema_migrations` (Supabase-managed) |

### 3. Contract surface — what this area exposes and to whom

PC-1 is a special case (per template §3 note). Most of what it exposes is **not** a conventional API but a set of platform primitives — RLS helpers, escalation conventions, feature-flag accessors, migration discipline, trigger conventions, connection-role conventions. These primitives are consumed by every tier (Domain Services *and* Surfaces, via SQL or via Supabase client libraries). They are documented as primitives with their consumption pattern, not as endpoints.

#### Surface shape

- **Conventional API endpoints:** *None at this tier.* PC-1 capabilities are not consumed via HTTP. Domain Services that wrap PC-1 primitives (e.g. an admin endpoint to flip a feature flag) expose those endpoints from the Domain Service tier, not from PC-1.
- **SQL helpers and primitives:**
  - `is_platform_admin()` — minimal-body SECURITY DEFINER function used inside RLS policies for admin-level access (PG17 RLS gotcha — see §5). Owned by PC-1 because the convention and search-path discipline are PC-1's responsibility.
  - RLS-by-default discipline — every Platform Core table has an RLS policy from day one (no exceptions; ADR-U023, `platform/CLAUDE.md`).
  - `SECURITY DEFINER` template with `search_path = ''` — the canonical shape for any privilege-escalating function.
  - Feature-flag accessor (function or convention) consulted from SQL or app code to evaluate a flag.
  - Scheduled-job substrate (pg_cron) — the canonical scheduler convention for recurring database jobs (added 2026-06-10, DS-1 descent Phase 0). PC-1 owns the extension enablement, job naming conventions, and the discipline that sweep jobs honour consumer-declared guards; job definitions themselves are owned by the consuming area (e.g., PC-2's Shadow TTL sweep per ADR-U004/U027, which must honour the explicit-erase path and the mid-migration guard).
  - Trigger conventions — the patterns and naming for validation triggers and audit-substrate triggers. **Post-PC-4 codification (PC-1 amendment, 2026-05-16):** Finding #3 reframes from "trigger-as-primitive for audit-log writes" to "audit-write discipline mechanism-agnostic at substrate; three coexisting patterns at PC-4 with differing integrity properties: (a) SECURITY DEFINER direct-INSERT in admin RPC bodies (function-owner-controlled tamper-resistance; 5 disk sites); (b) SECURITY DEFINER trigger-mediated audit with admin-gating (function-owner-controlled tamper-resistance; 2 trigger functions); (c) anon-key client RLS-gated INSERT at UI tier (RLS-gated but field-content-trusted; 7 disk sites)" per PC-4 §L3 Step 2 C2-5. The trigger convention remains a PC-1 substrate primitive consumed by pattern (b); patterns (a) and (c) consume PC-1's SECURITY DEFINER discipline + RLS substrate respectively, not the trigger primitive.
- **Schema-level contracts:**
  - `feature_flags` table schema (columns, RLS posture) is a PC-1 contract consumed by every tier.
  - `supabase_migrations.schema_migrations` is Supabase-managed; consumed read-only by `doc-health-check` and operational tooling.
  - Storage bucket layout conventions (naming, access posture) are a PC-1 contract.

#### Operations

PC-1 has no conventional API operations. Operational primitives are consumed via SQL or via the Supabase client; their semantics are documented per primitive in §3 *Surface shape* above. Future contract additions that take API shape are flagged in §8.

### 4. Internal dependencies — strict upward-only chain

**PC-1 Infrastructure has *zero* internal Platform Core dependencies. It is the foundation.** This is load-bearing per `docs/platform/CLAUDE.md` ("Dependency direction is strictly one-way") and ADR-U023.

```
PC-1 Infrastructure ──► PC-2 Identity ──► PC-3 Organisation ──► PC-4 Governance
```

A capability in PC-1 that appears to depend on PC-2 / PC-3 / PC-4 is a structural error. Split the capability, move it out of PC-1, or surface in §8 Open questions. **The chain never reverses, ever.** Domain Services never appear as a dependency of PC-1; if a PC-1 capability seems to need something from a Domain Service, the design is wrong.

#### What this area depends on (within Platform Core)

| Upstream area | What this area consumes | Used for |
|---|---|---|
| *(none)* | — | PC-1 is the foundation |

#### What this area does NOT depend on

PC-1 must not depend on **any** other Platform Core area (PC-2 Identity, PC-3 Organisation, PC-4 Governance), **any** Domain Service, **any** Product, Studio, or Design System surface, **any** Extension. PC-1 may depend on external substrate (PostgreSQL, Supabase as vendor) and on the universal verticals (Administration / Privacy / Notifications / Observability / Transactions) only as obligation-direction (PC-1 *enables* vertical obligations rather than consuming from them — see §L3 External dependencies).

### 5. Storage & schema

PC-1 owns the platform's foundational schema patterns. This section is especially load-bearing per the template — substrate decisions here propagate to every table created in every other area.

- **RLS posture per table:** every Platform Core table has RLS, without exception (per `platform/CLAUDE.md`). Other tiers' tables also inherit RLS-by-default — this is a PC-1 discipline, not just a PC-1-table discipline.
- **Trigger-based validation patterns:** when validation requires subqueries or cross-table reads (PostgreSQL `CHECK` constraints can't), the validation moves to a trigger. Trigger naming and shape conventions are PC-1's responsibility.
- **SECURITY DEFINER functions:** every `SECURITY DEFINER` function is a privilege-escalation surface. Always declared with `search_path = ''` to prevent search-path attacks. The "why does this need elevation" justification is documented at the function definition.
- **Migration discipline:** migrations run in timestamp order; never rewrite an applied migration; the apply-then-mark-applied two-step (`apply-migration-temp.js` → `supabase-cli.sh migration repair --status applied`) is the canonical workflow per `platform/CLAUDE.md`.
- **PG17 RLS gotcha (operational):** complex PLPGSQL inside RLS policies fails silently in PostgreSQL 17. Use minimal-body `is_platform_admin()` for admin-level RLS; reserve `has_permission()` (which lives in PC-3 — see §8 Q1) for in-group checks where complexity is unavoidable, and validate every RLS policy under PG17 before promotion.
- **PC-1's own tables:** `feature_flags` (substrate; specific schema is L4). The schema-history table is Supabase-managed; PC-1 documents its read-only consumption pattern.

### 6. Authentication & authorization

PC-1 owns the **substrate** of auth and authorization, not the surface:

- **The RLS posture itself** — the convention that every table has RLS from day one, the policy primitives, the helper-function shape, the SECURITY DEFINER discipline.
- **`is_platform_admin()`** — minimal-body SECURITY DEFINER predicate consulted inside RLS for admin override. Lives at PC-1 because it is a substrate primitive consumed equally by PC-2, PC-3, PC-4, every Domain Service, and every Surface.
- **Connection-role conventions** — what `anon`, `authenticated`, and `service_role` are allowed to do; how RLS is evaluated under each; which operational paths legitimately use `service_role` and which do not. **Post-PC-3 two-tier reframe (PC-1 amendment, 2026-05-16):** PC-3 §L3 Step 2 C3-2 reframed the X5 service-role-escalation pattern (5 service-role-using sites / 6 createClient instances at PC-3 scope; three permissions gating the routes: `invite_members`, `enroll_group_in_journey`, `manage_all_groups`) from per-route-anti-pattern to **two-tier centralization** — Gap A substrate (service-role client construction) + Gap B auth-flow plumbing (JWT-verify + profile-resolve chains that distribute the substrate to call sites). The two-tier framing applies to X5 service-role-using sites equivalently to admin-tier sites (Finding #4); same structural shape, different invocation surface. PC-1's connection-role conventions stand as substrate; the two-tier centralization is downstream-of-PC-1 plumbing discipline (helper-introduction routed to FEAT-PC-* per Finding #4 disposition).

PC-2 Identity owns the auth **surface** itself (sign-in, sessions, the Journal). PC-3 Organisation owns the **permission resolution** surface (`has_permission(user_id, group_id, permission_name)`, role templates, group memberships). PC-4 Governance owns **platform-wide rules** (DeusEx, audit, moderation). PC-1 sits below all three; PC-1's auth concern ends at the substrate primitive.

For PC-1 capabilities specifically:
- Most PC-1 capabilities have no conventional auth surface (they are SQL primitives evaluated by RLS as part of a calling tier's query).
- Feature-flag admin-toggle, migration-apply, bucket-policy-edit, and extension-enable are operations restricted to `service_role` and / or `is_platform_admin()` — the substrate-administration permission band.
- No PC-1-specific permission bits (no PC-1-defined roles in the application sense). The connection-role conventions are PC-1's, but the user-facing role system is PC-3.

### 7. Stability posture

PC-1 sits at the highest blast-radius layer in the ecosystem. A change here propagates to every tier above. PC-1 is the area where "rare by design" is most strict.

| Aspect | This area's posture |
|---|---|
| **Change cadence** | Wave-boundary or ADR-required. Substrate changes (RLS conventions, SECURITY DEFINER patterns, migration workflow, connection-role posture, PG version upgrade) are wave-boundary events at minimum and frequently require an ADR. |
| **Triggers a change** | (a) Scale ceiling hit (e.g. RLS policy complexity exceeding PG17 silent-fail threshold); (b) security finding (e.g. SECURITY DEFINER audit revealing escalation gap); (c) PG version upgrade affecting RLS or trigger semantics; (d) Supabase major version with breaking primitives; (e) ADR superseding an existing PC-1 convention; (f) new vertical obligation requiring substrate-level enablement (rare). |
| **Review escalation** | ADR for any change to RLS-by-default discipline, the SECURITY DEFINER pattern, the migration workflow, connection-role conventions, or the feature-flag substrate. Migration-window planning required for any change to schema-level contracts that other tiers read directly. |
| **Default answer to "we want to change this"** | "Model it in a Domain Service or via the Extension System first." If the change genuinely belongs at substrate level (cannot be pushed up the chain), surface as an ADR-candidate rather than a feature spec. |
| **Deprecation pathway** | Substrate primitives are deprecated via versioned coexistence (old + new live in parallel for at least one wave) followed by migration window with explicit consumer notification. Hard-cutting a PC-1 primitive without a coexistence window is forbidden. |

A feature spec that proposes work in PC-1 must address this posture explicitly — what triggered the change, what review the change requires, what the deprecation pathway is. Features that don't address it fail DoR.

### 8. Open spec questions

L2-level questions surfaced during this cold derivation. Each is a candidate research spike, ADR, or boundary clarification.

- **Q1 — `has_permission()` ownership boundary.** Template §3 PC-1 note lists "the `has_permission()` family" among PC-1's primitives; template §6 names "the `has_permission(user_id, group_id, permission_name)` function lives [at PC-3]." Cold-derivation reads this as a partition: PC-3 owns the function's *content* (groups, memberships, role resolution); PC-1 owns the *function-shape convention* (SECURITY DEFINER + `search_path = ''`, minimal body for RLS-callable variants). This partition is implicit in the template and worth confirming explicitly. Surface as boundary question.
  - **Status (post-Step 2): Resolved by Finding #2.** Partition holds on disk: `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` defined at `20260222000000_rebuild_universal_group_pattern.sql:419` (PLPGSQL, SECURITY DEFINER, STABLE, `search_path = ''`); function content lives alongside groups/memberships/roles in PC-3 territory. PC-3 owns the content; PC-1 owns the shape convention. Pickup item issued to PC-3 (see §L3 *Step 3 — Adjudication outputs*).
- **Q2 — Notifications-vertical substrate ownership.** L1+L2 do not name a queue / delivery substrate. If notification delivery requires a substrate-level primitive (queue table, trigger-based dispatch), the candidate location is either PC-1 (substrate-only framing) or DS-5 Communication (domain-flavoured framing). Cold-derivation cannot place this. Surface as candidate ADR.
  - **Status (post-Step 2): Partially resolved by Finding #1.** Substrate exists on disk — `public.notifications` table at `20260222000000_rebuild_universal_group_pattern.sql:214` with trigger-based dispatch tightly coupled to PC-3's group-lifecycle events. Notifications-vertical absence in PC-1's L3 is therefore correct (the enablement currently lives at PC-3). **Open sub-question carried forward:** is canonical notification dispatch a PC-3 capability (group-event-coupled, current shape) or a DS-5 Communication capability (generic delivery substrate, would be re-platformed when DS-5 lands)? Adjudicated jointly between PC-3 and DS-5 when both run; pickup items issued to both.
- **Q3 — Audit-trigger substrate ownership boundary.** PC-4 Governance owns audit *content* (what gets audited, retention rules). PC-1 owns trigger *primitives*. The audit-trigger pattern itself sits on the boundary — is the canonical audit-trigger shape a PC-1 primitive or a PC-4-owned concrete trigger consuming PC-1 trigger conventions? Cold-derivation places it at PC-1 (substrate; the convention) but the boundary deserves explicit confirmation.
  - **Status (post-Step 2): Sharpened to confirmed by Finding #3.** Partition concrete on disk: `public.admin_audit_log` table at `20260222000000_rebuild_universal_group_pattern.sql:270`; access policies (`audit_log_select_admin`, `audit_log_insert_admin` at `20260223171200_fix_rc7_admin_user_ops.sql:74-80`) gate via `is_platform_admin()`. PC-1 owns trigger-as-primitive (the generic trigger convention); PC-4 owns audit-content + access-policy + retention. Pickup item issued to PC-4.
  - **Status (post-PC-4 codification; PC-1 amendment, 2026-05-16):** Finding #3 reframes from "trigger-as-primitive" to "audit-write discipline mechanism-agnostic at substrate; three coexisting patterns at PC-4 with differing integrity properties: (a) SECURITY DEFINER direct-INSERT in admin RPC bodies (function-owner-controlled tamper-resistance; 5 disk sites); (b) SECURITY DEFINER trigger-mediated audit with admin-gating (function-owner-controlled tamper-resistance; 2 trigger functions); (c) anon-key client RLS-gated INSERT at UI tier (RLS-gated but field-content-trusted; 7 disk sites)" per PC-4 §L3 Step 2 C2-5. PC-1's substrate role broadens accordingly: PC-1 owns the trigger primitive (consumed by pattern b) AND the SECURITY DEFINER discipline (consumed by patterns a and b) AND the RLS substrate (consumed by pattern c) — three coexisting consumption patterns of PC-1 substrate that produce three audit-write integrity profiles. PC-4 retains audit-content + access-policy + retention. Pre-D15 historical evidence (archive `20260220082112`): patterns (a) + (b) coexisted from origin; pattern (c) emerged later at UI-tier development.
- **Q4 — L2 framing assumption (sharpened by Step 2 stress-test).** Step 1 cold-derivation flagged this as **L2 line thinness**: the inventory line in `core/README.md` ("Supabase, PostgreSQL, RLS, Storage, feature flags") under-specifies the substrate scope; this derivation produced eight capabilities, several of which (privilege-escalation discipline, trigger-validation conventions, connection-role conventions, schema-management discipline) are not named in the line. **Step 2 stress-test sharpened the finding.** Cross-entity Finding #4 (secrets/credentials substrate is app-tier, not database-tier — see §L3 *Step 2 — code-informed stress-test findings*) reveals that the L2 framing carries an implicit **substrate-at-database-tier** assumption. A strengthened L2 line that adds more *database-side* primitives would still not surface app-tier substrate, because the framing itself is database-shaped. Two distinct revisions wanted, and they are not the same revision:
  - (a) **Line-level revision** (the original Q4): rewrite the L2 inventory line to name the broader **database-side** substrate scope. Suggested wording: "Supabase, PostgreSQL, RLS posture, SECURITY DEFINER discipline, trigger conventions, object storage, feature flags, connection-role conventions, migration discipline." This fix is independently useful even if (b) lands.
  - (b) **Framing-level revision** (the deeper finding): examine whether PC-1's substrate scope is genuinely database-only, or whether platform-level substrate that lives at the runtime tier (env vars, deployment config, Vercel/Supabase admin surfaces) belongs at PC-1, in a new sibling area, or outside Platform Core entirely. This is **not a line-wording fix**; it is a tier-shape question. Cross-references Finding #4's escalation path (Phase-2 close-out adjudication; candidate ADR; possible tier-shape revision).
  - **Status (post-PC-3 + post-PC-4 + Phase 2 close-out; PC-1 amendment, 2026-05-16):** Finding #4's escalation closed at destination 1 (Phase-2 close-out, commit `8976646`); the framing-level revision Q4(b) is **not** triggered. The reframe runs as **two-tier centralization within the existing ADR-U023 tier shape** (Gap A substrate + Gap B auth-flow plumbing across the existing app-tier surface) — not as PC-1 broadening to absorb runtime-env substrate, and not as a new platform-tier sibling area or tier-shape revision. The runtime-env substrate (Next.js / Vercel deployment env vars producing `process.env.SUPABASE_*`) remains at the runtime tier; PC-1's substrate scope remains database-tier; the two-tier centralization opportunity is in how PC-1's `lib/supabase/*` consumption pattern is plumbed across call-sites (`lib/admin/*`, `app/api/*`), not where the secrets themselves live. Q4(b) holds as a deferred framing question if future evidence reopens it — but Phase 2 close-out + PC-3/PC-4 stress-test evidence resolved the immediate substance without triggering it.
- **Q5 — Connection-role substrate vs. PC-2 Identity boundary.** PC-1 owns the conventions (`anon` / `authenticated` / `service_role`); PC-2 owns auth surface (sign-in producing the `authenticated` role). The boundary is clean in principle but contains a soft-edge: who owns the convention "what `service_role` is allowed to do operationally"? Cold-derivation places this at PC-1 (substrate), but PC-4 Governance also has a claim (platform-wide rules other services obey). Surface as boundary question.
  - **Status (post-Step 2): Sharpened by Finding #5.** Both fingerprints real on disk: `lib/supabase/server.ts` (service-role context), `lib/supabase/client.ts` (anon/authenticated context), `lib/supabase/middleware.ts` (session refresh). PC-1 owns role conventions; PC-2 owns session lifecycle producing the authenticated role. The PC-1/PC-4 soft-edge re "what `service_role` is allowed to do operationally" remains a sub-boundary — not blocked here, but surfaced for confirmation under PC-4's L3 derivation if PC-4 names governance-rule-shape for service-role usage. Pickup item issued to PC-2.
  - **Status (post-PC-3 two-tier reframe; PC-1 amendment, 2026-05-16):** The PC-1/PC-4 service-role soft-edge sharpened by PC-3 §L3 Step 2 C3-2 into **two-tier centralization** of the X5 anti-pattern (5 service-role-using sites / 6 createClient instances; three permissions: `invite_members`, `enroll_group_in_journey`, `manage_all_groups`). Gap A (substrate: service-role client construction) and Gap B (auth-flow plumbing) span PC-1 substrate + downstream call-sites. The reframe sits within ADR-U007's existing three-justification design rule for `service_role` usage, not as a new commitment — the two-tier framing is a refactoring opportunity (helper introduction at `lib/supabase/server.ts`, routed to FEAT-PC-* per Finding #4 disposition). The original PC-4 soft-edge ("governance-rule-shape for service-role usage") was not opened by PC-4 close beyond ADR-U007's pre-existing coverage; this amendment leaves the soft-edge closed.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above). L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section. Code-informed stress-test pass is held as Step 2 of the L3 derivation, downstream of this draft.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external, upstream PC only) | Vertical impact |
|---|---|---|---|---|
| **Schema management** | PC-1 | — | — *(none; PC-1 is foundation)* | Privacy *(RLS posture mandated for every new table)*; Observability *(migration log = audit substrate)*; Administration *(DDL is admin-only)* |
| **RLS substrate** | PC-1 | Schema management | — | Privacy *(the central enabler — every-table-RLS is the privacy posture)*; Administration *(`is_platform_admin()` for admin override)*; Observability *(RLS evaluation context inspectable for incident review)* |
| **Privilege-escalation discipline** | PC-1 | RLS substrate; Schema management | — | Privacy *(escalation is a privacy-bypass surface — must be auditable)*; Observability *(escalation use is logged)*; Administration *(only admin pathways legitimately escalate)* |
| **Trigger-based validation** | PC-1 | Schema management | — | Observability *(audit-substrate triggers consumed by PC-4)*; Privacy *(validation may enforce privacy invariants)* |
| **Object storage substrate** | PC-1 | RLS substrate *(bucket access mirrors RLS shape)* | — | Privacy *(object access control)*; Administration *(bucket administration)*; Transactions *(signed-URL lifecycle)* |
| **Feature-flag substrate** | PC-1 | Schema management *(flag table)*; RLS substrate *(flag-table RLS)* | — | Administration *(the central admin substrate — flag toggle is administrative)*; Observability *(flag-evaluation telemetry)* |
| **Scheduled-job substrate (pg_cron)** *(added 2026-06-10, DS-1 descent Phase 0 — closes the dangling PC-2 external-dependency cite "pg_cron cleanup mechanism per ADR-U004"; real-as-need — the ADR-U004 cleanup mechanism predates this row)* | PC-1 | Database-extension management *(pg_cron is an enabled extension)*; Schema management *(job definitions ride the migration discipline)* | — | Administration *(job creation/alteration is admin-gated)*; Observability *(job-run outcomes traceable — a silent sweep failure is an observability gap)*; Privacy *(TTL-erasure sweeps, e.g. the Shadow lifecycle per ADR-U027, ride this substrate)* |
| **Connection-role substrate** | PC-1 | RLS substrate *(role determines RLS evaluation)* | — | Privacy *(role posture determines privacy-invariant evaluation)*; Administration *(`service_role` is admin-only)* |
| **Database-extension management** | PC-1 | Schema management *(extensions enabled via initial migration)* | — | Observability *(extension version pinning produces deterministic incident reproduction)*; Administration *(extension enablement is admin-gated)* |

The **Vertical impact** column lists which of Administration / Privacy / Notifications / Observability / Transactions each capability touches. Verticals not touched are omitted. The rules each capability must satisfy per vertical live in the corresponding vertical's `SPECIFICATION.md` (§L3 Obligation inventory).

**Notifications vertical absent from PC-1 capability impacts.** Cold-derivation against L1+L2 produced no PC-1 capability touching Notifications. If notification delivery requires substrate-level primitives, this is the boundary question flagged in §8 Q2 — the substrate either lives at PC-1 (and a capability is missing here) or at DS-5 Communication (and the absence here is correct). Step 2 stress-test against `supabase/migrations/` and `app/` will likely produce signal on this.

### Dependency chain

Within-PC-1 dependency order — capabilities become buildable in this order:

1. **Schema management** — foundation. Migration discipline, DDL workflow, extension enablement. Nothing depends on anything here being settled first.
2. **RLS substrate** — depends on Schema management (RLS policies are DDL).
3. **Trigger-based validation** — depends on Schema management (triggers are DDL). Independent of RLS substrate.
4. **Privilege-escalation discipline** — depends on Schema management (SECURITY DEFINER functions are DDL) and on RLS substrate (escalation is RLS-bypass; the primitive's shape is co-defined with RLS posture).
5. **Connection-role substrate** — depends on RLS substrate (role determines RLS evaluation context).
6. **Database-extension management** — depends on Schema management (extensions enabled via the initial migration).
7. **Object storage substrate** — depends on RLS substrate (bucket access mirrors RLS shape).
8. **Feature-flag substrate** — depends on Schema management (flag table) and RLS substrate (flag-table RLS).
9. **Scheduled-job substrate (pg_cron)** — depends on Database-extension management (pg_cron enablement) and Schema management (job definitions ride the migration discipline).

Cross-area dependencies are **none** — PC-1 has no upstream within Platform Core.

### External dependencies

Capabilities PC-1 consumes from upstream Platform Core areas: **none**. PC-1 is the foundation; the strict chain (§4) forbids upward dependencies for it.

PC-1's "external dependencies" at this tier take the inverted form noted in the template — Platform Core is the *enabler* for vertical obligations rather than a consumer of them. The verticals that depend on PC-1 enablement:

- **Privacy** depends on PC-1's RLS substrate, privilege-escalation discipline, object-storage access control, connection-role substrate, and scheduled-job substrate (TTL-erasure sweeps per ADR-U027).
- **Administration** depends on PC-1's feature-flag substrate, connection-role substrate (`service_role`), schema-management workflow, and extension-management gate.
- **Observability** depends on PC-1's migration-log substrate, trigger-based validation hooks, privilege-escalation logging, and feature-flag evaluation telemetry.
- **Transactions** depends on PC-1's PostgreSQL substrate (ACID, transactional correctness) and on object-storage signed-URL lifecycle for transactional file operations.
- **Notifications** — see §8 Q2; PC-1's enabling role here is the open question.

### Sources-status block

Cold-derivation prerequisite-check remarks:

- **Source: L1 tier authority (`docs/platform/CLAUDE.md`).** Adequate for cold derivation; tier identity, stability zones, one-way dependency, blast-radius framing all clearly stated.
- **Source: L2 inventory (`docs/platform/core/README.md`, "PC-1 Infrastructure" line).** Thin and database-shaped — see §8 Q4 (sharpened by Step 2). Derivation proceeded under the move-and-correct disposition; both line-level and framing-level revisions captured as pending.
- **Source: ADR-U023.** Adequate; Core / Domain decomposition, contract boundaries, dependency direction, vertical-cross-cutting framing all stated.
- **Source: PRODUCTS_AND_PLATFORM.md (G-27 staleness).** **Not consulted.** Per the Phase 2 entry decision: G-27 stays on the gaps register, addressed if/when it bites real Phase 2 work, not pre-emptively. Neither Step 1 nor Step 2 required it.
- **Source: lateral routing for cross-entity findings (G-29 unresolved).** PC-1 is the first Phase 2 entity, so Step 1 cold-derivation produced no incoming cross-entity findings to route. Step 2 stress-test produced four *outgoing* lateral findings (notifications-to-PC-3-or-DS-5, has_permission-PC-1/PC-3-partition, audit-trigger-PC-1/PC-4-partition, connection-role-PC-1/PC-2-partition) plus one finding (Finding #4 — secrets/credentials substrate) that does **not** fit G-29's lateral-routing shape. G-29's pressure-test material is now real; resolution mechanism deferred to Step 3 adjudication or to a downstream G-29 resolution session.
- **Source: ECOSYSTEM_ANATOMY_V4.svg.** Not consulted; ADR-U023 textual decomposition was sufficient.
- **Step 2 sources consulted:** `supabase/migrations/` (19 migration files plus `archive/`), `supabase/config.toml` (absent — no extension-config file present), `lib/supabase/{client,middleware,server}.ts`, `lib/{admin,auth,notifications,email,supabase}/` (top-level listing), `app/api/{admin,invitations,v1}/` (top-level listing), references to `process.env`/`SUPABASE_*` across `lib/` and `app/`. Code reading was substrate-pattern-level (counts, primitive presence, naming) — not feature-deep. Sufficient for the three-class output below.

*No status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see L4 (deferred) and G-20.*

### Step 2 — code-informed stress-test findings

Stress-test pass run 2026-05-04 against `supabase/migrations/` (19 files; 38 `CREATE TABLE`; 64 `ENABLE ROW LEVEL SECURITY`; many `SECURITY DEFINER`; zero `CREATE EXTENSION`) and `lib/`, `app/api/` top-level. Three-class output below. The §L3 capability table above is preserved unmodified as the cold-derivation artifact; reconciliation of any reshape lands in Step 3 adjudication, not here.

#### Class 1 — Confirms (cold derivation matches disk)

| Cold capability | Disk evidence | Notes |
|---|---|---|
| **Schema management** | 19 timestamp-ordered migrations under `supabase/migrations/`; rewritten earlier migrations preserved under `migrations/archive/` rather than overwritten in place. | The `archive/` subdir is *behavioural* evidence of the never-rewrite-applied discipline — disk-visible, not just docs-asserted. |
| **RLS substrate** | 64 `ENABLE ROW LEVEL SECURITY` instances against 38 tables. `is_platform_admin()` defined at `20260223171200_fix_rc7_admin_user_ops.sql:30` as **simple-SQL SECURITY DEFINER** (not PLPGSQL) specifically to satisfy the PG17 RLS gotcha — migration comment names the gotcha and the design fix exactly as cold L2 §5 names them. | Strong confirm. The PG17 framing is not aspirational; the migration history shows a real PG17 incident and the fix is preserved as the canonical pattern. |
| **Privilege-escalation discipline** | Many `SECURITY DEFINER` functions; consistent `SET search_path = ''` across them; migration comments document the legitimate-elevation reason per function (PG17 RLS recursion, group-to-group RBAC). | Confirm. The discipline is operational, not documented-only. |
| **Trigger-based validation** | Trigger-based notification dispatch, group-membership immutability triggers, hard-delete leader-bypass trigger, session-variable bypass pattern. The `20260224205639_fix_hard_delete_leader_trigger_bypass` migration is itself evidence that trigger semantics are first-class platform concern. | Confirm. |
| **Connection-role substrate** | RLS policies consistently use `TO authenticated` (e.g. `20260223171200_fix_rc7_admin_user_ops.sql:75`); `lib/supabase/{client,middleware,server}.ts` encodes Next.js anon/authenticated/service_role split conventions. | Confirm. Substrate is real and consumed at app-tier through the lib/supabase wrappers. |

#### Class 2 — Entity-internal delta (cold-derived shape needs revision; stays in PC-1)

| Cold capability | Disk evidence | Reshape signal |
|---|---|---|
| **Database-extension management** | Zero `CREATE EXTENSION` statements anywhere in migrations. No `supabase/config.toml` present. Standard extensions (pgcrypto, uuid generation) appear to be auto-enabled by Supabase rather than declared in code. | **Bouncing-partner watch-item #1 confirmed.** Not a distinct PC-1 capability in current shape — vendor-managed and absorbed under Schema management. Step 3 adjudication should fold this into Schema management or split-and-rename it as "Database-vendor configuration substrate" (which would also house any future explicit-extension-enable migrations). Cold-derivation got the granularity wrong. |
| **Object storage substrate** | Zero hits for `storage.from`, `createBucket`, `bucket_id`, `storage_buckets` across `supabase/migrations/`, `lib/`, `app/`. Supabase Storage may be wired at vendor level, but the codebase contains no usage convention or bucket-policy declaration. | Cold-derived as a concrete capability; disk shows it is **not yet exercised**. Two reshape options for Step 3: (a) demote to a placeholder capability flagged "not yet established" (still PC-1 territory, awaits first usage), or (b) defer the capability entirely until a feature triggers it. Either way, the cold-derived shape (buckets, signed URLs, object access control) is hypothetical, not grounded. |
| **Feature-flag substrate** | Zero `feature_flag*` hits in migrations, `lib/`, or `app/`. No flag-evaluation code, no flag table, no flag accessor function. | Same shape as Object storage — cold-derived without implementation. The capability is real-as-need but absent-in-code. Step 3 should mark this as a placeholder pending first feature-flag-using feature, OR reframe as a future-PC-1 obligation rather than a present capability. |

The three Class-2 deltas share a shape: cold-derived from L2 authority but **not yet exercised** in code. This validates the L2 inventory's *aspirational* shape (the L2 line is not wrong) while showing the L3 capability set should distinguish *exercised-on-disk* from *not-yet-exercised-but-named-at-L2*. The three-class output (confirms / delta / cross-entity) does not currently distinguish "wrong-shaped on disk" from "not yet exercised on disk" — both collapse into Class 2. This is a methodology-refinement signal, logged as A-candidate "Latent vs. delta distinction" (see session bridge); the spec carries the observation but does not resolve it.

#### Class 3 — Cross-entity findings (capability or surface belongs elsewhere)

These findings will land in the destinations named below when those entities' L3 derivations run, OR when G-29's lateral routing mechanism resolves. Captured here, with destination cross-references, until then. **Finding #4 is structurally distinct from the other four** — its escalation path is named separately in #4's body; do not collapse #4 into G-29's lateral-routing shape.

1. **Notifications substrate exists, but it lives in PC-3 territory, not PC-1.** Resolves §8 Q2.
   - Disk: `public.notifications` table created at `20260222000000_rebuild_universal_group_pattern.sql:214`; trigger-based dispatch at lines 978+ ("Notification Trigger Functions"); RLS enabled at line 1430. Inserts into `public.notifications` happen from triggers tied to group lifecycle events (membership change, group rebuild).
   - **Finding:** notification dispatch as currently implemented is **tightly coupled to PC-3 Organisation's universal-group-pattern**. The substrate is not generic; it is group-event-shaped. The Notifications-vertical absence in PC-1's L3 capability table is correct — Notifications-vertical enablement currently lives at PC-3, not PC-1.
   - **Open boundary question (lateral):** is the canonical notification dispatch a **PC-3 capability** (group-event-coupled, current shape) or a **DS-5 Communication** capability (generic delivery substrate; current shape would be re-platformed when DS-5 lands)? Cold-derivation cannot adjudicate; defer to PC-3 L3 derivation (Phase 2, third entity) and DS-5 L3 derivation (Phase 3).
   - **Route to:** PC-3 Organisation pickup list AND DS-5 Communication pickup list.

2. **`has_permission()` ownership confirms cold-derivation's partition.** Resolves §8 Q1.
   - Disk: `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` defined at `20260222000000_rebuild_universal_group_pattern.sql:419`. Group-to-group RBAC. Migration comment: "8a. has_permission() — THE core RBAC check, now group-to-group." Lives alongside groups, memberships, roles in the same file.
   - **Finding:** the function content is unambiguously PC-3 Organisation territory. PC-1's role is the **shape convention** (SECURITY DEFINER + `search_path = ''` + STABLE marker + plpgsql vs simple-SQL choice for RLS-callable variants). The partition cold-derivation suggested holds: **PC-3 owns the function; PC-1 owns the convention.**
   - **Route to:** PC-3 Organisation pickup list (confirm under PC-3's L3 — and document the partition explicitly in PC-3's L2 §6 when PC-3 runs).

3. **Audit-trigger substrate is the PC-1/PC-4 partition cold-derivation predicted.** Sharpens §8 Q3.
   - Disk: `public.admin_audit_log` table created at `20260222000000_rebuild_universal_group_pattern.sql:270`; RLS policies `audit_log_select_admin` and `audit_log_insert_admin` (at `20260223171200_fix_rc7_admin_user_ops.sql:74-80`) gate access via `public.is_platform_admin()`. The audit *table* and *access policies* live at admin-level governance; the *trigger primitive* that inserts audit records is a generic trigger pattern (PC-1 substrate).
   - **Finding:** the partition is concrete on disk. PC-1 owns trigger-as-primitive; PC-4 owns audit-content-and-access-policy. Boundary holds.
   - **Route to:** PC-4 Governance pickup list (table ownership, retention, access-policy shape).
   - **Post-PC-4 codification (PC-1 amendment, 2026-05-16):** PC-4 §L3 Step 2 C2-5 codifies the audit-write surface as **three coexisting patterns at PC-4 with differing integrity properties**: (a) SECURITY DEFINER direct-INSERT in admin RPC bodies (function-owner-controlled tamper-resistance; 5 disk sites); (b) SECURITY DEFINER trigger-mediated audit with admin-gating (function-owner-controlled tamper-resistance; 2 trigger functions); (c) anon-key client RLS-gated INSERT at UI tier (RLS-gated but field-content-trusted; 7 disk sites). The original PC-1 framing of "trigger-as-primitive" reads cleanly as historical record but understated the substrate scope: the audit-write discipline is **mechanism-agnostic at PC-1**, and three distinct PC-1 substrate consumption patterns produce three distinct audit-write integrity profiles. PC-1's contract widens accordingly — trigger primitive consumed by pattern (b); SECURITY DEFINER discipline consumed by patterns (a) and (b); RLS substrate consumed by pattern (c). Pre-D15 historical evidence (archive `20260220082112`) shows patterns (a) + (b) coexisted from origin; pattern (c) emerged at UI-tier development. PC-4 retention of audit-content + access-policy holds; the PC-1/PC-4 partition is unchanged in shape, only sharpened in substance.

4. **Secrets/credentials substrate is app-tier, not database-tier.** Resolves bouncing-partner watch-item #2.
   - **Disk:** Zero `vault`, `secret`, `encrypted_secret`, `api_key` in migrations. `process.env`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` consumed at `lib/admin/admin-users-query.ts`, `lib/supabase/{client,middleware,server}.ts`, `app/api/admin/users/route.ts`, `app/api/invitations/send-email/route.ts`, `app/api/v1/journeys/{enrollments,[id]/enroll}/route.ts`, `app/dev/dashboard/page.tsx`, `app/error.tsx`.
   - **Finding:** platform-level secrets (Supabase service role, Supabase URL, third-party credentials for email) are managed via **Next.js / runtime environment variables**, not a database substrate. The substrate is **above the database tier**. PC-1 (cold-derived as database substrate) does not own secrets in the current shape.
   - **Structural difference (load-bearing — do not collapse).** Findings #1, #2, #3, #5 are *lateral* — they route to sibling entities (PC-2, PC-3, PC-4, DS-5) within the existing Platform Core / Domain Services decomposition. **Finding #4 has no clean lateral destination.** It does not fit any current Platform Core area; the Domain Service tier is the wrong shape (Domain Services consume *from* Core, they do not own runtime-env conventions); and it cannot route to a Surface (the Hub already consumes the env vars, but secret *conventions* aren't Hub-product responsibility). The substrate is real and consumed daily on disk, but the existing entity inventory has no home for it. This is what makes Finding #4 a tier-shape question, not a routing question.
   - **Escalation path (preserved explicitly).** Three named destinations; each is independently load-bearing and none is collapsible into G-29's lateral-routing mechanism:
     1. **Phase-2 close-out adjudication.** When Phase 2 closes (PC-1 through PC-4 L1→L3 complete), the secrets-substrate question revisits with three other entities' L3 work as additional evidence. Phase-2 close-out is the natural inflection point — three more L3 derivations may surface adjacent app-tier substrate signals (e.g. PC-2 Identity may surface session-storage conventions; PC-4 Governance may surface admin-tooling secrets) that change the picture.
     2. **Candidate ADR.** A possible new ADR proposing one of: (a) PC-1 broadens to "platform substrate including runtime env"; (b) a new platform-tier sibling area is named (e.g. PC-5 Runtime, or Platform Core / Domain Services / **Runtime** as a third stability zone); (c) the secrets substrate is explicitly out-of-Platform-Core scope and named as a Hub-product or Vercel-deployment responsibility with a contract back to Platform Core.
     3. **Possible tier-shape revision.** If the adjudication concludes the existing Platform Core / Domain Services shape cannot accommodate runtime-env substrate, ADR-U023's tier shape itself is the candidate for revision — adding a runtime-tier sibling, or restructuring Core's scope. This is the most consequential of the three escalation outcomes; named explicitly so it is not pre-foreclosed by the lighter options (1) and (2).
   - **Methodology refinement adjacent.** This finding is also load-bearing input to A-candidate "Tier-shape findings need a different escalation path than G-29's lateral routing mechanism handles" — see session bridge for ledger.
   - **Post-PC-3 + post-PC-4 two-tier reframe (PC-1 amendment, 2026-05-16):** PC-3 §L3 Step 2 C3-2 sharpened the substance from a single tier-shape question to a **two-tier centralization framing** — Gap A (substrate: service-role client construction) + Gap B (auth-flow plumbing: JWT-verify + profile-resolve chains that distribute the substrate to call sites). PC-3 surfaced 5 service-role-using sites / 6 createClient instances at PC-3 scope; three permissions gate the routes (`invite_members`, `enroll_group_in_journey`, `manage_all_groups`). PC-4 §L3 Step 2 C3-2 anchored the framing at PC-4 scope: PC-4 contributes 2 of the 5 X5 sites (`lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`); identical Gap A + Gap B patterns. **Concrete centralization opportunity:** introducing a `lib/supabase/server.ts` admin-tier helper would close BOTH Gaps at PC-4 simultaneously. Sub-class refinements: intra-file duplication at lib-tier (2 isAdmin checks per file); single-chain-multi-branch at route-tier (1 Gap B chain serves 2 query paths). Phase 2 close-out (commit `8976646`) Item 5 routed both the framing reframe AND the helper-introduction disposition to this PC-1 amendment. **Helper-introduction disposition (this amendment):** routed to FEAT-PC-* feature spec (specific feature ID TBD when authored); spec text records the framing reframe + names the helper-introduction opportunity at `lib/supabase/server.ts` + cross-references the receiving FEAT-PC-* for the downstream code work. Write-at-amendment was considered and declined per amendment-no-code default discipline (helper touches 5 sites across PC-1, PC-3, PC-4 scope — feature-spec-shaped work, not amendment-shaped work). The original three-destination escalation path (Phase 2 close-out adjudication; candidate ADR; possible tier-shape revision) is closed at destination 1: Phase 2 close-out adjudicated the substance into PC-1 amendment-list rather than promoting to ADR or tier-shape revision; the two-tier framing is an in-spec refactoring opportunity within ADR-U023's existing tier shape, not a new architectural commitment.

5. **Connection-role substrate has both PC-1 and PC-2 fingerprints on disk.** Sharpens §8 Q5.
   - Disk: `lib/supabase/server.ts` creates Supabase clients consuming `SUPABASE_SERVICE_ROLE_KEY` (escalated context); `lib/supabase/client.ts` creates browser clients (anon/authenticated context); `lib/supabase/middleware.ts` handles session refresh (auth context). Per cold-derivation's partition, the **conventions** ("what each role is allowed to do operationally") are PC-1; the **session lifecycle** producing the authenticated role is PC-2.
   - **Finding:** the partition holds; both fingerprints are real. Cold-derivation's framing is correct.
   - **Route to:** PC-2 Identity pickup list (claims session lifecycle and authenticated-context handoff).
   - **Post-PC-3 X5 two-tier reframe (PC-1 amendment, 2026-05-16):** PC-3 §L3 Step 2 C3-2 stress-tested the same `lib/supabase/*` substrate at PC-3 scope and surfaced X5 anti-pattern: **5 service-role-using sites / 6 createClient instances** with three permissions gating the routes (`invite_members`, `enroll_group_in_journey`, `manage_all_groups`). Reframed as **two-tier centralization** — Gap A substrate (service-role client construction; PC-1 substrate consumed via `lib/supabase/server.ts`) + Gap B auth-flow plumbing (JWT-verify + profile-resolve chains; downstream call-site discipline). The two-tier framing applies equivalently to admin-tier sites (Finding #4): same Gap A + Gap B structural shape, different invocation surface. PC-4 §L3 Step 2 C3-2 anchored at PC-4 scope (PC-4 contributes 2 of 5 X5 sites). The Finding #5 PC-1/PC-2 partition itself is unchanged; the X5 reframe is downstream-of-substrate plumbing discipline, routed via Finding #4 helper-introduction → FEAT-PC-* feature spec.

#### Phase-wide observations (passing — not Class 1/2/3 against PC-1)

- **The codebase's database substrate is dominated by PC-3 Organisation work.** The single largest migration (`20260222000000_rebuild_universal_group_pattern.sql`, ~2000 lines) carries groups, memberships, role templates, has_permission, notifications, audit log, member invitations, immutability triggers — all under one rebuild. Subsequent migrations (sprint0 through sprint4, plus the rc7 admin-ops fix) almost all touch group/membership/permission shape.
- **No PC-1-only migration exists.** PC-1 substrate concerns are applied as discipline within Identity/Organisation/Governance migrations rather than as distinct PC-1 outputs. This is consistent with PC-1's primitives-not-features framing — but it means PC-1 has no migration history to attribute "ownership" against, only convention compliance to verify.
- **Migration sprint suffixes (`sprint0_security_fixes`, `sprint1_foundation_schema`, etc.) suggest a pre-current-methodology authoring rhythm.** Not a PC-1 concern; flagged for `doc-health-check` consideration as a possible terminology-archaeology candidate.

### Step 3 — Adjudication outputs

Adjudication run 2026-05-04 against the Step 2 findings. Outputs land in two places: pickup lists below (for receiving entities' L3 derivations) and resolution markers in §8 above (Q1, Q2, Q3 resolved; Q5 sharpened; Q4 separately revised through Adjustment 1). **Finding #4 is held outside both channels** — its escalation path (Phase-2 close-out adjudication / candidate ADR / possible tier-shape revision) is named in #4's body and program-level visibility is surfaced via the session-bridge ledger so #4 carries forward across sessions independent of any single spec being read.

#### Pickup lists

When each receiving entity's L3 derivation runs, the L3 author reads the relevant pickup list as part of their authority chain (alongside L1+L2+ADR-U023+template). Each item names: the source finding, the expected addressee work, and the shape (confirm partition / claim ownership / resolve boundary).

**PC-2 Identity** (Phase 2, second entity)

| Source | Expected work | Shape |
|---|---|---|
| Finding #5 — Connection-role substrate (`lib/supabase/{client,server,middleware}.ts`) | Claim ownership of session lifecycle and authenticated-context handoff. PC-1 retains role conventions ("what each role is allowed to do operationally"); PC-2 owns the session-lifecycle surface that produces the authenticated role. Document the partition explicitly in PC-2's L2 §6 when PC-2 runs. The PC-1/PC-4 soft-edge re service-role governance posture is not in PC-2's scope. | Claim ownership |

**PC-3 Organisation** (Phase 2, third entity)

| Source | Expected work | Shape |
|---|---|---|
| Finding #1 — Notifications substrate (`public.notifications` + group-event-coupled triggers in `20260222000000_rebuild_universal_group_pattern.sql`) | Resolve PC-3-vs-DS-5 boundary for canonical notification dispatch. The current implementation is group-event-coupled; decision is whether dispatch is a **PC-3 capability** (ratify current shape; Notifications-vertical enablement permanently lives at PC-3) or a **DS-5 capability** (re-platform when DS-5 lands; PC-3 retains group-event hooks but DS-5 owns delivery substrate). Adjudicated **jointly** with DS-5 — neither entity decides alone. | Resolve boundary (joint with DS-5) |
| Finding #2 — `has_permission()` ownership (`20260222000000_rebuild_universal_group_pattern.sql:419`) | Confirm partition: PC-3 owns the function content (groups, memberships, role resolution); PC-1 owns the SECURITY DEFINER + `search_path = ''` + STABLE shape convention. Document the partition explicitly in PC-3's L2 §6 when PC-3 runs. | Confirm partition |

**PC-4 Governance** (Phase 2, fourth entity)

| Source | Expected work | Shape |
|---|---|---|
| Finding #3 — Audit-trigger substrate (`public.admin_audit_log` + `audit_log_select_admin` / `audit_log_insert_admin` policies) | Claim ownership of `public.admin_audit_log` table, audit-content schema (what gets audited, retention rules), and access policies (gated via `is_platform_admin()`). PC-1 retains trigger-as-primitive (the generic trigger convention that audit triggers consume). Document the partition explicitly in PC-4's L2 §5/§6 when PC-4 runs. **Post-PC-4 codification (PC-1 amendment, 2026-05-16):** PC-4 §L3 Step 2 C2-5 reframes the audit-write surface as three coexisting patterns at PC-4 with differing integrity properties (SECURITY DEFINER direct-INSERT × 5 + SECURITY DEFINER trigger-mediated × 2 + anon-key client RLS-gated INSERT × 7); PC-1's substrate role widens to trigger primitive + SECURITY DEFINER discipline + RLS substrate as the three coexisting consumption surfaces. PC-4 ownership of audit-content + access-policy + retention holds; partition shape unchanged. See §L3 Step 2 Finding 3 augment for full disk-anchor citations. | Claim ownership + confirm partition (codification post-PC-4 close) |
| Finding #5 carry — service-role governance soft-edge | Decide whether "what `service_role` is allowed to do operationally" is governance content (PC-4 names rules that other services obey) or substrate convention (stays at PC-1). Not blocking; surfaced for resolution if PC-4 names governance-rule-shape for service-role usage. **Post-PC-3 X5 two-tier reframe (PC-1 amendment, 2026-05-16):** PC-3 §L3 Step 2 C3-2 reframed the X5 anti-pattern (5 service-role-using sites / 6 createClient instances; three gating permissions) as two-tier centralization — Gap A substrate + Gap B auth-flow plumbing. PC-4 close did NOT name new governance-rule-shape for service-role usage beyond ADR-U007's pre-existing three-justification design rule; the soft-edge stays at substrate convention (PC-1) with the two-tier centralization opportunity routed to FEAT-PC-* (helper introduction at `lib/supabase/server.ts`). PC-4 close confirmed the substance via PC-4 §L3 Step 2 C3-2 (PC-4 contributes 2 of 5 X5 sites). | Resolve sub-boundary (closed at substrate; X5 routed via Finding #4) |

**DS-5 Communication** (Phase 3, when Domain Services L1→L3 runs)

| Source | Expected work | Shape |
|---|---|---|
| Finding #1 — Notifications substrate (joint with PC-3) | Resolve PC-3-vs-DS-5 boundary jointly with PC-3. If DS-5 claims canonical notification dispatch, the current PC-3-coupled implementation re-platforms when DS-5 lands. If DS-5 declines (dispatch stays PC-3), document why and what DS-5's communication-flavoured concerns *are* (per `domain/README.md`: DM, forums, activity feeds). | Resolve boundary (joint with PC-3) |

#### Items not in any pickup list

- **Finding #4 — Secrets/credentials substrate.** No clean lateral destination across Platform Core / Domain Services / Surfaces. Escalated via #4's three-destination escalation path (Phase-2 close-out adjudication / candidate ADR / possible tier-shape revision). **Surfaced separately to the session-bridge ledger** so #4 carries forward across sessions; does not travel through pickup lists.
  - **Status (PC-1 amendment, 2026-05-16):** Closed at escalation destination 1 (Phase-2 close-out adjudication, commit `8976646`). The substance reframed from "single tier-shape question" to "two-tier centralization (Gap A substrate + Gap B auth-flow plumbing)" via PC-3 §L3 Step 2 C3-2 + PC-4 §L3 Step 2 C3-2 anchoring at PC-4 scope. Phase 2 close-out routed framing reframe + helper-introduction disposition to PC-1 amendment-list; this amendment lands the framing reframe at §L3 Step 2 Finding 4 augment + routes helper-introduction substance (concrete `lib/supabase/server.ts` admin-tier helper that would close both Gaps at PC-4) to FEAT-PC-* feature spec. Escalation destinations 2 (candidate ADR) + 3 (tier-shape revision) NOT exercised — the two-tier framing is a refactoring opportunity within ADR-U023's existing tier shape, not a new architectural commitment.
- **L4 reconciliation.** Deferred per Phase 2 = L1→L3 scope.
- **G-29's resolution mechanism itself.** Not in scope here. The four lateral findings (#1, #2, #3, #5) accumulate as G-29 pressure-test material; pickup lists above substitute for G-29's lateral routing until G-29 resolves.

#### Carry-forward to receiving entity authors

Each receiving entity's L3 author reads PC-1's spec (specifically §L3 *Step 2 — code-informed stress-test findings* + this §L3 *Step 3 — Adjudication outputs* subsection) before deriving against L1+L2+ADR-U023. The pickup-list table for that entity is the authoritative summary; the Step 2 findings body is the disk-evidence backing. If a receiving entity's cold-derivation produces a different read on the partition or boundary, that is signal — surface as a counter-finding rather than over-riding the pickup item silently.

#### Step 3 amendments (PC-1 amendment, 2026-05-16)

**Disposition statement.** This amendment session folds three findings from four source bridges (PC-1 entity close `2026-05-04_01` + PC-3 close `2026-05-14_02` + PC-4 close `2026-05-15_03` + Phase 2 close-out `2026-05-16_01`) into the canonical PC-1 spec via twelve augment-in-place Phase 1 Edits across §3 / §6 / §8 / §L3 Step 2 / §L3 Step 3 plus this Phase 2 sub-section. The original PC-1 derivation-time framings for Findings #3 (trigger-as-primitive) and #4 (secrets/credentials substrate is app-tier with three-destination escalation) are preserved verbatim as historical record; bold-labeled trailing sub-clauses append the post-PC-3 / post-PC-4 / post-Phase-2-close-out reframings at each anchor. Helper-introduction substance for Finding #4 is adjudicated as **route-to-FEAT-PC-* feature spec** (specific feature ID TBD when authored); spec text records the framing reframe + names the helper-introduction opportunity at `lib/supabase/server.ts` admin-tier helper that would close both Gaps A + B at PC-4 simultaneously. Phase 3 lands zero ADR amendment commits per provisional-zero stance: Finding #3 three-pattern is implementation discipline not architectural decision; Finding #4 two-tier framing is refactoring opportunity within ADR-U023's existing tier shape; X5 reframe sits within ADR-U007's pre-existing three-justification design rule.

**Q-resolution slate.**

| Q | Finding | Disposition | Disk anchor |
|---|---|---|---|
| Q3 (post-Step 2 status) | Finding #3 — Audit-write three-pattern codification | Resolved | §8 Q3 status augment + §L3 Step 2 Finding 3 augment + §L3 Step 3 PC-4 pickup row Finding #3 augment; PC-4 §L3 Step 2 C2-5 |
| Q4(b) (framing-level revision) | Finding #4 — Two-tier centralization within ADR-U023 tier shape | Resolved (Q4(b) NOT triggered — runtime-env stays at runtime tier) | §8 Q4(b) status augment + §L3 Step 2 Finding 4 augment + §L3 Step 3 "Items not in any pickup list" Finding #4 status; PC-3 §L3 Step 2 C3-2 + PC-4 §L3 Step 2 C3-2 + Phase 2 close-out commit `8976646` Item 5 |
| Q5 (post-Step 2 status; service-role soft-edge sentence) | X5 two-tier centralization reframe | Resolved (closed at substrate convention; X5 routed via Finding #4) | §6 Connection-role conventions augment + §8 Q5 status augment + §L3 Step 2 Finding 5 augment + §L3 Step 3 PC-4 pickup row Finding #5 carry augment; PC-3 §L3 Step 2 C3-2 |

No new Q opened; the three findings settle existing Qs.

**Cross-section amendment summary.**

| Edit # | Section | Finding | Shape | Anchor |
|---|---|---|---|---|
| #1 | Frontmatter | n/a (housekeeping) | replacement | `last_updated: 2026-05-04` → `2026-05-16` |
| #2 | §3 Contract surface — Trigger conventions bullet | Finding #3 | augment-in-place (ii) Historical-record | trailing sub-clause appended |
| #3 | §8 Q3 post-Step 2 status | Finding #3 | augment-in-place (ii) | new bullet under existing Status |
| #4 | §L3 Step 2 Finding 3 (Class 3 Audit-trigger substrate) | Finding #3 | augment-in-place (ii) | new bullet appended at end of finding entry |
| #5 | §L3 Step 3 PC-4 Governance pickup row Finding #3 | Finding #3 | augment-in-place (ii) | trailing sub-clause in Expected work cell |
| #6 | §L3 Step 2 Finding 4 (Class 3 Secrets/credentials substrate) | Finding #4 | augment-in-place (ii) | new bullet appended at end of finding entry |
| #7 | §L3 Step 3 "Items not in any pickup list" Finding #4 entry | Finding #4 | augment-in-place (ii) | new bullet under existing entry |
| #8 | §8 Q4(b) cross-reference to Finding #4 escalation | Finding #4 | augment-in-place (ii) | new bullet under existing Q4(b) |
| #9 | §6 Auth & authz — Connection-role conventions paragraph | X5 reframe | augment-in-place (ii) | trailing sub-clause appended |
| #10 | §8 Q5 post-Step 2 status (service-role soft-edge sentence) | X5 reframe | augment-in-place (ii) | new bullet under existing Status |
| #11 | §L3 Step 2 Finding 5 (Connection-role substrate) | X5 reframe | augment-in-place (ii) | new bullet appended at end of finding entry |
| #12 | §L3 Step 3 PC-4 pickup list Finding #5 carry — service-role governance soft-edge | X5 reframe | augment-in-place (ii) | trailing sub-clause in Expected work cell |
| #13 | §L3 Step 3 — this sub-section | n/a (Phase 2) | append (b.i.2) preserve + append | new sub-section appended under existing Step 3 — Adjudication outputs |

Twelve Phase 1 Edits + one Phase 2 Edit (this sub-section) = thirteen atomic Edits in the spec amendment commit.

**Pickup list.**

- **Helper-introduction substance** — `lib/supabase/server.ts` admin-tier helper that would close both Gap A (substrate: service-role client construction) + Gap B (auth-flow plumbing: JWT-verify + profile-resolve chains) at PC-4 simultaneously (per Finding #4 PC-4-scope anchor). Routed to **FEAT-PC-* feature spec** (specific feature ID TBD when authored). Helper introduction is downstream code work touching call-sites at PC-1 + PC-3 + PC-4 scope (5 service-role-using sites for X5 + 2 admin-tier sites for Finding #4); feature-spec-shaped work, not amendment-shaped work per amendment-no-code default discipline. Receiving FEAT-PC-* spec authoring deferred until product-cycle work prioritises it; not blocking DS-1 entry.
- **No mid-fold-back findings discovered** at Phase 1 fold-back work that warrant routing to next downstream entity. See closing bridge §13 prompt #3 for the full record.

**New Sources-status entries** (extending PC-1's existing bullet-list Sources-status block format; PC-1 does not carry numbered SS-N entries per pre-template authoring).

- **Amendment-time addition (PC-1 amendment, 2026-05-16): Audit-write three-pattern codification record.** PC-4 §L3 Step 2 C2-5 codified the audit-write surface as three coexisting patterns with differing integrity properties: (a) SECURITY DEFINER direct-INSERT in admin RPC bodies (function-owner-controlled tamper-resistance; 5 disk sites); (b) SECURITY DEFINER trigger-mediated audit with admin-gating (function-owner-controlled tamper-resistance; 2 trigger functions); (c) anon-key client RLS-gated INSERT at UI tier (RLS-gated but field-content-trusted; 7 disk sites). Pre-D15 historical evidence (archive `20260220082112`): patterns (a) + (b) coexisted from origin; pattern (c) emerged at UI-tier development. Finding #3 reframe folded into PC-1 spec at §3 + §8 Q3 + §L3 Step 2 + §L3 Step 3 anchors; PC-1 substrate role widens to trigger primitive + SECURITY DEFINER discipline + RLS substrate as three coexisting consumption surfaces; partition shape (PC-1 substrate / PC-4 audit-content + access-policy + retention) unchanged.
- **Amendment-time addition (PC-1 amendment, 2026-05-16): Two-tier centralization framing record.** PC-3 §L3 Step 2 C3-2 sharpened Finding #4 from "single tier-shape question" (PC-1 entity-close framing with three-destination escalation: Phase 2 close-out adjudication / candidate ADR / possible tier-shape revision) to "two-tier centralization within ADR-U023 tier shape" (Gap A substrate + Gap B auth-flow plumbing). PC-3 surfaced 5 service-role-using sites / 6 createClient instances at PC-3 scope; three permissions gate the routes (`invite_members`, `enroll_group_in_journey`, `manage_all_groups`). PC-4 §L3 Step 2 C3-2 anchored at PC-4 scope: PC-4 contributes 2 of 5 X5 sites (`lib/admin/admin-users-query.ts` + `app/api/admin/users/route.ts`); identical Gap A + Gap B patterns. Phase 2 close-out commit `8976646` Item 5 routed framing reframe + helper-introduction disposition to PC-1 amendment-list; this amendment lands the framing reframe at §L3 Step 2 Finding 4 + §L3 Step 3 "Items not in any pickup list" + §8 Q4(b); helper-introduction substance routed to FEAT-PC-*. X5 two-tier centralization reframe folded equivalently at §6 + §8 Q5 + §L3 Step 2 Finding 5 + §L3 Step 3 PC-4 pickup row Finding #5 carry. Escalation destinations 2 (candidate ADR) + 3 (tier-shape revision) NOT triggered.
- **Amendment-time addition (PC-1 amendment, 2026-05-16): Methodology observation — third-instance spec-amendment template stress-test.** This amendment is the third instance of `docs/templates/spec-amendment-session.md` post-revision (first: PC-2 amendment `cc-pc2-amendment.md` at commit `b2181ed`; second: PC-3 amendment `cc-pc3-amendment.md` at commit `4f68400`). Largest source-bridge enumeration to date (four chronological bridges spanning twelve days: 2026-05-04 PC-1 close → 2026-05-14 PC-3 close → 2026-05-15 PC-4 close → 2026-05-16 Phase 2 close-out). Eleven cumulative template revisions exercised (PC-2 amendment seven landed at `70cbd15` + PC-3 amendment four landed in template content). §13 capture in closing bridge carries third-instance-stress-test framing — see closing bridge §Methodology data points for full report.

---

## L4 — Feature inventory summary

*Deferred. Phase 2 scope is L1→L3 only (per the program-shape decision 2026-05-03). L4 reconciliation against `docs/platform/core/features/` will land in a later phase. The §L4 section is intentionally absent from this draft so the empty-section pattern doesn't masquerade as "no features owned by PC-1."*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level. See `docs/platform/CLAUDE.md` for the platform-tier obligations this template encodes. See `docs/planning/sessions/2026-05-03_05_-_REFRAME-A-AS-PARALLEL-ARTIFACT.md` and the session opened 2026-05-03 for the program-shape decisions framing this derivation.*
