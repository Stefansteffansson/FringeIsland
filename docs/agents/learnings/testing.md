# Test Agent — Learning Journal

**Purpose:** Running log of discoveries, patterns, and lessons learned during testing work.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/test-agent.md` (playbook)

---

## Entries

### 2026-02-16: Tests must link template IDs when creating Steward roles
After the `prevent_last_leader_removal` trigger was changed to check `created_from_role_template_id` instead of role name, all tests that create "Steward" roles ad-hoc must include `created_from_role_template_id: stewardTemplateId`. Look it up in `beforeAll` via `admin.from('role_templates').select('id').eq('name', 'Steward Role Template').single()`. Without this, the trigger won't protect the role.
> Promoted to playbook? Not yet

### 2026-02-16: Permission count tests are fragile — consider dynamic counts
Hardcoded counts (41 permissions, 24 Steward template perms, etc.) break every time a permission is added. Consider using `toBeGreaterThanOrEqual()` or fetching the expected count dynamically instead of hardcoding. For now, grep-and-replace works but is error-prone.
> Promoted to playbook? Not yet

### 2026-02-16: RBAC test patterns and gotchas
- Composite PK tables (group_role_permissions, role_template_permissions): use `.select('col1, col2')` not `.select('id')`. Supabase returns null for non-existent columns silently.
- When renaming roles, other test suites that create roles with old names will leave orphaned data if they fail before cleanup. After role rename migrations, delete stale test data before verifying "no old names exist" assertions.
- `createTestUser()` now triggers handle_new_user() which creates personal group + FI Members enrollment + role assignments. This generates role_assigned notifications. Tests counting notifications must clean up or account for these.
- Independence test for group_role_permissions: delete by composite key `.eq('group_role_id', id).eq('permission_id', id)`, not by `.eq('id', id)`.
→ Promoted to playbook? Not yet

### 2026-02-13: Journal initialized
Starting point. Known patterns captured in playbook from prior sessions:
- PostgREST INSERT...RETURNING gotcha (triggers SELECT policy)
- Rate limiting mitigation (suite-setup.ts delays)
- try/finally for UNIQUE constraint cleanup
- Timestamp comparison (+00:00 vs Z)

→ Promoted to playbook? ✅ (all in Known Pitfalls section)

---

### 2026-02-15: Clock skew between JS client and DB server breaks timestamp comparisons

When testing read tracking (B-MSG-006), setting `last_read_at` from JS `new Date().toISOString()` and comparing against DB-side `NOW()` timestamps failed because the JS client clock was ahead of the DB server. Messages inserted after the JS timestamp still had `created_at` earlier than the JS-generated `last_read_at`.

**Fix:** Use a DB-side baseline — insert a "marker" message first, read back its `created_at`, and use that as the read marker. Both timestamps now come from the same clock (DB server), eliminating skew.

**Pattern:** For any test comparing client-set timestamps against DB-generated timestamps, always derive both from the DB. Never mix JS `Date()` with DB `NOW()`.

→ Promoted to playbook? Not yet (confirm if pattern recurs)

---

### 2026-02-18: Admin visibility tests — beware creator-based false positives

When testing that an admin can see groups via admin policy (not via creator/member policy), the test group must NOT be created by the admin user. If the admin is `created_by_user_id`, they can see the group via the existing creator SELECT policy, making the test pass for the wrong reason (false positive).

**Fix:** Use a different user as creator, and don't add the admin as a member. This ensures the only way the admin can see the group is via the new admin visibility policy.

Similarly, when testing that a normal user CANNOT see a private group, that user must not be the creator or a member. Use a dedicated "outsider" test user with no relationship to the group.

> Promoted to playbook? Not yet

---

### 2026-02-18: Some RPC tests pass "for wrong reason" before implementation

Tests asserting "non-admin blocked from calling RPC" will pass before the RPC exists because `function does not exist` is still an error. After implementing the RPC, re-verify these tests to confirm they fail for the right reason (permission denied, not function-not-found).

**Pattern:** After implementing RPCs, always re-run non-admin tests and check the error MESSAGE, not just error presence.

> Promoted to playbook? Not yet

---

### 2026-02-18: Existing UPDATE policy on users table is too broad

The current users UPDATE policy allows any authenticated user to update any user row (not just their own). This was exposed by the B-ADMIN-010 "block non-admin from deactivating another user" test — the normal user CAN set `is_active = false` on another user. Needs to be fixed in implementation: restrict UPDATE to own row OR users with admin permission.

> Promoted to playbook? Not yet

---

<!-- Append new entries below this line -->
