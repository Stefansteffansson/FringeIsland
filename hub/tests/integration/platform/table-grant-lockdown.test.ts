import { describe, it, expect, jest } from '@jest/globals';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(120_000);

/**
 * TASK-SEC-02 — the table-grant lockdown, as an INVARIANT, not a list.
 *
 * The function-grant version of this class was found three times and closed
 * structurally (a sweep, a default-privileges fix, and the permanent gate in
 * `anon-execute-lockdown.test.ts`). The TABLE analogue never got that
 * treatment: measured 2026-08-11 and again 2026-09-02, 30 of 42 public
 * tables still carried Supabase's default INSERT grant for `authenticated`,
 * 33 carried TRUNCATE, and `anon` held DML on 33. Not a live exploit — RLS is
 * on everywhere and no write policy covers those tables — but the second lock
 * was left unlocked because the first one holds, and a future permissive
 * policy or SECURITY INVOKER helper would find it missing.
 *
 * Posture (ADR-U038): every write goes through a SECURITY DEFINER contract,
 * so the client roles need NO table-level DML. RLS governs reads (SELECT is
 * untouched here). The one exception is named below with its reason.
 *
 * Red-first: this suite fails against today's substrate (30 tables + the
 * default ACL) until migration `20260902210000_task_sec02_table_grant_lockdown`
 * is applied at the schema gate.
 */

/** Grants deliberately kept — COLUMN-scoped, with the exact column set, so a
 *  widening is a regression too. Adding a row is a decision that belongs in a
 *  spec with a reason, never a convenience. Table-level: none, by design. */
const INTENTIONALLY_GRANTED: Array<{
  table: string;
  role: string;
  privilege: string;
  columns: string[];
  reason: string;
}> = [
  {
    table: 'users',
    role: 'authenticated',
    privilege: 'UPDATE',
    columns: ['avatar_url', 'bio', 'display_preference', 'full_name', 'nickname', 'show_real_name'],
    reason:
      '`update_own_profile` is SECURITY INVOKER and writes `users` as the caller under the ' +
      '`users_update_own` policy (FEAT-PC003); narrowed to the six identity-scope columns by ' +
      'migration 20260702120000. The grant is the second lock behind that policy.',
  },
];

const DML = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];

