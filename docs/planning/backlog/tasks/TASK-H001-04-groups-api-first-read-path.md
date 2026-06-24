# /groups API-first read path via PC-3, RLS-scoped (STORY-2, GRP-4)

---
id: TASK-H001-04
title: /groups API-first read path via PC-3, RLS-scoped (STORY-2, GRP-4)
status: done
assigned_to: Claude (CC)
priority: high
feature: FEAT-H001
owner: hub
wave: ferd
depends_on: [TASK-H001-02, TASK-H001-03]
estimated_hours: 4
---

## Description

Implement STORY-2: a signed-in FIM lands on `/groups`, which renders the member's group list fetched **DB → API → frontend** — never a direct table call from the frontend. The read path reproduces the oracle's query server-side behind an API route, RLS-scoped (V2).

## Acceptance criteria

- [ ] `hub/lib/groups/queries.ts` — `fetchMemberGroups(supabase)`: `rpc('get_current_personal_group_id')` (PC-3 actor) → `group_memberships` (`member_group_id = actor`, `status = 'active'`, select `group_id`) → `groups` (`.in('id', ids)`, `group_type = 'engagement'`, select `id,name,description,label,is_public,created_at`) → member counts via `rpc('get_group_member_counts', { p_group_ids })`. RLS scopes every step.
- [ ] `hub/app/api/groups/route.ts` (`GET`): server client; `getUser()` → 401 if unauthenticated; returns `{ groups }`; emits `groups.loaded` (count) telemetry; on failure → 500 + `groups.load_failed` telemetry (never swallowed).
- [ ] `hub/app/groups/page.tsx` (`'use client'`): auth-guarded; fetches `/api/groups`; renders `LoadingState` while fetching, `EmptyState` at N=0, `InlineError` on failure, the list otherwise — all via design-system primitives; rendered inside `AppShell` (V3 bell mount present).
- [ ] No `supabase.from(...)` anywhere under `hub/app/**` outside `lib/supabase` + `lib/auth` (API-first; ADR-U009). The frontend only `fetch`es `/api/groups`.

## Technical notes

- `get_current_personal_group_id()` is `SECURITY DEFINER`, granted to `authenticated` → callable via PostgREST `rpc`.
- Oracle ref: `hub-legacy/app/groups/page.tsx` (the two-phase query being moved behind the API).
- Engagement-only filter (`group_type='engagement'`) excludes personal/system groups from the landing list, matching the oracle.

## Verification

- Manual: signed-in user sees only their active engagement memberships; a private group they don't belong to never appears.
- Covered by `tests/integration/groups/groups-read-path.test.ts` (RLS scoping) + `tests/e2e/groups.spec.ts`.
