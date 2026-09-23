import * as fs from 'fs';
import * as path from 'path';

/**
 * TASK-SEC-03 — the static half of the table-grant gate.
 *
 * From 2026-10-30 Supabase no longer grants Data API access to new `public`
 * tables by default (the `postgres` default ACL that handed every new table
 * `SELECT` to `anon` / `authenticated` and `ALL` to `service_role` goes away).
 * A table a migration creates without its own GRANT lines is then unreachable
 * for every client role. This module reads migration FILES and reports, for
 * every migration at or after `TABLE_GRANT_RULE_FROM`:
 *
 *   - `missing-service_role`   the created table has no GRANT naming `service_role`
 *                              (the BFF, the admin client and the test helpers all read
 *                              and write through it — never optional)
 *   - `missing-authenticated`  no GRANT — table- or column-scoped — names `authenticated`,
 *                              and the file carries no `-- no-client-read: <table>` marker
 *                              (a contract-only table, ADR-U038: reads go through a
 *                              SECURITY DEFINER function; say so, with the reason)
 *   - `client-dml`             a GRANT hands INSERT / UPDATE / DELETE / TRUNCATE /
 *                              REFERENCES / TRIGGER / MAINTAIN / ALL to `anon` or `authenticated` —
 *                              Supabase's own template block does this; it reopens the
 *                              TASK-SEC-02 lock and `table-grant-lockdown.test.ts` would
 *                              refuse it live. A named exception (the `users` column
 *                              UPDATE shape) is marked `-- client-dml-exception: <table>`
 *                              with its reason.
 *
 * Tables created before the rule's first version got their grants from the
 * default ACL; the SEC-03 backfill migration (`TABLE_GRANT_RULE_FROM` itself)
 * states them explicitly, so the chain replays onto a fresh project after the
 * change. Consumers: `unit/platform/migration-table-grants.test.ts`.
 *
 * Scope, stated: statements are read after blanking `--` and `/* *\/` comments,
 * single-quoted literals and dollar-quoted bodies, so a CREATE TABLE or GRANT
 * inside a function body or a DO block is not seen (none creates a table in
 * the chain today; SEC-02's DO-block revokes are revokes). Markers are read
 * from the raw text because they ARE comments.
 */

/** The SEC-03 backfill migration. Every migration from this version on must grant its own tables. */
export const TABLE_GRANT_RULE_FROM = '20260923120000';

export type FindingKind = 'missing-service_role' | 'missing-authenticated' | 'client-dml';

export type CreatedTable = { table: string; line: number };

export type GrantFinding = {
  file: string;
  table: string;
  kind: FindingKind;
  detail: string;
};

const CLIENT_ROLES = ['anon', 'authenticated'];
/** The write side. MAINTAIN (PG17: VACUUM / ANALYZE / REINDEX / LOCK TABLE) belongs here too — TASK-SEC-04. */
const DML_WORDS = ['ALL', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];

/** The 14-digit version prefix of a migration file name, or null for anything else. */
export const migrationVersion = (fileName: string): string | null => {
  const m = /^(\d{14})_.*\.sql$/i.exec(path.basename(fileName));
  return m ? m[1] : null;
};

const blank = (s: string): string => s.replace(/[^\n]/g, ' ');

/**
 * Blank comments, single-quoted literals and dollar-quoted bodies in one pass,
 * keeping every newline so line numbers survive. One pass, in order of
 * appearance, so an apostrophe inside a comment cannot swallow the SQL after
 * it and a `--` inside a literal cannot truncate the literal.
 */
