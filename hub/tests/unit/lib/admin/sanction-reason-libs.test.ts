import { describe, it, expect, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  suspendAdminGroup,
  restAdminGroup,
  wakeAdminGroup,
  reactivateAdminGroup,
} from '@/lib/admin/groups';
import { suspendAdminUser, reactivateAdminUser, bulkAdminUserAction } from '@/lib/admin/users';
import { restGroup, wakeGroup } from '@/lib/groups/queries';

/**
 * FEAT-H049 (DB-4) — the lib wrappers relay the reason to the FEAT-PC030
 * contracts: the admin hold calls pass `p_reason` (required by the contract —
 * 22023 otherwise), the Steward's rest/wake pass the OPTIONAL note and omit
 * the key when blank (the defaulted parameter, the old shape preserved).
 * WRITTEN RED-FIRST (2026-09-03): no wrapper takes a reason at head.
 */
const clientWith = () => {
  const rpc = jest.fn<(fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: null }>>(
    async () => ({ data: { success: true }, error: null }),
  );
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe('lib/admin/groups — the admin hold calls carry p_reason', () => {
  it.each([
    ['admin_suspend_group', suspendAdminGroup],
    ['admin_rest_group', restAdminGroup],
    ['admin_wake_group', wakeAdminGroup],
    ['admin_reactivate_group', reactivateAdminGroup],
  ] as const)('%s receives p_reason', async (contract, fn) => {
    const { client, rpc } = clientWith();
    await fn(client, 'g1', 'Repeated reports');
    expect(rpc).toHaveBeenCalledWith(contract, { p_group_id: 'g1', p_reason: 'Repeated reports' });
  });
});

describe('lib/admin/users — the member hold calls carry p_reason', () => {
  it('suspendAdminUser / reactivateAdminUser pass p_reason', async () => {
    const { client, rpc } = clientWith();
    await suspendAdminUser(client, 'u1', 'Terms breach');
    expect(rpc).toHaveBeenCalledWith('admin_update_user_status', {
      target_user_id: 'u1',
      new_is_active: false,
      p_reason: 'Terms breach',
    });
    await reactivateAdminUser(client, 'u1', 'Cleared');
    expect(rpc).toHaveBeenCalledWith('admin_update_user_status', {
      target_user_id: 'u1',
      new_is_active: true,
      p_reason: 'Cleared',
    });
  });

  it('bulkAdminUserAction relays ONE reason to every suspend/reactivate call (the bulk ceremony gap, found at build)', async () => {
    const { client, rpc } = clientWith();
    await bulkAdminUserAction(client, 'suspend', ['u1', 'u2'], 'Batch hold');
    expect(rpc).toHaveBeenCalledWith('admin_update_user_status', {
      target_user_id: 'u1',
      new_is_active: false,
      p_reason: 'Batch hold',
    });
    expect(rpc).toHaveBeenCalledWith('admin_update_user_status', {
      target_user_id: 'u2',
      new_is_active: false,
      p_reason: 'Batch hold',
    });
  });
});

describe("lib/groups/queries — the Steward's optional note", () => {
  it('restGroup passes the note as p_reason when given', async () => {
    const { client, rpc } = clientWith();
    await restGroup(client, 'g1', 'Summer break');
    expect(rpc).toHaveBeenCalledWith('rest_group', { p_group_id: 'g1', p_reason: 'Summer break' });
  });

  it('restGroup / wakeGroup omit p_reason entirely when the note is blank or absent (the old shape)', async () => {
    const { client, rpc } = clientWith();
    await restGroup(client, 'g1');
    expect(rpc).toHaveBeenLastCalledWith('rest_group', { p_group_id: 'g1' });
    await restGroup(client, 'g1', '   ');
    expect(rpc).toHaveBeenLastCalledWith('rest_group', { p_group_id: 'g1' });
    await wakeGroup(client, 'g1');
    expect(rpc).toHaveBeenLastCalledWith('wake_group', { p_group_id: 'g1' });
    await wakeGroup(client, 'g1', 'Back');
    expect(rpc).toHaveBeenLastCalledWith('wake_group', { p_group_id: 'g1', p_reason: 'Back' });
  });
});
