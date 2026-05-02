# CLAUDE.md — Platform tier

**Applies to:** anything under `docs/platform/` and the corresponding backend code (API routes under `app/api/`, Supabase migrations, RLS policies, SQL functions, shared services).
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → `core/README.md` or `domain/README.md` depending on scope → the feature spec.
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to platform-tier work.

---

## What makes this tier different

Platform is the **strictest tier** in the ecosystem. Everything above it — products, studios, design system — depends on what the platform provides. A broken contract here breaks every surface at once. A missing RLS policy here leaks data across every product. A schema change made without review propagates to every migration every contributor runs. The blast radius is the whole system.

Platform work splits into two stability zones (ADR-U023): **Platform Core** (Infrastructure, Identity, Organisation, Governance) changes rarely and is reviewed heavily; **Platform Domain** (seven services + Extension System) changes more often but within stable contract boundaries. The dependency direction is strictly one-way: Domain depends on Core; Core never depends upward on Domain. Products and studios depend on the Platform API; they never bypass it to touch the database directly.

*This framing lives at tier because it's intra-tier sibling content — describing the relationship between Core and Domain, owned by neither alone. The five-row content policy in root [`CLAUDE.md`](../../CLAUDE.md) names tier-level content as including cross-tier relationships; intra-tier sibling relationships are the same shape of content (a relationship between architectural units the file is responsible for) and extend the policy's coverage by analogous reading. Platform is the only tier in the ecosystem that currently has sub-tiers, so this question only arises here — the policy's silence on intra-tier sibling relationships isn't a gap, it's the policy correctly not over-specifying for a case that appears at one tier. §"Rules that only apply at this tier" carries the operational consequence — "Dependency direction is strictly one-way" — for the same reason and at the same level.*

Platform work is almost always paired with work at another tier — a platform capability is specified and built to be consumed by a product, studio, or extension. Platform features that nothing consumes are a smell.

---

## Verticals: obligations on this tier

The five verticals (ADR-U002) are obligations on every tier. Here's what each requires specifically when you're working at the platform tier. Every feature spec's Vertical Impact section must address all five — address each or mark "None" with rationale (AGENTS.md, always-do).

- **Administration** — Every lifecycle event (soft-delete, role change, platform exit, content retirement) has a complete cascade specification before implementation (ADR-U016). Cascades document what happens at every layer — Platform Core, each Domain Service, and each vertical. Database triggers and RLS policies do the heavy lifting; application code does not patch layer-by-layer. Platform Core exposes admin primitives; products wrap them in role-specific affordances.
- **Privacy / GDPR** — Every table that holds FIM data has RLS. Every SQL function that reads FIM data runs with least privilege (`SECURITY DEFINER` only when strictly required, always with `search_path = ''`). Every API endpoint that returns FIM data filters at the platform level — never return over-broad results and expect the product to filter. Consent state is authoritative in Platform Core; other tiers ask, they don't infer.
- **Notifications** — Notifications are triggered by events at every layer, not just Communication. The platform emits notification triggers; the Communication service routes them; products surface them. A platform feature that changes FIM-visible state without emitting a notification trigger is incomplete. Trigger design is part of the feature spec, not an afterthought.
- **Observability** — Every API route emits structured logs with request ID, actor, and outcome. Every RLS denial is recorded (not silently returned as empty). Every migration is traceable (applied timestamp, applied-by, repair status). Platform errors are observability events — no swallowed failures, no silent fallbacks. If you can't trace a bug back to its origin from logs alone, instrumentation is missing.
- **Transactions** — Stripe integration, entitlement resolution, and receipt handling live here — never in products. Entitlements are queried through the Platform API; products never inspect transaction state directly. Webhook handlers are idempotent (Stripe retries) and authenticated (signature verification is mandatory, not optional).

---

## Rules that only apply at this tier

