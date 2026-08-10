import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import {
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(120_000); // two users + one catalogue query

/**
 * AB-6 audit, ruling A1 (Stefan, 2026-08-10) — the Tier-1 context-free arm is
 * LAW, pinned so it can neither silently vanish nor silently widen.
 *
 * ADR-U028 Amendment 2026-08-10: `has_permission`'s Tier-1 arm
 * (20260222000000_rebuild_universal_group_pattern.sql:436-453) matches any
 * permission held via a `group_type = 'system'` group with NO context-group
 * condition. DeusEx holds every permission (auto_grant_to_deusex), so
 * has_permission(<platform admin>, <any group>, <any permission>) is TRUE —
 * including for groups the admin never joined, including a context id that is
 * no group at all. Discovered undocumented at the ADM-G substrate dossier;
 * ruled law at the AB-6 audit (docs/planning/hub-v2/2026-08-10-ab6-full-anatomy-audit.md).
 *
 * PIN OF EXISTING BEHAVIOUR — green at authoring by design; the red is
 * reserved for a rewrite that drops the arm (admins stop passing), widens it
 * (non-system grants start passing context-free, or the permission-name match
 * disappears), or detaches it from the live grant.
 */

/** The house DeusEx elevation (suspended-group-admin-access idiom). */
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
        WHERE group_id = v_deusex AND member_group_id = '${personalGroupId}';
    END $$;`).catch(() => undefined);
}

describe('Tier-1 context-free arm is law (ADR-U028 Amendment 2026-08-10, AB-6 ruling A1)', () => {
  let admin: SupabaseClient;
  let platformAdmin: TestUser;
  let bystander: TestUser;

  const hasPerm = async (actorGroupId: string, contextGroupId: string, perm: string) => {
    const { data, error } = await admin.rpc('has_permission', {
      p_acting_group_id: actorGroupId,
      p_context_group_id: contextGroupId,
      p_permission_name: perm,
    });
    expect(error).toBeNull();
    return data as boolean;
  };

  beforeAll(async () => {
    admin = createAdminClient();
    platformAdmin = await createTestUser();
    bystander = await createTestUser();
    await makePlatformAdmin(platformAdmin.personalGroupId);
  });

  afterAll(async () => {
    await demotePlatformAdmin(platformAdmin.personalGroupId);
    await cleanupTestUser(platformAdmin.id);
    await cleanupTestUser(bystander.id);
  });

  it('the arm exists in the live definition, scoped to system groups and the named permission, with zero context reads (shape pin)', async () => {
    const rows = (await runAdminSql(`
      select pg_get_functiondef(p.oid) as def
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'has_permission';
    `)) as unknown as { def: string }[];
    expect(rows.length).toBe(1);
    const def = rows[0].def;

    // Slice the Tier-1 region: body start -> the Tier-2 marker. If either
    // anchor is gone, a rewrite happened — fail loudly and come re-pin the law.
    const begin = def.indexOf('BEGIN');
    const tier2 = def.indexOf('-- Tier 2');
    expect(begin).toBeGreaterThan(-1);
    expect(tier2).toBeGreaterThan(begin);
    const tier1 = def.slice(begin, tier2);

    // Not dropped: the system-group arm is present and returns TRUE.
    expect(tier1).toContain(`group_type = 'system'`);
    expect(tier1).toContain('RETURN TRUE');
    // Not widened: it matches one named permission on a live grant via an
    // ACTIVE membership — and it never reads the context group.
    expect(tier1).toContain('p.name = p_permission_name');
    expect(tier1).toContain('grp.granted = true');
    expect(tier1).toContain(`gm.status = 'active'`);
    expect(tier1).not.toContain('p_context_group_id');
  });

  it('a platform admin passes any permission check in a group they never joined — and in a context that is no group at all (behaviour pin)', async () => {
    // The bystander's personal group: a real group the admin has no relationship to.
    expect(await hasPerm(platformAdmin.personalGroupId, bystander.personalGroupId, 'manage_roles')).toBe(true);
    // A ghost context: the arm never reads it, so even a non-existent group passes.
    expect(await hasPerm(platformAdmin.personalGroupId, randomUUID(), 'manage_roles')).toBe(true);
  });

  it('a member without a system-group grant does NOT pass the same checks (not-widened control)', async () => {
    expect(await hasPerm(bystander.personalGroupId, platformAdmin.personalGroupId, 'manage_roles')).toBe(false);
    expect(await hasPerm(bystander.personalGroupId, randomUUID(), 'manage_roles')).toBe(false);
  });

  it('authority lives in the live grant: a demoted admin stops passing (detachment control)', async () => {
    await demotePlatformAdmin(platformAdmin.personalGroupId);
    try {
      expect(await hasPerm(platformAdmin.personalGroupId, bystander.personalGroupId, 'manage_roles')).toBe(false);
    } finally {
      await makePlatformAdmin(platformAdmin.personalGroupId); // restore for afterAll symmetry
    }
  });
});
