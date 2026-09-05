import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseHubIntegrationScripts,
  parseRootPassthroughs,
  integrationScriptViolations,
} from '@/tests/helpers/tooling-registry';

/**
 * COR-E W8 — GC-25: every `test:integration:*` script resolves to a live test
 * directory (Audit V AC5-8).
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/tooling-registry` — the rule has no implementation.
 *
 * The silent-zero trap: `jest tests/integration/rls` against a directory that
 * does not exist matches zero tests and exits green. `test:integration:rls` and
 * `test:integration:rbac` pointed at nothing for months in both manifests, and
 * the platform tier's CLAUDE.md listed them as live domains. A script that
 * cannot fail is worse than no script — it reads as coverage.
 *
 * Two shapes are pinned: the Hub's own `jest <path>` scripts must name a
 * directory under `hub/` that holds at least one `*.test.ts(x)`; the root
 * manifest's `npm run <name> -w hub` passthroughs must name a script the Hub
 * manifest actually defines.
 */

const HUB_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(HUB_ROOT, '..');

const hasTests = (dir: string): boolean =>
  fs.existsSync(dir) &&
  fs.statSync(dir).isDirectory() &&
  fs.readdirSync(dir, { recursive: true }).some((f) => /\.test\.tsx?$/.test(String(f)));

describe('Integration scripts resolve (COR-E W8, GC-25)', () => {
  it('fixture: a Hub script pointing at a missing directory IS caught', () => {
    const hub = parseHubIntegrationScripts({
      'test:integration:rls': 'jest tests/integration/rls --runInBand --verbose',
      'test:integration:auth': 'jest tests/integration/auth --runInBand --verbose',
    });
    const violations = integrationScriptViolations(
      hub,
      [],
      (rel) => rel === 'tests/integration/auth',
    );
    expect(violations).toEqual(['test:integration:rls -> tests/integration/rls (no test files)']);
  });

  it('fixture: a root passthrough naming a script the Hub does not define IS caught', () => {
    const hub = parseHubIntegrationScripts({
      'test:integration:auth': 'jest tests/integration/auth --runInBand --verbose',
    });
    const root = parseRootPassthroughs({
      'test:integration:auth': 'npm run test:integration:auth -w hub',
      'test:integration:rbac': 'npm run test:integration:rbac -w hub',
    });
    const violations = integrationScriptViolations(hub, root, () => true);
    expect(violations).toEqual(['root test:integration:rbac -> hub script test:integration:rbac (undefined)']);
  });

  it('fixture: the umbrella script (no path) and non-integration scripts are ignored', () => {
    const hub = parseHubIntegrationScripts({
      'test:integration': 'jest tests/integration --runInBand --verbose',
      'test:unit': 'jest tests/unit',
      'test:e2e': 'playwright test',
    });
    expect(hub.map((s) => s.name)).toEqual(['test:integration']);
    expect(integrationScriptViolations(hub, [], (rel) => rel === 'tests/integration')).toEqual([]);
  });

  it('live sweep: every integration script in both manifests resolves', () => {
    const hubPkg = JSON.parse(fs.readFileSync(path.join(HUB_ROOT, 'package.json'), 'utf8'));
    const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    const hub = parseHubIntegrationScripts(hubPkg.scripts);
    const root = parseRootPassthroughs(rootPkg.scripts);
    expect(hub.length).toBeGreaterThanOrEqual(10); // sanity: the per-area scripts exist
    expect(root.length).toBeGreaterThanOrEqual(10);

    const violations = integrationScriptViolations(hub, root, (rel) =>
      hasTests(path.join(HUB_ROOT, rel)),
    );
    expect(violations).toEqual([]);
  });
});
