import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H028 STORY-5 (unit) — the content-report client (COM-13). A report goes
 * through the `/api/reports` BFF; the client remembers which targets this
 * session has reported so an idempotent resubmit reads as "already reported"
 * rather than an error. A failed submit never marks the target reported. The
 * memory is dropped at session end via the auth-owned registry (W9).
 *
 * Red-first: fails to import until `@/lib/reports/client` exists.
 */

const mockRegister = jest.fn();
jest.mock('@/lib/auth/cache-registry', () => ({
  registerCacheInvalidator: (fn: () => void) => mockRegister(fn),
}));

import { submitReport, hasReported, invalidateReportsCache } from '@/lib/reports/client';

const okJson = (payload: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(payload) } as Response);
const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
  invalidateReportsCache();
  mockFetch.mockReset();
  (global as unknown as { fetch: unknown }).fetch = mockFetch;
});

describe('reports client', () => {
  it('submits a report and returns the confirmed row (first time: not already reported)', async () => {
    mockFetch.mockReturnValue(okJson({ report: { id: 'r1', status: 'open', created_at: '2026-07-20T10:00:00Z' } }));
    const { report, alreadyReported } = await submitReport('forum_post', 't1', 'spam');
    expect(report.id).toBe('r1');
    expect(alreadyReported).toBe(false);
    expect(hasReported('forum_post', 't1')).toBe(true);
  });

  it('reads an idempotent resubmit of the same target as already reported', async () => {
    mockFetch.mockReturnValue(okJson({ report: { id: 'r1', status: 'open', created_at: '2026-07-20T10:00:00Z' } }));
    await submitReport('forum_post', 't1', 'spam');
    const second = await submitReport('forum_post', 't1', 'spam again');
    expect(second.alreadyReported).toBe(true);
    expect(second.report.id).toBe('r1');
  });

  it('does not mark a target reported when the submit fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve({ error: 'bad' }) } as Response);
    await expect(submitReport('forum_post', 't1', 'x')).rejects.toThrow();
    expect(hasReported('forum_post', 't1')).toBe(false);
  });

  it('sends target kind/id/reason/details in the request body', async () => {
    mockFetch.mockReturnValue(okJson({ report: { id: 'r2', status: 'open', created_at: 'x' } }));
    await submitReport('direct_message', 'm9', 'harassment', 'details here');
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      target_kind: 'direct_message',
      target_id: 'm9',
      reason: 'harassment',
      details: 'details here',
    });
  });

  it('registers a session-end cache invalidator (COR-A W9)', () => {
    expect(mockRegister).toHaveBeenCalled();
  });
});
