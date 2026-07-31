import * as fs from 'fs';
import * as path from 'path';

/**
 * Outer-ring rule implementation (Cycle COR-B W3, audit AC2-3).
 *
 * ADR-U009: `Database -> API route -> Frontend component`, never
 * `Database -> Frontend component directly`. Its consequences permit the
 * browser Supabase client for real-time subscriptions, but not for data
 * access — so `.channel(...)` is fine and `.from(...)` / `.rpc(...)` are not.
 *
 * Consumed by `tests/unit/app/outer-ring-conformance.test.ts`, which
 * specifies the behaviour on fixtures and then sweeps the live tree.
 */

const HUB_ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['app', 'components', 'lib'];

export type OuterRingViolation = { file: string; hits: string[] };

/**
 * Files permitted to reach the substrate directly from browser-reachable code.
 * ADR-U009 allows exactly one class (real-time subscriptions); anything added
 * here needs a reason, and the gate asserts both that the entry is still live
 * and that it carries one.
 *
 * Empty today: the realtime layer uses `.channel(...)` broadcast, which is not
 * data access, so it needs no exception.
 */
export const DATA_ACCESS_EXCEPTIONS: { file: string; reason: string }[] = [];

/**
 * Strip comments and string-embedded prose before matching. Mandatory: the
 * five live ADR-U009 compliance comments contain the literal
 * `supabase.from('users')` inside prose asserting the module does NOT do that
 * (audit II method note, trap 2). Matching raw source reports the codebase's
 * own documentation as violations.
 */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Built-ins whose `.from(` is unrelated to data access.
const BUILTIN_RECEIVERS = /(Array|Object|Buffer|Date|Set|Map|String|Number)$/;

/**
 * Direct data-access call sites in a source file. Returns readable hits like
 * `from('users')` — empty array means conformant.
 */
export function findDataAccess(src: string): string[] {
  const clean = stripComments(src);
  const hits: string[] = [];

  for (const m of clean.matchAll(/([\w.]*)\.(from|rpc)\(\s*(['"`])([^'"`]*)\3/g)) {
    const [, receiver, method, , arg] = m;
    // `Array.from('abc')` and friends are not table access.
    if (method === 'from' && BUILTIN_RECEIVERS.test(receiver ?? '')) continue;
    hits.push(`${method}('${arg}')`);
  }

  return hits;
}

/**
 * Whether a module can end up in the browser bundle.
 *
 * Heuristic, and deliberately so — a precise answer needs bundler-graph
 * analysis. Three signals, covering every module audit II named:
 *   1. the `'use client'` directive;
 *   2. anything under `components/` (all of it renders);
 *   3. the repo's own browser-module naming: `lib/**\/client.ts` and
 *      `lib/**\/*-client.ts` (the `queries.ts` / `client.ts` split is the
 *      established server/browser convention in `hub/lib`).
 */
export function isClientReachable(relPath: string, src: string): boolean {
  const p = relPath.replace(/\\/g, '/');
  if (/^components\//.test(p)) return true;
  if (/^lib\/.*(^|\/)(client\.ts|[\w-]+-client\.ts)$/.test(p)) return true;
  // COR-C W7 (GC-7 / AC3-12): the realtime family HOLDS the browser socket —
  // `lib/realtime/manager.ts` carried no directive and no *client.ts name, so
  // the one module where a violation would be written was the one module the
  // scan never visited.
  if (/^lib\/realtime\//.test(p)) return true;
  if (/^\s*['"]use client['"]/.test(src)) return true;
  return false;
}

/**
 * Value-import specifiers in a module (COR-C W7, GC-7): the edges along which
 * code actually ships to the browser. `import type` / `export type` are NOT
 * edges — type-only imports are erased at build (the A-NTF injection pattern
 * depends on exactly that: server query modules are type-imported by client
 * wrappers and must never enter this closure).
 */
export function valueImportSpecifiers(src: string): string[] {
  const clean = stripComments(src);
  const specs: string[] = [];
  const patterns = [
    /import\s+(?!type[\s{])[\w*{}\s,$]+?\s+from\s+['"]([^'"]+)['"]/g, // import x from
    /import\s+['"]([^'"]+)['"]/g, // side-effect import
    /import\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import
    /export\s+(?!type[\s{])[\w*{}\s,$]+?\s+from\s+['"]([^'"]+)['"]/g, // re-export
  ];
  for (const re of patterns) {
    for (const m of clean.matchAll(re)) specs.push(m[1]);
  }
  return specs;
}

/** Resolve a specifier to a repo-relative scanned file, or null (packages,
 *  assets, and anything outside the scan dirs resolve to null). */
function resolveImport(fromRel: string, spec: string, files: Set<string>): string | null {
  let base: string | null = null;
  if (spec.startsWith('@/')) base = spec.slice(2);
  else if (spec.startsWith('.')) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  }
  if (!base) return null;
  for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (files.has(cand)) return cand;
  }
  return null;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

/**
 * Sweep the browser-reachable surface. By default returns only violations;
 * `includeClean` returns every scanned file (used by the sanity and
 * stale-exception assertions).
 */
export function scanClientSurface(opts: { includeClean?: boolean } = {}): OuterRingViolation[] {
  const results: OuterRingViolation[] = [];
  const excepted = new Set(DATA_ACCESS_EXCEPTIONS.map((e) => e.file));

  // Collect every scannable module first, then close the reachable set over
  // VALUE imports (COR-C W7, GC-7): anything a client-reachable module
  // value-imports ships in the same bundle, directive or not — the transitive
  // half the original heuristic deferred to "bundler-graph analysis".
  const all = new Map<string, string>();
  for (const dir of SCAN_DIRS) {
    for (const abs of walk(path.join(HUB_ROOT, dir))) {
      const rel = path.relative(HUB_ROOT, abs).replace(/\\/g, '/');
      all.set(rel, fs.readFileSync(abs, 'utf8'));
    }
  }
  const fileSet = new Set(all.keys());

  const reachable = new Set<string>();
  const queue: string[] = [];
  for (const [rel, src] of all) {
    if (isClientReachable(rel, src)) {
      reachable.add(rel);
      queue.push(rel);
    }
  }
  while (queue.length) {
    const rel = queue.pop()!;
    for (const spec of valueImportSpecifiers(all.get(rel)!)) {
      const target = resolveImport(rel, spec, fileSet);
      if (target && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  for (const rel of [...reachable].sort()) {
    const hits = findDataAccess(all.get(rel)!);
    if (opts.includeClean) {
      results.push({ file: rel, hits });
    } else if (hits.length && !excepted.has(rel)) {
      results.push({ file: rel, hits });
    }
  }

  return results;
}
