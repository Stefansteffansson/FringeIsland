import * as fs from 'fs';
import * as path from 'path';

/**
 * The production fuse — TypeScript twin of `scripts/lib/target.js` (ADR-U053 §3).
 *
 * `supabase/projects.json` is the ONE place that knows which project is
 * production and which is the test tier. Every Jest and Playwright helper that
 * constructs a service-role client or calls the management API runs
 * `assertNotProduction(url, env)` first: the production ref is refused unless
 * `ALLOW_PRODUCTION=1` names the intent, and an unparseable URL is refused
 * outright (fail closed). `production-fuse.test.ts` pins the behaviour on
 * fixtures and sweeps the consumers.
 */

export type Project = { ref: string; name: string; region: string; envFile: string };
export type Projects = { production: Project; test: Project };

const PROJECTS_PATH = path.resolve(__dirname, '../../../supabase/projects.json');

export class ProductionRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionRefusedError';
  }
}

export function loadProjects(): Projects {
  return JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8')) as Projects;
}

export function projectRefOf(url: string | undefined | null): string | null {
  const m = String(url ?? '').match(/^https:\/\/([a-z]{20})\.supabase\.co/);
  return m ? m[1] : null;
}

/** Refuses production unless `ALLOW_PRODUCTION=1`; refuses an unparseable URL. Returns the ref. */
export function assertNotProduction(
  url: string | undefined | null,
  env: Record<string, string | undefined> = process.env,
): string {
  const ref = projectRefOf(url);
  if (!ref) {
    throw new ProductionRefusedError(
      `No Supabase project ref in "${url ?? ''}" — refusing to run (fail closed). Point NEXT_PUBLIC_SUPABASE_URL at the test project.`,
    );
  }
  const { production } = loadProjects();
  if (ref === production.ref && env.ALLOW_PRODUCTION !== '1') {
    throw new ProductionRefusedError(
      `Refusing to touch PRODUCTION (${production.name}, ${production.ref}). Suites, probes, walks and the dev server run on the test project. ` +
        `If this is the schema gate's production leg, say so: ALLOW_PRODUCTION=1 (ADR-U053 §3).`,
    );
  }
  return ref;
}
