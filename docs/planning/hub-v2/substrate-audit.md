# Hub v2 — substrate audit

**Status:** v1, 2026-06-17 (Phase 1, deliverable 2). Living — corrected by the build-informed spec-evolution loop ([PROCESS §9](../PROCESS.md)).
**Plan:** [Hub v2 README](./README.md) · **Decision:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md) · **Companion deliverables:** the refreshed [Hub SPECIFICATION](../../products/hub/SPECIFICATION.md) (deliverable 1) and `./behaviour-inventory.md` (deliverable 3, pending).

> **What this is.** ADR-U030 keeps the **database substrate (schema, functions, RLS) as the asset we carry forward**, while the app/API/frontend are rebuilt fresh. This audit tags every realized substrate object *conformant / adapt / replace* against the reconciled canon and the refreshed Hub §L3, so Phase 2/3 know what carries, what changes, and what's missing.

---

## Method & provenance

- **Source of truth = the realized substrate**, read from the live `FringeIslandDB` project (`jveybknjawtvosnahebd`, Postgres 17) via catalog queries — the **net** state after all 19 migrations + 5 seed files apply, not the raw cumulative CREATE counts (the schema has a `drop_old_schema` → `rebuild_universal_group_pattern` lineage, so raw counts — 38 tables / 143 functions / 180 policies — overcount; net is 19 / 51 / 55).
- **Disciplines applied** (from [`ecosystem-decomposition`](../../../.claude/skills/ecosystem-decomposition/SKILL.md)): cumulative-forward read order; **seeds directory in canonical reads** (the 44-row permission catalog, system groups, sentinel wiring live in `supabase/seeds/`, not migrations); **schema-predates-partition (PW-1)** — the monolith predates the U023 PC/DS cut, so partition mismatches are *temporal, not defects*; **Step-1 realization claims need a disk anchor** — "pg_cron cleans up" is recorded as **unrealized** because pg_cron is absent from `pg_extension`.
- **Evidence depth:** verified at the level of table inventory, column shapes, function signatures, policy names/commands, installed extensions, and key data values. **Not** every function body or policy `USING` clause was read — per-object internal review rides with each area's Phase-3 build. Deferrals are flagged, not silent.

### Tag definitions

| Tag | Meaning |
|---|---|
| **Conformant** | Carries forward to v2 as-is. Aligns with the reconciled canon and the refreshed Hub §L3. (A fresh API contract layer will still be built *above* it — API-first, U009 — but the object itself is sound.) |
| **Adapt** | The right asset, but diverges from canon in a fixable way. Carry forward with a defined modification (re-key, externalise content, rename, partition-tag). |
| **Replace** | Scaffolding v2 should not carry as-is — rebuild/supersede; or **build-new** where the canon requires something the substrate lacks. |

---

## Headline findings

1. **The substrate is strikingly canon-true and carries forward wholesale.** Domain tables are consistently **group-keyed** — `actor_group_id`, `author_group_id`, `recipient_group_id`, `enrolled_by_group_id`, `created_by_group_id` — so **D15 (no `user_id` in domain tables) is already honored**. The only `user`-named column anywhere is `users.auth_user_id`, the correct anchor of the **P-O1 four-hop actor chain** (`auth.uid()` → `users.auth_user_id` → `users.id` → `users.personal_group_id`). `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` is the **exact** canon contract. Every table has RLS enabled. This validates the U030 thesis: *the violations live in the app tier, not the database.*
2. **The Mist lifecycle (U004/U031) is unrealized — the single biggest substrate gap.** `users` models signed-up FIMs only: there is **no `is_temporary`/Mist flag**, and **pg_cron is not installed**, so the ephemeral-data cleanup U031 describes has **no realization**. This is *exactly* the problem U031's Context states. → **build-new** (see Gaps).
3. **Inline journey content is the one clear table-level `adapt`.** `journeys.content jsonb` holds step content inline (`journey_type` is only `'predefined'`); canon (DS-4 Content blocks) externalises it. The 8 predefined journeys + `professional_pathfinders` seed embody the pre-canon model. → **adapt** (journeys table + journey seeds).
4. **Partition-crossing is temporal, not a defect (PW-1).** The 19 tables span PC-2/PC-3/PC-4 and DS-3/DS-5 cleanly by concern; no ADR amendment or migration split is implied — Phase 3 realizes each service's contract *over* the existing tables.
5. **DS reciprocation handoff.** The refreshed Hub §L3 left external-dependency claims "reciprocation pending"; with the 7 DS L3 inventories now existing, the substrate side of that reconciliation is captured here per-table (owning service column) and routed to G-29 where a contract gap exists.

