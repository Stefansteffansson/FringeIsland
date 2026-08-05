# N-E + corrections live-walk findings — 2026-08-05 (Stefan's walk of the bell-answerable invitations + the ADM-E corrections)

**Context:** Stefan walked the [2026-08-05 scenario script](./2026-08-05-ne-and-adm-corrections-walk-scenarios.md) on production — cycle N-E (FEAT-PD017 + FEAT-H042, PRs #426/#427/#429) plus the corrected ADM-E directives (WA-2/3/4, shipped in ADM-F). One finding became a **directive, ruled and fixed in-walk** (the WA-1 precedent). Substrate claims below were verified against the live DB in-session.

---

## WA-5 (RULED + FIXED IN-WALK) — the hard-delete ceremony ended on a stranded 404

**The walk (S8):** the consented hard delete **succeeded** — the WA-3 correction proving itself: `public.users` 0 rows, `auth.users` gone, personal group cascaded, **`consent_records` 0** (the row class that used to kill the cascade with a masked 500), and the `member.hard_delete` audit row written (10:31:01, target ids in metadata). But the admin was left standing on the vacated member URL rendering the bare 404 shape — success indistinguishable from breakage until checked elsewhere.

**Root cause:** the console's honest-repaint law ("every mutation repaints from a fresh read") colliding with the one act that vacates its own subject — the post-delete re-read finds nothing and renders the refused/404 state.

**Stefan's ruling:** agreed as a directive — the ceremony must complete with an explicit confirmation and a way back, not a stranded 404.

**Fixed in-walk (this PR, red-first):** the pinned 404 assertion in `admin-member-detail.test.tsx` flipped red first (the old cell asserted the stranded 404 as designed behaviour — adapted labelled under the ruling, canonical-wins), plus a designed-green guard cell pinning that a **refused** hard delete still stays on the detail with the reason. Implementation: a terminal `erased` view state in `AdminMemberDetail` — on hard-delete success the component renders the **"Member erased"** panel (name + email echoed per the W-4 law; consequences stated: account, personal group, consent records gone, forum/journeys reattributed; "the act is recorded in the audit log") with a **Back to members** link, and deliberately skips the void re-read. Refusals and every other ceremony keep the honest repaint unchanged. 30/30 suite, full unit 1298/1298, lint 0 errors, `next build` green.

---

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
