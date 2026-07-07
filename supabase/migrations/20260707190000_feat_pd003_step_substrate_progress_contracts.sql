-- ============================================================================
-- FEAT-PD003 (Cycle J-B): the ADR-U044 step substrate + per-traveller progress
-- contracts. *** HELD AT THE SCHEMA GATE — apply only after the nod. ***
--
-- The Open-Q board (Q1..Q7, defaults below) travels in the gate PR body with
-- dev pre-check evidence. Resolutions are recorded in FEAT-PD003's
-- Implementation notes after the nod.
--
-- What this migration does, in order:
--   1. Registries (ADR-U044 §3): content_families (6 canon rows) +
--      step_kinds (7 Tier-1 presets) — data-driven, extensible (U008/U018).
--   2. journey_steps (ADR-U044 §2): one row per step (single-beat node),
--      beat-record columns, inline content payload tagged pending-DS-4.
--   3. journeys.sequencing_mode column (Q2) — data only; linear exercised.
--   4. _migrate_journey_content_steps(): count-agnostic, parity-guarded,
--      idempotent conversion of content.steps[] -> rows under the §3 mapping
--      (Q3: all seeded assessments -> reflect, per gate evidence); nulls the
--      converted journey's content (Q2). Runs here; re-runnable by seeds.
--   5. Re-point get_journey_catalog.step_count + get_journey_detail.steps[]
--      to rows (payload shapes preserved; kind becomes the registry key).
--   6. journey_step_instances (ADR-U044 §4): the progress grain
--      (enrolment x traveller personal group x step); open-instance partial
--      unique index; developmental personal data — invariants 4 + 8.
--   7. Q1 withdraw revisit: status CHECK gains 'withdrawn'; withdraw flips
--      status instead of deleting (instances survive; ADR-U031 erasure still
--      row-deletes and cascades). Consequence set, each re-issued in place
--      with the delta labelled: enroll_self / enroll_group blocking checks
--      and get_my_enrollments / get_journey_detail viewer reads exclude
--      'withdrawn' rows.
--   8. Player contracts: get_player_state / enter_journey_step /
--      complete_journey_step (Q6 resume semantics; Q7 role gating).
--   9. Posture: RLS on all four new tables (no-policy = contract-only for
--      steps + instances per Q4; registries SELECT-to-authenticated);
--      explicit DML revocation; grants per function.
--
-- Direct-caller question (ADR-U038), answered per object in the comments
-- below and summarised in the PR body.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Registries. Seed-defined vocabulary; inserting a row IS the extension
--    mechanism (invariant 6 / ADR-U008/U018 — no sealed sets anywhere).
--    Q4 read posture: public vocabulary, SELECT for authenticated (Mist
--    sessions hold `authenticated`; the player payload embeds kind metadata,
--    but the registry itself is harmless and useful to read). No write path
--    outside the service role.
-- ----------------------------------------------------------------------------
create table public.content_families (
  key         text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

comment on table public.content_families is
  'ADR-U044 §3 / FEAT-PD003: the six canon content families (narrative core vocabulary) as a data-driven registry. Extension = INSERT (service role / future authoring surface), never a schema change. Direct caller: SELECT only.';

create table public.step_kinds (
  key                     text primary key,
  label                   text not null,
  default_content_family  text not null references public.content_families(key),
  ask_verb                text not null,
  change_semantic         text not null,
  description             text,
  created_at              timestamptz not null default now()
);

comment on table public.step_kinds is
  'ADR-U044 §3 / FEAT-PD003: step kinds as preset bundles of (content family + ask/change semantics); ADR-U008 Tier-1 types are the seed rows. JRN-18''s "every foundational step type" = these rows. Extension = INSERT. Direct caller: SELECT only.';

alter table public.content_families enable row level security;
alter table public.step_kinds enable row level security;

create policy content_families_select on public.content_families
  for select to authenticated using (true);
create policy step_kinds_select on public.step_kinds
  for select to authenticated using (true);

revoke all on table public.content_families from anon;
revoke all on table public.step_kinds from anon;
revoke insert, update, delete on table public.content_families from authenticated;
revoke insert, update, delete on table public.step_kinds from authenticated;

insert into public.content_families (key, label, description) values
  ('witness',   'Witness',   'Something is offered to be received — read, watch, listen, behold.'),
  ('reflect',   'Reflect',   'The traveller turns inward — consider, journal, self-assess.'),
  ('decide',    'Decide',    'A choice is invited — commit to a direction.'),
  ('act',       'Act',       'Something is done — practice, exercise, produce.'),
  ('encounter', 'Encounter', 'A meeting — with another traveller, a guide, a presence.'),
  ('rest',      'Rest',      'Deliberate pause — silence is a valid Present.');

insert into public.step_kinds (key, label, default_content_family, ask_verb, change_semantic, description) values
  ('narrative',  'Narrative',  'witness', 'Read',           'witnessed',     'Present narrative content; the ask is to receive it.'),
  ('reflection', 'Reflection', 'reflect', 'Reflect',        'reflected',     'A prompt to turn inward.'),
  ('assessment', 'Assessment', 'reflect', 'Respond',        'responded',     'A structured self-assessment; family may be reflect or decide per journey (ADR-U044 §3).'),
  ('choice',     'Choice',     'decide',  'Choose',         'chosen',        'A decision point.'),
  ('activity',   'Activity',   'act',     'Do',             'done',          'Something to do beyond the canvas.'),
  ('journal',    'Journal',    'reflect', 'Write an entry', 'entry written', 'A journalling ask.'),
  ('checklist',  'Checklist',  'act',     'Check off',      'checked',       'A stepwise list to work through.');


-- ----------------------------------------------------------------------------
-- 2. journey_steps. One row per step; each row a single-beat node (ADR-U044
--    §2). Beat-record columns; unlocked_by + repeatable are stored data whose
--    non-linear semantics are forward shape (§5) — only linear is exercised.
--    Content payload inline, tagged pending-DS-4 (ADR-U016 disposition:
--    externalisation later = a payload-column swap, not a remodel).
--    Q4 read posture: CONTRACT-ONLY. No SELECT policy/grant — a published-
--    mirror policy would leak content payloads around the preview contract
--    (get_journey_detail deliberately returns steps WITHOUT content).
--    Direct caller (incl. anonymous-session Mist): nothing — RLS enabled with
--    no policies + zero grants.
-- ----------------------------------------------------------------------------
create table public.journey_steps (
  id                  uuid primary key default gen_random_uuid(),
  journey_id          uuid not null references public.journeys(id) on delete cascade,
  step_order          integer not null,
  title               text not null,
  step_kind_key       text not null references public.step_kinds(key),
  content_family_key  text not null references public.content_families(key),
  required            boolean not null default true,
  repeatable          boolean not null default false,
  unlocked_by         uuid references public.journey_steps(id) on delete set null,
  duration_minutes    integer,
  content             jsonb,
  legacy_step_id      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (journey_id, step_order)
);

comment on table public.journey_steps is
  'ADR-U044 §2 / FEAT-PD003: steps as rows (single-beat nodes). content is the inline payload, tagged pending-DS-4 (ADR-U016). Contract-only (Q4): no SELECT policy — previews via get_journey_detail (content-free), full payloads via get_player_state (traveller-gated). Direct caller: nothing.';

create trigger set_journey_steps_updated_at
  before update on public.journey_steps
  for each row execute function public.update_updated_at_column();

alter table public.journey_steps enable row level security;
revoke all on table public.journey_steps from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. journeys.sequencing_mode (Q2). Unconstrained TEXT deliberately —
--    invariant 6 (no sealed vocabularies); modes beyond 'linear' are ADR-U044
--    §5 forward shape, stored as data only.
-- ----------------------------------------------------------------------------
alter table public.journeys
  add column sequencing_mode text not null default 'linear';

comment on column public.journeys.sequencing_mode is
  'ADR-U044: beat-sequencing mode (linear | open | gated | future values — data-driven, no CHECK by design). Only ''linear'' is exercised in Ferd; the player treats non-linear values as forward shape.';


-- ----------------------------------------------------------------------------
-- 4. The conversion. Count-agnostic (no hardcoded 47/21/5 — the two seed sets
--    differ; gate evidence confirms the sprint1 "FringeIsland Journeys" set
--    is live), parity-guarded per journey, idempotent (a journey that already
--    has rows refuses re-conversion loudly), and reusable: seeds that insert
--    legacy-shaped content.steps[] (seeds/05) call this after inserting.
--    Unknown legacy types fall through to the step_kinds FK and abort loudly —
--    never a silent mapping.
--    SECURITY DEFINER + service-role-only: a data-migration primitive, not a
--    caller surface. Direct caller: cannot execute.
-- ----------------------------------------------------------------------------
create or replace function public._migrate_journey_content_steps()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  v_json_count int;
  v_row_count  int;
  v_total      int := 0;
begin
  for r in select j.id, j.content from public.journeys j where j.content ? 'steps'
  loop
    if exists (select 1 from public.journey_steps st where st.journey_id = r.id) then
      raise exception 'journey % already has step rows; refusing to re-convert content.steps', r.id;
    end if;

    insert into public.journey_steps
      (journey_id, step_order, title, step_kind_key, content_family_key,
       required, repeatable, duration_minutes, legacy_step_id)
    select
      r.id,
      s.ord,
      s.value->>'title',
      case s.value->>'type'
        when 'content'    then 'narrative'
        when 'activity'   then 'activity'
        when 'assessment' then 'assessment'
        else s.value->>'type'          -- unknown type -> FK violation -> loud abort
      end,
      case s.value->>'type'
        when 'content'    then 'witness'
        when 'activity'   then 'act'
        when 'assessment' then 'reflect'   -- Q3: all seeded assessments are reflection-shaped (gate evidence)
        else coalesce((select k.default_content_family from public.step_kinds k
                        where k.key = s.value->>'type'), 'witness')
      end,
      coalesce((s.value->>'required')::boolean, true),
      false,
      nullif(s.value->>'duration_minutes', '')::integer,
      s.value->>'id'
    from jsonb_array_elements(r.content->'steps') with ordinality as s(value, ord);

    get diagnostics v_row_count = row_count;
    v_json_count := jsonb_array_length(r.content->'steps');
    if v_row_count <> v_json_count then
      raise exception 'FEAT-PD003 parity failure for journey %: % JSONB steps -> % rows',
        r.id, v_json_count, v_row_count;
    end if;

    update public.journeys
       set sequencing_mode = coalesce(r.content->>'structure', 'linear'),
           content = null                          -- Q2: the wrapper carried only version/structure/steps
     where id = r.id;

    v_total := v_total + v_row_count;
  end loop;

  return v_total;
end;
$$;

comment on function public._migrate_journey_content_steps() is
  'FEAT-PD003 STORY-2: the mechanical ADR-U044 conversion (content.steps[] -> journey_steps rows), parity-guarded per journey, idempotent-by-refusal. Service-role only; seeds that insert legacy-shaped journeys call it after inserting. SECURITY DEFINER: data-migration primitive.';

revoke all on function public._migrate_journey_content_steps() from public, anon, authenticated;
grant execute on function public._migrate_journey_content_steps() to service_role;

-- Run the conversion now, and prove the post-state.
select public._migrate_journey_content_steps();

do $$
declare v_left int;
begin
  select count(*) into v_left from public.journeys where content ? 'steps';
  if v_left > 0 then
    raise exception 'FEAT-PD003: % journeys still carry content.steps after conversion', v_left;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 5. Re-point the two shipped reads (STORY-3). Payload shapes preserved
--    byte-for-byte except: step_count/steps[] now derive from rows and
--    steps[].kind is the registry key. get_journey_detail additionally gains
--    the Q1 'withdrawn' exclusions in its viewer block (labelled below).
-- ----------------------------------------------------------------------------
create or replace function public.get_journey_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'id', j.id,
              'title', j.title,
              'description', j.description,
              'difficulty_level', j.difficulty_level,
              'estimated_duration_minutes', j.estimated_duration_minutes,
              'tags', to_jsonb(coalesce(j.tags, '{}'::text[])),
              -- FEAT-PD003 re-point: rows, not content JSONB
              'step_count', (select count(*)::int from public.journey_steps st
                              where st.journey_id = j.id))
            order by j.title asc, j.id asc)
       from public.journeys j
      where j.is_published = true
        and (j.is_public = true
             or public.is_active_group_member(j.created_by_group_id)
             or public.is_enrolled_in_journey(j.id)
             or public.is_platform_admin())),
    '[]'::jsonb);
