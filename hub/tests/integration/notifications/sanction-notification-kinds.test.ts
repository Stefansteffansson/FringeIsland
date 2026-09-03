import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(120_000);

/**
 * FEAT-PD021 (DB-4, TASK-DB4-01) — sanction notification kinds.
 * The registry half of DB-4: a `sanctions` category no member can mute, four
 * group-hold kinds under it, two account-hold kinds under the already locked-on
 * `account`. Rows only — the pipeline is PD013/PD016's as built. Migration
 * `20260903120000` (rides FEAT-PC030's gate).
 *
 * RED AT HEAD (pre-migration): the category and the six kinds are absent; the
 * service-role insert of a `group_suspended` row violates the kinds FK; the
 * preference write on `sanctions` fails as an UNKNOWN category, not as the
 * non-suppressible refusal; get_own_notifications carries no sanction row.
 *
 * LABELLED GREEN: the `account` refusal (N-D, locked on since 20260726120000)
 * and the muted-suppressible control (a muted group-lifecycle row is dropped).
 */

const EXPECTED_KINDS: Array<{ kind: string; category_key: string; label: string }> = [
  { kind: 'group_rested', category_key: 'sanctions', label: 'Your group is resting' },
  { kind: 'group_woken', category_key: 'sanctions', label: 'Your group is awake again' },
  { kind: 'group_suspended', category_key: 'sanctions', label: 'Your group has been suspended' },
  { kind: 'group_reactivated', category_key: 'sanctions', label: 'Your group has been reactivated' },
  { kind: 'account_suspended', category_key: 'account', label: 'Your account has been suspended' },
  { kind: 'account_reinstated', category_key: 'account', label: 'Your account has been reinstated' },
];

describe('FEAT-PD021 — sanction notification kinds (the locked-on vocabulary)', () => {
  const admin = createAdminClient();
  let mona: TestUser;
  let monaC: SupabaseClient;

  beforeAll(async () => {
    mona = await createTestUser({ displayName: 'Pd21Mona' });
    monaC = createTestClient();
    await signInWithRetry(monaC, mona.email, mona.password);
  });

  afterAll(async () => {
    if (mona) await cleanupTestUser(mona.user.id).catch(() => undefined);
  });

  describe('STORY-1 — the vocabulary exists and cannot be muted', () => {
    it('the registry holds the locked-on sanctions category and the six hold kinds with their labels', async () => {
      const { data: cat, error: catErr } = await admin
        .from('notification_categories')
        .select('key,label,lawful_basis,interruption_grade,member_suppressible')
        .eq('key', 'sanctions')
        .maybeSingle();
      expect(catErr).toBeNull();
      expect(cat).toEqual({
        key: 'sanctions',
        label: 'Holds & sanctions',
        lawful_basis: 'transactional',
        interruption_grade: 'badge',
        member_suppressible: false,
      });

      const { data: kinds, error: kindsErr } = await admin
        .from('notification_kinds')
        .select('kind,category_key,label')
        .in('kind', EXPECTED_KINDS.map((k) => k.kind))
        .order('kind');
      expect(kindsErr).toBeNull();
      expect(kinds).toEqual([...EXPECTED_KINDS].sort((a, b) => a.kind.localeCompare(b.kind)));
    });

    it('a member who muted every suppressible category still receives sanctions and account rows; a muted suppressible kind is dropped (control)', async () => {
      const { data: cats, error } = await admin
        .from('notification_categories')
        .select('key')
        .eq('member_suppressible', true);
      expect(error).toBeNull();
      for (const c of cats as Array<{ key: string }>) {
        const { error: prefErr } = await monaC.rpc('set_own_notification_preference', {
          p_category_key: c.key,
          p_channel: 'in_app',
          p_allowed: false,
        });
        expect(prefErr).toBeNull();
      }

      const insert = async (type: string) => {
        const { data, error: insErr } = await admin
          .from('notifications')
          .insert({
            recipient_group_id: mona.personalGroupId,
            type,
            title: `PD021 ${type}`,
            body: `PD021 ${type} body`,
          })
          .select('id');
        if (insErr) throw new Error(`insert ${type}: ${insErr.message}`);
        return (data as Array<{ id: string }>).length;
      };

      expect(await insert('group_suspended')).toBe(1); // sanctions — locked on
      expect(await insert('account_suspended')).toBe(1); // account — locked on
      expect(await insert('group_closed')).toBe(0); // group-lifecycle — muted, dropped (control)
    });

    it('set_own_notification_preference on sanctions is refused exactly as account is (the PD016 non-suppressible refusal)', async () => {
      const sanctions = await monaC.rpc('set_own_notification_preference', {
        p_category_key: 'sanctions',
        p_channel: 'in_app',
        p_allowed: false,
      });
      expect(sanctions.error).not.toBeNull();
      expect(String(sanctions.error?.message)).toContain('cannot be muted');

      const account = await monaC.rpc('set_own_notification_preference', {
        p_category_key: 'account',
        p_channel: 'in_app',
        p_allowed: false,
      });
      expect(account.error).not.toBeNull();
      expect(String(account.error?.message)).toContain('cannot be muted');
    });

    it('get_own_notifications carries the kind and the category key for a sanction row, unchanged', async () => {
      const { data, error } = await monaC.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      const rows = data as Array<{ kind: string; category: string; title: string; body: string }>;
      const row = rows.find((r) => r.kind === 'group_suspended');
      expect(row).toBeTruthy();
      expect(row!.category).toBe('sanctions'); // the payload carries the category KEY (k.category_key); the label is the registry's
      expect(row!.title).toBe('PD021 group_suspended');
      expect(row!.body).toBe('PD021 group_suspended body');
    });
  });
});
