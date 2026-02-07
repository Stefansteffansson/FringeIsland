# [Feature Name] Behaviors

> **Purpose:** Document the fundamental rules and guarantees for [feature name].
> **Format:** Copy this template for each new feature/domain.

---

## B-[DOMAIN]-001: [Behavior Name]

**Rule:** [One sentence describing what MUST ALWAYS be true]

**Why:** [Business reason or user impact - why does this matter?]

**Verified by:**
- **Test:** `tests/[type]/[domain]/[file].test.ts`
- **Code:** `[implementation location]`
- **Database:** `[constraints, triggers, RLS policies]`

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Examples:**

✅ **Valid:**
- [Example of correct behavior]
- [Another valid example]

❌ **Invalid:**
- [Example that should be blocked]
- [Another invalid example]

**Edge Cases:**
- **Scenario:** [Edge case description]
- **Behavior:** [What happens]
- **Why:** [Reason for this handling]

**Related Behaviors:**
- B-[DOMAIN]-XXX: [Related behavior name]

**History:**
- YYYY-MM-DD: Created
- YYYY-MM-DD: Updated (reason)

---

## B-[DOMAIN]-002: [Next Behavior]

**Rule:** [Next rule]

[Same structure as above...]

---

## Notes

**Domain Codes:**
- AUTH: Authentication
- GRP: Groups
- JRN: Journeys
- USR: Users
- INV: Invitations
- ROL: Roles
- ENRL: Enrollments

**Testing Priority:**
- 🔴 CRITICAL: Must have test (security, data integrity)
- 🟡 HIGH: Should have test (business logic)
- 🟢 MEDIUM: Nice to have test (UX, validation)
- ⚪ LOW: Optional test (cosmetic, rare edge cases)