end;
$$;

comment on function public.get_journey_catalog() is
  'FEAT-PD002 STORY-1 (JRN-1 platform half; re-pointed by FEAT-PD003 to journey_steps rows): the published catalogue, visibility mirroring the journeys_select_published RLS. Mist-readable. SECURITY DEFINER: derives step_count and owner-member visibility across RLS.';

create or replace function public.get_journey_detail(
  p_journey_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_journey public.journeys%rowtype;
  v_steps jsonb;
  v_individual jsonb := null;
  v_enrolled_via jsonb := '[]'::jsonb;
  v_enrollable jsonb := '[]'::jsonb;
begin
  v_actor := public.get_current_personal_group_id();

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  -- FEAT-PD003 re-point: rows, not content JSONB. Shape preserved
  -- (title/kind/duration — NEVER the content payload); kind = registry key.
  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'title', st.title,
              'kind', st.step_kind_key,
              'duration_minutes', st.duration_minutes)
            order by st.step_order)
       from public.journey_steps st
      where st.journey_id = v_journey.id),
    '[]'::jsonb);

  if v_actor is not null then
    select jsonb_build_object('enrollment_id', e.id, 'status', e.status)
      into v_individual
      from public.journey_enrollments e
     where e.journey_id = p_journey_id and e.group_id = v_actor
       and e.status <> 'withdrawn';   -- Q1: a withdrawn enrolment is history, not standing

    v_enrolled_via := coalesce(
      (select jsonb_agg(jsonb_build_object(
                'group_id', g.id,
                'group_name', g.name,
                'enrollment_id', e.id,
                'status', e.status,
                'can_withdraw', coalesce(
                  public.has_permission(v_actor, g.id, 'unenroll_from_journey'), false))
              order by g.name asc)
         from public.journey_enrollments e
         join public.groups g on g.id = e.group_id
         join public.group_memberships gm
           on gm.group_id = e.group_id
          and gm.member_group_id = v_actor
          and gm.status = 'active'
        where e.journey_id = p_journey_id
          and e.group_id <> v_actor
          and e.status <> 'withdrawn'),   -- Q1 exclusion
      '[]'::jsonb);

    v_enrollable := coalesce(
      (select jsonb_agg(jsonb_build_object('group_id', g.id, 'group_name', g.name)
              order by g.name asc)
         from public.groups g
         join public.group_memberships gm
           on gm.group_id = g.id
          and gm.member_group_id = v_actor
          and gm.status = 'active'
        where g.group_type = 'engagement'
          and g.status = 'active'
          and coalesce(public.has_permission(v_actor, g.id, 'enroll_group_in_journey'), false)),
      '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'id', v_journey.id,
    'title', v_journey.title,
    'description', v_journey.description,
    'difficulty_level', v_journey.difficulty_level,
    'estimated_duration_minutes', v_journey.estimated_duration_minutes,
    'tags', to_jsonb(coalesce(v_journey.tags, '{}'::text[])),
    'step_count', jsonb_array_length(v_steps),
    'steps', v_steps,
    'is_enrolled_individually', v_individual is not null,
    'individual_enrollment', v_individual,
    'enrolled_via', v_enrolled_via,
    'enrollable_groups', v_enrollable);
