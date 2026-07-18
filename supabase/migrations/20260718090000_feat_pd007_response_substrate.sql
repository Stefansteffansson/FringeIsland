-- ============================================================================
-- FEAT-PD007 (Cycle J-F) — the response substrate: three additive columns +
-- the registry seed. *** HELD AT THE SCHEMA GATE — apply only after the nod. ***
-- TASK-JF-01. Decomposition defaults JF-1/JF-2 realized (ADR-U046):
--
--   1. journey_step_instances.response jsonb (nullable) — the traveller's
--      words on the lived record (ADR-U044 §4 realized). NULL = never
--      responded; {body: text} by convention, not constraint (free-form JSONB,
--      open to structured capture by future step kinds — nothing sealed).
--   2. journey_step_instances.response_updated_at timestamptz (nullable) —
--      when the words were last touched (stamps on every effective write,
--      the retraction clear included).
--   3. step_kinds.captures_response boolean NOT NULL DEFAULT false — the
--      capture set as registry data, never a code list (ADR-U044 registry
--      pattern; ADR-U008/U018 non-closure). Seeded true for the four
--      Ask-verbed kinds; extension kinds choose for themselves at INSERT.
--
-- NO new table (ADR-U046 rejected option C — the grain exists), no RLS
-- change (the table stays contract-only: RLS enabled, zero policies, zero
-- grants), no change to the uq_step_instance_open grain or any existing
-- column. Everything the lived record already has comes free: traveller-own
-- contract scoping, transcendence carry-over (personal-group-keyed rows,
-- finalise_transcendence), ADR-U031 forgetting via the enrolment cascade.
--
-- Direct-caller question (ADR-U038), asked of this touch: a direct PostgREST
-- caller (incl. an anonymous-session Mist holding `authenticated`) can do
-- NOTHING with the new columns — the table has no policies and no grants, so
-- response content is neither readable nor writable around the PD007 verbs.
-- ============================================================================

alter table public.journey_step_instances
  add column response jsonb;

comment on column public.journey_step_instances.response is
  'ADR-U046 / FEAT-PD007 (JF-1): the traveller''s words on the lived record. '
  'NULL = never responded (or retracted — the empty-save clear); {body: text} '
  'by convention, not constraint. The most personal data in the system: '
  'private-only (readable by exactly the traveller who wrote it), erased with '
  'the enrolment cascade (ADR-U031), exported under right-of-access '
  '(get_own_step_instances_export). Written only by save_step_response.';

alter table public.journey_step_instances
  add column response_updated_at timestamptz;

comment on column public.journey_step_instances.response_updated_at is
  'FEAT-PD007 (JF-1): when the response was last touched — stamps on every '
  'effective write, including the retraction clear (the record keeps the '
  'passage and the moment, never the retracted words).';

alter table public.step_kinds
  add column captures_response boolean not null default false;

comment on column public.step_kinds.captures_response is
  'ADR-U046 / FEAT-PD007 (JF-2): whether steps of this kind invite a written '
  'response — the capture set as registry data, never a Surface code list '
  '(non-closure, ADR-U008/U018). Places the capture affordance; deliberately '
  'NOT a write guard (a traveller''s words are storable on any step of their '
  'own walk). Extension kinds choose for themselves at INSERT.';

-- The registry seed (JF-2): the four Ask-verbed kinds capture; the
-- receipt/action marks (narrative, activity, checklist) keep the default.
update public.step_kinds
   set captures_response = true
 where key in ('reflection', 'assessment', 'choice', 'journal');

-- ----------------------------------------------------------------------------
-- Verification (count-agnostic on the open registry: named keys only).
-- ----------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'journey_step_instances'
       and column_name = 'response' and data_type = 'jsonb' and is_nullable = 'YES'),
    'PD007: journey_step_instances.response missing or mis-typed';
  assert exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'journey_step_instances'
       and column_name = 'response_updated_at' and is_nullable = 'YES'),
    'PD007: journey_step_instances.response_updated_at missing';
  assert (select count(*) from public.step_kinds
           where key in ('reflection','assessment','choice','journal')
             and captures_response) = 4,
    'PD007: the four Ask-verbed kinds are not all seeded captures_response=true';
  assert (select count(*) from public.step_kinds
           where key in ('narrative','activity','checklist')
             and not captures_response) = 3,
    'PD007: a receipt/action kind was wrongly seeded captures_response=true';
  assert exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'uq_step_instance_open'),
    'PD007: uq_step_instance_open grain lost';
  assert (select count(*) from pg_policies
           where schemaname = 'public' and tablename = 'journey_step_instances') = 0,
    'PD007: journey_step_instances gained a policy — contract-only posture broken';
end $$;
