import { describe, it, expect } from '@jest/globals';
import { stripLiterals, bareReferences, dynamicSqlSites } from '@/tests/helpers/ownership';

/**
 * COR-E W6 — GC-28: the inner-ring gate's qualified-only blind spot, closed
 * (Audit V backend addendum).
 *
 * WRITTEN RED-FIRST. At authoring, `stripLiterals`, `bareReferences` and
 * `dynamicSqlSites` do not exist on `@/tests/helpers/ownership`.
 *
 * `classifyReferences` matches `public.<table>` and the invocation check
 * matches `public.<callee>(` — by design (ADR-U047 A2: `search_path = ''` is
 * mandatory, so a real reference is always qualified). But nothing ASSERTED
 * the "always" — a bare `from groups` would have passed the ring gate green.
 * Audit V's live sweep found zero bare references (24 cross-owner mentions,
 * all comments or JSON keys); this gate keeps it at zero: after stripping
 * comments and string literals, no manifest table name and no classified
 * function name may appear unqualified, and no body may build SQL at runtime.
 *
 * Qualification means ANY schema prefix — `auth.users` and `cron.job` are as
 * qualified as `public.users`.
 */

const TABLES = ['groups', 'users', 'journeys'];
const FUNCTIONS = ['has_permission', 'ds3_stats_snapshot'];
const opts = { tables: TABLES, functions: FUNCTIONS };

describe('Bare-reference rule (COR-E W6, GC-28)', () => {
  it('strips comments and single-quoted strings, keeping code', () => {
    const src = "select 1 -- groups\n/* users */ from public.groups where name = 'journeys' and x = 'it''s'";
    const clean = stripLiterals(src);
    expect(clean).not.toMatch(/journeys|users|it''s/);
    expect(clean).toMatch(/public\.groups/);
  });

  it('a schema-qualified reference is not bare — public, auth, cron alike', () => {
    expect(bareReferences('f', 'select * from public.groups g join auth.users u on u.id = g.x', opts)).toEqual([]);
  });

  it('a bare table reference IS caught', () => {
    expect(bareReferences('f', 'select * from groups where id = p_id', opts)).toEqual([
      { kind: 'table', name: 'groups' },
    ]);
  });

  it('a bare classified-function call IS caught; self-recursion and unclassified names are not', () => {
    expect(bareReferences('f', 'perform has_permission(p_user, p_group, p_perm)', opts)).toEqual([
      { kind: 'function', name: 'has_permission' },
    ]);
    expect(bareReferences('f', 'perform public.has_permission(p_user, p_group, p_perm)', opts)).toEqual([]);
    expect(bareReferences('has_permission', 'perform has_permission(a, b, c)', opts)).toEqual([]);
    expect(bareReferences('f', 'perform something_else(a)', opts)).toEqual([]);
  });

  it('mentions inside comments, strings and JSON keys are not references', () => {
    const body = [
      '-- reassign the journeys first',
      "return jsonb_build_object('journeys', public.ds3_stats_snapshot(), 'users', 1);",
      "raise exception 'no groups here';",
      'v_key := \'account:\' || v_uid::text || \':users\';',
    ].join('\n');
    expect(bareReferences('f', body, opts)).toEqual([]);
  });

  it('identifiers that merely contain a table name are not references', () => {
    expect(bareReferences('f', 'select p_groups, v_users_count, my_journeys_view from public.groups', opts)).toEqual([]);
  });

  it('dynamic SQL IS caught; a static PERFORM is not', () => {
    expect(dynamicSqlSites("execute format('select * from %I', v_table);")).toHaveLength(1);
    expect(dynamicSqlSites("execute 'select 1' into v;")).toHaveLength(1);
    expect(dynamicSqlSites('execute v_sql using p_id;')).toHaveLength(1);
    expect(dynamicSqlSites('perform public.record_telemetry_event(p_kind, p_payload);')).toEqual([]);
    expect(dynamicSqlSites('-- never EXECUTE format() here')).toEqual([]);
  });
});
