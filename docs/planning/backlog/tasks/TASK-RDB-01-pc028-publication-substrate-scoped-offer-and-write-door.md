# PC028 — publication substrate, scoped offer read, the write-door fix, and the creation-time guard

---
id: TASK-RDB-01
title: FEAT-PC028 half one — role_template_publications, publish/unpublish, get_available_role_templates, the create_group_role offerability fix, and the create_engagement_group retirement guard
status: todo
assigned_to: claude
priority: high
feature: FEAT-PC028
owner: platform/core/governance
wave: ferd
cycle: RD-B
depends_on: []
estimated_hours: 6
---

## Description

The first half of RD-B's platform migration: everything about **where a template is offerable**. Covers FEAT-PC028 STORY-1, STORY-2, STORY-3, and STORY-7.

One migration file is shared with [TASK-RDB-02](./TASK-RDB-02-pc028-diff-on-copy-and-three-passive-notices.md); this task writes the first half of it. **One schema gate for both** — the PR holds for a named approval and this task lands at `review`, never `done`.

**Open red-first, on the story that carries an unproven premise.** FEAT-PC028 STORY-3 rests on the claim that `create_group_role` refuses neither a retired nor an unoffered template today. The catalogue check (dossier §Post-filing verification) confirms the *predicate is absent* from the deployed function body, but absence from a body is not proof of reachability — a refusal could still arrive from a trigger, a grant, or a downstream check. **Write that cell first and run it against the current contract before writing any migration SQL.** If it refuses already, stop and correct the spec; RD-A's two overturned premises were both caught at build, and this is the cycle that checks on time.

## Acceptance criteria

- [ ] **Red first.** A cell retires a clone and attempts `create_group_role` with its id as a Steward holding `manage_roles`, run against the **current** contract, and its result is recorded before any migration SQL is written
- [ ] `role_template_publications` created with a **nullable** `group_id` (NULL = platform-wide, RD-8), `role_template_id`, `published_at`, `published_by`
- [ ] Uniqueness holds for **both** shapes: `UNIQUE (role_template_id, group_id)` for targeted rows **plus** a partial unique index on `(role_template_id) WHERE group_id IS NULL`. A plain UNIQUE alone permits two platform-wide rows because NULLs are distinct — assert this with a cell that attempts the double platform-wide publish
- [ ] RLS enabled on the new table with a policy (platform-tier rule: no exceptions, including junction tables)
- [ ] `admin_publish_role_template` / `admin_unpublish_role_template`: platform-admin gated, idempotent (`already_published: true` rather than raising, RDB-5), empty array refused `22023`, retired template refused, audit-logged on success **and** on refusal
- [ ] `get_available_role_templates(p_group_id uuid)` returns scope-filtered **and** retirement-filtered rows, system templates always present, and carries `adopted_group_role_id` / `adopted_version_number` / `current_version_number` (the three keys FEAT-H044's payload walk added)
- [ ] `get_role_templates()` (zero-arg) **dropped** in the same migration; its one wrapper (`hub/lib/groups/queries.ts:239-244`) moved
- [ ] `create_group_role` re-issued **byte-identical signature** (COR-A), now refusing retired and unoffered templates, with the `manage_roles` check and `assert_group_writable` still firing **first** and unchanged
- [ ] `create_engagement_group` re-issued with `retired_at IS NULL` on **both** instantiation branches (RDB-4)
- [ ] New table and both new admin functions registered in `supabase/ownership.manifest.json` (unregistered ⇒ two conformance suites fail, silently attributed to CORE)
- [ ] `role_template_publications` classified in the export/privacy section of the manifest (`memberData: false`, on the `role_template_versions` reasoning)
- [ ] FK indexes on `(group_id)` and `(role_template_id)` per the `20260704075549` discipline
- [ ] **Adversarial ADR-U038 cell**: the direct PostgREST path is exercised — including an anonymous-session Mist — and the substrate refuses what the route refuses
- [ ] Sibling-assertion sweep run and **listed in the migration header**, each marked adapted or deliberately left. `get_role_templates` has known callers; `create_group_role` and `create_engagement_group` have many
- [ ] Task ends at `review`, not `done` — schema gate

## Technical notes

- Migration naming follows the house pattern: `<timestamp>_rd_b_pc028_role_template_publication_and_scoped_offer.sql`.
- **Re-issue discipline (COR-A):** every re-issued function keeps a byte-identical signature so `create or replace` preserves its ACL. `get_available_role_templates` is therefore a *new* function, not a re-issue of `get_role_templates` — see RDB-1.
- `create_group_role`'s current template branch is at `20260806170000:404-408`; the existence-only check is what changes.
- `create_engagement_group`'s instantiation select is at `20260806170000:274-284`.
- The system-template exemption already has a precedent to copy: `admin_retire_role_template` refuses `is_system` outright.
- Actor is the personal group id via the four-hop chain (`get_current_personal_group_id()`), never `auth.uid()` directly.
- Partial-unique-index precedents to follow: `uq_journey_enrollments_active_party`, `uq_step_instance_open`, `uq_journeys_single_onboarding_designation`. **Do not** reach for `NULLS NOT DISTINCT` — zero precedent in this repo.

## Verification

```
npm run test:integration:groups
npm run test:integration:admin
npm run test:integration:rls
npm run lint
```

Plus the ownership-manifest and route-policy conformance suites. The migration is **not applied** until the named approval; the PR body carries the apply commands.
