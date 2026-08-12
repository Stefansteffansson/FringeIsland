import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(300_000); // real-substrate gate suite: admin + FIMs + a consented member + a two-session target

/**
 * FEAT-PC025 gate (Cycle ADM-F, TASK-ADMF-01) — role-template editing contracts
 * (versions with a default pointer, clone-don't-edit seeds, apply-as-repoint,
 * the protected-set guard) + the three ADM-E walk riders (WA-2 audit-target
 * resolution, WA-3 consent-anonymise leg on hard delete, WA-4 per-session
 * sign-out hints).
 *
 * RED AT HEAD (pre-migration), by design, four mechanisms:
 *  - the five editor functions do not exist -> every editor cell fails PGRST202;
 *  - the WA-2 cells assert the NEW payload keys (target_display_name /
 *    target_email) and the family gate message -> absent key / 'Unauthorized'
 *    at head;
 *  - the WA-3 consented-member cell hard-deletes a member who recorded a
 *    consent decision -> the live body has no anonymise leg, so the personal-
 *    group delete hits consent_records_subject_group_id_fkey (23503 class);
 *  - the WA-4 cells count realtime.messages rows on the target's session topic
 *    -> the live admin_force_logout emits nothing, so the count stays 0.
 *
 * The whole suite runs the direct PostgREST path (supabase-js rpc) — STORY-7's
 * adversarial direct-door proof is the suite's own transport plus the explicit
 * write-seal cells. Nothing else runs against the dev DB concurrently (house
 * rule); fixture names carry the run token.
 */

/** Authenticated DeusEx caller — the house elevation (ADM-E gate-suite pattern). */
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

const TOKEN = `pc025x${Date.now().toString(36)}`;

