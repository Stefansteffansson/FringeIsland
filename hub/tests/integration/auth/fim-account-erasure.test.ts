import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  withAnonRateLimitRetry,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC002 STORY-5 criterion 4 (+ STORY-4 cascade-verify DoR) — FIM
 * account-level erasure (ADR-U034 §5). Distinct from the pre-transcendence
 * reaper: a post-transcendence FIM's right-to-erasure must reconcile against
 * the legal duty to retain proof-of-consent — anonymise the consent SUBJECT
 * LINK, RETAIN the consent EVENT. The consent FKs are ON DELETE RESTRICT, so
 * the teardown is structurally forced to anonymise-first.
 *
 * TDD red-first: FAILS until the migration adds `public.erase_fim_account`.
 * The deny / boundary tests assert the SPECIFIC SQLSTATE (42501) so a missing
 * function (PGRST202) is a genuine red, never a pass-at-red.
 *
 * Reaper<->consent boundary (criterion 3): erase_fim_account refuses a Mist
 * (is_temporary = true) — Mists go through the reaper / explicit-erase and hold
 * no consent rows; consent exists only post-transcendence. Collision-free.
 */

async function waitForProfile(admin: SupabaseClient, authUserId: string, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Mist profile did not materialise in time');
}

/** Promote a personal group to platform admin: active DeusEx member + DeusEx
 *  role (Tier-1 grants manage_all_groups context-free). Direct active insert,
 *  so auto_assign_deusex_role_on_accept (invited->active only) is bypassed —
 *  the role is inserted explicitly. */
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

