# Invitation Behaviors

> **Purpose:** Document the rules and guarantees for pending email invitations to non-users.
> **Domain Code:** INV

---

## B-INV-001: Pending Email Invitations for Non-Users 🔄

**Rule:** When a Steward invites an email address that has no FringeIsland account, the system MUST store a `pending_email_invitations` record and simulate sending an email. When the person signs up with that email, the `handle_new_user()` trigger auto-claims the invitation, creating a `group_memberships` row with `status='invited'`.

**Why:** Currently, invitations fail with "No user found" for non-users. This creates a dead end when inviting colleagues who haven't signed up yet. Pending invitations bridge this gap.

**Verified by:**
- **Test:** `tests/integration/groups/pending-invitations.test.ts` (~11 tests)
- **Code:** `components/groups/InviteMemberModal.tsx` (non-user flow)
- **Database:** `pending_email_invitations` table + `handle_new_user()` trigger update
- **API:** `app/api/invitations/send-email/route.ts`

**Acceptance Criteria:**

### Storage
- [ ] Steward can create a pending invitation for a non-existent email
- [ ] Pending invitation stored with status='pending', 30-day expiration
- [ ] Token UUID generated for future magic-link flow
- [ ] Duplicate (same group + same email) blocked by UNIQUE constraint

### RLS
- [ ] Only users with `invite_members` permission can INSERT pending invitations
- [ ] Users without `invite_members` permission are blocked
- [ ] Stewards can view pending invitations for their group
- [ ] Stewards can cancel (DELETE) pending invitations for their group

### Trigger: Auto-Claim on Signup
- [ ] When new user signs up with a pending invitation email, trigger creates `group_memberships` row with `status='invited'`
- [ ] Pending invitation status changes to 'claimed', `claimed_at` is set
- [ ] Multiple pending invitations for same email (different groups) are all claimed
- [ ] Expired invitations (>30 days) are NOT claimed

### Email
- [ ] Email service called with invitation details (console.log for now)
- [ ] API route validates caller owns the group (has invite_members permission)
- [ ] Unauthenticated requests blocked (401)

**Examples:**

✅ **Valid:**
- Steward invites "newperson@example.com" (no account) → pending_email_invitations row created → "email sent" (console.log) → Success message in UI
- newperson@example.com signs up → handle_new_user() creates group_memberships with status='invited' → pending invitation marked as 'claimed'
- New user visits /invitations → sees the invitation → can accept/decline normally

❌ **Invalid:**
- Regular Member tries to create pending invitation → **BLOCKED** (RLS: no invite_members permission)
- Steward invites same email twice for same group → **BLOCKED** (UNIQUE constraint)
- User signs up 31 days after invitation → **NOT CLAIMED** (expired)

**Edge Cases:**

- **Scenario:** Invited email signs up, then the group is deleted before they accept
  - **Behavior:** Pending invitation CASCADE deleted with group; group_memberships also CASCADE deleted
  - **Why:** No orphaned records

- **Scenario:** Multiple groups invite the same email
  - **Behavior:** All non-expired pending invitations are claimed on signup; one group_memberships row per group
  - **Why:** Trigger loops through all matching pending invitations

- **Scenario:** Steward cancels pending invitation before person signs up
  - **Behavior:** DELETE removes the record; no invitation created on signup
  - **Why:** Standard RLS DELETE policy for group Stewards

- **Scenario:** Person signs up with different email casing (e.g., "User@Example.com")
  - **Behavior:** Match should be case-insensitive (LOWER comparison)
  - **Why:** Email addresses are case-insensitive by convention

**Related Behaviors:**
- B-GRP-002: Member Invitation Lifecycle (existing user flow)
- B-GRP-006: User Search Typeahead (discovery before invite)

**History:**
- 2026-02-23: Documented

---

## Notes

**Behaviors:**
- 🔄 B-INV-001: Pending Email Invitations for Non-Users (~11 tests planned)

**Test Coverage:**
- `pending-invitations.test.ts` — ~11 tests planned (B-INV-001)
- **Last updated:** 2026-02-23
