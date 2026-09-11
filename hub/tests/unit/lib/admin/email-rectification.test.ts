import { updateAdminUserEmail, AdminUsersError, type EmailRectificationResult } from '@/lib/admin/users';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H050 (ADR-U054, TASK-EML-02) — the lib half of the rectification
 * ceremony.
 *
 * WRITTEN RED-FIRST: `updateAdminUserEmail` and `EmailRectificationResult` do
 * not exist at head — every cell fails on the missing exports.
 *
 * The contract owns every rule (ADR-U038). This layer is a typed pass-through:
 * it names the RPC, forwards the three arguments unchanged, returns the payload
 * whole, and converts a Supabase error into the family's typed error so the
 * route can map it. Nothing here validates, normalises or decides.
 */

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };

const clientWith = (impl: (fn: string, args: Record<string, unknown>) => RpcResult) => {
  const rpc = jest.fn(async (fn: string, args: Record<string, unknown>) => impl(fn, args));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

const PAYLOAD: EmailRectificationResult = {
  success: true,
  previous_email: 'old@example.com',
  new_email: 'new@example.com',
  sessions_revoked: 2,
  invitations_deleted: 1,
};

const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('updateAdminUserEmail (FEAT-H050)', () => {
  it('calls the contract once, forwarding all three arguments verbatim', async () => {
    const { client, rpc } = clientWith(() => ({ data: PAYLOAD, error: null }));
    await updateAdminUserEmail(client, USER_ID, 'new@example.com', 'Lost the old mailbox');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('admin_update_user_email', {
      target_user_id: USER_ID,
      p_new_email: 'new@example.com',
      p_reason: 'Lost the old mailbox',
    });
  });

  it('returns the payload whole, so the surface renders from it rather than refetching', async () => {
    const { client } = clientWith(() => ({ data: PAYLOAD, error: null }));
    const out = await updateAdminUserEmail(client, USER_ID, 'new@example.com', 'a reason');
    expect(out).toEqual(PAYLOAD);
  });

  it('passes the address through untouched — normalisation is the contract\'s, not the surface\'s', async () => {
    const { client, rpc } = clientWith(() => ({ data: PAYLOAD, error: null }));
    await updateAdminUserEmail(client, USER_ID, '  MiXeD@Example.COM ', 'a reason');
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_new_email: '  MiXeD@Example.COM ' });
  });

  it.each([
    ['42501', 'platform administrator required'],
    ['P0002', 'User not found'],
    ['P0001', 'That email address is already in use'],
    ['22023', 'Reason required'],
  ])('converts a %s refusal into a typed AdminUsersError', async (code, message) => {
    const { client } = clientWith(() => ({ data: null, error: { code, message } }));
    await expect(
      updateAdminUserEmail(client, USER_ID, 'new@example.com', 'a reason'),
    ).rejects.toMatchObject({ code, message });
    await expect(
      updateAdminUserEmail(client, USER_ID, 'new@example.com', 'a reason'),
    ).rejects.toBeInstanceOf(AdminUsersError);
  });
});
