import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

/**
 * FEAT-H010 (unit) — the Hub's API-first data-export client (IDN-8).
 *
 * `fetchDataExport()` reads the member's own export ONLY through the paired PC-4
 * contract at `/api/account/export` (never a direct Supabase call, ADR-U009),
 * surfacing the contract's error on failure (never a silent swallow).
 * `downloadJson()` is the browser file-download helper (Blob + object URL +
 * anchor click) that delivers the document to the member as a file.
 *
 * Red-first: fails to import until `hub/lib/account/export-client.ts` exists.
 */
import { fetchDataExport, downloadJson, DEFAULT_EXPORT_FILENAME } from '@/lib/account/export-client';

const SAMPLE_DOC = {
  schema_version: 1,
  exported_at: '2026-06-30T00:00:00Z',
  subject: { user_id: 'u1', personal_group_id: 'pg1', email: 'a@b.c' },
  profile: {},
  account_state: { state: 'active' },
  consent: [],
  memberships: [],
};

describe('fetchDataExport', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns the document the contract serves (the body IS the export)', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_DOC,
    })) as unknown as typeof fetch;

    const doc = await fetchDataExport();
    expect(doc.schema_version).toBe(1);
    expect(doc.subject.email).toBe('a@b.c');
    expect(global.fetch).toHaveBeenCalledWith('/api/account/export');
  });

  it('throws on a non-OK response (surfaced, never swallowed)', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to assemble data export' }),
    })) as unknown as typeof fetch;

    await expect(fetchDataExport()).rejects.toThrow();
  });
});

describe('downloadJson', () => {
  let clickSpy: jest.Mock;
  let createdAnchor: { href: string; download: string; click: jest.Mock };
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  const realCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    clickSpy = jest.fn();
    createdAnchor = { href: '', download: '', click: clickSpy };
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) =>
        tag === 'a' ? (createdAnchor as unknown as HTMLElement) : realCreateElement(tag),
      );
    createObjectURL = jest.fn(() => 'blob:mock-url');
    revokeObjectURL = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    // the fake anchor is a plain object, not a real Node — no-op the DOM insert
    jest.spyOn(document.body, 'appendChild').mockImplementation((n) => n as Node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((n) => n as Node);
  });

  afterEach(() => {
    (document.createElement as unknown as jest.Mock).mockRestore?.();
    (document.body.appendChild as unknown as jest.Mock).mockRestore?.();
    (document.body.removeChild as unknown as jest.Mock).mockRestore?.();
  });

  it('serializes the data to a Blob and triggers an anchor download with the given filename', () => {
    downloadJson(SAMPLE_DOC, 'my-export.json');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(createdAnchor.download).toBe('my-export.json');
    expect(createdAnchor.href).toBe('blob:mock-url');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('exposes a sensible default filename', () => {
    expect(DEFAULT_EXPORT_FILENAME).toMatch(/\.json$/);
  });
});
