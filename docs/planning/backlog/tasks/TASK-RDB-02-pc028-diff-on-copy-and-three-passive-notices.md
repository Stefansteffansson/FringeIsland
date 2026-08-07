# PC028 — the diff-on-copy pair and the three passive distribution notices

---
id: TASK-RDB-02
title: FEAT-PC028 half two — get_role_copy_diff, apply_role_template_update, the roles notification category, and the three passive kinds
status: done
assigned_to: claude
priority: high
feature: FEAT-PC028
owner: platform/core/governance
wave: ferd
cycle: RD-B
depends_on: [TASK-RDB-01]
estimated_hours: 6
---

## Description

The second half of RD-B's platform migration: everything about **moving a copy forward** and **telling people**. Covers FEAT-PC028 STORY-4, STORY-5, and STORY-6.

Shares one migration file and **one schema gate** with [TASK-RDB-01](./TASK-RDB-01-pc028-publication-substrate-scoped-offer-and-write-door.md). Depends on it because the notices fan out over publication rows, which RDB-01 creates.

**The load-bearing correctness question in this task is the diff's reference point.** The diff is computed against the group role's **current** grant set — never against the version it was copied from. A version-vs-version diff renders the *template's* changelog and hides the *Steward's* divergence, so a permission the Steward deliberately revoked would appear nowhere in the ceremony and be silently re-granted on apply. That is escalation by merge wearing a diff's clothes, and it is exactly what RD-3 forbids. **Write the revoked-permission cell early** — it is the acceptance criterion the whole of RD-3 exists for, and it is the one a plausible-looking implementation fails.

## Acceptance criteria

- [ ] `get_role_copy_diff(p_group_role_id uuid)` returns `added` / `removed` / `unchanged` plus `from_version` and `to_version`
- [ ] **The RD-3 cell:** a permission the Steward deliberately revoked from their copy, which the template still grants, appears in **`added`**. This must be demonstrated red against a version-vs-version implementation, not only green against the correct one
- [ ] A permission the Steward **added** that the template does not grant appears in **`removed`**
- [ ] Unknown provenance (`created_from_version_number IS NULL`) yields `from_version` null with added/removed still correctly computed from grants
- [ ] A custom role (no `created_from_role_template_id`) is refused `P0002`
- [ ] A retired source template still **diffs** (the group is entitled to know where it stands) but refuses **apply**
- [ ] `apply_role_template_update(p_group_role_id uuid)`: after the call the grant set **equals** the template's live materialised set exactly — asserted as set equality, not as "the additions arrived"
- [ ] Apply re-stamps `created_from_version_number` so the next diff is empty
- [ ] Apply leaves the source template and its versions untouched
- [ ] Apply refuses when it would leave the group with **no definer** of a protected permission, naming the permission (the RD-5 guard reused; note RD-A's reachability caveat — it fires where some *other* role is the last definer)
- [ ] Apply refuses under `assert_group_writable` for resting/suspended groups, first and unchanged
- [ ] Members holding the role keep the role; only its permissions move
- [ ] Concurrent applies: the second observes the first's result — read and write in one transaction
- [ ] New `roles` notification **category** seeded (`transactional` / `badge`), and three **kinds** — `role_template_published`, `role_template_updated`, `role_template_retired` — each with `dispatch_segment` **NULL** (the column default; assert it rather than setting it)
- [x] **Checked, and no update is owed — the original criterion was wrong.** The pinned test in `ownership-manifest-conformance.test.ts` asserts the set of tables owned by `vertical:*` (exactly `['notifications']`). RD-B adds no vertical-owned table: `role_template_publications` is PC-3, and the category and kinds are *rows in* DS-5-owned tables. Swept for exact-set assertions over categories/kinds too — none (`preference-and-dispatcher-contracts.test.ts:722` asserts `>= 6`). DS-5 ownership still gates *function bodies* reaching into those tables; a migration seed is not that
- [ ] Notices fan out to **`manage_roles`** holders (RDB-2), not `assign_roles`; a group with zero such holders completes without raising
- [ ] `role_template_updated` reaches only groups that have **adopted** the template
- [ ] Notice payloads carry ids + template name only — no member PII (the `20260721100000:279-290` content-minimal shape)
- [ ] The three new functions registered in `supabase/ownership.manifest.json`
- [ ] Sibling-assertion sweep for `admin_set_role_template_default_version` and `admin_retire_role_template`, both re-issued here to emit — **listed in the migration header**
- [ ] Task ends at `review`, not `done` — schema gate

## Technical notes

- Emission points: `admin_publish_role_template` (published), `admin_set_role_template_default_version` (`20260804190000:513` — the Apply door, where "updated" actually happens), `admin_retire_role_template` (retired). The latter two are **re-issues** and keep byte-identical signatures.
- Notices are written by direct `INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)` inside the acting contract — the C-E fan-out at `20260721100000:279-290` is the canonical set-valued shape. `public.notifications` is `vertical:notifications`-owned and its manifest note states writes to it are **obligation-fulfilment, never a boundary crossing** (ADR-U047 rule 5), so no licence is needed.
- `ds5_may_deliver` / `ds5_apply_notification_preference` gate delivery unchanged — no new dispatcher path, no handler, no segment.
- The template's live materialised set is `role_template_permissions` (what the Apply ceremony materialises), not `role_template_version_permissions` — the group copy trigger reads the former.
- Protected permissions come from `permissions.is_protected`; reuse, do not re-derive.

## Verification

```
npm run test:integration:groups
npm run test:integration:admin
npm run test:integration:communication
npm run lint
```

Plus the ownership-manifest conformance suite (expected-set updated). The migration is **not applied** until the named approval.
