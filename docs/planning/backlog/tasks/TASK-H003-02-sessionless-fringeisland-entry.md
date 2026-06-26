# TASK-H003-02: Sessionless FringeIsland entry (STORY-1)

---
id: TASK-H003-02
title: Sessionless FringeIsland entry — public landing, no session, no rows
status: done
feature: FEAT-H003
owner: hub
wave: ferd
depends_on: []
estimated_hours: 3
---

## Description

The public **FringeIsland entry** — reachable with no session, offering *Sign in* / *Sign up* / *Look around*. The only FEAT-H003 task with **no migration dependency** (buildable now). Looking around the public entry creates **no anonymous session and no rows** — the sessionless tier. Perceiving the *shared near-side world* is **not** part of this tier (it materialises a Mist — TASK-H003-03 / STORY-2).

## Acceptance criteria

- [ ] A public route (the FringeIsland entry) renders with **no auth prompt / no redirect-to-login** and offers *Sign in*, *Sign up*, *Look around*.
- [ ] Visiting the entry creates **no anonymous session and no `users`/`groups` rows** (sessionless — asserted).
- [ ] Loading / empty states use design-system primitives; no Mist chrome implies an identity the visitor lacks.
- [ ] The entry coexists with the existing `/login` `/signup` `/groups` routes; an authenticated FIM is unaffected (no regression).

## Technical notes

- Check the current `hub/app/` root route behaviour (what `/` does today — likely a login redirect) and decide the entry's placement (`/` vs `/welcome`) — name by surface, keep the existing FIM landing intact.
- Reuse the design-system layer + shell from FEAT-H001/H002 (`components/ui/`), no new primitives.
- "Look around" **is** the deliberate enter-as-a-Mist act (Q3 resolved, "b-done-right"): this task builds the sessionless entry + the *Look around* affordance; the click triggers the lazy-Mist seam + minimal Mist-presence landing in TASK-H003-03. Keep the entry itself sessionless (no rows until the click).
- **Red-first:** unit test the entry component (renders three affordances, no auth dependency) + E2E (sessionless visit, no redirect). Assert "no rows" via integration against the substrate (fresh visit → no new `users` row).

## Verification

- `npm run test:e2e -w hub` (entry visit) + unit suite green; `npm run lint -w hub` + `npm run build -w hub` clean.
- Manual: open the entry in a clean browser — no login redirect, three affordances present.
