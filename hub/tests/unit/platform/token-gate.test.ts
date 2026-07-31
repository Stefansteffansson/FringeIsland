import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * COR-C W7 — the token gate (Audit III GC-12, token half; ruling R-6).
 *
 * The design-system seed (`components/ui/`) speaks INTENT tokens only
 * (primary/danger/warning, the ink scale, surface/edge/skeleton — the W6
 * @theme block). A raw palette utility in the seed re-opens the fork the W6
 * migration closed (bg-blue-600 vs bg-indigo-600 was live drift on the same
 * accent). Deliberately permitted: black/white neutrals and opacity scrims
 * (`bg-black/50`) — they are not hue choices — and the fixture demonstrates
 * the red so the sweep can never green vacuously.
 *
 * Feature components (`components/{feature}/`) migrate tranche-wise; widening
 * this gate's scope to them is the closing act of that migration.
 */

const UI_DIR = path.resolve(__dirname, '../../../components/ui');

const RAW_PALETTE =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|divide|accent|caret)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g;

export function rawPaletteHits(src: string): string[] {
  return [...src.matchAll(RAW_PALETTE)].map((m) => m[0]);
}

describe('Token gate — the design-system seed speaks tokens only (COR-C W7, GC-12)', () => {
  it('fixture: a raw palette utility IS caught (the gate can go red)', () => {
    const hits = rawPaletteHits(
      '<button className="rounded bg-blue-600 text-white hover:bg-blue-700" />',
    );
    expect(hits).toEqual(['bg-blue-600', 'bg-blue-700']);
  });

  it('fixture: tokens, neutrals, and scrims pass', () => {
    expect(
      rawPaletteHits(
        '<div className="bg-primary text-white hover:bg-primary-hover bg-black/50 border-edge text-ink-muted" />',
      ),
    ).toEqual([]);
  });

  it('live sweep: every components/ui/ module is palette-free', () => {
    const files = fs
      .readdirSync(UI_DIR)
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
    expect(files.length).toBeGreaterThan(0); // sanity: the seed exists

    const violations = files.flatMap((f) => {
      const hits = rawPaletteHits(fs.readFileSync(path.join(UI_DIR, f), 'utf8'));
      return hits.length ? [`${f}: ${hits.join(', ')}`] : [];
    });
    expect(violations).toEqual([]);
  });
});
