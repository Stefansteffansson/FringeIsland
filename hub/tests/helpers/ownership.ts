import * as fs from 'fs';
import * as path from 'path';

/**
 * Ownership-manifest reader and the inner-ring direction rule (Cycle COR-B,
 * audit AC2-1 + AC2-2).
 *
 * One implementation, two callers:
 *   - `tests/unit/platform/ownership-direction-rule.test.ts` exercises it
 *     against synthetic bodies (fast, no DB, and the only way to demonstrate
 *     red — the live substrate is clean on this axis);
 *   - `tests/integration/platform/internal-api-conformance.test.ts` runs it
 *     over every live `pg_proc` body.
 *
 * The rule it encodes (ADR-U047 rule 3 + the anatomy's acyclicity rule):
 *   - a function may always reference its own service's tables;
 *   - Core may reference NO DS-owned table, except a cited
 *     vertical-composition carve-out (ADR-U047 Amendment 2);
 *   - a DS-N function may reference a DS-M table only when M < N (downward)
 *     AND the pair is cited in `exceptions.crossServiceReads`;
 *   - upward references are never allowed — "nothing depends on DS-7";
 *   - `public.notifications` is never a crossing (ADR-U048 / ruling R-1): it
 *     is not classified `DS-*` in the manifest, so it never enters the check.
 *
 * Ownership comes from `supabase/ownership.manifest.json` — never from a
 * literal array here. That is the AC2-2 fix: one source, completeness-gated.
 */

const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../../supabase/ownership.manifest.json',
);

export type Owner = string; // 'DS-1'..'DS-7' | 'PC-1'..'PC-4' | 'vertical:<name>'

export type OwnershipManifest = {
  version: number;
  tables: Record<string, { owner: Owner; note?: string }>;
  functions: Record<string, string[]>;
  lifecyclePrefixRule: string;
  exceptions: {
    verticalComposition: { function: string; vertical: string; citation: string }[];
    crossServiceReads: { function: string; table: string; citation: string }[];
  };
};

export type ViolationKind =
  | 'core-to-domain'
  | 'uncited-cross-service'
  | 'upward-cross-service';

export type Violation = {
  table: string;
  tableOwner: Owner;
  functionOwner: Owner | 'CORE';
  kind: ViolationKind;
};

let cached: OwnershipManifest | null = null;

export function loadOwnershipManifest(): OwnershipManifest {
  // Deliberately unguarded — a missing or malformed manifest must fail loudly
  // rather than degrade into a false green.
  if (!cached) {
    cached = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as OwnershipManifest;
  }
  return cached;
}

/** Table names owned by a domain service. Excludes PC and vertical substrates. */
export function dsTables(): string[] {
  const m = loadOwnershipManifest();
  return Object.entries(m.tables)
    .filter(([, v]) => /^DS-\d$/.test(v.owner))
    .map(([t]) => t)
    .sort();
}

export function tableOwner(table: string): Owner | null {
  return loadOwnershipManifest().tables[table]?.owner ?? null;
}

/**
 * The owning service of a function: an explicit manifest entry, else the
 * `ds{N}_lifecycle_` prefix rule (ADR-U047 rule 1, the digit carries the
 * service), else Core. Core is the strict default — an unclassified function
 * gets the tightest rule, so forgetting to classify fails closed.
 */
export function functionOwner(name: string): Owner | 'CORE' {
  const m = loadOwnershipManifest();
  for (const [svc, fns] of Object.entries(m.functions)) {
    if (fns.includes(name)) return svc;
  }
  const lifecycle = new RegExp(m.lifecyclePrefixRule).test(name)
    ? name.match(/^ds(\d+)_lifecycle_/)
    : null;
  if (lifecycle) return `DS-${lifecycle[1]}`;
  return 'CORE';
}

/**
 * Strip SQL comments before matching. Audit II's method note records why this
 * is mandatory: prose that *describes* a crossing (including the ADR-U009
 * compliance comments in `hub/lib/*!/client.ts`) reads as the crossing itself.
 * Conservative: a `--` inside a string literal is stripped too; no live
 * function has that shape.
 */
export function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const i = line.indexOf('--');
      return i >= 0 ? line.slice(0, i) : line;
    })
    .join('\n');
}

const serviceNumber = (owner: string): number => Number(owner.replace('DS-', ''));

/**
 * Every ownership violation in one function body. Empty array = conformant.
 * Schema-qualified matching only (ADR-U047 A2): `search_path = ''` is
 * mandatory in substrate code, so a real relation reference is always
 * `public.<table>`; a bare name is a jsonb key or identifier.
 */
export function classifyReferences(fnName: string, body: string): Violation[] {
  const m = loadOwnershipManifest();
  const clean = stripComments(body ?? '');
  const owner = functionOwner(fnName);
  // Core-class = the four PC areas (the ADM-A GC-13 split, TASK-ADMA-01) plus
  // the fail-closed CORE fallback for anything unclassified. All carry the
  // strictest rule: no DS-owned table, vertical-composition carve-out excepted.
  const coreClass = owner === 'CORE' || /^PC-\d$/.test(owner);

  const referenced = dsTables().filter((t) =>
    new RegExp(`\\bpublic\\.${t}\\b`, 'i').test(clean),
  );

  const verticallyComposed = m.exceptions.verticalComposition.some(
    (e) => e.function === fnName,
  );

  const violations: Violation[] = [];

  for (const table of referenced) {
    const tOwner = tableOwner(table);
    if (!tOwner || tOwner === owner) continue; // own service — always fine

    if (coreClass) {
      // ADR-U047 Amendment 2: a platform function fulfilling a cross-cutting
      // vertical obligation may compose domain READ contracts. Cited per
      // function in the manifest, never a blanket Core exemption.
      if (verticallyComposed) continue;
      violations.push({ table, tableOwner: tOwner, functionOwner: owner, kind: 'core-to-domain' });
      continue;
    }

    // Domain-to-domain: direction first, citation second.
    const from = serviceNumber(owner);
    const to = serviceNumber(tOwner);

    if (to > from) {
      // Upward — inverts the dependency direction. Never allowed, cited or not.
      violations.push({
        table,
        tableOwner: tOwner,
        functionOwner: owner,
        kind: 'upward-cross-service',
      });
      continue;
    }

    const cited = m.exceptions.crossServiceReads.some(
      (e) => e.function === fnName && e.table === table,
    );
    if (!cited) {
      violations.push({
        table,
        tableOwner: tOwner,
        functionOwner: owner,
        kind: 'uncited-cross-service',
      });
    }
  }

  return violations;
}

/** Human-readable one-liner for gate reports. */
export function formatViolation(fn: string, args: string, v: Violation): string {
  return `  - [${v.kind}] ${fn}(${args})  ${v.functionOwner} -> ${v.table} (${v.tableOwner})`;
}
