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
    verticalComposition: {
      function: string;
      vertical: string;
      citation: string;
      composes?: string[];
    }[];
    crossServiceReads: { function: string; table: string; citation: string }[];
    // ADR-U047 Amendment 3 (Cycle COR-D): the declared-composition class.
    // Optional so the gate reads an un-amended manifest as "nothing declared"
    // — absence fails red, never green.
    declaredCompositions?: {
      caller: string;
      callee: string;
      vertical: string;
      mutation: boolean;
      citation: string;
    }[];
    // ADR-U047 A3: the lifecycle-fact registry — the vocabulary's single
    // living home. A core call to a ds*_lifecycle_* function absent from this
    // registry is an undeclared fact (audit AC4-4's class).
    lifecycleFacts?: { function: string; citation: string }[];
    // Reserved, mirror of crossServiceReads for the call axis. Empty today.
    crossServiceCalls?: { function: string; callee: string; citation: string }[];
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

export type InvocationViolationKind =
  | 'undeclared-core-composition' // core-class calling a DS function that is neither a lifecycle fact nor declared
  | 'unregistered-lifecycle-fact' // core-class calling a ds*_lifecycle_* function absent from the registry
  | 'upward-cross-service-call'
  | 'uncited-cross-service-call';

export type InvocationViolation = {
  callee: string;
  calleeOwner: Owner;
  functionOwner: Owner | 'CORE';
  kind: InvocationViolationKind;
};

/**
 * The invocation axis of ADR-U047 rule 3 (Cycle COR-D W2, audit GC-15).
 *
 * `classifyReferences` above enforces only the TABLE half of rule 3; the
 * clause "core may invoke ds*_lifecycle_* functions and nothing else
 * domain-side" had no mechanical check — which is how four undeclared
 * PC-4 -> ds5_moderation_* calls and PC-1 -> ds3_stats_snapshot() shipped
 * green (AC4-2/AC4-3), and how the platform-ops area gate came to accept them
 * on the ground "conformance gates green on the shape".
 *
 * The rule, stated once:
 *   - core-class may call `ds*_lifecycle_*` facts — each must be in the
 *     manifest's `lifecycleFacts` registry (the ADR-declared vocabulary);
 *   - core-class may call a DS function ONLY under a per-pair declaration:
 *     `exceptions.declaredCompositions` (ADR-U047 A3 class) or the caller's
 *     `verticalComposition.composes` list (A2 class);
 *   - DS -> other-DS calls mirror the table axis: downward + cited only;
 *   - own-service calls are always fine.
 *
 * Candidate callees are supplied by the caller (the live catalog in the
 * integration half; explicit fixtures in the unit half). Matching is
 * schema-qualified (`public.<fn>(`) after comment-stripping, same rationale
 * as the table axis (search_path='' makes real calls schema-qualified).
 * CAVEAT, recorded honestly: dynamic SQL (`EXECUTE format(...)`) would evade
 * this static match; none exists in the live substrate today, absence not
 * proven — Audit IV honesty log.
 */
export function classifyInvocations(
  fnName: string,
  body: string,
  candidateCallees: string[],
): InvocationViolation[] {
  const m = loadOwnershipManifest();
  const clean = stripComments(body ?? '');
  const owner = functionOwner(fnName);
  const coreClass = owner === 'CORE' || /^PC-\d$/.test(owner);

  const declared = m.exceptions.declaredCompositions ?? [];
  const composed = new Set(
    m.exceptions.verticalComposition
      .filter((e) => e.function === fnName)
      .flatMap((e) => e.composes ?? []),
  );
  const factNames = new Set((m.exceptions.lifecycleFacts ?? []).map((f) => f.function));

  const violations: InvocationViolation[] = [];

  const dsCallees = candidateCallees.filter((f) => /^DS-\d$/.test(String(functionOwner(f))));

  for (const callee of dsCallees) {
    if (callee === fnName) continue;
    if (!new RegExp(`\\bpublic\\.${callee}\\s*\\(`, 'i').test(clean)) continue;

    const calleeOwner = functionOwner(callee) as Owner;
    if (calleeOwner === owner) continue; // own service — always fine

    if (coreClass) {
      if (/^ds\d+_lifecycle_/.test(callee)) {
        // The sanctioned seam — but the fact must be registered. An empty
        // registry (pre-A3 manifest) keeps this arm dormant rather than
        // flooding red on the four original facts.
        if (factNames.size > 0 && !factNames.has(callee)) {
          violations.push({
            callee,
            calleeOwner,
            functionOwner: owner,
            kind: 'unregistered-lifecycle-fact',
          });
        }
        continue;
      }
      const isDeclared =
        declared.some((d) => d.caller === fnName && d.callee === callee) || composed.has(callee);
      if (!isDeclared) {
        violations.push({
          callee,
          calleeOwner,
          functionOwner: owner,
          kind: 'undeclared-core-composition',
        });
      }
      continue;
    }

    // DS caller -> DS callee of another service: direction first, citation second.
    const from = serviceNumber(owner);
    const to = serviceNumber(calleeOwner);
    if (to > from) {
      violations.push({
        callee,
        calleeOwner,
        functionOwner: owner,
        kind: 'upward-cross-service-call',
      });
      continue;
    }
    const cited = (m.exceptions.crossServiceCalls ?? []).some(
      (e) => e.function === fnName && e.callee === callee,
    );
    if (!cited) {
      violations.push({
        callee,
        calleeOwner,
        functionOwner: owner,
        kind: 'uncited-cross-service-call',
      });
    }
  }

  return violations;
}

