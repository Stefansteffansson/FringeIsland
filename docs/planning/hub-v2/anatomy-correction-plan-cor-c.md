# Cycle COR-C — correction plan for Anatomy Conformance Audit III

**Date:** 2026-07-30 · **Status:** **PROPOSED — HELD for Stefan's review. Nothing here has been executed.**
**Evidence base:** [`../reference/ANATOMY-CONFORMANCE-AUDIT-3.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-3.md) (AC3-1..AC3-19, R-4..R-6, GC-1..GC-14).
**Precedent:** COR-A ([`anatomy-correction-plan.md`](./anatomy-correction-plan.md), 2026-07-19) · COR-B ([`anatomy-correction-plan-cor-b.md`](./anatomy-correction-plan-cor-b.md), 2026-07-22).
**Posture:** TDD throughout — every code workstream opens with a demonstrated-red test against HEAD. Schema-touching workstreams ride the schema gate: PR held with the red test and apply commands in the body; merge only on a named approval.

---

## Sequencing at a glance

| Order | Workstream | Why this order | Gate |
|---|---|---|---|
| 1 | **W1 — ADR-U050 admin half** (the Critical) | A-ADM's console builds on exactly these contracts; building ADM screens on an escapable hold bakes the defect in | **Schema gate** |
| 2 | **W4 — Rulings session** (R-4, R-5, R-6, AC3-11 disposition) | Four decisions, each cheap, that unblock W2/W3/W6 details and stop re-litigation | Stefan session |
| 3 | **W2 — GDPR export completeness** | A-ADM adds member-visible operator data next; the completeness invariant must exist before it does | **Schema gate** |
| 4 | **W3 — U051 surface de-hardcoding** | Additive; shape settled by W4's AC3-11 pick | **Schema gate** (additive) |
| 5 | **W5 — a11y primitives** | Code-only, independent of every ruling (recommended regardless of R-6) | none |
| 6 | **W6 — band substrate (tokens, i18n posture)** | Direction set by R-6 | none |
| 7 | **W7 — gate hardening** | Each new gate lands red-demonstrated alongside its workstream where possible; the remainder sweeps here | none |
| 8 | **W8 — hygiene & docs** | Zero-risk sweep | none |

**Recommendation:** run W1–W4 as a corrective cycle **before A-ADM opens** (the COR-A precedent: correction before the next area). W5–W8 may run in the same cycle or overlap A-ADM's open — Stefan's call at review.

---

## W1 — Wire the admin half of ADR-U050 (AC3-1 Critical, AC3-2, AC3-13, AC3-14 · GC-10)

**Red first (AC3-2's suite, driven through the real producer):**
1. Invoke `admin_update_user_status(target, false)` as a `manage_all_groups` actor against an **active** account → assert `get_own_account_state()` reads `suspended` and `reactivate_own_account()` is refused. *(Red at HEAD: reads `suspended` only via the NULL-origin fallback — passes — but:)*
2. **The escape case:** `pause_own_account()` → admin hold → assert state reads `suspended` and reactivation refused. *(Red at HEAD: state reads `paused`, reactivation succeeds — the AC3-1 demonstration.)*
3. NULL-origin derivation case (AC3-13) — the row shape today's admin suspend actually produces.
4. Admin reactivation clears the origin (the stale-`'member'` re-arm, AC3-1b).

**Then the migration** (single re-issue, PC-4 side only — `reactivate_own_account` is untouched, its gate is correct):
- `admin_update_user_status`: same statement writes `deactivation_origin = 'admin'` when holding, `NULL` when releasing; add `FOR UPDATE` on the target read (AC3-14).
- `admin_decommission_user`: add the `'admin'` origin write (record hygiene — terminality is already trigger-enforced).

**Schema gate:** function bodies change and behaviour changes *deliberately* (that is the fix). Held PR with red-test evidence + apply commands; merge on named approval. **Data question for the gate:** whether any live off row now carries a wrong origin from the no-op window — the W1 PR should include the diagnostic query.

## W2 — Restore and pin GDPR export completeness (AC3-3, AC3-4, AC3-15, AC3-16 · GC-5, GC-6, GC-14)

1. **Red first:** extend `export-composite.test.ts` to assert a `notification_preferences` key. *(Red at HEAD.)*
2. Re-issue `get_own_data_export()` adding `'notification_preferences', public.get_own_notification_preferences_export()` to the Domain merge — additive, no consumer breaks (the N-D comment already reasoned the shape).
3. **The recurrence-stopper (AC3-4):** a manifest-driven completeness invariant — every table classified member-data must have an export representation or a cited exemption entry in the manifest. Unclassified-fails-red (the COR-B ownership pattern applied to export). Seed the member-data classification from the audit's table inventory.
4. Restructure `verticalComposition` (AC3-15): composed contracts as a structured array; a test asserts the function body composes exactly that set. Closes GC-6 and makes the citation load-bearing instead of decorative.
5. **Announcements (AC3-16) — needs Stefan's word at review:** add an `authored_announcements` section to the messages export, **or** record a cited exemption (governance act attributable to role, not personal content). Either closes it; the audit takes no position.
6. Area-gate wording fix (GC-14): the per-RPC row template gains a "composed into declared consumer — verified" column so a contract's *composition* is checked, not only its internal gates.

**Schema gate** (composite re-issue).

## W3 — Home the U051 typed-action registry platform-side (AC3-5, AC3-9 · GC-9, GC-4)

Shape settled by W4's AC3-11 disposition; either way:
1. Carry response set + handler identity as data (a `notification_kinds`-sibling registry, or columns on `get_own_notifications`); the Hub's `DISPATCH_SEGMENTS`/`RESPONSE_SETS` collapse to rendering-only lookups. Additive and backward-compatible (the same move N-B made adding `action_data`).
2. Add the `expires_at` guard to `respond_to_acting_invitation` mirroring `respond_to_stewardship_nomination` (AC3-9) — converts the latent U038 violation into a structurally impossible one.
3. Gate (GC-9): assert every kind carrying an `action_type` resolves to a reachable dispatch target; passive-render and forgotten-kind become distinguishable.

**Schema gate** (additive registry + one guard).

## W4 — Rulings session (R-4, R-5, R-6, AC3-11) — Stefan decisions, ~one short artifact each

| Ruling | Decision needed | Artifact on decision |
|---|---|---|
| **R-4** registry-table ownership | vertical:notifications vs **DS-5 (recommended)** | manifest relabel (verified green immediately) + the GC-3 pinned-set test |
| **R-5** trigger-mounted routing enforcement | legitimise vs restructure — **legitimise (recommended)**; both D2 and D4 independently judged the mechanism right | short ADR-U048 rider; decide GC-8 (trigger-edge awareness in the inner-ring gate); anatomy stamp moves |
| **R-6** design-system tier activation | dormant-until-Eid vs **active with scoped activation (recommended)** | activation note + `docs/design-system/CLAUDE.md:15` correction + dated i18n deferral naming the Eid point (converts AC3-6 to cited Observation) |
| **AC3-11** response-contract shape | widen to response key vs **amend U051 to name the Ferd accept/decline family (cheaper, honest)** | U051 amendment *or* W3 carries the widened parameter |

## W5 — a11y on the shared primitives (AC3-8, AC3-17, AC3-18) — code only, no ruling dependency

1. `ConfirmModal`: initial focus (cancel for `danger`), two-button Tab cycle, focus restore on close; mirror in `ReportDialog` (or extract `useFocusTrap` into `components/ui/`).
2. One menu primitive (menu button + roving tabindex + `menuitem` children + Escape + focus return); adopt in `NotificationBell` and `AccountMenu` — the Hub's first shared *interactive* primitive.
3. `TextField`: require `id` (or `useId()` fallback); optional `error` prop wiring `aria-invalid` + `aria-describedby` to `InlineError`.
4. Measure the two flagged `text-gray-400` contrast spots from the D5 could-not-verify list while in the file.

## W6 — Band substrate (AC3-7, AC3-6) — direction set by R-6

1. Tokens regardless of the ruling (recommended): a Tailwind v4 `@theme` block — semantic colour (primary/danger/warning/surface/text), spacing, motion durations — then migrate `components/ui/` and resolve the blue/indigo fork one way. Every cycle of delay widens the 54-component retrofit.
2. i18n per R-6: dated deferral document (option 2) or the key-based layer's first tranche (option 1).

## W7 — Gate hardening sweep (the GC table's remainder)

| Gate | Closes | Shape |
|---|---|---|
| Function-classification completeness (`pg_proc` vs manifest, allowlisted core) | GC-1, prevents AC3-10 recurring | mirror of the table check at `ownership-manifest-conformance.test.ts:96` |
| Pinned `vertical:*` table set | GC-3 (R-4's mechanism) | exact-set assertion with reasons |
| Outer-ring scan-set coverage | GC-7 / AC3-12 | widen `isClientReachable` to `lib/realtime/**` + transitive `'use client'` imports, or a scanned-files assertion |
| Trigger-edge awareness | GC-8 | per R-5's decision |
| a11y gate (`jest-axe` on primitives + axe-Playwright sweep), i18n lint, token gate | GC-12 | per R-6; the outer-ring gate's fixture-then-live-tree structure is the local template |
| Data-migration posture | GC-2 | not mechanically gateable at reasonable cost — proposed: a migration-review checklist row requiring self-verifying DML (the `20260728190000` `RAISE EXCEPTION` pattern) + the ownership question answered in the migration header |
| Gate-review flags surfaced | GC-11 | a test (or doc-health row) that lists manifest `Gate-review flag` notes at every area gate |
| PC-2/PC-4 split | GC-13 / AC3-O5 | board scope question — carry to the A-ADM design session, not forced here |

## W8 — Hygiene & docs

1. Register the four unowned PC-3 functions in the manifest (AC3-10).
2. Rewrite `docs/products/hub/CLAUDE.md:20` to describe the real convention — primitives in `components/ui/`, feature components in `components/{feature}/`, `app/` holds routes only (AC3-19).
3. Annotate this audit's register with CLOSED lines as workstreams land (the AC-7 lesson: closures annotated per-finding, same day).
4. Generalise the self-verifying-DML pattern note into the migration guidelines (AC3-O3).

---

## Cycle DoD

- [ ] W1 red suite demonstrated red at HEAD, green after the gate merge; full integration suite green post-apply
- [ ] Export completeness invariant red-demonstrated (a seeded unclassified member-data table fails), then green
- [ ] Every schema PR held at the gate with red evidence + apply commands; merged only on named approvals
- [ ] Rulings recorded (manifest relabel / U048 rider / R-6 activation note / U051 disposition); anatomy stamp + diagram reviewed if the U048 rider lands
- [ ] All extended gates land red-first with a fixture demonstration
- [ ] `ANATOMY-CONFORMANCE-AUDIT-3.md` updated per-finding with CLOSED lines and migration/PR evidence
- [ ] doc-health-check run at cycle close (ADR rider + CLAUDE.md edits are cross-cutting)
- [ ] `next build` clean · eslint 0 errors · unit + integration + notifications + platform suites green
