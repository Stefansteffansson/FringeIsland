import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(60_000); // real-substrate suite: one Management-API catalog query

/**
 * W1 — Ownership-manifest completeness gate (Cycle COR-B, audit AC2-2).
 *
 * WRITTEN RED-FIRST. The predecessor gate
 * (`internal-api-conformance.test.ts`) enforces the anatomy's inner-ring
 * direction rule against a hand-edited `DS_TABLES` array living inside the
 * test file. Nothing binds that array to reality in either direction, so:
 *
 *   - a NEW DS-owned table ships ungated by default (nothing fails when the
 *     table is added and the array is not), and
 *   - the array's own entries are never checked for continued existence.
 *
 * Audit II (AC2-2) recorded this as the meta-gap: the inner ring's coverage
 * is defined entirely by hand-edited lists with no completeness check. The two
 * `NAMED DEFERRAL` comments in the predecessor's array are the evidence that
 * the list is maintained by attentiveness — which is exactly the residual
 * assurance the 2026-07-19 audit flagged as AC-9.
 *
 * This gate makes classification mandatory. Every live `public.` table must
 * appear in `supabase/ownership.manifest.json` with an owner, and every
 * manifest entry must still exist in the catalog. Adding a table then fails
 * red until someone classifies it — the classification becomes the gate.
 *
 * The manifest is the single source the inner-ring gate reads its `DS_TABLES`
 * from (see `internal-api-conformance.test.ts`), so a table classified
 * `DS-*` here is automatically covered there.
 *
 * State at authoring (2026-07-22): RED — `supabase/ownership.manifest.json`
 * does not exist yet. It turns green when the manifest lands, classifying all
 * 32 live tables.
 *
 * Ground truth: ADR-U023 (the DS/PC decomposition) · ADR-U047 rule 3 (the
 * boundary the manifest feeds) · ADR-U048 + ruling R-1 (`notifications` is
 * the Notifications-vertical delivery substrate, deliberately NOT a DS table)
 * · rulings R-2 (consent tables = PC-2) and R-3 (`content_families` = DS-3).
 */

const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../../../supabase/ownership.manifest.json',
);

/** Owners the manifest may name. `vertical:*` covers ADR-U002 obligation substrates. */
const OWNER_PATTERN = /^(DS-[1-7]|PC-[1-4]|vertical:[a-z-]+)$/;

type Manifest = {
  version: number;
  tables: Record<string, { owner: string; note?: string }>;
  functions: Record<string, string[]>;
  lifecyclePrefixRule: string;
  exceptions: {
    verticalComposition: { function: string; vertical: string; citation: string }[];
    crossServiceReads: { function: string; table: string; citation: string }[];
  };
};

