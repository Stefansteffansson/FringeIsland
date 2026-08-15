---
id: TASK-IDN-01
title: Self-deletion is half the standard pattern — no restore door, no scheduled final wipe
status: BUILT (2026-08-15, same session as the board) — migration `20260815210000`: stash trigger + `decommissioned_at` + `get_own_restore_state` + `restore_own_account` + the extracted `_pc2_hard_erase_user` primitive + `reap_expired_member_deletions` (pg_cron hourly, job 'member-deletion-reaper'). Hub half: restore door surface (`DecommissionedAccountSurface`), BFF routes `/api/account/restore-state` + `/api/account/restore`, grace-honest ceremony copy. Red-first both tiers: integration 6 reds → 8/8; unit 3 reds → 41/41 account, 1465/1465 full; siblings (admin hard-delete wrapper, lifecycle doors, fim erasure) green; `next build` exit 0. PR held at the schema gate. Deferred to gate execution: the E2E journey (delete → re-login → restore) — labelled, per the H018 journey-tier pattern
assigned_to: unassigned
priority: high
feature: FEAT-PC002-adjacent (reaper) + PC-2 Identity lifecycle
owner: platform/core (Identity) — delete_own_account, reaper; products/hub — profile copy + restore surface
wave: ferd
cycle: unscheduled — schema-gated (reaper extension)
depends_on: []
estimated_hours: unestimated — needs a small board (grace length + restore UX + wipe scope)
---

# TASK-IDN-01 — complete the self-deletion lifecycle

**Found:** 2026-08-15, live walk (the DM-01 tombstone proof). Beppe clicked Profile → "Delete my account for good". Result, substrate-verified: profile scrubbed to `[Deleted User]`, `is_active=false`, `is_decommissioned=true`, `deactivation_origin='member'`, sessions dead, DM content tombstoned (the DM-01 disposition ran perfectly) — **but `public.users.email` still holds the address and the `auth.users` credential row still exists, indefinitely**. No restore door, no scheduled final wipe: the member lingers forever unless an admin hard-deletes by hand. The button's copy ("for good") promises more than the door delivers, and indefinite retention with no schedule is the one shape GDPR's "without undue delay" does not tolerate.

## THE RULING (Stefan, 2026-08-15) — adopt the standard blueprint

1. **Click → strong confirm → immediate deactivation** (today's behaviour: scrubbed, invisible, logged out) — the start of a **30-day grace window**, told to the member plainly ("your account will be permanently deleted on {date}").
2. **Restore door during grace:** logging in within the window offers "Your account is scheduled for deletion — restore it?" One click cancels (the account-takeover and regret protections — the reason the industry converged on this shape).
3. **After the window: automated permanent erasure** — a reaper sweep (the Mist-reaper pattern, pg_cron) hard-erases member-origin decommissioned accounts past the window via the existing hard-erase path (`admin_hard_delete_user`'s mechanics), which also carries the DM-01 content disposition. Credentials, email, PII actually go.
4. **Honest copy throughout** — the profile door states the schedule; the confirmation names the date.

## Build notes (recorded so the board starts warm)

- The platform already owns both halves: the Mist reaper is the scheduled-sweep precedent; `admin_hard_delete_user` is the wipe. The new piece is the join: a sweep predicate (`is_decommissioned AND deactivation_origin='member' AND status_changed past window`) + the restore contract + surfaces.
- Needs a `deletion_scheduled_at`-style fact (or derive from the decommission timestamp) — schema-gated.
- ~~Board questions~~ **The board, settled (Stefan, 2026-08-15):**
  1. **Grace length: 30 days**, confirmed.
  2. **Restore returns the identity whole — stashed at click.** `delete_own_account` keeps the pre-scrub identity (full_name/nickname/bio/avatar, wiped by the reaper); the restore door unstashes. **Correction (disk-verified 2026-08-15): memberships do NOT survive the click** — the membership walk exits every active group at delete time (`20260812120000:268-430`, `groups_exited` in the audit row), and the DS-3/5/7 dispositions fire at click too. The ruling keeps that click behaviour; restore therefore returns the account's identity, not its social state — the restore copy says so honestly. (The earlier "roles/memberships survive the window untouched" note was wrong.)
  3. **Timestamp: new `decommissioned_at` column** (verified 2026-08-15: no decommission timestamp exists anywhere in the schema — `deactivation_origin` is bare TEXT). The deletion date is derived (+30d), not stored twice. Schema-gated.
  4. **No suppression record.** No abuse-lock mechanism exists to consume a hashed email; the wipe stays total (GDPR-cleanest). Revisit only if abuse appears.
  5. **Schedule notice is in-app copy naming the date** (the ruling's item 4); email of the schedule rides V3 (channel not live), deferred.
- Related display fix ships separately: [TASK-DM-02](TASK-DM-02-erased-author-renders-forbidden-literal.md).

## Acceptance criteria (sketch — the board finalises)

- Self-deletion states the date; login within the window offers restore; restore returns the account whole.
- The sweep erases past-window member-deleted accounts: `auth.users` row gone, `users` row gone (or reduced to the ruled suppression form), DM disposition fired, zero residue — the DM-01 verification class, extended.
- `delete_own_account`'s copy and behaviour agree.
