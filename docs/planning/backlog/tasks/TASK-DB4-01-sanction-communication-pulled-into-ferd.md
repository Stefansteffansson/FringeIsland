---
id: TASK-DB4-01
title: Sanction communication (DB-4) — pulled into Ferd by ruling; needs a decomposition board before any build (member notification + member-facing reason on hold/suspension transitions)
status: todo
assigned_to: unassigned
priority: high
feature: to be decomposed — a paired PC/PD spec (transition notification kinds + a reason carried on the transition) and an H spec (the wall/label says why; the bell says it happened); amends FEAT-PC023 + FEAT-H038 No-gos
owner: platform/core (governance — the hold/suspension transitions) + platform/domain (DS-5 notification kinds) + hub
wave: ferd
cycle: none — ruled at the Ferd leftovers pass (Stefan, 2026-09-03: "DB-4 … now"), queued for the next session
depends_on: []
estimated_hours: 12-16 (one to two days) + one schema gate
---

# TASK-DB4-01 — sanction communication, pulled into Ferd

**Where it stood:** both FEAT-PC023 (group-suspension enforcement) and FEAT-H038 (suspension integrity) list it as an explicit **No-go deferred to Eid**: *no member notification on any hold or suspension transition; no member-facing reason — the label states the state, never the why.* The Ferd leftovers sweep (2026-09-02) put it in front of Stefan because the wave is "the first usable version" and it is member-facing; he ruled it **in**.

**What it is, plainly:** when a group is rested / suspended / reactivated, or a member is suspended / reinstated (the transitions FEAT-PC023 and FEAT-PC020/PC021 define), the people affected hear about it (a notification kind per transition, the registry way — FEAT-PD013's `notification_kinds` / categories, non-suppressible or not by ruling) **and** can see *why* (a reason recorded on the transition by the admin, carried to the member-facing wall and label — today the surfaces say "suspended", never the cause).

## Definition of ready — a decomposition board first (`ecosystem-decomposition` skill)

- **Scope the transitions:** which of the hold family's transitions notify (all? only the hazard holds?), and who is the recipient (every active member of a held group; the sanctioned member for account holds).
- **The reason field:** where it lives (a column on the transition's audit row? on `groups` for the current hold? both?), who writes it (the admin ceremony gains a required reason), what the member sees (the reason verbatim? a category?) — a **Privacy/GDPR** vertical question: a reason can name a third party.
- **Registry entries:** new `notification_kinds` rows + a category with `member_suppressible` decided (a sanction notice is likely "always on", the FEAT-H033 premise).
- **Dispatch:** in the transition contracts (SECURITY DEFINER, the FEAT-PD020 fan-out for group-addressed rows).
- **Hub:** the admin ceremonies collect the reason; the member wall/label renders it; the bell renders the kind.
- **Amend the two No-gos** (FEAT-PC023, FEAT-H038) with the dated ruling; author the paired specs to 4-ready before the build session.
- One schema gate (registry rows + column + contract re-issues), held for the named approval; the sibling sweep must grep **every** suite naming the re-issued transition contracts (the ANN-01 lesson).

## Order among the four pulled items

Build last of the four (largest; needs the board): H017-01 retire → journey pause → SEAL-02 → DB4-01. See bridge `2026-09-03_02`.
