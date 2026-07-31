import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(60_000); // one catalog query

/**
 * COR-C W7 — function-classification completeness (Audit III GC-1; prevents
 * AC3-10 recurring).
 *
 * WRITTEN RED-FIRST. The table half of this gate exists since COR-B (every
 * live table must be ownership-classified); functions had no counterpart, so
 * `functionOwner()`'s silent CORE default swallowed four unregistered PC-3
 * functions (AC3-10) — failing CLOSED (CORE is strictest) but lying about
 * ownership. This gate makes function classification explicit: every live
 * public function must be
 *   - listed under a DS-N service in the manifest, or
 *   - a `ds{N}_lifecycle_` prefix match (ADR-U047 rule 1), or
 *   - listed in the manifest's `functions.CORE` array — core BY DECLARATION,
 *     never by silent default.
 * A new function fails red until someone states whose it is.
 *
 * State at authoring (2026-07-31, pre-CORE-seed): RED — the manifest has no
 * CORE list, so every core function reports unclassified. The seed turns it
 * green; from then on the red is reserved for genuinely new functions.
 */

const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../../../supabase/ownership.manifest.json',
);

type Manifest = {
  functions: Record<string, string[]>;
  lifecyclePrefixRule: string;
};

function loadManifest(): Manifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

async function liveFunctions(): Promise<string[]> {
  const rows = (await runAdminSql(`
    select p.proname as name
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
     group by p.proname
     order by p.proname;
  `)) as unknown as { name: string }[];
  return rows.map((r) => r.name);
}

describe('Function-classification completeness (COR-C W7, GC-1)', () => {
  it('every live public function is explicitly classified — CORE by declaration, never by default', async () => {
    const live = await liveFunctions();
    expect(live.length).toBeGreaterThan(0); // sanity: catalog reachable

    const m = loadManifest();
    const lifecycle = new RegExp(m.lifecyclePrefixRule);
    const classified = new Set(Object.values(m.functions).flat());

    const unclassified = live.filter((f) => !classified.has(f) && !lifecycle.test(f));

    // The gate: state whose function it is (a DS-N list, or functions.CORE).
    expect(unclassified).toEqual([]);
  });

  it('no stale function entries — every classified function still exists (all owners incl. CORE)', async () => {
    const live = new Set(await liveFunctions());
    const m = loadManifest();
    const stale = Object.entries(m.functions).flatMap(([svc, fns]) =>
      fns.filter((f) => !live.has(f)).map((f) => `${svc}: ${f}`),
    );
    expect(stale).toEqual([]);
  });

  it('no function is claimed by two owners', () => {
    const m = loadManifest();
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [svc, fns] of Object.entries(m.functions)) {
      for (const f of fns) {
        if (seen.has(f)) dupes.push(`${f} (${seen.get(f)} + ${svc})`);
        seen.set(f, svc);
      }
    }
    expect(dupes).toEqual([]);
  });
});
