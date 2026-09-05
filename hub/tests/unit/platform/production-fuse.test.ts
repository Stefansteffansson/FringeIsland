import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  projectRefOf,
  assertNotProduction,
  loadProjects,
  ProductionRefusedError,
} from '@/tests/helpers/target';

/**
 * ADR-U053 §3 — the code fuse, fixture half + conformance sweep.
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve `@/tests/helpers/target`.
 *
 * "A code fuse, not a convention": the suites, the E2E helpers, `runAdminSql`,
 * the apply script and every script under `hub/scripts/` refuse to run when
 * the configured project ref equals the production ref, unless an explicit
 * `ALLOW_PRODUCTION=1` names the intent (the apply script's production leg of
 * a schema gate is the one legitimate case). The refs live in ONE place —
 * `supabase/projects.json` — so no consumer carries its own copy.
 *
 * The sweep half: every module that constructs a service-role client or calls
 * the management API must go through the fuse. A new script that forgets is
 * exactly the residue class ADR-U053 exists to end, so it fails red here.
 */

const HUB_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(HUB_ROOT, '..');

describe('Production fuse (ADR-U053 §3)', () => {
  it('reads both refs from supabase/projects.json and they differ', () => {
    const p = loadProjects();
    expect(p.production.ref).toMatch(/^[a-z]{20}$/);
    expect(p.test.ref).toMatch(/^[a-z]{20}$/);
    expect(p.production.ref).not.toBe(p.test.ref);
    expect(p.production.name).toBe('FringeIslandDB');
    expect(p.test.name).toBe('FringeIsland-test');
  });

  it('derives the project ref from a Supabase URL', () => {
    expect(projectRefOf('https://abcdefghijklmnopqrst.supabase.co')).toBe('abcdefghijklmnopqrst');
    expect(projectRefOf('not a url')).toBeNull();
    expect(projectRefOf(undefined)).toBeNull();
  });

  it('fixture: the production ref is REFUSED unless ALLOW_PRODUCTION=1 names the intent', () => {
    const prod = loadProjects().production.ref;
    expect(() => assertNotProduction(`https://${prod}.supabase.co`, {})).toThrow(ProductionRefusedError);
    expect(() => assertNotProduction(`https://${prod}.supabase.co`, { ALLOW_PRODUCTION: '1' })).not.toThrow();
    expect(() => assertNotProduction(`https://${prod}.supabase.co`, { ALLOW_PRODUCTION: 'yes' })).toThrow(ProductionRefusedError);
  });

  it('fixture: the test ref and an unknown ref pass', () => {
    const test = loadProjects().test.ref;
    expect(() => assertNotProduction(`https://${test}.supabase.co`, {})).not.toThrow();
    expect(() => assertNotProduction('https://zzzzzzzzzzzzzzzzzzzz.supabase.co', {})).not.toThrow();
  });

  it('fixture: a missing or unparseable URL is refused (fail closed)', () => {
    expect(() => assertNotProduction(undefined, {})).toThrow(ProductionRefusedError);
    expect(() => assertNotProduction('', {})).toThrow(ProductionRefusedError);
  });

  it('parity: the JavaScript twin the scripts use (scripts/lib/target.js) refuses and permits the same things', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const js = require(path.join(REPO_ROOT, 'scripts', 'lib', 'target.js')) as {
      assertNotProduction: (url: string | undefined, env: Record<string, string | undefined>) => string;
      projectRefOf: (url: string | undefined) => string | null;
      loadProjects: () => { production: { ref: string }; test: { ref: string } };
    };
    const { production, test } = loadProjects();
    expect(js.loadProjects().production.ref).toBe(production.ref);
    expect(js.projectRefOf(`https://${test.ref}.supabase.co`)).toBe(test.ref);
    expect(() => js.assertNotProduction(`https://${production.ref}.supabase.co`, {})).toThrow(/Refusing to touch PRODUCTION/);
    expect(() => js.assertNotProduction(`https://${production.ref}.supabase.co`, { ALLOW_PRODUCTION: '1' })).not.toThrow();
    expect(() => js.assertNotProduction(`https://${test.ref}.supabase.co`, {})).not.toThrow();
    expect(() => js.assertNotProduction(undefined, {})).toThrow(/refusing to run/);
  });

  it('live sweep: every database-touching module goes through the fuse', () => {
    // Modules that construct a service-role client or call the management API.
    const consumers = [
      'hub/tests/helpers/supabase.ts',
      'hub/tests/e2e/helpers/auth.ts',
      'hub/tests/integration/global-teardown.ts',
      'hub/scripts/walk-cast.mjs',
      'hub/scripts/auth-admin-es256-probe.mjs',
      'hub/scripts/perf-measure.mjs',
      'hub/scripts/perf-adm-fixture.mjs',
      'scripts/apply-migration.js',
      'scripts/run-sql.js',
      'scripts/verify-schema.js',
      'scripts/get-db-config.js',
    ];
    const missing = consumers.filter((rel) => {
      const src = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      return !/assertNotProduction|loadTarget/.test(src);
    });
    expect(missing).toEqual([]);
  });

  it('live sweep: no script under hub/scripts or scripts/ constructs a Supabase client without the fuse', () => {
    const dirs = [path.join(HUB_ROOT, 'scripts'), path.join(REPO_ROOT, 'scripts')];
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const f of fs.readdirSync(dir)) {
        if (!/\.(m?js|cjs)$/.test(f)) continue;
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        const touchesDb = /createClient\(|api\.supabase\.com\/v1\/projects/.test(src);
        if (touchesDb && !/assertNotProduction|loadTarget/.test(src)) offenders.push(path.relative(REPO_ROOT, path.join(dir, f)));
      }
    }
    expect(offenders).toEqual([]);
  });
});
