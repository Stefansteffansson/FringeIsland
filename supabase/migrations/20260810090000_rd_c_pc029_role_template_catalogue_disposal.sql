-- FEAT-PC029 — role-template catalogue disposal (RD-B walk finding W-10)
--
-- Two changes on the existing admin surface. No new table.
--   A. `admin_get_role_templates` widens by two ADDITIVE keys, `deletable` and
--      `undeletable_reason`, so the affordance the Hub renders and the rule the
--      server enforces are the same rule (FEAT-H045 STORY-2/3 consume them).
--   B. `admin_delete_role_template(uuid)` — hard delete, guarded to exactly the
--      case RD-4a carves out of RD-4's retire-only law.
--
-- RD-4a (accepted 2026-08-09): retire-only stands for every template ever
-- offered or ever adopted. A template NEVER published with NO copies has no
-- provenance to dangle and no audit evidence of anything a Steward ever saw;
-- for that case only, delete is permitted.
--
-- ---------------------------------------------------------------------------
-- PREMISE CORRECTION — why "ever published" is read from the AUDIT LOG
-- ---------------------------------------------------------------------------
-- The spec's guard said "zero rows EVER in role_template_publications ... a
-- true 'was never offered', not a 'no longer offered'". Measured against the
-- live catalogue 2026-08-10, that is NOT implementable against that table:
--
--   `admin_unpublish_role_template` HARD-DELETES its publication rows, and
--   `role_template_publications` has no `unpublished_at` column.
--
-- So publish -> unpublish leaves zero rows, and a template that WAS offered
-- would read as never-offered, become `deletable`, and be destroyed — breaching
-- RD-4a in exactly the case RD-4 still protects. The spec's own rabbit hole
-- names this clause "the load-bearing half"; it was load-bearing and unsupported.
--
-- The durable evidence lives in `admin_audit_log`, and it is COMPLETE, not
-- partial: the earliest `role_template.publish` audit row (2026-08-07) predates
-- the earliest surviving publication row (2026-08-09), because publication
-- shipped with PC028 and has audited every publish since. Measured exposure at
-- authoring time was 0 templates — the defect is latent, not live, and is
-- reachable by precisely the journey this feature serves (clone, try it out,
-- unpublish, retire, delete).
--
-- Decision taken by Stefan 2026-08-10: consult the audit log; do NOT tombstone
-- the publications table (that would change shipped PC028 semantics and force
-- every existing reader to filter, which the appetite calls "escaped").
--
-- CONSEQUENCE, stated plainly: `admin_audit_log` is now load-bearing for a
-- GUARD, not only for observability. Pruning `role_template.publish` rows would
-- silently widen this delete. Anything that prunes that table must exclude them.
--
-- ---------------------------------------------------------------------------
-- Sibling assertions this migration touches (platform-tier rule: name them)
-- ---------------------------------------------------------------------------
--   * hub/tests/integration/admin/role-template-editing.test.ts — asserts the
--     shape of `admin_get_role_templates` entries. ADDITIVE change only; no key
--     changes name, type or meaning, so those assertions stand unadapted.
--   * hub/tests/unit/components/admin/admin-roles-view.test.tsx — its Template
--     fixture type gains two optional keys; the component ignores them until
--     H045 STORY-2. Left deliberately unadapted.
--   * hub/tests/integration/platform/anon-execute-lockdown.test.ts — the
--     blanket invariant; the new function carries its own revoke/grant pair
--     below, so this stays green rather than needing adaptation.
--   * No existing user-facing copy is changed by this migration.
--
-- Cascade note (ADR-U016): on delete of a role_templates row the substrate
-- CASCADEs role_template_versions / _permissions / _publications /
-- group_template_roles and SET NULLs group_roles.created_from_role_template_id.
-- The guard exists precisely because that SET NULL would sever the provenance
-- line FEAT-H043 renders. Nothing eligible for deletion has any of these rows.

