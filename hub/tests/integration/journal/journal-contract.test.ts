import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PD001 — personal Journal primitive (IDN-5, STORY-1..3). Integration
 * tests against real Postgres + RLS, exercising the platform contract
 * directly via `.rpc()` (the substrate level — Hub lib/routes are FEAT-H011's
 * plumbing and are tested separately).
 *
 * Red-first: until the migration lands `journal_entries` + the CRUD RPCs,
 * every call errors (PGRST202 function-not-found / 42P01 missing relation)
 * and every assertion on the contract fails — the headline red the schema
 * gate turns green.
 *
 * ADR-U038 direct-caller discipline: STORY-2 exercises the direct PostgREST
 * path (including an anonymous-session Mist holding the `authenticated`
 * role) and proves the SUBSTRATE refuses — table grants are revoked from
 * client roles, so `.from('journal_entries')` yields 42501 regardless of any
 * Hub code.
 */

jest.setTimeout(60000);

type JournalEntry = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

async function createEntry(
  client: SupabaseClient,
  title: string | null,
  body: string,
): Promise<JournalEntry> {
  const { data, error } = await client.rpc('create_journal_entry', {
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return data as unknown as JournalEntry;
}

async function listEntries(client: SupabaseClient): Promise<JournalEntry[]> {
  const { data, error } = await client.rpc('get_own_journal_entries');
  if (error) throw error;
  return data as unknown as JournalEntry[];
}

/** Remove the FIM's journal rows via service-role, then the user itself. */
async function teardownUsers(users: TestUser[]): Promise<void> {
  const admin = createAdminClient();
  for (const u of users) {
    await admin
      .from('journal_entries')
      .delete()
      .eq('owner_group_id', u.personalGroupId);
    await cleanupTestUser(u.user.id);
  }
}

describe('FEAT-PD001 — journal CRUD contracts (STORY-1..3)', () => {
  const admin = createAdminClient();

  describe('STORY-1: write my journal', () => {
    let fim: TestUser;
    afterAll(async () => {
      if (fim) await teardownUsers([fim]);
    });

    it('a FIM creates an entry owned by their personal group, and it round-trips through the list', async () => {
      fim = await createTestUser({ displayName: 'Journal Writer' });
      const supabase = createTestClient();
      await signInWithRetry(supabase, fim.email, fim.password);

      const created = await createEntry(supabase, 'First light', 'Today I arrived.');
      expect(created.id).toBeTruthy();
      expect(created.title).toBe('First light');
      expect(created.body).toBe('Today I arrived.');

      const entries = await listEntries(supabase);
      expect(entries.some((e) => e.id === created.id)).toBe(true);

      // substrate check: the row is stamped with the caller's personal group
      const { data: row } = await admin
        .from('journal_entries')
        .select('owner_group_id')
        .eq('id', created.id)
        .single();
      expect(row!.owner_group_id).toBe(fim.personalGroupId);
    });

    it('an empty body is refused (22023) and no row is created', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, fim.email, fim.password);

      const { error } = await supabase.rpc('create_journal_entry', {
        p_title: null,
        p_body: '   ',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('an authenticated Mist is refused (42501) and no row is created', async () => {
      const mist = createTestClient();
      const { data: signIn } = await withAnonRateLimitRetry(() =>
        mist.auth.signInAnonymously(),
      );

      const { error } = await mist.rpc('create_journal_entry', {
        p_title: null,
        p_body: 'a mist tries to journal',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');

      // the Mist's proto personal group owns zero journal rows
      const { data: mistUser } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('auth_user_id', signIn!.user!.id)
        .single();
      if (mistUser?.personal_group_id) {
        const { count } = await admin
          .from('journal_entries')
          .select('id', { count: 'exact', head: true })
          .eq('owner_group_id', mistUser.personal_group_id);
        expect(count).toBe(0);
      }
      await cleanupTestUser(signIn!.user!.id).catch(() => undefined);
    });
  });

  describe('STORY-2: my entries are mine alone (adversarial direct-caller, ADR-U038)', () => {
    let alice: TestUser;
    let bob: TestUser;
    let aliceEntry: JournalEntry;

    beforeAll(async () => {
      alice = await createTestUser({ displayName: 'Journal Alice' });
      bob = await createTestUser({ displayName: 'Journal Bob' });
      const aliceClient = createTestClient();
      await signInWithRetry(aliceClient, alice.email, alice.password);
      aliceEntry = await createEntry(aliceClient, 'Private', 'For my eyes only.');
    });
    afterAll(async () => {
      await teardownUsers([alice, bob].filter(Boolean));
    });

    it('direct PostgREST table access is refused for an authenticated FIM (42501 on every verb)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, bob.email, bob.password);

      const sel = await supabase.from('journal_entries').select('id');
      expect(sel.error?.code).toBe('42501');

      const ins = await supabase
        .from('journal_entries')
        .insert({ owner_group_id: bob.personalGroupId, body: 'smuggled' });
      expect(ins.error?.code).toBe('42501');

      const upd = await supabase
        .from('journal_entries')
        .update({ body: 'defaced' })
        .eq('id', aliceEntry.id);
      expect(upd.error?.code).toBe('42501');

      const del = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', aliceEntry.id);
      expect(del.error?.code).toBe('42501');
    });

    it('direct PostgREST table access is refused for an anonymous-session Mist (42501)', async () => {
      const mist = createTestClient();
      const { data: signIn } = await withAnonRateLimitRetry(() =>
        mist.auth.signInAnonymously(),
      );

      const sel = await mist.from('journal_entries').select('id');
      expect(sel.error?.code).toBe('42501');

      await cleanupTestUser(signIn!.user!.id).catch(() => undefined);
    });

    it("Bob's list never contains Alice's entries", async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, bob.email, bob.password);

      const entries = await listEntries(supabase);
      expect(entries.some((e) => e.id === aliceEntry.id)).toBe(false);
    });

    it("Bob's update/delete against Alice's entry id is refused (P0002 — no existence leak) and her entry is unchanged", async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, bob.email, bob.password);

      const upd = await supabase.rpc('update_journal_entry', {
        p_entry_id: aliceEntry.id,
        p_title: 'defaced',
        p_body: 'defaced',
      });
      expect(upd.error?.code).toBe('P0002');

      const del = await supabase.rpc('delete_journal_entry', {
        p_entry_id: aliceEntry.id,
      });
      expect(del.error?.code).toBe('P0002');

      const { data: row } = await admin
        .from('journal_entries')
        .select('body')
        .eq('id', aliceEntry.id)
        .single();
      expect(row!.body).toBe('For my eyes only.');
    });

    it('a nonexistent entry id yields the same refusal as a foreign one (P0002)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, bob.email, bob.password);

      const { error } = await supabase.rpc('delete_journal_entry', {
        p_entry_id: '00000000-0000-0000-0000-000000000001',
      });
      expect(error?.code).toBe('P0002');
    });
  });

  describe('STORY-3: tend my entries', () => {
    let fim: TestUser;
    afterAll(async () => {
      if (fim) await teardownUsers([fim]);
    });

    it('updating an own entry changes title/body and advances updated_at', async () => {
      fim = await createTestUser({ displayName: 'Journal Tender' });
      const supabase = createTestClient();
      await signInWithRetry(supabase, fim.email, fim.password);

      const created = await createEntry(supabase, 'Draft', 'v1');
      const { data, error } = await supabase.rpc('update_journal_entry', {
        p_entry_id: created.id,
        p_title: 'Kept',
        p_body: 'v2',
      });
      expect(error).toBeNull();
      const updated = data as unknown as JournalEntry;
      expect(updated.title).toBe('Kept');
      expect(updated.body).toBe('v2');
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updated_at).getTime(),
      );
    });

    it('deleting an own entry removes it from all subsequent reads', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, fim.email, fim.password);

      const created = await createEntry(supabase, null, 'ephemeral thought');
      const { error } = await supabase.rpc('delete_journal_entry', {
        p_entry_id: created.id,
      });
      expect(error).toBeNull();

      const entries = await listEntries(supabase);
      expect(entries.some((e) => e.id === created.id)).toBe(false);
    });

    it('the list is newest-first and keyset pagination via p_before returns older entries', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, fim.email, fim.password);

      const first = await createEntry(supabase, null, 'older');
      const second = await createEntry(supabase, null, 'newer');

      const entries = await listEntries(supabase);
      const times = entries.map((e) => new Date(e.created_at).getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));

      const { data, error } = await supabase.rpc('get_own_journal_entries', {
        p_limit: 10,
        p_before: second.created_at,
      });
      expect(error).toBeNull();
      const older = data as unknown as JournalEntry[];
      expect(older.some((e) => e.id === first.id)).toBe(true);
      expect(older.some((e) => e.id === second.id)).toBe(false);
    });
  });
});
