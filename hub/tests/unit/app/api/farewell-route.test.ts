import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * FEAT-H004 STORY-3 (unit) — the `/api/auth/farewell` route runs the FEAT-PC002
 * explicit-erase RPC behind the API boundary, authenticated. No session => no
 * erase; an erase failure is surfaced (never swallowed).
 */
const getUser = jest.fn(async () => ({ data: { user: { id: 'u1' } as { id: string } | null } }));
const explicitEraseMist = jest.fn(async () => ({ error: null as string | null }));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
jest.mock('@/lib/auth/farewell', () => ({
  explicitEraseMist: (...args: unknown[]) =>
    (explicitEraseMist as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { POST } from '@/app/api/auth/farewell/route';

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  explicitEraseMist.mockReset();
  explicitEraseMist.mockResolvedValue({ error: null });
});

describe('POST /api/auth/farewell', () => {
  it('rejects with 401 and never erases when there is no session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await POST()) as { status: number };
    expect(res.status).toBe(401);
    expect(explicitEraseMist).not.toHaveBeenCalled();
  });

  it('erases the Mist when authenticated', async () => {
    const res = (await POST()) as { status: number };
    expect(res.status).toBe(200);
    expect(explicitEraseMist).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when the erase fails (surfaced, not swallowed)', async () => {
    explicitEraseMist.mockResolvedValue({ error: 'boom' });
    const res = (await POST()) as { status: number };
    expect(res.status).toBe(400);
  });
});
