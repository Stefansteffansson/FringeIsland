import { describe, it, expect, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import {
  createJournalEntry,
  fetchOwnJournalEntries,
  fetchOwnJournalExport,
} from '@/lib/journal/queries';

/**
 * FEAT-PD001 — erasure cascade (STORY-4) + own-subject export (STORY-5),
 * exercised through the Hub lib (`lib/journal/queries.ts`).
 *
 * Honest labelling (feature-development skill): this file is TEST-AFTER
 * VERIFICATION, not TDD. The FK cascade and `get_own_journal_export()` shipped
 * in the TASK-PD001-01 migration by design (one migration = one schema-gate
 * review), so these tests observe just-landed substrate end-to-end against
 * the real teardown/export paths rather than driving it red-first. The CRUD
 * contracts in journal-contract.test.ts WERE demonstrated red first.
 */

jest.setTimeout(60000);

/** Enrol a test FIM's personal group as DeusEx (grants manage_all_groups) —
 *  the fim-account-erasure.test.ts pattern for an authenticated admin caller. */
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

/** Best-effort demote (the founding DeusEx member remains, so the last-member
 *  guard never trips). */
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

describe('FEAT-PD001 — erasure cascade + own-subject export (STORY-4..5)', () => {
  const admin = createAdminClient();

  async function teardownUsers(users: TestUser[]): Promise<void> {
    for (const u of users) {
      await admin
        .from('journal_entries')
        .delete()
        .eq('owner_group_id', u.personalGroupId);
      await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  }

  describe('STORY-4: erasure leaves nothing behind', () => {
    it('account erasure hard-deletes every journal entry — none survive, none are sentinel-reassigned', async () => {
      const fim = await createTestUser({ displayName: 'Erased Journaler' });
      const supabase = createTestClient();
      await signInWithRetry(supabase, fim.email, fim.password);

      const e1 = await createJournalEntry(supabase, 'Kept thoughts', 'entry one');
      const e2 = await createJournalEntry(supabase, null, 'entry two');

      // erase via the real teardown path (FEAT-PC002-05: anonymise consent,
      // then admin_hard_delete_user — sentinel reassignment + cascade),
      // called by an authenticated DeusEx admin (erase_fim_account is
      // manage_all_groups-gated; service_role has no auth.uid())
      const adminUser = await createTestUser({ displayName: 'Journal Eraser Admin' });
      await makePlatformAdmin(adminUser.personalGroupId);
      const adminCaller = createTestClient();
      await signInWithRetry(adminCaller, adminUser.email, adminUser.password);

      const { data: profile } = await admin
        .from('users')
        .select('id')
        .eq('auth_user_id', fim.user.id)
        .single();
      const { error: eraseErr } = await adminCaller.rpc('erase_fim_account', {
        p_user_id: profile!.id,
      });
      expect(eraseErr).toBeNull();

      await demotePlatformAdmin(adminUser.personalGroupId);
      await cleanupTestUser(adminUser.user.id).catch(() => undefined);

      // zero rows remain for the erased member's personal group
      const { count } = await admin
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('owner_group_id', fim.personalGroupId);
      expect(count).toBe(0);

      // and the entries are GONE from the table entirely (hard delete),
      // not surviving under any other owner (no sentinel reassignment)
      const { data: survivors } = await admin
        .from('journal_entries')
        .select('id')
        .in('id', [e1.id, e2.id]);
      expect(survivors ?? []).toHaveLength(0);
    });
  });

  describe('STORY-5: my export includes my journal', () => {
    let alice: TestUser;
    let bob: TestUser;
    afterAll(async () => {
      await teardownUsers([alice, bob].filter(Boolean));
    });

    it('returns a versioned document with all and only my entries, newest-first', async () => {
      alice = await createTestUser({ displayName: 'Journal Export Alice' });
      bob = await createTestUser({ displayName: 'Journal Export Bob' });

      const aliceClient = createTestClient();
      await signInWithRetry(aliceClient, alice.email, alice.password);
      const a1 = await createJournalEntry(aliceClient, 'Mine', 'alpha');
      const a2 = await createJournalEntry(aliceClient, null, 'beta');

      const bobClient = createTestClient();
      await signInWithRetry(bobClient, bob.email, bob.password);
      await createJournalEntry(bobClient, 'His', 'gamma');

      const doc = await fetchOwnJournalExport(aliceClient);
      expect(doc.schema_version).toBe(1);
      expect(doc.exported_at).toBeTruthy();
      expect(doc.entries.map((e) => e.id).sort()).toEqual([a1.id, a2.id].sort());
      const times = doc.entries.map((e) => new Date(e.created_at).getTime());
      expect(times).toEqual([...times].sort((x, y) => y - x));

      // Bob's export never carries Alice's entries
      const bobDoc = await fetchOwnJournalExport(bobClient);
      expect(bobDoc.entries.some((e) => e.id === a1.id || e.id === a2.id)).toBe(false);
    });

    it('an entry-less FIM gets entries present-and-empty — the shape is stable, never absent', async () => {
      const fresh = await createTestUser({ displayName: 'Empty Journal Export' });
      try {
        const supabase = createTestClient();
        await signInWithRetry(supabase, fresh.email, fresh.password);

        const doc = await fetchOwnJournalExport(supabase);
        expect(doc.schema_version).toBe(1);
        expect(Array.isArray(doc.entries)).toBe(true);
        expect(doc.entries).toHaveLength(0);
      } finally {
        await teardownUsers([fresh]);
      }
    });

    it('a SUSPENDED member keeps export + read access, but cannot write (writes require active)', async () => {
      const suspended = await createTestUser({ displayName: 'Suspended Journaler' });
      try {
        const supabase = createTestClient();
        await signInWithRetry(supabase, suspended.email, suspended.password);
        const kept = await createJournalEntry(supabase, null, 'written while active');

        // suspend via the admin lifecycle flag
        const { error: suspendErr } = await admin
          .from('users')
          .update({ is_active: false })
          .eq('auth_user_id', suspended.user.id);
        expect(suspendErr).toBeNull();

        // right of access survives suspension (PC008 precedent)
        const doc = await fetchOwnJournalExport(supabase);
        expect(doc.entries.some((e) => e.id === kept.id)).toBe(true);
        const list = await fetchOwnJournalEntries(supabase);
        expect(list.some((e) => e.id === kept.id)).toBe(true);

        // but writing is refused while suspended
        const { error: writeErr } = await supabase.rpc('create_journal_entry', {
          p_title: null,
          p_body: 'written while suspended',
        });
        expect(writeErr?.code).toBe('42501');
      } finally {
        await admin
          .from('users')
          .update({ is_active: true })
          .eq('auth_user_id', suspended.user.id);
        await teardownUsers([suspended]);
      }
    });
  });
});