end;
$$;

comment on function public.get_journey_detail(uuid) is
  'FEAT-PD002 STORY-2 (amended 2026-07-07; re-pointed + withdrawn-excluded by FEAT-PD003): one journey whole, viewer-shaped incl. withdraw handles. Steps from rows (kind = registry key), never content payloads. P0002 no-existence-leak. SECURITY DEFINER: viewer block joins memberships + permission resolution across RLS.';


-- ----------------------------------------------------------------------------
-- 6. journey_step_instances (ADR-U044 §4). THE progress grain: one row per
--    traveller per step engagement. created_at = engagement; completed_at =
--    passage. A repeat (repeatable steps) is a NEW row, never an update; a
--    skip is recorded absence (derivable). Developmental personal data —
--    DS-3 invariants 4 + 8 enforced HERE: contract-only access, traveller-own
--    reads via get_player_state, no comparative surface anywhere. Steward /
--    Guide consent-gated reads arrive as J-D contracts over this same table.
--    on delete restrict on step_id protects lived records from authoring
--    deletions (authoring is out of scope, ADR-U026); enrolment deletion
--    (ADR-U031 erasure / GDPR) CASCADES — forgetting must forget.
--    Direct caller (incl. anonymous-session Mist): nothing.
-- ----------------------------------------------------------------------------
create table public.journey_step_instances (
  id                  uuid primary key default gen_random_uuid(),
  enrollment_id       uuid not null references public.journey_enrollments(id) on delete cascade,
  traveller_group_id  uuid not null references public.groups(id) on delete cascade,
  step_id             uuid not null references public.journey_steps(id) on delete restrict,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

comment on table public.journey_step_instances is
  'ADR-U044 §4 / FEAT-PD003: per-traveller step-instances — the progress grain (enrolment x traveller personal group x step). Developmental personal data; invariants 4+8 (private by default, never comparative) enforced by contract-only access. Erasure cascades from the enrolment (ADR-U031). Direct caller: nothing.';

create unique index uq_step_instance_open
  on public.journey_step_instances (enrollment_id, traveller_group_id, step_id)
  where completed_at is null;

create index idx_step_instances_traveller
  on public.journey_step_instances (enrollment_id, traveller_group_id);

alter table public.journey_step_instances enable row level security;
revoke all on table public.journey_step_instances from anon, authenticated;

-- Q5: progress_data demotes — the new contracts never write it.
comment on column public.journey_enrollments.progress_data is
  'DEPRECATED as authoritative progress (ADR-U044 / FEAT-PD003): the per-traveller grain lives in journey_step_instances. Retained for the PC013/PC014 freeze-cascade metadata (frozen_reason) and legacy summaries; no new writer.';


-- ----------------------------------------------------------------------------
-- 7. Q1 — the withdraw revisit. 'withdrawn' becomes a terminal lifecycle
--    status (a state, not an extensible vocabulary — the CHECK stays honest);
--    withdraw_from_journey flips status instead of deleting, so step-instances
--    survive as lived history. uq_journey_enrollments_active_party scopes
--    status='active' (verified), so re-enrolment after withdrawal works at
--    the index layer; the enrol-path blocking checks below are re-issued to
--    exclude 'withdrawn' (and ONLY 'withdrawn' — a completed enrolment still
--    blocks re-enrolment, exactly as at J-A).
-- ----------------------------------------------------------------------------
alter table public.journey_enrollments
  drop constraint journey_enrollments_status_check;
alter table public.journey_enrollments
  add constraint journey_enrollments_status_check
  check (status in ('active', 'completed', 'paused', 'frozen', 'withdrawn'));

create or replace function public.withdraw_from_journey(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_enr public.journey_enrollments%rowtype;
  v_visible boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'withdrawal is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is not null then
    v_visible := (v_enr.group_id = v_actor) or exists (
      select 1 from public.group_memberships gm
       where gm.group_id = v_enr.group_id
         and gm.member_group_id = v_actor
         and gm.status = 'active');
  end if;
  if v_enr.id is null or not v_visible then
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;

  if v_enr.status = 'frozen' then
    raise exception 'enrollment is frozen' using errcode = 'P0001';
  end if;
  -- FEAT-PD003 Q1: repeat withdrawal is a refusal, not a churned no-op.
  if v_enr.status = 'withdrawn' then
    raise exception 'already withdrawn' using errcode = 'P0001';
  end if;

  if v_enr.group_id <> v_actor then
    if not coalesce(public.has_permission(v_actor, v_enr.group_id,
                                          'unenroll_from_journey'), false) then
      raise exception 'not permitted to withdraw this group' using errcode = '42501';
    end if;
  end if;

  -- FEAT-PD003 Q1: terminal status instead of row deletion — step-instances
  -- (lived developmental history) survive; ADR-U031 erasure still deletes
  -- the row and cascades.
  update public.journey_enrollments
     set status = 'withdrawn',
         status_changed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'journey_id', v_enr.journey_id,
    'group_id', v_enr.group_id,
    'withdrawn', true);
end;
$$;

comment on function public.withdraw_from_journey(uuid) is
  'FEAT-PD002 STORY-5, amended by FEAT-PD003 (Q1 revisit): withdrawal is a terminal ''withdrawn'' status, never deletion — step-instances survive as lived history; frozen refuses; repeat withdrawal refuses (P0001). Group withdrawal rides the unenroll_from_journey key. SECURITY DEFINER: updates the narrowed table.';

-- Q1 consequence: the two enrol paths must not treat a withdrawn row as
-- standing. Re-issued in place; the ONLY deltas are the labelled status
-- filters (and enroll_self's dual-enrolment probe gaining the same filter).
create or replace function public.enroll_self_in_journey(
  p_journey_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_journey public.journeys%rowtype;
  v_enrollment_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    -- [ADR-U045 disposition] replaced in place at J-E: a Mist may enrol iff
    -- p_journey_id is the designated onboarding journey.
    raise exception 'self-enrolment is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_journey.created_by_group_id,
                                        'enroll_self_in_journey'), false) then
    raise exception 'not permitted to enroll in this journey' using errcode = '42501';
  end if;

  if exists (select 1 from public.journey_enrollments e
              where e.journey_id = p_journey_id and e.group_id = v_actor
                and e.status <> 'withdrawn') then   -- FEAT-PD003 Q1 delta
    raise exception 'already enrolled in this journey' using errcode = 'P0001';
  end if;

  -- Oracle B-JRN-003 (Open Q2): one-directional dual-enrollment refusal —
  -- an active via-group enrolment blocks self-enrolment.
  if exists (select 1
               from public.journey_enrollments e
               join public.group_memberships gm
                 on gm.group_id = e.group_id
                and gm.member_group_id = v_actor
                and gm.status = 'active'
              where e.journey_id = p_journey_id
                and e.group_id <> v_actor
                and e.status <> 'withdrawn') then   -- FEAT-PD003 Q1 delta
    raise exception 'already enrolled in this journey via a group' using errcode = 'P0001';
  end if;

  insert into public.journey_enrollments
    (journey_id, group_id, enrolled_by_group_id, status, progress_data)
  values
    (p_journey_id, v_actor, v_actor, 'active', '{}'::jsonb)
  returning id into v_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'journey_id', p_journey_id,
    'group_id', v_actor,
    'status', 'active',
    'progress_data', '{}'::jsonb);