/** Human-readable one-liner for invocation-gate reports. */
export function formatInvocationViolation(
  fn: string,
  args: string,
  v: InvocationViolation,
): string {
  return `  - [${v.kind}] ${fn}(${args})  ${v.functionOwner} -> ${v.callee}() (${v.calleeOwner})`;
}

// ---------------------------------------------------------------------------
// COR-E W6 — GC-28: the qualified-only blind spot, closed (Audit V addendum).
//
// `classifyReferences` and `classifyInvocations` match `public.<name>` by
// design (ADR-U047 A2: `search_path` is pinned, so a real reference is always
// qualified). Nothing asserted the "always" — a bare `from groups` would have
// passed both gates green. These three keep the live count at zero. Specified
// on fixtures in `tests/unit/platform/bare-reference-rule.test.ts`; swept live
// in `tests/integration/platform/internal-api-conformance.test.ts`.
// ---------------------------------------------------------------------------

/**
 * Comments AND single-quoted string literals stripped (`''` escapes handled).
 * A table name inside a `raise exception '…'` message or a `jsonb_build_object`
 * key is prose, not a reference — Audit V read 24 such mentions.
 */
export function stripLiterals(src: string): string {
  return stripComments(src ?? '').replace(/'(?:[^']|'')*'/g, "''");
}

export type BareReference = { kind: 'table' | 'function'; name: string };

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every manifest table name and every classified function name that appears
 * in `body` WITHOUT a schema prefix (any schema counts as qualified — `public.`,
 * `auth.`, `cron.`). Identifiers that merely contain the name (`p_groups`,
 * `v_users_count`) are not matches; a function calling itself is not a match.
 */
export function bareReferences(
  fnName: string,
  body: string,
  opts?: { tables?: string[]; functions?: string[] },
): BareReference[] {
  const m = loadOwnershipManifest();
  const tables = opts?.tables ?? Object.keys(m.tables);
  const functions = opts?.functions ?? Object.values(m.functions).flat();
  const clean = stripLiterals(body);
  const out: BareReference[] = [];
  for (const t of tables) {
    if (new RegExp(`(?:^|[^\\w.])${escapeRe(t)}\\b`, 'i').test(clean)) out.push({ kind: 'table', name: t });
  }
  for (const f of functions) {
    if (f === fnName) continue;
    if (new RegExp(`(?:^|[^\\w.])${escapeRe(f)}\\s*\\(`, 'i').test(clean)) out.push({ kind: 'function', name: f });
  }
  return out;
}

/**
 * Lines that build SQL at runtime — `EXECUTE format(...)`, `EXECUTE '…'`,
 * `EXECUTE $q$…`, `EXECUTE v_sql USING/INTO …`. Dynamic SQL evades every
 * static ring check, so its absence is asserted on every run.
 */
export function dynamicSqlSites(body: string): string[] {
  return stripComments(body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /\bEXECUTE\s+(?:format\s*\(|'|\$|[a-z_]\w*\s*(?:;|using\b|into\b))/i.test(l));
}
