import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createAdminClient,
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(300_000);

/**
 * FEAT-PC031 (ADR-U054, TASK-EML-01) — member email rectification.
 *
 * The PC-4 family's tenth contract and the first in this repository that
 * WRITES the auth schema. Migration `20260911100000`.
 *
 * RED AT HEAD (pre-migration), by class:
 *  - Every `admin_update_user_email` call is PGRST202 (no such function), so
 *    every cell asserting a typed refusal code, a store write, a count, an
 *    audit row or a notice fails.
 *  - `account_email_changed` is unregistered, so the kind-registry cell finds
 *    no row.
 *
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - none. Every cell in this file exercises the new contract.
 */

const NEW_KIND = 'account_email_changed';
const NOTICE_TITLE = 'Your sign-in email address was changed';

async function makePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid; v_role uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      SELECT id INTO v_role FROM public.group_roles
        WHERE group_id = v_deusex AND name = 'DeusEx';
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        VALUES (v_deusex, '${personalGroupId}', v_deusex, 'active')
        ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${personalGroupId}', v_deusex, v_role, v_deusex)
        ON CONFLICT DO NOTHING;
    END $$;`);
}

async function demotePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      DELETE FROM public.user_group_roles
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
      DELETE FROM public.group_memberships
        WHERE group_id = v_deusex AND member_group_id = '${personalGroupId}';
    END $$;`).catch(() => undefined);
}

