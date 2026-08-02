# A-ADM live walk — findings record (gate leg 4)

**Walked:** 2026-08-02 evening → 2026-08-03 (Stefan live, Claude verifying each ceremony against the DB in real time)
**Script:** [`2026-08-02-admin-live-walk-script.md`](./2026-08-02-admin-live-walk-script.md) · **State: ALL SEVEN STEPS COMPLETE — the walk is done (2026-08-03).** Step 6: NINE of the twelve relic reports resolved (mixed dismissed/actioned; every one verified — resolution columns + `moderation.report_resolved` audit row + `report_resolved` notification timestamped to the microsecond with its audit row: the trigger → registry → dispatcher chain live; the drift-honesty render observed on genuinely vanished content; three relics deliberately left open for the hygiene sweep). Step 7: the audit read-back matched Stefan's memory of the entire walk ("all seems to work").

> **STEFAN'S DIRECTIVE (2026-08-03, recorded verbatim in intent): "All these stalled and/or cached issues need to be fixed."**
> The stall/cache family below (W-5, W-7, W-8, W-9, W-10) is therefore **committed fix work, not accept-as-observation**. Placement (which board/cycle owns each) is decided at the area retro; the ADM-7/ADM-17 board is the natural home for the admin-plane rows, the Identity/account area for the member-side rows.

## What the walk PROVED (all verified in DB + audit as they happened)