end;
$$;

comment on function public.enroll_self_in_journey(uuid) is
  'FEAT-PD002 STORY-3 (JRN-3), Q1-amended by FEAT-PD003: withdrawn rows do not block re-enrolment (completed/paused/frozen still do). FIM-only at J-A; ADR-U045 tags the J-E in-place replacement. SECURITY DEFINER: writes the narrowed journey_enrollments.';

create or replace function public.enroll_group_in_journey(
  p_group_id uuid,
  p_journey_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_journey public.journeys%rowtype;
  v_group public.groups%rowtype;
  v_enrollment_id uuid;
  v_member record;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group enrolment is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  if v_group.id is null or not public._journey_party_visible(v_actor, p_group_id) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id,
                                        'enroll_group_in_journey'), false) then
    raise exception 'not permitted to enroll this group' using errcode = '42501';
  end if;

  if v_group.status <> 'active' then
    raise exception 'group is not active' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.journey_enrollments e
              where e.journey_id = p_journey_id and e.group_id = p_group_id
                and e.status <> 'withdrawn') then   -- FEAT-PD003 Q1 delta
    raise exception 'group already enrolled in this journey' using errcode = 'P0001';
  end if;

  insert into public.journey_enrollments
    (journey_id, group_id, enrolled_by_group_id, status, progress_data)
  values
    (p_journey_id, p_group_id, v_actor, 'active', '{}'::jsonb)
  returning id into v_enrollment_id;

  -- Q5: durable fan-out to ACTIVE members, actor excluded, member group
  -- existence guarded (the notify_group_deleted precedent).
  for v_member in
    select gm.member_group_id
      from public.group_memberships gm
     where gm.group_id = p_group_id
       and gm.status = 'active'
       and gm.member_group_id <> v_actor
  loop
    if exists (select 1 from public.groups where id = v_member.member_group_id) then
      insert into public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      values
        (v_member.member_group_id,
         'group_journey_enrollment',
         'Your group enrolled in a journey',
         'The group "' || v_group.name || '" has been enrolled in the journey "'
           || v_journey.title || '".',
         jsonb_build_object(
           'group_id', p_group_id,
           'group_name', v_group.name,
           'journey_id', p_journey_id,
           'journey_title', v_journey.title,
           'enrolled_by_group_id', v_actor),
         p_group_id);
    end if;
  end loop;

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'journey_id', p_journey_id,
    'group_id', p_group_id,
    'status', 'active');