describe('table-grant lockdown — no client role may write a public table directly', () => {
  it('no public table grants DML / TRUNCATE / REFERENCES / TRIGGER to anon or authenticated, beyond the named exceptions', async () => {
    const rows = await runAdminSql(`
      SELECT table_name, grantee, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type IN (${DML.map((p) => `'${p}'`).join(', ')})
      ORDER BY 1, 2, 3;
    `);
    // Table-level: no exception at all — the one kept grant is column-scoped
    // and lives in the column catalog, not this one.
    const leaked = rows.map((r) => `${r.grantee} ${r.privilege_type} ON ${r.table_name}`);
    expect(leaked).toEqual([]);
  });

  it('nor any COLUMN of a public table — column-level DML grants are the same lock, one level down', async () => {
    // PC010 narrowed `groups` UPDATE to settable columns as a column grant;
    // a table-level revoke drops those too (Postgres revokes the matching
    // column privileges), but the invariant must not depend on remembering
    // that — it reads both catalogs.
    const rows = await runAdminSql(`
      SELECT table_name, grantee, privilege_type, string_agg(column_name, ',' ORDER BY column_name) AS cols
      FROM information_schema.role_column_grants
      WHERE table_schema = 'public'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'REFERENCES')
      GROUP BY 1, 2, 3
      ORDER BY 1, 2, 3;
    `);
    // `role_column_grants` also expands table-level grants per column, so
    // before the migration this cell lists every default-granted table; after
    // it, only the named exception — with exactly its column set.
    const leaked = rows
      .map((r) => ({
        table: String(r.table_name),
        role: String(r.grantee),
        privilege: String(r.privilege_type),
        cols: String(r.cols),
      }))
      .filter(
        (g) =>
          !INTENTIONALLY_GRANTED.some(
            (x) =>
              x.table === g.table &&
              x.role === g.role &&
              x.privilege === g.privilege &&
              [...x.columns].sort().join(',') === g.cols,
          ),
      )
      .map((g) => `${g.role} ${g.privilege} (${g.cols}) ON ${g.table}`);
    expect(leaked).toEqual([]);
  });

  it('the named exception still holds, column-exact (a revoke that overshoots is a regression too)', async () => {
    for (const x of INTENTIONALLY_GRANTED) {
      const rows = await runAdminSql(`
        SELECT string_agg(column_name, ',' ORDER BY column_name) AS cols
        FROM information_schema.role_column_grants
        WHERE table_schema = 'public' AND table_name = '${x.table}'
          AND grantee = '${x.role}' AND privilege_type = '${x.privilege}';
      `);
      expect({ ...x, held: String(rows[0]?.cols ?? '') }).toMatchObject({
        held: [...x.columns].sort().join(','),
      });
    }
  });

  it('no public table grants MAINTAIN to anon or authenticated — the PG17 privilege the information_schema views hide (TASK-SEC-04)', async () => {
    // MAINTAIN (VACUUM / ANALYZE / CLUSTER / REINDEX / REFRESH MATERIALIZED
    // VIEW / LOCK TABLE) rode in with the default ACL's `rm` and survived
    // SEC-02's revoke list and the SELECT revokes on users / groups. It is not
    // in `role_table_grants`, so this cell reads the ACL itself.
    // Red-first: 37 (anon) + 39 (authenticated) rows at HEAD until migration
    // `20260923150000_task_sec04_client_role_maintain_revoke` is applied.
    const rows = await runAdminSql(`
      SELECT c.relname AS table_name, pg_get_userbyid(a.grantee) AS grantee
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace,
      LATERAL aclexplode(c.relacl) a
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND a.privilege_type = 'MAINTAIN'
        AND pg_get_userbyid(a.grantee) IN ('anon', 'authenticated')
      ORDER BY 1, 2;
    `);
    expect(rows.map((r) => `${r.grantee} MAINTAIN ON ${r.table_name}`)).toEqual([]);
  });

  it('the default privileges for role postgres grant no DML on future public tables to the client roles', async () => {
    // Supabase ships `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon,
    // authenticated, service_role` for the migration role, so a table created by
    // the next migration inherits the full default set. The gate above would
    // catch it after the fact; this cell catches the mechanism.
    const rows = await runAdminSql(`
      SELECT d.defaclacl::text AS acl
      FROM pg_default_acl d
      JOIN pg_namespace n ON n.oid = d.defaclnamespace
      WHERE n.nspname = 'public' AND d.defaclobjtype = 'r'
        AND pg_get_userbyid(d.defaclrole) = 'postgres';
    `);
    // Each ACL entry looks like `role=privs/grantor`; a (append), w (update),
    // d (delete), D (truncate), x (references), t (trigger) are the DML letters;
    // m (MAINTAIN, PG17 — VACUUM / ANALYZE / REINDEX / LOCK TABLE) joins them (TASK-SEC-04).
    const clientDml = rows
      .map((r) => String(r.acl))
      .flatMap((acl) => acl.replace(/^\{|\}$/g, '').split(','))
      .filter((entry) => /^(anon|authenticated)=/.test(entry))
      .filter((entry) => /=[^/]*[awdDxtm]/.test(entry));
    expect(clientDml).toEqual([]);
  });

  // ── TASK-SEC-03 — the PRESENCE half ──────────────────────────────────────
  // On 2026-10-30 Supabase removes the default ACL that handed every new
  // public table SELECT for anon / authenticated and ALL for service_role.
  // The cells above pin what the client roles must NOT hold; a table that
  // arrives with NO grant at all passes them and is unreachable for everyone
  // (the Hub, the BFF, the helpers). These two pin what every table MUST hold.
  // The static twin reads the migration files before apply:
  // `unit/platform/migration-table-grants.test.ts`.

  /** No client role reads these at all — every read is a SECURITY DEFINER
   *  contract (ADR-U038). Adding a row is a decision with a reason. */
  const CONTRACT_ONLY_TABLES: Array<{ table: string; reason: string }> = [
    {
      table: 'journal_entries',
      reason: 'FEAT-PD001 — `REVOKE ALL … FROM anon, authenticated` (20260703084810); the journal contracts read it',
    },
    {
      table: 'journey_steps',
      reason: 'FEAT-PD003 — step substrate, `revoke all … from anon, authenticated` (20260707190000)',
    },
    {
      table: 'journey_step_instances',
      reason: 'FEAT-PD003 — progress substrate, same migration',
    },
  ];

  it('every public table is readable by authenticated — table- or column-scoped SELECT — beyond the named contract-only tables (TASK-SEC-03)', async () => {
    // `role_column_grants` expands a table-level SELECT per column and lists a
    // column-scoped one as written, so `users` / `groups` (the S2 column
    // lists) count as readable here without a special case.
    const rows = await runAdminSql(`
      SELECT t.tablename AS table_name
      FROM pg_tables t
      WHERE t.schemaname = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.role_column_grants g
          WHERE g.table_schema = 'public' AND g.table_name = t.tablename
            AND g.grantee = 'authenticated' AND g.privilege_type = 'SELECT'
        )
      ORDER BY 1;
    `);
    const unreadable = rows.map((r) => String(r.table_name));
    const contractOnly = CONTRACT_ONLY_TABLES.map((x) => x.table).sort();
    // Nothing unreadable beyond the list — a table that arrived without its
    // grant lands here.
    expect(unreadable.filter((t) => !contractOnly.includes(t))).toEqual([]);
    // And the list is exact — a contract-only table that became readable is a
    // widening somebody must have decided.
    expect(unreadable).toEqual(contractOnly);
  });

  it('every public table grants the full set to service_role — the BFF, the admin client and the test helpers depend on it (TASK-SEC-03)', async () => {
    const rows = await runAdminSql(`
      SELECT t.tablename AS table_name,
             coalesce(string_agg(g.privilege_type, ',' ORDER BY g.privilege_type), '(none)') AS held
      FROM pg_tables t
      LEFT JOIN information_schema.role_table_grants g
        ON g.table_schema = 'public' AND g.table_name = t.tablename AND g.grantee = 'service_role'
       AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
      WHERE t.schemaname = 'public'
      GROUP BY t.tablename
      HAVING count(DISTINCT g.privilege_type) < 7
      ORDER BY 1;
    `);
    expect(rows.map((r) => `${r.table_name}: ${r.held}`)).toEqual([]);
  });
});
