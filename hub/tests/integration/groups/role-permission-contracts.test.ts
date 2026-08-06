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

/** One role entry in the get_group_roles fabric payload. */
type RoleEntry = {
  id: string;
  name: string;
  description: string | null;
  created_from_role_template_id: string | null;
  holder_count: number;
  permissions: string[];
};

/** The get_group_roles jsonb payload shape asserted by this suite. */
type FabricShape = {
  group_id: string;
  roles: RoleEntry[];
  viewer: { can_manage_roles: boolean; can_assign_roles: boolean; can_remove_roles: boolean };
  available_permissions: Array<{ name: string; category: string }>;
};

/** get_group_detail members entry after the PC011 additive extension. */
type MemberEntry = {
  display_name: string;
  joined_at: string;
  member_group_id: string;
  roles: string[];
};

const GHOST = '00000000-0000-0000-0000-00000000dead';

/**
 * FEAT-PC011 (Groups Cycle G-B) — role & permission contracts.
 * Red-first: every new-contract rpc() test fails PGRST202 (functions absent)
 * and the get_group_detail extension asserts fail (keys absent) until the
 * migration lands.
 *
 * Labelled honestly (not red-first):
 *  - STORY-5's get_user_permissions asserts — the function is existing,
 *    published substrate (PC-3 §3); the story pins its contract, it does not
 *    introduce it.
 *  - STORY-6's direct-path asserts — the point of the story is verifying the
 *    EXISTING RLS refuses what the contracts refuse ("verified, not
 *    assumed"), so most are green-before-migration by design. The TRUNCATE
 *    revoke is red-first but PostgREST exposes no TRUNCATE verb — it is
 *    verified by SQL audit at the schema gate, not here.
 */
