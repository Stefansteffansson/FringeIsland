# CLAUDE.md — The Hub

**Applies to:** anything under `docs/products/hub/` and the corresponding code (the Next.js application that *is* the Hub — `app/`, `components/`, `lib/` — for as long as the Hub is the primary application in the monorepo).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (products tier) → **this file** → [`README.md`](./README.md) → [`DESCRIPTION.md`](./DESCRIPTION.md) and the relevant section of [`SPECIFICATION.md`](./SPECIFICATION.md) → the feature spec.
**Reads as a delta.** Assumes root and products-tier `CLAUDE.md` are already loaded. Contains only what's specific to the Hub.

---

## What makes this entity different

The Hub is the Safe Harbour made tangible — a Next.js web application served from Vercel, talking to Supabase through a deliberately narrow surface. It is currently the primary application in the FringeIsland monorepo: when you read `app/`, `components/`, or `lib/` at the repo root, you are reading Hub code. That coincidence is convenient now and will end as soon as the Gimbal lands; until then, "Hub" and "the running web app" are the same thing in practice but never in principle. Code organisation that conflates the two leaks the Hub's stack into the rest of the system.

The Hub is also a consumer surface in the strictest sense — the tier rule "API-first, no exceptions" is fully load-bearing here, with the Hub's only direct Supabase contacts being auth and the two specific realtime channels named below.

---

## Rules that only apply at this entity

- **The Hub's tech stack is Hub's, not the products tier's.** Next.js 16.1 with App Router, TypeScript strict-mode, Tailwind CSS, Supabase client SDK. Sibling products (Gimbal, Game) will not be Next.js — Gimbal is native iOS + native Android per ADR-defined separate codebases, and the Game's stack is TBD. Any rule keyed to Next.js, App Router, the Supabase web SDK, or React idioms is a Hub rule and lives here, not at tier.
- **Direct Supabase usage is a narrow exception, not a default.** The Hub's Supabase client is permitted exactly two contact surfaces: (1) authentication via the Supabase auth SDK, and (2) two specific realtime channels — DM channels and the notification-bell channel — for the Ferd-scope features that need real-time delivery. **No table reads. No table writes. No row-level Supabase queries of any kind.** Every other read or write goes through the Platform API (ADR-U009). Adding a third realtime channel is an architectural decision that updates this file and `SPECIFICATION.md` §4 — not a refactor.
- **Use `proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the request-interception entry point. Per the entity-specificity test: this rule is Hub-specific because Gimbal will not run Next.js, not because the rule is "obviously about Hub." A future Game feature using a different web framework would not inherit it.

---

## Gotchas

Hard-won lessons; read once, remember forever. Grouped by cluster — React idioms, framework facts, Supabase facts.

**React idioms (Hub's component tree).**

- **`useAuth()` silently fails in server components.** The Hub's auth context (`AuthContext` + `useAuth()` hook) requires a client component. A server component that calls `useAuth()` does not throw — the hook just returns nothing, and the component renders against an empty auth state. Any component that calls `useAuth()` must be marked `'use client'`. The lack of a clear error makes this a "discovered by behaviour, not by failure" gotcha; include the `'use client'` directive proactively whenever auth state is read.
- **`refreshNavigation` is the canonical cross-component update event.** Components that need to coordinate state changes without sharing a parent (the canonical case: a navigation list refreshing after a role change made elsewhere in the tree) coordinate through the `refreshNavigation` custom event. Before inventing a new cross-component mechanism, check whether `refreshNavigation` already covers it. Custom events are scoped to the document; the Hub uses this one event deliberately rather than proliferating event names.

**Framework facts (Next.js 16 specifics).**

- **App Router, not Pages Router.** Routes live under `app/`. Layouts compose; data fetching defaults to server components; `'use client'` is the explicit opt-in to the client. The Pages Router patterns (`getServerSideProps`, `_app.tsx`) do not apply.
- **`proxy.ts`, not `middleware.ts`** — see Rules above. References to `middleware.ts` in code or documentation predate Next.js 16 and need updating.

**Supabase facts (key format and channel scope).**

- **Supabase publishable keys use the `sb_publishable_*` format.** The legacy `eyJ...` JWT-shaped publishable key is deprecated; the current SDK and Supabase documentation use the prefixed form. Environment configuration referencing `eyJ...` for the publishable key is stale — replace with `sb_publishable_*`. The service-role key (server-side, never sent to the browser) is a separate concern and is not used by the Hub directly.
- **Realtime channel scope is two channels, not "realtime in general"** — see Rules above. Treating Supabase realtime as a general-purpose broadcast bus would broaden the data-access surface beyond what the Hub commits to and would break the "no table reads" rule the moment a third channel started attaching to a table.

---

## Where to go next

- **Feature ID prefix at this entity:** `H` (Hub). See [`README.md`](./README.md) and [`features/`](./features/).
- **Identity and boundaries:** [`DESCRIPTION.md`](./DESCRIPTION.md) — what the Hub is, who it serves, what it intentionally does not do.
- **Technical shape:** [`SPECIFICATION.md`](./SPECIFICATION.md) — §L2 §1 (Surface) for the tech stack, §L2 §3 (Auth & authorization) for the auth model, §L2 §4 (Data ownership) for the data-access posture and realtime channel scope, §L3 for the capability inventory.
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every products-tier rule (API-first, cross-product by default, paired specs, visitors-before-members, permission resolution via `has_permission`) applies here without restatement.
- **Sibling product entities:** [`../gimbal/`](../gimbal/) (planned, not Next.js) · [`../game/`](../game/) (scope TBD).
- **Relevant ADRs:** U004 (visitor anonymous sign-in) · U007 (three-layer permission model) · U009 (API-first, frontend-agnostic) — these constrain the Hub's auth, permissions, and data-access shape directly.
- **Relevant skills:** [`feature-development`](../../../.claude/skills/feature-development/SKILL.md) when implementing a `FEAT-H*` feature; [`ecosystem-decomposition`](../../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing or advancing a Hub spec.