end;
$$;

comment on function public.enroll_group_in_journey(uuid, uuid) is
  'FEAT-PD002 STORY-4 (JRN-4), Q1-amended by FEAT-PD003: withdrawn rows do not block re-enrolment. Wielding rides the enroll_group_in_journey key; durable V3 rows to active members. SECURITY DEFINER: writes the narrowed journey_enrollments + notifications.';

-- Q1 consequence: my-journeys lists standing, not history.
create or replace function public.get_my_enrollments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  return coalesce(
    (select jsonb_agg(t.entry order by t.enrolled_at desc, t.entry_id asc)
       from (
         select e.id as entry_id, e.enrolled_at,
                jsonb_build_object(
                  'enrollment_id', e.id,
                  'kind', 'individual',
                  'journey_id', e.journey_id,
                  'journey_title', j.title,
                  'status', e.status,
                  'last_accessed_at', e.last_accessed_at) as entry
           from public.journey_enrollments e
           join public.journeys j on j.id = e.journey_id
          where e.group_id = v_actor
            and e.status <> 'withdrawn'   -- FEAT-PD003 Q1 delta
         union all
         select e.id as entry_id, e.enrolled_at,
                jsonb_build_object(
                  'enrollment_id', e.id,
                  'kind', 'via_group',
                  'journey_id', e.journey_id,
                  'journey_title', j.title,
                  'status', e.status,
                  'last_accessed_at', e.last_accessed_at,
                  'group_id', g.id,
                  'group_name', g.name) as entry
           from public.journey_enrollments e
           join public.journeys j on j.id = e.journey_id
           join public.groups g on g.id = e.group_id
           join public.group_memberships gm
             on gm.group_id = e.group_id
            and gm.member_group_id = v_actor
            and gm.status = 'active'
          where e.group_id <> v_actor
            and e.status <> 'withdrawn'   -- FEAT-PD003 Q1 delta
       ) t),
    '[]'::jsonb);
