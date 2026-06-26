# TASK-H003-06: E2E journey + finalize to 6-done

---
id: TASK-H003-06
title: Mist E2E journey + DoD finalize (maturity 6-done, §L4 / README / CHANGELOG)
status: done
feature: FEAT-H003
owner: hub
wave: ferd
depends_on: [TASK-H003-02, TASK-H003-04, TASK-H003-05]
estimated_hours: 3
---

## Description

The end-to-end browser journey and the Definition-of-Done finalize. Closes FEAT-H003 (IDN-1) once every story's acceptance criteria are green (each demonstrated red first) and the pyramid is upright.

## Acceptance criteria

- [ ] E2E (Playwright): sessionless entry → "Look around" → first near-side act materialises a Mist → become-a-FIM CTA visible → CTA routes to `/signup` (existing FEAT-H002 flow); no FIM regression.
- [ ] **Test DoD:** every acceptance criterion across STORY-1..5 has a passing test **demonstrated red first**; pyramid upright (unit for AuthContext/gating + entry component, integration for the substrate contract, E2E for the journey); lint + build + **full suite** green.
- [ ] FEAT-H003 maturity → **6-done**; Implementation notes written (red→green evidence honest; any test-after labelled).
- [ ] **Same commit:** `SPECIFICATION.md` §L4 row → 6-done; `features/README.md` row → 6-done; `CHANGELOG.md` updated (user-visible: the FringeIsland entry + Mist).

## Technical notes

- Mint/clean anon + FIM test users (shared-Supabase hygiene); the Mist reaper is FEAT-H004, so teardown here is manual via `cleanupTestUser`.
- Record the **accumulation gap** and the deferred FEAT-H004 items (robust reaper, consent, transcendence) in Implementation notes — honest seams, nothing silently dropped.

## Verification

- `npm run test:unit -w hub` + `npm run test:integration -w hub` + `npm run test:e2e -w hub` all green; `npm run lint -w hub` + `npm run build -w hub` clean.