- **New tables require RLS policies — without exception.** A migration that adds a table without RLS fails DoD. This includes junction tables, audit tables, and "internal-only" tables — RLS protects against mistakes in application code, so it matters most when you think it doesn't.
- **Schema changes set task status to `review`, not `done`.** Human approval is required before schema-touching work ships. This includes adding columns, changing types, adding indexes, changing RLS policies, and adding triggers. The reviewer checks the migration + its RLS impact + the cascade specification.
- **Every significant lifecycle event needs a cascade spec before implementation (ADR-U016).** Soft-delete, role change, platform exit, content retirement, membership changes — these ripple through every tier. Write the cascade first; the cascade identifies incomplete foundations before code gets written.
- **Dependency direction is strictly one-way.** Domain Services may depend on Platform Core; Platform Core never imports from Domain Services. Breaking this rule creates circular dependencies in SQL functions that PG17 silently miscompiles. When `DEPENDENCIES.md` exists, it's the reference; until then, apply the principle.
- **Contract changes trigger ADRs.** Changing the signature or semantics of a Platform API or Internal API endpoint is an architectural decision. Write the ADR before the change — not after. ADRs are append-only (ADR-U023 supersedes U001; it doesn't edit U001).
- **API versioning is mandatory from day one (ADR-U015).** Every API route lives under `/api/v1/...`. Breaking changes introduce `/api/v2/...`; old versions are maintained until all clients migrate. Retrofitting versioning is expensive; adding it is free.
- **Never hardcode role names in SQL or application code.** Use `has_permission(user_id, group_id, permission_name)` (ADR-U007). Role templates exist so groups can customise; hardcoded checks break that customisation silently.

---

## Gotchas (tier-specific)

- **SECURITY DEFINER discipline.** SECURITY DEFINER functions run with the privileges of the function owner, not the caller — they bypass RLS by design. Use them as helper primitives only (small bodies, narrow purpose), never to mutate user-owned data on a user's behalf. Always declare `SET search_path = ''` so the function's resolution can't be hijacked by a search-path-injection vector. Every new SECURITY DEFINER function is a privilege-escalation surface — document in the migration comment why it needs the elevation.
- **SECURITY DEFINER + RLS + subqueries = recursion trap.** If SQL function F queries table T and F is used in T's SELECT policy, the policy evaluation re-enters F, which queries T again, which evaluates the policy — infinite recursion. The fix is to mark F as `SECURITY DEFINER` so it bypasses RLS on T. The discipline above (SECURITY DEFINER as a privilege-escalation surface) still applies; this is one of the legitimate use cases.
- **PG17 RLS silently drops complex PLPGSQL.** Admin RLS that used to work with `has_permission()` may fail in PG17 when the function body is too complex. Use `is_platform_admin()` (SECURITY DEFINER, minimal body) for admin-level RLS and save `has_permission()` for in-group checks. Split RLS helpers by complexity ceiling: simple-bodied SECURITY DEFINER for admin checks, more complex bodies for non-RLS contexts.
- **PostgREST INSERT…RETURNING evaluates both INSERT and SELECT policies.** When PostgREST returns the inserted row (the default behaviour with `INSERT…RETURNING`), the row must pass both the INSERT policy (to be created) and the SELECT policy (to be returned). A row that inserts successfully but fails the SELECT policy results in a "row created, can't read it back" failure mode that's hard to diagnose. Include the creator's identity check in the SELECT policy so newly-inserted rows survive their own return trip.
- **`DROP POLICY IF EXISTS` with a wrong name silently succeeds.** Policy names are case-sensitive and unforgiving; `DROP POLICY IF EXISTS "users_select_policy"` against a policy actually named `users_select` runs cleanly without error and leaves the old policy active. Migration code that drops-and-recreates a policy under a renamed identifier is the canonical way this bites — the new policy lands alongside the old one, both apply, and the resulting RLS behaviour is whatever the more-permissive of the two yields. Verify policy names before dropping; better still, query `pg_policies` first.
- **Migrations run in timestamp order — don't rewrite a past migration.** Add a new one that corrects it. Editing an applied migration creates divergence between environments that's painful to unwind and contradicts the audit-trail purpose of the migration log.
- **Trigger-based validation over CHECK constraints.** PostgreSQL CHECK constraints can't contain subqueries; many real validations need them ("this row's FK must be in a specific subset," "this value must not conflict with any other row's value"). Reach for a `BEFORE INSERT OR UPDATE` trigger that raises on violation — don't try to simulate it in application code, where a concurrent write can slip past the check.
- **API routes authenticate via the `Authorization: Bearer <jwt>` header.** Don't try to read auth state from cookies in API-route handlers — cookie shape varies by client (the Hub uses `@supabase/ssr` chunked cookies; future clients may not), and the route shouldn't have to know its caller's cookie format. The contract is: the caller obtains the JWT and passes it explicitly via the `Authorization` header on the fetch; the route reads it from there. This keeps the route surface uniform across web, mobile, and any future client.
- **Timestamps: Postgres serialises `+00:00`, JS expects `Z`.** Postgres' `timestamp with time zone` columns serialise to ISO-8601 with the literal `+00:00` UTC offset; JavaScript's `Date` parsing produces strings with the `Z` shorthand. String-equality comparisons across the boundary fail even when the moments are identical. Compare as `new Date(value).getTime()` (numeric epoch milliseconds), or normalise both sides to one shape before comparing — never compare the raw ISO strings.

---

## Where to go next

- **Feature ID prefixes at this tier:** `PC` (Platform Core), `PD` (Platform Domain). See `core/README.md` and `domain/README.md`.
- **Sub-areas:** [`core/`](./core/) (Infrastructure, Identity, Organisation, Governance) · [`domain/`](./domain/) (World Model, Narrative Engine, Experience Engine, Content, Communication, Discovery, Intelligence, Extension System) · [`extensions/`](./extensions/) (Extension System contracts).
- **Cross-service dependencies:** `DEPENDENCIES.md` (pending, T4.1) will hold the dependency table. Until written, apply the one-way rule (Domain → Core, never reverse) and check the Internal API contract in the service spec.
- **Relevant ADRs:** U002 (five verticals) · U006 (universal group pattern) · U007 (three-layer permission model) · U009 (API-first) · U015 (API versioning) · U016 (cascade specification first) · U023 (Platform Core / Domain Services decomposition) · U024 (wave model semantics).
- **Relevant skills:** [`feature-development`](../../.claude/skills/feature-development/SKILL.md) when implementing a maturity-4 feature; [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing or advancing a spec.
- **Sibling tier CLAUDE.md files:** [`../products/CLAUDE.md`](../products/CLAUDE.md) (when a product feature pairs with platform work) · [`../studios/CLAUDE.md`](../studios/CLAUDE.md) (when a Studio writes to the Domain Service you're working on).
