# Enhanced Member Invitations

**Status:** ✅ Implemented (v0.2.28)
**Version:** v0.2.28
**Started:** 2026-02-23

---

## Summary

Enhance the `InviteMemberModal` with two capabilities:

1. **User Search Typeahead** — As the Steward types, show matching users (name + email + avatar) in a dropdown. Debounced at 300ms, max 8 results, excludes current group members and self.

2. **Pending Email Invitations for Non-Users** — If the entered email doesn't match any user, the Steward can still send an invitation. The system stores a `pending_email_invitations` record and simulates sending an email (console.log). When the person signs up with that email, the `handle_new_user()` trigger auto-claims the invitation, creating a `group_memberships` row with `status='invited'`. The new user sees it on their Invitations page and can accept/decline normally.

---

## Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Auto-claimed invitations get `status='invited'`, not `'active'` | Preserves accept/decline opt-in |
| 2 | Claiming happens in `handle_new_user()` trigger | Atomic, no race conditions, no client-side post-signup logic |
| 3 | Email abstraction in `lib/email/send.ts` | Console.log now, swap for Resend/SendGrid later |
| 4 | Token UUID on pending invitations | Future-proofs for magic-link signup flow |
| 5 | 30-day expiration | Expired invitations are not claimed on signup |
| 6 | RLS uses `has_permission(..., 'invite_members')` | Same permission as existing invitations — no new permission needed |
| 7 | Typeahead excludes active members from parent page data | Submit-time validation catches edge cases (existing behavior) |

---

## New Database Table

```sql
CREATE TABLE public.pending_email_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  claimed_at TIMESTAMPTZ,
  UNIQUE(group_id, invited_email)
);
```

---

## Behavior Specs

- **B-GRP-006:** User Search Typeahead — `docs/specs/behaviors/groups.md`
- **B-INV-001:** Pending Email Invitations — `docs/specs/behaviors/invitations.md`

---

## Test Files

- `tests/integration/groups/pending-invitations.test.ts` (~11 tests)
- `tests/integration/groups/user-search.test.ts` (~4 tests)

---

## Files Created

| File | Purpose |
|------|---------|
| `docs/features/implemented/enhanced-member-invitations.md` | This feature doc |
| `docs/specs/behaviors/invitations.md` | B-INV-001 behavior spec |
| `supabase/migrations/20260223140126_enhanced_member_invitations.sql` | New table + trigger update |
| `lib/email/send.ts` | Email service abstraction (console.log) |
| `app/api/invitations/send-email/route.ts` | Server-side email send endpoint |
| `tests/integration/groups/pending-invitations.test.ts` | Integration tests |
| `tests/integration/groups/user-search.test.ts` | Integration tests |

## Sprint 2 Impact (v0.2.34)

When a sole Steward leaves a group via L2 (DeusEx handover), pending email invitations are transferred:

- `pending_email_invitations.invited_by_group_id` is updated from the leaving Steward's personal group to the DeusEx system group
- This ensures invitations remain valid and can still be claimed by new users at signup
- The invitation now appears as sent by "FringeIsland" (DeusEx) rather than the departed Steward

See `docs/features/implemented/leave-group-core.md` for full details.

---

## Files Modified

| File | Change |
|------|--------|
| `components/groups/InviteMemberModal.tsx` | Typeahead search + two-flow invite logic |
| `app/groups/[id]/page.tsx` | Pass `existingMemberGroupIds` prop to modal |
| `docs/specs/behaviors/groups.md` | Add B-GRP-006 |
