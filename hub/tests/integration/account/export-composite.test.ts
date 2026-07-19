import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import { fetchOwnDataExport } from '@/lib/account/export';
import { createJournalEntry } from '@/lib/journal/queries';

/**
 * COR-A W8 — platform-side export composite (audit finding AC-4; + the export
 * half of AC-5). Integration tests against real Postgres + RLS.
 *
 * The contract under test: `get_own_data_export()` now owns export
 * COMPLETENESS — ONE call returns the Core-owned sections AND the
 * platform-composed Domain sections (`journal` from get_own_journal_export,
 * `journeys` from get_own_step_instances_export), under the same caller
 * identity. Surfaces are thin couriers; a sibling surface (the Gimbal) gets a
 * GDPR-complete export without re-implementing any merge.
 *
 * Red-first: until the 20260719201718 migration is applied, the document
 * carries only the Core sections — the `journal` / `journeys` assertions fail
 * (the demonstrated red the schema gate turns green).
 *
 * Seeding: a journal entry is cheap (the FEAT-PD001 create contract as the
 * caller). Walks seeding (journey + steps + enrolment + response) has no
 * shared helper — its scaffold is local to the PD007 suite — so the `journeys`
 * section is asserted present-and-array-shaped for an unenrolled member (the
 * present-and-empty guarantee), per the W8 scope note.
 *
 * Heavy remote-DB suite (cross-substrate reads + an audit write per export) —
 * same ceiling raise as data-export.test.ts.
 */

jest.setTimeout(60000);

/**
 * Teardown (the FEAT-PC008 data-export pattern): sign-up seeds a foundational
 * transcendence consent row (append-only, FK RESTRICT), so consent rows are
 * purged under `app.consent_erasure_in_progress` BEFORE the user/group delete;
 * the data_export audit rows and the seeded journal entry are cleaned too.
 */
async function teardownUsers(users: TestUser[]): Promise<void> {
  const groups = users.map((u) => `'${u.personalGroupId}'`).join(',');
  if (groups) {
    await runAdminSql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id IN (${groups}); END $$;`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.admin_audit_log ` +
        `WHERE action = 'data_export' AND actor_group_id IN (${groups});`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.journal_entries WHERE owner_group_id IN (${groups});`,
    ).catch(() => undefined);
  }
  for (const u of users) {
    await cleanupTestUser(u.user.id);
  }
}

describe('COR-A W8 — the platform-side export composite (AC-4)', () => {
  let user: TestUser;
  const SEEDED_BODY = 'words kept for the composite export';

  beforeAll(async () => {
    user = await createTestUser({ displayName: 'Composite Export' });
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);
    await createJournalEntry(supabase, 'Composite seed', SEEDED_BODY);
  });

  afterAll(async () => {
    if (user) await teardownUsers([user]);
  });

  it('one call returns the Core sections AND the platform-composed journal and journeys sections', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const doc = (await fetchOwnDataExport(supabase)) as unknown as Record<string, unknown>;

    // The pre-W8 keys are intact — additive extension, schema_version unchanged.
    expect(doc.schema_version).toBe(1);
    expect(doc).toHaveProperty('subject');
    expect(doc).toHaveProperty('profile');
    expect(doc).toHaveProperty('account_state');
    expect(Array.isArray(doc.consent)).toBe(true);
    expect(Array.isArray(doc.memberships)).toBe(true);

    // The W8 additive keys — completeness is the platform's contract now.
    expect(doc).toHaveProperty('journal');
    expect(doc).toHaveProperty('journeys');
  });

  it('the journal section is the versioned PD001 document carrying the caller`s seeded entry', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const doc = await fetchOwnDataExport(supabase);

    expect(doc.journal).toBeDefined();
    expect(doc.journal.schema_version).toBe(1);
    expect(Array.isArray(doc.journal.entries)).toBe(true);
    expect(doc.journal.entries.some((e) => e.body === SEEDED_BODY)).toBe(true);
  });

  it('the journeys section is present-and-array for an unenrolled member — never an omission', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const doc = await fetchOwnDataExport(supabase);

    // Present-and-empty (the PD007 fixed shape): an unenrolled member gets [].
    expect(doc.journeys).toBeDefined();
    expect(Array.isArray(doc.journeys)).toBe(true);
    expect(doc.journeys).toHaveLength(0);
  });
});
