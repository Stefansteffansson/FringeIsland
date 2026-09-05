import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  listScripts,
  parseRegistryRows,
  touchesAccounts,
  registryViolations,
} from '@/tests/helpers/tooling-registry';

/**
 * COR-E W5/W8 — GC-27: the tooling registry (Audit V AC5-4, AC5-9; R-12).
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/tooling-registry`.
 *
 * Three pre-rebuild root scripts (`cleanup-test-data.js`, `cleanup-test-users.js`,
 * `seed-test-members.js`) held a service-role client and created or deleted
 * accounts outside the `cleanupTestUser` chain and the teardown census — the
 * exact residue class the 2026-09-04 "no leftover test accounts" rule closed.
 * Nothing listed them; nothing could notice a fourth one appearing.
 *
 * The gate: every script under `scripts/` and `hub/scripts/` is a row in
 * `scripts/README.md` (the registry), and any script that creates or deletes
 * auth users says in its row how it tears down and censuses what it made.
 */

const HUB_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(HUB_ROOT, '..');
const SCRIPT_DIRS = [path.join(REPO_ROOT, 'scripts'), path.join(HUB_ROOT, 'scripts')];

const README_FIXTURE = [
  '| Script | Purpose | Touches accounts? | Teardown / census obligation |',
  '|---|---|---|---|',
  '| `scripts/tidy.js` | tidies | no | — |',
  '| `hub/scripts/cast.mjs` | makes a cast | **yes** | `teardown` mode removes everything it made; `census` proves it |',
  '| `hub/scripts/seed.mjs` | seeds five FIMs | **yes** | none |',
].join('\n');

describe('Tooling registry (COR-E W5/W8, GC-27)', () => {
  it('fixture: rows are keyed by the backticked repo-relative path', () => {
    const rows = parseRegistryRows(README_FIXTURE);
    expect([...rows.keys()]).toEqual(['scripts/tidy.js', 'hub/scripts/cast.mjs', 'hub/scripts/seed.mjs']);
  });

  it('fixture: a script with no row IS caught', () => {
    const rows = parseRegistryRows(README_FIXTURE);
    const violations = registryViolations(['scripts/tidy.js', 'scripts/orphan.js'], rows, () => '');
    expect(violations).toEqual(['scripts/orphan.js: no row in scripts/README.md']);
  });

  it('fixture: an account-touching script whose row names no teardown or census IS caught', () => {
    const rows = parseRegistryRows(README_FIXTURE);
    const src = (rel: string) =>
      rel === 'hub/scripts/seed.mjs' || rel === 'hub/scripts/cast.mjs'
        ? "await admin.auth.admin.createUser({ email })"
        : '';
    expect(touchesAccounts(src('hub/scripts/seed.mjs'))).toBe(true);
    expect(touchesAccounts(src('scripts/tidy.js'))).toBe(false);
    const violations = registryViolations(['hub/scripts/cast.mjs', 'hub/scripts/seed.mjs'], rows, src);
    expect(violations).toEqual([
      'hub/scripts/seed.mjs: creates or deletes auth users but its registry row names no teardown or census',
    ]);
  });

  it('live sweep: every script is registered, and every account-touching script says how it cleans up', () => {
    const files = listScripts(SCRIPT_DIRS, REPO_ROOT);
    expect(files.length).toBeGreaterThanOrEqual(8); // sanity: the tooling exists
    const rows = parseRegistryRows(fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'README.md'), 'utf8'));
    const violations = registryViolations(files, rows, (rel) =>
      fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'),
    );
    expect(violations).toEqual([]);
  });

  it('live sweep: the registry has no stale rows (every row names a file that exists)', () => {
    const rows = parseRegistryRows(fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'README.md'), 'utf8'));
    const stale = [...rows.keys()].filter((rel) => !fs.existsSync(path.join(REPO_ROOT, rel)));
    expect(stale).toEqual([]);
  });
});
