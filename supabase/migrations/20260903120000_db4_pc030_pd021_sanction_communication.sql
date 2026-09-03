-- TASK-DB4-01 — sanction communication (DB-4): a member-facing REASON on every
-- hold-family transition, carried to every affected member as a locked-on
-- notice, and readable on the reads the surfaces already consume. Stefan ruled
-- DB-4 into Ferd at the leftovers pass (2026-09-03, "DB-4 … now"; bridge
-- 2026-09-03_02, item 4 of four); decomposed 2026-09-03 (bridge 2026-09-03_06)
-- with the decision board's eight rulings adopted as defaults (bridge
-- 2026-09-03_04). Migration approval: Stefan, 2026-09-03 ("you have my
-- blessing to do the migration (ref. Migration (one schema gate, held for your
-- named approval))").
--
-- OWNERSHIP (one gate, three specs):
--   * FEAT-PD021 (DS-5, platform/domain/communication) — REGISTRY ROWS ONLY:
--     the `sanctions` category (locked on: member_suppressible = false) and
--     six hold kinds — four `group_*` under `sanctions`, two `account_*` under
--     the already locked-on `account`. No table, no function, no policy.
--   * FEAT-PC030 (PC-4 governance, with PC-3's rest/wake in the same gate):
--     - `groups.hold_reason text null` (PC-3's table) and
--       `users.suspension_reason text null` (PC-2's table) — the CURRENT
--       hold's reason; the HISTORY is `admin_audit_log.metadata.reason`.
--     - the seven contracts DROPPED + re-CREATED with `p_reason text default
--       null` (an added defaulted parameter is a new overload; PostgREST refuses
--       an ambiguous name — README row 4: DROP loses the ACL, so REVOKE/GRANT are
--       re-issued per function below). Names unchanged → the ownership manifest
--       is untouched; no new function is created.
--       · admin_suspend_group / admin_reactivate_group / admin_rest_group /
--         admin_wake_group / admin_update_user_status: reason REQUIRED —
--         `22023 'Reason required'` on null/blank (the FEAT-PC026 ceremony
--         shape, 20260804230000:600-602), checked right after the admin wall so
--         a non-admin's 42501 answers first, unchanged.
--       · rest_group / wake_group (Steward, key `rest_group`): reason OPTIONAL —
--         the Steward's note; blank is none, never refused.
--       · every other rule byte-identical (the PC023 guard order, the admin
--         wall, the status transitions, the audit actions group.rest /
--         group.wake / group.suspend / group.reactivate / member.suspend /
--         member.reactivate). Audit metadata gains `reason`.
--     - the NOTICE: each transition writes ONE row PER ACTIVE FIM MEMBER of the
--       group (group_memberships.status = 'active' joined to users with
--       is_temporary = false and is_active = true), the actor excluded — the
--       FEAT-PD011 announcements precedent (20260720200000:237-248). NOT a
--       group-addressed row: FEAT-PD020's expansion reaches act_as_group holders
--       ∪ Stewards only (20260815223000), the wrong audience for a hold. The
--       account holds write one row to the sanctioned member's personal group.
--       title = the kind's registry label; body = the reason verbatim, or the
--       label when the Steward gave none (body is NOT NULL). No action_type.
--       The N-D dispatcher decides delivery as for every row; `sanctions` and
--       `account` are locked on, so the rows land; a Mist recipient yields no
--       row (the GB-1b rule, unchanged).
--     - the READS: `get_group_detail` gains `hold_reason` (ACTIVE MEMBERS only,
--       on a resting/suspended group — null for non-members and on an active
--       group; present on BOTH the full payload and the PC023 STORY-7 minimal
--       suspended payload, which is what the member's wall reads);
--       `get_own_account_state` gains `suspension_reason` (null while active).
--       Same signatures → CREATE OR REPLACE preserves the ACL (README row 4:
--       said so, and re-asserted anyway).
--
-- DIRECT-CALLER ANSWER (ADR-U038, the decomposition's second mechanism read):
--   `public.groups` carried Supabase's TABLE-LEVEL SELECT grant for anon and
--   authenticated (relacl anon=rm, authenticated=rm at the gate; no migration
--   ever scoped it — SEC-02 narrowed DML only). A public suspended group's row
--   is visible to every authenticated session under RLS, so `hold_reason` —
--   free text that can name a third party — would be readable by any direct
--   PostgREST caller, a Mist included. This migration converts the grant to
--   COLUMN-LEVEL for both roles: every column the catalog held at the gate
--   EXCEPT `hold_reason` (the FEAT-PC003 S2 pattern on users,
--   20260702120000:40-48). The column list below was enumerated from
--   information_schema.columns at authoring (14 columns), never from memory.
--   `users.suspension_reason` needs nothing: users is already column-scoped
--   (relacl authenticated=m — no table-level r) and a new column is not in the
--   S2 list. Sweep at authoring: zero client-role `select('*')` / embedded
--   `groups(*)` on groups in hub/tests; zero SECURITY INVOKER functions or
--   invoker views reading groups whole (catalog-verified at the gate).
--
-- SIBLING ASSERTIONS (grep -rlE "rest_group|wake_group|admin_suspend_group|
-- admin_reactivate_group|admin_update_user_status" hub/tests — 17 files):
--   ADAPTED (a reason added to the admin calls — labelled adaptations, the
--   defaulted parameter leaves every Steward cell untouched):
--   * integration/account/account-lifecycle-admin-producer.test.ts
--   * integration/account/account-lifecycle-self-service.test.ts
--   * integration/admin/group-administration-contracts.test.ts
--   * integration/admin/member-administration-contracts.test.ts
--   * integration/admin/member-administration-operations.test.ts
--   * integration/admin/member-enumeration-bounded.test.ts
--   * integration/admin/moderation-and-audit-contracts.test.ts
--   * integration/groups/group-availability-enforcement.test.ts (the 117-cell
--     gate suite: admin cells gain a reason; the rest_group/wake_group cells
--     stay — the defaulted parameter; AND the STORY-7 "findable, labeled, and
--     that is it" cell, which pins the minimal suspended payload's key set —
--     it gains `hold_reason` (the adapted admin reason — the cell reads as an
--     active member), the one key FEAT-PC030 adds below the admin plane. Found
--     by the sweep, not the grep: the cell names no contract, only the shape.)
--   * integration/admin/role-template-editing.test.ts (two fixture holds via
--     an rpcAdmin wrapper on admin_update_user_status — a reason added)
--   * unit/lib/admin/users-page-and-bulk.test.ts (the rpc-args pins on
--     admin_update_user_status gain p_reason — with the Hub lib change)
--   * e2e/admin-suspended-content.spec.ts, e2e/group-availability.spec.ts —
--     the Q1 post-apply verification set (they walk the ceremonies, which now
--     carry the reason field) — run from hub/ after the Hub half.
--   LEFT (they name the `rest_group` PERMISSION seed or a fixture, not a
--   contract this migration changes):
--   * integration/admin/suspended-group-admin-access.test.ts
--   * integration/groups/role-provenance-and-retirement.test.ts
--   * integration/groups/role-publication-and-diff.test.ts
--   * unit/components/groups/AvailableRolesSection.test.tsx
--   * unit/components/groups/GroupDetailPanel.availability.test.tsx
--   NEW (RED AT HEAD, demonstrated before apply):
--   * integration/admin/sanction-communication-contracts.test.ts (FEAT-PC030
--     STORY-1..5) — PGRST202 on every `p_reason` call (no such overload),
--     42703 on `hold_reason` / `suspension_reason`, the reads carry no reason
--     key, no notice row lands, the direct SELECT of hold_reason cannot even
--     name the column.
--   * integration/notifications/sanction-notification-kinds.test.ts
--     (FEAT-PD021 STORY-1) — the category and the six kinds are absent; the
--     preference write on `sanctions` fails on the missing category, not on the
--     non-suppressible refusal.
--
-- CORRECTED BY 20260903130000 (same gate, same day): the five fan-out bodies
-- below read the notice TITLE from public.notification_kinds (DS-5) — a
-- core-to-domain crossing the invocation-axis gate refused post-apply
-- (internal-api-conformance.test.ts). The corrective re-issues them with the
-- titles as Core literals (the pause_member precedent); this file's bodies
-- stand as applied — read the pair together.
--
-- APPLY (the house two-step):
--   node scripts/apply-migration-temp.js 20260903120000_db4_pc030_pd021_sanction_communication.sql
--   bash supabase-cli.sh migration repair --status applied 20260903120000
-- GATE READS (the reviewer's, on the APPLIED objects — never the text):
--   select proname, proacl from pg_proc where proname in (the nine)  — no `=X/`
--   (PUBLIC) and no `anon=X`;
--   select grantee, column_name from information_schema.column_privileges
--   where table_name = 'groups' and privilege_type = 'SELECT' — hold_reason
--   absent for anon and authenticated; relacl carries no table-level r.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FEAT-PD021 — the registry rows (DS-5). Idempotent inserts, self-verified.
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.notification_categories
  (key, label, lawful_basis, interruption_grade, member_suppressible)
values
  ('sanctions', 'Holds & sanctions', 'transactional', 'badge', false)
on conflict (key) do nothing;

insert into public.notification_kinds (kind, category_key, label) values
  ('group_rested',       'sanctions', 'Your group is resting'),
  ('group_woken',        'sanctions', 'Your group is awake again'),
  ('group_suspended',    'sanctions', 'Your group has been suspended'),
  ('group_reactivated',  'sanctions', 'Your group has been reactivated'),
  ('account_suspended',  'account',   'Your account has been suspended'),
  ('account_reinstated', 'account',   'Your account has been reinstated')
on conflict (kind) do nothing;

do $$
declare v_n integer;
begin
  select count(*) into v_n
    from public.notification_categories
   where key = 'sanctions'
     and member_suppressible = false
     and lawful_basis = 'transactional'
     and interruption_grade = 'badge';
  if v_n <> 1 then
    raise exception 'FEAT-PD021: the sanctions category is not as specified (% rows)', v_n;
  end if;

  select count(*) into v_n
    from public.notification_kinds
   where (kind in ('group_rested', 'group_woken', 'group_suspended', 'group_reactivated')
          and category_key = 'sanctions')
      or (kind in ('account_suspended', 'account_reinstated')
          and category_key = 'account');
  if v_n <> 6 then
    raise exception 'FEAT-PD021: expected the six hold kinds, found %', v_n;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FEAT-PC030 Part 1 — the current hold's reason lives on the row.
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.groups add column if not exists hold_reason text null;
alter table public.users  add column if not exists suspension_reason text null;

comment on column public.groups.hold_reason is
  'FEAT-PC030: the CURRENT hold''s member-facing reason — set by rest_group / '
  'admin_rest_group (the Steward''s optional note) and admin_suspend_group '
  '(required), cleared by wake_group / admin_wake_group / admin_reactivate_group. '
  'History lives in admin_audit_log.metadata.reason. Client roles have NO column '
  'privilege on this column (ADR-U038): it reaches members only through '
  'get_group_detail.hold_reason and their own notification rows. Do not GRANT '
  'SELECT(hold_reason) to authenticated/anon.';

comment on column public.users.suspension_reason is
  'FEAT-PC030: the CURRENT account hold''s member-facing reason — set by '
  'admin_update_user_status(…, false, reason), cleared on reinstatement. Not in '
  'the S2 client column list (ADR-U038): reaches the member only through '
  'get_own_account_state.suspension_reason and their own notification row.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FEAT-PC030 Part 3 — the groups SELECT grant becomes column-scoped.
--    The 14 columns below = information_schema.columns for public.groups at the
--    gate, minus hold_reason. REVOKE/GRANT are declarative and re-runnable.
-- ═══════════════════════════════════════════════════════════════════════════
revoke select on public.groups from authenticated;
revoke select on public.groups from anon;

grant select (
  id, name, description, label, created_by_group_id, created_from_group_template_id,
  group_type, is_public, show_member_list, settings, created_at, updated_at,
  avatar_url, status
) on public.groups to authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. The Steward's pair — rest_group / wake_group (PC-3, FEAT-PC023) with the
--    OPTIONAL note and the per-member notice. Bodies byte-identical to the
--    20260803190000 issue except the marked lines.
-- ═══════════════════════════════════════════════════════════════════════════
drop function if exists public.rest_group(uuid);

create function public.rest_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_reason text;   -- FEAT-PC030
  v_label text;    -- FEAT-PC030
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'resting a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement'
     for update;
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or public.is_platform_admin()) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not (coalesce(public.has_permission(v_actor, p_group_id, 'rest_group'), false)
          or public.is_platform_admin()) then
    raise exception 'rest_group required' using errcode = '42501';
  end if;

  -- no steward path INTO the hard state's territory: suspended refuses first
  if v_group.status = 'suspended' then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  if v_group.status = 'resting' then
    raise exception 'group is already resting' using errcode = 'P0001';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot rest a group that is not active' using errcode = 'P0001';
  end if;

  -- FEAT-PC030 STORY-2: the Steward's optional note — blank is none, never refused.
  v_reason := case when p_reason is null or length(trim(p_reason)) = 0
                   then null else p_reason end;

  update public.groups
     set status = 'resting', hold_reason = v_reason, updated_at = now()
   where public.groups.id = p_group_id;

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor
  -- excluded (the PD011 per-member fan-out; never a group-addressed row).
  select k.label into v_label from public.notification_kinds k where k.kind = 'group_rested';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_rested', v_label, coalesce(v_reason, v_label),
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.rest_group(uuid, text) from public, anon;
grant execute on function public.rest_group(uuid, text) to authenticated, service_role;

drop function if exists public.wake_group(uuid);

create function public.wake_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_reason text;   -- FEAT-PC030
  v_label text;    -- FEAT-PC030
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'waking a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement'
     for update;
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or public.is_platform_admin()) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not (coalesce(public.has_permission(v_actor, p_group_id, 'rest_group'), false)
          or public.is_platform_admin()) then
    raise exception 'rest_group required' using errcode = '42501';
  end if;

  -- no steward path OUT of the hard state
  if v_group.status = 'suspended' then
    raise exception 'group is suspended' using errcode = 'P0001';
  end if;
  if v_group.status <> 'resting' then
    raise exception 'cannot wake a group that is not resting' using errcode = 'P0001';
  end if;

  -- FEAT-PC030 STORY-2: the Steward's optional note — blank is none, never refused.
  v_reason := case when p_reason is null or length(trim(p_reason)) = 0
                   then null else p_reason end;

  -- FEAT-PC030: waking clears the current hold's reason regardless of the note.
  update public.groups
     set status = 'active', hold_reason = null, updated_at = now()
   where public.groups.id = p_group_id;

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor excluded.
  select k.label into v_label from public.notification_kinds k where k.kind = 'group_woken';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_woken', v_label, coalesce(v_reason, v_label),
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.wake_group(uuid, text) from public, anon;
grant execute on function public.wake_group(uuid, text) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. The admin hold family (PC-4) — reason REQUIRED, audited, noticed.
-- ═══════════════════════════════════════════════════════════════════════════
drop function if exists public.admin_rest_group(uuid);

create function public.admin_rest_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason (PC026 shape).
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  v_actor := public.get_current_personal_group_id();

  perform public.rest_group(p_group_id, p_reason);

  select g.name into v_name from public.groups g where g.id = p_group_id;
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.rest', p_group_id::text,
          jsonb_build_object('group_name', v_name, 'reason', p_reason));
end;
$$;

revoke all on function public.admin_rest_group(uuid, text) from public, anon;
grant execute on function public.admin_rest_group(uuid, text) to authenticated, service_role;

drop function if exists public.admin_wake_group(uuid);

create function public.admin_wake_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason (PC026 shape).
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  v_actor := public.get_current_personal_group_id();

  perform public.wake_group(p_group_id, p_reason);

  select g.name into v_name from public.groups g where g.id = p_group_id;
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.wake', p_group_id::text,
          jsonb_build_object('group_name', v_name, 'reason', p_reason));
end;
$$;

revoke all on function public.admin_wake_group(uuid, text) from public, anon;
grant execute on function public.admin_wake_group(uuid, text) to authenticated, service_role;

drop function if exists public.admin_suspend_group(uuid);

create function public.admin_suspend_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
  v_label text;    -- FEAT-PC030
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason (PC026 shape).
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be suspended' using errcode = '22023';
  end if;
  -- FEAT-PC023: active|resting -> suspended (the two-mode amendment)
  if v_group.status not in ('active', 'resting') then
    raise exception 'cannot suspend a group that is not active or resting';
  end if;

  update public.groups
     set status = 'suspended', hold_reason = p_reason, updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.suspend', p_group_id::text,
          jsonb_build_object('group_name', v_group.name,
                             'previous_status', v_group.status,
                             'reason', p_reason));

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor excluded.
  select k.label into v_label from public.notification_kinds k where k.kind = 'group_suspended';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_suspended', v_label, p_reason,
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.admin_suspend_group(uuid, text) from public, anon;
grant execute on function public.admin_suspend_group(uuid, text) to authenticated, service_role;

drop function if exists public.admin_reactivate_group(uuid);

create function public.admin_reactivate_group(p_group_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
  v_label text;    -- FEAT-PC030
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason (PC026 shape).
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be reactivated' using errcode = '22023';
  end if;
  if v_group.status <> 'suspended' then
    raise exception 'cannot reactivate a group that is not suspended';
  end if;

  -- FEAT-PC030: reactivation clears the current hold's reason.
  update public.groups
     set status = 'active', hold_reason = null, updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.reactivate', p_group_id::text,
          jsonb_build_object('group_name', v_group.name, 'reason', p_reason));

  -- FEAT-PC030 STORY-3: one locked-on notice per active FIM member, the actor excluded.
  select k.label into v_label from public.notification_kinds k where k.kind = 'group_reactivated';
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id, 'group_reactivated', v_label, p_reason,
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
    join public.users u on u.personal_group_id = gm.member_group_id
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor
     and u.is_temporary = false
     and u.is_active = true;
end;
$$;

revoke all on function public.admin_reactivate_group(uuid, text) from public, anon;
grant execute on function public.admin_reactivate_group(uuid, text) to authenticated, service_role;

drop function if exists public.admin_update_user_status(uuid, boolean);

create function public.admin_update_user_status(
  target_user_id uuid,
  new_is_active boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
  v_new_origin TEXT;
  v_kind TEXT;     -- FEAT-PC030
  v_label TEXT;    -- FEAT-PC030
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC030 STORY-1: the admin sanctions require a reason, either way
  -- (the PC026 shape).
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason required' USING ERRCODE = '22023';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  -- FOR UPDATE serialises against the self-service contracts' own-row locks
  -- (AC3-14, unchanged from the W1 re-issue).
  SELECT id, is_active, is_decommissioned, deactivation_origin, personal_group_id
  INTO v_target
  FROM public.users WHERE id = target_user_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- Decommission invariant: cannot reactivate a decommissioned user
  IF v_target.is_decommissioned = true AND new_is_active = true THEN
    RAISE EXCEPTION 'Cannot reactivate a decommissioned user';
  END IF;

  -- ADR-U050: 'admin' on hold (a member pause converts to an un-escapable
  -- hold), NULL on release (no stale residue), a decommissioned row keeps its
  -- terminal origin. Unchanged from the W1 re-issue.
  v_new_origin := CASE
    WHEN v_target.is_decommissioned THEN v_target.deactivation_origin
    WHEN new_is_active THEN NULL
    ELSE 'admin'
  END;

  -- No-op guard (PC021 STORY-3): a transition that would change neither the
  -- flag nor the origin refuses and writes nothing — row, audit trail, or
  -- otherwise. The origin clause is load-bearing: a hold on a member-paused
  -- row changes only the origin (the W1b conversion) and must proceed.
  IF v_target.is_active = new_is_active
     AND v_target.deactivation_origin IS NOT DISTINCT FROM v_new_origin THEN
    RAISE EXCEPTION 'User is already in the requested state';
  END IF;

  -- FEAT-PC030: the current hold's reason — set on suspend, cleared on reinstate.
  UPDATE public.users
  SET is_active = new_is_active,
      deactivation_origin = v_new_origin,
      suspension_reason = CASE WHEN new_is_active THEN NULL ELSE p_reason END,
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_caller_group_id,
    CASE WHEN new_is_active THEN 'member.reactivate' ELSE 'member.suspend' END,
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'previous_origin', v_target.deactivation_origin,
      'reason', p_reason));

  -- FEAT-PC030 STORY-3: exactly one locked-on notice to the member's personal
  -- group (the `account` category, locked on since N-D). A Mist recipient
  -- yields no row (the dispatcher's GB-1b rule); a row without a personal
  -- group has no inbox to write to.
  IF v_target.personal_group_id IS NOT NULL THEN
    v_kind := CASE WHEN new_is_active THEN 'account_reinstated' ELSE 'account_suspended' END;
    SELECT k.label INTO v_label FROM public.notification_kinds k WHERE k.kind = v_kind;
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
    VALUES (v_target.personal_group_id, v_kind, v_label, p_reason, '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

revoke all on function public.admin_update_user_status(uuid, boolean, text) from public, anon;
grant execute on function public.admin_update_user_status(uuid, boolean, text) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. The current-hold reads carry the reason — to the right people.
--    Same signatures: CREATE OR REPLACE preserves the ACL; re-asserted anyway.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_is_invited boolean := false;
  v_wields_member boolean := false;
  v_joined_at timestamptz;
  v_can_manage boolean;
  v_can_view_members boolean;
  v_can_manage_members boolean;
  v_members jsonb;
  v_result jsonb;
  v_hold_reason text;   -- FEAT-PC030
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group detail is FIM-only' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';

  select (gm.status = 'active'), (gm.status = 'invited'), gm.added_at
    into v_is_member, v_is_invited, v_joined_at
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  v_is_invited := coalesce(v_is_invited, false);

  -- Revealed-visibility wielder case, checked only when the cheap doors
  -- refuse: does the caller wield an ACTIVE member-group of this group?
  if v_group.id is not null
     and not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    select exists (
      select 1
        from public.group_memberships host
        join public.group_memberships mine
          on mine.group_id = host.member_group_id
         and mine.member_group_id = v_actor
         and mine.status = 'active'
        join public.user_group_roles ugr
          on ugr.group_id = host.member_group_id
         and ugr.member_group_id = v_actor
        join public.group_role_permissions grp on grp.group_role_id = ugr.group_role_id
        join public.permissions p on p.id = grp.permission_id
       where host.group_id = p_group_id
         and host.status = 'active'
         and p.name = 'act_as_group'
    ) into v_wields_member;
  end if;

  -- Members see their group in any lifecycle state (GRP-5); non-members see
  -- public groups only while active; the revealed cases open the face —
  -- own-invited (active groups only) and wields-an-active-member (any state,
  -- a member's standing carried by substitution). Anything else is P0002 —
  -- private and absent stay indistinguishable (no leak).
  if v_group.id is null
     or not (v_is_member
             or (v_group.is_public and v_group.status = 'active')
             or (v_is_invited and v_group.status = 'active')
             or v_wields_member) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  -- FEAT-PC030 STORY-4: the current hold's reason reaches ACTIVE MEMBERS only,
  -- and only while the group is held — null for non-members, the invited, the
  -- wielders, and on an active group. The platform decides who gets it; no
  -- surface gates it on a role string.
  v_hold_reason := case
    when v_is_member and v_group.status in ('resting', 'suspended') then v_group.hold_reason
    else null
  end;

  -- FEAT-PC023 STORY-7: found, labeled, and that's it — the suspended
  -- minimal payload below the admin plane (id, name, status only; FEAT-PC030
  -- adds hold_reason for the member reading their own wall).
  if v_group.status = 'suspended' and not public.is_platform_admin() then
    return jsonb_build_object(
      'id', v_group.id, 'name', v_group.name, 'status', v_group.status,
      'hold_reason', v_hold_reason);
  end if;

  v_can_manage := coalesce(
    public.has_permission(v_actor, p_group_id, 'edit_group_settings'), false);
  -- FEAT-PC013 (Open Q3): paused rows render only for viewers holding a
  -- member-management key — membership state is FIM data (PC-3 Privacy note).
  v_can_manage_members :=
       coalesce(public.has_permission(v_actor, p_group_id, 'pause_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'activate_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'remove_members'), false);
  -- Management keys imply member-list visibility (you cannot manage what you
  -- cannot see) — surfaced by the minimal-permission pauser persona at build.
  v_can_view_members := coalesce(
      public.has_permission(v_actor, p_group_id, 'view_member_list'), false)
    or v_can_manage_members
    or (v_group.is_public and v_group.show_member_list and v_group.status = 'active');

  v_result := jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'status', v_group.status,
    'hold_reason', v_hold_reason,
    'is_public', v_group.is_public,
    'show_member_list', v_group.show_member_list,
    'created_at', v_group.created_at,
    'member_count', (select count(*) from public.group_memberships gm2
                      where gm2.group_id = p_group_id and gm2.status = 'active'),
    -- FEAT-PC015 additive key (ADR-U041 §5): active members that are not
    -- system groups — the count affordances key on (Close for the last
    -- non-system member; the caretaker is never load-bearing in copy).
    'non_system_member_count', (select count(*)
                                  from public.group_memberships gm3
                                  join public.groups mg on mg.id = gm3.member_group_id
                                 where gm3.group_id = p_group_id
                                   and gm3.status = 'active'
                                   and mg.group_type <> 'system'),
    'viewer', jsonb_build_object(
      'is_member', v_is_member,
      'joined_at', v_joined_at,
      'can_manage_settings', v_can_manage)
  );

  if v_can_view_members then
    -- Display identity resolves from the member's (personal) group name —
    -- never full_name (B-DISP oracle). FEAT-PC011 additive keys:
    -- member_group_id + roles[]. FEAT-PC013 additive key: membership_status
    -- ('active' | 'paused'); paused rows appear only when v_can_manage_members.
    -- FEAT-PC015 additive key (ADR-U041 §5, Open Q5): member_group_type —
    -- the member group''s raw group_type (open set, no mapped enum).
    select coalesce(jsonb_agg(jsonb_build_object(
             'display_name', pg.name,
             'joined_at', gm.added_at,
             'member_group_id', gm.member_group_id,
             'membership_status', gm.status,
             'member_group_type', pg.group_type,
             'roles', coalesce(
               (select jsonb_agg(gr.name order by gr.name)
                  from public.user_group_roles ugr
                  join public.group_roles gr on gr.id = ugr.group_role_id
                 where ugr.group_id = p_group_id
                   and ugr.member_group_id = gm.member_group_id),
               '[]'::jsonb))
             order by gm.added_at), '[]'::jsonb)
      into v_members
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = p_group_id
       and (gm.status = 'active'
            or (gm.status = 'paused' and v_can_manage_members));
    v_result := v_result || jsonb_build_object('members', v_members);
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_group_detail(uuid) from public, anon;
grant execute on function public.get_group_detail(uuid) to authenticated, service_role;

create or replace function public.get_own_account_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  SELECT jsonb_build_object(
    'is_active', u.is_active,
    'is_decommissioned', u.is_decommissioned,
    'deactivation_origin', u.deactivation_origin,
    'state', CASE
      WHEN u.is_decommissioned THEN 'decommissioned'
      WHEN NOT u.is_active AND u.deactivation_origin = 'member' THEN 'paused'
      WHEN NOT u.is_active THEN 'suspended'
      ELSE 'active'
    END,
    -- FEAT-PC030 STORY-4: the current account hold's reason, own row only;
    -- null while active (reinstatement clears the column; the CASE is the belt).
    'suspension_reason', CASE WHEN u.is_active THEN NULL ELSE u.suspension_reason END
  )
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

revoke all on function public.get_own_account_state() from public, anon;
grant execute on function public.get_own_account_state() to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Apply-time self-verification of the gate's two invariants (README row 2):
--    the seven re-issued overloads exist and the old ones are gone; the
--    groups column grant excludes hold_reason for both client roles.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_n integer;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('rest_group', 'wake_group', 'admin_rest_group', 'admin_wake_group',
                       'admin_suspend_group', 'admin_reactivate_group', 'admin_update_user_status');
  if v_n <> 7 then
    raise exception 'FEAT-PC030: expected exactly seven hold contracts (one overload each), found %', v_n;
  end if;

  select count(*) into v_n
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'groups'
     and column_name = 'hold_reason' and privilege_type = 'SELECT'
     and grantee in ('authenticated', 'anon');
  if v_n <> 0 then
    raise exception 'FEAT-PC030: hold_reason is SELECT-granted to a client role (% grants)', v_n;
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'groups'
       and privilege_type = 'SELECT' and grantee in ('authenticated', 'anon')
  ) then
    raise exception 'FEAT-PC030: a table-level SELECT on groups survives for a client role';
  end if;
end $$;