end;
$$;

comment on function public.get_my_enrollments() is
  'FEAT-PD002 STORY-1, Q1-amended by FEAT-PD003 (withdrawn excluded — history, not standing): the caller''s own travel, kind-marked. The player''s entry list. SECURITY DEFINER: joins memberships across RLS.';


-- ----------------------------------------------------------------------------
-- 8. The player contracts (STORY-4/5/6). Traveller standing = the enrolment's
--    party is the actor's personal group (solo) OR the actor is an active
--    member of the party group. Deliberately NOT FIM-only: at J-E (ADR-U045)
--    a Mist walks the designated onboarding journey through these same
--    contracts — nothing to replace. Q7 role gating: complete_journey_step
--    checks the party group's complete_journey_activities key for via-group
--    travellers (an Observer watches, never completes); solo walks are
--    ungated beyond standing (no role distinction exists on a personal
--    group). enter_journey_step is ungated beyond standing (engagement =
--    viewing; view_journey_content-level).
--    Internal helper first (the _journey_party_visible precedent):
--    service-role only, never a caller surface.
-- ----------------------------------------------------------------------------
create or replace function public._enrollment_traveller_standing(
  p_actor uuid,
  p_enrollment_id uuid
) returns public.journey_enrollments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enr public.journey_enrollments%rowtype;
  v_is_traveller boolean := false;
