import { describe, it, expect } from '@jest/globals';
import * as path from 'path';
import {
  TABLE_GRANT_RULE_FROM,
  migrationVersion,
  createdTables,
  checkMigration,
  sweepMigrations,
} from '@/tests/helpers/migration-table-grants';

/**
 * TASK-SEC-03 — every migration grants the tables it creates, in the same file.
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/migration-table-grants`.
 *
 * Why this exists: on 2026-10-30 Supabase stops granting Data API access to
 * new `public` tables by default. Until then the `postgres` default ACL hands
 * every new table `SELECT` for `anon` / `authenticated` and `ALL` for
 * `service_role`; 40 of our 42 tables got their grants that way and only two
 * migrations ever wrote a table grant. After the change a table created by a
 * migration without its own GRANT lines is unreachable through PostgREST for
 * every client role — the Hub's reads, the BFF's `service_role` client, the
 * test helpers and the walk scripts all get 42501 — and a replay of the chain
 * onto a fresh project (`scripts/replay-migrations.js`, a preview branch, a
 * local reset) comes up with ~40 dead tables.
 *
 * The live half of the gate is in `integration/platform/table-grant-lockdown.test.ts`
 * (every public table readable by `authenticated`, fully granted to
 * `service_role`). This is the static half: it reads the migration FILES, so
 * a forgotten grant fails before the schema gate ever applies it, and a pasted
 * Supabase template block (`insert, update, delete … to authenticated`) fails
 * for reopening the TASK-SEC-02 lock. Tables created before the rule's first
 * version are granted explicitly by the SEC-03 backfill migration, so the
 * sweep starts there.
 */

const HUB_ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS_DIR = path.resolve(HUB_ROOT, '..', 'supabase', 'migrations');

const HOUSE_BLOCK = `
create table public.widgets (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
alter table public.widgets enable row level security;
grant select on public.widgets to anon, authenticated;
grant all on public.widgets to service_role;
`;

describe('migration table grants (TASK-SEC-03) — the static half of the gate', () => {
  it('the rule starts at the SEC-03 backfill migration and the version parser reads the 14-digit prefix', () => {
    expect(TABLE_GRANT_RULE_FROM).toMatch(/^\d{14}$/);
    expect(migrationVersion('20260923120000_task_sec03_explicit_table_grants.sql')).toBe('20260923120000');
    expect(migrationVersion('README.md')).toBeNull();
    expect(migrationVersion('REPLAY-EXCEPTIONS.json')).toBeNull();
  });

  it('finds the tables a migration creates — schema-qualified or not, quoted or not, IF NOT EXISTS or not; never in comments or string literals', () => {
    const sql = `
      -- create table public.commented_out (id int);
      comment on table public.users is 'create table public.in_a_literal (id int)';
      CREATE TABLE IF NOT EXISTS public.alpha (id int);
      create table "beta" (id int);
      create unlogged table public.gamma (id int);
      create temp table scratch (id int);
    `;
    expect(createdTables(sql).map((t) => t.table)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('fixture: a table created without any grant is missing both roles', () => {
    const sql = 'create table public.widgets (id uuid primary key);\nalter table public.widgets enable row level security;';
    expect(checkMigration('20260923130000_x.sql', sql).map((f) => `${f.table}:${f.kind}`)).toEqual([
      'widgets:missing-authenticated',
      'widgets:missing-service_role',
    ]);
  });

  it('fixture: the house block — SELECT for the client roles, ALL for service_role — is clean', () => {
    expect(checkMigration('20260923130000_x.sql', HOUSE_BLOCK)).toEqual([]);
  });

  it('fixture: a column-scoped SELECT counts as the client-role read (the users / groups shape)', () => {
    const sql = `
      create table public.widgets (id uuid primary key, name text, secret text);
      grant select (id, name) on public.widgets to authenticated, anon;
      grant all on table public.widgets to service_role;
    `;
    expect(checkMigration('20260923130000_x.sql', sql)).toEqual([]);
  });

  it('fixture: a contract-only table needs the marker to skip the client-role read; service_role is never optional', () => {
    const base = 'create table public.ledger (id uuid primary key);\ngrant all on public.ledger to service_role;\n';
    expect(checkMigration('20260923130000_x.sql', base).map((f) => f.kind)).toEqual(['missing-authenticated']);
    const marked = `${base}-- no-client-read: ledger — reads go through get_own_ledger() (SECURITY DEFINER), ADR-U038\n`;
    expect(checkMigration('20260923130000_x.sql', marked)).toEqual([]);
    const noService = 'create table public.ledger (id uuid primary key);\n-- no-client-read: ledger — contracts only\n';
    expect(checkMigration('20260923130000_x.sql', noService).map((f) => f.kind)).toEqual(['missing-service_role']);
  });

  it("fixture: Supabase's own template block reopens the TASK-SEC-02 lock and is refused statically", () => {
    const sql = `
      create table public.widgets (id uuid primary key);
      grant select on public.widgets to anon;
      grant select, insert, update, delete on public.widgets to authenticated;
      grant select, insert, update, delete on public.widgets to service_role;
    `;
    expect(checkMigration('20260923130000_x.sql', sql).map((f) => `${f.table}:${f.kind}`)).toEqual([
      'widgets:client-dml',
    ]);
    const all = 'create table public.widgets (id int);\ngrant all on public.widgets to authenticated, service_role;';
    expect(checkMigration('20260923130000_x.sql', all).map((f) => f.kind)).toEqual(['client-dml']);
  });

  it('fixture: a migration before the rule is not checked (the backfill grants its tables); one at or after it is', () => {
    const ungranted = 'create table public.widgets (id int);';
    expect(checkMigration('20260101000000_old.sql', ungranted)).toEqual([]);
    expect(checkMigration(`${TABLE_GRANT_RULE_FROM}_first.sql`, ungranted)).toHaveLength(2);
    expect(checkMigration('not-a-migration.sql', ungranted)).toEqual([]);
  });

  it('sweep: every migration from the rule version on grants the tables it creates — the folder is clean', () => {
    const findings = sweepMigrations(MIGRATIONS_DIR);
    expect(findings.map((f) => `${f.file} ${f.table} ${f.kind}`)).toEqual([]);
  });

  it('sweep, teeth: the chain before the rule relied on the default ACL — dozens of tables with no grant in their file (why the backfill exists)', () => {
    const findings = sweepMigrations(MIGRATIONS_DIR, '00000000000000');
    const ungrantedTables = new Set(findings.filter((f) => f.kind !== 'client-dml').map((f) => f.table));
    expect(ungrantedTables.size).toBeGreaterThanOrEqual(30);
  });
});
