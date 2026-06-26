import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestClient, createAdminClient, cleanupTestUser } from '@/tests/helpers/supabase';
import { beginMistSession } from '@/lib/auth/mist';

/**
 * FEAT-H003 STORY-2 (integration) — the Hub `beginMistSession` seam against the
 * real substrate (FEAT-PC001). The full substrate contract (proto group, no
 * Members enrolment, no-name) is owned + tested by FEAT-PC001; here we assert the
 * Hub consumes it — a live anon session yields an is_temporary Mist actor.
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

describe('FEAT-H003 STORY-2 — beginMistSession materialises a Mist (consumes FEAT-PC001)', () => {
  const createdUserIds: string[] = [];
  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('begins a Mist session: an is_temporary profile with a non-null personal_group_id', async () => {
    const supabase = createTestClient();
    const result = await beginMistSession(supabase);

    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    createdUserIds.push(result.user!.id);

    const admin = createAdminClient();
    const profile = await waitForProfile(admin, result.user!.id);
    expect(profile.is_temporary).toBe(true);
    expect(profile.personal_group_id).not.toBeNull();
  });
});