---

## Tables (19) — all RLS-enabled

Grouped by owning service per the U023 partition (PW-1: the table predates the cut; the column names the *future* owner).

### PC-2 Identity

| Table | Owner | Tag | Rationale |
|---|---|---|---|
| `users` | PC-2 | **Adapt** | Core identity, group-anchored (`personal_group_id`), display-name system (`nickname`, `display_preference`, `show_real_name`), account state (`is_active`, `is_decommissioned`). Sound — but models FIMs only; **adapt to add the Mist identity state** (U031) and an ephemerality path. |

### PC-3 Organisation (universal group pattern, U006/U007)

| Table | Owner | Tag | Rationale |
|---|---|---|---|
| `groups` | PC-3 | **Conformant** | Universal group entity (personal/engagement/system). Group-keyed throughout. |
| `group_memberships` | PC-3 | **Conformant** | Group-to-group memberships (8 policies — the richest RLS surface: bootstrap/invite/accept/leave/remove/admin). Honors U006. |
| `group_roles` | PC-3 | **Conformant** | Per-group role instances. |
| `group_role_permissions` | PC-3 | **Conformant** | Layer-3 of the permission model (377 rows realized). |
| `user_group_roles` | PC-3 | **Conformant** | Actor↔role binding. Name says "user" but it is **group-keyed** (no `user_id` column) — D15-clean despite the legacy name; a rename is cosmetic, defer. |
| `role_templates`, `role_template_permissions` | PC-3 | **Conformant** | Layer-1/2 templates (seed-defined). |
| `group_templates`, `group_template_roles` | PC-3 | **Conformant** | Group archetype templates (seed-defined). |
| `permissions` | PC-3 | **Conformant** | The 44-row permission catalog (seed-defined; read-only RLS). The stable contract product code branches on. |
| `pending_email_invitations` | PC-3 | **Conformant** | Non-FIM invite-by-email (Hub MEM-2). Group-keyed. |

### PC-4 Governance

| Table | Owner | Tag | Rationale |
|---|---|---|---|
| `admin_audit_log` | PC-4 | **Conformant** | `actor_group_id`-keyed immutable-style audit (insert+select-admin only). Carries forward. **U028 note:** the *viewer* over this table routes to the Console; the table itself is unaffected (app-tier placement, not substrate). |

### DS-3 Journeys

| Table | Owner | Tag | Rationale |
|---|---|---|---|
| `journeys` | DS-3 | **Adapt** | Group-authored (`created_by_group_id`), publish flags, enrollment-ready. **Adapt:** `content jsonb` is inline step content — canon moves it to **DS-4 Content blocks**; `journey_type='predefined'` is pre-canon vocabulary. |
| `journey_enrollments` | DS-3 | **Conformant** | Group-enrolled (`group_id`, `enrolled_by_group_id`), `status` + `progress_data`, frozen-state-ready. The enrollment model itself is canon-true; the *content* it points at is the adapt above. |

### DS-5 Communication (+ V3 Notifications)

| Table | Owner | Tag | Rationale |
|---|---|---|---|
| `conversations` | DS-5 | **Conformant** | DM conversation container. |
| `direct_messages` | DS-5 | **Conformant** | 1-1 messaging. |
| `forum_posts` | DS-5 | **Conformant** | `author_group_id`-keyed; `parent_post_id` present but threading is enforced flat (see `enforce_flat_threading`). Moderation + own-edit policies. |
| `notifications` | DS-5 / V3 | **Conformant** | `recipient_group_id`-keyed; smart/actionable (`action_type`, `action_data`, `action_taken`, `expires_at`). Strong V3 surface. |

---

## Functions (51) — grouped by concern

