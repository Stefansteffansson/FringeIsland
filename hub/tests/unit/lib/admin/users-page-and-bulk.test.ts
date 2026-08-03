import {
  fetchAdminUsersPage,
  bulkAdminUserAction,
  AdminUsersError,
  type AdminUserRow,
} from '@/lib/admin/users';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H039 tranche 2 (Cycle ADM-E) — the true paging read and the RB-2 bulk
 * loop. Replaces users-shim.test.ts: the PC024 transition shim (tranche 1) is
 * retired with the full-census fetch it bridged — the applied 20260803210000
 * contract is now the only shape.
 *
 * WRITTEN RED-FIRST (2026-08-03): neither fetchAdminUsersPage nor
 * bulkAdminUserAction exists at head — every cell fails on the missing
 * exports.
 *
 * Bulk mechanics under test (RB-2, verbatim): SERIAL in the given order; the
 * singles' guards hold; a refusal never aborts the loop (partial success is
 * honest, per-row); force-logout calls the array contract ONE id per call so
 * its per-call audit row becomes a per-member row (the batch shape deliberately
 * unused); 42501 propagates whole-call (the caller is not an admin — the route
 * existence-hides).
 */

const row = (i: number): AdminUserRow => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  display_name: `Member ${i}`,
  email: `m${i}@example.com`,
  account_state: 'active',
  is_platform_admin: false,
  created_at: '2026-08-01T10:00:00+00:00',
});

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };

const clientWith = (impl: (fn: string, args: Record<string, unknown>) => RpcResult) => {
  const rpc = jest.fn(async (fn: string, args: Record<string, unknown>) => impl(fn, args));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe('fetchAdminUsersPage (FEAT-H039)', () => {
  const PAGE = {
    users: [row(1), row(2)],
    next_cursor: { name: 'Member 2', id: row(2).id },
    generated_at: '2026-08-03T18:00:00+00:00',
  };

  it('one call, params passed through; page returned whole', async () => {
    const { client, rpc } = clientWith(() => ({ data: PAGE, error: null }));
    const out = await fetchAdminUsersPage(client, {
      filter: 'default',
      search: 'pia',
      afterName: 'Axel',
      afterId: row(1).id,
    });
    expect(out).toEqual({ page: PAGE, refused: false });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('admin_get_users', {
      p_filter: 'default',
      p_search: 'pia',
      p_limit: 50,
      p_after_name: 'Axel',
      p_after_id: row(1).id,
    });
  });

  it('omits empty search and cursor; the page size stays the Hub-fixed 50', async () => {
    const { rpc, client } = clientWith(() => ({ data: PAGE, error: null }));
    await fetchAdminUsersPage(client, { filter: 'all' });
    expect(rpc).toHaveBeenCalledWith('admin_get_users', { p_filter: 'all', p_limit: 50 });
  });

  it('42501 is the refused shape; other codes throw typed', async () => {
    const { client } = clientWith(() => ({
      data: null,
      error: { code: '42501', message: 'nope' },
    }));
    expect(await fetchAdminUsersPage(client, { filter: 'default' })).toEqual({
      page: null,
      refused: true,
    });
    const { client: bad } = clientWith(() => ({
      data: null,
      error: { code: '22023', message: 'unknown filter' },
    }));
    await expect(fetchAdminUsersPage(bad, { filter: 'nope' })).rejects.toThrow(AdminUsersError);
  });
});

describe('bulkAdminUserAction (FEAT-H039, RB-2)', () => {
  const A = row(1).id;
  const B = row(2).id;
  const C = row(3).id;

  it('suspend loops admin_update_user_status serially in the given order; refusals are per-row and never abort', async () => {
    const calls: string[] = [];
    const { client, rpc } = clientWith((fn, args) => {
      calls.push(String(args.target_user_id));
      if (args.target_user_id === B) {
        return { data: null, error: { code: 'P0001', message: 'User is already in the requested state' } };
      }
      return { data: { success: true }, error: null };
    });
    const out = await bulkAdminUserAction(client, 'suspend', [A, B, C]);
    expect(calls).toEqual([A, B, C]); // serial, selection order, past the refusal
    expect(out).toEqual([
      { id: A, ok: true },
      { id: B, ok: false, error: 'User is already in the requested state' },
      { id: C, ok: true },
    ]);
    expect(rpc).toHaveBeenCalledWith('admin_update_user_status', {
      target_user_id: A,
      new_is_active: false,
    });
  });

  it('reactivate flips the flag true', async () => {
    const { client, rpc } = clientWith(() => ({ data: { success: true }, error: null }));
    await bulkAdminUserAction(client, 'reactivate', [A]);
    expect(rpc).toHaveBeenCalledWith('admin_update_user_status', {
      target_user_id: A,
      new_is_active: true,
    });
  });

  it('force-logout calls the array contract ONE id per call — per-member audit rows by construction', async () => {
    const { client, rpc } = clientWith(() => ({ data: { success: true, count: 2 }, error: null }));
    const out = await bulkAdminUserAction(client, 'force-logout', [A, B]);
    expect(out).toEqual([
      { id: A, ok: true },
      { id: B, ok: true },
    ]);
    expect(rpc).toHaveBeenNthCalledWith(1, 'admin_force_logout', { target_user_ids: [A] });
    expect(rpc).toHaveBeenNthCalledWith(2, 'admin_force_logout', { target_user_ids: [B] });
  });

  it('42501 propagates whole-call — the caller is not an admin', async () => {
    const { client } = clientWith(() => ({
      data: null,
      error: { code: '42501', message: 'platform administrator required' },
    }));
    await expect(bulkAdminUserAction(client, 'suspend', [A, B])).rejects.toThrow(
      AdminUsersError,
    );
  });
});
