import { describe, it, expect } from '@jest/globals';
import {
  exposureViolations,
  clientAccessViolations,
  type ExposureRegister,
  type LiveFunction,
  type ClientAccessRegister,
  type LiveTable,
} from '@/tests/helpers/exposure';

/**
 * COR-E W6 — the exposure and client-access registers, fixture half
 * (Audit V AC5-17, AC5-O7, GC-29; R-15).
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/exposure`.
 *
 * GC-29: Postgres's default PUBLIC EXECUTE reaches `authenticated`; the anon
 * lockdown gate cannot see it; a function shipped without its REVOKE becomes
 * RPC-callable by every signed-in session, silently. The sealed set was pinned
 * by doctrine; the EXPOSED set was pinned nowhere. The register declares every
 * function's class — client / sealed / trigger / internal — and the live
 * grants must match both ways. AC5-17: a table with RLS on and zero policies
 * is deny-all by absence; declared, that is a posture; undeclared, it is
 * indistinguishable from a forgotten policy.
 *
 * The live half is `tests/integration/platform/exposure-register-conformance.test.ts`.
 */

const register: ExposureRegister = {
  client: ['get_thing', 'do_thing'],
  sealed: ['_erase_thing'],
  trigger: ['on_thing_insert'],
  internal: ['_thing_helper'],
};

const fn = (name: string, over: Partial<LiveFunction> = {}): LiveFunction => ({
  name,
  rettype: 'jsonb',
  anonExec: false,
  authExec: false,
  ...over,
});

const clean: LiveFunction[] = [
  fn('get_thing', { authExec: true }),
  fn('do_thing', { authExec: true, rettype: 'void' }),
  fn('_erase_thing'),
  fn('on_thing_insert', { rettype: 'trigger', authExec: true }), // trigger fns may carry the default grant; not RPC-callable
  fn('_thing_helper'),
];

describe('Exposure register — the outer ring pinned on the platform side (COR-E W6, GC-29)', () => {
  it('fixture: a register that matches the live grants both ways has no violations', () => {
    expect(exposureViolations(register, clean)).toEqual([]);
  });

  it('fixture: a live function absent from the register IS caught (the silent-default class)', () => {
    const live = [...clean, fn('new_helper_nobody_declared', { authExec: true })];
    expect(exposureViolations(register, live)).toEqual([
      'new_helper_nobody_declared: live but not in the exposure register',
    ]);
  });

  it('fixture: a sealed or internal function that authenticated can execute IS caught — the missing REVOKE', () => {
    const live = clean.map((f) => (f.name === '_erase_thing' ? { ...f, authExec: true } : f));
    expect(exposureViolations(register, live)).toEqual([
      '_erase_thing: registered sealed but authenticated can execute it — a REVOKE is missing',
    ]);
  });

  it('fixture: a client function authenticated cannot execute IS caught (a contract nobody can call)', () => {
    const live = clean.map((f) => (f.name === 'do_thing' ? { ...f, authExec: false } : f));
    expect(exposureViolations(register, live)).toEqual([
      'do_thing: registered client but authenticated cannot execute it',
    ]);
  });

  it('fixture: anything anon can execute IS caught, whatever its class', () => {
    const live = clean.map((f) => (f.name === 'get_thing' ? { ...f, anonExec: true } : f));
    expect(exposureViolations(register, live)).toEqual(['get_thing: executable by anon']);
  });

  it('fixture: trigger class is decided by the return type, both ways', () => {
    const live = clean.map((f) =>
      f.name === 'on_thing_insert' ? { ...f, rettype: 'void' } : f.name === '_thing_helper' ? { ...f, rettype: 'trigger' } : f,
    );
    expect(exposureViolations(register, live)).toEqual([
      'on_thing_insert: registered trigger but returns void',
      '_thing_helper: returns trigger but registered internal',
    ]);
  });

  it('fixture: stale and duplicate register entries ARE caught', () => {
    const dup: ExposureRegister = { ...register, internal: ['_thing_helper', 'get_thing'] };
    const live = clean.filter((f) => f.name !== '_erase_thing');
    expect(exposureViolations(dup, live)).toEqual([
      'get_thing: declared in more than one class (client, internal)',
      '_erase_thing: registered sealed but no such function exists',
    ]);
  });
});

describe('Client-access register — zero-policy tables are declared, never assumed (COR-E W6, AC5-17)', () => {
  const access: ClientAccessRegister = {
    contractsOnly: {
      telemetry_events: 'deny-all by design (ADR-U052); one SECURITY DEFINER recorder writes',
    },
  };
  const tables: LiveTable[] = [
    { name: 'users', policies: 3 },
    { name: 'telemetry_events', policies: 0 },
  ];

  it('fixture: a declared zero-policy table and a policied table pass', () => {
    expect(clientAccessViolations(access, tables)).toEqual([]);
  });

  it('fixture: an undeclared zero-policy table IS caught', () => {
    expect(clientAccessViolations(access, [...tables, { name: 'new_log', policies: 0 }])).toEqual([
      'new_log: RLS on with zero policies but not declared contracts-only — declare it with a reason, or add policies',
    ]);
  });

  it('fixture: a declared contracts-only table that grew a policy IS caught; so is a stale or reasonless entry', () => {
    const grew = tables.map((t) => (t.name === 'telemetry_events' ? { ...t, policies: 1 } : t));
    expect(clientAccessViolations(access, grew)).toEqual([
      'telemetry_events: declared contracts-only but has 1 policy(ies)',
    ]);
    expect(
      clientAccessViolations({ contractsOnly: { ...access.contractsOnly, ghost: 'x' } }, tables),
    ).toEqual(['ghost: declared contracts-only but no such table']);
    expect(clientAccessViolations({ contractsOnly: { telemetry_events: '' } }, tables)).toEqual([
      'telemetry_events: contracts-only needs a reason',
    ]);
  });
});
