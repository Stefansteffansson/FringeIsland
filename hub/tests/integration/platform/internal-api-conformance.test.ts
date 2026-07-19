import { describe, it, expect, jest } from '@jest/globals';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(60_000); // real-substrate suite: one Management-API catalog query

/**
 * W3 — Internal-API inversion conformance gate (Cycle COR-A, ADR-U047).
 *
 * WRITTEN RED-FIRST. This is the permanent regression gate the 2026-07-02 retro
 * showed we were missing: it queries the LIVE catalog (`pg_proc`) and asserts
 * the anatomy's inner-ring direction rule mechanically — Platform Core is
 * domain-agnostic, so no Core object may name a DS-owned table.
 *
 * ADR-U047 rule 3 (the boundary rule this test enforces, verbatim):
 *   "core may invoke ds*_lifecycle_* functions and nothing else domain-side.
 *    No PC-owned function, trigger, or policy may reference a DS-owned table.
 *    Any function referencing DS tables must itself be DS-owned (explicit
 *    allowlist in the conformance test)."
 *
 * State at authoring (2026-07-19): RED. The COR-A W4/W5 relocation migration
 * has not landed, so the ten Core lifecycle functions still author DS-3
 * dispositions inline. When that migration lands (Core calls the four
 * ds3_lifecycle_* handlers instead of naming journeys/journey_enrollments), all
 * ten drop out and this test goes GREEN — and stays green forever as the gate.
 *
 * The tenth site — admin_hard_delete_user — was found by THIS gate during W4
 * (it reassigns journeys/journey_enrollments to the [Deleted User] sentinel);
 * the audit's AC-1 "nine" missed it. The migration relocates it too (ADR-U047
 * Amendment 1's fourth fact ds3_lifecycle_user_hard_deleted). No allowlist
 * exception ships — a standing exception is the "satisfied-now" pattern COR-A ends.
 *
 * ── Scope & sources ────────────────────────────────────────────────────────
 * DS-owned tables — audit Appendix B (ANATOMY-CONFORMANCE-AUDIT.md):
 *   journeys, journey_enrollments, journey_steps, journey_step_instances,
 *   step_kinds, content_families, journal_entries.
 * DS-owned function allowlist — the DS-3 Journeys + DS-7 Journal functions from
 *   the audit's ownership map (Appendix A route inventory + Appendix C code map;
 *   each name's DS ownership re-confirmed 2026-07-19 against its defining
 *   migration — the `feat_pd00x_*` domain migrations and `feat_pd001_journal_*`),
 *   PLUS any name matching /^ds\d+_lifecycle_/ (the ADR-U047 lifecycle-fact
 *   handlers themselves — DS-owned by the naming convention rule 1).
 *
 * ── Matching ───────────────────────────────────────────────────────────────
 * Source = `pg_proc.prosrc` (the function BODY; COMMENT ON text lives in
 * pg_description, not prosrc, so it is already out of scope). We strip block
 * (/* *​/) and line (--) comments so a table named only in a code comment is not
 * a false hit, then word-boundary-match each DS table both schema-qualified and
 * bare: /\b(?:public\.)?<table>\b/i. With `search_path=''` every real reference
 * is schema-qualified, so schema-qualified matching alone is sufficient; the
 * bare arm is future-proofing. Word boundaries keep `v_journeys` (a variable)
 * and `'journeys_transferred'`/`'journey_count'` (jsonb keys) from matching.
 * CAVEAT (conservative): a `--`/`/* *​/` sequence *inside a string literal*
 * would be stripped too; no live function has that shape, so it does not bite.
 * Scanning every public `prokind='f'` row covers trigger functions as well
 * (they are ordinary pg_proc entries), so pg_trigger needs no separate pass.
 */

// DS-owned tables (audit Appendix B). Order-independent — each gets its own regex.
const DS_TABLES = [
  'journeys',
  'journey_enrollments',
  'journey_steps',
  'journey_step_instances',
  'step_kinds',
  'content_families',
  'journal_entries',
] as const;