/** Best-effort demote (founding DeusEx member remains, so the last-member guard
 *  never trips). */
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
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
    END $$;`).catch(() => undefined);
}

describe('FEAT-PC002 STORY-5 crit-4 — FIM account-erasure: anonymise consent link, retain proof', () => {
  const admin = createAdminClient();
  const createdUserIds: string[] = [];
  const erasedUserIds = new Set<string>();
  const subjectGroupIds: string[] = []; // consent to purge by subject (non-anonymised)
  const anonymisedConsentIds: string[] = []; // retained consent to purge by id
  let adminClient: SupabaseClient;
  let adminGroupId: string;

  beforeAll(async () => {
    const adminUser = await createTestUser({ displayName: 'Katherine Johnson' });
    createdUserIds.push(adminUser.user.id);
    adminGroupId = adminUser.personalGroupId;
    await makePlatformAdmin(adminGroupId);
    adminClient = createTestClient();
    await adminClient.auth.signInWithPassword({ email: adminUser.email, password: adminUser.password });
  });

  afterAll(async () => {
    if (subjectGroupIds.length || anonymisedConsentIds.length) {
      const byGroup = subjectGroupIds.map((g) => `'${g}'`).join(',') || 'NULL';
      const byId = anonymisedConsentIds.map((c) => `'${c}'`).join(',') || 'NULL';
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records ` +
          `WHERE subject_group_id IN (${byGroup}) OR id IN (${byId}); END $$;`,
      ).catch(() => undefined);
    }
    await demotePlatformAdmin(adminGroupId);
    for (const id of createdUserIds) {
      if (!erasedUserIds.has(id)) await cleanupTestUser(id);
    }
  });

  // Helper: a Mist that transcends into a FIM carrying a transcendence consent row.
  async function transcendedFim() {
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mistClient.auth.signInAnonymously());
    const mistAuthId = signIn.user!.id;
    createdUserIds.push(mistAuthId);
    const profile = await waitForProfile(admin, mistAuthId);
    const { data: result, error } = await mistClient.rpc('finalise_transcendence', {
      p_policy_version: 'v1',
      p_capture_context: { surface: 'hub', flow: 'mist-transcendence' },
    });
    expect(error).toBeNull();
    return {
      mistAuthId,
      userId: result.user_id as string,
      groupId: profile.personal_group_id as string,
      consentId: result.consent_id as string,
    };
  }

  // Criterion 4 — the consent SUBJECT LINK is anonymised, the consent EVENT retained.
  it('anonymises the consent subject link and retains the consent event, then tears down the account', async () => {
    const fim = await transcendedFim();

    const { data: result, error } = await adminClient.rpc('erase_fim_account', {
      p_user_id: fim.userId,
    });
    expect(error).toBeNull();
    expect(result.consent_retained).toBe(true);
    expect(result.consent_records_anonymised).toBeGreaterThanOrEqual(1);
    erasedUserIds.add(fim.mistAuthId);

    // Account torn down — no profile remains.
    const { data: gone } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', fim.mistAuthId)
      .maybeSingle();
    expect(gone).toBeNull();

    // Consent EVENT retained as proof, but the SUBJECT LINK is anonymised (NULL).
    const { data: consent } = await admin
      .from('consent_records')
      .select('id, subject_user_id, subject_group_id, purpose, policy_version')
      .eq('id', fim.consentId)
      .maybeSingle();
    anonymisedConsentIds.push(fim.consentId);
    expect(consent).not.toBeNull();
    expect(consent!.subject_user_id).toBeNull();
    expect(consent!.subject_group_id).toBeNull();
    expect(consent!.purpose).toBe('transcendence');
    expect(consent!.policy_version).toBe('v1');
  });

  // A non-admin (no manage_all_groups) is denied — 42501. Asserts the specific
  // code so a missing function (PGRST202) is a real red, not a pass-at-red.
  it('rejects a non-admin caller (manage_all_groups required)', async () => {
    const fim = await transcendedFim();
    subjectGroupIds.push(fim.groupId);

    const plain = await createTestUser({ displayName: 'Mary Jackson' });
    createdUserIds.push(plain.user.id);
    const plainClient = createTestClient();
    await plainClient.auth.signInWithPassword({ email: plain.email, password: plain.password });

    const { error } = await plainClient.rpc('erase_fim_account', { p_user_id: fim.userId });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');

    // Untouched — still a FIM, consent still bound to its subject.
    const { data: survivor } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', fim.mistAuthId)
      .single();
    expect(survivor!.is_temporary).toBe(false);
    const { data: stillBound } = await admin
      .from('consent_records')
      .select('subject_group_id')
      .eq('id', fim.consentId)
      .single();
    expect(stillBound!.subject_group_id).toBe(fim.groupId);
  });

  // Reaper<->consent boundary (criterion 3): account-erasure refuses a Mist —
  // pre-transcendence rows are the reaper's, hold no consent. Collision-free.
  it('refuses a Mist (pre-transcendence) — collision-free reaper/consent boundary', async () => {
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mistClient.auth.signInAnonymously());
    const mistAuthId = signIn.user!.id;
    createdUserIds.push(mistAuthId);
    const profile = await waitForProfile(admin, mistAuthId);

    const { error } = await adminClient.rpc('erase_fim_account', { p_user_id: profile.id });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');

    // Still a Mist (account-erasure did not touch it).
    const { data: survivor } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', mistAuthId)
      .single();
    expect(survivor!.is_temporary).toBe(true);
  });

  // Characterization (TEST-AFTER, not TDD red): the consent FK RESTRICT means a
  // raw hard-delete of a consented FIM is structurally blocked (23503) — this is
  // WHY erase_fim_account must anonymise-first. Already true from the consent
  // migration; documented here so the retention guarantee is regression-locked.
  it('[characterization] a consented FIM cannot be raw hard-deleted out from under its consent proof', async () => {
    const fim = await transcendedFim();
    subjectGroupIds.push(fim.groupId);

    const { error } = await adminClient.rpc('admin_hard_delete_user', { target_user_id: fim.userId });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('23503'); // foreign_key_violation (consent FK RESTRICT)

    // The whole RPC rolled back — FIM and its consent proof both intact.
    const { data: survivor } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', fim.mistAuthId)
      .single();
    expect(survivor!.is_temporary).toBe(false);
  });

  // Characterization (TEST-AFTER, green-before for PR #188 / ADR-U047 Amendment 1):
  // pins admin_hard_delete_user's DS-3 attribution reassignment — the tenth relocation
  // site (ds3_lifecycle_user_hard_deleted). On hard-delete, the target personal group's
  // authored journeys and the enrollments it enrolled are REASSIGNED to the [Deleted User]
  // sentinel — not deleted, not transferred to DeusEx. journeys.created_by_group_id uses
  // COALESCE(sentinel, caller) (migration 20260223171200 :575); journey_enrollments
  // .enrolled_by_group_id is set to the sentinel directly, NO COALESCE (:597) — the two
  // land identically while the sentinel is seeded (it is, migration 20260227120843).
  // Target is a Mist, NOT a FIM: a consented FIM's raw hard-delete is blocked by the
  // consent-FK RESTRICT (23503, pinned by the sibling test above), so it can never reach
  // this reassignment directly; a Mist holds no consent, so admin_hard_delete_user
  // succeeds and the sentinel reassignment is observable in isolation.
  it('[characterization] reassigns the target group journeys + enrollments to the [Deleted User] sentinel on hard-delete', async () => {
    // Target: a Mist (consent-exempt, so the hard-delete is not RESTRICT-blocked).
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mistClient.auth.signInAnonymously());
    const mistAuthId = signIn.user!.id;
    createdUserIds.push(mistAuthId);
    const profile = await waitForProfile(admin, mistAuthId);
    const targetUserId = profile.id as string;
    const targetGroupId = profile.personal_group_id as string;

    // The [Deleted User] sentinel (seeded system singleton) — the reassignment destination.
    const sentinelRows = (await runAdminSql(
      `SELECT id FROM public.groups WHERE name = '[Deleted User]' AND group_type = 'system';`,
    )) as Array<{ id: string }>;
    const sentinelId = sentinelRows[0].id;

    // Seed: the target group authors a non-public journey ...
    const journeyRows = (await runAdminSql(
      `INSERT INTO public.journeys (title, created_by_group_id, is_public, journey_type)
       VALUES ('DS-3 characterization journey', '${targetGroupId}', false, 'user_created')
       RETURNING id;`,
    )) as Array<{ id: string }>;
    const journeyId = journeyRows[0].id;

    // ... and enrols a SEPARATE surviving group (the admin group) into it. The enrollment's
    // group_id = admin group (ON DELETE CASCADE) so the row survives the personal-group
    // teardown; only enrolled_by_group_id (the target group, ON DELETE SET NULL) changes.
    await runAdminSql(
      `INSERT INTO public.journey_enrollments (journey_id, group_id, enrolled_by_group_id, status)
       VALUES ('${journeyId}', '${adminGroupId}', '${targetGroupId}', 'active');`,
    );

    // Act: hard-delete the target (same admin caller as the sibling characterization).
    const { data: result, error } = await adminClient.rpc('admin_hard_delete_user', {
      target_user_id: targetUserId,
    });
    expect(error).toBeNull();
    expect(result.success).toBe(true);
    erasedUserIds.add(mistAuthId);

    // Journey REASSIGNED, not deleted: it survives with created_by_group_id = sentinel.
    const { data: journey } = await admin
      .from('journeys')
      .select('id, created_by_group_id')
      .eq('id', journeyId)
      .maybeSingle();
    expect(journey).not.toBeNull();
    expect(journey!.created_by_group_id).toBe(sentinelId);

    // Enrollment REASSIGNED, not deleted, not set-NULL: survives the CASCADE (group_id is a
    // surviving group) with enrolled_by_group_id = sentinel (reassign-first beats SET NULL).
    const { data: enrollment } = await admin
      .from('journey_enrollments')
      .select('id, enrolled_by_group_id, group_id')
      .eq('journey_id', journeyId)
      .maybeSingle();
    expect(enrollment).not.toBeNull();
    expect(enrollment!.enrolled_by_group_id).toBe(sentinelId);
    expect(enrollment!.group_id).toBe(adminGroupId);

    // Erasure completed — target user + personal group gone (file's erasure pattern).
    const { data: goneUser } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', mistAuthId)
      .maybeSingle();
    expect(goneUser).toBeNull();
    const { data: goneGroup } = await admin
      .from('groups')
      .select('id')
      .eq('id', targetGroupId)
      .maybeSingle();
    expect(goneGroup).toBeNull();

    // Best-effort teardown: drop the sentinel-owned journey (CASCADE removes the enrollment).
    await admin.from('journeys').delete().eq('id', journeyId);
  });
});
