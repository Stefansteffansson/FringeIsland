# Session bridge — Cycle G-C built and closed (FEAT-PC012 + FEAT-H015 `6-done`)

**Date:** 2026-07-04
**Session type:** Build session (`feature-development`) — same session as the G-C decompose (bridge `2026-07-04_05`; its PR #67 merged on Stefan's nod). Platform-first through the schema gate (PR #68, nodded + merged), then the Hub half to `6-done`.
**Status:** **Cycle G-C complete.** MEM-1/2/3 live end-to-end.
**Participants:** Stefan (two merge nods: PR #67 decompose batch, PR #68 schema gate) + Claude

---

## Gate resolution (Stefan, this session)

PR #68's seven gate items accepted with the nod: Open Q1 (exact-only email search), Q2 (existing-FIM emails convert server-side), Q3 (`invite_members`-gated pending list), Q4 (erasure hard-deletes addressed-to invitation rows); the `auto_assign_member_role_on_accept` fix; the direct email-INSERT residue (accepted, the G-B posture); TRUNCATE hygiene on `pending_email_invitations` + `group_memberships`.

## What was built

- **Platform (FEAT-PC012, migration `20260704144630`):** nine SECURITY DEFINER contracts over the Conformant invitation substrate — search (D3/DS-6 seam), `invite_member`, `invite_by_email` (D4 — durable, undispatched, lowercased + case-insensitive duplicate guard), the pending read + two cancels, `get_my_invitations`, accept/decline. **No new table, no policy changes.** Plus the `erase_fim_account` Art. 17 amendment (the FEAT-PC002 gap found at decomposition) and the trigger fix below.
- **Hub (FEAT-H015, no migration):** the Invitations panel on `/groups/[id]` (typeahead with payload-disabled hits; invite-by-email with **honest undispatched copy**; pending list with payload-driven Expired badge; ConfirmModal cancels; renders `null` without `invite_members` in the effective-permissions payload) and **MyInvitations on `/groups`** (invitation context only; Accept re-reads — the group appears as the invitation leaves; ConfirmModal Decline). The detail page's one refresh path now spans **four reads**, the invitations read chained off the fresh permissions payload.

## Findings worth carrying

1. **Real substrate defect, red-demonstrated then fixed:** `auto_assign_member_role_on_accept` bound the default role by `name='Member'`; every v2-created group names instances `'Member Role Template'` (the G-A bootstrap), so an accepted invitee silently received **no role at all** (zero permissions). Fixed via `created_from_role_template_id` linkage with the short-name fallback for legacy groups. The G-B "instance naming is a copy/UX question" observation turned out to hide a functional dependency — worth remembering when the rename/prettier-defaults question resurfaces.
2. **Display identity is the first name token** (the `handle_new_user` nickname rule) — integration personas need single-token display names or they all collapse to the same identity. Surfaced by the first green run; carried into the suite and the E2E spec.
3. **The Open Q2 conversion was observed live in E2E:** inviting an existing FIM's email renders as a membership invitation in the pending list — the conversion is Surface-invisible plumbing, exactly as specced.
4. FEAT-PC002's Implementation notes were **not** amended with the erasure cross-reference this session (the amendment is recorded in PC012's notes + the migration comment) — a one-line cross-reference to add at the next touch or cooldown.

## Evidence & gates

PC012: 26 integration, **24 demonstrated RED** (PGRST202 + the trigger-defect red) → GREEN, 2 direct-path asserts green-by-design labelled. H015: 17 route-units + 14 component units red-first at collection; 3 E2E journeys on dedicated spec-created FIMs (invitation arc, the email-invited newcomer's auto-claim arrival, decline + cancel). **Full unit 320/320 (51 suites) · integration 186/186 (28 suites) · E2E 43/43 · `next build` clean · lint 0 errors** (one pre-existing warning).

## Next steps

1. **Cycle G-D (membership lifecycle, MEM-4/5/6)** — decompose session next, per the Groups plan (leave/removal cascades are Conformant substrate; MEM-6's DS-5 attribution disposition tags `pending-DS-5`, not built — D2).
2. Standing: G-36/IDN-10 parked specs by next cooldown; org-spec §5 seeding-sites doc-health finding queued; IDN-12 + perf T2 parked; P3b/P4/P1-residual parked; group-as-actor design session at the G-E → G-F boundary; `test:integration:rbac` legacy-script cleanup at cooldown; the PC002 cross-reference line (finding 4).
