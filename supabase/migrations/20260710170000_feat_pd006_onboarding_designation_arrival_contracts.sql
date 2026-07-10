-- ============================================================================
-- FEAT-PD006 — Onboarding designation, the Mist-scoped enrolment gate, and
-- first-arrival contracts (ADR-U045 + Amendment 1 realized; ADR-U046 §4 home).
--
-- Cycle J-E, TASK-JE-01. Schema-gate migration:
--   1. journeys.is_onboarding_designated (boolean, default false) + the
--      single-designation PARTIAL UNIQUE INDEX — "exactly one onboarding
--      journey" lives in the database, never in application code (JE-1).
--   2. journeys.takeaway (nullable jsonb) — the journey-level closing word
--      (ADR-U046 §4). pending-DS-4: these fields migrate with the content
--      when DS-4 externalises. Needed because the PD003 conversion NULLs
--      journeys.content, so a journey-level takeaway has nowhere else to
--      live; per-step takeaways ride journey_steps.content (JE-2).
--   3. enroll_self_in_journey REPLACED IN PLACE (the ADR-U045 disposition
--      tagged in 20260707213500): a Mist may enrol iff the journey is the
--      designated onboarding journey — on that branch the has_permission
--      gate is bypassed (the designation IS the authorization; a Mist holds
--      no permission anywhere). The FIM path keeps both gates (Tier-1
--      context-free 'enroll_self_in_journey' via FringeIsland Members).
--      The visibility disjunction admits the designated journey for every
--      resolvable actor — the front door is unavoidable-but-unwalled
--      (Amendment 1): is_public=false keeps it out of browse, not out of
--      reach. All other semantics (duplicate refusal, dual-enrolment
--      refusal, withdrawn-row reactivation, personal-group party) verbatim.
--   4. get_onboarding_status() — the single first-arrival read (JE-3):
--      {onboarding_journey_id, has_enrollment, has_completed}. Mist-callable
--      (granted to authenticated); an actorless session is refused 42501,
--      never a silent empty. NO opted_out field — enrolment-absence is the
--      whole first-arrival signal (Amendment 1: no opt-out store).
--
-- RLS impact: none — no policy changes; both new columns ride the existing
-- journeys SELECT policy (authored content, not private data). Writes to
-- journeys stay impossible for authenticated (no write policy) — designation
-- is seed/migration-defined until Journey Studio (ADR-U026).
-- SECURITY DEFINER: both functions below; narrow purpose, search_path = ''.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1+2. Designation + takeaway columns
-- ----------------------------------------------------------------------------

alter table public.journeys
  add column is_onboarding_designated boolean not null default false;

comment on column public.journeys.is_onboarding_designated is
  'ADR-U045 (FEAT-PD006): marks THE onboarding journey — the one journey a '
  'Mist may walk, auto-launched at first arrival. A boolean, not a vocabulary '
  '(nothing to seal); the partial unique index guarantees at most one.';

alter table public.journeys
  add column takeaway jsonb;

comment on column public.journeys.takeaway is
  'ADR-U046 §4 (FEAT-PD006): the journey-level authored closing word, '
  'pending-DS-4 (migrates when DS-4 externalises content). Rendered at J-F; '
  'seeded here. Free-form JSONB — {body: text} today.';