begin
  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is not null and p_actor is not null then
    v_is_traveller := (v_enr.group_id = p_actor) or exists (
      select 1 from public.group_memberships gm
       where gm.group_id = v_enr.group_id
         and gm.member_group_id = p_actor
         and gm.status = 'active');
  end if;

  if v_enr.id is null or not v_is_traveller then
    -- Existence is not revealed to non-travellers (the withdraw P0002 mirror).
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;

  return v_enr;
end;
$$;

comment on function public._enrollment_traveller_standing(uuid, uuid) is
  'FEAT-PD003 internal helper: resolves an enrolment iff the actor is a traveller on it (own party or active member of the party group); P0002 otherwise, existence never revealed. Service-role only — the player contracts'' shared gate.';

revoke all on function public._enrollment_traveller_standing(uuid, uuid) from public, anon, authenticated;
grant execute on function public._enrollment_traveller_standing(uuid, uuid) to service_role;

create or replace function public.get_player_state(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_journey public.journeys%rowtype;
  v_steps jsonb;
  v_instances jsonb;
  v_resume uuid;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

  -- Full step rows INCLUDING content payloads — the traveller is enrolled;
  -- this is the one read designed to boot the player in a single round trip.
  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'id', st.id,
              'step_order', st.step_order,
              'title', st.title,
              'kind', st.step_kind_key,
              'family', st.content_family_key,
              'ask_verb', k.ask_verb,
              'required', st.required,
              'repeatable', st.repeatable,
              'duration_minutes', st.duration_minutes,
              'content', st.content)
            order by st.step_order)
       from public.journey_steps st
       join public.step_kinds k on k.key = st.step_kind_key
      where st.journey_id = v_enr.journey_id),
    '[]'::jsonb);

  -- The CALLER's instances only (invariant 4: traveller-own; J-D adds the
  -- consent-gated Steward/Guide reads as separate contracts).
  v_instances := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'instance_id', i.id,
              'step_id', i.step_id,
              'created_at', i.created_at,
              'completed_at', i.completed_at)
            order by i.created_at asc, i.id asc)
       from public.journey_step_instances i
      where i.enrollment_id = p_enrollment_id
        and i.traveller_group_id = v_actor),
    '[]'::jsonb);

  -- Q6 resume pointer: latest open engagement, else the first step lacking a
  -- completed instance, else the last step.
  select i.step_id into v_resume
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.completed_at is null
   order by i.created_at desc, i.id desc
   limit 1;
  if v_resume is null then
    select st.id into v_resume
      from public.journey_steps st
     where st.journey_id = v_enr.journey_id
       and not exists (select 1 from public.journey_step_instances i
                        where i.enrollment_id = p_enrollment_id
                          and i.traveller_group_id = v_actor
                          and i.step_id = st.id
                          and i.completed_at is not null)
     order by st.step_order asc
     limit 1;
  end if;
  if v_resume is null then
    select st.id into v_resume
      from public.journey_steps st
     where st.journey_id = v_enr.journey_id
     order by st.step_order desc
     limit 1;
  end if;

  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'status', v_enr.status,
    'sequencing_mode', v_journey.sequencing_mode,
    'journey', jsonb_build_object(
      'id', v_journey.id,
      'title', v_journey.title,
      'description', v_journey.description),
    'steps', v_steps,
    'instances', v_instances,
    'resume_step_id', v_resume);
end;
$$;

comment on function public.get_player_state(uuid) is
  'FEAT-PD003 STORY-4 (JRN-6/10 platform half): the single-round-trip player boot — journey meta, ordered steps WITH content payloads + kind metadata, the caller''s own instances (invariant 4), the Q6 resume pointer, the enrolment status (frozen/completed render honest states Surface-side). Traveller standing only; Mist-compatible by design (ADR-U045 J-E). SECURITY DEFINER: reads contract-only tables.';

