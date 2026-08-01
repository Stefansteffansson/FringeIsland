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

    // The pre-W8 keys are intact; schema_version is 2 since the ADM-D
    // audit_trail section (AB-4 — a rights-shape change, not a mere key).
    expect(doc.schema_version).toBe(2);
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

/**
 * COR-C W2 — export completeness restored and extended (Audit III AC3-3,
 * AC3-16 [Stefan's ruling 2026-07-31: ADD], + the roles gap the new
 * completeness invariant surfaced).
 *
 * RED until the W2 schema-gate migration (20260731120000) applies:
 *  - notification_preferences key absent (AC3-3 — the N-D contract exists,
 *    nothing composes it)
 *  - communication.authored_announcements absent (AC3-16)
 *  - roles key absent (user_group_roles is member data with no export path —
 *    found by the W2 classification pass, not by the audit)
 * LABELLED GREEN: communication + notifications keys (live since C-E / N-A;
 * asserted here because the additive suite never pinned them).
 *
 * Fixture rows are seeded by admin SQL deliberately: the EXPORT READ is under
 * test, not the producers (announcements' send contracts have the C-D suite;
 * preferences have the N-D suite).
 */
describe('COR-C W2 — export completeness (AC3-3, AC3-16, roles)', () => {
  let vera: TestUser;

  const exportDocFor = async (u: TestUser): Promise<Record<string, unknown>> => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, u.email, u.password);
    return (await fetchOwnDataExport(supabase)) as unknown as Record<string, unknown>;
  };

  beforeAll(async () => {
    vera = await createTestUser({ displayName: 'Vera Verbatim' });
    // Own preference state (N-D substrate): one real row.
    await runAdminSql(
      `INSERT INTO public.notification_preferences (recipient_group_id, category_key, channel, allowed)
        SELECT '${vera.personalGroupId}', c.key, 'in_app', false
          FROM public.notification_categories c
         ORDER BY c.key LIMIT 1;`,
    );
    // Own authored announcement (platform scope needs no scope group).
    await runAdminSql(
      `INSERT INTO public.announcements (scope_kind, scope_group_id, author_group_id, title, body)
        VALUES ('platform', NULL, '${vera.personalGroupId}', 'W2 fixture title', 'W2 fixture body');`,
    );
  });

  afterAll(async () => {
    await runAdminSql(
      `DELETE FROM public.announcements WHERE author_group_id = '${vera.personalGroupId}';`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.notification_preferences WHERE recipient_group_id = '${vera.personalGroupId}';`,
    ).catch(() => undefined);
    if (vera) await teardownUsers([vera]);
  });

  it('the composite carries notification_preferences incl. the seeded row (AC3-3)', async () => {
    const doc = await exportDocFor(vera);
    // RED pre-apply: the key does not exist on the document at all.
    expect(doc).toHaveProperty('notification_preferences');
    const rows = doc.notification_preferences as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.some((r) => r.channel === 'in_app' && r.allowed === false)).toBe(true);
  });

  it('the communication section carries authored_announcements incl. the seeded row (AC3-16)', async () => {
    const doc = await exportDocFor(vera);
    const comm = doc.communication as Record<string, unknown>;
    expect(comm).toBeDefined();
    // RED pre-apply: get_own_messages_export has no authored_announcements key.
    expect(comm).toHaveProperty('authored_announcements');
    const anns = comm.authored_announcements as Array<Record<string, unknown>>;
    expect(anns.some((a) => a.title === 'W2 fixture title')).toBe(true);
  });

  it('the composite carries the roles section (the invariant`s first catch)', async () => {
    const doc = await exportDocFor(vera);
    // RED pre-apply: no roles key. Every member holds at least their
    // personal-group role, so present-and-non-empty is safe to assert.
    expect(doc).toHaveProperty('roles');
    const roles = doc.roles as Array<Record<string, unknown>>;
    expect(Array.isArray(roles)).toBe(true);
  });

  it('[LABELLED GREEN — live since C-E / N-A, pinned here] communication and notifications sections are present', async () => {
    const doc = await exportDocFor(vera);
    expect(doc).toHaveProperty('communication');
    expect(doc).toHaveProperty('notifications');
  });
});