function loadManifest(): Manifest {
  // Deliberately unguarded: a missing manifest must fail the suite loudly,
  // not be skipped into a false green.
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

async function liveTables(): Promise<string[]> {
  // COR-D W8 (Audit IV GC-17): widened past relkind='r' — partitioned tables,
  // foreign tables, views and matviews were invisible to BOTH diff directions.
  // Latent when widened (none existed); the first view/partition now demands a
  // manifest owner like any table.
  const rows = (await runAdminSql(`
    select c.relname as name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'f', 'v', 'm')
     order by c.relname;
  `)) as unknown as { name: string }[];
  return rows.map((r) => r.name);
}

describe('Ownership-manifest completeness (COR-B W1, audit AC2-2)', () => {
  it('the manifest exists and is well-formed', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);

    const m = loadManifest();
    expect(typeof m.version).toBe('number');
    expect(Object.keys(m.tables).length).toBeGreaterThan(0);

    const badOwners = Object.entries(m.tables)
      .filter(([, v]) => !OWNER_PATTERN.test(v.owner))
      .map(([t, v]) => `${t} -> "${v.owner}"`);
    expect(badOwners).toEqual([]);
  });

  it('every live public table is classified in the manifest', async () => {
    const live = await liveTables();
    expect(live.length).toBeGreaterThan(0); // sanity: catalog reachable

    const m = loadManifest();
    const unclassified = live.filter((t) => !(t in m.tables));

    // The gate: a new table is ungated until it is classified. Classify it.
    expect(unclassified).toEqual([]);
  });

  it('every manifest table still exists in the catalog (no stale entries)', async () => {
    const live = new Set(await liveTables());
    const m = loadManifest();

    const stale = Object.keys(m.tables).filter((t) => !live.has(t));

    // Stale entries can mask a real crossing: a dropped-and-renamed table
    // leaves its old name "covered" while the new name goes unwatched.
    expect(stale).toEqual([]);
  });

  it('every admin_*-prefixed TABLE is PC-4 — the table half of the anatomy pin (COR-D W8, GC-21)', () => {
    const m = loadManifest();
    const misfiled = Object.entries(m.tables)
      .filter(([t, v]) => /^admin_/.test(t) && v.owner !== 'PC-4')
      .map(([t, v]) => `${t} (${v.owner})`);
    expect(misfiled).toEqual([]);
  });

  it('every function the manifest assigns to a service still exists', async () => {
    // COR-D W8 (Audit IV GC-18): prokind widened to ('f','p') to match the
    // classification gate — a procedure must be registered and diffed the same
    // way both gates see it.
    const rows = (await runAdminSql(`
      select p.proname as name
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prokind in ('f', 'p')
       order by p.proname;
    `)) as unknown as { name: string }[];
    const live = new Set(rows.map((r) => r.name));

    const m = loadManifest();
    const assigned = Object.entries(m.functions).flatMap(([svc, fns]) =>
      fns.map((f) => ({ svc, f })),
    );

    // Entries may go inert across a migration window (the predecessor array
    // carried `can_update_conversation` through exactly such a window). This
    // asserts the window gets closed rather than forgotten.
    const missing = assigned.filter(({ f }) => !live.has(f)).map(({ svc, f }) => `${svc}: ${f}`);
    expect(missing).toEqual([]);
  });

  it('exception lists stay honest (every entry cites a live function)', async () => {
    const rows = (await runAdminSql(`
      select p.proname as name
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prokind = 'f';
    `)) as unknown as { name: string }[];
    const live = new Set(rows.map((r) => r.name));

    const m = loadManifest();
    const stale = [
      ...m.exceptions.verticalComposition.map((e) => e.function),
      ...m.exceptions.crossServiceReads.map((e) => e.function),
    ].filter((f) => !live.has(f));

    expect(stale).toEqual([]);

    // Every carve-out must carry its justification — an uncited exception is
    // indistinguishable from an oversight (ADR-U047 Amendment 2, bound a).
    const uncited = [
      ...m.exceptions.verticalComposition.filter((e) => !e.citation?.trim()),
      ...m.exceptions.crossServiceReads.filter((e) => !e.citation?.trim()),
    ].map((e) => e.function);
    expect(uncited).toEqual([]);
  });

  it('the vertical:*-owned table set is exactly the pinned list (COR-C W4, ruling R-4 / GC-3)', () => {
    const m = loadManifest();
    const verticalOwned = Object.entries(m.tables)
      .filter(([, v]) => v.owner.startsWith('vertical:'))
      .map(([t]) => t)
      .sort();

    // Ruling R-4 (Audit III, 2026-07-31): the delivery table is the ONLY
    // vertical-owned substrate — ADR-U048 ruling 1. The routing registries
    // (kinds, categories, channels) are DS-5 per U048 clause 2, which keeps
    // them inside dsTables() and therefore inside the inner-ring gate; a
    // vertical label takes a table OUT of that gate's sight. Widening this
    // set removes gate coverage: do it only with a ruling, and record the
    // reason on the new entry here.
    expect(verticalOwned).toEqual([
      'notifications', // ADR-U048 ruling 1 — obligation substrate, written by every tier
    ]);
  });
});
