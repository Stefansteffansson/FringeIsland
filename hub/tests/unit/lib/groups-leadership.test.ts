import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  nominateSteward,
  respondToNomination,
  handToDeusEx,
  closeGroup,
  deleteGroup,
} from '@/lib/groups/leadership';

/**
 * FEAT-H017 (unit) — the lib/groups/leadership fetchers over the FEAT-PC014
 * contracts (migration 20260705072252): RPC name + parameter mapping for the
 * five contracts and error propagation. (The scoped pending-nomination read
 * retired 2026-09-03 with its whole chain -- TASK-H017-01.)
 *
 * Red-first: fails until lib/groups/leadership.ts exists.
 */

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };
const rpc = jest.fn<(fn: string, args?: Record<string, unknown>) => Promise<RpcResult>>();

/** Chainable PostgREST builder mock for the notifications read. */
const chainCalls: Record<string, unknown[][]> = {};
const rows: unknown[] = [];
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'is', 'gt', 'order']) {
  chain[m] = (...args: unknown[]) => {
    (chainCalls[m] ??= []).push(args);
    return chain;
  };
}
chain.then = (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) =>
  Promise.resolve({ data: rows, error: null }).then(onFulfilled);
const from = jest.fn<(table: string) => typeof chain>(() => chain);

const supabase = { rpc, from } as unknown as SupabaseClient;

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  from.mockClear();
  for (const k of Object.keys(chainCalls)) delete chainCalls[k];
  rows.length = 0;
});

describe('FEAT-H017 — lib/groups/leadership fetchers', () => {
  it('nominateSteward calls nominate_steward with the group and the ORDERED nominee ids', async () => {
    await nominateSteward(supabase, 'grp-1', ['n1', 'n2', 'n3']);
    expect(rpc).toHaveBeenCalledWith('nominate_steward', {
      p_group_id: 'grp-1',
      p_nominee_ids: ['n1', 'n2', 'n3'],
    });
  });

  it('respondToNomination calls respond_to_stewardship_nomination with the notification id + accept', async () => {
    await respondToNomination(supabase, 'ntf-1', true);
    expect(rpc).toHaveBeenCalledWith('respond_to_stewardship_nomination', {
      p_notification_id: 'ntf-1',
      p_accept: true,
    });
    await respondToNomination(supabase, 'ntf-1', false);
    expect(rpc).toHaveBeenCalledWith('respond_to_stewardship_nomination', {
      p_notification_id: 'ntf-1',
      p_accept: false,
    });
  });

  it('handToDeusEx / closeGroup / deleteGroup each call their contract with the group id', async () => {
    await handToDeusEx(supabase, 'grp-1');
    expect(rpc).toHaveBeenCalledWith('hand_stewardship_to_deusex', { p_group_id: 'grp-1' });
    await closeGroup(supabase, 'grp-1');
    expect(rpc).toHaveBeenCalledWith('close_group', { p_group_id: 'grp-1' });
    await deleteGroup(supabase, 'grp-1');
    expect(rpc).toHaveBeenCalledWith('delete_group', { p_group_id: 'grp-1' });
  });

  it('propagates the contract error object (code intact for the route house map)', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'a nomination is already in flight' },
    });
    await expect(nominateSteward(supabase, 'grp-1', ['n1'])).rejects.toMatchObject({
      code: 'P0001',
    });
    await expect(closeGroup(supabase, 'grp-1')).rejects.toMatchObject({ code: 'P0001' });
  });
});