const stripSqlNoise = (sql: string): string => {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === '-' && d === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      out += blank(sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (c === '/' && d === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += blank(sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      const stop = Math.min(j + 1, n);
      out += blank(sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (c === '$') {
      const m = /^\$([a-zA-Z_][a-zA-Z0-9_]*)?\$/.exec(sql.slice(i, i + 64));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        out += blank(sql.slice(i, stop));
        i = stop;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
};

/** Postgres folds unquoted identifiers to lower case; quoted ones keep their spelling. */
const identifier = (raw: string): string => (raw.startsWith('"') ? raw.slice(1, -1) : raw.toLowerCase());

/** The public tables a migration creates. Temp tables are not Data API surface and are skipped. */
export const createdTables = (sql: string): CreatedTable[] => {
  const clean = stripSqlNoise(sql);
  const re =
    /\bcreate\s+(?:(temp|temporary)\s+|unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:public\s*\.\s*)?("[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)/gi;
  const out: CreatedTable[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    if (m[1]) continue;
    const line = clean.slice(0, m.index).split('\n').length;
    out.push({ table: identifier(m[2]), line });
  }
  return out;
};

type Grant = { privileges: string; table: string; grantees: string[] };

/**
 * Every `GRANT <privileges> ON [TABLE] [public.]<table> TO <roles>;` in the
 * file. Neither side of `ON` may cross a `;`, so a function grant can never
 * swallow the table grant after it. Schema-wide (`ON ALL TABLES IN SCHEMA`),
 * sequence, function and schema grants do not match the table shape.
 */
const tableGrants = (sql: string): Grant[] => {
  const clean = stripSqlNoise(sql);
  const re =
    /\bgrant\s+([^;]*?)\s+on\s+(?:table\s+)?(?:public\s*\.\s*)?("[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)\s+to\s+([^;]*?)(?:\s+with\s+grant\s+option)?\s*;/gi;
  const out: Grant[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const privileges = m[1].trim();
    if (!/^(all|select|insert|update|delete|truncate|references|trigger|maintain)\b/i.test(privileges)) continue;
    out.push({
      privileges,
      table: identifier(m[2]),
      grantees: m[3]
        .split(',')
        .map((r) => identifier(r.trim()))
        .filter(Boolean),
    });
  }
  return out;
};

const hasMarker = (sql: string, marker: string, table: string): boolean =>
  new RegExp(`--\\s*${marker}:\\s*(?:public\\.)?${table}\\b`, 'i').test(sql);

/** The privilege words of a GRANT, with column lists removed (`select (id, name)` → `SELECT`). */
const privilegeWords = (privileges: string): string[] =>
  privileges
    .replace(/\([^)]*\)/g, '')
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);

/** Check one migration file's text against the rule. Files before the rule, and non-migration files, report nothing. */
export const checkMigration = (fileName: string, sql: string): GrantFinding[] => {
  const version = migrationVersion(fileName);
  if (!version || version < TABLE_GRANT_RULE_FROM) return [];
  const file = path.basename(fileName);
  const grants = tableGrants(sql);
  const findings: GrantFinding[] = [];

  for (const { table, line } of createdTables(sql)) {
    const roles = new Set(grants.filter((g) => g.table === table).flatMap((g) => g.grantees));
    if (!roles.has('authenticated') && !hasMarker(sql, 'no-client-read', table)) {
      findings.push({
        file,
        table,
        kind: 'missing-authenticated',
        detail: `created at line ${line}; no GRANT names authenticated and no "-- no-client-read: ${table}" marker`,
      });
    }
    if (!roles.has('service_role')) {
      findings.push({
        file,
        table,
        kind: 'missing-service_role',
        detail: `created at line ${line}; no GRANT names service_role`,
      });
    }
  }

  const flagged = new Set<string>();
  for (const g of grants) {
    const toClient = g.grantees.some((r) => CLIENT_ROLES.includes(r));
    const dml = privilegeWords(g.privileges).filter((w) => DML_WORDS.includes(w));
    if (!toClient || dml.length === 0 || flagged.has(g.table)) continue;
    if (hasMarker(sql, 'client-dml-exception', g.table)) continue;
    flagged.add(g.table);
    findings.push({
      file,
      table: g.table,
      kind: 'client-dml',
      detail: `GRANT ${dml.join(', ')} to a client role reopens the TASK-SEC-02 lock (writes go through SECURITY DEFINER contracts)`,
    });
  }

  return findings;
};

/**
 * Sweep the top-level `.sql` files of a migrations directory (`archive/` is not
 * the chain). `from` defaults to the rule's first version; a sweep asked to
 * look further back (the unit suite's "teeth" cell) applies the same logic to
 * the older files, which is how the pre-rule reliance on the default ACL is
 * measured.
 */
export const sweepMigrations = (dir: string, from: string = TABLE_GRANT_RULE_FROM): GrantFinding[] =>
  fs
    .readdirSync(dir)
    .filter((f) => {
      const v = migrationVersion(f);
      return v !== null && v >= from;
    })
    .sort()
    .flatMap((f) => {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      const inScope = (migrationVersion(f) as string) >= TABLE_GRANT_RULE_FROM;
      return inScope
        ? checkMigration(f, sql)
        : checkMigration(`${TABLE_GRANT_RULE_FROM}_${f}`, sql).map((x) => ({ ...x, file: f }));
    });
