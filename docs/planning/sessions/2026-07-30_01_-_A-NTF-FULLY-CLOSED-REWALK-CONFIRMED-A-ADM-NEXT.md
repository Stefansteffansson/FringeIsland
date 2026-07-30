# Session bridge — A-NTF is fully closed, the fixes are confirmed on the deployed site, and A-ADM is clear to open

**Date:** 2026-07-28 → 2026-07-30 (session 01) · **Wave:** Ferd · **Area:** A-NTF — closed and re-walked
**Follows:** [`2026-07-28_01_-_A-NTF-GATE-CLOSED-NB8-REFUTED-AREA-COMPLETE.md`](./2026-07-28_01_-_A-NTF-GATE-CLOSED-NB8-REFUTED-AREA-COMPLETE.md)

---

## READ THIS FIRST — what the next session must pick up

**A-ADM (Platform-Ops) is next — the sixth and last Phase-3 area.** [`TASK-OBS-01`](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md) lands at area open. **Nothing is carried into it as owed work** — every item the previous bridge listed is closed.

**One PR is HELD and needs your nod: [#334](https://github.com/Stefansteffansson/FringeIsland/pull/334)** — the doc-health-check run. It edits `.claude/skills/doc-health-check/SKILL.md` (the skill's own mandated table-feeding), which is a steering file and therefore a fuller-auto carve-out. Everything else this session is merged.

**One sequencing argument to weigh before scoping A-ADM.** The re-walk found that **a group handed to FringeIsland becomes invisible to the only party who can now act on it** — stewardship correctly goes to the DeusEx *system group*, and *My Groups* lists personal-group memberships, so nothing enumerates platform-held groups. That list is **ADM-8**, already in the inventory and unbuilt. This is an argument for putting ADM-8 **early** in A-ADM rather than after the moderation queue — and [`TASK-INT-05`](../backlog/tasks/TASK-INT-05-e2e-fixtures-leak-groups-into-the-deusex-system-group.md) is a reason to do it in that order too: the DeusEx membership list is currently **39/42 test detritus**, so ADM-8 built today would be built against a lie.

---

## One-paragraph state

`main` clean, tree clean. **Eight PRs merged (#327–#333)**, one held (#334). **Four migrations applied and verified live.** A-NTF's exit checklist is **fully ticked**; the area was then **re-walked on the deployed site**, confirming eight prior fixes and finding four more defects, all fixed. Suites at close: unit **1033/1033** (133 suites) · integration **715/715** (58 suites) · notifications **100/100** · platform **15/15** · `next build` clean · eslint 0 errors.

## The through-line: three checklist lines, and two of them were WRONG

The previous bridge left three exit-checklist lines deliberately unticked. Clearing them found that **two were mis-worded rather than undone** — the same shape as that session's own finding that three of six owed items were wrong rather than merely open.

1. **`DS_OWNED_ALLOWLIST` could not be located because it no longer exists.** COR-B W1 replaced the flat allowlist with `supabase/ownership.manifest.json`. The RPCs are registered there explicitly — so the open question ("as written, or via the `/^ds\d+_lifecycle_/` auto-allow?") had a third answer: **neither**.
2. **NTF-6's "three dedicated handlers" was never three.** Two answer in the row; one kind answers on a surface; NB-1's third name (`submit_content_report`) is not a notification response at all. The adversarial tests existed all along, in the suite owning each handler.
3. **The oracle spine was a real gap** — the one the gate flagged as having positive evidence. B-NOTIF-001's consistency CHECK and B-ADMIN-011's whole contract were untested; **B-NOTIF-003 was ruled superseded**, because its subject was deliberately dropped and re-porting it would test a function that must not exist.

## The orphaned-groups decision — it was a delete

The gate parked this as "not a delete" because the groups held live memberships and message authorship. **Measured, that was right to stop the delete and wrong about its size:** the "8 690 members of real groups" were **8 808 memberships of one group**, the everyone-group; exactly **one** message sat where a live user could see it.

**The trap:** a strict "does it attribute anything?" test said **zero** were safe, because every personal group is `created_by` / `added_by` / `assigned_by` of its own bootstrap rows. That is **self-referential attribution — the NB-8 shape again**, and the definition was wrong, not the data. The discriminator that works is *does it attribute anything that **survives** the delete*: **674 kept** (195 message senders, 413 audit actors), **10 598 deleted**. Control: 420 messages, all 420 still carrying a sender.

## TASK-INT-04 — the "flake" was never the PAIR test

The task's instruction *not* to act on the filed hypothesis was the right one. Captured on run 4 of 8: **no assertion failure at all** — the run died on the test's first line, on an unretried management-API reset. `MUTED_KIND` was irrelevant. The 2-in-5 / 25-of-25 profile is per-call probability times call volume, not order dependence.

**My first fix was too narrow and the verification streak caught it** — the proxy answered with an HTML page and `res.json()` threw before any predicate could see a message. A third regex would have invited a fourth, so the fix became structural: *thrown* is transient by construction (Postgres always answers with a well-formed JSON body), *reported* gets the narrow predicate.

**Both retries now log.** A swallowed retry is indistinguishable from a healthy run — which is why the ten-run streak reported "0 transients" without that meaning anything. The logging then earned itself twice within three full runs, both recovering into a green 715-test suite.

## The re-walk (2026-07-30) — [full findings](../hub-v2/2026-07-30-antf-rewalk-findings.md)

Eight fixes confirmed live, including the **NTF-9 degraded notice**, which no earlier walk could reach because W-05 ejected the session before it could render. Four new defects found and fixed: the `asks` category inheriting `account`'s copy, the raw `Failed to fetch` banner, the inbox page dispatching an event it never listened for, and a member count contradicting the list beneath it.

**Two of the walk's "failures" were errors in the script I wrote**, recorded in the findings doc as carefully as the product defects: I told the walker to mute `stewardship` and then assign a role (`role_assigned` lives in `membership`), and I verified "Dev Login is sole Steward" as a precondition and then placed a step ahead of it that destroyed exactly that. **Preconditions verified at the top of a walk are not enough if a later step mutates them.**

## The pattern worth carrying into A-ADM

Three separate defects this session were **one pattern**: *a sentence written about "the members of a set" becomes false the moment the set grows.*

- **W-08** — the email line promised "your choice" for a choice never offered.
- **The `membership` relabel** — "Group membership & invitations" stopped holding invitations.
- **RW-01** — "these tell you about your own account and access" was written when `account` was the only non-suppressible category; `asks` became the second and inherited it silently.

It is now a row in the doc-health-check Section 1.5 table, named as a pattern rather than a third incident, so the next reader can spot the fourth before a walk does.

## Migrations applied (all verified live)

| Migration | What |
|---|---|
| `20260728190000` | W-03 #1 — nomination bodies state the fact; the deadline stays in `expires_at`. **109 delivered rows deliberately not rewritten** |
| `20260728200000` | Retired **10 598** orphaned personal groups that attribute nothing surviving; **674 kept** |
| `20260730200000` | Retired the `na_test_kind_mrzenort` registry probe and its one delivery row |

## Open, named, not buried

| Item | Where |
|---|---|
| **ADM-8 sequencing** — platform-held groups have no list | [re-walk RW-05](../hub-v2/2026-07-30-antf-rewalk-findings.md) |
| **39 E2E groups** in the DeusEx system group | [`TASK-INT-05`](../backlog/tasks/TASK-INT-05-e2e-fixtures-leak-groups-into-the-deusex-system-group.md) |
| **`reconnecting…`** renders a permission refusal and a socket drop identically (`manager.ts:127-129`) | re-walk RW-08 |
| **The registry-homed *why*** for non-suppressible categories — a `RETURNS TABLE` change to a live DS-5 contract | FEAT-PD013 / re-walk RW-01 |
| **`cleanupTestGroup` swallows its refusal** into a log line — the original defect's shape, one level up | TASK-INT-05 acceptance |
| **Design question, not a defect:** being made a Steward is filed as `membership` news, so muting churn silences it | re-walk, "open design question" |
| **Skill calibration:** S1.6's `directional` grep matches `one-directional` | #334 body |

## Close ritual

- [x] `npm run dashboard` — refreshed (7 tabs, **733** files, up from 730)
- [x] `doc-health-check` — run; 66 `6-done` specs clean, five drift fixes, one table row fed, `TASK-INT-05` filed
- [x] Session bridge (this file)
- [ ] Discovery sweep — run after this file lands
- [x] Eight PRs merged (#327–#333); **#334 HELD** for the steering-file nod