revoke all on function public.get_player_state(uuid) from public, anon;
grant execute on function public.get_player_state(uuid) to authenticated;

create or replace function public.enter_journey_step(
  p_enrollment_id uuid,
  p_step_id uuid
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
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  if v_enr.status <> 'active' then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- The open instance IS the engagement — never duplicated.
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  if v_inst.id is null then
    if exists (select 1 from public.journey_step_instances i
                where i.enrollment_id = p_enrollment_id
                  and i.traveller_group_id = v_actor
                  and i.step_id = p_step_id
                  and i.completed_at is not null)
       and not v_step.repeatable then
      -- Review of a completed, non-repeatable step: no new lived record.
      select * into v_inst
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = p_step_id
       order by i.completed_at desc limit 1;
    else
      -- First engagement — or a repeat of a repeatable step (a NEW instance,
      -- never an update: ADR-U044 §4).
      insert into public.journey_step_instances
        (enrollment_id, traveller_group_id, step_id)
      values (p_enrollment_id, v_actor, p_step_id)
      returning * into v_inst;
    end if;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'created_at', v_inst.created_at,
    'completed_at', v_inst.completed_at);
end;
$$;

comment on function public.enter_journey_step(uuid, uuid) is
  'FEAT-PD003 STORY-5 (JRN-9 platform half): records engagement — the auto-save write. Open instance = the engagement (no duplicates); repeat of a repeatable step = a new instance; review of a completed non-repeatable step records nothing new. Touches last_accessed_at. Traveller standing; active enrolments only. SECURITY DEFINER: writes the contract-only instances table.';

revoke all on function public.enter_journey_step(uuid, uuid) from public, anon;
grant execute on function public.enter_journey_step(uuid, uuid) to authenticated;

create or replace function public.complete_journey_step(
  p_enrollment_id uuid,
  p_step_id uuid
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
  v_journey_mode text;
  v_inst public.journey_step_instances%rowtype;
  v_blocking int;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  if v_enr.status <> 'active' then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- Q7: via-group travellers complete under the party group's key (an
  -- Observer watches, never completes); solo walks carry no role distinction.
  if v_enr.group_id <> v_actor then
    if not coalesce(public.has_permission(v_actor, v_enr.group_id,
                                          'complete_journey_activities'), false) then
      raise exception 'not permitted to complete steps in this group''s journey'
        using errcode = '42501';
    end if;
  end if;

  -- JRN-8 gating (linear — the only exercised mode; other modes are forward
  -- shape and currently gate identically, deliberately conservative).
  select count(*) into v_blocking
    from public.journey_steps st
   where st.journey_id = v_enr.journey_id
     and st.required = true
     and st.step_order < v_step.step_order
     and not exists (select 1 from public.journey_step_instances i
                      where i.enrollment_id = p_enrollment_id
                        and i.traveller_group_id = v_actor
                        and i.step_id = st.id
                        and i.completed_at is not null);
  if v_blocking > 0 then
    raise exception 'required predecessor incomplete' using errcode = 'P0001';
  end if;

  -- Idempotent completion (oracle B-JRN completion idempotency).
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  if v_inst.id is not null then
    update public.journey_step_instances
       set completed_at = now()
     where id = v_inst.id
     returning * into v_inst;
  else
    select * into v_inst
      from public.journey_step_instances i
     where i.enrollment_id = p_enrollment_id
       and i.traveller_group_id = v_actor
       and i.step_id = p_step_id
       and i.completed_at is not null
     order by i.completed_at desc limit 1;

    if v_inst.id is null then
      -- No prior enter: create-and-complete in one call.
      insert into public.journey_step_instances
        (enrollment_id, traveller_group_id, step_id, completed_at)
      values (p_enrollment_id, v_actor, p_step_id, now())
      returning * into v_inst;
    end if;
    -- else: already completed — return the existing record unchanged.
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'created_at', v_inst.created_at,
    'completed_at', v_inst.completed_at);
end;
$$;

comment on function public.complete_journey_step(uuid, uuid) is
  'FEAT-PD003 STORY-6 (JRN-8 platform half): stamps passage once (idempotent — a repeat returns the existing record); required-predecessor gating (P0001); create-and-complete when no prior enter; Q7 via-group completion rides complete_journey_activities. Journey-level completion detection is J-C — this never flips enrolment status. SECURITY DEFINER: writes the contract-only instances table.';

revoke all on function public.complete_journey_step(uuid, uuid) from public, anon;
grant execute on function public.complete_journey_step(uuid, uuid) to authenticated;
