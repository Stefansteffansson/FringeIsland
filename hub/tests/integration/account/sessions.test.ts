import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC009 — session inventory & targeted revocation (IDN-11, platform half).
 * Integration tests against real Postgres + GoTrue. The contracts are the
 * `get_own_sessions()` / `revoke_own_session()` SECURITY DEFINER functions,
 * exercised via `.rpc()` as the authenticated caller (`auth.uid()`-direct inside
 * the definer; `is_current` correlated via the JWT `session_id` claim). The
 * revocation hint (ADR-U039) is asserted at the substrate: a `realtime.messages`
 * row on the private topic, plus the durable `session_revoked` audit row.
 *
 * Red-first: until the migration lands both functions, every `.rpc()` errors
 * (function not found in the schema cache) — the headline red the schema gate
 * turns green.
 *
 * Remote-DB suite with multiple sign-ins (each `signInWithPassword` mints a
 * session row — that's the substrate under test); allow generous time.
 */

jest.setTimeout(90000);

type SessionRow = {
  id: string;
  created_at: string;
  last_active: string;
  user_agent: string | null;
  ip: string | null;
  is_current: boolean;
};

/** The caller's own session id, decoded from the JWT `session_id` claim. */
async function sessionIdOf(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('sessionIdOf: no active session on client');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  if (!payload.session_id) throw new Error('sessionIdOf: JWT carries no session_id claim');
  return payload.session_id as string;
}

const sessionTopic = (authUserId: string) => `account:${authUserId}:sessions`;

describe('FEAT-PC009 session inventory & targeted revocation', () => {
  const admin = createAdminClient();
  let fim: TestUser;
  let other: TestUser;
  let clientA: SupabaseClient; // primary device
  let clientB: SupabaseClient; // second device (revoked remotely in STORY-2)
  let clientOther: SupabaseClient; // a different FIM entirely
  let sessionA: string;
  let sessionB: string;
  let sessionOther: string;

  beforeAll(async () => {
    fim = await createTestUser({ displayName: 'Sessions FIM' });
    other = await createTestUser({ displayName: 'Sessions Other' });

    clientA = createTestClient();
    clientB = createTestClient();
    clientOther = createTestClient();
    await signInWithRetry(clientA, fim.email, fim.password);
    await signInWithRetry(clientB, fim.email, fim.password);
    await signInWithRetry(clientOther, other.email, other.password);
    sessionA = await sessionIdOf(clientA);
    sessionB = await sessionIdOf(clientB);
    sessionOther = await sessionIdOf(clientOther);
  });

  afterAll(async () => {
    // Tidy the audit rows this suite writes, then the users (D15 chain).
    for (const u of [fim, other]) {
      const { data: profile } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('auth_user_id', u.user.id)
        .maybeSingle();
      if (profile?.personal_group_id) {
        await admin
          .from('admin_audit_log')
          .delete()
          .eq('actor_group_id', profile.personal_group_id)
          .eq('action', 'session_revoked');
      }
      await cleanupTestUser(u.user.id);
    }
  });

  // ── STORY-1: inventory ────────────────────────────────────────────────────

  it('S1: returns one element per active session with the contract shape, newest-last-active first', async () => {
    const { data, error } = await clientA.rpc('get_own_sessions');
    expect(error).toBeNull();
    const rows = data as SessionRow[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(2); // A + B at minimum

    const ids = rows.map((r) => r.id);
    expect(ids).toContain(sessionA);
    expect(ids).toContain(sessionB);
    expect(ids).not.toContain(sessionOther); // never another subject's session

    for (const r of rows) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.created_at).toBe('string');
      expect(typeof r.last_active).toBe('string');
      expect(r).toHaveProperty('user_agent');
      expect(r).toHaveProperty('ip');
      expect(typeof r.is_current).toBe('boolean');
    }
    const times = rows.map((r) => new Date(r.last_active).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times); // desc order, epoch-ms compare
  });

  it('S1: marks exactly the calling session as is_current', async () => {
    const { data: fromA } = await clientA.rpc('get_own_sessions');
    const currentA = (fromA as SessionRow[]).filter((r) => r.is_current);
    expect(currentA).toHaveLength(1);
    expect(currentA[0].id).toBe(sessionA);

    const { data: fromB } = await clientB.rpc('get_own_sessions');
    const currentB = (fromB as SessionRow[]).filter((r) => r.is_current);
    expect(currentB).toHaveLength(1);
    expect(currentB[0].id).toBe(sessionB);
  });

  // ── STORY-2/4: targeted revocation, own-subject boundary ─────────────────

  it('S2: a foreign session id and a nonexistent id both raise P0002 (no existence leak)', async () => {
    const { error: foreignErr } = await clientA.rpc('revoke_own_session', {
      p_session_id: sessionOther,
    });
    expect(foreignErr).not.toBeNull();
    expect(foreignErr!.code).toBe('P0002');

    const { error: ghostErr } = await clientA.rpc('revoke_own_session', {
      p_session_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(ghostErr).not.toBeNull();
    expect(ghostErr!.code).toBe('P0002');

    // The foreign target is untouched.
    const { error: otherAlive } = await clientOther.auth.getUser();
    expect(otherAlive).toBeNull();
  });

  it('S2: revoking B from A removes exactly B; B cannot continue; A is untouched', async () => {
    const { error } = await clientA.rpc('revoke_own_session', { p_session_id: sessionB });
    expect(error).toBeNull();

    const { data: after } = await clientA.rpc('get_own_sessions');
    const ids = (after as SessionRow[]).map((r) => r.id);
    expect(ids).not.toContain(sessionB);
    expect(ids).toContain(sessionA);

    // B's session row is gone — the auth server refuses it (docs-blessed
    // session_id-claim liveness check), even though B's JWT has not expired.
    const { error: bDead } = await clientB.auth.getUser();
    expect(bDead).not.toBeNull();

    const { error: aAlive } = await clientA.auth.getUser();
    expect(aAlive).toBeNull();
  });

  // ── STORY-3/5: the hint and the durable record ────────────────────────────

  it('S3+S5: a successful revoke emits one private-topic hint and one audit row; a P0002 emits neither', async () => {
    // Fresh second device to revoke, so this test owns its evidence.
    const clientB2 = createTestClient();
    await signInWithRetry(clientB2, fim.email, fim.password);
    const sessionB2 = await sessionIdOf(clientB2);

    const topic = sessionTopic(fim.user.id);
    const countMessages = async () =>
      Number(
        (
          await runAdminSql(
            `SELECT count(*) AS n FROM realtime.messages WHERE topic = '${topic}' AND event = 'session_revoked';`,
          )
        )[0].n,
      );
    const { data: profile } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', fim.user.id)
      .single();
    const countAudit = async () => {
      const { count } = await admin
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('actor_group_id', profile!.personal_group_id)
        .eq('action', 'session_revoked');
      return count ?? 0;
    };

    const msgsBefore = await countMessages();
    const auditBefore = await countAudit();

    const { error } = await clientA.rpc('revoke_own_session', { p_session_id: sessionB2 });
    expect(error).toBeNull();

    expect(await countMessages()).toBe(msgsBefore + 1);
    expect(await countAudit()).toBe(auditBefore + 1);

    const [latest] = await runAdminSql(
      `SELECT payload FROM realtime.messages WHERE topic = '${topic}' AND event = 'session_revoked' ORDER BY inserted_at DESC LIMIT 1;`,
    );
    const payload = latest.payload as { payload?: { session_id?: string } } & {
      session_id?: string;
    };
    // realtime.send() nests the caller payload; accept either envelope shape.
    const carried = payload?.payload?.session_id ?? payload?.session_id;
    expect(carried).toBe(sessionB2);

    // A failed revoke emits neither.
    const { error: ghostErr } = await clientA.rpc('revoke_own_session', {
      p_session_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(ghostErr!.code).toBe('P0002');
    expect(await countMessages()).toBe(msgsBefore + 1);
    expect(await countAudit()).toBe(auditBefore + 1);
  });

  it('S2: revoking the CURRENT session is allowed and takes effect', async () => {
    const clientB3 = createTestClient();
    await signInWithRetry(clientB3, fim.email, fim.password);
    const sessionB3 = await sessionIdOf(clientB3);

    const { error } = await clientB3.rpc('revoke_own_session', { p_session_id: sessionB3 });
    expect(error).toBeNull();

    const { error: dead } = await clientB3.auth.getUser();
    expect(dead).not.toBeNull();
  });

  // ── STORY-1/2: suspension survival ────────────────────────────────────────

  it('S1+S2: a suspended FIM can still list and revoke (security-protective, auth.uid()-direct)', async () => {
    const clientB4 = createTestClient();
    await signInWithRetry(clientB4, fim.email, fim.password);
    const sessionB4 = await sessionIdOf(clientB4);

    await admin.from('users').update({ is_active: false }).eq('auth_user_id', fim.user.id);
    try {
      const { data, error: listErr } = await clientA.rpc('get_own_sessions');
      expect(listErr).toBeNull();
      expect((data as SessionRow[]).map((r) => r.id)).toContain(sessionB4);

      const { error: revokeErr } = await clientA.rpc('revoke_own_session', {
        p_session_id: sessionB4,
      });
      expect(revokeErr).toBeNull();
    } finally {
      await admin.from('users').update({ is_active: true }).eq('auth_user_id', fim.user.id);
    }
  });

  // ── STORY-1/4: the Mist and the direct-caller answer ──────────────────────

  it('S1+S4: an anonymous-session Mist gets 42501 on both contracts', async () => {
    const mist = createTestClient();
    const { data: anonData, error: anonErr } = await withAnonRateLimitRetry(() =>
      mist.auth.signInAnonymously(),
    );
    expect(anonErr).toBeNull();

    try {
      const { error: listErr } = await mist.rpc('get_own_sessions');
      expect(listErr).not.toBeNull();
      expect(listErr!.code).toBe('42501');

      const { error: revokeErr } = await mist.rpc('revoke_own_session', {
        p_session_id: '00000000-0000-0000-0000-000000000000',
      });
      expect(revokeErr).not.toBeNull();
      expect(revokeErr!.code).toBe('42501');
    } finally {
      if (anonData?.user?.id) await cleanupTestUser(anonData.user.id);
    }
  });

  // ── STORY-3: private-channel authorization (client-side probe) ────────────

  it('S3: a member can subscribe to their OWN session topic; another member’s topic is refused', async () => {
    // jest-environment-node exposes no WebSocket global (verified: the identical
    // probe SUBSCRIBEs under plain node), so give realtime-js its own `ws`
    // transport explicitly. Authorization rides the raw JWT via realtime.setAuth.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WS = require('ws');
    const { createClient } = await import('@supabase/supabase-js');

    const probe = async (accessToken: string, topic: string) => {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { transport: WS },
        },
      );
      await client.realtime.setAuth(accessToken);
      try {
        return await new Promise<string>((resolve) => {
          const channel = client.channel(topic, { config: { private: true } });
          const timer = setTimeout(() => resolve('TIMED_OUT'), 15000);
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              clearTimeout(timer);
              resolve(status);
            }
          });
        });
      } finally {
        client.realtime.disconnect();
      }
    };

    const { data: sess } = await clientA.auth.getSession();
    const tokenA = sess.session!.access_token;

    const own = await probe(tokenA, sessionTopic(fim.user.id));
    expect(own).toBe('SUBSCRIBED');

    const foreign = await probe(tokenA, sessionTopic(other.user.id));
    expect(foreign).not.toBe('SUBSCRIBED');
  });
});
