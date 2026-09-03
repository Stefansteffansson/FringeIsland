# Session bridge — 2026-09-03 (6): DB4-01 decomposed to 4-ready on the board's defaults; TASK-E2E-04 fixed; the build of DB-4 is next

**Continuation of `2026-09-03_05`.** Stefan: "continue with the eight rulings on the DB4-01 board … now and then TASK-E2E-04." The eight recommendations were adopted as the rulings (he can reverse any; each spec names which story reopens), the three paired specs were written to 4-ready, and the two stale E2E specs were re-seeded. No code, no migration for DB-4 yet.

## Live state (verified at close — cite, don't re-derive)

- `main` = `origin/main` = discovery; clean; no open PRs. Today's merges: #600, #601, #603 (the three gates), #602/#604/#605 (bridges + ADR-U047 A4), #606 (the DB4 decomposition), #607 (TASK-E2E-04).
- **TASK-DB4-01 — decomposed, not built.** [FEAT-PD021](../../platform/domain/features/FEAT-PD021-sanction-notification-kinds.md) (DS-5: the locked-on `sanctions` category + six hold kinds; two account kinds ride the already locked-on `account`), [FEAT-PC030](../../platform/core/features/FEAT-PC030-sanction-communication-contracts.md) (PC-4 with PC-3's rest/wake: `p_reason` on the seven transitions — required on the admin sanctions, optional on the Steward's rest/wake — `groups.hold_reason` + `users.suspension_reason`, per-member notice rows written by the contracts, `get_group_detail.hold_reason` + `get_account_state.suspension_reason`, the `groups` SELECT grant column-scoped), [FEAT-H049](../../products/hub/features/FEAT-H049-sanction-communication-surfaces.md) (the ceremonies' reason field, the wall/label/account surface, the bell). L3: Hub GRP-10 + IDN-13, ADM-3 / ADM-9 amended, PC-4 "Sanction communication". FEAT-PC023 + FEAT-H038 No-gos superseded with the dated ruling.
- **Two mechanism reads changed the design and are recorded in the specs:** FEAT-PD020's expansion trigger reaches `act_as_group` holders ∪ Stewards, not every member (`20260815223000`) — the contracts fan out per member themselves (the PD011 precedent); and `public.groups` has only Supabase's table-level SELECT grant, so `hold_reason` on a public held group would be readable by any direct caller — the migration scopes the grant to every column but `hold_reason` (the PC003 S2 pattern; zero client `select('*')` on groups in the integration tree).
- **TASK-E2E-04 — DONE (#607).** `journeys.spec.ts` and `player.spec.ts` seed dedicated journeys by title and tear them down by title; both green twice (4/4); no stale seed title remains in `hub/tests/e2e`.

## The DB-4 build (next session) — order and gate

1. **Migration** (one gate, held for the named approval): PD021's registry rows; PC030's two columns; seven DROP + CREATE re-issues with `p_reason text default null` and re-asserted grants (a DROP loses the ACL — read every applied ACL at the gate); the two read re-issues; the column-scoped `groups` SELECT grant (enumerate the columns from the catalog at authoring, never from memory). The sibling sweep is the largest of the four items: 17 suites name the contracts (`grep -rlE "rest_group|wake_group|admin_suspend_group|admin_reactivate_group|admin_update_user_status" hub/tests`); the admin cells gain a reason (labelled adaptations), the Steward cells stay (the defaulted parameter). Run the platform slice in the post-apply set (the invocation-axis gate caught #603's first draft).
2. **Hub half** (FEAT-H049): the six ceremonies + the Steward's note; the three render sites; the bell icon; the BFF pass-through with `22023 → 400`.
3. **E2E arc:** admin suspends with a reason → the member's shell shows it → the bell holds `group_suspended` with it → reactivation clears it; and the member-suspension arc on the account surface.
4. If Stefan reverses a board ruling, the spec names the story that reopens — do that before L5.

## Findings worth carrying

- A decision board answered by default is honest only if every default is written down as such: each of the three specs says "the board's rulings N are adopted as defaults; reversing reopens STORY-X".
- The skill's mechanism walk earned its keep twice in one decomposition (the PD020 audience; the groups grant). Read what you lean on before `4-ready`.
- E2E is not in CI; a stale spec can sit red for weeks. TASK-E2E-04 recommends a smoke job — a ruling for Stefan, not taken here.

## Not done — plainly

- **The DB-4 build** (12–16 h + one schema gate) — the next session's work, the last of the four items.
- **`ferd.md`** — still the placeholder; the Ferd close waits on it.
