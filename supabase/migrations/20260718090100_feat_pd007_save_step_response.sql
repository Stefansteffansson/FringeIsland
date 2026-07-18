-- ============================================================================
-- FEAT-PD007 (Cycle J-F) — save_step_response: the dedicated capture verb.
-- *** HELD AT THE SCHEMA GATE — apply only after the nod. *** TASK-JF-02.
-- Decomposition defaults JF-3/JF-4/JF-5 realized (ADR-U046):
--
--   JF-3: a DEDICATED verb, not a parameter on enter/complete — capture is
--         orthogonal to both passage and completion, and post-completion
--         editing needs a verb that neither records passage nor re-completes.
--   JF-4: instance targeting open-else-latest-else-create; "latest" for
--         completed instances = completed_at desc then created_at desc
--         (deterministic under repeatable steps). Responding never flips
--         completed_at, never duplicates an open instance.
--   JF-5: size guard — char_length(body) <= 100000 (the PD001 journal-body
--         precedent, feat_pd001 line 34) refused 22001; a 256 KiB whole-payload
--         backstop (extra conventional keys ride, megabytes do not); malformed
--         payloads (non-object / no body key / non-string body) refused 22023
--         and NEVER clear existing words (the rabbit-hole pin).
--
-- Semantics (FEAT-PD007 STORY-2/5):
--   * Actor = get_current_personal_group_id() (P-O1); traveller standing via
--     _enrollment_traveller_standing (P0002 — existence hidden). The write
--     targets the CALLER's own instance only (traveller_group_id = actor).
--   * Status guard mirrors enter/complete verbatim: not in ('active',
--     'completed') -> P0001 (frozen/withdrawn/paused are read-only — JRN-14
--     extends, no new rule; 'completed' admitted — the J-C loosening carries).
--   * Explicit empty (SQL NULL / JSON null / null body / empty-or-whitespace
--     body) CLEARS the response to NULL — retraction; the passage stays and
--     response_updated_at stamps (an effective write).
--   * Mist-compatible by construction — no Mist branch, same as enter/complete.
--   * No captures_response gate (the registry flag places affordances; it is
--     not a refusal) and no via-group permission key (responding is the
--     traveller's own words, ungated beyond standing like enter) — both
--     surfaced on the gate board.
--
-- Direct-caller question (ADR-U038): a direct PostgREST caller reaches only
-- this verb (the table itself has no grants). The verb writes exactly the
-- caller's own (enrolment x traveller x step) response under the same guard
-- family the product route relies on — nothing a direct call can do that the
-- route would not allow.
-- SECURITY DEFINER: writes the contract-only instances table; search_path = ''.
-- ============================================================================

create or replace function public.save_step_response(
  p_enrollment_id uuid,
  p_step_id uuid,
  p_response jsonb
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_step public.journey_steps%rowtype;
  v_inst public.journey_step_instances%rowtype;
  v_clear boolean := false;
  v_body text;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  -- The enter/complete guard family verbatim (FEAT-PD004 wording): 'completed'
  -- admitted; frozen/withdrawn/paused refuse. JRN-14 extends with no new rule.
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- Payload discipline (JF-5 + the malformed-clear rabbit hole). Only an
  -- EXPLICIT empty clears; anything malformed refuses before touching words.
  if p_response is null or jsonb_typeof(p_response) = 'null' then
    v_clear := true;
  elsif jsonb_typeof(p_response) <> 'object' then
    raise exception 'response must be a JSON object' using errcode = '22023';
  elsif not (p_response ? 'body') then
    raise exception 'response carries no body' using errcode = '22023';
  elsif jsonb_typeof(p_response -> 'body') = 'null' then
    v_clear := true;
  elsif jsonb_typeof(p_response -> 'body') <> 'string' then
    raise exception 'response body must be text' using errcode = '22023';
  else
    v_body := p_response ->> 'body';
    if btrim(v_body) = '' then
      v_clear := true;
    elsif char_length(v_body) > 100000 then
      raise exception 'response body exceeds 100000 characters' using errcode = '22001';
    elsif pg_column_size(p_response) > 262144 then
      raise exception 'response payload too large' using errcode = '22001';
    end if;
  end if;

  -- JF-4 targeting: the open instance if one exists...
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  -- ...else the most recent completed instance (editing revises the lived
  -- record; it never fabricates a new engagement)...
  if v_inst.id is null then
    select * into v_inst
      from public.journey_step_instances i
     where i.enrollment_id = p_enrollment_id
       and i.traveller_group_id = v_actor
       and i.step_id = p_step_id
       and i.completed_at is not null
     order by i.completed_at desc, i.created_at desc limit 1;
  end if;

  if v_inst.id is null then
    -- ...else one is created open (capture-before-complete; mirrors
    -- complete's create-and-complete). complete_journey_step will complete
    -- THIS instance — no duplicate ever appears.
    insert into public.journey_step_instances
      (enrollment_id, traveller_group_id, step_id, response, response_updated_at)
    values (p_enrollment_id, v_actor, p_step_id,
            case when v_clear then null else p_response end, now())
    returning * into v_inst;
  else
    update public.journey_step_instances
       set response = case when v_clear then null else p_response end,
           response_updated_at = now()
     where id = v_inst.id
     returning * into v_inst;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'response', v_inst.response,
    'response_updated_at', v_inst.response_updated_at);
end;
$$;

comment on function public.save_step_response(uuid, uuid, jsonb) is
  'FEAT-PD007 STORY-2/5 (ADR-U046; deepens JRN-9''s lived record): the '
  'optional-always capture write — orthogonal to completion (saving never '
  'completes, completing never requires). Targets the caller''s own instance, '
  'open-else-latest-else-create; explicit empty clears to NULL (retraction — '
  'passage kept); malformed payloads refuse 22023 without clearing; body '
  'ceiling 100000 chars / 256 KiB payload backstop refuse 22001. Guard family '
  'verbatim from enter/complete: active OR completed admit, frozen/withdrawn/'
  'paused refuse P0001; traveller standing P0002-concealed. Mist-compatible '
  'by construction. SECURITY DEFINER: writes the contract-only instances table.';

revoke all on function public.save_step_response(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_step_response(uuid, uuid, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------
do $$
begin
  assert to_regprocedure('public.save_step_response(uuid, uuid, jsonb)') is not null,
    'PD007: save_step_response missing';
end $$;
