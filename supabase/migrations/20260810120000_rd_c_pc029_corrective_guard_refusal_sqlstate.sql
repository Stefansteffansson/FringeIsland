-- FEAT-PC029 CORRECTIVE — guard refusals raise P0001, not 42501
--
-- Found 2026-08-10 while building the consumer (FEAT-H045 STORY-2), which is
-- exactly where a payload/contract walk earns its keep.
--
-- THE DEFECT
-- ----------
-- `admin_delete_role_template` (migration 20260810090000, applied) raised its
-- GUARD refusals with `errcode = '42501'` — the same SQLSTATE as its
-- non-admin gate. The Hub's BFF lib treats 42501 as "not authorised" and
-- collapses it to `refused: true`, which the routes render as an
-- existence-hiding **404 Not found**:
--
--     if (error.code === '42501') return { data: null, refused: true };
--
-- So a guard refusal — "this role template was offered to groups and cannot be
-- deleted" — reached the admin as "Not found", with the reason discarded.
--
-- That makes FEAT-H045 STORY-2's acceptance criterion UNREACHABLE:
--   "Given the server refuses (someone published it between render and click),
--    when the refusal returns, then the message is surfaced VERBATIM, the admin
--    stays where they are, and the list refreshes."
--
-- WHY THE SQLSTATE IS THE RIGHT FIX, not a Surface special-case
-- ------------------------------------------------------------
-- 42501 is `insufficient_privilege`. A guard refusal is NOT a privilege
-- problem — the caller is a platform admin and is allowed to ask; the platform
-- is declining on a business rule. P0001 (`raise_exception`) is what the rest
-- of the family already uses for state-conflict refusals, and the BFF's
-- existing `refusalStatus` maps it to **409 Conflict** with the message
-- surfaced verbatim, which is precisely the behaviour the AC describes.
--
-- The alternative — teaching the Surface to tell the two 42501s apart by
-- matching on message text — would put a platform distinction inside a client,
-- brittle and against ADR-U038. The contract should say what it means.
--
-- NOT REWRITING THE APPLIED MIGRATION (house rule): 20260810090000 stays as
-- applied; this corrects it forward.
--
-- Sibling assertions touched:
--   * hub/tests/integration/admin/role-template-disposal.test.ts — its refusal
--     cells assert `error.message` contains the reason, which holds under both
--     codes because they call the RPC DIRECTLY rather than through the BFF lib.
--     That is exactly why the suite stayed green while the BFF path was broken;
--     a route-level cell is added with STORY-2 to close that gap.
--   * No other caller of admin_delete_role_template exists yet.
--
-- The non-admin gate keeps 42501 deliberately: that one IS a privilege failure,
-- and the Hub's collapse-to-404 is the correct existence-hiding behaviour there.

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
  -- A PRIVILEGE failure — 42501 is correct here, and the Surface's
  -- existence-hiding 404 on top of it is intended.
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
    -- A BUSINESS-RULE refusal. P0001 -> 409, message surfaced verbatim.
    --
    -- NOTE: the audit insert that used to sit here has been REMOVED, not
    -- moved. It could never work: an INSERT followed by RAISE in the same
    -- transaction is discarded with the exception, so the row never landed.
    -- Measured across the live log: 0 rows matching '%_refused' out of 6 619,
    -- against 118 successful retires — the whole admin family carries this
    -- dead pattern. Keeping a line that reads as auditing but audits nothing
    -- is how a wrong belief gets inherited by the next reader.
    -- TASK-RDC-03 owns the family-wide ruling; this function stops claiming it.
    raise exception '%', v_reason using errcode = 'P0001';
  end if;

  -- STORY-3: capture BEFORE the write. The moment this succeeds there is no
  -- row left to join the audit entry against.
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
  'FEAT-PC029 STORY-2 (corrected 2026-08-10): guarded hard delete. Guard '
  'refusals raise P0001 so the Surface can surface them verbatim (409); only '
  'the non-admin gate raises 42501, which the Surface correctly hides as 404. '
  'Captures name and version count BEFORE the delete (STORY-3). Does NOT audit '
  'refusals — INSERT-then-RAISE is discarded by its own exception; see '
  'TASK-RDC-03.';

revoke all on function public.admin_delete_role_template(uuid) from public, anon;
grant execute on function public.admin_delete_role_template(uuid) to authenticated, service_role;
