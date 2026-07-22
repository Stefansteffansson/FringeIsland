import { describe, it, expect } from '@jest/globals';
import {
  findDataAccess,
  isClientReachable,
  scanClientSurface,
  DATA_ACCESS_EXCEPTIONS,
} from '@/tests/helpers/outer-ring';

/**
 * W3 — Outer-ring conformance gate (Cycle COR-B, audit AC2-3).
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/outer-ring` — the rule it specifies has no implementation.
 * That absence IS finding AC2-3.
 *
 * ADR-U009 states the outer ring:
 *
 *     Database -> API route -> Frontend component
 *     Never: Database -> Frontend component directly
 *
 * ...and its consequences add: "Supabase client in the browser is acceptable
 * for real-time subscriptions but not for data mutations."
 *
 * Audit II verified the tree conformant — every client path is
 * `fetch('/api/...')`, and the only two browser-client imports are
 * auth/session. But nothing enforced it. The discipline was held by five
 * hand-written comments, each asserting the module is "not a direct
 * `supabase.from(...)` call (ADR-U009 / Hub CLAUDE.md narrow-exception rule)"
 * — in `lib/{account,consent,journal,profile}/client.ts` and
 * `components/profile/ProfileEditForm.tsx`.
 *
 * Five comments asserting a rule is precisely the condition the Groups retro
 * (2026-07-06) created the sibling route-policy gate to end: "route policy
 * that lived only in ADR prose drifted within one cycle." This closes the
 * outer ring the same way that gate closed route policy.
 *
 * Sibling gate: `route-policy-conformance.test.ts` covers runtime and
 * auth-verb policy on the route layer. This one covers layering on the client
 * layer. Neither overlaps.
 *
 * SCOPE AND ITS LIMIT (stated honestly): "browser-reachable" is decided by
 * heuristic, not by import-graph analysis — a file counts if it carries the
 * `'use client'` directive, lives under `components/`, or follows the repo's
 * own browser-module naming (`lib/**!/client.ts`, `lib/**!/*-client.ts`). That
 * covers every module AC2-3 named. A server module newly imported into a
 * client component would not be caught; closing that needs bundler-graph
 * analysis, which is deliberately out of scope here.
 */

describe('data-access detection', () => {
  it('flags a direct table read and a direct RPC call', () => {
    expect(findDataAccess(`const { data } = await supabase.from('users').select('*');`)).toEqual([
      "from('users')",
    ]);
    expect(findDataAccess(`await supabase.rpc('get_own_profile');`)).toEqual([
      "rpc('get_own_profile')",
    ]);
  });

  it('ignores prose in comments — the audit II false-positive trap', () => {
    // This is the exact shape of the five live compliance comments: they
    // contain the literal call inside prose asserting the opposite.
    const src = `
      /**
       * Reads through the BFF route, NOT a direct
       * \`supabase.from('users')\` call (ADR-U009).
       */
      // also not a supabase.rpc('get_own_profile') call
      export async function fetchProfile() {
        const res = await fetch('/api/profile/me');
        return res.json();
      }
    `;
    expect(findDataAccess(src)).toEqual([]);
  });

  it('does not confuse JS built-ins for table access', () => {
    expect(findDataAccess(`const a = Array.from('abc');`)).toEqual([]);
    expect(findDataAccess(`const b = Object.fromEntries(x);`)).toEqual([]);
    expect(findDataAccess(`Buffer.from('deadbeef', 'hex');`)).toEqual([]);
  });

  it('does not flag realtime channel subscriptions (permitted by ADR-U009)', () => {
    const src = `supabase.channel('room').on('broadcast', { event: 'hint' }, cb).subscribe();`;
    expect(findDataAccess(src)).toEqual([]);
  });
});

describe('client-reachability heuristic', () => {
  it('counts use-client modules, components, and the repo browser-module naming', () => {
    expect(isClientReachable('components/profile/ProfileEditForm.tsx', '')).toBe(true);
    expect(isClientReachable('lib/profile/client.ts', '')).toBe(true);
    expect(isClientReachable('lib/me/overview-client.ts', '')).toBe(true);
    expect(isClientReachable('app/groups/page.tsx', `'use client';\n`)).toBe(true);
  });

  it('does not count server modules', () => {
    expect(isClientReachable('lib/profile/queries.ts', '')).toBe(false);
    expect(isClientReachable('app/api/profile/me/route.ts', '')).toBe(false);
  });
});

describe('outer-ring conformance (ADR-U009, COR-B W3, audit AC2-3)', () => {
  const violations = scanClientSurface();

  it('finds a client surface to check', () => {
    // Sanity: a heuristic that matches nothing would pass vacuously forever.
    expect(scanClientSurface({ includeClean: true }).length).toBeGreaterThan(10);
  });

  it('no browser-reachable module reads the database directly', () => {
    const report = violations.map((v) => `  ${v.file}: ${v.hits.join(', ')}`).join('\n');
    expect(report).toBe('');
  });

  it('exception list stays honest (no stale entries)', () => {
    const all = scanClientSurface({ includeClean: true }).map((v) => v.file);
    const stale = DATA_ACCESS_EXCEPTIONS.filter((e) => !all.includes(e.file));
    expect(stale).toEqual([]);
  });

  it('every exception carries a justification', () => {
    const uncited = DATA_ACCESS_EXCEPTIONS.filter((e) => !e.reason?.trim()).map((e) => e.file);
    expect(uncited).toEqual([]);
  });
});
