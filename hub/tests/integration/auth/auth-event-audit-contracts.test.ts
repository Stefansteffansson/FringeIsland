import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  createTestClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  signInWithRetry,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC019 — durable auth-event audit binding (Cycle ADM-A, board AB-2;
 * the AC-6 / AC3-O6 discharge). WRITTEN RED-FIRST against a substrate with no
 * `record_auth_event()`; green only after the `20260731190000` migration
 * applies (the schema gate).
 *
 * The recorder is the SECURITY DEFINER audit-write primitive the governance
 * spec's "Audit access policies" row prescribes and whose absence Q6 recorded
 * (three raw patterns, no abstraction). Scope: the four member-auth moments.
 *
 * Producer-driven throughout (the AC3-2 lesson): every row asserted here is
 * created by invoking the contract as the flow's actor — never by fixture
 * INSERT. Fixture rows carry metadata {"suite":"adma03"} and are swept.
 */

jest.setTimeout(120_000);

const MARK = { suite: 'adma03' };

describe('FEAT-PC019 — record_auth_event, the durable auth-audit primitive', () => {
  let member: TestUser;
  let memberClient: SupabaseClient;

  beforeAll(async () => {
    member = await createTestUser({ displayName: 'AdmaAudit' });
    memberClient = createTestClient();
    await signInWithRetry(memberClient, member.email, member.password);
  });

  afterAll(async () => {
    await runAdminSql(
      `DELETE FROM public.admin_audit_log WHERE metadata->>'suite' = 'adma03';`,
    ).catch(() => undefined);
    await cleanupTestUser(member.user.id);
  });

  // ---------------------------------------------------------------- STORY-1

  it('S1: an authenticated caller writes one self-targeted row, action verbatim', async () => {
    const { error } = await memberClient.rpc('record_auth_event', {
      p_action: 'auth.sign_in',
      p_metadata: MARK,
    });
    expect(error).toBeNull();

    const rows = (await runAdminSql(`
      SELECT actor_group_id, action, target, metadata
        FROM public.admin_audit_log
       WHERE metadata->>'suite' = 'adma03' AND action = 'auth.sign_in';
    `)) as unknown as {
      actor_group_id: string;
      action: string;
      target: string;
      metadata: Record<string, string>;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_group_id).toBe(member.personalGroupId);
    expect(rows[0].target).toBe('self');
    expect(rows[0].metadata).toEqual(MARK);
  });

  it('S1: anon EXECUTE is refused (pre-session moments stay mirror-only, recorded)', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('record_auth_event', { p_action: 'auth.sign_in' });
    expect(error).not.toBeNull();
  });

  it('S1: append-only holds against the post-change catalog — no member UPDATE/DELETE path (B-ADMIN-007 forward)', async () => {
    const ids = (await runAdminSql(`
      SELECT id FROM public.admin_audit_log
       WHERE metadata->>'suite' = 'adma03' LIMIT 1;
    `)) as unknown as { id: string }[];
    expect(ids).toHaveLength(1);
    const id = ids[0].id;

    const upd = await memberClient
      .from('admin_audit_log')
      .update({ action: 'tampered' })
      .eq('id', id)
      .select();
    expect(upd.data ?? []).toHaveLength(0); // no UPDATE policy — zero rows reachable

    const del = await memberClient.from('admin_audit_log').delete().eq('id', id).select();
    expect(del.data ?? []).toHaveLength(0);

    const still = (await runAdminSql(
      `SELECT action FROM public.admin_audit_log WHERE id = '${id}';`,
    )) as unknown as { action: string }[];
    expect(still).toHaveLength(1);
    expect(still[0].action).not.toBe('tampered');
  });

  // ---------------------------------------------------------------- STORY-2

  it('S2: erasure interplay — the REAL farewell path leaves the row actor-less and PII-free', async () => {
    // Producer-real: an actual Mist, the actual explicit_erase_mist — not a
    // hand-rolled teardown (the consent ledger's append-only trigger rightly
    // refused the first draft's raw DELETE; only the controlled erasure path
    // may clear it, so the controlled erasure path is what this test drives).
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn, error: signErr } = await withAnonRateLimitRetry(() =>
      mist.auth.signInAnonymously(),
    );
    expect(signErr).toBeNull();
    const authId = signIn.user!.id;

    // handle_new_user materializes the Mist profile — poll for it.
    let pg: string | null = null;
    for (let i = 0; i < 12 && !pg; i++) {
      const { data } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('auth_user_id', authId)
        .maybeSingle();
      pg = (data?.personal_group_id as string | undefined) ?? null;
      if (!pg) await new Promise((r) => setTimeout(r, 500));
    }
    expect(pg).not.toBeNull();

    const { error } = await mist.rpc('record_auth_event', {
      p_action: 'mist.explicit_erase',
      p_metadata: MARK,
    });
    expect(error).toBeNull();

    const { error: eraseErr } = await mist.rpc('explicit_erase_mist');
    expect(eraseErr).toBeNull();

    const rows = (await runAdminSql(`
      SELECT actor_group_id, action, metadata
        FROM public.admin_audit_log
       WHERE metadata->>'suite' = 'adma03'
         AND action = 'mist.explicit_erase'
         AND metadata->>'probe' IS NULL;
    `)) as unknown as {
      actor_group_id: string | null;
      action: string;
      metadata: Record<string, string>;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_group_id).toBeNull(); // actor-less, not gone
    expect(rows[0].metadata).toEqual(MARK); // content-free residue only

    // And the Mist itself is fully gone (no orphaned profile or group).
    const gone = (await runAdminSql(
      `SELECT 1 FROM public.groups WHERE id = '${pg}';`,
    )) as unknown as unknown[];
    expect(gone).toHaveLength(0);
  });

  // ---------------------------------------------------------------- STORY-3

  it('S3: all four auth-moment action strings write through the one contract', async () => {
    for (const action of ['auth.sign_up', 'auth.sign_in', 'mist.transcend', 'mist.explicit_erase']) {
      const { error } = await memberClient.rpc('record_auth_event', {
        p_action: action,
        p_metadata: { ...MARK, probe: 'four-moments' },
      });
      expect(error).toBeNull();
    }
    const rows = (await runAdminSql(`
      SELECT action FROM public.admin_audit_log
       WHERE metadata->>'suite' = 'adma03' AND metadata->>'probe' = 'four-moments'
       ORDER BY action;
    `)) as unknown as { action: string }[];
    expect(rows.map((r) => r.action)).toEqual([
      'auth.sign_in',
      'auth.sign_up',
      'mist.explicit_erase',
      'mist.transcend',
    ]);
  });
});
