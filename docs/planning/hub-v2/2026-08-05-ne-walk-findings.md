# N-E + corrections live-walk findings — 2026-08-05 (Stefan's walk of the bell-answerable invitations + the ADM-E corrections)

**Context:** Stefan walked the [2026-08-05 scenario script](./2026-08-05-ne-and-adm-corrections-walk-scenarios.md) on production — cycle N-E (FEAT-PD017 + FEAT-H042, PRs #426/#427/#429) plus the corrected ADM-E directives (WA-2/3/4, shipped in ADM-F). One finding became a **directive, ruled and fixed in-walk** (the WA-1 precedent). Substrate claims below were verified against the live DB in-session.

---

## WA-5 (RULED + FIXED IN-WALK) — the hard-delete ceremony ended on a stranded 404

**The walk (S8):** the consented hard delete **succeeded** — the WA-3 correction proving itself: `public.users` 0 rows, `auth.users` gone, personal group cascaded, **`consent_records` 0** (the row class that used to kill the cascade with a masked 500), and the `member.hard_delete` audit row written (10:31:01, target ids in metadata). But the admin was left standing on the vacated member URL rendering the bare 404 shape — success indistinguishable from breakage until checked elsewhere.

**Root cause:** the console's honest-repaint law ("every mutation repaints from a fresh read") colliding with the one act that vacates its own subject — the post-delete re-read finds nothing and renders the refused/404 state.

**Stefan's ruling:** agreed as a directive — the ceremony must complete with an explicit confirmation and a way back, not a stranded 404.

**Fixed in-walk (this PR, red-first):** the pinned 404 assertion in `admin-member-detail.test.tsx` flipped red first (the old cell asserted the stranded 404 as designed behaviour — adapted labelled under the ruling, canonical-wins), plus a designed-green guard cell pinning that a **refused** hard delete still stays on the detail with the reason. Implementation: a terminal `erased` view state in `AdminMemberDetail` — on hard-delete success the component renders the **"Member erased"** panel (name + email echoed per the W-4 law; consequences stated: account, personal group, consent records gone, forum/journeys reattributed; "the act is recorded in the audit log") with a **Back to members** link, and deliberately skips the void re-read. Refusals and every other ceremony keep the honest repaint unchanged. 30/30 suite, full unit 1298/1298, lint 0 errors, `next build` green.

---

## WA-6 (RULED IN-WALK; fix HELD at the schema gate) — template-less groups instantiate the system set only; clones are pull-only

**The walk (Part 3, S10→S11):** Stefan asked why only new groups carry a cloned template's set, learned the two doors (automatic ride on template-less creation vs. pull), and ruled: *"new groups shall by default only have the system [templates]. Only at pull they will see the cloned [ones]."*

**What this reverses, named honestly:** the automatic ride was itself deliberate, two-day-old law — the ADM-F gate fix (`20260804210000` Defect 1) built it, and PC025 STORY-2 pinned it ("a clone rides every template-less instantiation"). The ruling supersedes that pin. What stays: both pull doors untouched (a chosen template's registered set at creation; `create_group_role` from the Steward's template picker) and `get_role_templates` keeps listing clones — pull visibility is the point.

**The fix (held PR):** one re-issue of `create_engagement_group` — the template-less arm gains `and rt.is_system`, body otherwise byte-identical; function COMMENT restated. Surface: the clone ceremony's second consequence rewritten ("groups created without a chosen template start with the system set only — a clone joins a group only when someone chooses it"). Pins flipped red-first: gate S2c (red at head — the ride still exists), S4a adapted to pull-door witnesses (red at head for the right reason: the ridden clone collides 23505 with the pull witness; green post-apply), the ceremony-copy unit pin (red demonstrated with the copy stashed), the E2E STORY-2 cell flipped (verify post-apply). PC010 suites deliberately left (all-seed environments behave identically under the filter).

**Walk consequence:** Part 3's S11/S12 pause until the gate merges and Vercel deploys; the script is updated to the new law.
## WA-7 (RULED + FIXED IN-WALK) — Save draft wiped the edits back to the live set

**The walk (Part 3, S11):** the admin unticked a permission, saved the draft (the confirm honestly said nothing changes until Apply), the version landed correctly in the history (v4, 34 permissions — the save itself was never wrong) — and then the checkbox fabric repainted "back to normal": the untick vanished, because the honest-repaint re-seeds the editor from the live default set after every mutation. Same family as WA-5: the honest repaint colliding with an act whose result lives somewhere other than the live state (here, in the version ledger).

**Stefan's ruling:** after Save, the edits stay present in the table, and the outcome points at the version awaiting Apply.

**Fixed in-walk (red-first, 1 red + 1 designed-green guard):** `load()` gained a `reseedDraft` switch — Save draft keeps the local fabric (the edits ARE the just-saved version) while the history repaints fresh; Apply/rollback keep the full re-seed (the live set genuinely changed — the guard cell pins it). The outcome banner now names the ledger row: **"Draft saved as v4 — awaiting Apply."** Suite 19/19, full unit 1300/1300, lint 0, build green. Hub-only — no gate; deployed on merge.

## WA-8 (DIRECTIVE) — group role copies show their source version + copied-date

**The walk (Part 3, S11, the "Nya gruppen #2" moment):** Gracy's group pulled "Steward clone" while v1 (35 permissions) was the default; Stefan later applied v5 (32, assign/remove unticked) to the template and then watched Dev Login — holding the group's copy — lawfully assign a role. Everything was the snapshot law working (substrate-verified: the group copy carries the v1 set; every binding lawful; no escalation), but **nothing on the group's role said so** — the group surface shows a bare "Template" badge while the template editor shows v5, and the admin reads the mismatch as a security hole. The confusion is the finding.

**Stefan's directive:** a group role copied from a template SHALL show its **source version and copied-date** (e.g. "Copied from Steward clone v1 · 2026-08-05").

**Build shape (recorded for the next planning step, not built in-walk):**
- **Substrate (schema-gated):** `group_roles` records *which version* was snapshotted — a `created_from_template_version_id` (or number) stamped at every instantiation door (template-less creation, chosen-template creation, `create_group_role` pull). Copies predating the column: backfill by grant-set match where unambiguous, else an honest "version unknown".
- **Surface:** the group roles panel renders the provenance line on template-derived roles; optionally the "template has moved on" hint (current default ≠ snapshotted version) — which is exactly the update-signal kernel of the [role-distribution design note](./2026-08-05-role-distribution-design-note.md); this walk moment is that note's best evidence, and WA-8 is its natural first data slice.

**Routing:** slotted at the next planning boundary, with the distribution design note.
## Walk verdict (2026-08-05)

- **S1 (bell accept + two-doors truth):** passed — chip "Accepted by [nickname]", card and list updated with no reload, durable across reload.
- **S2 (WS-4 focused landing):** passed — `/groups?focus=invitations`, scroll + transient highlight; the card-door decline converged the bell letter.
- **S3 (Withdrawn, fact-only):** passed — "Withdrawn", no buttons, no actor named.
- **S4 (held-group refusal):** passed — refusal pinned on the letter, ask survived the hold, answerable after reactivation.
- **S5 (two views racing):** passed — Window A converged automatically on the focus re-read ("Accepted by…"), the nicer of the two correct outcomes; no duplicate join.
- **S6 (WA-2 audit targets):** passed — all three render classes on one screen: live member as name + email, literal as-is, erased fixtures falling back to raw uuid by design. (Script imprecision corrected mid-walk: the S4 rows are group-targeted and cannot show the email half — #432.)
- **S7 (WA-4 instant force sign-out):** passed (confirmed at walk close — "we have walked all S1–8 now").
- **S8 (WA-3 consented hard delete):** passed at the substrate on every axis (the erasure verified in-session, above); the stranded-404 ending became **WA-5**, ruled and fixed in-walk — **and re-verified live post-fix** ("okay now it works"): a second disposable's hard delete ended on the "Member erased" panel.

**Walk verdict: COMPLETE — S1–S8 all passed**, one directive (WA-5) ruled and fixed in-walk. Extension: Part 3 (the never-walked ADM-F role-template editor) added to the scenario script at walk close, on Stefan's ask.

*Filed 2026-08-05 during the walk; bridges: `2026-08-05_03` (cycle close) and the session's mid-walk clarifications #431/#432. The WA-5 fix rides the same PR as this file.*

---

## Part 3 verdict (2026-08-06, close of walk) — COMPLETE, all four scenarios passed

- **S9 (list + read-only catalogue + seed immutability):** passed.
- **S10 (clone, both consequences):** passed; the consequence copy subsequently rewritten under WA-6.
- **S11 (draft → preview → apply → verify):** passed on every leg across two eras — WA-7 found and fixed mid-walk (the save-draft repaint); the snapshot law demonstrated live on Stefan's own data (the v1-copy-vs-v5-template moment → WA-8); step 6 verified live post-#435 (G10 born with the system set only) and the pull door delivered the live v6 set on demand.
- **S12 (rollback + verification-by-audit):** passed.

**The WA-6 rider's numbers:** gate suite **17/17** post-apply (S2c flipped; S4a's pull-door witnesses through) · `admin-roles` E2E **11/11** (incl. the flipped system-set-only cell; leak 0→0) — with the WA-5/WA-7 E2E cells adapted in-tree user-side, closing the follow-through this session's unit-only flips had missed · full unit **1300/1300** · lint 0 · build green. The late-night full integration sweeps were adjudicated honestly: one red diagnosed (the collation cell — deterministic once the first differently-cased template name existed), four fenced to the TASK-INT-01/02 environment family on untouched solo-green controls, and one earlier 27-red run excluded as self-caused (destructive debris deletes during a live sweep — the one-DB-consumer violation, owned).

**Walk-born artifacts beyond the findings:** WA-6 shipped (#435 + `20260805150000`) · WA-7 shipped (#437) · WA-5 shipped (#433) · WA-8 slotted with the [role-distribution design note](./2026-08-05-role-distribution-design-note.md) · the debris swept (30 groups, 13 consented fixture users under the sanctioned erasure path) · both leaking E2E specs gained teardowns (#439) with the TASK-E2E-02 audit lead recorded.
