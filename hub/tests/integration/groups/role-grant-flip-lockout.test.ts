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
 * TASK-RDA-03 — the grant-flip door's RD-5 self-lockout guard.
 *
 * RD-A bound `permissions.is_protected` to the DELETE door (`delete_group_role`).
 * The neighbouring door — `set_group_role_permission(role, perm, false)` — had no
 * `is_protected` check at all, so a group could be bricked from inside without a
 * single row being deleted.
 *
 * RED-FIRST STATUS, labelled honestly:
 *  - STORY-1 ("refuses the last definer") is the red cell. Before the migration
 *    the revoke returns `error === null` — the incidental green that first
 *    exposed this hole in RD-A's S4c fixture.
 *  - STORY-2 (the brick is real) is deliberately NOT red-first. It admin-seeds
 *    the definer-less state directly rather than through the contract, because
 *    after the fix the contract refuses to produce it. Its job is to prove the
 *    CONSEQUENCE the guard exists to prevent — that the state is genuinely
 *    unrecoverable through member-plane contracts — which is the task's
 *    "confirm or refute before designing the fix" acceptance criterion.
 *  - STORY-3 and STORY-4 are over-fire guards: they must be green both before
 *    and after the migration. If either goes red after, the guard is too wide.
 */
describe('TASK-RDA-03 — grant-flip self-lockout guard', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let other: TestUser;

  const permIds: Record<string, string> = {};
  let stewardTemplateId: string;
  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const seedGroup = async (name: string) => {
    const c = await asUser(steward);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    return groupId as string;
  };

  const stewardInstanceId = async (groupId: string): Promise<string> => {
    const { data } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', groupId)
      .eq('created_from_role_template_id', stewardTemplateId)
      .single();
    return data!.id;
  };

  /** How many roles in this group currently grant `permName`. */
  const definerCount = async (groupId: string, permName: string): Promise<number> => {
    const { data } = await admin
      .from('group_roles')
      .select('id, group_role_permissions!inner(permission_id, granted)')
      .eq('group_id', groupId)
      .eq('group_role_permissions.permission_id', permIds[permName])
      .eq('group_role_permissions.granted', true);
    return (data ?? []).length;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'RDA3 Steward' });
    other = await createTestUser({ displayName: 'RDA3 Other' });

    const { data: perms } = await admin.from('permissions').select('id, name, is_protected');
    for (const p of perms ?? []) permIds[p.name] = p.id;

    const { data: templates } = await admin.from('role_templates').select('id, name');
    stewardTemplateId = templates!.find((t) => t.name === 'Steward Role Template')!.id;
  });

  afterAll(async () => {
    for (const id of createdGroupIds) await cleanupTestGroup(id);
    for (const u of [steward, other]) if (u) await cleanupTestUser(u.user.id);
  });

  // ---------------------------------------------------------------- STORY-1

  describe('STORY-1: the revoke door refuses the last definer of a protected permission', () => {
    let groupId: string;
    let stewardRoleId: string;

    beforeAll(async () => {
      groupId = await seedGroup('RDA3 Lockout Cohort');
      stewardRoleId = await stewardInstanceId(groupId);
    });

    it('the premise holds: the Steward instance is the only definer of manage_roles', async () => {
      expect(await definerCount(groupId, 'manage_roles')).toBe(1);
    });

    it('refuses the revoke, naming the permission, in the delete door voice', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('set_group_role_permission', {
        p_group_role_id: stewardRoleId,
        p_permission_name: 'manage_roles',
        p_granted: false,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('no holder of');
      expect(error!.message).toContain('manage_roles');
    });

    it('leaves the grant in place after the refusal', async () => {
      expect(await definerCount(groupId, 'manage_roles')).toBe(1);
    });
  });

  // ---------------------------------------------------------------- STORY-2

  describe('STORY-2: the brick is real (consequence proof, admin-seeded, not red-first)', () => {
    let groupId: string;
    let stewardRoleId: string;

    beforeAll(async () => {
      groupId = await seedGroup('RDA3 Bricked Cohort');
      stewardRoleId = await stewardInstanceId(groupId);
      // Reach the state the guard now forbids, by going around the contract.
      const { error } = await admin
        .from('group_role_permissions')
        .delete()
        .eq('group_role_id', stewardRoleId)
        .eq('permission_id', permIds['manage_roles']);
      if (error) throw new Error(`STORY-2 seed: ${error.message}`);
    });

    it('no role in the group grants manage_roles', async () => {
      expect(await definerCount(groupId, 'manage_roles')).toBe(0);
    });

    it('the Steward can no longer grant it back — the door itself requires it', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('set_group_role_permission', {
        p_group_role_id: stewardRoleId,
        p_permission_name: 'manage_roles',
        p_granted: true,
      });
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/not permitted to manage roles/i);
    });

    it('and cannot route around it by creating a new role that grants it', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RDA3 Recovery Attempt',
        p_description: null,
      });
      // Either the create itself is refused (manage_roles gate), or it succeeds
      // and the subsequent grant is refused by anti-escalation. Both are bricks.
      expect(error).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------- STORY-3

  describe('STORY-3: the guard does not over-fire when another role defines it', () => {
    let groupId: string;
    let stewardRoleId: string;

    beforeAll(async () => {
      groupId = await seedGroup('RDA3 Second Definer Cohort');
      stewardRoleId = await stewardInstanceId(groupId);
      const { data: role, error } = await admin
        .from('group_roles')
        .insert({ group_id: groupId, name: 'RDA3 Co-Definer' })
        .select('id')
        .single();
      if (error) throw new Error(`STORY-3 seed role: ${error.message}`);
      const { error: gErr } = await admin
        .from('group_role_permissions')
        .insert({ group_role_id: role!.id, permission_id: permIds['manage_roles'] });
      if (gErr) throw new Error(`STORY-3 seed grant: ${gErr.message}`);
    });

    it('the premise holds: two roles define manage_roles', async () => {
      expect(await definerCount(groupId, 'manage_roles')).toBe(2);
    });

    it('allows revoking from one of them', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('set_group_role_permission', {
        p_group_role_id: stewardRoleId,
        p_permission_name: 'manage_roles',
        p_granted: false,
      });
      expect(error).toBeNull();
      expect(await definerCount(groupId, 'manage_roles')).toBe(1);
    });
  });

  // ---------------------------------------------------------------- STORY-4

  describe('STORY-4: unprotected permissions are untouched by the guard', () => {
    let groupId: string;
    let soleDefinerRoleId: string;

    // `edit_journey` is unprotected AND granted by none of the four foundational
    // templates (verified against the live catalogue), so a custom role granting
    // it is deterministically the group's ONLY definer. Hunting for a
    // Steward-exclusive unprotected permission would not work: in a fresh group
    // every unprotected permission the Steward holds is also held by another
    // template, so no such sole-definer exists to probe with.
    const UNPROTECTED = 'edit_journey';

    beforeAll(async () => {
      groupId = await seedGroup('RDA3 Unprotected Cohort');
      const { data: role, error } = await admin
        .from('group_roles')
        .insert({ group_id: groupId, name: 'RDA3 Journey Editor' })
        .select('id')
        .single();
      if (error) throw new Error(`STORY-4 seed role: ${error.message}`);
      soleDefinerRoleId = role!.id;
      const { error: gErr } = await admin
        .from('group_role_permissions')
        .insert({ group_role_id: soleDefinerRoleId, permission_id: permIds[UNPROTECTED] });
      if (gErr) throw new Error(`STORY-4 seed grant: ${gErr.message}`);
    });

    it('the premise holds: this role is the only definer of an unprotected permission', async () => {
      expect(await definerCount(groupId, UNPROTECTED)).toBe(1);
    });

    it('allows revoking it even as the last definer', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('set_group_role_permission', {
        p_group_role_id: soleDefinerRoleId,
        p_permission_name: UNPROTECTED,
        p_granted: false,
      });
      expect(error).toBeNull();
      expect(await definerCount(groupId, UNPROTECTED)).toBe(0);
    });
  });
});
