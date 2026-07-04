import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PC010 (Groups Cycle G-A) — group creation & settings contracts.
 * Red-first: every rpc() test fails PGRST202 (functions absent) and the
 * STORY-4 direct-write tests fail (writes currently PERMITTED — the verified
 * S1-class hole) until the migration lands the contracts + the narrowing.
 *
 * STORY-5's presence assert is green-before-migration on the dev DB (system
 * groups are carried state); its red-first value is fresh-DB deployability,
 * which dev cannot demonstrate — labelled honestly here and in the spec's
 * Implementation notes.
 */
describe('FEAT-PC010 — group creation & settings contracts (G-A)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let plainMember: TestUser;
  let outsider: TestUser;
  let suspended: TestUser;

  /** Groups created during the suite, cleaned up at the end. */
  const createdGroupIds: string[] = [];

  /** Signed-in clients (one per persona, created per test as needed). */
  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'GA Steward' });
    plainMember = await createTestUser({ displayName: 'GA Member' });
    outsider = await createTestUser({ displayName: 'GA Outsider' });
    suspended = await createTestUser({ displayName: 'GA Suspended' });
    const { error } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspended.user.id);
    if (error) throw error;
  });

  afterAll(async () => {
    for (const id of createdGroupIds) await cleanupTestGroup(id);
    for (const u of [steward, plainMember, outsider, suspended]) {
      if (u) await cleanupTestUser(u.user.id);
    }
  });

  // ---------------------------------------------------------------- STORY-1

  describe('STORY-1: create_engagement_group — atomic, stewarded bootstrap', () => {
    it('creates the group + role instances + creator active membership + a management-role binding in one call', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('create_engagement_group', {
        p_name: 'GA Cohort',
      });
      expect(error).toBeNull();
      const groupId = data as string;
      expect(groupId).toBeTruthy();
      createdGroupIds.push(groupId);

      const { data: g } = await admin
        .from('groups')
        .select('name, group_type, status, created_by_group_id, is_public, show_member_list')
        .eq('id', groupId)
        .single();
      expect(g!.name).toBe('GA Cohort');
      expect(g!.group_type).toBe('engagement');
      expect(g!.status).toBe('active');
      expect(g!.created_by_group_id).toBe(steward.personalGroupId);

      const { data: roles } = await admin
        .from('group_roles')
        .select('id, created_from_role_template_id')
        .eq('group_id', groupId);
      expect((roles ?? []).length).toBeGreaterThanOrEqual(1);

      const { data: membership } = await admin
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId)
        .eq('member_group_id', steward.personalGroupId)
        .single();
      expect(membership!.status).toBe('active');

      // Creator is bound to the role whose template grants assign_roles
      // (permission-derived Steward identification — no role-name strings).
      const { data: binding } = await admin
        .from('user_group_roles')
        .select('group_role_id')
        .eq('group_id', groupId)
        .eq('member_group_id', steward.personalGroupId);
      expect((binding ?? []).length).toBe(1);
    });

    it('refuses an anonymous-session Mist with 42501 (FIM-only)', async () => {
      const c = createTestClient();
      const { error: anonErr } = await c.auth.signInAnonymously();
      expect(anonErr).toBeNull();
      const { error } = await c.rpc('create_engagement_group', { p_name: 'Mist Group' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
      await c.auth.signOut();
    });

    it('refuses a suspended FIM with 42501 (no new social footprint on admin hold)', async () => {
      const c = await asUser(suspended);
      const { error } = await c.rpc('create_engagement_group', { p_name: 'Suspended Group' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('fails whole on an unknown template id — nothing created (P0002)', async () => {
      const c = await asUser(steward);
      const ghost = '00000000-0000-0000-0000-00000000dead';
      const { error } = await c.rpc('create_engagement_group', {
        p_name: 'GA Ghost Template',
        p_group_template_id: ghost,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
      const { data: leftovers } = await admin
        .from('groups')
        .select('id')
        .eq('name', 'GA Ghost Template');
      expect(leftovers ?? []).toHaveLength(0);
    });

    it('refuses an empty name (22023)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('create_engagement_group', { p_name: '   ' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });
  });

  // ---------------------------------------------------------------- STORY-2

  describe('STORY-2: get_group_detail — honest, no-leak read', () => {
    let groupId: string;
    let publicGroupId: string;

    beforeAll(async () => {
      const c = await asUser(steward);
      const { data: g1 } = await c.rpc('create_engagement_group', { p_name: 'GA Detail Cohort' });
      if (g1) createdGroupIds.push(g1 as string);
      groupId = g1 as string;
      const { data: g2 } = await c.rpc('create_engagement_group', {
        p_name: 'GA Public Cohort',
        p_is_public: true,
        p_show_member_list: false,
      });
      if (g2) createdGroupIds.push(g2 as string);
      publicGroupId = g2 as string;
    });

    it('gives an active member the full picture: fields, status, count, viewer block, member list', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: groupId });
      expect(error).toBeNull();
      const d = data as Record<string, any>;
      expect(d.name).toBe('GA Detail Cohort');
      expect(d.status).toBe('active');
      expect(Number(d.member_count)).toBeGreaterThanOrEqual(1);
      expect(d.viewer.is_member).toBe(true);
      expect(d.viewer.can_manage_settings).toBe(true);
      // Member display identity resolves from the personal group's name.
      const { data: pg } = await admin
        .from('groups')
        .select('name')
        .eq('id', steward.personalGroupId)
        .single();
      const names = (d.members as Array<{ display_name: string }>).map((m) => m.display_name);
      expect(names).toContain(pg!.name);
    });

    it('gives a non-member of a public group the fields but honors show_member_list', async () => {
      const c = await asUser(outsider);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: publicGroupId });
      expect(error).toBeNull();
      const d = data as Record<string, any>;
      expect(d.name).toBe('GA Public Cohort');
      expect(d.viewer.is_member).toBe(false);
      expect(d.viewer.can_manage_settings).toBe(false);
      expect(d.members).toBeUndefined();

      await admin.from('groups').update({ show_member_list: true }).eq('id', publicGroupId);
      const { data: after } = await c.rpc('get_group_detail', { p_group_id: publicGroupId });
      expect((after as Record<string, any>).members).toBeDefined();
    });

    it('raises P0002 for a non-member on a private group AND for a nonexistent id — indistinguishably', async () => {
      const c = await asUser(outsider);
      const { error: privateErr } = await c.rpc('get_group_detail', { p_group_id: groupId });
      expect(privateErr).not.toBeNull();
      expect(privateErr!.code).toBe('P0002');
      const { error: ghostErr } = await c.rpc('get_group_detail', {
        p_group_id: '00000000-0000-0000-0000-00000000beef',
      });
      expect(ghostErr).not.toBeNull();
      expect(ghostErr!.code).toBe(privateErr!.code);
    });

    it('shows a member their group in a non-active lifecycle state, status verbatim (GRP-5)', async () => {
      const c = await asUser(steward);
      const { data: g3 } = await c.rpc('create_engagement_group', { p_name: 'GA Closed Cohort' });
      const closedId = g3 as string;
      createdGroupIds.push(closedId);
      await admin.from('groups').update({ status: 'closed' }).eq('id', closedId);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: closedId });
      expect(error).toBeNull();
      expect((data as Record<string, any>).status).toBe('closed');
    });

    it('refuses a Mist with 42501', async () => {
      const c = createTestClient();
      await c.auth.signInAnonymously();
      const { error } = await c.rpc('get_group_detail', { p_group_id: publicGroupId });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
      await c.auth.signOut();
    });
  });

  // ---------------------------------------------------------------- STORY-3

  describe('STORY-3: update_group_settings — permission-gated, partial, independent toggles', () => {
    let groupId: string;

    beforeAll(async () => {
      const c = await asUser(steward);
      const { data } = await c.rpc('create_engagement_group', {
        p_name: 'GA Settings Cohort',
        p_description: 'original description',
      });
      groupId = data as string;
      createdGroupIds.push(groupId);
      // plainMember joins with the group's default (non-managing) role so the
      // permission gate — not membership — is what's under test.
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: plainMember.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
    });

    it('updates only the provided field and returns the updated detail', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('update_group_settings', {
        p_group_id: groupId,
        p_name: 'GA Settings Cohort Renamed',
      });
      expect(error).toBeNull();
      const d = data as Record<string, any>;
      expect(d.name).toBe('GA Settings Cohort Renamed');
      expect(d.description).toBe('original description');
    });

    it('moves the two visibility toggles independently (GRP-3)', async () => {
      const c = await asUser(steward);
      const { data: after1, error: e1 } = await c.rpc('update_group_settings', {
        p_group_id: groupId,
        p_is_public: true,
      });
      expect(e1).toBeNull();
      expect((after1 as Record<string, any>).is_public).toBe(true);
      expect((after1 as Record<string, any>).show_member_list).toBe(true);

      const { data: after2, error: e2 } = await c.rpc('update_group_settings', {
        p_group_id: groupId,
        p_show_member_list: false,
      });
      expect(e2).toBeNull();
      expect((after2 as Record<string, any>).is_public).toBe(true);
      expect((after2 as Record<string, any>).show_member_list).toBe(false);
    });

    it('refuses a member without the settings permission (42501) and an outsider with no-leak (P0002)', async () => {
      const asMember = await asUser(plainMember);
      const { error: memberErr } = await asMember.rpc('update_group_settings', {
        p_group_id: groupId,
        p_name: 'Hijacked',
      });
      expect(memberErr).not.toBeNull();
      expect(memberErr!.code).toBe('42501');

      const asOutsider = await asUser(outsider);
      // The group is public at this point in the suite; make a private probe instead.
      const asSteward = await asUser(steward);
      const { data: privateId } = await asSteward.rpc('create_engagement_group', {
        p_name: 'GA Private Settings Probe',
      });
      createdGroupIds.push(privateId as string);
      const { error: outsiderErr } = await asOutsider.rpc('update_group_settings', {
        p_group_id: privateId,
        p_name: 'Hijacked',
      });
      expect(outsiderErr).not.toBeNull();
      expect(outsiderErr!.code).toBe('P0002');
    });

    it('offers no path to status or group_type — the parameter does not exist', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('update_group_settings', {
        p_group_id: groupId,
        p_status: 'closed',
      });
      expect(error).not.toBeNull(); // PGRST202: no function matches those arguments
    });
  });

  // ---------------------------------------------------------------- STORY-4

  describe('STORY-4: no path around the contracts (ADR-U038 direct-caller)', () => {
    let groupId: string;

    beforeAll(async () => {
      const c = await asUser(steward);
      const { data } = await c.rpc('create_engagement_group', { p_name: 'GA Narrowing Cohort' });
      groupId = data as string;
      if (groupId) createdGroupIds.push(groupId);
    });

    it('refuses a direct INSERT into groups from an authenticated FIM (privilege layer)', async () => {
      const c = await asUser(steward);
      const { error } = await c.from('groups').insert({
        name: 'GA Unbootstrapped',
        group_type: 'engagement',
        created_by_group_id: steward.personalGroupId,
      });
      expect(error).not.toBeNull();
    });

    it('refuses a direct INSERT into groups from a Mist — even the shape today\'s with_check permits', async () => {
      const c = createTestClient();
      await c.auth.signInAnonymously();
      // The real attack: a Mist naming its own proto personal group satisfies
      // the legacy with_check (created_by = actor) and creates an
      // un-bootstrapped group today. The narrowing must kill it at the
      // privilege layer.
      const { data: mistPg } = await c.rpc('get_current_personal_group_id');
      const { error } = await c.from('groups').insert({
        name: 'GA Mist Direct',
        group_type: 'engagement',
        created_by_group_id: mistPg,
      });
      expect(error).not.toBeNull();
      await c.auth.signOut();
    });

    it('refuses a direct UPDATE of status even for the permitted Steward (column privilege)', async () => {
      const c = await asUser(steward);
      const { error } = await c.from('groups').update({ status: 'archived' }).eq('id', groupId);
      expect(error).not.toBeNull();
      const { data: g } = await admin.from('groups').select('status').eq('id', groupId).single();
      expect(g!.status).toBe('active');
    });

    // Regression-guard, not red-first: this path works today and must keep
    // working after the narrowing (the permission rule lives in RLS either way).
    it('still allows the permitted Steward to update a settable column directly (rule lives substrate-side, not route-side)', async () => {
      const c = await asUser(steward);
      const { error } = await c
        .from('groups')
        .update({ description: 'settable directly' })
        .eq('id', groupId);
      expect(error).toBeNull();
    });
  });

  // ---------------------------------------------------------------- STORY-5

  describe('STORY-5: fresh-DB deployability (presence assert — see header note)', () => {
    it('finds the system groups the migration seeds idempotently', async () => {
      const { data } = await admin
        .from('groups')
        .select('name')
        .eq('group_type', 'system')
        .in('name', ['FringeIsland Members', 'DeusEx']);
      const names = (data ?? []).map((g) => g.name);
      expect(names).toContain('FringeIsland Members');
      expect(names).toContain('DeusEx');
    });
  });
});