-- The "exactly one" rule, at the substrate (JE-1). Single source of truth —
-- deliberately NOT re-enforced in application code (belt-and-suspenders that
-- can disagree; see the spec's rabbit holes).
create unique index uq_journeys_single_onboarding_designation
  on public.journeys (is_onboarding_designated)
  where is_onboarding_designated;

-- ----------------------------------------------------------------------------
-- 3. enroll_self_in_journey — replaced in place (grants preserved by
--    CREATE OR REPLACE; the PD002 grant block 20260707130821:763-765 stands:
--    authenticated + service_role, revoked from public/anon).
-- ----------------------------------------------------------------------------

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
  v_is_mist_onboarding boolean := false;
  v_onboarding_id uuid;
  v_journey public.journeys%rowtype;
  v_withdrawn public.journey_enrollments%rowtype;
  v_enrollment_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null then
    raise exception 'self-enrolment requires a resolvable actor' using errcode = '42501';
  end if;
  if v_is_temporary is distinct from false then
    -- ADR-U045 realized (FEAT-PD006): a Mist may enrol iff p_journey_id is
    -- the designated onboarding journey. The designation IS the authorization
    -- on this branch — a Mist holds no permission in any owning group, so the
    -- has_permission gate below is bypassed for exactly this case and no
    -- other. Everywhere else the FIM-only refusal stands unchanged.
    select j.id into v_onboarding_id
      from public.journeys j
     where j.is_onboarding_designated
     limit 1;
    if v_onboarding_id is null or p_journey_id <> v_onboarding_id then
      raise exception 'self-enrolment is FIM-only outside the onboarding journey'
        using errcode = '42501';
    end if;
    v_is_mist_onboarding := true;
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Visibility: the designated onboarding journey is admitted for every
  -- resolvable actor (the unavoidable-but-unwalled front door, ADR-U045
  -- Amendment 1) — is_public=false keeps it out of the browse catalogue,
  -- never out of reach at the door itself.
  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or j.is_onboarding_designated
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  -- The permission gate — bypassed ONLY on the Mist+designated branch above;
  -- a FIM keeps both gates on every journey, onboarding included (Tier-1
  -- system-group grant resolves it context-free for every FIM).
  if not v_is_mist_onboarding then
    if not coalesce(public.has_permission(v_actor, v_journey.created_by_group_id,
                                          'enroll_self_in_journey'), false) then
      raise exception 'not permitted to enroll in this journey' using errcode = '42501';
    end if;
  end if;

  if exists (select 1 from public.journey_enrollments e
              where e.journey_id = p_journey_id and e.group_id = v_actor
                and e.status <> 'withdrawn') then
    raise exception 'already enrolled in this journey' using errcode = 'P0001';
  end if;

  -- Oracle B-JRN-003 (Open Q2): one-directional dual-enrollment refusal —
  -- an active via-group enrolment blocks self-enrolment (reactivation included).
  if exists (select 1
               from public.journey_enrollments e
               join public.group_memberships gm
                 on gm.group_id = e.group_id
                and gm.member_group_id = v_actor
                and gm.status = 'active'
              where e.journey_id = p_journey_id
                and e.group_id <> v_actor
                and e.status <> 'withdrawn') then
    raise exception 'already enrolled in this journey via a group' using errcode = 'P0001';
  end if;

  -- Q1 addendum: a prior withdrawn walk reactivates — same row, same
  -- step-instances, the traveller resumes where they genuinely were.
  select * into v_withdrawn
    from public.journey_enrollments e
   where e.journey_id = p_journey_id and e.group_id = v_actor
     and e.status = 'withdrawn'
   order by e.status_changed_at desc, e.id desc
   limit 1;

  if v_withdrawn.id is not null then
    update public.journey_enrollments
       set status = 'active',
           status_changed_at = now(),
           enrolled_by_group_id = v_actor
     where id = v_withdrawn.id;

    return jsonb_build_object(
      'enrollment_id', v_withdrawn.id,
      'journey_id', p_journey_id,
      'group_id', v_actor,
      'status', 'active',
      'progress_data', v_withdrawn.progress_data);
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
  'FEAT-PD006 (ADR-U045): self-enrolment with the Mist-scoped onboarding gate '
  '— a FIM enrols in any visible published journey (both gates); a Mist '
  'enrols iff the journey is the designated onboarding journey (designation '
  'is the authorization; permission gate bypassed on exactly that branch). '
  'Duplicate refusal, dual-enrolment refusal, and withdrawn-row reactivation '
  'carried verbatim from the PD003 Q1 amendment.';

-- ----------------------------------------------------------------------------
-- 4. get_onboarding_status() — the single first-arrival read (JE-3)
-- ----------------------------------------------------------------------------

create or replace function public.get_onboarding_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_journey_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    -- Actorless sessions are refused honestly — never a silent empty.
    raise exception 'onboarding status requires a resolvable actor' using errcode = '42501';
  end if;

  select j.id into v_journey_id
    from public.journeys j
   where j.is_onboarding_designated
   limit 1;

  if v_journey_id is null then
    -- Defensive: nothing designated — the Surface auto-launches nothing.
    return jsonb_build_object(
      'onboarding_journey_id', null,
      'has_enrollment', false,
      'has_completed', false);
  end if;

  return jsonb_build_object(
    'onboarding_journey_id', v_journey_id,
    -- Any enrolment ever — active, completed, withdrawn — counts as "has
    -- arrived once" (is_enrolled_in_journey carries no status filter, by
    -- design). No opted_out field exists (ADR-U045 Amendment 1).
    'has_enrollment', public.is_enrolled_in_journey(v_journey_id),
    'has_completed', exists (
      select 1
        from public.journey_enrollments e
       where e.journey_id = v_journey_id
         and e.group_id = v_actor
         and e.status = 'completed'));
end;
$$;

comment on function public.get_onboarding_status() is
  'FEAT-PD006 (ADR-U045 Amendment 1): the single first-arrival read — '
  '{onboarding_journey_id, has_enrollment, has_completed}. Mist-callable; '
  'enrolment-absence is the whole first-arrival signal (no opt-out store). '
  'Actorless sessions get 42501, never a silent empty.';

revoke all on function public.get_onboarding_status() from public;
revoke all on function public.get_onboarding_status() from anon;
grant execute on function public.get_onboarding_status() to authenticated, service_role;
