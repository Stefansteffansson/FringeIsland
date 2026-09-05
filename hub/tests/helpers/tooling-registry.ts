import * as fs from 'fs';
import * as path from 'path';

/**
 * Tooling-registry rules (Cycle COR-E W5/W8 — Audit V AC5-4, AC5-8, AC5-9;
 * gate gaps GC-25 and GC-27).
 *
 * Two pure rule sets over the repository's tooling surface, consumed by
 * `tests/unit/platform/integration-scripts-resolve.test.ts` and
 * `tests/unit/platform/script-registry.test.ts`, which specify the behaviour
 * on fixtures and then sweep the live tree.
 *
 *  1. Every `test:integration:*` npm script resolves: the Hub's `jest <path>`
 *     scripts name a directory holding at least one test file, and the root
 *     manifest's `npm run <name> -w hub` passthroughs name a script the Hub
 *     manifest defines. (A path that matches zero tests exits green — the
 *     silent-zero trap that let `rls` / `rbac` point at nothing for months.)
 *
 *  2. Every script under `scripts/` and `hub/scripts/` has a row in
 *     `scripts/README.md`, keyed by its backticked repo-relative path, and any
 *     script that creates or deletes auth users says in that row how it tears
 *     down and censuses what it made (the 2026-09-04 "no leftover test
 *     accounts" rule, made mechanical).
 */

export type IntegrationScript = { name: string; target: string };
export type RootPassthrough = { name: string; hubScript: string };

/** Hub manifest: `"test:integration:x": "jest tests/integration/x --runInBand"` → { name, target }. */
export function parseHubIntegrationScripts(scripts: Record<string, string>): IntegrationScript[] {
  return Object.entries(scripts).flatMap(([name, cmd]) => {
    if (!name.startsWith('test:integration')) return [];
    const m = /\bjest\s+(tests\/integration(?:\/[\w.-]+)*)/.exec(cmd);
    return m ? [{ name, target: m[1] }] : [];
  });
}

/** Root manifest: `"test:integration:x": "npm run test:integration:x -w hub"` → { name, hubScript }. */
export function parseRootPassthroughs(scripts: Record<string, string>): RootPassthrough[] {
  return Object.entries(scripts).flatMap(([name, cmd]) => {
    if (!name.startsWith('test:integration')) return [];
    const m = /\bnpm run (\S+) -w hub\b/.exec(cmd);
    return m ? [{ name, hubScript: m[1] }] : [];
  });
}

export function integrationScriptViolations(
  hub: IntegrationScript[],
  root: RootPassthrough[],
  hasTests: (relDir: string) => boolean,
): string[] {
  const violations: string[] = [];
  for (const s of hub) {
    if (!hasTests(s.target)) violations.push(`${s.name} -> ${s.target} (no test files)`);
  }
  const defined = new Set(hub.map((s) => s.name));
  for (const r of root) {
    if (!defined.has(r.hubScript)) {
      violations.push(`root ${r.name} -> hub script ${r.hubScript} (undefined)`);
    }
  }
  return violations;
}

const SCRIPT_EXT = /\.(?:m?js|cjs|ts)$/;

/** Every script file under the given directories, as sorted repo-relative posix paths. */
export function listScripts(dirs: string[], repoRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (SCRIPT_EXT.test(entry.name)) {
        out.push(path.relative(repoRoot, abs).split(path.sep).join('/'));
      }
    }
  };
  for (const d of dirs) walk(d);
  return out.sort();
}

/** Registry rows: table lines whose FIRST backticked cell is the script's repo-relative path → the whole row. */
export function parseRegistryRows(readme: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of readme.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const m = /^\|\s*`([^`]+)`/.exec(line);
    if (m) rows.set(m[1], line);
  }
  return rows;
}

export function touchesAccounts(src: string): boolean {
  return /\bauth\.admin\.(?:createUser|deleteUser)\b/.test(src);
}

export function registryViolations(
  files: string[],
  rows: Map<string, string>,
  readSrc: (rel: string) => string,
): string[] {
  const violations: string[] = [];
  for (const rel of files) {
    const row = rows.get(rel);
    if (!row) {
      violations.push(`${rel}: no row in scripts/README.md`);
      continue;
    }
    if (touchesAccounts(readSrc(rel)) && !/teardown|census/i.test(row)) {
      violations.push(
        `${rel}: creates or deletes auth users but its registry row names no teardown or census`,
      );
    }
  }
  return violations;
}
