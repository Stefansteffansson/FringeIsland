# H020 player page — boot, resume, linear navigation with optimistic advance

---
id: TASK-JB-04
title: H020 player page (boot/resume/linear nav)
status: done
assigned_to: Claude
priority: high
feature: FEAT-H020
owner: hub
wave: ferd
cycle: J-B
depends_on: [TASK-JB-03]
estimated_hours: 5
---

## Description

`/journeys/[id]/play` (client page, FIM gate): enrolment disambiguation (one active → straight in; several → chooser; none → honest redirect to detail), boot from one `fetchPlayerState` read with header seeded from the cached detail/catalogue card, canvas opens at the resume pointer, step rail (order/required/ticks), prev/next with optimistic advance (paint from in-memory payload ≤ 200 ms, `enter` fires background), background-save failure indicator with retry (non-blocking), player skeleton (deferred 300 ms, canvas + rail). Detail page gains Continue/Start deep-links per enrolment (additive touch to the H019 enrolment block).

## Acceptance criteria

- [ ] STORY-1/2/4/5 acceptance criteria asserted at unit tier (boot, disambiguation, nav, auto-save, resume, B4 revisit)
- [ ] Exactly one player-state read on cold boot; zero duplicate fetches across auth-event churn (the 3x-refire guard)
- [ ] `set-state-in-effect` handled per retro-2026-07-07 §3 (justified per-site suppression only if the count stays ≤ 5)

## Verification

`npm run test` unit green; manual walk on `localhost:3000` against the migrated dev DB.
