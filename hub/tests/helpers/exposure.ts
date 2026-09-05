import * as fs from 'fs';
import * as path from 'path';

/**
 * The exposure and client-access registers (Cycle COR-E W6 — Audit V GC-29,
 * AC5-17, AC5-O7; ruling R-15).
 *
 * `supabase/ownership.manifest.json` gained two sections on 2026-09-05:
 *
 *   exposure.{client,sealed,trigger,internal} — every public function's class:
 *     client   EXECUTE granted to `authenticated` (the Platform API surface
 *              PostgREST serves; `anon` never)
 *     sealed   EXECUTE revoked from client roles by doctrine (declared-
 *              composition bodies, erasure primitives, pruners, lifecycle
 *              handlers)
 *     trigger  trigger-returning — not RPC-callable whatever its grant
 *     internal helpers callable only from other functions; EXECUTE revoked
 *
 *   clientAccess.contractsOnly — every table with RLS on and ZERO policies,
 *     with the reason deny-all-by-absence is its posture.
 *
 * Both are pure rule sets here; `tests/unit/platform/exposure-register-rule.test.ts`
 * specifies them on fixtures and `tests/integration/platform/exposure-register-conformance.test.ts`
 * sweeps the live catalog. Postgres's default PUBLIC EXECUTE reaches
 * `authenticated`, so a function shipped without its REVOKE lands in the wrong
 * class here and fails red — the outer ring's platform side, pinned.
 */

export type ExposureClass = 'client' | 'sealed' | 'trigger' | 'internal';
export const EXPOSURE_CLASSES: readonly ExposureClass[] = ['client', 'sealed', 'trigger', 'internal'];

export type ExposureRegister = { note?: string } & Record<ExposureClass, string[]>;
export type LiveFunction = { name: string; rettype: string; anonExec: boolean; authExec: boolean };

export type ClientAccessRegister = { note?: string; contractsOnly: Record<string, string> };
export type LiveTable = { name: string; policies: number };

const MANIFEST_PATH = path.resolve(__dirname, '../../../supabase/ownership.manifest.json');

function loadManifest(): { exposure?: ExposureRegister; clientAccess?: ClientAccessRegister } {
  // Deliberately unguarded: a missing manifest must fail the suite loudly.
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

export function loadExposureRegister(): ExposureRegister {
  const m = loadManifest();
  if (!m.exposure) throw new Error('ownership.manifest.json has no `exposure` register (COR-E W6, GC-29)');
  return m.exposure;
}

export function loadClientAccessRegister(): ClientAccessRegister {
  const m = loadManifest();
  if (!m.clientAccess) throw new Error('ownership.manifest.json has no `clientAccess` register (COR-E W6, AC5-17)');
  return m.clientAccess;
}

/** Every way the live EXECUTE grants disagree with the register. Empty = conformant. */
export function exposureViolations(register: ExposureRegister, live: LiveFunction[]): string[] {
  const violations: string[] = [];

  const declared = new Map<string, ExposureClass[]>();
  for (const cls of EXPOSURE_CLASSES) {
    for (const name of register[cls] ?? []) declared.set(name, [...(declared.get(name) ?? []), cls]);
  }

  for (const [name, classes] of declared) {
    if (classes.length > 1) violations.push(`${name}: declared in more than one class (${classes.join(', ')})`);
  }

  const liveNames = new Set(live.map((f) => f.name));
  for (const [name, classes] of declared) {
    if (!liveNames.has(name)) violations.push(`${name}: registered ${classes[0]} but no such function exists`);
  }

  for (const f of live) {
    const classes = declared.get(f.name);
    if (!classes) {
      violations.push(`${f.name}: live but not in the exposure register`);
      continue;
    }
    if (classes.length > 1) continue; // reported above
    const cls = classes[0];

    if (f.anonExec) violations.push(`${f.name}: executable by anon`);

    const isTrigger = f.rettype === 'trigger';
    if (cls === 'trigger' && !isTrigger) {
      violations.push(`${f.name}: registered trigger but returns ${f.rettype}`);
    } else if (cls !== 'trigger' && isTrigger) {
      violations.push(`${f.name}: returns trigger but registered ${cls}`);
    } else if (cls === 'client' && !f.authExec) {
      violations.push(`${f.name}: registered client but authenticated cannot execute it`);
    } else if ((cls === 'sealed' || cls === 'internal') && f.authExec) {
      violations.push(`${f.name}: registered ${cls} but authenticated can execute it — a REVOKE is missing`);
    }
  }

  return violations;
}

/** Every way the zero-policy posture disagrees with the register. Empty = conformant. */
export function clientAccessViolations(register: ClientAccessRegister, live: LiveTable[]): string[] {
  const violations: string[] = [];
  const declared = register.contractsOnly ?? {};
  const policies = new Map(live.map((t) => [t.name, t.policies]));

  for (const t of live) {
    if (t.policies === 0 && !(t.name in declared)) {
      violations.push(
        `${t.name}: RLS on with zero policies but not declared contracts-only — declare it with a reason, or add policies`,
      );
    }
  }

  for (const [name, reason] of Object.entries(declared)) {
    if (!policies.has(name)) {
      violations.push(`${name}: declared contracts-only but no such table`);
      continue;
    }
    if (!reason || !reason.trim()) violations.push(`${name}: contracts-only needs a reason`);
    const n = policies.get(name) ?? 0;
    if (n > 0) violations.push(`${name}: declared contracts-only but has ${n} policy(ies)`);
  }

  return violations;
}
