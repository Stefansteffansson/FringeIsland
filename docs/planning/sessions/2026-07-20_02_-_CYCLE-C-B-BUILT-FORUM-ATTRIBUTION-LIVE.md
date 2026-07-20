# Session bridge — 2026-07-20 (02): Cycle C-B built — group forum + former-member attribution live, MEM-9 un-seamed

**Session span:** one continuous session, 2026-07-20 (following bridge `_01`, the C-A close). Scoped doc-health → C-B decomposition to 4-ready → build end-to-end through one named schema gate → merged → full sweeps green → close.
**Previous bridge:** `2026-07-20_01_-_CYCLE-C-A-BUILT-MESSAGES-LIVE.md`.
**PR trail:** #206 (scoped doc-health, merged) · #207 (DS-5 entity CLAUDE.md refresh — **held for the merge nod**) · #208 (C-B decomposition, merged) · #209 (tasks CB-01..05, merged) · #210 (schema gate: forum contracts + attribution + ADR-U047 relocation + conformance lockstep, **nodded "ok merge 210"**) · #212 (forum surface — the stacked #211 auto-closed when #210's branch was deleted; re-opened to main, merged). Migration `20260720120000` applied + repaired.

## What shipped, as a member would tell it (the walkthrough)

My group has a forum now — a section on the group's page, threads newest-first with their replies beneath, in the order they were written. I can post if my role lets me, reply on a top-level post if it lets me, and if I steward the group I can remove a post — and each of those only appears because the platform said yes, never because the page guessed. Posting feels instant and says so honestly when a send fails. When a moderator removes a post it becomes a plain "Removed by a group moderator" where it stood, content gone, the thread still whole. And names tell the current truth: a member shows by name; someone who has left shows as "Former member" — and if they rejoin, their name comes back on its own, because nothing I wrote was ever rewritten, only how it's shown. A hard-deleted author reads as "Unknown". That same honest naming now shows in my messages too. Walked against the shipped surface (E2E: post → reply → moderate → former-member attribution, effects asserted with in-context revisits + admin-driven membership removal): every sentence is a tested behaviour.

## The build in facts

- **Platform (FEAT-PD009, `6-done`):** four forum contracts (`get_group_forum` keyset-paged + author-resolved, `create_forum_post`, `reply_to_forum_post` with the `enforce_flat_threading` trigger speaking P0001, `moderate_forum_post` idempotent soft-delete); `ds5_resolve_author_display` — the COM-14 ladder as **one substrate home** (active / 'Former member' / 'Unknown'; ADR-U021 display law, never data mutation; CB-9 strings); `get_conversation_detail` re-issued so its sender map carries `{display_name, attribution}` too; `ds5_lifecycle_user_hard_deleted` — **ADR-U047's first DS-5 fact** (Amendment 3), the `admin_hard_delete_user` forum crossing relocated verbatim, Core re-issued byte-equivalent except the PERFORM; write-narrowing (three permissive policies dropped); conformance lockstep (`forum_posts` → `DS_TABLES`, `enforce_flat_threading` + the contracts → the DS-5 allowlist).
- **Surface (FEAT-H026, `6-done`):** `hub/lib/forum/*` (couriers, SQLSTATE→HTTP with P0001→400, per-group session cache + W9 + confirmed write-through, pure attribution helper), 3 BFF routes (route-policy 5/5), `GroupForumSection` (failure-isolated, permission-gated post/reply/remove, optimistic, tombstones in place, keyset load-earlier) slotted beside the Conversations panel; the messages detail render consumes the upgraded sender map. **The MEM-9 un-seam landed** — FEAT-H016/H017 `pending-DS-5` notes discharged.
- **Sweeps:** unit **101 suites / 747 tests** · integration **522** (comm forum 21/21; conformance green) · E2E **69/69** · `next build` clean · route-policy 5/5 · lint 0 errors.
- **Red→green, honestly:** forum contract suite demonstrated **18 red / 3 labelled green** pre-apply (refusals pinned to exact SQLSTATEs incl. P0001+message; the 3 greens = the ADR-U047 sentinel behavior-preservation guard + existing RLS + the always-refused handler probe) → **21/21** on apply. Surface unit suites **labelled TEST-AFTER** honestly (built ahead of them — a red-first ordering slip on the surface tier; the contract suite + E2E are the red-first proof).

## Found at build

1. **Green-at-red fixture catch (investigated + fixed):** engagement-group role instances are named by *template* name (`Member Role Template`), not `Member` — the bare-name lookup left fixture members permission-less and masked the direct-INSERT narrowing red. Filter corrected + `RETURNING`-guarded. (Precedent documented at `stewardship-succession.test.ts:74`.)
2. **Two transient infra flakes, found-not-caused:** the full integration sweep's `platform-exit` + `stewardship-succession` failed on Supabase **Management-API connection timeouts** in fixture setup (`runAdminSql`) — passed clean 36/36 on sequential re-run; the E2E fleet's `profile.spec` flaked on a `toHaveURL` gate (standing flake watch) — passed 3/3 on re-run. Neither touches C-B code.
3. **E2E locator collision:** the reply open-affordance and the composer submit both read "Reply" (Playwright strict-mode) — the submit became "Post reply" + a distinct testid (post-merge fix, this close PR).

## Deep-cold spot check disposition (ADR-U043 Amendment 1)

**Recorded, not measured.** C-B adds a forum section read on `/groups/[id]`, but it is a **lazy post-paint standalone section read** (the GroupConversationsSection precedent, ADR-U042 justified standalone; own skeleton, failure-isolated, session-cached) — it does **not** gate the group page's first paint. The Amendment-1 trigger is "adds or reroutes a request on a user-facing *first paint*"; the page's first-paint budget is unchanged, so the touched-page spot measurement is not triggered.

## Open at close

1. **PR #207 still held** — the DS-5 entity CLAUDE.md refresh (steering-file carve-out from the doc-health run) awaits a merge nod. Independent of C-B build.
2. **Cycle C-C next (realtime + reconciliation, ADR-U039):** ping-then-fetch over private broadcast for DM/forum/badge; reconnect reconciliation (COM-11); one fresh U039 build for both surfaces (CB-8). Nothing in C-A/C-B touched §L2 §4's channel list.
3. **Then** C-D (announcements — design session first, CB-2; windows CB-3; reports CB-4) · C-E (lifecycle dues: the D2 close/delete-group forum + group-conversation disposition as `ds5_lifecycle_*`; `get_own_messages_export()`, CB-6 suspended posture) · C-F (IDN-10, specs authored from scratch).
4. **MEM-9 hook-set note:** no `gaps.md` entry existed for MEM-9 (grep zero, 2026-07-20) — the seam was tracked in the plan + the H016/H017 spec notes (now discharged) + the retro standing line; recorded here for the area-gate re-verify.
5. **ADR-U047 gained its first DS-5 fact** (`ds5_lifecycle_user_hard_deleted`, Amendment 3 riding #210). The C-E `ds5_lifecycle_*` D2 handlers build on this seam.
6. Standing items carry (TASK-MIST-01, TASK-DOC-003/004, Vercel scale-to-one, logo, launch checklist; the dev server started for E2E is still up — stop it or reuse).
