-- P3a (perf-hardening-backlog; the Identity→Groups boundary NFR bet, D1).
-- Zero-risk batch only: the 14 advisor-listed FK covering indexes (additive)
-- and the 2 remaining auth_rls_initplan policy wraps (logic unchanged —
-- definitions verified against pg_policies before recreation). The
-- multiple-permissive-policies consolidation is P3b (careful batch) and is
-- deliberately NOT here.

-- ---------------------------------------------------------------------------
-- 1. FK covering indexes (advisor work-list, 2026-07-04)
-- ---------------------------------------------------------------------------

create index if not exists idx_consent_records_subject_user_id on public.consent_records (subject_user_id);
create index if not exists idx_direct_messages_sender_group_id on public.direct_messages (sender_group_id);
create index if not exists idx_group_memberships_added_by_group_id on public.group_memberships (added_by_group_id);
create index if not exists idx_group_role_permissions_permission_id on public.group_role_permissions (permission_id);
create index if not exists idx_group_roles_created_from_role_template_id on public.group_roles (created_from_role_template_id);
create index if not exists idx_group_template_roles_role_template_id on public.group_template_roles (role_template_id);
create index if not exists idx_groups_created_from_group_template_id on public.groups (created_from_group_template_id);
create index if not exists idx_journey_enrollments_enrolled_by_group_id on public.journey_enrollments (enrolled_by_group_id);
create index if not exists idx_journeys_created_by_group_id on public.journeys (created_by_group_id);
create index if not exists idx_pending_email_invitations_invited_by_group_id on public.pending_email_invitations (invited_by_group_id);
create index if not exists idx_role_template_permissions_permission_id on public.role_template_permissions (permission_id);
create index if not exists idx_user_group_roles_assigned_by_group_id on public.user_group_roles (assigned_by_group_id);
create index if not exists idx_user_group_roles_group_id on public.user_group_roles (group_id);
create index if not exists idx_user_group_roles_group_role_id on public.user_group_roles (group_role_id);

-- ---------------------------------------------------------------------------
-- 2. auth_rls_initplan wraps (recreate with (select ...) — same logic).
--    Names verified against pg_policies before the DROP (the
--    wrong-name-silently-succeeds gotcha).
-- ---------------------------------------------------------------------------

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

drop policy if exists "session_signal_receive_own" on realtime.messages;
create policy "session_signal_receive_own" on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and (select realtime.topic()) = ('account:' || (select auth.uid()::text) || ':sessions')
  );
