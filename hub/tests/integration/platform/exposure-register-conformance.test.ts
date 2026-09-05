import { describe, it, expect, beforeAll } from '@jest/globals';
import { runAdminSql } from '@/tests/helpers/supabase';
import {
  loadExposureRegister,
  loadClientAccessRegister,
  exposureViolations,
  clientAccessViolations,
  type LiveFunction,
  type LiveTable,
} from '@/tests/helpers/exposure';

/**
 * COR-E W6 — exposure-register conformance (Audit V GC-29, AC5-17; R-15).
 *
 * WRITTEN RED-FIRST alongside the fixture half in
 * `tests/unit/platform/exposure-register-rule.test.ts`.
 *
 * The outer ring's PLATFORM side. `anon-execute-lockdown` proves anon can
 * execute nothing; `table-grant-lockdown` proves no client role writes a table
 * directly. Neither says WHICH functions `authenticated` may execute — and
 * Postgres's default PUBLIC EXECUTE reaches `authenticated`, so a function
 * shipped without its REVOKE becomes RPC-callable by every signed-in session
 * with no gate noticing. This one reads `ownership.manifest.json`'s `exposure`
 * register (client / sealed / trigger / internal) and asserts the live grants
 * match it both ways, then does the same for `clientAccess` (every RLS-on,
 * zero-policy table is declared contracts-only with a reason).
 *
 * Seeded from the live grants on 2026-09-05 and reviewed by name;
 * `ds5_is_fim_actor` is `client` by ruling R-15.
 */

type FnRow = { name: string; rettype: string; anon_exec: boolean; auth_exec: boolean };
type TblRow = { name: string; policies: number };

describe('Exposure-register conformance — the outer ring pinned on the platform side (COR-E W6, GC-29)', () => {
  let live: LiveFunction[] = [];
  let tables: LiveTable[] = [];

  beforeAll(async () => {
    const fns = (await runAdminSql(`
      select p.proname as name,
             p.prorettype::regtype::text as rettype,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prokind in ('f', 'p')
       order by p.proname;
    `)) as unknown as FnRow[];
    live = fns.map((r) => ({
      name: r.name,
      rettype: r.rettype,
      anonExec: r.anon_exec === true,
      authExec: r.auth_exec === true,
    }));

    // Policies attach to tables (relkind r/p); views and foreign tables carry
    // no RLS and are the ownership gate's concern, not this one's.
    const tbls = (await runAdminSql(`
      select c.relname as name,
             (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relkind in ('r', 'p')
         and c.relrowsecurity
       order by c.relname;
    `)) as unknown as TblRow[];
    tables = tbls.map((t) => ({ name: t.name, policies: Number(t.policies) }));
  });

  it('every live function is registered in exactly one class, and the live grants match the class both ways', () => {
    expect(live.length).toBeGreaterThan(0); // sanity: catalog reachable
    const register = loadExposureRegister();
    expect(register.client.length).toBeGreaterThan(0);
    expect(register.sealed.length).toBeGreaterThan(0);
    expect(register.trigger.length).toBeGreaterThan(0);

    const violations = exposureViolations(register, live);
    if (violations.length) {
      console.error(['', 'Exposure-register conformance (COR-E W6, GC-29):', ...violations.map((v) => `  - ${v}`)].join('\n'));
    }
    expect(violations).toEqual([]);
  });

  it('every RLS-on, zero-policy table is declared contracts-only with a reason — and no declared one has policies', () => {
    expect(tables.length).toBeGreaterThan(0);
    const violations = clientAccessViolations(loadClientAccessRegister(), tables);
    if (violations.length) {
      console.error(['', 'Client-access register (COR-E W6, AC5-17):', ...violations.map((v) => `  - ${v}`)].join('\n'));
    }
    expect(violations).toEqual([]);
  });
});