Every ceremony walked landed with correct state and a correct audit row: group suspend/reactivate (`Nya gruppen #2`, +`CA Messages G` practice pair) · member suspend/reactivate/force-sign-out (Ada — "1 session signed out" was literally true) · platform-admin **grant** through the real ceremony (root → Stefan) · **five revokes** (roster 7 → 2: the four leaked fixture admins and the mis-granted twin — the admin plane is clean for the first time since July) · the suspended wall (IDN-9) renders honestly on a fresh read and binds to the **person, not the browser** (sign-out → sign-in-as-other lands in the normal app) · the `/admin` gate refuses a non-admin with the 404 shape end-to-end · all four dashboard tiles reconcile **to the digit** against their contract definitions (members/groups/moderation/journeys — verified via `ds3_stats_snapshot`'s own filter).

## Findings

### The fix-directive family (stalled / cached — Stefan: fix these)

- **W-5 — members-list input stall at scale.** Typing in `/admin/members` search freezes ~10 s on real-world Windows (cross-browser, incognito-proof, OS-cursor lag on field focus). Clean headless: ~50 ms/keystroke; with the accessibility tree forced: 214 ms worst task; DOM size proven the variable by differential (login inputs smooth, 1 900-row page stalls). Root: no debounce/deferral, no row cap, no virtualization — 1 900 `<tr>` reconciled per keystroke, and an OS-side input/accessibility consumer amplifies it ~50×. **Fix: bounded rendering (row cap + deferred filtering, or pagination/virtualization).** This also discharges the B-PERF "pagination when a measurement asks" trigger — the walk was the measurement. Natural home: the ADM-7 board (bulk selection reworks this same list).
- **W-7 — suspension is invisible in-session.** A suspended member keeps browsing on stale boot-time "active" state (profile said "Account: active" while suspended); the IDN-9 wall only fires on a hard load. No notification arrives — that half is a **recorded Eid deferral** (sanction-communication kinds, board DB-4), but the staleness half is a Hub gap. **Fix: in-session account-state revalidation** (on soft-nav, on a cadence, or on any 4xx write refusal).
- **W-8 — refusals are honest but mute.** The suspended member's profile save was correctly refused, but the surface said only "Failed to update profile" — the typed reason never reaches the user; a suspended member is never told they're suspended at the point of refusal. **Fix: thread the typed refusal to the surface** (house rule already: refusals surface visibly).
- **W-9 — `hub.adminEntry` sessionStorage cache bleeds across users, bidirectionally.** Photographed live in one frame: Gracy (non-admin) SEES "Platform admin" (inherited Stefan's cached `yes`); Stefan (real admin) DOESN'T see it in the tab where Gracy's `no` was cached. Render-only — the server 404s her on click (verified live) — but it's a state-honesty/minor-disclosure defect and never invalidates on grant/revoke either. **Fix: key the cache by user id + clear on auth-state change.**
- **W-10 — the suspended wall's exit is findable only by luck.** The wall is correct and person-bound, but while the suspended session lives, every path (including address-bar `/login`) bounces back to it; the wall's own Sign-out button is the only exit and reads as part of the error, not as the way out. **Fix: UX — make the escape explicit** (e.g., "Sign out to use another account").

### Product-semantics findings (need a decision, then enforcement)

- **W-3 — group suspension has no teeth member-side.** DB + audit + admin badge all correct; the member-facing surface shows the red "suspended" chip on fresh reads and **nothing is refused**: the group's steward posted to the suspended group's forum **84 s after** suspension (DB-timestamped through the wall). The ConfirmModal copy is *precisely honest* ("Every member sees the group marked suspended") — the gap is that marking is ALL suspension does. PC020 anticipated exactly this ("if a read turns out status-blind, record it as a finding for the gate"). **Needs: the suspended-refusal matrix defined (posts? announcements? conversations? enrolment? for whom?) + enforcement in the member-facing walls, not the admin contract.**

### Ceremony-safety finding

- **W-4 — same-name doppelganger caused a live mis-grant.** Two "Stefan Steffansson" rows (`stefan@example.com`, a 2026-02 fixture, vs the real yahoo account); the grant ceremony hit the fixture first; the audit trail caught it and the revoke ceremony corrected it within minutes. **Improvement: the grant/revoke confirm should echo the unique identifier (email).**

### Moderation-family observations (Stefan's bonus round — he walked reporter-side AND reviewer-side)

- **W-11 — outcome-only reporter feedback confirmed live, as designed.** Stefan filed a real report as a member, resolved it as admin (actioned + internal note), and received the reporter notification: outcome class only, no reviewer identity, note never relayed — exactly what the resolve panel promises. The richer answer-back he instinctively expected is the **recorded Eid deferral** (sanction-communication kinds, board DB-4). Stays Eid unless re-scoped.
- **W-12 — report uniqueness is lifetime, not per-open-report.** Re-reporting already-reported content is refused with honest copy ("You've already reported this." — the `one_per_reporter_target` constraint surfacing correctly). Consequence worth recording: after resolution, that reporter can NEVER re-report the same content — even if it drifts worse post-dismissal (the exact drift the snapshot exists for). Harmless pre-launch; the moderation family wants re-reportable-after-resolution or escalation semantics eventually. → Eid pile with W-11.
- Member-side moderation state renders everywhere it should: removed posts show "This post was removed", reported posts carry the "Reported" tag, duplicate submission refused at the modal.

### Observations (recorded, no fix directive)

- **W-1** — the dashboard's "completed, 30 days" counts completion *events* by `completed_at` regardless of current status (a completed-then-reactivated enrollment counts). Faithful to its contract; tile wording is a Journeys-owner call.
- **W-2 — fixture-hygiene pile** (feeds the standing retro item): 3 journey enrollments marked completed by direct DB writes bypassing the contract (`completed_at` NULL — contract paths always stamp it); the 12 relic open reports; ~2 015 test users / 3 612 groups (~90 % `@fringeisland.test`); the doppelganger twin; Stefan's own account carried a stale DeusEx invitation + 9+ unread fixture notifications.
- **W-6** — `member.force_logout` audit rows use `target='users'` + `metadata.target_user_ids[]` (array primitive) where sibling ceremonies put the user id in `target` — fully attributable, but a `target`-column scan misses force-logouts. Cosmetic consistency.
- **Multi-window staleness is by design** (refresh-based, no realtime — a written H035/H036 no-go) and behaved as designed; the members list lacks the dashboard's explicit "As of + Refresh" affordance — cheap parity note.

## Walk-support actions taken (recorded for completeness)

Temporary password set on Stefan's own account via service role (his request, his account); Gracy's password was already known to Stefan. Measurement-FIM absent throughout (torn down before the walk). No seeding was needed — the walk ran entirely on real relics and left the platform *cleaner* (admin roster 7 → 2, Gracy reactivated, Ada restored).