// DS-3 Journeys functions — legitimately own/reference the journey tables.
// (`is_enrolled_in_journey`/`is_journey_enrollable` are the sprint0-era journey
//  RLS predicates; DS-3 by concept. `_enrollment_traveller_*`, `_migrate_*` are
//  DS-3 internal helpers. The rest are the DS-3 RPCs from the route inventory.)
const DS3_JOURNEY_FUNCTIONS = [
  '_enrollment_traveller_read_standing',
  '_enrollment_traveller_standing',
  '_migrate_journey_content_steps',
  'complete_journey_step',
  'enroll_group_in_journey',
  'enroll_self_in_journey',
  'enter_journey_step',
  'get_group_enrollment_summary',
  'get_group_journey_progress',
  'get_journey_catalog',
  'get_journey_detail',
  'get_my_enrollments',
  'get_onboarding_status',
  'get_own_step_instances_export',
  'get_player_state',
  'is_enrolled_in_journey',
  'is_journey_enrollable',
  'save_step_response',
  'set_journey_progress_sharing',
  'withdraw_from_journey',
];

// DS-7 Journal functions — legitimately own/reference journal_entries.
const DS7_JOURNAL_FUNCTIONS = [
  'create_journal_entry',
  'delete_journal_entry',
  'get_own_journal_entries',
  'get_own_journal_export',
  'update_journal_entry',
];

const DS_OWNED_ALLOWLIST = new Set<string>([
  ...DS3_JOURNEY_FUNCTIONS,
  ...DS7_JOURNAL_FUNCTIONS,
]);

// The ten Core lifecycle functions COR-A W4/W5 relocates (ADR-U047 §"the live
// relocation set" + Amendment 1). NOT allowlisted — they are the demonstrated-red
// now and must drop out when the inversion migration lands. Listed only to
// annotate the report. admin_hard_delete_user is the tenth site the W3 gate found
// during W4 (the audit's AC-1 "nine" missed it) — relocated via the fourth fact
// ds3_lifecycle_user_hard_deleted, NOT carried as a standing exception.
const COR_A_W4_RELOCATION_TARGETS = new Set<string>([
  'leave_group',
  'remove_member',
  '_transfer_stewardship_to_deusex',
  'respond_to_stewardship_nomination',
  'close_group',
  'delete_group',
  'leave_group_as_group',
  'admin_exit_user_from_platform',
  '_erase_mist',
  'admin_hard_delete_user',
]);

function stripComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlock
    .split('\n')
    .map((line) => {
      const i = line.indexOf('--');
      return i >= 0 ? line.slice(0, i) : line;
    })
    .join('\n');
}

function referencedDsTables(body: string): string[] {
  const clean = stripComments(body);
  return DS_TABLES.filter((t) =>
    new RegExp(`\\b(?:public\\.)?${t}\\b`, 'i').test(clean),
  );
}

type FnRow = { name: string; args: string; body: string };

describe('Internal-API inversion conformance (ADR-U047 rule 3, COR-A W3)', () => {
  it('no Core function references a DS-owned table (only DS-owned functions may)', async () => {
    const rows = (await runAdminSql(`
      select p.proname as name,
             pg_get_function_identity_arguments(p.oid) as args,
             p.prosrc as body
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prokind = 'f'
       order by p.proname;
    `)) as unknown as FnRow[];

    expect(rows.length).toBeGreaterThan(0); // sanity: catalog reachable

    const offenders = rows
      .map((r) => ({ name: r.name, args: r.args, tables: referencedDsTables(r.body ?? '') }))
      .filter((r) => r.tables.length > 0)
      .filter((r) => !DS_OWNED_ALLOWLIST.has(r.name) && !/^ds\d+_lifecycle_/.test(r.name));

    const fmt = (o: { name: string; args: string; tables: string[] }) =>
      `  - ${o.name}(${o.args})  ->  ${o.tables.join(', ')}`;
    const inScope = offenders.filter((o) => COR_A_W4_RELOCATION_TARGETS.has(o.name));
    const unexpected = offenders.filter((o) => !COR_A_W4_RELOCATION_TARGETS.has(o.name));

    // Print the full breakdown so the red evidence is complete.
    // eslint-disable-next-line no-console
    console.error(
      [
        '',
        'Internal-API inversion conformance (ADR-U047 rule 3):',
        `  Core functions referencing DS-owned tables: ${offenders.length}`,
        '',
        `  COR-A W4/W5 relocation targets — expected RED until the inversion migration lands (${inScope.length}):`,
        ...inScope.map(fmt),
        ...(unexpected.length
          ? ['', `  UNEXPECTED crossings — NOT a known COR-A target, investigate (${unexpected.length}):`, ...unexpected.map(fmt)]
          : []),
        '',
      ].join('\n'),
    );

    // The gate: no Core function outside the DS-owned allowlist may reference a
    // DS-owned table. RED now (all ten); GREEN once COR-A W4/W5 relocates them all.
    const report = offenders.map(fmt).join('\n');
    expect(report).toBe('');
  });
});
