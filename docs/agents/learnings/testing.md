# Test Agent — Learning Journal

**Purpose:** Running log of discoveries, patterns, and lessons learned during testing work.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/test-agent.md` (playbook)

---

## Entries

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

<!-- Append new entries below this line -->
