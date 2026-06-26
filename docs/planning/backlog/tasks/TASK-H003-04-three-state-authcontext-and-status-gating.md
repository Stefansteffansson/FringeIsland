# TASK-H003-04: Three-state AuthContext + status gating (STORY-3)

---
id: TASK-H003-04
title: Three-state identity (sessionless / Mist / FIM) + status-driven gating
status: done
feature: FEAT-H003
owner: hub
wave: ferd
depends_on: [TASK-PC001-01, TASK-H003-03]
estimated_hours: 4
---

## Description

Teach `AuthContext` a three-state identity — **sessionless / Mist / FIM** — derived from `is_temporary` (auth `is_anonymous`), and gate the shell by **status, not a permission fence**: a Mist gets the **"become a FIM"** CTA (→ FEAT-H002 sign-up) and FIM-only / Beyond affordances are closed by status. Unit-tier-heavy (branching logic).

## Acceptance criteria

- [ ] `AuthContext` exposes a distinct state for **sessionless / Mist / FIM** (Mist ⇐ `is_temporary` / `is_anonymous`), resolved **outside** the auth listener (set state in `onAuthStateChange`, derive in a separate effect — Hub `CLAUDE.md` gotcha).
- [ ] Mist session → shell shows the **become-a-FIM** CTA (routes to `/signup`) + Mist chrome; a FIM-only / Beyond affordance is **not offered** (closed by status), never offered-then-denied.
- [ ] Gating branches on **status** (`is_temporary`/Mist), never on a hardcoded role string (products-tier `CLAUDE.md`).
- [ ] FIM session (FEAT-H001/H002) → **no Mist chrome**, existing behaviour unchanged (no regression).

## Technical notes

- Read how `AuthContext` currently distinguishes signed-out vs FIM (`hub/lib/auth/AuthContext.tsx`); add the Mist branch via `is_temporary` (fetched once after session resolves, or from the profile read), not by querying inside the listener.
- The "become a FIM" CTA links to the existing `/signup` (FEAT-H002) — **no transcendence** here (No-go); FEAT-H004 makes it in-place.
- **Red-first:** unit tests for the three-state derivation + gating branch (jsdom); confirm red, then green. Keep logic assertions at the unit tier, not only E2E.

## Verification

- `npm run test:unit -w hub` green (new AuthContext/gating specs); existing suites green; `npm run lint -w hub` clean.
