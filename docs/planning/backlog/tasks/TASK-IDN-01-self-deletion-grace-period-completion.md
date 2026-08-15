---
id: TASK-IDN-01
title: Self-deletion is half the standard pattern — no restore door, no scheduled final wipe
status: registered — RULED (Stefan, 2026-08-15): adopt the grace-period blueprint; "we'll build it soon"
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
- Board questions: grace length (default 30d), what the restore door restores exactly (roles/memberships survive the window untouched — they do today), whether a suppression record (hashed email) survives the wipe for abuse-lock, notification/email of the schedule (V3 — email channel not live).
- Related display fix ships separately: [TASK-DM-02](TASK-DM-02-erased-author-renders-forbidden-literal.md).

## Acceptance criteria (sketch — the board finalises)

- Self-deletion states the date; login within the window offers restore; restore returns the account whole.
- The sweep erases past-window member-deleted accounts: `auth.users` row gone, `users` row gone (or reduced to the ruled suppression form), DM disposition fired, zero residue — the DM-01 verification class, extended.
- `delete_own_account`'s copy and behaviour agree.