type CatalogRow = {
  name: string;
  category: string;
  description: string | null;
  is_protected: boolean;
};
type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  default_version_number: number;
  version_count: number;
  group_template_refs: string[];
  instantiated_role_count: number;
};
type ListPayload = {
  templates: TemplateRow[];
  catalog: CatalogRow[];
  generated_at: string;
};
type VersionRow = {
  id: string;
  version_number: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by_display_name: string | null;
  permission_names: string[];
  is_default: boolean;
};
type DetailPayload = {
  template: { id: string; name: string; description: string | null; is_system: boolean };
  versions: VersionRow[];
  generated_at: string;
};
type AuditRow = {
  id: string;
  actor_group_id: string | null;
  actor_display_name: string | null;
  action: string;
  target: string;
  target_display_name: string | null;
  target_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

describe('FEAT-PC025 — role-template editing contracts + the walk riders (gate suite)', () => {
  const admin = createAdminClient();
  let deusex: TestUser;
  let deusexClient: SupabaseClient;
  let deusexGroupId: string;
  let fim: TestUser;
  let fimClient: SupabaseClient;
  let fimGroupId: string;

  let stewardTemplateId: string;
  let cloneId: string | undefined;
  const cloneName = `${TOKEN} Steward Clone`;
  const createdGroupIds: string[] = [];
  const syntheticGtIds: string[] = [];
  let consented: TestUser | undefined; // S6c fixture — cleaned in afterAll if the designed-red path leaves it
  let logoutTarget: TestUser | undefined; // S6d fixture — same discipline

  const rpcAdmin = (fn: string, args?: Record<string, unknown>) =>
    deusexClient.rpc(fn, args as never);

  const liveTemplateSet = async (templateId: string): Promise<string[]> => {
    const rows = (await runAdminSql(
      `SELECT p.name FROM public.role_template_permissions rtp
        JOIN public.permissions p ON p.id = rtp.permission_id
       WHERE rtp.role_template_id = '${templateId}' ORDER BY p.name;`,
    )) as Array<{ name: string }>;
    return rows.map((r) => r.name);
  };

  const groupRoleSet = async (groupId: string, roleName: string): Promise<string[]> => {
    const rows = (await runAdminSql(
      `SELECT p.name FROM public.group_roles gr
        JOIN public.group_role_permissions grp ON grp.group_role_id = gr.id
        JOIN public.permissions p ON p.id = grp.permission_id
       WHERE gr.group_id = '${groupId}' AND gr.name = '${roleName.replace(/'/g, "''")}'
       ORDER BY p.name;`,
    )) as Array<{ name: string }>;
    return rows.map((r) => r.name);
  };

  beforeAll(async () => {
    deusex = await createTestUser({ displayName: `${TOKEN} DeusEx Admin` });
    fim = await createTestUser({ displayName: `${TOKEN} Plain Fim` });

    const { data: dRow } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', deusex.user.id)
      .single();
    deusexGroupId = dRow!.personal_group_id;
    const { data: fRow } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', fim.user.id)
      .single();
    fimGroupId = fRow!.personal_group_id;

    await makePlatformAdmin(deusexGroupId);

    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusex.email, deusex.password);
    fimClient = createTestClient();
    await signInWithRetry(fimClient, fim.email, fim.password);

    const { data: st } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', 'Steward Role Template')
      .single();
    stewardTemplateId = st!.id;
  });

  afterAll(async () => {
    for (const gt of syntheticGtIds) {
      await runAdminSql(`DELETE FROM public.group_templates WHERE id = '${gt}';`).catch(
        () => undefined,
      );
    }
    for (const g of createdGroupIds) {
      await runAdminSql(`DELETE FROM public.groups WHERE id = '${g}';`).catch(() => undefined);
    }
    if (cloneId) {
      await runAdminSql(`DELETE FROM public.role_templates WHERE id = '${cloneId}';`).catch(
        () => undefined,
      );
    }
    await runAdminSql(
      `DELETE FROM public.role_templates WHERE name LIKE '${TOKEN}%';`,
    ).catch(() => undefined);
    await demotePlatformAdmin(deusexGroupId);
    // `cleanupTestUser` takes an AUTH USER ID. These four passed the whole
    // `TestUser` object, so the lookup matched nothing and the delete was a
    // silent no-op — four fixture accounts leaked on every run. ts-jest does not
    // type-check (only `next build` does), so the mismatch never surfaced, and
    // the `.catch(() => undefined)` wrappers guaranteed nobody would ever see it.
    if (consented) await cleanupTestUser(consented.user.id);
    if (logoutTarget) await cleanupTestUser(logoutTarget.user.id);
    await cleanupTestUser(deusex.user.id);
    await cleanupTestUser(fim.user.id);
  });

  // -------------------------------------------------------------------------
  // STORY-1 — the ledger starts honest
  // -------------------------------------------------------------------------

  it('S1a: list read returns the seeded templates at version 1 with the full flagged catalogue', async () => {
    const { data, error } = await rpcAdmin('admin_get_role_templates');
    expect(error).toBeNull();
    const payload = data as ListPayload;

    const seeded = payload.templates.filter((t) => t.is_system);
    expect(seeded.length).toBeGreaterThanOrEqual(4);
    for (const t of seeded) {
      expect(t.version_count).toBe(1);
      expect(t.default_version_number).toBe(1);
    }

    // Catalogue equals the live table (runtime-derived, never a hardcoded count).
    const { count } = await admin
      .from('permissions')
      .select('*', { count: 'exact', head: true });
    expect(payload.catalog.length).toBe(count);
    for (const c of payload.catalog) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.category).toBe('string');
      expect(typeof c.is_protected).toBe('boolean');
    }
    expect(payload.catalog.some((c) => c.is_protected)).toBe(true);
    expect(typeof payload.generated_at).toBe('string');
  });

  it('S1b: detail read shows the backfilled version 1 as default with the seed set', async () => {
    const { data, error } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: stewardTemplateId,
    });
    expect(error).toBeNull();
    const payload = data as DetailPayload;
    expect(payload.template.is_system).toBe(true);
    expect(payload.versions.length).toBe(1);
    const v1 = payload.versions[0];
    expect(v1.version_number).toBe(1);
    expect(v1.is_default).toBe(true);
    expect([...v1.permission_names].sort()).toEqual(await liveTemplateSet(stewardTemplateId));
  });

  it('S1c: unknown template id refuses P0002; non-admin refuses with the family message', async () => {
    const { error: notFound } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: '00000000-0000-0000-0000-00000000dead',
    });
    expect(notFound).not.toBeNull();
    expect(notFound!.code).toBe('P0002');

    const { error: nonAdmin } = await fimClient.rpc('admin_get_role_templates');
    expect(nonAdmin).not.toBeNull();
    expect(nonAdmin!.message).toContain('platform administrator required');
  });

  // -------------------------------------------------------------------------
  // STORY-2 — clone, honestly announced
  // -------------------------------------------------------------------------

  it('S2a: clone creates an editable non-system template materialised from the source live set', async () => {
    const { data, error } = await rpcAdmin('admin_clone_role_template', {
      p_source_id: stewardTemplateId,
      p_name: cloneName,
    });
    expect(error).toBeNull();
    cloneId = (data as { id: string }).id;

    // ADAPTED by RD-B FEAT-PC028 STORY-3 (repointed, not weakened): a clone
    // now reaches nobody until it is PUBLISHED — offerability is enforced at
    // the write door, not just filtered out of the picker. System templates
    // stay exempt, which is why the rest of this suite is untouched. Published
    // platform-wide so the pull-door and offer-read cells below behave exactly
    // as they did before RD-B.
    await runAdminSql(`
      INSERT INTO public.role_template_publications (role_template_id, group_id)
      VALUES ('${cloneId}', NULL)
      ON CONFLICT DO NOTHING;`);

    const { data: row } = await admin
      .from('role_templates')
      .select('id, name, is_system')
      .eq('id', cloneId!)
      .single();
    expect(row!.is_system).toBe(false);
    expect(row!.name).toBe(cloneName);
    expect(await liveTemplateSet(cloneId!)).toEqual(await liveTemplateSet(stewardTemplateId));

    const { data: audit } = await admin
      .from('admin_audit_log')
      .select('action, target, metadata')
      .eq('action', 'role_template.clone')
      .eq('target', cloneId!)
      .single();
    expect(audit).not.toBeNull();
    expect((audit!.metadata as { permission_names?: string[] }).permission_names).toBeDefined();
  });

  it('S2b: a duplicate name refuses 22023 typed', async () => {
    const { error } = await rpcAdmin('admin_clone_role_template', {
      p_source_id: stewardTemplateId,
      p_name: cloneName,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('22023');
  });

  it('S2c (WA-6, flipped in-walk 2026-08-05): template-less instantiation carries the SYSTEM set only; the clone stays at the pull doors', async () => {
    const { data: groupId, error } = await fimClient.rpc('create_engagement_group', {
      p_name: `${TOKEN} no-template group`,
    });
    expect(error).toBeNull();
    createdGroupIds.push(groupId as string);

    const roles = (await runAdminSql(
      `SELECT name, created_from_role_template_id FROM public.group_roles
        WHERE group_id = '${groupId}';`,
    )) as Array<{ name: string; created_from_role_template_id: string | null }>;
    // WA-6 (Stefan's walk ruling, 2026-08-05): the clone does NOT ride —
    // flipped from the PC025 STORY-2 pin under the new law, red-first.
    expect(roles.some((r) => r.created_from_role_template_id === cloneId)).toBe(false);
    // …and what DOES ride is exactly the system set, non-empty:
    const seedCheck = (await runAdminSql(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE rt.is_system)::int AS system_count
         FROM public.group_roles gr
         JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
        WHERE gr.group_id = '${groupId}';`,
    )) as Array<{ total: number; system_count: number }>;
    expect(seedCheck[0].total).toBeGreaterThan(0);
    expect(seedCheck[0].system_count).toBe(seedCheck[0].total);

    // ADAPTED by RD-B (RDB-1): repointed to the scoped offer read.
    const { data: memberRead } = await fimClient.rpc('get_available_role_templates', {
      p_group_id: groupId,
    });
    const names = (memberRead as Array<{ name: string }>).map((t) => t.name);
    expect(names).toContain(cloneName);
  });

  // -------------------------------------------------------------------------
  // STORY-3 — versions append; seeds refuse
  // -------------------------------------------------------------------------

  it('S3a: version_create appends an unapplied draft and changes nothing live', async () => {
    // Red at head by precondition: the clone door doesn't exist yet (S2a's PGRST202).
    expect(cloneId).toBeDefined();
    const base = await liveTemplateSet(cloneId!);
    const draftSet = base.filter((n) => n !== 'send_announcements');
    const { error } = await rpcAdmin('admin_create_role_template_version', {
      p_template_id: cloneId!,
      p_name: cloneName,
      p_description: 'v2 draft — announcements removed',
      p_permission_names: draftSet,
    });
    expect(error).toBeNull();

    expect(await liveTemplateSet(cloneId!)).toEqual(base); // unapplied: live untouched

    const { data } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: cloneId!,
    });
    const payload = data as DetailPayload;
    expect(payload.versions.length).toBe(2);
    const v2 = payload.versions.find((v) => v.version_number === 2)!;
    expect(v2.is_default).toBe(false);
    expect([...v2.permission_names].sort()).toEqual([...draftSet].sort());

    const { data: audit } = await admin
      .from('admin_audit_log')
      .select('metadata')
      .eq('action', 'role_template.version_create')
      .eq('target', cloneId!)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect((audit!.metadata as { removed?: string[] }).removed).toContain('send_announcements');
  });

  it('S3b: version_create on a seeded template refuses P0001; an unknown permission refuses 22023', async () => {
    const { error: seedErr } = await rpcAdmin('admin_create_role_template_version', {
      p_template_id: stewardTemplateId,
      p_name: 'Steward Role Template',
      p_description: 'illegal',
      p_permission_names: ['view_forum'],
    });
    expect(seedErr).not.toBeNull();
    expect(seedErr!.code).toBe('P0001');

    const { error: unknownErr } = await rpcAdmin('admin_create_role_template_version', {
      p_template_id: cloneId!,
      p_name: cloneName,
      p_description: 'bad',
      p_permission_names: ['no_such_permission_ever'],
    });
    expect(unknownErr).not.toBeNull();
    expect(unknownErr!.code).toBe('22023');
  });

  // -------------------------------------------------------------------------
  // STORY-4 — apply is a repoint; rollback is the same door
  // -------------------------------------------------------------------------

  it('S4a (WA-6-adapted: pull-door witnesses — RED at head, the old law\'s ridden clone collides 23505 with the pull; green post-apply): apply materialises the version, future PULLS copy the new set, prior instantiations keep their snapshot; rollback restores', async () => {
    // Red at head by precondition: the clone door doesn't exist yet (S2a's PGRST202).
    expect(cloneId).toBeDefined();
    const v1Set = await liveTemplateSet(cloneId!);

    // Snapshot witness: a group instantiated BEFORE the apply.
    const { data: preGroupId } = await fimClient.rpc('create_engagement_group', {
      p_name: `${TOKEN} pre-apply group`,
    });
    createdGroupIds.push(preGroupId as string);
    // WA-6: template-less groups no longer carry the clone — the witness
    // instantiates through the PULL door (create_group_role from template).
    const prePull = await fimClient.rpc('create_group_role', {
      p_group_id: preGroupId as string,
      p_name: cloneName,
      p_role_template_id: cloneId!,
    });
    expect(prePull.error).toBeNull();
    const preSet = await groupRoleSet(preGroupId as string, cloneName);

    const { data: detail } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: cloneId!,
    });
    const versions = (detail as DetailPayload).versions;
    const v1 = versions.find((v) => v.version_number === 1)!;
    const v2 = versions.find((v) => v.version_number === 2)!;

    const { error: applyErr } = await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: cloneId!,
      p_version_id: v2.id,
    });
    expect(applyErr).toBeNull();

    const liveAfter = await liveTemplateSet(cloneId!);
    expect(liveAfter).toEqual([...v2.permission_names].sort());
    expect(liveAfter).not.toContain('send_announcements');

    // A future PULL copies the new set… (WA-6: the pull door, not the ride)
    const { data: postGroupId } = await fimClient.rpc('create_engagement_group', {
      p_name: `${TOKEN} post-apply group`,
    });
    createdGroupIds.push(postGroupId as string);
    const postPull = await fimClient.rpc('create_group_role', {
      p_group_id: postGroupId as string,
      p_name: cloneName,
      p_role_template_id: cloneId!,
    });
    expect(postPull.error).toBeNull();
    expect(await groupRoleSet(postGroupId as string, cloneName)).toEqual(liveAfter);
    // …and the pre-apply group's snapshot is untouched (RB-5 physics pinned).
    expect(await groupRoleSet(preGroupId as string, cloneName)).toEqual(preSet);

    const { data: audit } = await admin
      .from('admin_audit_log')
      .select('metadata')
      .eq('action', 'role_template.apply')
      .eq('target', cloneId!)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const meta = audit!.metadata as {
      from_version?: number;
      to_version?: number;
      removed?: string[];
    };
    expect(meta.from_version).toBe(1);
    expect(meta.to_version).toBe(2);
    expect(meta.removed).toContain('send_announcements');

    // Rollback = the same door pointed at version 1.
    const { error: rollbackErr } = await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: cloneId!,
      p_version_id: v1.id,
    });
    expect(rollbackErr).toBeNull();
    expect(await liveTemplateSet(cloneId!)).toEqual(v1Set);
  });

  it('S4b: a version belonging to another template refuses 22023; a seeded template never repoints', async () => {
    // Red at head by precondition: the clone + detail doors don't exist yet.
    expect(cloneId).toBeDefined();
    const { data: stewardDetail } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: stewardTemplateId,
    });
    expect(stewardDetail).not.toBeNull();
    const stewardV1 = (stewardDetail as DetailPayload).versions[0];

    const { error: crossErr } = await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: cloneId!,
      p_version_id: stewardV1.id,
    });
    expect(crossErr).not.toBeNull();
    expect(crossErr!.code).toBe('22023');

    const { error: seedErr } = await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: stewardTemplateId,
      p_version_id: stewardV1.id,
    });
    expect(seedErr).not.toBeNull();
    expect(seedErr!.code).toBe('P0001');
  });

  // -------------------------------------------------------------------------
  // STORY-5 — the protected-set guard (synthetic topology; unreachable in the
  // shipped all-seeds composition, so the cell builds its own)
  // -------------------------------------------------------------------------

  it('S5: stripping the last holder of a protected permission on an instantiation path refuses P0001 naming it', async () => {
    // Red at head by precondition: the clone door doesn't exist yet (S2a's PGRST202).
    expect(cloneId).toBeDefined();
    // Give the clone rest_group (protected) and make a synthetic group template
    // whose ONLY member is the clone — the clone becomes that path's last holder.
    const base = await liveTemplateSet(cloneId!);
    const withRest = base.includes('rest_group') ? base : [...base, 'rest_group'];
    await rpcAdmin('admin_create_role_template_version', {
      p_template_id: cloneId!,
      p_name: cloneName,
      p_description: 'v3 — rest_group held',
      p_permission_names: withRest,
    });
    const { data: d1 } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: cloneId!,
    });
    const v3 = (d1 as DetailPayload).versions.reduce((a, b) =>
      a.version_number > b.version_number ? a : b,
    );
    await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: cloneId!,
      p_version_id: v3.id,
    });

    const [gt] = (await runAdminSql(
      `INSERT INTO public.group_templates (name, description)
        VALUES ('${TOKEN} synthetic gt', 'guard fixture') RETURNING id;`,
    )) as Array<{ id: string }>;
    syntheticGtIds.push(gt.id);
    await runAdminSql(
      `INSERT INTO public.group_template_roles (group_template_id, role_template_id, is_default)
        VALUES ('${gt.id}', '${cloneId}', true);`,
    );

    // Draft v4 strips rest_group; applying it would leave the synthetic path bare.
    await rpcAdmin('admin_create_role_template_version', {
      p_template_id: cloneId!,
      p_name: cloneName,
      p_description: 'v4 — rest_group stripped',
      p_permission_names: withRest.filter((n) => n !== 'rest_group'),
    });
    const { data: d2 } = await rpcAdmin('admin_get_role_template_detail', {
      p_template_id: cloneId!,
    });
    const v4 = (d2 as DetailPayload).versions.reduce((a, b) =>
      a.version_number > b.version_number ? a : b,
    );

    const { error } = await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: cloneId!,
      p_version_id: v4.id,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('P0001');
    expect(error!.message).toContain('rest_group');

    // Removing the synthetic path unblocks the same apply — the guard was the refusal.
    await runAdminSql(`DELETE FROM public.group_templates WHERE id = '${gt.id}';`);
    const { error: after } = await rpcAdmin('admin_set_role_template_default_version', {
      p_template_id: cloneId!,
      p_version_id: v4.id,
    });
    expect(after).toBeNull();
  });

  // -------------------------------------------------------------------------
  // STORY-6 — the walk riders keep their families' laws
  // -------------------------------------------------------------------------

  it('S6a (WA-2): audit targets resolve — member ids to name + email, group ids to name, literals pass through', async () => {
    // A live member-target row: suspend + reactivate the plain FIM.
    const { data: fimUserRow } = await admin
      .from('users')
      .select('id, email')
      .eq('auth_user_id', fim.user.id)
      .single();
    await rpcAdmin('admin_update_user_status', {
      target_user_id: fimUserRow!.id,
      new_is_active: false,
    });
    await rpcAdmin('admin_update_user_status', {
      target_user_id: fimUserRow!.id,
      new_is_active: true,
    });
    // A group-target row (synthetic, service-role INSERT — the read resolves it).
    await runAdminSql(
      `INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
        VALUES ('${deusexGroupId}', 'gate.synthetic_group_target', '${fimGroupId}', '{}'::jsonb);`,
    );

    const { data, error } = await rpcAdmin('admin_get_audit_log', { p_limit: 50 });
    expect(error).toBeNull();
    const rows = data as AuditRow[];

    const memberRow = rows.find(
      (r) => r.action === 'member.suspend' && r.target === fimUserRow!.id,
    );
    expect(memberRow).toBeDefined();
    expect(memberRow!.target_display_name).toBe(`${TOKEN} Plain Fim`);
    expect(memberRow!.target_email).toBe(fimUserRow!.email);

    const groupRow = rows.find((r) => r.action === 'gate.synthetic_group_target');
    expect(groupRow).toBeDefined();
    expect(groupRow!.target_display_name).toBe(`${TOKEN} Plain Fim`); // personal group carries the display name
    expect(groupRow!.target).toBe(fimGroupId); // raw value stays in the row

    const literalRow = rows.find((r) => r.target === 'auth.sessions' || r.target === 'users');
    if (literalRow) {
      expect(literalRow.target_display_name).toBeNull();
      expect(literalRow.target_email).toBeNull();
    }
  });

  it('S6b (WA-2): the audit read takes the family gate message', async () => {
    const { error } = await fimClient.rpc('admin_get_audit_log', { p_limit: 1 });
    expect(error).not.toBeNull();
    expect(error!.message).toContain('platform administrator required');
  });

  it('S6c (WA-3): a consented member hard-deletes end-to-end; consent events survive anonymised', async () => {
    consented = await createTestUser({ displayName: `${TOKEN} Consented Member` });
    const consentedClient = createTestClient();
    await signInWithRetry(consentedClient, consented.email, consented.password);

    const { data: purposeRows } = await admin
      .from('consent_purposes')
      .select('key')
      .limit(1);
    const purpose = purposeRows![0].key;
    const { error: consentErr } = await consentedClient.rpc('record_consent_decision', {
      p_purpose: purpose,
      p_decision: 'granted',
    });
    expect(consentErr).toBeNull();

    const { data: target } = await admin
      .from('users')
      .select('id, personal_group_id')
      .eq('auth_user_id', consented.user.id)
      .single();
    const { data: consentRowsBefore } = await admin
      .from('consent_records')
      .select('id')
      .eq('subject_user_id', target!.id);
    expect(consentRowsBefore!.length).toBeGreaterThan(0);
    const consentIds = consentRowsBefore!.map((r) => r.id);

    // The cell the family never had: at head this refuses 23503-class (the FK).
    const { data: del, error: delErr } = await rpcAdmin('admin_hard_delete_user', {
      target_user_id: target!.id,
    });
    expect(delErr).toBeNull();
    expect((del as { success: boolean }).success).toBe(true);

    const { data: userAfter } = await admin
      .from('users')
      .select('id')
      .eq('id', target!.id)
      .maybeSingle();
    expect(userAfter).toBeNull();

    // Anonymise-then-retain (ADR-U034 §5): the events survive with NULL subjects.
    const { data: retained } = await admin
      .from('consent_records')
      .select('id, subject_user_id, subject_group_id')
      .in('id', consentIds);
    expect(retained!.length).toBe(consentIds.length);
    for (const r of retained!) {
      expect(r.subject_user_id).toBeNull();
      expect(r.subject_group_id).toBeNull();
    }
  });

  it('S6d (WA-4): force sign-out emits one session_revoked hint per live session; the sweep is unchanged', async () => {
    logoutTarget = await createTestUser({ displayName: `${TOKEN} Logout Target` });
    const target = logoutTarget;
    const c1 = createTestClient();
    await signInWithRetry(c1, target.email, target.password);
    const c2 = createTestClient();
    await signInWithRetry(c2, target.email, target.password);

    const sessions = (await runAdminSql(
      `SELECT id FROM auth.sessions WHERE user_id = '${target.user.id}';`,
    )) as Array<{ id: string }>;
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    const sessionIds = sessions.map((s) => s.id);

    const topic = `account:${target.user.id}:sessions`;
    const countHints = async () =>
      Number(
        (
          await runAdminSql(
            `SELECT count(*) AS n FROM realtime.messages WHERE topic = '${topic}' AND event = 'session_revoked';`,
          )
        )[0].n,
      );
    const before = await countHints();

    const { data: targetRow } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', target.user.id)
      .single();
    const { error } = await rpcAdmin('admin_force_logout', {
      target_user_ids: [targetRow!.id],
    });
    expect(error).toBeNull();

    // One hint per swept session id (red at head: the live body emits nothing).
    expect(await countHints()).toBe(before + sessionIds.length);
    const hintRows = (await runAdminSql(
      `SELECT payload FROM realtime.messages WHERE topic = '${topic}' AND event = 'session_revoked';`,
    )) as Array<{ payload: { payload?: { session_id?: string }; session_id?: string } }>;
    const carried = hintRows
      .map((r) => r.payload?.payload?.session_id ?? r.payload?.session_id)
      .filter(Boolean);
    for (const sid of sessionIds) {
      expect(carried).toContain(sid);
    }

    const remaining = (await runAdminSql(
      `SELECT count(*) AS n FROM auth.sessions WHERE user_id = '${target.user.id}';`,
    )) as Array<{ n: string }>;
    expect(Number(remaining[0].n)).toBe(0);
  });

  // -------------------------------------------------------------------------
  // STORY-7 — the direct door stays sealed
  // -------------------------------------------------------------------------

  it('S7a: the template substrate refuses authenticated direct writes — old tables and new', async () => {
    const { error: rtErr } = await fimClient
      .from('role_templates')
      .insert({ name: `${TOKEN} smuggled` });
    expect(rtErr).not.toBeNull();

    const { error: permErr } = await fimClient
      .from('permissions')
      .update({ is_protected: false })
      .eq('name', 'rest_group');
    // RLS: zero rows updatable — the write is refused or silently matches nothing.
    if (!permErr) {
      const [{ n }] = (await runAdminSql(
        `SELECT count(*) AS n FROM public.permissions WHERE name = 'rest_group' AND is_protected = false;`,
      )) as Array<{ n: string }>;
      expect(Number(n)).toBe(0);
    }

    const { error: verErr } = await fimClient
      .from('role_template_versions')
      .insert({ role_template_id: stewardTemplateId, version_number: 99, name: 'smuggled' });
    expect(verErr).not.toBeNull();
  });

  it('S7b: anon cannot execute any editor contract', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('admin_get_role_templates');
    expect(error).not.toBeNull();
  });
});
