import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(60_000); // real-substrate: pg_proc reads only

/**
 * COR-C W2 — the export-completeness invariant (Audit III AC3-4 + AC3-15,
 * closing GC-5 and GC-6).
 *
 * WRITTEN RED-FIRST. AC3-3 recurred Audit I's AC-4 class: a member-data table
 * (notification_preferences) shipped with a purpose-built export contract that
 * nothing composed, and the additive presence test could not notice — an
 * additive test cannot detect omission by construction. This gate applies the
 * COR-B ownership pattern (classify-or-fail-red) to Art. 15/20 export:
 *
 *  - every table in the ownership manifest must carry an export
 *    classification (memberData true/false) — unclassified fails red, so a
 *    NEW member-data table cannot ship without an export decision;
 *  - every member-data table names its export representation OR a cited
 *    exemption (never both, never neither); every non-member-data table
 *    states why;
 *  - GC-6: the set of public functions get_own_data_export() actually calls
 *    must equal the manifest's verticalComposition `composes` list — the
 *    citation becomes load-bearing instead of decorative (AC3-15: it was two
 *    contracts stale and nothing noticed).
 *
 * State at authoring (2026-07-31): RED — the manifest has no export section
 * and no composes array. The W2 manifest edit turns the classification checks
 * green; the GC-6 set check stays red until the W2 schema-gate migration
 * applies (the live body gains the notification_preferences call) — the same
 * held-PR shape as COR-C W1.
 */

const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../../../supabase/ownership.manifest.json',
);

type ExportClass = {
  memberData: boolean;
  reason?: string;
  representation?: string;
  exemption?: { reason: string; citation: string; scope?: string };
};

type Manifest = {
  tables: Record<string, { owner: string; note?: string }>;
  export?: { note?: string; tables: Record<string, ExportClass> };
  exceptions: {
    verticalComposition: {
      function: string;
      vertical: string;
      citation: string;
      composes?: string[];
    }[];
  };
};

function loadManifest(): Manifest {
  // Deliberately unguarded: a missing manifest must fail loudly, never skip
  // into a false green (the ownership-suite convention).
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

describe('Export-completeness invariant (COR-C W2, Audit III AC3-4)', () => {
  it('every ownership-classified table carries an export classification — unclassified fails red', () => {
    const m = loadManifest();
    const exportTables = m.export?.tables ?? {};

    // The ownership manifest's table list is itself completeness-gated
    // against pg_class (COR-B W1), so gating against it transitively gates
    // against the live catalog: a new table must be ownership-classified,
    // and now ALSO export-classified, before the suites go green.
    const unclassified = Object.keys(m.tables).filter((t) => !(t in exportTables));
    expect(unclassified).toEqual([]);
  });

  it('no stale export entries — every export classification names an ownership-classified table', () => {
    const m = loadManifest();
    const stale = Object.keys(m.export?.tables ?? {}).filter((t) => !(t in m.tables));
    expect(stale).toEqual([]);
  });

  it('member-data tables carry a representation XOR a cited exemption (both only under the AB-4 partial scope); the rest state a reason', () => {
    const m = loadManifest();
    const bad: string[] = [];
    for (const [t, c] of Object.entries(m.export?.tables ?? {})) {
      if (c.memberData) {
        const rep = !!c.representation?.trim();
        const ex = !!(c.exemption?.reason?.trim() && c.exemption?.citation?.trim());
        if (!rep && !ex) bad.push(`${t}: member data with neither representation nor cited exemption`);
        // ADM-D (ADR-U052 §6 / board AB-4): a split-by-row-direction entry
        // carries BOTH halves — legal exactly when the exemption is marked
        // scope 'partial', and a partial exemption REQUIRES both halves.
        if (rep && ex && c.exemption?.scope !== 'partial')
          bad.push(`${t}: both representation and exemption — pick one, or mark the exemption scope 'partial' (the AB-4 split shape)`);
        if (c.exemption?.scope === 'partial' && !(rep && ex))
          bad.push(`${t}: a partial exemption requires both halves — the representation AND the exempt remainder`);
      } else if (!c.reason?.trim()) {
        bad.push(`${t}: classified non-member-data without a reason`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('GC-6: the composite calls exactly the contracts the manifest licenses (composes is load-bearing)', async () => {
    const m = loadManifest();
    const entry = m.exceptions.verticalComposition.find(
      (e) => e.function === 'get_own_data_export',
    );
    expect(entry).toBeDefined();
    // RED pre-W2-manifest: no composes array existed (AC3-15's stale prose
    // citation was the only record of the composite's reach).
    expect(Array.isArray(entry!.composes)).toBe(true);

    const bodyRows = (await runAdminSql(`
      select p.prosrc as src from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'get_own_data_export';
    `)) as unknown as { src: string }[];
    expect(bodyRows.length).toBe(1);

    const fnRows = (await runAdminSql(`
      select p.proname as name from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public';
    `)) as unknown as { name: string }[];
    const liveFunctions = new Set(fnRows.map((r) => r.name));

    // Schema-qualified public.* references followed by an open paren, then
    // intersected with pg_proc so table names in INSERT column lists (e.g.
    // `INSERT INTO public.admin_audit_log (actor…`) cannot false-positive.
    const called = [
      ...new Set(
        [...bodyRows[0].src.matchAll(/public\.([a-z0-9_]+)\s*\(/gi)]
          .map((mt) => mt[1].toLowerCase())
          .filter((name) => liveFunctions.has(name)),
      ),
    ].sort();

    // RED pre-apply even after the manifest edit: the live body composes four
    // contracts while the licensed set names five (notification_preferences
    // lands with the W2 migration). Green exactly when body and license agree.
    expect(called).toEqual([...(entry!.composes ?? [])].sort());
  });
});
