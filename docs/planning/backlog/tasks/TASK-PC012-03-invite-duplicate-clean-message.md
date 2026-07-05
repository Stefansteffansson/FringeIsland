# Fix: invite duplicates leaked the raw Postgres unique-constraint text to the UI

---
id: TASK-PC012-03
title: invite_member / invite_by_email — pre-check for an existing membership and raise a clean, state-specific 23505 message (with a unique_violation backstop) instead of leaking the raw constraint name
status: review
assigned_to: claude
priority: medium
feature: FEAT-PC012
owner: platform/core/organisation
wave: ferd
cycle: Groups G-C (post-6-done fix)
depends_on: []
estimated_hours: 1
---

## Description

Post-6-done bug fix on the Cycle G-C invitation contracts. Reported 2026-07-05 (manual testing): inviting a member who already had a `group_memberships` row surfaced the raw Postgres error `duplicate key value violates unique constraint "group_memberships_group_id_member_group_id_key"` on screen.

Root cause: `invite_member` (and `invite_by_email`'s existing-FIM conversion branch) did a **bare INSERT** and relied on the unique constraint to reject duplicates — the raised message is Postgres' low-level default, and the H015 BFF forwards the contract message through (it maps `23505` → HTTP 409 and renders `message ?? 'Already invited'`; the raw message is non-empty, so it wins). The PC012 comment even acknowledged the shortcut ("duplicates surface 23505").

Fix: **pre-check** for an existing `(group_id, member_group_id)` membership row and raise a human, **state-specific** message — active → "already a member", invited → "already has a pending invitation", paused → "paused member". Keep errcode **23505** (the BFF already maps it to 409 and the existing PC012 duplicate tests assert that code — so no route or test-contract change is forced). Wrap the INSERT in a `unique_violation` handler as a **concurrency backstop** so the raw text can never leak even on a race between the pre-check and the INSERT.

**Scope note (ADR-U040):** `invite_by_email` is slated for retirement under the ratified referral model, but it is still live until that rebuild and the reported bug came through its conversion branch — so its conversion branch is fixed here too. The pure-email duplicate (`pending_email_invitations`) already raised a clean message and is untouched.

## Acceptance criteria

- [x] `invite_member` on an already-**active** member → `23505` with "this person is already a member of the group"; message does not match `/duplicate key value|unique constraint/i`
- [x] `invite_member` on an already-**invited** FIM → `23505` with "…already has a pending invitation…"
- [x] `invite_member` on a **paused** member → `23505` with "…is a paused member…"
- [x] `invite_by_email` for an existing FIM already a member → the conversion branch raises the same clean `23505`, not the raw constraint
- [x] All four demonstrated **RED** first (raw constraint text) → **GREEN** post-migration; the existing `.code === '23505'` asserts stay green (code unchanged — carried-forward)
- [x] No schema change (two function bodies replaced); `anon` holds no execute (re-asserted in the migration); no new table / trigger / policy
- [x] Full groups domain green; lint clean

## Technical notes

Test coverage: a red-first `STORY-2b` describe block in `hub/tests/integration/groups/invitation-contracts.test.ts` (four message-level asserts on active/invited/paused/email-conversion states). Migration `20260705090321_fix_pc012_invite_duplicate_clean_message.sql` (CREATE OR REPLACE both functions; grants restated for auditability — no anon). The BFF needs no change: it already maps 23505 → 409 and passes the (now clean) contract message through, which is exactly the desired behaviour.

## Verification

`npm run test:integration:groups` green (157/157); lint clean (one pre-existing warning). Schema-touching (function bodies) → task lands at **`review`**; PR held for Stefan's nod.
