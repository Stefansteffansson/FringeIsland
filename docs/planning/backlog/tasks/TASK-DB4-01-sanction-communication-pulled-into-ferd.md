---
id: TASK-DB4-01
title: Sanction communication (DB-4) — pulled into Ferd by ruling; needs a decomposition board before any build (member notification + member-facing reason on hold/suspension transitions)
status: review
assigned_to: claude-code (built 2026-09-03; the schema gate applied on the named approval)
priority: high
feature: FEAT-PD021 (the kinds, DS-5) + FEAT-PC030 (the contracts, PC-4 with PC-3's rest/wake) + FEAT-H049 (the surfaces, hub) — decomposed 2026-09-03; FEAT-PC023 + FEAT-H038 No-gos amended
owner: platform/core (governance — the hold/suspension transitions) + platform/domain (DS-5 notification kinds) + hub
wave: ferd
cycle: none — ruled at the Ferd leftovers pass (Stefan, 2026-09-03: "DB-4 … now"); built the same day
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

## Decomposition done (2026-09-03) — the board ruled by default, the three specs at 4-ready

The eight rulings on the decision board (bridge `2026-09-03_04`) were adopted as defaults on Stefan's "continue with the eight rulings … now" (2026-09-03); reversing any reopens the named story. Specs: [FEAT-PD021](../../../platform/domain/features/FEAT-PD021-sanction-notification-kinds.md) (DS-5 — the locked-on `sanctions` category + six kinds), [FEAT-PC030](../../../platform/core/features/FEAT-PC030-sanction-communication-contracts.md) (PC-4 with PC-3's rest/wake — the reason on the seven transitions, the columns, the per-member notices, the reads, the column-scoped groups SELECT), [FEAT-H049](../../../products/hub/features/FEAT-H049-sanction-communication-surfaces.md) (the ceremonies, the wall/label, the account surface, the bell). L3 rows added: Hub GRP-10 + IDN-13 (ADM-3 / ADM-9 amended), PC-4 "Sanction communication". FEAT-PC023 + FEAT-H038 No-gos amended with the dated ruling.

**Two mechanism reads changed the shape (the skill's walk):** (1) FEAT-PD020's expansion trigger reaches `act_as_group` holders ∪ Stewards, not every member — the contracts fan out per member themselves (the PD011 announcements precedent). (2) `public.groups` carries a table-level SELECT grant, so `hold_reason` would be readable by any authenticated direct caller on a public held group — the migration scopes the SELECT grant to every column but `hold_reason` (the PC003 S2 pattern; sweep: zero client `select(*)` on groups in the integration tree, 39 column-named selects).

**Build order (one schema gate):** the migration (PD021 rows + PC030 columns, seven DROP + CREATE re-issues with grants, two read re-issues, the column-scoped grant) with its sibling sweep across the 17 suites naming the contracts → the Hub half → the E2E arc. Estimated 12-16 h; the next session's work.

## Build (2026-09-03) — the gate applied on the named approval, the three halves green

**Approval:** Stefan, 2026-09-03, before the build — "you have my blessing to do the migration (ref. Migration (one schema gate, held for your named approval))". Both migrations applied and repaired to `applied` under it: `20260903120000_db4_pc030_pd021_sanction_communication.sql` (the gate as specified) and the same-day corrective `20260903130000_db4_pc030_notice_titles_are_core_literals.sql` (the invocation-axis gate refused the fan-out bodies' read of the DS-5 registry post-apply; the notice titles are Core literals, pinned equal to the registry labels).

**Platform (FEAT-PC030 + FEAT-PD021):** integration 23/23 red at HEAD → 24/24 green (two test-side corrections along the way: the admin's act reaches the Steward too — four recipients, not three; a recovery hook and a self-contained cell). Sibling sweep 408/410 on the first pass — ten suites adapted with a labelled reason (33 lines), the PC023 STORY-7 minimal-payload key pin gains `hold_reason`, the gate finding above — then 152/152 on the post-corrective set. Gate reads on the applied objects recorded in FEAT-PC030's Implementation notes (nine functions `{postgres, authenticated, service_role}`; `groups` relacl `anon=m, authenticated=m`; no client grant on either reason column).

**Hub (FEAT-H049):** unit tier 39 red at HEAD across nine suites → 1616/1616; lint, typecheck, `next build` green; route-policy conformance green with zero new exceptions. **A decomposition gap found at build:** the admin members list's bulk Suspend / Reactivate bar composes `admin_update_user_status` and would have refused every row — shaped as one required reason per batch (*Shown to each member*), the seventh ceremony, recorded in FEAT-H049's notes.

**E2E (FEAT-H049 STORY-5):** `tests/e2e/sanction-communication.spec.ts` (the group arc with the reason on the wall and in the bell, the Steward's note, the member-suspension arc on the account surface) + the two adapted ceremony specs (`admin-suspended-content`, `group-availability`) — the run's result is in the PR body.

**Deferred, plainly (unchanged No-gos):** no reason on closure / deletion / removal; no reason edit after the fact; no push or email; no Steward-side suspension; no category taxonomy of reasons; no internal admin-only note. The TASK-E2E-04 recommendation (an E2E smoke job in CI) is still Stefan's ruling to take.