const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe('FEAT-PC031 — member email rectification contract', () => {
  const admin = createAdminClient();

  let ada: TestUser; // platform administrator — the caller
  let mona: TestUser; // the rectification target
  let nils: TestUser; // a non-admin, and the collision partner
  const users: TestUser[] = [];

  let adaC: SupabaseClient;
  let nilsC: SupabaseClient;

  let monaUserId: string;

  const userRow = async (userId: string) => {
    const { data, error } = await admin
      .from('users')
      .select('id,email,updated_at')
      .eq('id', userId)
      .single();
    if (error) throw new Error(`userRow: ${error.message}`);
    return data as { id: string; email: string | null; updated_at: string };
  };

  /** auth-schema state for a target, read through the service role. */
  const authState = async (authUserId: string) => {
    const rows = await runAdminSql(`
      SELECT json_build_object(
        'email', u.email,
        'confirmed', (u.email_confirmed_at IS NOT NULL),
        'change_cleared', (u.email_change = '' AND u.email_change_token_new = ''
                           AND u.email_change_token_current = ''
                           AND u.email_change_sent_at IS NULL
                           AND u.email_change_confirm_status = 0),
        'identity_email', (SELECT i.email FROM auth.identities i
                            WHERE i.user_id = u.id AND i.provider = 'email' LIMIT 1),
        'identity_data_email', (SELECT i.identity_data->>'email' FROM auth.identities i
                            WHERE i.user_id = u.id AND i.provider = 'email' LIMIT 1),
        'sessions', (SELECT count(*) FROM auth.sessions s WHERE s.user_id = u.id)
      )::text AS state
      FROM auth.users u WHERE u.id = '${authUserId}';`);
    const raw = Array.isArray(rows) ? rows[0] : rows;
    const text = (raw as Record<string, unknown>)?.state as string;
    return JSON.parse(text) as {
      email: string;
      confirmed: boolean;
      change_cleared: boolean;
      identity_email: string | null;
      identity_data_email: string | null;
      sessions: number;
    };
  };

  const latestAudit = async (target: string) => {
    const { data } = await admin
      .from('admin_audit_log')
      .select('action,target,metadata,created_at')
      .eq('action', 'member.email_change')
      .eq('target', target)
      .order('created_at', { ascending: false })
      .limit(1);
    return (data && data[0]) || null;
  };

  const notices = async (recipientGroupId: string) => {
    const { data } = await admin
      .from('notifications')
      .select('type,title,body')
      .eq('recipient_group_id', recipientGroupId)
      .eq('type', NEW_KIND);
    return data || [];
  };

  const rectify = async (
    client: SupabaseClient,
    targetUserId: string,
    newEmail: string,
    reason: string | null,
  ) =>
    client.rpc('admin_update_user_email', {
      target_user_id: targetUserId,
      p_new_email: newEmail,
      p_reason: reason,
    });

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'Ada' });
    mona = await createTestUser({ displayName: 'Mona' });
    nils = await createTestUser({ displayName: 'Nils' });
    users.push(ada, mona, nils);

    await makePlatformAdmin(ada.personalGroupId);

    adaC = createTestClient();
    await signInWithRetry(adaC, ada.email, ada.password);
    nilsC = createTestClient();
    await signInWithRetry(nilsC, nils.email, nils.password);

    const { data } = await admin.from('users').select('id').eq('auth_user_id', mona.user.id).single();
    monaUserId = (data as { id: string }).id;
  });

  afterAll(async () => {
    await demotePlatformAdmin(ada.personalGroupId);
    for (const u of users) {
      const res = await cleanupTestUser(u.user.id).catch((e) => e as Error);
      if (res instanceof Error) throw new Error(`cleanupTestUser(${u.email}) failed: ${res.message}`);
    }
  });

  // ── STORY-1: the gate and the target ────────────────────────────────────
  describe('STORY-1 — the gate and the target', () => {
    it('refuses a non-administrator with 42501', async () => {
      const { error } = await rectify(nilsC, monaUserId, `x${stamp()}@fringeisland.test`, 'nope');
      expect(error?.code).toBe('42501');
    });

    it('refuses a missing target with P0002', async () => {
      const { error } = await rectify(
        adaC,
        '00000000-0000-0000-0000-000000000000',
        `x${stamp()}@fringeisland.test`,
        'a reason',
      );
      expect(error?.code).toBe('P0002');
    });
  });

  // ── STORY-2: normalisation, validation, the no-op guard ─────────────────
  describe('STORY-2 — normalisation and validation', () => {
    it('refuses a blank reason with 22023', async () => {
      const { error } = await rectify(adaC, monaUserId, `x${stamp()}@fringeisland.test`, '   ');
      expect(error?.code).toBe('22023');
    });

    it('refuses a malformed address with 22023', async () => {
      const { error } = await rectify(adaC, monaUserId, 'not-an-address', 'a reason');
      expect(error?.code).toBe('22023');
    });

    it('refuses the current address as a no-op with P0001, writing nothing', async () => {
      const before = await userRow(monaUserId);
      const { error } = await rectify(adaC, monaUserId, mona.email.toUpperCase(), 'a reason');
      expect(error?.code).toBe('P0001');
      const after = await userRow(monaUserId);
      expect(after.updated_at).toBe(before.updated_at);
      expect(await latestAudit(monaUserId)).toBeNull();
    });

    it('lowercases and trims before writing', async () => {
      const target = `  Mixed${stamp()}@FringeIsland.test  `;
      const expected = target.trim().toLowerCase();
      const { data, error } = await rectify(adaC, monaUserId, target, 'normalisation check');
      expect(error).toBeNull();
      expect((data as { new_email: string }).new_email).toBe(expected);
      expect((await userRow(monaUserId)).email).toBe(expected);
      expect((await authState(mona.user.id)).email).toBe(expected);
    });
  });

  // ── STORY-3: collision ──────────────────────────────────────────────────
  describe('STORY-3 — collision', () => {
    it("refuses another member's address, case-insensitively, before any write", async () => {
      const before = await userRow(monaUserId);
      const { error } = await rectify(adaC, monaUserId, nils.email.toUpperCase(), 'collision check');
      expect(error?.code).toBe('P0001');
      expect((await userRow(monaUserId)).email).toBe(before.email);
      expect((await userRow(monaUserId)).updated_at).toBe(before.updated_at);
    });
  });

  // ── STORY-4: no email identity ──────────────────────────────────────────
  describe('STORY-4 — accounts with no email identity', () => {
    it('refuses a Mist with P0001', async () => {
      // A Mist is `is_temporary` — flip a fixture data-level (never DDL:
      // mid-suite DDL poisons the pooler) and restore it immediately.
      await runAdminSql(`UPDATE public.users SET is_temporary = true WHERE id = '${monaUserId}';`);
      const { error } = await rectify(adaC, monaUserId, `x${stamp()}@fringeisland.test`, 'mist check');
      await runAdminSql(`UPDATE public.users SET is_temporary = false WHERE id = '${monaUserId}';`);
      expect(error?.code).toBe('P0001');
      expect(error?.message).toMatch(/anonymous/i);
    });
  });

  // ── STORY-5..9: the successful path ─────────────────────────────────────
  describe('STORY-5 through STORY-9 — the rectification', () => {
    it('writes all three stores, cuts sessions, sweeps invitations, audits and notifies', async () => {
      const previous = (await userRow(monaUserId)).email as string;
      const next = `rectified${stamp()}@fringeisland.test`;

      // An outstanding offer to the OLD address, and one to the NEW address.
      const otherInvite = `keepme${stamp()}@fringeisland.test`;
      await runAdminSql(`
        INSERT INTO public.pending_email_invitations (group_id, invited_email, invited_by_group_id, status)
        VALUES ('${nils.personalGroupId}', '${previous}', '${nils.personalGroupId}', 'pending'),
               ('${nils.personalGroupId}', '${otherInvite}', '${nils.personalGroupId}', 'pending');`);

      // A live session for the target, so the cut has something to cut.
      // Sign in with the CURRENT address, not the fixture's original — the
      // STORY-2 normalisation cell already rectified it, which is the contract
      // working. Using `mona.email` here would assert a stale precondition.
      const monaC = createTestClient();
      await signInWithRetry(monaC, previous, mona.password);
      expect((await authState(mona.user.id)).sessions).toBeGreaterThan(0);

      const { data, error } = await rectify(adaC, monaUserId, next, 'Member lost access to the old mailbox');
      expect(error).toBeNull();

      const payload = data as {
        success: boolean;
        previous_email: string;
        new_email: string;
        sessions_revoked: number;
        invitations_deleted: number;
      };
      expect(payload.success).toBe(true);
      expect(payload.previous_email).toBe(previous);
      expect(payload.new_email).toBe(next);
      expect(payload.sessions_revoked).toBeGreaterThan(0);
      expect(payload.invitations_deleted).toBe(1);

      // STORY-5: three stores.
      const auth = await authState(mona.user.id);
      expect(auth.email).toBe(next);
      expect(auth.confirmed).toBe(true);
      expect(auth.change_cleared).toBe(true);
      expect(auth.identity_data_email).toBe(next);
      expect(auth.identity_email).toBe(next); // the GENERATED column follows
      expect((await userRow(monaUserId)).email).toBe(next);

      // STORY-6: sessions gone.
      expect(auth.sessions).toBe(0);

      // STORY-7: the old offer swept, the unrelated one left alone.
      const remaining = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.pending_email_invitations WHERE lower(invited_email) = '${previous}';`,
      );
      expect((Array.isArray(remaining) ? remaining[0] : remaining).n).toBe(0);
      const kept = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.pending_email_invitations WHERE lower(invited_email) = '${otherInvite}';`,
      );
      expect((Array.isArray(kept) ? kept[0] : kept).n).toBe(1);

      // STORY-8: the audit row carries both addresses.
      const audit = await latestAudit(monaUserId);
      expect(audit).not.toBeNull();
      const meta = (audit as { metadata: Record<string, unknown> }).metadata;
      expect(meta.previous_email).toBe(previous);
      expect(meta.new_email).toBe(next);
      expect(meta.reason).toBe('Member lost access to the old mailbox');

      // STORY-9: the notice, with the contract's literal title.
      const rows = await notices(mona.personalGroupId);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[rows.length - 1].title).toBe(NOTICE_TITLE);

      // Cleanup the leftover invitation this test created.
      await runAdminSql(
        `DELETE FROM public.pending_email_invitations WHERE lower(invited_email) = '${otherInvite}';`,
      );
    });

    it('registers the notice kind in the account category', async () => {
      const { data } = await admin
        .from('notification_kinds')
        .select('kind,category_key,label')
        .eq('kind', NEW_KIND)
        .single();
      expect(data).toMatchObject({ kind: NEW_KIND, category_key: 'account' });
    });
  });

  // ── STORY-10 / ADR-U038: the adversarial direct-caller cell ─────────────
  describe('STORY-10 — the substrate refuses what the route refuses', () => {
    it('refuses a direct PostgREST call from a signed-in non-admin', async () => {
      // The ADR-U038 check: the gate is the contract's, not the BFF route's.
      const { error } = await rectify(nilsC, monaUserId, `x${stamp()}@fringeisland.test`, 'direct call');
      expect(error?.code).toBe('42501');
    });
  });
});
