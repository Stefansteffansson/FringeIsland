import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(60_000);

/**
 * Retention conformance — every log-shaped table is BOUNDED, and the bound is
 * real (2026-09-05, Stefan: "we do want to fix whatever we need to fix in order
 * not to end up there again").
 *
 * The 2026-09-04/05 database review found `reaper_runs` at 7,400 rows with no
 * retention (created 2026-06-26 without one; nothing in the checklist asked),
 * and pg_cron's own `job_run_details` at 7,284 rows (pg_cron keeps every run
 * forever unless a job prunes it). This suite turns the rule into a gate, the
 * way the grant and manifest rules already are:
 *
 *  1. `supabase/ownership.manifest.json` carries a `retention` section;
 *  2. every LOG-SHAPED table in `public` (name matching _log|_runs|_events|
 *     _history|_audit) has an entry there — `{days, job}` or
 *     `{policy: "forever", reason}` — so a new log table without a declaration
 *     fails red at its own gate;
 *  3. every declared `{days, job}` names a cron job that is present and active,
 *     and whose command reaches the table (by name, or through the declared
 *     prune function's body);
 *  4. pg_cron's run history has its own declared prune job, present and active;
 *  5. the declared maintenance job (the weekly full vacuum) is present.
 *
 * RED AT HEAD (2026-09-05, pre-migration 20260905100000): the manifest has no
 * `retention` section (cells 1–3 red on the missing declaration), the
 * cron-history job does not exist (cell 4), the maintenance job does not exist
 * (cell 5).
 */

const MANIFEST_PATH = path.resolve(__dirname, '../../../../supabase/ownership.manifest.json');
const LOG_SHAPED = /_(log|runs|events|history|audit)$/;

type DaysEntry = { days: number; job: string; since?: string };
type ForeverEntry = { policy: 'forever'; reason: string };
type Retention = {
  note?: string;
  tables: Record<string, DaysEntry | ForeverEntry>;
  cronHistory: DaysEntry;
  maintenance: { job: string; schedule: string; reason: string };
};

type CronRow = { jobname: string; schedule: string; command: string; active: boolean };

describe('Retention conformance — every log-shaped table is bounded, and the bound is scheduled', () => {
  let retention: Retention | undefined;
  let logTables: string[] = [];
  let jobs: CronRow[] = [];

  beforeAll(async () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as { retention?: Retention };
    retention = manifest.retention;
    const tables = (await runAdminSql(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1;`,
    )) as Array<{ table_name: string }>;
    logTables = tables.map((t) => t.table_name).filter((n) => LOG_SHAPED.test(n));
    jobs = (await runAdminSql(
      `SELECT jobname, schedule, command, active FROM cron.job ORDER BY jobname;`,
    )) as CronRow[];
  });

  it('1. the ownership manifest declares a retention section', () => {
    expect(retention).toBeDefined();
    expect(retention?.tables).toBeDefined();
    expect(retention?.cronHistory).toBeDefined();
    expect(retention?.maintenance).toBeDefined();
  });

  it('2. every log-shaped public table has a retention entry — days+job, or forever with a reason', () => {
    expect(logTables.length).toBeGreaterThan(0);
    const missing = logTables.filter((t) => !retention?.tables?.[t]);
    expect(missing).toEqual([]);
    for (const t of logTables) {
      const entry = retention!.tables[t];
      if ('policy' in entry) {
        expect(entry.policy).toBe('forever');
        expect(typeof entry.reason).toBe('string');
        expect(entry.reason.length).toBeGreaterThan(20);
      } else {
        expect(entry.days).toBeGreaterThan(0);
        expect(typeof entry.job).toBe('string');
      }
    }
  });

  it('3. every declared {days, job} names a present, active cron job whose command reaches the table', async () => {
    const declared = Object.entries(retention?.tables ?? {}).filter(
      (e): e is [string, DaysEntry] => !('policy' in e[1]),
    );
    expect(declared.length).toBeGreaterThan(0);
    for (const [table, entry] of declared) {
      const job = jobs.find((j) => j.jobname === entry.job);
      expect(job).toBeDefined();
      expect(job!.active).toBe(true);
      let reaches = job!.command.includes(table);
      if (!reaches) {
        const fn = job!.command.match(/public\.([a-z_]+)\s*\(/)?.[1];
        if (fn) {
          const rows = (await runAdminSql(
            `SELECT (prosrc LIKE '%${table}%') AS reaches FROM pg_proc WHERE proname = '${fn}' AND pronamespace = 'public'::regnamespace;`,
          )) as Array<{ reaches: boolean }>;
          reaches = Boolean(rows[0]?.reaches);
        }
      }
      expect(reaches).toBe(true);
    }
  });

  it("4. pg_cron's run history is pruned by a declared, present, active job", () => {
    expect(retention?.cronHistory?.days).toBeGreaterThan(0);
    const job = jobs.find((j) => j.jobname === retention?.cronHistory?.job);
    expect(job).toBeDefined();
    expect(job!.active).toBe(true);
    expect(job!.command).toContain('cron.job_run_details');
  });

  it('5. the declared maintenance job (weekly full vacuum) is present and active', () => {
    const job = jobs.find((j) => j.jobname === retention?.maintenance?.job);
    expect(job).toBeDefined();
    expect(job!.active).toBe(true);
    expect(job!.schedule).toBe(retention!.maintenance.schedule);
    expect(job!.command.toUpperCase()).toContain('VACUUM');
  });
});
