# Session bridge — ADM-G built: PC026 held at the schema gate (#418), H041 tranche 1 merged (#419); tranche 2 unlocks on the named approval

**Date:** 2026-08-04 (session 9) · **Wave:** Ferd · **Cycle:** ADM-G (built; gate pending)
**Follows:** [`2026-08-04_04_-_ADMG-DOSSIER-BOARD-SETTLED-DECOMPOSED-BOTH-SPECS-4-READY.md`](./2026-08-04_04_-_ADMG-DOSSIER-BOARD-SETTLED-DECOMPOSED-BOTH-SPECS-4-READY.md)

---

## READ THIS FIRST — the fresh session starts at the #418 gate

1. **[PR #418](https://github.com/Stefansteffansson/FringeIsland/pull/418) is held at the schema gate for NAMED approval** — the FEAT-PC026 migration (`20260804230000`). Red at head: **12 failed / 7 passed**, every red the exact pre-PC026 refusal, every green a labelled continuity pin. Apply commands in the PR body. On "ok merge 418" (or equivalent naming): apply → repair → merge → **tranche 2** (below). A generic "go on" does not unlock it.
2. **Two build findings are carried as named scope inside #418** (both in the migration header + PR body + comment thread):
   - **The gate finding:** `admin_remove_member_from_group` refused ALL non-active groups (`20260801190000:786-788`; its own COMMENT says "non-active group P0001"; PC023 never re-issued it — the dossier premise 7 was wrong for this door). Re-issued byte-identical except the guard admits `suspended` only; a labelled-green cell pins the resting refusal.
   - **The payload-walk finding:** members rows gain **`user_id`** beside `email` — the remove contract is keyed by `public.users.id` and the Hub cannot resolve it API-first. Red re-demonstrated after the amendment (same 12/7 partition).
3. **[PR #419](https://github.com/Stefansteffansson/FringeIsland/pull/419) (H041 tranche 1) is MERGED** — the wing, six BFF routes, both ceremonies, unit tier red-first (wing suite 12 + the NEW route-tier suite 17, both demonstrated red module-absent; two labelled H035 adaptations). Unit 1291/1291 · lint 0 errors · `next build` green. **Pre-apply interim** on any suspended group: banner + members (`no email on record`, Remove disabled) + three honestly-errored sections — resolves at apply.
4. **Surface deviations from the spec sketch, named:** remove route segment is `[userId]` (not `[memberGroupId]`) per the PC021 key; `ConfirmModal` gained an additive optional `confirmDisabled` prop (the H039 widening's sibling) for the reason gates. Both go into Implementation notes at 6-done.
5. **Tranche 2 (post-apply) checklist:** PC026 gate suite 19/19 → PC023 suite + C-series + platform conformance → full `npm run test:integration` → the E2E journey (suspend → wing → four families → moderate with member-side tombstone via second context → remove with member-side loss → `/admin/audit` both rows with WA-2 target honesty → reactivate → wing gone; leak 0→0; non-admin 404 on every new route) → deep-cold N/A check per the spec's budget row → maturity `6-done` + L4/README rows same-commit → CHANGELOGs (root + platform-core for PC026; root + hub/ for H041) → plain-English walkthrough → tasks to done (ADMG-01 stays the review→done schema path) → retro-fodder: the two build findings.
6. **The delegated sweeps' residue worth keeping:** the sibling sweep confirmed ZERO will-flip assertions and that refusal copy strings are unpinned (tests assert SQLSTATEs); the anatomy sweep flagged that **no BFF route-tier suite existed** — #419 established the pattern (`hub/tests/unit/app/api/admin-group-content-routes.test.ts`), worth reusing on future admin routes.

## What this session did (gate-to-gate)

- Discovery sweep: no-op at open; synced after every merge.
- **Step-3 batch (#417):** TASK-ADMG-01/02 created, both specs `4-ready → 5-in-cycle`, both L4 rows + both README rows advanced same-commit.
- **PC026 built red-first** on lead-session substrate verification (latest-definition-wins on all seven touched objects) — one migration: three suspended-scoped sight arms, the `is_conversation_participant` truth-table re-issue (`(P OR (A AND K AND S)) AND (A OR NOT S)`), the forum Tier-1 pass pinned as law (mechanism in the suite docblock; AB-6 material), the members `email` + `user_id` re-issue, the sealed `ds5_moderation_moderate_group_post` (composes `moderate_forum_post` — reuse, never a second table-touching body) + `admin_moderate_group_forum_post` PC-4 wrapper (wall, 22023 reason, `moderation.forum_post_moderated` audit write), and the gate-finding remove re-issue. Manifest registrations (PC-4 + DS-5). Held at #418.
- **Two delegated sweeps** (sibling assertions; Hub anatomy) — both reconciled in #418's thread; the anatomy sweep surfaced the `user_id` gap before any Hub code assumed otherwise.
- **H041 tranche 1 built and merged (#419)** — see point 3.

## Standing items

Unchanged from session 8 (TASK-E2E-02 · TASK-E2E-01 · deferred Eid piles · the `/admin/roles` + admin-plane deep-cold ADR-U043 pass at AB-6 · the G-3 journeys deferral · the Tier-1 `has_permission` finding on AB-6's docket) — **plus new for the retro:** the dossier premise-7 miss (the remove door's own status guard) as a delegated-walk verification lesson: the walk verified the *doors it audited*, and the remove door was composed-not-audited.

## Close ritual (this session)

- [x] Dashboard refreshed at bridge time
- [x] Session bridge (this file)
- [x] Discovery synced after each merge
- [ ] No doc-health run owed (no cross-cutting change; CHANGELOG entries land at tranche 2 / 6-done)
- [x] Checkout left on main, clean; #418 the only open PR
