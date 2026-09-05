/**
 * The project target and the production fuse (ADR-U053 §3).
 *
 * ONE place knows which Supabase project is production and which is the test
 * project: `supabase/projects.json`. Every database-touching script loads its
 * target through `loadTarget()`:
 *
 *   default            → the test project, from `.env.local`
 *   --production       → the production project, from `.env.production-gate.local`,
 *                        and ONLY when `ALLOW_PRODUCTION=1` is set in the environment
 *                        (the schema gate's production leg is the one legitimate case)
 *   --target=<name>    → the same two names, spelled out
 *
 * `assertNotProduction(url, env)` is the fuse itself: it refuses a URL whose
 * ref is production's unless `ALLOW_PRODUCTION=1`, and refuses an unparseable
 * URL outright (fail closed). The hub scripts import this module; the Jest and
 * Playwright helpers carry a TypeScript twin (`hub/tests/helpers/target.ts`)
 * whose behaviour the unit gate `production-fuse.test.ts` pins to this one.
 *
 * Registry: scripts/README.md.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const PROJECTS_PATH = path.join(REPO_ROOT, 'supabase', 'projects.json');

class ProductionRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductionRefusedError';
  }
}

function loadProjects() {
  return JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8'));
}

function projectRefOf(url) {
  const m = String(url || '').match(/^https:\/\/([a-z]{20})\.supabase\.co/);
  return m ? m[1] : null;
}

function assertNotProduction(url, env = process.env) {
  const ref = projectRefOf(url);
  if (!ref) {
    throw new ProductionRefusedError(
      `No Supabase project ref in "${url}" — refusing to run (fail closed). Point NEXT_PUBLIC_SUPABASE_URL at the test project.`,
    );
  }
  const { production } = loadProjects();
  if (ref === production.ref && env.ALLOW_PRODUCTION !== '1') {
    throw new ProductionRefusedError(
      `Refusing to touch PRODUCTION (${production.name}, ${production.ref}). ` +
        `Suites, probes, walks and the dev server run on the test project. ` +
        `If this is the schema gate's production leg, say so: ALLOW_PRODUCTION=1 (ADR-U053 §3).`,
    );
  }
  return ref;
}

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

/**
 * Resolve the target, load its env file into `env` (without overriding values
 * already present), run the fuse, and return the credentials.
 *
 * @param {{ target?: 'test'|'production', argv?: string[], env?: NodeJS.ProcessEnv, cwd?: string }} [opts]
 *   `cwd` is the directory holding the env files (repo root for root scripts, `hub/` for hub scripts).
 */
function loadTarget(opts = {}) {
  const argv = opts.argv || process.argv;
  const env = opts.env || process.env;
  const cwd = opts.cwd || REPO_ROOT;
  const flag = (argv.find((a) => a.startsWith('--target=')) || '').split('=')[1];
  const target = opts.target || (argv.includes('--production') ? 'production' : flag) || env.TARGET || 'test';
  if (target !== 'test' && target !== 'production') {
    throw new Error(`Unknown target "${target}" — use test (default) or production`);
  }
  const envFile = path.join(cwd, target === 'production' ? '.env.production-gate.local' : '.env.local');
  if (!fs.existsSync(envFile)) {
    throw new Error(`Missing ${envFile} for target "${target}" (ADR-U053 §3: .env.local = test; .env.production-gate.local = production, gate only)`);
  }
  for (const [k, v] of Object.entries(parseEnvFile(envFile))) if (env[k] === undefined) env[k] = v;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = assertNotProduction(url, env);
  const projects = loadProjects();
  const expected = projects[target].ref;
  if (ref !== expected) {
    throw new ProductionRefusedError(
      `${path.basename(envFile)} points at ${ref}, but the "${target}" target is ${expected} (${projects[target].name}) — env files and supabase/projects.json disagree.`,
    );
  }
  return {
    target,
    ref,
    url,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    accessToken: env.SUPABASE_ACCESS_TOKEN,
    envFile,
  };
}

module.exports = { loadProjects, projectRefOf, assertNotProduction, loadTarget, parseEnvFile, ProductionRefusedError, PROJECTS_PATH };