describe('FEAT-PC011 — group role & permission contracts (G-B)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let wrangler: TestUser; // holds manage/assign/remove_roles ONLY (admin-seeded custom role)
  let plainMember: TestUser; // active member, no role binding, no permissions
  let outsider: TestUser;
  let suspended: TestUser;

  /** Permission name → id, for admin-seeded grants. */
  const permIds: Record<string, string> = {};
  let stewardTemplateId: string;
  let guideTemplateId: string;
  let catalogCount = 0;

  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Steward bootstraps a group; plainMember + wrangler join as active members;
   *  wrangler gets the admin-seeded 'GB Wrangler' role (the three role-management
   *  keys, nothing else — the anti-escalation probe persona). */
  const seedGroup = async (name: string) => {
    const c = await asUser(steward);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);

    for (const member of [plainMember, wrangler]) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }

    // 'GB Wrangler Role Template' does not exist, so the copy_template_permissions
    // auto-link-by-name path stays cold — the role gets exactly the seeded grants.
    const { data: role, error: rErr } = await admin
      .from('group_roles')
      .insert({ group_id: groupId, name: 'GB Wrangler' })
      .select('id')
      .single();
    if (rErr) throw new Error(`seedGroup wrangler role: ${rErr.message}`);
    const { error: gErr } = await admin.from('group_role_permissions').insert(
      ['manage_roles', 'assign_roles', 'remove_roles'].map((p) => ({
        group_role_id: role!.id,
        permission_id: permIds[p],
      })),
    );
    if (gErr) throw new Error(`seedGroup wrangler grants: ${gErr.message}`);
    const { error: bErr } = await admin.from('user_group_roles').insert({
      member_group_id: wrangler.personalGroupId,
      group_id: groupId,
      group_role_id: role!.id,
      assigned_by_group_id: steward.personalGroupId,
    });
    if (bErr) throw new Error(`seedGroup wrangler binding: ${bErr.message}`);
    return { groupId: groupId as string, wranglerRoleId: role!.id as string };
  };

  /** The group's role instance derived from the Steward template. */
  const stewardInstanceId = async (groupId: string): Promise<string> => {
    const { data } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', groupId)
      .eq('created_from_role_template_id', stewardTemplateId)
      .single();
    return data!.id;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'GB Steward' });
    wrangler = await createTestUser({ displayName: 'GB Wrangler' });
    plainMember = await createTestUser({ displayName: 'GB Member' });
    outsider = await createTestUser({ displayName: 'GB Outsider' });
    suspended = await createTestUser({ displayName: 'GB Suspended' });
    const { error } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspended.user.id);
    if (error) throw error;

    const { data: perms } = await admin.from('permissions').select('id, name');
    for (const p of perms ?? []) permIds[p.name] = p.id;
    catalogCount = (perms ?? []).length;

    const { data: templates } = await admin.from('role_templates').select('id, name');
    stewardTemplateId = templates!.find((t) => t.name === 'Steward Role Template')!.id;
    guideTemplateId = templates!.find((t) => t.name === 'Guide Role Template')!.id;
  });

  afterAll(async () => {
    for (const id of createdGroupIds) await cleanupTestGroup(id);
    for (const u of [steward, wrangler, plainMember, outsider, suspended]) {
      if (u) await cleanupTestUser(u.user.id);
    }
  });

  // ---------------------------------------------------------------- STORY-1

  describe('STORY-1: get_group_roles — the fabric read', () => {
    let groupId: string;

    beforeAll(async () => {
      ({ groupId } = await seedGroup('GB Fabric Cohort'));
    });

    it('gives an active member every role instance + the catalog + their own capability flags', async () => {
      const c = await asUser(plainMember);
      const { data, error } = await c.rpc('get_group_roles', { p_group_id: groupId });
      expect(error).toBeNull();
      const f = data as FabricShape;

      // Bootstrap instantiated the four foundational templates + the seeded wrangler role.
      expect(f.roles.length).toBeGreaterThanOrEqual(5);
      const stewardEntry = f.roles.find(
        (r) => r.created_from_role_template_id === stewardTemplateId,
      );
      expect(stewardEntry).toBeDefined();
      expect(Number(stewardEntry!.holder_count)).toBe(1);
      expect(stewardEntry!.permissions).toContain('manage_roles');

      const wranglerEntry = f.roles.find((r) => r.name === 'GB Wrangler');
      expect(wranglerEntry).toBeDefined();
      expect(wranglerEntry!.created_from_role_template_id).toBeNull();
      expect([...wranglerEntry!.permissions].sort()).toEqual([
        'assign_roles',
        'manage_roles',
        'remove_roles',
      ]);

      // The catalog rides the payload: every registered permission, name + category.
      expect(f.available_permissions.length).toBe(catalogCount);
      expect(f.available_permissions.every((p) => p.name && p.category)).toBe(true);

      // plainMember holds no role → all capability flags false.
      expect(f.viewer).toEqual({
        can_manage_roles: false,
        can_assign_roles: false,
        can_remove_roles: false,
      });
    });

    it('reports true capability flags for the Steward', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('get_group_roles', { p_group_id: groupId });
      expect(error).toBeNull();
      expect((data as FabricShape).viewer).toEqual({
        can_manage_roles: true,
        can_assign_roles: true,
        can_remove_roles: true,
      });
    });

    it('raises P0002 for a non-member on a private group AND a nonexistent id — indistinguishably', async () => {
      const c = await asUser(outsider);
      const { error: privateErr } = await c.rpc('get_group_roles', { p_group_id: groupId });
      expect(privateErr).not.toBeNull();
      expect(privateErr!.code).toBe('P0002');
      const { error: ghostErr } = await c.rpc('get_group_roles', { p_group_id: GHOST });
      expect(ghostErr).not.toBeNull();
      expect(ghostErr!.code).toBe(privateErr!.code);
    });

    it('lets a non-member read a public active group (the G-A visibility rule), flags all false', async () => {
      const cs = await asUser(steward);
      const { data: publicId } = await cs.rpc('create_engagement_group', {
        p_name: 'GB Public Fabric',
        p_is_public: true,
      });
      createdGroupIds.push(publicId as string);
      const c = await asUser(outsider);
      const { data, error } = await c.rpc('get_group_roles', { p_group_id: publicId });
      expect(error).toBeNull();
      const f = data as FabricShape;
      expect(f.roles.length).toBeGreaterThanOrEqual(4);
      expect(f.viewer.can_manage_roles).toBe(false);
    });

    it('refuses a Mist with 42501', async () => {
      const c = createTestClient();
      await c.auth.signInAnonymously();
      const { error } = await c.rpc('get_group_roles', { p_group_id: groupId });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
      await c.auth.signOut();
    });
  });

  // ---------------------------------------------------------------- STORY-2

  describe('STORY-2: create_group_role — template instantiation & custom definition', () => {
    let groupId: string;

    beforeAll(async () => {
      ({ groupId } = await seedGroup('GB Define Cohort'));
    });

    it('instantiates a template: grants trigger-copied, visible in the fabric read', async () => {
      const c = await asUser(steward);
      const { data: roleId, error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'Reading Guide',
        p_role_template_id: guideTemplateId,
      });
      expect(error).toBeNull();
      expect(roleId).toBeTruthy();

      const { data: templateGrants } = await admin
        .from('role_template_permissions')
        .select('permission_id')
        .eq('role_template_id', guideTemplateId)
        .eq('granted', true);
      const { data: instanceGrants } = await admin
        .from('group_role_permissions')
        .select('permission_id')
        .eq('group_role_id', roleId as string)
        .eq('granted', true);
      expect(new Set((instanceGrants ?? []).map((g) => g.permission_id))).toEqual(
        new Set((templateGrants ?? []).map((g) => g.permission_id)),
      );

      const { data: fabric } = await c.rpc('get_group_roles', { p_group_id: groupId });
      expect((fabric as FabricShape).roles.map((r) => r.name)).toContain('Reading Guide');
    });

    it('refuses the template path with an explicit permission list (22023 — one path at a time)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Contradictory',
        p_role_template_id: guideTemplateId,
        p_permissions: ['view_forum'],
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('creates a custom role with exactly the requested grants', async () => {
      const c = await asUser(steward);
      const { data: roleId, error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Greeter',
        p_description: 'welcomes newcomers',
        p_permissions: ['invite_members', 'view_member_list'],
      });
      expect(error).toBeNull();
      const { data: grants } = await admin
        .from('group_role_permissions')
        .select('permissions(name)')
        .eq('group_role_id', roleId as string);
      const names = (grants ?? [])
        .map((g) => (g.permissions as unknown as { name: string }).name)
        .sort();
      expect(names).toEqual(['invite_members', 'view_member_list']);
      const { data: row } = await admin
        .from('group_roles')
        .select('created_from_role_template_id, description')
        .eq('id', roleId as string)
        .single();
      expect(row!.created_from_role_template_id).toBeNull();
      expect(row!.description).toBe('welcomes newcomers');
    });

    it('fails the whole call on a permission name outside the catalog (22023)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Ghost Grant',
        p_permissions: ['invite_members', 'summon_kraken'],
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
      const { data: leftovers } = await admin
        .from('group_roles')
        .select('id')
        .eq('group_id', groupId)
        .eq('name', 'GB Ghost Grant');
      expect(leftovers ?? []).toHaveLength(0);
    });

    it('refuses definition-time escalation: the author cannot grant what they do not hold (42501)', async () => {
      const c = await asUser(wrangler); // holds manage/assign/remove_roles, NOT edit_group_settings
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Escalator',
        p_permissions: ['edit_group_settings'],
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('refuses a custom name that would auto-link to a role template (22023 — the copy trigger trapdoor)', async () => {
      // copy_template_permissions auto-links 'Steward' → 'Steward Role Template'
      // and copies its grants — a custom role must not ride that path.
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'Steward',
        p_permissions: ['view_member_list'],
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('refuses a duplicate role name in the group (23505)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Greeter',
        p_permissions: ['view_member_list'],
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505');
    });

    it('refuses a member without manage_roles (42501), a suspended FIM (42501), and a Mist (42501)', async () => {
      const asPlain = await asUser(plainMember);
      const { error: plainErr } = await asPlain.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Nope',
        p_permissions: ['view_forum'],
      });
      expect(plainErr).not.toBeNull();
      expect(plainErr!.code).toBe('42501');

      const asSuspended = await asUser(suspended);
      const { error: suspErr } = await asSuspended.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Nope',
        p_permissions: ['view_forum'],
      });
      expect(suspErr).not.toBeNull();
      expect(suspErr!.code).toBe('42501');

      const mist = createTestClient();
      await mist.auth.signInAnonymously();
      const { error: mistErr } = await mist.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Nope',
        p_permissions: ['view_forum'],
      });
      expect(mistErr).not.toBeNull();
      expect(mistErr!.code).toBe('42501');
      await mist.auth.signOut();
    });
  });

  // ---------------------------------------------------------------- STORY-3

  describe('STORY-3: tend a role — rename, flip grants, delete', () => {
    let groupId: string;
    let customRoleId: string;
    let guideInstanceId: string;

    beforeAll(async () => {
      ({ groupId } = await seedGroup('GB Tend Cohort'));
      const c = await asUser(steward);
      const { data: r1 } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Tendable',
        p_description: 'original',
        p_permissions: ['view_member_list'],
      });
      customRoleId = r1 as string;
      const { data: r2 } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Guide Instance',
        p_role_template_id: guideTemplateId,
      });
      guideInstanceId = r2 as string;
    });

    it('grants and revokes a single key, returning the updated entry — anti-escalation enforced', async () => {
      const c = await asUser(steward);
      const { data: afterGrant, error: e1 } = await c.rpc('set_group_role_permission', {
        p_group_role_id: customRoleId,
        p_permission_name: 'invite_members',
        p_granted: true,
      });
      expect(e1).toBeNull();
      expect((afterGrant as RoleEntry).permissions).toContain('invite_members');

      const { data: afterRevoke, error: e2 } = await c.rpc('set_group_role_permission', {
        p_group_role_id: customRoleId,
        p_permission_name: 'invite_members',
        p_granted: false,
      });
      expect(e2).toBeNull();
      expect((afterRevoke as RoleEntry).permissions).not.toContain('invite_members');

      // Definition-time anti-escalation applies to the flip too.
      const w = await asUser(wrangler);
      const { error: escErr } = await w.rpc('set_group_role_permission', {
        p_group_role_id: customRoleId,
        p_permission_name: 'edit_group_settings',
        p_granted: true,
      });
      expect(escErr).not.toBeNull();
      expect(escErr!.code).toBe('42501');
    });

    it('customises a template-derived instance too (Open Q2 default: editable)', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('set_group_role_permission', {
        p_group_role_id: guideInstanceId,
        p_permission_name: 'invite_members',
        p_granted: true,
      });
      expect(error).toBeNull();
      expect((data as RoleEntry).permissions).toContain('invite_members');
    });

    it('renames with a partial update — only the name changes', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('update_group_role', {
        p_group_role_id: customRoleId,
        p_name: 'GB Tendable Renamed',
      });
      expect(error).toBeNull();
      const entry = data as RoleEntry;
      expect(entry.name).toBe('GB Tendable Renamed');
      expect(entry.description).toBe('original');
    });

    // ADAPTED at RD-A (FEAT-PC027 STORY-4, migration 20260806170000). The
    // third clause asserted 42501 on deleting a template-derived role. RD-A
    // deliberately lifts that refusal — an adopted role is the group's own
    // property and the group may put it down. The clause now asserts the
    // inverted behaviour. This is a labelled adaptation of a shipped
    // assertion, not a weakening: the anti-escalation pin below (a member
    // WITHOUT manage_roles is still refused 42501) is untouched, and RD-A's
    // own suite adds the held-by-members and self-lockout cells that now sit
    // where this refusal used to be.
    it('deletes a custom unheld role; refuses while held (unbind first); deletes template-derived too (RD-A)', async () => {
      const c = await asUser(steward);

      // Held: bind plainMember to the custom role first (admin — GRP-7's own
      // contract is under test elsewhere).
      await admin.from('user_group_roles').insert({
        member_group_id: plainMember.personalGroupId,
        group_id: groupId,
        group_role_id: customRoleId,
        assigned_by_group_id: steward.personalGroupId,
      });
      const { error: heldErr } = await c.rpc('delete_group_role', {
        p_group_role_id: customRoleId,
      });
      expect(heldErr).not.toBeNull();
      expect(heldErr!.code).toBe('P0001');

      // Unbind → delete succeeds.
      await admin
        .from('user_group_roles')
        .delete()
        .eq('group_role_id', customRoleId)
        .eq('member_group_id', plainMember.personalGroupId);
      const { error: delErr } = await c.rpc('delete_group_role', {
        p_group_role_id: customRoleId,
      });
      expect(delErr).toBeNull();
      const { data: gone } = await admin
        .from('group_roles')
        .select('id')
        .eq('id', customRoleId);
      expect(gone ?? []).toHaveLength(0);

      // Template-derived, unheld: deleted since RD-A. Pulled fresh rather than
      // reusing guideInstanceId — the anti-escalation pin below still needs
      // that role to EXIST, or its 42501 would decay into a P0002 and the pin
      // would pass for the wrong reason.
      const { data: pulledId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Pulled Guide',
        p_role_template_id: guideTemplateId,
      });
      const { error: tmplErr } = await c.rpc('delete_group_role', {
        p_group_role_id: pulledId as string,
      });
      expect(tmplErr).toBeNull();
      const { data: tmplGone } = await admin
        .from('group_roles')
        .select('id')
        .eq('id', pulledId as string);
      expect(tmplGone ?? []).toHaveLength(0);
    });

    it('refuses a member without manage_roles on every tending contract (42501); foreign role ids no-leak (P0002)', async () => {
      const c = await asUser(plainMember);
      const { error: e1 } = await c.rpc('update_group_role', {
        p_group_role_id: guideInstanceId,
        p_name: 'Hijacked',
      });
      expect(e1!.code).toBe('42501');
      const { error: e2 } = await c.rpc('set_group_role_permission', {
        p_group_role_id: guideInstanceId,
        p_permission_name: 'view_forum',
        p_granted: true,
      });
      expect(e2!.code).toBe('42501');
      const { error: e3 } = await c.rpc('delete_group_role', {
        p_group_role_id: guideInstanceId,
      });
      expect(e3!.code).toBe('42501');

      // A role id in a group the caller cannot see resolves as P0002 — same as absent.
      const o = await asUser(outsider);
      const { error: foreignErr } = await o.rpc('update_group_role', {
        p_group_role_id: guideInstanceId,
        p_name: 'Hijacked',
      });
      expect(foreignErr!.code).toBe('P0002');
      const { error: ghostErr } = await o.rpc('update_group_role', {
        p_group_role_id: GHOST,
        p_name: 'Hijacked',
      });
      expect(ghostErr!.code).toBe(foreignErr!.code);
    });
  });

  // ---------------------------------------------------------------- STORY-4

  describe('STORY-4: assign_member_role / remove_member_role — the anti-escalation walls', () => {
    let groupId: string;
    let greeterRoleId: string;
    let stewardRoleId: string;

    beforeAll(async () => {
      ({ groupId } = await seedGroup('GB Assign Cohort'));
      stewardRoleId = await stewardInstanceId(groupId);
      const c = await asUser(steward);
      const { data } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Assign Greeter',
        p_permissions: ['invite_members'],
      });
      greeterRoleId = data as string;
    });

    it('assigns a role to an active member; the durable notification row is written by the existing trigger', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
      expect(error).toBeNull();

      const { data: binding } = await admin
        .from('user_group_roles')
        .select('assigned_by_group_id')
        .eq('group_id', groupId)
        .eq('member_group_id', plainMember.personalGroupId)
        .eq('group_role_id', greeterRoleId)
        .single();
      expect(binding!.assigned_by_group_id).toBe(steward.personalGroupId);

      const { data: notif } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', plainMember.personalGroupId)
        .eq('type', 'role_assigned')
        .eq('group_id', groupId);
      expect((notif ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it('refuses double-assignment of the same role (23505)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505');
    });

    it('refuses assignment-time escalation: an assign_roles holder cannot hand out a role granting what they lack (42501)', async () => {
      const w = await asUser(wrangler); // holds assign_roles but not the Steward instance's full grant set
      const { error } = await w.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: stewardRoleId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('refuses assignment to a non-member (22023) and to ghost/foreign targets with no-leak (P0002)', async () => {
      const c = await asUser(steward);
      const { error: nonMemberErr } = await c.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: outsider.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
      expect(nonMemberErr).not.toBeNull();
      expect(nonMemberErr!.code).toBe('22023');

      const { error: ghostRoleErr } = await c.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: GHOST,
      });
      expect(ghostRoleErr!.code).toBe('P0002');

      const { error: ghostGroupErr } = await c.rpc('assign_member_role', {
        p_group_id: GHOST,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
      expect(ghostGroupErr!.code).toBe('P0002');
    });

    it('removes a binding; refuses the last Steward-equivalent binding with the surfaced invariant (P0001)', async () => {
      const c = await asUser(steward);
      const { error: removeErr } = await c.rpc('remove_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
      expect(removeErr).toBeNull();
      const { data: gone } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_group_id', plainMember.personalGroupId)
        .eq('group_role_id', greeterRoleId);
      expect(gone ?? []).toHaveLength(0);

      // The last Steward binding: the existing trigger refuses, surfaced verbatim.
      const { error: lastErr } = await c.rpc('remove_member_role', {
        p_group_id: groupId,
        p_member_group_id: steward.personalGroupId,
        p_group_role_id: stewardRoleId,
      });
      expect(lastErr).not.toBeNull();
      expect(lastErr!.code).toBe('P0001');
      const { data: still } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_group_id', steward.personalGroupId)
        .eq('group_role_id', stewardRoleId);
      expect((still ?? []).length).toBe(1);
    });

    it('refuses a member without the respective permission (42501) and a missing binding (P0002)', async () => {
      const c = await asUser(plainMember);
      const { error: assignErr } = await c.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
      expect(assignErr!.code).toBe('42501');
      const { error: removeErr } = await c.rpc('remove_member_role', {
        p_group_id: groupId,
        p_member_group_id: steward.personalGroupId,
        p_group_role_id: stewardRoleId,
      });
      expect(removeErr!.code).toBe('42501');

      const s = await asUser(steward);
      const { error: noBindingErr } = await s.rpc('remove_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId, // already removed above
      });
      expect(noBindingErr).not.toBeNull();
      expect(noBindingErr!.code).toBe('P0002');
    });
  });

  // ---------------------------------------------------------------- STORY-5

  describe('STORY-5: what I can do here — get_user_permissions + the detail extension', () => {
    let groupId: string;
    let greeterRoleId: string;

    beforeAll(async () => {
      ({ groupId } = await seedGroup('GB Effective Cohort'));
      const c = await asUser(steward);
      const { data } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'GB Effective Greeter',
        p_permissions: ['invite_members', 'view_member_list'],
      });
      greeterRoleId = data as string;
      await c.rpc('assign_member_role', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
        p_group_role_id: greeterRoleId,
      });
    });

    // Existing substrate, pinned not introduced — see suite header.
    it('returns the caller\'s effective permission names, deduplicated (existing RPC, pinned)', async () => {
      const c = await asUser(plainMember);
      const { data, error } = await c.rpc('get_user_permissions', {
        p_acting_group_id: plainMember.personalGroupId,
        p_context_group_id: groupId,
      });
      expect(error).toBeNull();
      const perms = data as string[];
      expect(perms).toContain('invite_members');
      expect(perms).toContain('view_member_list');
      expect(new Set(perms).size).toBe(perms.length);
    });

    // Substrate fact surfaced at red: the system-group global rule means the
    // result is never literally empty for a FIM (the FringeIsland Members
    // baseline always contributes). The AC's no-leak intent is asserted as
    // indistinguishability: a foreign private context returns exactly the
    // caller's baseline — the same as a nonexistent context — and no
    // group-derived key leaks. Recorded for the gate + Implementation notes.
    it('leaks nothing to a non-member: foreign-group result is baseline-indistinguishable from a ghost context (existing RPC, pinned)', async () => {
      const c = await asUser(outsider);
      const { data: foreign, error: foreignErr } = await c.rpc('get_user_permissions', {
        p_acting_group_id: outsider.personalGroupId,
        p_context_group_id: groupId,
      });
      expect(foreignErr).toBeNull();
      const { data: ghost, error: ghostErr } = await c.rpc('get_user_permissions', {
        p_acting_group_id: outsider.personalGroupId,
        p_context_group_id: GHOST,
      });
      expect(ghostErr).toBeNull();
      expect([...(foreign as string[])].sort()).toEqual([...(ghost as string[])].sort());
      // No key granted only through this group's roles leaks out.
      expect(foreign as string[]).not.toContain('manage_roles');
      expect(foreign as string[]).not.toContain('invite_members');
    });

    it('get_group_detail members entries additively carry member_group_id and roles[]', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: groupId });
      expect(error).toBeNull();
      const members = (data as { members: MemberEntry[] }).members;
      expect(members).toBeDefined();

      const plainEntry = members.find(
        (m) => m.member_group_id === plainMember.personalGroupId,
      );
      expect(plainEntry).toBeDefined();
      expect(plainEntry!.roles).toEqual(['GB Effective Greeter']);

      const stewardEntry = members.find(
        (m) => m.member_group_id === steward.personalGroupId,
      );
      // The bootstrap names instances verbatim after their template ('Steward
      // Role Template') — assert against the instance's real name, not a
      // hardcoded 'Steward'.
      const { data: instance } = await admin
        .from('group_roles')
        .select('name')
        .eq('group_id', groupId)
        .eq('created_from_role_template_id', stewardTemplateId)
        .single();
      expect(stewardEntry!.roles).toContain(instance!.name);
      // Existing keys unchanged (additive extension).
      expect(stewardEntry!.display_name).toBeTruthy();
      expect(stewardEntry!.joined_at).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------- STORY-6

  describe('STORY-6: no path around the contracts (ADR-U038 direct-caller) — existing RLS verified, not assumed', () => {
    let groupId: string;
    let wranglerRoleId: string;
    let stewardRoleId: string;
    let grantRowRoleId: string;

    beforeAll(async () => {
      ({ groupId, wranglerRoleId } = await seedGroup('GB Adversarial Cohort'));
      stewardRoleId = await stewardInstanceId(groupId);
      grantRowRoleId = wranglerRoleId;
    });

    it('refuses direct role-definition writes from a plain member (INSERT errors; UPDATE/DELETE hit zero rows)', async () => {
      const c = await asUser(plainMember);

      const { error: insErr } = await c.from('group_roles').insert({
        group_id: groupId,
        name: 'GB Direct Role',
      });
      expect(insErr).not.toBeNull();

      const { data: updData } = await c
        .from('group_roles')
        .update({ name: 'GB Hijacked' })
        .eq('id', stewardRoleId)
        .select();
      expect(updData ?? []).toHaveLength(0);
      const { data: after } = await admin
        .from('group_roles')
        .select('name')
        .eq('id', stewardRoleId)
        .single();
      expect(after!.name).not.toBe('GB Hijacked');

      const { data: delData } = await c
        .from('group_roles')
        .delete()
        .eq('id', wranglerRoleId)
        .select();
      expect(delData ?? []).toHaveLength(0);
    });

    it('refuses direct grant writes from a plain member (the grp_insert definition-time wall — Open Q4)', async () => {
      const c = await asUser(plainMember);
      const { error: insErr } = await c.from('group_role_permissions').insert({
        group_role_id: wranglerRoleId,
        permission_id: permIds['edit_group_settings'],
      });
      expect(insErr).not.toBeNull();

      const { data: delData } = await c
        .from('group_role_permissions')
        .delete()
        .eq('group_role_id', grantRowRoleId)
        .select();
      expect(delData ?? []).toHaveLength(0);
    });

    it('refuses direct binding writes from a plain member (self-assign blocked while the group has a leader)', async () => {
      const c = await asUser(plainMember);
      const { error: insErr } = await c.from('user_group_roles').insert({
        member_group_id: plainMember.personalGroupId,
        group_id: groupId,
        group_role_id: stewardRoleId,
        assigned_by_group_id: plainMember.personalGroupId,
      });
      expect(insErr).not.toBeNull();

      const { data: delData } = await c
        .from('user_group_roles')
        .delete()
        .eq('group_id', groupId)
        .eq('member_group_id', wrangler.personalGroupId)
        .select();
      expect(delData ?? []).toHaveLength(0);
    });

    it('refuses every direct write from a Mist on all three tables', async () => {
      const c = createTestClient();
      await c.auth.signInAnonymously();

      const { error: rolesErr } = await c.from('group_roles').insert({
        group_id: groupId,
        name: 'GB Mist Role',
      });
      expect(rolesErr).not.toBeNull();

      const { error: grantsErr } = await c.from('group_role_permissions').insert({
        group_role_id: wranglerRoleId,
        permission_id: permIds['manage_roles'],
      });
      expect(grantsErr).not.toBeNull();

      const { error: bindingsErr } = await c.from('user_group_roles').insert({
        member_group_id: plainMember.personalGroupId,
        group_id: groupId,
        group_role_id: stewardRoleId,
      });
      expect(bindingsErr).not.toBeNull();

      const { data: updData } = await c
        .from('group_roles')
        .update({ name: 'GB Mist Hijack' })
        .eq('id', stewardRoleId)
        .select();
      expect(updData ?? []).toHaveLength(0);
      await c.auth.signOut();
    });

    it('offers no direct UPDATE on grants or bindings even to the Steward (no UPDATE policy — default deny)', async () => {
      const c = await asUser(steward);
      const { data: grpUpd } = await c
        .from('group_role_permissions')
        .update({ granted: false })
        .eq('group_role_id', grantRowRoleId)
        .select();
      expect(grpUpd ?? []).toHaveLength(0);
      const { data: check } = await admin
        .from('group_role_permissions')
        .select('granted')
        .eq('group_role_id', grantRowRoleId);
      expect((check ?? []).every((r) => r.granted === true)).toBe(true);

      const { data: ugrUpd } = await c
        .from('user_group_roles')
        .update({ member_group_id: plainMember.personalGroupId })
        .eq('group_id', groupId)
        .eq('member_group_id', wrangler.personalGroupId)
        .select();
      expect(ugrUpd ?? []).toHaveLength(0);
    });
  });
});
