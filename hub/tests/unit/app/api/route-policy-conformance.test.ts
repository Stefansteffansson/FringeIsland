import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Route-policy conformance (ADR-U036 Amendment 2 / ADR-U037) — the build-time
 * gate from the Groups retro (2026-07-06). Route policy that lived only in ADR
 * prose drifted within one cycle: G-F shipped getClaims-on-mutation and
 * Edge-on-mutation-only routes, caught only by the later audit (fixed in
 * PR #106). This suite walks every hub/app/api route file and asserts the
 * matrix statically, so that drift class fails red at build time. Green here
 * replaces the manual Route-policy DoD rows in the feature-development skill.
 *
 * The matrix (post edge→Node migration, ADR-U036 Amendment 2):
 *  - a route file declares NO `runtime` and NO `preferredRegion` export —
 *    every route runs on the platform-default Node runtime (Vercel deprecated
 *    the Edge runtime; Fluid in-instance concurrency is Node-only and is the
 *    fan-out fix). The region pin lives in hub/vercel.json alone, preserving
 *    ADR-U035 co-location. A runtime export reappearing is policy drift;
 *  - a file exporting a mutating verb (POST/PATCH/PUT/DELETE) must call
 *    getUser() — server-verified auth where state changes (ADR-U037) — unless
 *    it is a documented pre-auth route (no session exists to verify);
 *  - a file exporting a GET reads identity locally via getClaims()/
 *    getVerifiedUserId() — read paths must not pay the auth-server round-trip
 *    (ADR-U037) — unless listed in SERVER_VERIFIED_GETS with justification.
 */

const API_ROOT = path.resolve(__dirname, '../../../../app/api');

// Documented exceptions. Adding an entry requires the matching justification
// in the feature spec's Implementation notes (Route-policy DoD).
const PRE_AUTH_MUTATIONS = new Set([
  'auth/signup', // account creation — no session exists yet to verify
]);
const SERVER_VERIFIED_GETS = new Set([
  'account/export', // click-triggered document assembly; deliberately server-verified with getUser() (ADR-U036)
]);

const MUTATING = ['POST', 'PATCH', 'PUT', 'DELETE'];

interface RouteInfo {
  id: string;
  methods: string[];
  hasRuntimeExport: boolean;
  hasRegionExport: boolean;
  hasGetUser: boolean;
  hasLocalClaimsRead: boolean;
}

function collectRoutes(dir: string = API_ROOT): RouteInfo[] {
  const routes: RouteInfo[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...collectRoutes(p));
    } else if (entry.name === 'route.ts') {
      const src = fs.readFileSync(p, 'utf8');
      const methods = [
        ...src.matchAll(/export\s+(?:const|(?:async\s+)?function)\s+(GET|POST|PATCH|PUT|DELETE)\b/g),
      ].map((m) => m[1]);
      routes.push({
        id: path
          .relative(API_ROOT, p)
          .replace(/\\/g, '/')
          .replace(/\/route\.ts$/, ''),
        methods,
        hasRuntimeExport: /export\s+const\s+runtime\s*=/.test(src),
        hasRegionExport: /export\s+const\s+preferredRegion\s*=/.test(src),
        hasGetUser: src.includes('getUser('),
        hasLocalClaimsRead: src.includes('getClaims(') || src.includes('getVerifiedUserId('),
      });
    }
  }
  return routes;
}

const routes = collectRoutes();
const mutating = (r: RouteInfo) => r.methods.some((m) => MUTATING.includes(m));

describe('route-policy conformance (ADR-U036 Amendment 2 / ADR-U037)', () => {
  it('finds the API surface', () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((r) => r.methods.length > 0)).toBe(true);
  });

  it('route files declare no runtime/region exports — unified Node runtime, region pinned in vercel.json (ADR-U036 Amendment 2)', () => {
    const violations = routes
      .flatMap((r) => [
        ...(r.hasRuntimeExport ? [`${r.id} declares a runtime export`] : []),
        ...(r.hasRegionExport ? [`${r.id} declares a preferredRegion export`] : []),
      ]);
    expect(violations).toEqual([]);
  });

  it('every mutating route file authenticates with getUser() (ADR-U037)', () => {
    const violations = routes
      .filter((r) => mutating(r) && !PRE_AUTH_MUTATIONS.has(r.id) && !r.hasGetUser)
      .map((r) => `${r.id} [${r.methods.join(',')}] mutates without getUser()`);
    expect(violations).toEqual([]);
  });

  it('GET-exporting route files read identity locally via getClaims()/getVerifiedUserId() (ADR-U037)', () => {
    const violations = routes
      .filter(
        (r) =>
          r.methods.includes('GET') && !SERVER_VERIFIED_GETS.has(r.id) && !r.hasLocalClaimsRead,
      )
      .map((r) => `${r.id} exports a GET without a local identity read`);
    expect(violations).toEqual([]);
  });

  it('exception lists stay honest (no stale entries)', () => {
    const ids = new Set(routes.map((r) => r.id));
    const stale = [...PRE_AUTH_MUTATIONS, ...SERVER_VERIFIED_GETS].filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });
});
