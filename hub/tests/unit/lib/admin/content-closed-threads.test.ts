import { describe, it, expect, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAdminClosedGroupThreads, fetchAdminSealedThreadDetail } from '@/lib/admin/content';

/**
 * TASK-SEAL-01, Hub half — the outer-ring wrapper for
 * `admin_get_group_conversations`. One implementation of the read: unwraps
 * the contract's `{ group_id, conversations }` envelope, and translates the
 * admin-plane refusals into flags the BFF collapses — P0001 (the ruling-A
 * scope: "sealed-thread sight is scoped to closed groups") and 42501 are
 * `refused`, P0002 is `notFound`, anything else throws typed.
 *
 * Red at head: the function does not exist.
 */

const clientWith = (rpc: (fn: string, args: unknown) => Promise<unknown>) =>
  ({ rpc }) as unknown as SupabaseClient;

const ROW = {
  id: 'c1',
  title: null,
  created_at: '2026-08-01T10:00:00+00:00',
  last_message_at: null,
  sealed_at: '2026-08-03T10:00:00+00:00',
  is_sealed: true,
  message_count: 2,
};

describe('fetchAdminClosedGroupThreads', () => {
  it('calls admin_get_group_conversations and unwraps the conversations envelope', async () => {
    const rpc = jest.fn<(fn: string, args: unknown) => Promise<unknown>>().mockResolvedValue({
      data: { group_id: 'g1', conversations: [ROW] },
      error: null,
    });
    const flags = await fetchAdminClosedGroupThreads(clientWith(rpc), 'g1');
    expect(rpc).toHaveBeenCalledWith('admin_get_group_conversations', { p_group_id: 'g1' });
    expect(flags).toEqual({ data: [ROW], refused: false, notFound: false });
  });

  it('the ruling-A scope refusal (P0001) and 42501 read as refused; P0002 as notFound', async () => {
    const scoped = clientWith(async () => ({
      data: null,
      error: { code: 'P0001', message: 'sealed-thread sight is scoped to closed groups (group is active)' },
    }));
    expect(await fetchAdminClosedGroupThreads(scoped, 'g1')).toEqual({
      data: null,
      refused: true,
      notFound: false,
    });

    const unauthorized = clientWith(async () => ({
      data: null,
      error: { code: '42501', message: 'Unauthorized' },
    }));
    expect((await fetchAdminClosedGroupThreads(unauthorized, 'g1')).refused).toBe(true);

    const missing = clientWith(async () => ({
      data: null,
      error: { code: 'P0002', message: 'group not found' },
    }));
    expect((await fetchAdminClosedGroupThreads(missing, 'g1')).notFound).toBe(true);
  });
});

describe('fetchAdminSealedThreadDetail (TASK-SEAL-02)', () => {
  const DETAIL = {
    id: 'c1',
    kind: 'group',
    title: 'The thread',
    group_id: 'g1',
    group_name: 'The Cohort',
    group_status: 'closed',
    created_at: '2026-08-01T10:00:00+00:00',
    sealed_at: '2026-08-03T10:00:00+00:00',
    is_sealed: true,
    message_count: 1,
    truncated: false,
    messages: [{ id: 'm1', sender_group_id: 'pg1', content: 'x', is_deleted: false, created_at: '2026-08-01T11:00:00+00:00' }],
    senders: { pg1: { display_name: 'Former member', attribution: 'former' } },
  };

  it('calls admin_get_group_conversation_detail and passes the detail through', async () => {
    const rpc = jest.fn<(fn: string, args: unknown) => Promise<unknown>>().mockResolvedValue({
      data: DETAIL,
      error: null,
    });
    const flags = await fetchAdminSealedThreadDetail(clientWith(rpc), 'c1');
    expect(rpc).toHaveBeenCalledWith('admin_get_group_conversation_detail', { p_conversation_id: 'c1' });
    expect(flags).toEqual({ data: DETAIL, refused: false, notFound: false });
  });

  it('the ruling-A scope refusal (P0001) and 42501 read as refused; P0002 (a DM, or absent) as notFound', async () => {
    const scoped = clientWith(async () => ({
      data: null,
      error: { code: 'P0001', message: 'sealed-thread sight is scoped to closed groups (group is active)' },
    }));
    expect(await fetchAdminSealedThreadDetail(scoped, 'c1')).toEqual({ data: null, refused: true, notFound: false });

    const unauthorized = clientWith(async () => ({ data: null, error: { code: '42501', message: 'Unauthorized' } }));
    expect((await fetchAdminSealedThreadDetail(unauthorized, 'c1')).refused).toBe(true);

    const missing = clientWith(async () => ({ data: null, error: { code: 'P0002', message: 'conversation not found' } }));
    expect((await fetchAdminSealedThreadDetail(missing, 'c1')).notFound).toBe(true);
  });
});