Almost all are `SECURITY DEFINER` (the RLS-first + PostgREST-RPC contract pattern, A#9). Tagged by group; specifics called out.

| Group | Functions | Tag | Notes |
|---|---|---|---|
| **Permission machinery (PC-3)** | `has_permission`, `get_user_permissions`, `can_assign_role`, `get_group_id_for_role`, `get_permission_name`, `copy_template_permissions_on_role_create`, `auto_grant_permission_to_deusex` | **Conformant** | The canon three-layer contract (U007). `has_permission` signature is exact. |
| **Actor resolution (P-O1)** | `get_current_personal_group_id`, `get_current_user_profile_id` | **Conformant** | The four-hop chain anchor functions. |
| **Identity / user lifecycle (PC-2)** | `handle_new_user`, `handle_user_deletion`, `sync_personal_group_display_name`, `enforce_personal_group_id_immutability`, `validate_user_group_role` | **Adapt** | Sound for FIMs; **no anonymous/Mist onboarding path** — `handle_new_user` assumes a signed-up auth user. Adapt to admit the Mist state (U031). |
| **Membership lifecycle (PC-3)** | `is_active_group_member`, `is_invited_group_member`, `is_group_creator`, `group_has_leader`, `leave_group`, `auto_assign_member_role_on_accept`, `auto_assign_deusex_role_on_accept`, `prevent_last_leader_removal`, `prevent_last_deusex_role_removal`, `prevent_last_deusex_membership_removal`, `get_group_member_counts` | **Conformant** | Invariants (last-leader, last-DeusEx) and lifecycle are canon-true. |
| **Stewardship / succession** | `nominate_steward`, `_handle_stewardship_nomination_action` | **Conformant** | Hub MEM-7 leadership transfer. |
| **Admin ops (PC-4 / A-ADM)** | `admin_decommission_user`, `admin_exit_user_from_platform`, `admin_hard_delete_user`, `admin_update_user_status`, `admin_force_logout`, `admin_send_notification`, `audit_admin_membership_change`, `audit_admin_message_send`, `is_platform_admin`, `enforce_decommission_invariant` | **Conformant** | Admin acting on members by `target_user_id` is acceptable (admin domain). **U028:** several feed Console-routed surfaces (audit viewer, flags) — a Phase-3 placement decision, not a substrate change. |
| **Notifications / triggers (DS-5 / V3)** | `handle_notification_action`, `notify_group_deleted`, `notify_invitation_accepted`, `notify_invitation_declined_or_member_change`, `notify_invitation_received`, `notify_role_assigned`, `notify_role_removed` | **Conformant** | Event-driven notification fan-out. DS-5/V3 territory (PW-1). |
| **Messaging (DS-5)** | `is_conversation_participant`, `can_update_conversation`, `update_conversation_last_message_at`, `enforce_flat_threading` | **Conformant** | DM + forum mechanics; flat-threading is a deliberate design choice. |
| **Journeys (DS-3)** | `is_enrolled_in_journey`, `is_journey_enrollable` | **Conformant** | Enrollment gates; the *content* adapt lives on the `journeys` table, not here. |
| **Utility** | `update_updated_at_column` | **Conformant** | Generic `updated_at` trigger. |

**Function tally:** 47 conformant · 6 adapt (the PC-2 identity-lifecycle group, pending Mist admission) · 0 replace.

---

## RLS policies (55 across 19 tables)

**Layer tag: Conformant.** Every table has RLS enabled; the pattern is uniform and canon-true (V4 RLS-first): read/write split by command, permission-gated via `has_permission`/membership helpers, admin paths separated (`*_admin`), bootstrap paths isolated (`memberships_insert_bootstrap`). Reference/seed tables expose read-only `auth_read_*` policies. No policy grants direct table mutation outside the permission model.

Per-table policy sets (by command) are catalogued in the query record; richest surfaces are `group_memberships` (8) and `journey_enrollments` (6). **Scoping decision (not a silent cap):** policy `USING`/`WITH CHECK` clauses were **not** individually re-derived in this audit — each policy's internal correctness is re-verified when its table's area is rebuilt in Phase 3 (TDD seeded from the behaviour inventory). No policy is tagged *replace* on current evidence; the Mist gap (below) will *add* policies, not rewrite existing ones.

---

## Seeds (5 files, 554 lines)

| File | Tag | Rationale |
|---|---|---|
| `01_permissions.sql` | **Conformant** | The 44-row permission catalog — PC-3 canon authority; the stable contract surface. |
| `02_role_templates.sql` | **Conformant** | Layer-1/2 role templates. |
| `03_group_templates.sql` | **Conformant** | Group archetypes. |
| `04_system_groups.sql` | **Conformant** (vocabulary *adapt*) | The 4 system groups: `DeusEx` (root-admin), `FringeIsland Members` (Tier-1 baseline), `[Deleted User]` (sentinel author for content reassignment), and `Visitor` — all canon-aligned (U019/U028 DeusEx). **Adapt:** `Visitor` + its `Guest` role are a *vestigial pre-canon Mist shell* (no lifecycle behind them — see [behaviour-inventory](./behaviour-inventory.md) + the Mist gap below); rename to **Mist** on build. (`FringeIsland Journeys`, which owns the predefined journeys, is an *engagement* group, not a system group.) |
| `05_professional_pathfinders.sql` | **Adapt** | Bootstrapped predefined-journey content (Journey Studio + DS-3/DS-4 authority). Carries forward, but its inline-content shape adapts with the `journeys.content` externalisation. |

---

## Gaps & build-new (canon requires; substrate lacks)

| Gap | Canon | Disposition |
|---|---|---|
| **Mist identity state** | U004, U031 | **Build-new.** `users` has no `is_temporary`/Mist flag; `handle_new_user` assumes signed-up auth. Add the Mist state + the atomic Mist→FIM transcendence (consent capture, continuity) the refreshed §L2 §3 / IDN-2 now specify. |
| **Mist data ephemerality (TTL / erase-on-close)** | U031 | **Build-new.** **pg_cron is not installed** (`pg_extension` has no `pg_cron`); there is no scheduled cleanup. The TTL/inactivity threshold is a Privacy-vertical / PC-2 config (deferred by design) but the *mechanism* is absent. |
| **Journey content as DS-4 blocks** | DS-4 | **Adapt** (tracked above) — externalise `journeys.content`. |
| **DS reciprocation of Hub external-dep claims** | DS-1..DS-7 L3 | The substrate confirms the consumer side for DS-3/DS-5/PC-2/PC-3/PC-4. Open contract gaps (per Hub §L3, routed to **G-29**): PC-2 per-device session inventory + remote-sign-out (IDN-11) — `admin_force_logout` exists but no member-facing session inventory; PC-3 transitive group-of-groups depth>1 (MEM-10); DS-6 Discovery surfaces (all of A-DIS) — **no DS-6 substrate exists** (consistent with §L2 not-yet-consumed). |
| **AI Mentor / Whisp (A-COI)** | DS-1, DS-7 | No substrate — consistent with §L2 not-yet-consumed; out of Ferd scope. |

---

## Tally & handoff to Phase 2

- **Tables:** 16 conformant · 3 adapt (`users`, `journeys`, + the journey-content model) · 0 replace.
- **Functions:** 47 conformant · 6 adapt (PC-2 identity-lifecycle, pending Mist admission) · 0 replace.
- **RLS:** layer conformant; deep per-policy review deferred to per-area Phase-3 builds.
- **Seeds:** 4 conformant · 1 adapt.
- **Build-new:** Mist state + ephemerality (the only substantial substrate-side new work for Ferd).

**Bottom line for the walking skeleton (Phase 2):** the substrate is a load-bearing asset — stand the v2 API-first layering *over it unchanged* for the identity/auth bootstrap, using `has_permission` and the four-hop actor as-is. The only substrate work that can't wait is the Mist state (admit it in `users` + onboarding) — and even that is additive. Everything else is conformant carry; the engineering value really does live here, exactly as ADR-U030 argued.

---

*Per-object query records (table/function/policy inventories) were produced 2026-06-17 against `jveybknjawtvosnahebd`. Re-run the catalog queries in this file's Method section to refresh.*
