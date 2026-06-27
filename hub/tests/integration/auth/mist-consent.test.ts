import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC002 STORY-5 — append-only consent substrate (ADR-U034), the substrate
 * half. The atomic write-at-transcendence half is exercised by the transcendence
 * test (STORY-3, mist-transcendence.test.ts).
 *
 * TDD red-first: FAILS until the migration adds `public.consent_records` (RLS
 * subject-scoping, open purpose, append-only enforcement). Consent is keyed to the
 * FIM via the repo actor chain (personal group), per ADR-U006/U007.
 */

async function profileId(admin: SupabaseClient, authUserId: string): Promise<string> {
  const { data } = await admin.from('users').select('id').eq('auth_user_id', authUserId).single();
  return data!.id as string;
}

describe('FEAT-PC002 STORY-5 — append-only consent substrate', () => {
  const createdUserIds: string[] = [];
  const subjectGroupIds: string[] = [];

  afterAll(async () => {
    // Consent is append-only — remove test rows via the controlled erasure bypass,
    // then the (now-unreferenced) users.
    if (subjectGroupIds.length) {
      const list = subjectGroupIds.map((g) => `'${g}'`).join(',');
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records WHERE subject_group_id IN (${list}); END $$;`,
      ).catch(() => undefined);
    }
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  // STORY-5 criteria 1 + 3 — RLS subject-scoping, open purpose, append-only.
  it('stores consent with RLS subject-scoping, an open purpose, and append-only enforcement', async () => {
    const admin = createAdminClient();
    const a = await createTestUser({ displayName: 'Grace Hopper' });
    const b = await createTestUser({ displayName: 'Ada Lovelace' });
    createdUserIds.push(a.user.id, b.user.id);
    subjectGroupIds.push(a.personalGroupId, b.personalGroupId);
    const aUserId = await profileId(admin, a.user.id);
    const bUserId = await profileId(admin, b.user.id);

    // Insert consent for each subject (definer/service path; purpose is open text).
    const { data: insA, error: insAErr } = await admin
      .from('consent_records')
      .insert({
        subject_user_id: aUserId,
        subject_group_id: a.personalGroupId,
        purpose: 'transcendence',
        policy_version: 'v1',
        capture_context: { surface: 'hub', flow: 'mist-transcendence' },
      })
      .select('id')
      .single();
    expect(insAErr).toBeNull();
    const consentAId = insA!.id as string;

    // Open purpose: an arbitrary future purpose also inserts (not a sealed enum).
    const { error: insBErr } = await admin.from('consent_records').insert({
      subject_user_id: bUserId,
      subject_group_id: b.personalGroupId,
      purpose: 'data_research_demo',
      policy_version: 'v1',
    });
    expect(insBErr).toBeNull();

    // RLS — subject A reads only its own consent row (actor chain = personal group).
    const aClient = createTestClient();
    await aClient.auth.signInWithPassword({ email: a.email, password: a.password });
    const { data: aVisible, error: aReadErr } = await aClient
      .from('consent_records')
      .select('id, subject_group_id, purpose');
    expect(aReadErr).toBeNull();
    expect(aVisible!.length).toBe(1);
    expect(aVisible![0].subject_group_id).toBe(a.personalGroupId);

    // Append-only — UPDATE rejected outside the controlled erasure path (42501).
    const { error: updErr } = await admin
      .from('consent_records')
      .update({ purpose: 'tampered' })
      .eq('id', consentAId);
    expect(updErr).not.toBeNull();
    expect(updErr!.code).toBe('42501');

    // Append-only — DELETE rejected (42501).
    const { error: delErr } = await admin.from('consent_records').delete().eq('id', consentAId);
    expect(delErr).not.toBeNull();
    expect(delErr!.code).toBe('42501');

    // The consent row survived the rejected mutations, untampered.
    const { data: survived } = await admin
      .from('consent_records')
      .select('purpose')
      .eq('id', consentAId)
      .maybeSingle();
    expect(survived).not.toBeNull();
    expect(survived!.purpose).toBe('transcendence');
  });
});
