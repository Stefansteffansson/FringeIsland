import { describe, it, expect, afterAll } from '@jest/globals';
import { createAdminClient, createTestUser, cleanupTestUser, runAdminSql } from '@/tests/helpers/supabase';

/**
 * COR-D W6 (Audit IV AC4-6 / ruling R-8) — the withdrawable invariant at the
 * consent ledger's WRITE EDGE.
 *
 * TDD red-first: the refusal cell FAILS until the W6 migration mounts
 * `enforce_consent_withdrawable` on `public.consent_records` — today the rule
 * lives only inside `record_consent_decision`, so a direct insert (any other
 * writer, or an admin path) can record a withdrawal of a non-withdrawable
 * purpose. The trigger makes the rule writer-independent: one home, the table.
 *
 * The inserts run as service_role (bypasses RLS, never triggers) — exactly the
 * "polite BFF is not the enforcement layer" posture of ADR-U038, one tier down.
 */

describe('COR-D W6 — consent withdrawable gate at the write edge', () => {
  const createdUserIds: string[] = [];
  const subjectGroupIds: string[] = [];

  afterAll(async () => {
    if (subjectGroupIds.length) {
      const list = subjectGroupIds.map((g) => `'${g}'`).join(',');
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records WHERE subject_group_id IN (${list}); END $$;`,
      ).catch(() => undefined);
    }
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  async function subject() {
    const admin = createAdminClient();
    const fim = await createTestUser({ displayName: 'Wilma Consent' });
    createdUserIds.push(fim.user.id);
    const { data: row } = await admin
      .from('users')
      .select('id, personal_group_id')
      .eq('auth_user_id', fim.user.id)
      .single();
    subjectGroupIds.push(row!.personal_group_id as string);
    return { admin, userId: row!.id as string, groupId: row!.personal_group_id as string };
  }

  it('refuses a non-granted decision on a non-withdrawable purpose, for ANY writer (red-first)', async () => {
    const { admin, userId, groupId } = await subject();

    // transcendence is seeded withdrawable=false (20260629211504) — a direct
    // 'withdrawn' insert must be refused AT THE TABLE, not merely by the
    // record_consent_decision contract. RED until the W6 trigger mounts.
    const { error } = await admin.from('consent_records').insert({
      subject_user_id: userId,
      subject_group_id: groupId,
      purpose: 'transcendence',
      decision: 'withdrawn',
      policy_version: 'v1',
      capture_context: { surface: 'test', flow: 'cor-d-w6-red' },
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  });

  it('control: a non-granted decision on a WITHDRAWABLE purpose passes the edge', async () => {
    const { admin, userId, groupId } = await subject();

    // product_analytics is seeded withdrawable=true — the gate must not block it.
    const { error } = await admin.from('consent_records').insert({
      subject_user_id: userId,
      subject_group_id: groupId,
      purpose: 'product_analytics',
      decision: 'withdrawn',
      policy_version: 'v1',
      capture_context: { surface: 'test', flow: 'cor-d-w6-control' },
    });
    expect(error).toBeNull();
  });

  it('control: granted decisions on non-withdrawable purposes pass untouched', async () => {
    const { admin, userId, groupId } = await subject();

    const { error } = await admin.from('consent_records').insert({
      subject_user_id: userId,
      subject_group_id: groupId,
      purpose: 'transcendence',
      decision: 'granted',
      policy_version: 'v1',
      capture_context: { surface: 'test', flow: 'cor-d-w6-granted-control' },
    });
    expect(error).toBeNull();
  });
});
