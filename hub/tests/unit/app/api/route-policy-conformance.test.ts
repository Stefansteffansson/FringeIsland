import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Route-policy conformance (ADR-U036 / ADR-U037) — the build-time gate from
 * the Groups retro (2026-07-06). Route policy that lived only in ADR prose
 * drifted within one cycle: G-F shipped getClaims-on-mutation and
 * Edge-on-mutation-only routes, caught only by the later audit (fixed in
 * PR #106). This suite walks every hub/app/api route file and asserts the
 * matrix statically, so that drift class fails red at build time. Green here
 * replaces the manual Route-policy DoD rows in the feature-development skill.
 *
 * The matrix:
 *  - a file exporting a mutating verb (POST/PATCH/PUT/DELETE) must call
 *    getUser() — server-verified auth where state changes (ADR-U037) — unless
 *    it is a documented pre-auth route (no session exists to verify);
 *  - a mutation-only file must NOT be on the Edge runtime — Edge is justified
 *    only by a hot read (ADR-U036; the PR #106 rule). A mutating handler may
 *    ride an Edge file only when the file also hosts a hot GET (the ADR-U036
 *    addendum consent case), and it still authenticates with getUser;
 *  - an Edge file must export a GET, pin preferredRegion='dub1', and read
 *    identity locally via getClaims()/getVerifiedUserId() (ADR-U036/U037);
 *  - a GET-only file on the Node default is legal (new routes default to
 *    Node) but must be consciously classified in NODE_GETS_REVIEWED — the
 *    consent-page regression (2026-07-01, ADR-U036 addendum) was a hot read
 *    left on Node, invisible without a classification step.
 */

const API_ROOT = path.resolve(__dirname, '../../../../app/api');

// Documented exceptions. Adding an entry requires the matching justification
// in the feature spec's Implementation notes (Route-policy DoD).
const PRE_AUTH_MUTATIONS = new Set([
  'auth/signup', // account creation — no session exists yet to verify
]);
const NODE_GETS_REVIEWED = new Set([
  'account/export', // Node-dependent document assembly; click-triggered, not render-blocking (ADR-U036)
  'perf/probe-node', // PERF-PROBE: deliberately-Node half of the cold-boot A/B (2026-07-09 analysis L1); temporary — remove with the twins at the ADR-U036 revisit close-out
]);

const MUTATING = ['POST', 'PATCH', 'PUT', 'DELETE'];

interface RouteInfo {
  id: string;
  methods: string[];
  isEdge: boolean;
  hasDub1Pin: boolean;
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
        isEdge: /export\s+const\s+runtime\s*=\s*['"]edge['"]/.test(src),
        hasDub1Pin: /export\s+const\s+preferredRegion\s*=\s*['"]dub1['"]/.test(src),
        hasGetUser: src.includes('getUser('),
        hasLocalClaimsRead: src.includes('getClaims(') || src.includes('getVerifiedUserId('),
      });
    }
  }
  return routes;
}

const routes = collectRoutes();
const mutating = (r: RouteInfo) => r.methods.some((m) => MUTATING.includes(m));

describe('route-policy conformance (ADR-U036/U037)', () => {
  it('finds the API surface', () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((r) => r.methods.length > 0)).toBe(true);
  });

  it('every mutating route file authenticates with getUser() (ADR-U037)', () => {
    const violations = routes
      .filter((r) => mutating(r) && !PRE_AUTH_MUTATIONS.has(r.id) && !r.hasGetUser)
      .map((r) => `${r.id} [${r.methods.join(',')}] mutates without getUser()`);
    expect(violations).toEqual([]);
  });

  it('mutation-only route files stay on the Node runtime (ADR-U036)', () => {
    const violations = routes
      .filter((r) => mutating(r) && !r.methods.includes('GET') && r.isEdge)
      .map((r) => `${r.id} [${r.methods.join(',')}] is mutation-only but runs on Edge`);
    expect(violations).toEqual([]);
  });

  it('Edge route files host a GET, pin dub1, and read identity locally (ADR-U036/U037)', () => {
    const violations = routes
      .filter((r) => r.isEdge)
      .flatMap((r) => [
        ...(!r.methods.includes('GET') ? [`${r.id} is Edge without a hot GET`] : []),
        ...(!r.hasDub1Pin ? [`${r.id} is Edge without preferredRegion='dub1'`] : []),
        ...(!r.hasLocalClaimsRead
          ? [`${r.id} is Edge without getClaims()/getVerifiedUserId()`]
          : []),
      ]);
    expect(violations).toEqual([]);
  });

  it('GET-only Node routes are consciously classified (consent-regression guard)', () => {
    const unclassified = routes
      .filter((r) => !mutating(r) && !r.isEdge && !NODE_GETS_REVIEWED.has(r.id))
      .map(
        (r) =>
          `${r.id} is a GET on the Node default — classify it: hot render-path read (move to Edge+dub1, ADR-U036) or reviewed Node GET (add to NODE_GETS_REVIEWED with justification)`,
      );
    expect(unclassified).toEqual([]);
  });

  it('exception lists stay honest (no stale entries)', () => {
    const ids = new Set(routes.map((r) => r.id));
    const stale = [...PRE_AUTH_MUTATIONS, ...NODE_GETS_REVIEWED].filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });
});