-- ===========================================================================
-- A. The shared predicate, written ONCE, so the badge and the guard cannot
--    disagree. Precedence is fixed: system -> not_retired -> published ->
--    adopted (most-structural first, so the reason names what must be
--    addressed FIRST). Deterministic by construction, per STORY-1.
-- ===========================================================================
create or replace function public.role_template_undeletable_reason(p_template_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when rt.id is null then 'role template not found'
    when rt.is_system then
      'seeded role templates are part of the platform and can never be deleted'
    when rt.retired_at is null then
      'retire this role template before deleting it'
    -- "was ever OFFERED", not "is offered now" — a live publication row OR any
    -- publish in the audit trail. See the premise correction above: unpublish
    -- deletes the row, so the table alone cannot answer this.
    when exists (select 1 from public.role_template_publications pub
                  where pub.role_template_id = rt.id)
      or exists (select 1 from public.admin_audit_log al
                  where al.action = 'role_template.publish'
                    and al.target = rt.id::text) then
      'this role template was offered to groups and cannot be deleted'
    when exists (select 1 from public.group_roles gr
                  where gr.created_from_role_template_id = rt.id) then
      'groups carry copies made from this role template'
    else null
  end
  from public.role_templates rt
  where rt.id = p_template_id;
$$;

comment on function public.role_template_undeletable_reason(uuid) is
  'FEAT-PC029: the single disposal predicate. Returns null when a template may '
  'be deleted, else server-authored copy naming the FIRST condition to address. '
  'Serves both the `deletable` badge and admin_delete_role_template''s guard so '
  'the two can never disagree. "Ever offered" reads admin_audit_log because '
  'admin_unpublish_role_template hard-deletes publication rows.';

revoke all on function public.role_template_undeletable_reason(uuid) from public, anon;
grant execute on function public.role_template_undeletable_reason(uuid) to authenticated, service_role;

-- ===========================================================================
-- B. Widen the list read — ADDITIVE ONLY. Every pre-existing key keeps its
--    name, type and meaning (STORY-1's last criterion).
-- ===========================================================================
create or replace function public.admin_get_role_templates()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
DECLARE
  v_templates jsonb;
  v_catalog jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(t.doc ORDER BY t.is_system DESC, t.name), '[]'::jsonb)
    INTO v_templates
    FROM (
      SELECT rt.is_system, rt.name,
             jsonb_build_object(
               'id', rt.id,
               'name', rt.name,
               'description', rt.description,
               'is_system', rt.is_system,
               'default_version_number', dv.version_number,
               -- RD-A FEAT-PC027 STORY-3: every entry carries the key, retired
               -- or not — the admin render reads it unconditionally.
               'retired_at', rt.retired_at,
               -- RD-C FEAT-PC029 STORY-1: eligibility computed HERE, inside the
               -- read the catalogue already makes, so the surface gains no
               -- second round-trip per template (the shape the PC028 payload
               -- walk caught and rejected). The Hub never derives this.
               'deletable',
                 (public.role_template_undeletable_reason(rt.id) IS NULL),
               'undeletable_reason',
                 public.role_template_undeletable_reason(rt.id),
               'version_count',
                 (SELECT count(*) FROM public.role_template_versions v
                   WHERE v.role_template_id = rt.id),
               'group_template_refs',
                 COALESCE((SELECT jsonb_agg(gt.name ORDER BY gt.name)
                             FROM public.group_template_roles gtr
                             JOIN public.group_templates gt
                               ON gt.id = gtr.group_template_id
                            WHERE gtr.role_template_id = rt.id), '[]'::jsonb),
               'instantiated_role_count',
                 (SELECT count(*) FROM public.group_roles gr
                   WHERE gr.created_from_role_template_id = rt.id)
             ) AS doc
        FROM public.role_templates rt
        LEFT JOIN public.role_template_versions dv ON dv.id = rt.default_version_id
    ) t;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'name', p.name,
             'category', p.category,
             'description', p.description,
             'is_protected', p.is_protected)
           ORDER BY p.category, p.name), '[]'::jsonb)
    INTO v_catalog
    FROM public.permissions p;

  RETURN jsonb_build_object(
    'templates', v_templates,
    'catalog', v_catalog,
    'generated_at', now());
END;
$function$;

revoke all on function public.admin_get_role_templates() from public, anon;
grant execute on function public.admin_get_role_templates() to authenticated, service_role;

-- ===========================================================================
-- C. The guarded hard delete. Refuses LOUDLY and audits the refusal, matching
--    admin_retire_role_template's posture (never half-act). The guard is
--    evaluated and raised BEFORE any write, so a refusal deletes nothing —
--    never partway through a cascade (STORY-2's last criterion).
-- ===========================================================================
create or replace function public.admin_delete_role_template(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
  v_reason text;
  v_version_count integer;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template
    from public.role_templates rt where rt.id = p_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  v_reason := public.role_template_undeletable_reason(p_template_id);
  if v_reason is not null then
    insert into public.admin_audit_log (actor_group_id, action, target, metadata)
    values (v_actor, 'role_template.delete_refused', p_template_id::text,
            jsonb_build_object('reason', v_reason,
                               'template_name', v_template.name));
    raise exception '%', v_reason using errcode = '42501';
  end if;

  -- STORY-3: capture BEFORE the write. The moment this succeeds there is no
  -- row left to join the audit entry against, so an entry that only carries an
  -- id would say nothing a year from now. Same principle TASK-INT-03 applied
  -- when it KEPT orphaned groups because they were audit actors — other end.
  select count(*) into v_version_count
    from public.role_template_versions v where v.role_template_id = p_template_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'role_template.delete', p_template_id::text,
          jsonb_build_object('template_name', v_template.name,
                             'template_id', p_template_id,
                             'version_count', v_version_count,
                             'retired_at', v_template.retired_at));

  delete from public.role_templates where id = p_template_id;

  return jsonb_build_object('deleted', true,
                            'id', p_template_id,
                            'template_name', v_template.name,
                            'version_count', v_version_count);
end;
$function$;

comment on function public.admin_delete_role_template(uuid) is
  'FEAT-PC029 STORY-2: hard-delete a role template, guarded by '
  'role_template_undeletable_reason to the RD-4a carve-out — non-system, '
  'retired, never offered, never adopted. Refusals are audited and raised '
  'before any write. The audit row captures name and version count BEFORE the '
  'delete, because the target ceases to exist (STORY-3).';

-- The revoke is LOAD-BEARING, not hygiene: default privileges do not cover the
-- apply path, so a new function is anon-executable via PUBLIC from the moment
-- it is applied until this line runs (TASK-SEC-01, accepted risk, owner Stefan).
revoke all on function public.admin_delete_role_template(uuid) from public, anon;
grant execute on function public.admin_delete_role_template(uuid) to authenticated, service_role;
