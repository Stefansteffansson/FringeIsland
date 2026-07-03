# CLAUDE.md — The Hub

**Applies to:** anything under `docs/products/hub/` and the corresponding code (the Next.js application that *is* the Hub — `app/`, `components/`, `lib/` — for as long as the Hub is the primary application in the monorepo).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (products tier) → **this file** → [`README.md`](./README.md) → [`DESCRIPTION.md`](./DESCRIPTION.md) and the relevant section of [`SPECIFICATION.md`](./SPECIFICATION.md) → the feature spec.
**Reads as a delta.** Assumes root and products-tier `CLAUDE.md` are already loaded. Contains only what's specific to the Hub.

---

## What makes this entity different

The Hub is **the canvas surface** of the one experience (ADR-U025) — the equipment profile built on screen room, keyboard, precision input, and file system — shipping today as a Next.js web application served from Vercel, talking to Supabase through a deliberately narrow surface. It serves the same one experience as the Gimbal; what differs is equipment, not audience. (For the world-language of where FIMs rest and gather — the village, in the Beyond of the warm place — see the cosmology core, [`docs/ecosystem/universe/cosmology/README.md`](../../ecosystem/universe/cosmology/README.md).) Per [ADR-U032](../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md), the Hub is being rebuilt fresh under **`hub/`** (the Hub's permanent home — no version number), while the old Hub MVP lives under **`hub-legacy/`** as the frozen behavioural oracle (read-only, copy-with-correction, deleted at Phase-4 cutover). **The repo root no longer holds Hub source** — `app/`, `components/`, `lib/` are now `hub/…` (new) and `hub-legacy/…` (old). The shared substrate (`supabase/`), the docs tree, and repo tooling (`scripts/`) stay at root. The repo is becoming a **monorepo of surfaces**: `hub/`, later `gimbal/`, then studio surfaces — peers over the one backend. "v2" names the *rebuild project* (it lives in `docs/planning/hub-v2/` and git history), never a code path. Code organisation that conflates the new Hub with the oracle, or with the rest of the system, is drift.

The Hub is also a consumer surface in the strictest sense — the tier rule "API-first, no exceptions" is fully load-bearing here, with the Hub's only direct Supabase contacts being auth and the ADR-U039-governed realtime channels named below.

---

## Rules that only apply at this entity

- **The Hub's tech stack is Hub's, not the products tier's.** Next.js 16.1 with App Router, TypeScript strict-mode, Tailwind CSS, Supabase client SDK. The sibling product (the Gimbal) will not be Next.js — its shipping targets are native iOS and native Android builds of the one senses surface. Any rule keyed to Next.js, App Router, the Supabase web SDK, or React idioms is a Hub rule and lives here, not at tier.
- **Reusable UI primitives live in `components/ui/`; feature-specific components live alongside their routes under `app/`.** The split keeps the design-system import surface coherent (one well-known location for shared primitives) and feature footprints discoverable (a feature's components, fetchers, and route handlers stay together). Repo-organisation rule: the Gimbal will organise per its own platforms' conventions and does not inherit this layout.
- **Use `ConfirmModal`, not browser `alert()` or `confirm()`.** Browser-native dialogs are unstyled, blocking, and inconsistent across browsers — they break the Hub's visual language and bypass the standard component-test path. `ConfirmModal` is the Hub's confirmation primitive; every confirmation, destructive-action prompt, or yes/no decision flows through it.
- **Direct Supabase usage is a narrow exception, not a default.** The Hub's Supabase client is permitted exactly two contact surfaces: (1) authentication via the Supabase auth SDK, and (2) the realtime channels named in `SPECIFICATION.md` §4, governed by the socket doctrine ([ADR-U039](../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md)): one shared socket, **private** channels only, server-originated content-free hints, **verify-on-signal** (a socket message is a hint, never an authority — the client acts via the authorized path). The named list today: the session-signal channel `account:<auth_uid>:sessions` (FEAT-H012, realized), plus DM + notification-bell (forward-looking; v2 shape decided in their areas under the doctrine). **No table reads. No table writes. No row-level Supabase queries of any kind.** Every other read or write goes through the Platform API (ADR-U009). Adding a realtime channel is a feature-spec-level decision under ADR-U039 that updates §4's named list (and this line) in the same batch — not a refactor.
- **Platform rules live in the platform substrate, never only in a Hub route (ADR-U038).** The Hub's `app/api/...` routes are a **private BFF** — session/cookie handling, presentation mapping (SQLSTATE→HTTP, download headers), telemetry, response shaping. A route may **never be the only place** a business rule, authorization decision, or lifecycle/consent invariant is enforced; enforcement lives in the substrate (SECURITY DEFINER RPC / RLS / trigger / column grant), so a sibling Surface (the Gimbal) inherits it by calling the same Platform API — a Hub route it can't call (`SPECIFICATION.md` §5). App-layer validation is defense-in-depth / UX only. Server components render against already-fetched data; they don't author logic and they don't fetch from the database directly. *(Superseded the pre-ADR-U038 wording that placed "business logic … behind the Platform API" in `app/api` route handlers — Hub routes are not the Platform API; PostgREST RPC is, per PC-3 organisation-specification §3.)*
- **Supabase client files exist only to serve the narrow-exception rule above.** `lib/supabase/client.ts` is the browser client (auth and the §4-named realtime channels). `lib/supabase/server.ts` is the server-side auth session helper. Neither performs table reads or writes. The "server client for RSC table queries" framing common in Next.js + Supabase examples does not apply here — server components at the Hub read session state, never table data.
- **Use `proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the request-interception entry point. Per the entity-specificity test: this rule is Hub-specific because Gimbal will not run Next.js, not because the rule is "obviously about Hub." A future surface on a different web framework would not inherit it.

---

## Gotchas

Hard-won lessons; read once, remember forever. Grouped by cluster — React idioms, framework facts, Supabase facts.

**React idioms (Hub's component tree).**

- **`useAuth()` silently fails in server components.** The Hub's auth context (`AuthContext` + `useAuth()` hook) requires a client component. A server component that calls `useAuth()` does not throw — the hook just returns nothing, and the component renders against an empty auth state. Any component that calls `useAuth()` must be marked `'use client'`. The lack of a clear error makes this a "discovered by behaviour, not by failure" gotcha; include the `'use client'` directive proactively whenever auth state is read.
- **Don't query inside `onAuthStateChange`.** The Supabase auth state listener and your data queries can deadlock if both run synchronously on the same connection — symptoms range from hung sessions to spurious sign-out. Set component state inside `onAuthStateChange`; query in a separate `useEffect` that watches that state. The listener stays side-effect-free; queries run on the next render, breaking the cycle.
- **`refreshNavigation` is the canonical cross-component update event.** Components that need to coordinate state changes without sharing a parent (the canonical case: a navigation list refreshing after a role change made elsewhere in the tree) coordinate through the `refreshNavigation` custom event. Before inventing a new cross-component mechanism, check whether `refreshNavigation` already covers it. Custom events are scoped to the document; the Hub uses this one event deliberately rather than proliferating event names.

**Framework facts (Next.js 16 specifics).**

- **App Router, not Pages Router.** Routes live under `app/`. Layouts compose; data fetching defaults to server components; `'use client'` is the explicit opt-in to the client. The Pages Router patterns (`getServerSideProps`, `_app.tsx`) do not apply.
- **`proxy.ts`, not `middleware.ts`** — see Rules above. References to `middleware.ts` in code or documentation predate Next.js 16 and need updating.
- **The hot read routes run on the Edge runtime, pinned to `dub1` ([ADR-U036](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md)).** `/api/account/state`, `/api/profile/me`, `/api/groups`, and `/api/account/consent` declare `export const runtime = 'edge'` + `export const preferredRegion = 'dub1'`. Why: the Node lambda cold-started at **~740–790 ms** on the first hit after idle (measured 2026-07-01; Fluid Compute was already on and didn't prevent it) — Edge V8 isolates have ~0 ms cold start, and the `dub1` pin keeps them co-located with the Ireland DB so ADR-U035's intra-region hops are preserved. **Consequence — a live constraint, not a footnote:** these routes and everything they import must stay **Edge-safe** (no Node-only APIs — `Buffer`, `node:*`, native `crypto`, `fs`); `next build` fails loudly if a Node-only import sneaks in. Routes that genuinely need Node (e.g. the data-export document assembly) stay on the default Node runtime deliberately. **Never drop the `preferredRegion` pin** — without it an Edge function runs at the PoP nearest the user (Stockholm), silently regressing co-location (~115 ms → ~245 ms warm).

**Supabase facts (key format and channel scope).**

- **Supabase publishable keys use the `sb_publishable_*` format.** The legacy `eyJ...` JWT-shaped publishable key is deprecated; the current SDK and Supabase documentation use the prefixed form. Environment configuration referencing `eyJ...` for the publishable key is stale — replace with `sb_publishable_*`. This rule is Hub-specific because the Hub is the only product that ships a Supabase client SDK directly — Gimbal will use platform-native networking, so the key-format concern attaches to Hub even though the underlying fact is Supabase-platform-wide. The service-role key (server-side, never sent to the browser) is a separate concern and is not used by the Hub directly.
- **Realtime channel scope is the §4-named list, not "realtime in general"** — see Rules above and ADR-U039. Treating Supabase realtime as a general-purpose broadcast bus would broaden the data-access surface beyond what the Hub commits to and would break the "no table reads" rule the moment a channel started attaching to a table (`postgres_changes` is exactly that — the legacy notifications mechanism, not carried into v2).
- **`@supabase/ssr` cookies are chunked and base64-encoded.** When the session JWT is large, `@supabase/ssr` splits it across multiple cookies (`sb-...-auth-token.0`, `sb-...-auth-token.1`) and base64-encodes the contents. Don't try to reconstruct the cookie value by hand — let the library decode it. Server-side code that needs the JWT (e.g., for downstream API calls) should obtain it through the SDK or be passed it explicitly, not parse cookies.

---

## Testing

UI testing for the Hub uses Playwright — `npm run test:e2e`. Variants:

- `npm run test:e2e` — headless run; the standard form for CI and "did anything break?" sweeps.
- `npm run test:e2e:ui` — interactive runner; useful when iterating on a single spec.
- `npm run test:e2e:headed` — runs in a visible browser; use when behaviour differs between headless and headed (rare but happens).
- `npm run test:e2e:debug` — pauses at each step; for stepping through a flaky test.

All E2E commands require the dev server on `localhost:3000` — start it before running. Platform-tier integration tests (database, RLS, API routes) live at the platform tier — see [`../../platform/CLAUDE.md`](../../platform/CLAUDE.md).

---

## Where to go next

- **Feature ID prefix at this entity:** `H` (Hub). See [`README.md`](./README.md) and [`features/`](./features/).
- **Identity and boundaries:** [`DESCRIPTION.md`](./DESCRIPTION.md) — what the Hub is, who it serves, what it intentionally does not do.
- **Reader tours of the L3 inventory:** [`tours/HUMAN.md`](./tours/HUMAN.md) (uncredentialed audience — what the Hub does, in plain language) and [`tours/TECHNICAL.md`](./tours/TECHNICAL.md) (contributor prerequisite — the capability inventory, scannable).
- **Technical shape:** [`SPECIFICATION.md`](./SPECIFICATION.md) — §L2 §1 (Surface) for the tech stack, §L2 §3 (Auth & authorization) for the auth model, §L2 §4 (Data ownership) for the data-access posture and realtime channel scope, §L3 for the capability inventory.
- **Tier file (read first per load order):** [`../CLAUDE.md`](../CLAUDE.md) — every products-tier rule (API-first, equipment-keyed feature placement, paired specs, Mists-before-FIMs, permission resolution via `has_permission`) applies here without restatement.
- **Sibling product entity:** [`../gimbal/`](../gimbal/) — the senses surface (planned, not Next.js).
- **Relevant ADRs:** U004 (anonymous sign-in — the Mist) · U007 (three-layer permission model) · U009 (API-first, frontend-agnostic) · U025 (products as equipment profiles) — these constrain the Hub's auth, permissions, and data-access shape directly.
- **Relevant skills:** [`feature-development`](../../../.claude/skills/feature-development/SKILL.md) when implementing a `FEAT-H*` feature; [`ecosystem-decomposition`](../../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing or advancing a Hub spec.
