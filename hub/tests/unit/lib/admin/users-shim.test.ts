import { fetchAdminUsers, type AdminUserRow } from '@/lib/admin/users';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * PC024 transition shim (FEAT-H039 tranche 1, Cycle ADM-E) — fetchAdminUsers
 * must tolerate BOTH live contract shapes across the schema-gate apply:
 * the pre-PC024 jsonb array, and the PC024 keyed page
 * {users, next_cursor, generated_at} (walked to exhaustion so the surface
 * stays byte-identical until the bounded-list rework replaces this shim).
 *
 * RED-FIRST (2026-08-03): the keyed-page cells fail at head — the current
 * wrapper casts whatever arrives to AdminUserRow[], so a keyed page comes
 * back as a mis-shaped object, not the walked rows. The array and refusal
 * cells are LABELLED DESIGNED-GREEN pins (green before and after): they pin
 * the behavior the shim must preserve, never claimed as red.
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

const clientWith = (results: RpcResult[]) => {
  const rpc = jest.fn<Promise<RpcResult>, [string, Record<string, unknown>?]>();
  for (const r of results) rpc.mockResolvedValueOnce(r);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe('fetchAdminUsers — PC024 transition shim (FEAT-H039 tranche 1)', () => {
  it('DESIGNED-GREEN pin: the pre-PC024 array shape passes through in one call', async () => {
    const rows = [row(1), row(2)];
    const { client, rpc } = clientWith([{ data: rows, error: null }]);
    const out = await fetchAdminUsers(client, 'default');
    expect(out).toEqual({ users: rows, refused: false });
    expect(rpc).toHaveBeenCalledTimes(1);
    // The FIRST call must stay old-signature-compatible: p_filter only, no new
    // parameters — or the pre-apply function refuses it outright (PGRST202).
    expect(rpc).toHaveBeenCalledWith('admin_get_users', { p_filter: 'default' });
  });

  it('keyed pages are walked to exhaustion and flattened', async () => {
    const p1 = [row(1), row(2)];
    const p2 = [row(3)];
    const { client, rpc } = clientWith([
      {
        data: { users: p1, next_cursor: { name: 'Member 2', id: p1[1].id }, generated_at: 'x' },
        error: null,
      },
      { data: { users: p2, next_cursor: null, generated_at: 'x' }, error: null },
    ]);
    const out = await fetchAdminUsers(client, 'all');
    expect(out.refused).toBe(false);
    expect(out.users).toEqual([...p1, ...p2]);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, 'admin_get_users', { p_filter: 'all' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'admin_get_users', {
      p_filter: 'all',
      p_limit: 200,
      p_after_name: 'Member 2',
      p_after_id: p1[1].id,
    });
  });

  it('a single keyed page with a null cursor needs no second call', async () => {
    const p1 = [row(1)];
    const { client, rpc } = clientWith([
      { data: { users: p1, next_cursor: null, generated_at: 'x' }, error: null },
    ]);
    const out = await fetchAdminUsers(client, 'platform_admins');
    expect(out.users).toEqual(p1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('DESIGNED-GREEN pin: 42501 stays the refused shape', async () => {
    const { client } = clientWith([{ data: null, error: { code: '42501', message: 'nope' } }]);
    const out = await fetchAdminUsers(client, 'default');
    expect(out).toEqual({ users: null, refused: true });
  });
});
