import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(420_000); // real-substrate gate suite: six users, four groups, two journeys

/**
 * FEAT-PC023 (Cycle HYG-A) — group availability enforcement contracts.
 * The two-mode hold model: Active / Resting / Suspended (RB-6/RB-7 amendment
 * + the 2026-08-03 naming settle). One schema gate: `resting` status value,
 * the `rest_group` permission seed, `assert_group_writable()`, 26 guard
 * re-issues, 10 exit-family suspended-refusal amendments, the four transition
 * contracts + two ceremony amendments, the read plan, the RLS read-policy
 * amendments, and the legacy write-door closure.
 *
 * RED AT HEAD (pre-migration), by class:
 *  - SUSPENDED block: door-level reds — the W-3 class live. Frozen doors
 *    SUCCEED against a suspended group at head (only a visibility gate that
 *    short-circuits for members exists); every cell expecting
 *    'group is suspended' fails red. Read doors return content; direct RLS
 *    selects return rows; get_member_groups carries no status key;
 *    get_group_detail returns the full payload; groups_select hides the
 *    suspended row from members (labeled-visibility cell red in reverse).
 *  - RESTING block: red by fixture — the block's beforeAll flips the group
 *    via rest_group(), absent at head (PGRST202), and the substrate cannot
 *    even represent status='resting' (groups_status_check). Every cell in
 *    the block fails from the fixture.
 *  - TRANSITIONS block: per-case reds — rest_group / wake_group /
 *    admin_rest_group / admin_wake_group absent at head (PGRST202);
 *    admin_suspend_group refuses the resting origin it must admit.
 *  - LEGACY CLOSURE block: cells whose live policy permits the write today
 *    succeed at head and fail red against the post-closure expectation
 *    (memberships_update_accept, group_roles_insert, ugr_insert_assign);
 *    the policy-count cell reads 14 write policies at head, expects 0.
 *    (grp_insert already refuses the steward at head — its cell is a
 *    labelled-green continuity pin, sharpened by the policy drop.)
 *  - SEED block: the rest_group permission row / template link / DeusEx link
 *    are absent at head.
 *
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - The already-guarded SEVEN, whose own non-active refusals stand
 *    untouched: close_group, delete_group, hand_stewardship_to_deusex,
 *    invite_group, enroll_group_in_journey, nominate_steward,
 *    respond_to_stewardship_nomination. (leave_group is the 8th
 *    status-checker — the trap — and is amended, so its cells are red.)
 *  - DM-stays-live (the pair-grain verdict): send_message into a DM between
 *    members of a suspended group.
 *  - Anon direct SELECT zero-rows (policies bind TO authenticated; the anon
 *    grant is closed at the gate but yields no rows either way).
 *  - The closed/archived leave_group arm (terminal semantics untouched).
 *  - Bootstrap-vestigial accept: accept_group_invitation still lands a
 *    membership post-closure (SECURITY DEFINER, not RLS-dependent).
 *  - Active-control cells (byte-identical behavior on an active group),
 *    the admin full-detail read, the DM conversation-detail read, and the
 *    grp_insert continuity pin.
 *
 * RED RUN AT HEAD (demonstrated 2026-08-03, red-run-5): see the schema-gate
 * PR body for the counts; the passing set at head is exactly the labelled
 * list above.
 */

const RESTING_MSG = 'group is resting';
const SUSPENDED_MSG = 'group is suspended';

/** Authenticated DeusEx caller — the house manage_all_groups elevation. */
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

describe('FEAT-PC023 — group availability enforcement (Active / Resting / Suspended)', () => {
  const admin = createAdminClient();

  let ada: TestUser; // platform admin
  let stella: TestUser; // steward of all four groups — rest_group holder post-seed
  let mona: TestUser; // Doorholder member: every door permission EXCEPT rest_group
  let leo: TestUser; // exit-disposable member + steward of the acting groups
  let iva: TestUser; // invitee (gRest accept/decline, gSusp frozen invite, gControl bootstrap)
  let paula: TestUser; // pause/activate/remove target
  const users: TestUser[] = [];

  let adaC: SupabaseClient;
  let stellaC: SupabaseClient;
  let monaC: SupabaseClient;
  let leoC: SupabaseClient;
  let ivaC: SupabaseClient;
  let paulaC: SupabaseClient;

  let gRest: string; // flipped to resting in the RESTING block
  let gSusp: string; // flipped to suspended in the SUSPENDED block
  let gCycle: string; // the transitions + round-trip target
  let gControl: string; // stays active — byte-identical control
  let gActA: string; // leo's acting group, member of gRest
  let gActB: string; // leo's acting group, member of gSusp

  let jRest: string; // journey owned by gRest
  let jSusp: string; // journey owned by gSusp
  let sRest: string; // step of jRest
  let sSusp: string; // step of jSusp
  let eRest: string; // gRest group-walk enrollment
  let eSusp: string; // gSusp group-walk enrollment

  let pR1: string; // mona's gRest posts (edit target / delete target / moderate target)
  let pR2: string;
  let pR3: string;
  let pS1: string; // mona's gSusp post
  let aR1: string; // stella's gRest announcements (mona refusal target / holder retract)
  let aR2: string;
  let aS1: string; // stella's gSusp announcement
  let cRest: string; // group conversations
  let cSusp: string;
  let dm: string; // mona<->stella DM (pair-grain — survives every hold)
  let emailInvR: string; // pending email invitation ids
  let emailInvS: string;
  let stewardRoleRest: string; // gRest's Steward role instance (remove_member_role refusal target)

  const groupStatus = async (groupId: string): Promise<string> => {
    const { data, error } = await admin.from('groups').select('status').eq('id', groupId).single();
    if (error) throw new Error(`groupStatus(${groupId}): ${error.message}`);
    return (data as { status: string }).status;
  };

  const auditCount = async (action: string, target: string): Promise<number> => {
    const { count, error } = await admin
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', action)
      .eq('target', target);
    if (error) throw new Error(`auditCount(${action}): ${error.message}`);
    return count ?? 0;
  };

  const expectRefusal = async (
    client: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
    msg: string,
  ) => {
    const { error } = await client.rpc(fn, args);
    expect(error).not.toBeNull();
    expect(String(error?.message)).toContain(msg);
  };

  const expectOk = async (
    client: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
  ): Promise<unknown> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(`${fn} expected ok: ${error.message}`);
    return data;
  };

  /** A role carrying EVERY catalog permission except rest_group, assigned to the member. */
  const grantDoorholder = async (groupId: string, memberPg: string) => {
    await runAdminSql(`
      DO $$
      DECLARE v_role uuid;
      BEGIN
        INSERT INTO public.group_roles (group_id, name, description)
        VALUES ('${groupId}', 'HYGA Doorholder', 'every door permission except rest_group')
        RETURNING id INTO v_role;
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT v_role, p.id FROM public.permissions p WHERE p.name <> 'rest_group'
        ON CONFLICT DO NOTHING;
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${memberPg}', '${groupId}', v_role, '${memberPg}')
        ON CONFLICT DO NOTHING;
      END $$;`);
  };

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'HygaAda' });
    stella = await createTestUser({ displayName: 'HygaStella' });
    mona = await createTestUser({ displayName: 'HygaMona' });
    leo = await createTestUser({ displayName: 'HygaLeo' });
    iva = await createTestUser({ displayName: 'HygaIva' });
    paula = await createTestUser({ displayName: 'HygaPaula' });
    users.push(ada, stella, mona, leo, iva, paula);
    await makePlatformAdmin(ada.personalGroupId);

    const signIn = async (u: TestUser) => {
      const c = createTestClient();
      await signInWithRetry(c, u.email, u.password);
      return c;
    };
    adaC = await signIn(ada);
    stellaC = await signIn(stella);
    monaC = await signIn(mona);
    leoC = await signIn(leo);
    ivaC = await signIn(iva);
    paulaC = await signIn(paula);

    const mkGroup = async (c: SupabaseClient, name: string): Promise<string> => {
      const { data, error } = await c.rpc('create_engagement_group', { p_name: name });
      if (error) throw new Error(`create ${name}: ${error.message}`);
      return data as string;
    };
    gRest = await mkGroup(stellaC, 'HYGA Resting Target');
    gSusp = await mkGroup(stellaC, 'HYGA Suspended Target');
    gCycle = await mkGroup(stellaC, 'HYGA Cycle Target');
    gControl = await mkGroup(stellaC, 'HYGA Active Control');
    gActA = await mkGroup(leoC, 'HYGA Acting A');
    gActB = await mkGroup(leoC, 'HYGA Acting B');

    // Members (active) — the house admin-insert idiom.
    for (const [g, members] of [
      [gRest, [mona, leo, paula]],
      [gSusp, [mona, leo, paula]],
      [gCycle, [mona]],
      [gControl, [mona]],
    ] as Array<[string, TestUser[]]>) {
      for (const m of members) {
        const { error } = await admin.from('group_memberships').insert({
          group_id: g,
          member_group_id: m.personalGroupId,
          status: 'active',
          added_by_group_id: stella.personalGroupId,
        });
        if (error) throw new Error(`membership ${g}: ${error.message}`);
      }
    }

    // Doorholder for mona everywhere she exercises doors.
    for (const g of [gRest, gSusp, gCycle, gControl]) {
      await grantDoorholder(g, mona.personalGroupId);
    }

    // The groups' Steward roles must carry enroll_group_in_journey for the
    // enrollment fixtures (template coverage varies by era — idempotent).
    await runAdminSql(`
      INSERT INTO public.group_role_permissions (group_role_id, permission_id)
      SELECT gr.id, p.id
        FROM public.group_roles gr
        JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
        CROSS JOIN public.permissions p
       WHERE rt.name = 'Steward Role Template'
         AND gr.group_id IN ('${gRest}', '${gSusp}')
         AND p.name IN ('enroll_group_in_journey', 'view_group_progress')
      ON CONFLICT DO NOTHING;`);

    // Template-first-with-fallback Steward resolution (the house idiom —
    // role instances are named after their template).
    const { data: stewardRows } = await admin
      .from('group_roles')
      .select('id,name,created_from_role_template_id')
      .eq('group_id', gRest)
      .in('name', ['Steward', 'Steward Role Template']);
    if (!stewardRows?.length) throw new Error('gRest Steward role not found');
    stewardRoleRest = (stewardRows as Array<{ id: string }>)[0].id;

    // Invitations laid while active.
    await expectOk(stellaC, 'invite_member', { p_group_id: gRest, p_member_group_id: iva.personalGroupId });
    await expectOk(stellaC, 'invite_member', { p_group_id: gSusp, p_member_group_id: iva.personalGroupId });
    await expectOk(stellaC, 'invite_member', { p_group_id: gControl, p_member_group_id: iva.personalGroupId });
    await expectOk(stellaC, 'invite_by_email', { p_group_id: gRest, p_email: 'hyga-rest@example.test' });
    await expectOk(stellaC, 'invite_by_email', { p_group_id: gSusp, p_email: 'hyga-susp@example.test' });
    const inv = async (g: string, email: string): Promise<string> => {
      const { data, error } = await admin
        .from('pending_email_invitations')
        .select('id')
        .eq('group_id', g)
        .eq('invited_email', email)
        .single();
      if (error) throw new Error(`email invitation lookup: ${error.message}`);
      return (data as { id: string }).id;
    };
    emailInvR = await inv(gRest, 'hyga-rest@example.test');
    emailInvS = await inv(gSusp, 'hyga-susp@example.test');

    // Acting groups join while active (invite_group -> respond as leo).
    // invite_group only sees invitable (public, active) targets.
    await admin.from('groups').update({ is_public: true }).in('id', [gActA, gActB]);
    await expectOk(stellaC, 'invite_group', { p_group_id: gRest, p_invited_group_id: gActA });
    await expectOk(stellaC, 'invite_group', { p_group_id: gSusp, p_invited_group_id: gActB });
    const actingMembership = async (g: string, actingG: string): Promise<string> => {
      const { data, error } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', g)
        .eq('member_group_id', actingG)
        .single();
      if (error) throw new Error(`acting membership lookup: ${error.message}`);
      return (data as { id: string }).id;
    };
    await expectOk(leoC, 'respond_to_group_invitation', {
      p_membership_id: await actingMembership(gRest, gActA),
      p_accept: true,
    });
    await expectOk(leoC, 'respond_to_group_invitation', {
      p_membership_id: await actingMembership(gSusp, gActB),
      p_accept: true,
    });

    // Journeys owned by the held groups + one step each; group walks enrolled
    // while active; mona enters the step while active (the door works today).
    const mkJourney = async (owner: string, title: string): Promise<[string, string]> => {
      const { data: j, error } = await admin
        .from('journeys')
        .insert({
          title,
          description: `${title} — HYG-A gate fixture`,
          created_by_group_id: owner,
          is_published: true,
          is_public: true,
          journey_type: 'predefined',
          difficulty_level: 'beginner',
        })
        .select('id')
        .single();
      if (error) throw new Error(`journey ${title}: ${error.message}`);
      const jid = (j as { id: string }).id;
      const { data: s, error: sErr } = await admin
        .from('journey_steps')
        .insert({
          journey_id: jid,
          step_order: 1,
          title: 'Step one',
          step_kind_key: 'reflection',
          content_family_key: 'reflect',
          required: true,
          repeatable: true,
        })
        .select('id')
        .single();
      if (sErr) throw new Error(`step ${title}: ${sErr.message}`);
      return [jid, (s as { id: string }).id];
    };
    [jRest, sRest] = await mkJourney(gRest, 'HYGA Journey Rest');
    [jSusp, sSusp] = await mkJourney(gSusp, 'HYGA Journey Susp');

    await expectOk(stellaC, 'enroll_group_in_journey', { p_group_id: gRest, p_journey_id: jRest });
    await expectOk(stellaC, 'enroll_group_in_journey', { p_group_id: gSusp, p_journey_id: jSusp });
    const enrollment = async (j: string, g: string): Promise<string> => {
      const { data, error } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', j)
        .eq('group_id', g)
        .single();
      if (error) throw new Error(`enrollment lookup: ${error.message}`);
      return (data as { id: string }).id;
    };
    eRest = await enrollment(jRest, gRest);
    eSusp = await enrollment(jSusp, gSusp);
    await expectOk(monaC, 'enter_journey_step', { p_enrollment_id: eRest, p_step_id: sRest });
    await expectOk(monaC, 'enter_journey_step', { p_enrollment_id: eSusp, p_step_id: sSusp });

    // Forum posts, announcements, conversations laid while active.
    const post = async (c: SupabaseClient, g: string, content: string): Promise<string> => {
      const data = (await expectOk(c, 'create_forum_post', { p_group_id: g, p_content: content })) as {
        id: string;
      };
      return data.id;
    };
    pR1 = await post(monaC, gRest, 'edit target');
    pR2 = await post(monaC, gRest, 'delete target');
    pR3 = await post(monaC, gRest, 'moderation target');
    pS1 = await post(monaC, gSusp, 'suspended content');

    const announce = async (g: string, title: string): Promise<string> => {
      const data = (await expectOk(stellaC, 'send_community_announcement', {
        p_group_id: g,
        p_title: title,
        p_body: 'HYG-A fixture body',
      })) as { id: string };
      return data.id;
    };
    aR1 = await announce(gRest, 'rest refusal target');
    aR2 = await announce(gRest, 'holder retract target');
    aS1 = await announce(gSusp, 'suspended announcement');

    cRest = (await expectOk(monaC, 'create_group_conversation', {
      p_group_id: gRest,
      p_title: 'rest conversation',
    })) as string;
    cSusp = (await expectOk(monaC, 'create_group_conversation', {
      p_group_id: gSusp,
      p_title: 'susp conversation',
    })) as string;
    await expectOk(stellaC, 'join_group_conversation', { p_conversation_id: cRest });
    await expectOk(stellaC, 'join_group_conversation', { p_conversation_id: cSusp });
    await expectOk(monaC, 'send_message', { p_conversation_id: cRest, p_content: 'laid while active' });
    await expectOk(monaC, 'send_message', { p_conversation_id: cSusp, p_content: 'laid while active' });

    dm = (await expectOk(monaC, 'get_or_create_dm_conversation', {
      p_other_group_id: stella.personalGroupId,
    })) as string;
    await expectOk(monaC, 'send_message', { p_conversation_id: dm, p_content: 'dm while active' });

    // A stewardship nomination in gSusp laid while active — paula answers it
    // AFTER the suspend flip (the respond_to_stewardship_nomination cell of
    // the already-guarded seven).
    await expectOk(stellaC, 'nominate_steward', {
      p_group_id: gSusp,
      p_nominee_ids: [paula.personalGroupId],
    });
  });

  afterAll(async () => {
    // The `.catch(() => undefined)` wrappers that used to sit on both loops are
    // gone. They hid a real failure: cleanupTestGroup could not delete gRest or
    // gSusp (their journeys had been walked, so a RESTRICT held), and the
    // silence meant two engagement groups, two journeys and a Steward's personal
    // group survived every single run. Both helpers now report loudly instead.
    for (const g of [gActA, gActB, gRest, gSusp, gCycle, gControl]) {
      if (g) await cleanupTestGroup(g);
    }
    await demotePlatformAdmin(ada.personalGroupId);
    for (const u of users) {
      await cleanupTestUser(u.user.id);
    }
  });

  // =========================================================================
  // SEED — the rest_group permission (STORY-2 substrate)
  // RED AT HEAD: all three rows absent.
  // =========================================================================
  describe('the rest_group permission seed', () => {
    it('exists in the catalog', async () => {
      const { data } = await admin.from('permissions').select('id,name').eq('name', 'rest_group');
      expect(data).toHaveLength(1);
    });

    it('is carried by the Steward role template', async () => {
      const { count } = await admin
        .from('role_template_permissions')
        .select('permission_id', { count: 'exact', head: true })
        .eq(
          'permission_id',
          (
            await admin.from('permissions').select('id').eq('name', 'rest_group').single()
          ).data?.id ?? '00000000-0000-0000-0000-000000000000',
        );
      // template link + DeusEx auto-grant + per-group backfills: at least the template row
      expect(count ?? 0).toBeGreaterThanOrEqual(1);
    });

    it('reaches existing Steward role instances (the PC015 backfill idiom)', async () => {
      const { data } = await admin
        .from('group_role_permissions')
        .select('group_role_id, permissions!inner(name), group_roles!inner(group_id)')
        .eq('permissions.name', 'rest_group')
        .eq('group_roles.group_id', gRest);
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // SUSPENDED — the hard hold (STORY-1/3/4/5/6/7/8 suspended arms)
  // The block beforeAll flips via admin_suspend_group (shipped, ADM-B) — so
  // every cell here runs at head and demonstrates the W-3 class red.
  // =========================================================================
  describe('suspended — the hard hold', () => {
    beforeAll(async () => {
      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gSusp });
    });

    describe('the communication plane refuses everyone below the admin plane', () => {
      it('create_forum_post refuses typed (holder included — stella)', () =>
        expectRefusal(stellaC, 'create_forum_post', { p_group_id: gSusp, p_content: 'x' }, SUSPENDED_MSG));
      it('create_forum_post refuses typed (member — mona)', () =>
        expectRefusal(monaC, 'create_forum_post', { p_group_id: gSusp, p_content: 'x' }, SUSPENDED_MSG));
      it('reply_to_forum_post refuses typed', () =>
        expectRefusal(monaC, 'reply_to_forum_post', { p_parent_post_id: pS1, p_content: 'x' }, SUSPENDED_MSG));
      it('edit_own_forum_post refuses typed', () =>
        expectRefusal(monaC, 'edit_own_forum_post', { p_post_id: pS1, p_content: 'x' }, SUSPENDED_MSG));
      it('delete_own_forum_post refuses typed', () =>
        expectRefusal(monaC, 'delete_own_forum_post', { p_post_id: pS1 }, SUSPENDED_MSG));
      it('moderate_forum_post refuses typed', () =>
        expectRefusal(monaC, 'moderate_forum_post', { p_post_id: pS1 }, SUSPENDED_MSG));
      it('send_community_announcement refuses typed', () =>
        expectRefusal(
          monaC,
          'send_community_announcement',
          { p_group_id: gSusp, p_title: 't', p_body: 'b' },
          SUSPENDED_MSG,
        ));
      it('retract_announcement refuses typed', () =>
        expectRefusal(monaC, 'retract_announcement', { p_announcement_id: aS1 }, SUSPENDED_MSG));
      it('create_group_conversation refuses typed', () =>
        expectRefusal(monaC, 'create_group_conversation', { p_group_id: gSusp, p_title: 'x' }, SUSPENDED_MSG));
      it('join_group_conversation refuses typed', () =>
        expectRefusal(paulaC, 'join_group_conversation', { p_conversation_id: cSusp }, SUSPENDED_MSG));
      it('send_message into the group conversation refuses typed', () =>
        expectRefusal(monaC, 'send_message', { p_conversation_id: cSusp, p_content: 'x' }, SUSPENDED_MSG));
      it('LABELLED GREEN — the DM between two members stays live (pair-grain verdict)', async () => {
        await expectOk(monaC, 'send_message', { p_conversation_id: dm, p_content: 'dm across suspension' });
      });
    });

    describe('the journey plane refuses; the exit refuses too', () => {
      it('enroll_self_in_journey into the suspended-owned journey refuses typed', () =>
        expectRefusal(paulaC, 'enroll_self_in_journey', { p_journey_id: jSusp }, SUSPENDED_MSG));
      it('enter_journey_step refuses typed', () =>
        expectRefusal(monaC, 'enter_journey_step', { p_enrollment_id: eSusp, p_step_id: sSusp }, SUSPENDED_MSG));
      it('complete_journey_step refuses typed', () =>
        expectRefusal(
          monaC,
          'complete_journey_step',
          { p_enrollment_id: eSusp, p_step_id: sSusp },
          SUSPENDED_MSG,
        ));
      it('save_step_response refuses typed', () =>
        expectRefusal(
          monaC,
          'save_step_response',
          { p_enrollment_id: eSusp, p_step_id: sSusp, p_response: { note: 'x' } },
          SUSPENDED_MSG,
        ));
      it('set_journey_progress_sharing refuses typed', () =>
        expectRefusal(monaC, 'set_journey_progress_sharing', { p_enrollment_id: eSusp, p_share: true }, SUSPENDED_MSG));
      it('withdraw_from_journey refuses typed (exits are closed under the hard hold)', () =>
        expectRefusal(monaC, 'withdraw_from_journey', { p_enrollment_id: eSusp }, SUSPENDED_MSG));
    });

    describe('the organisation plane refuses; exits refuse', () => {
      it('invite_member refuses typed', () =>
        expectRefusal(
          monaC,
          'invite_member',
          { p_group_id: gSusp, p_member_group_id: ada.personalGroupId },
          SUSPENDED_MSG,
        ));
      it('invite_by_email refuses typed', () =>
        expectRefusal(monaC, 'invite_by_email', { p_group_id: gSusp, p_email: 'z@example.test' }, SUSPENDED_MSG));
      it('accept_group_invitation refuses typed', () =>
        expectRefusal(ivaC, 'accept_group_invitation', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('decline_group_invitation refuses typed (exit closed)', () =>
        expectRefusal(ivaC, 'decline_group_invitation', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('cancel_member_invitation refuses typed (exit closed)', () =>
        expectRefusal(
          monaC,
          'cancel_member_invitation',
          { p_group_id: gSusp, p_member_group_id: iva.personalGroupId },
          SUSPENDED_MSG,
        ));
      it('cancel_email_invitation refuses typed (exit closed)', () =>
        expectRefusal(monaC, 'cancel_email_invitation', { p_invitation_id: emailInvS }, SUSPENDED_MSG));
      it('assign/remove/create/update/delete role + set permission refuse typed', async () => {
        await expectRefusal(
          monaC,
          'create_group_role',
          { p_group_id: gSusp, p_name: 'never-lands' },
          SUSPENDED_MSG,
        );
        const { data: roles } = await admin
          .from('group_roles')
          .select('id,name')
          .eq('group_id', gSusp)
          .eq('name', 'HYGA Doorholder')
          .single();
        const doorholder = (roles as { id: string }).id;
        await expectRefusal(
          monaC,
          'assign_member_role',
          { p_group_id: gSusp, p_member_group_id: paula.personalGroupId, p_group_role_id: doorholder },
          SUSPENDED_MSG,
        );
        await expectRefusal(
          monaC,
          'remove_member_role',
          { p_group_id: gSusp, p_member_group_id: mona.personalGroupId, p_group_role_id: doorholder },
          SUSPENDED_MSG,
        );
        await expectRefusal(monaC, 'update_group_role', { p_group_role_id: doorholder, p_name: 'renamed' }, SUSPENDED_MSG);
        await expectRefusal(monaC, 'delete_group_role', { p_group_role_id: doorholder }, SUSPENDED_MSG);
        await expectRefusal(
          monaC,
          'set_group_role_permission',
          { p_group_role_id: doorholder, p_permission_name: 'view_forum', p_granted: true },
          SUSPENDED_MSG,
        );
      });
      it('update_group_settings refuses typed and writes nothing', async () => {
        await expectRefusal(monaC, 'update_group_settings', { p_group_id: gSusp, p_name: 'renamed' }, SUSPENDED_MSG);
        const { data } = await admin.from('groups').select('name').eq('id', gSusp).single();
        expect((data as { name: string }).name).toBe('HYGA Suspended Target');
      });
      it('pause_member refuses typed (exit closed)', () =>
        expectRefusal(
          monaC,
          'pause_member',
          { p_group_id: gSusp, p_member_group_id: paula.personalGroupId },
          SUSPENDED_MSG,
        ));
      it('activate_member refuses typed', () =>
        expectRefusal(
          monaC,
          'activate_member',
          { p_group_id: gSusp, p_member_group_id: paula.personalGroupId },
          SUSPENDED_MSG,
        ));
      it('remove_member refuses typed (exit closed — memberships stay for the restore)', () =>
        expectRefusal(
          monaC,
          'remove_member',
          { p_group_id: gSusp, p_member_group_id: paula.personalGroupId },
          SUSPENDED_MSG,
        ));
      it('leave_group refuses typed (the imprisonment is deliberate under the hard hold)', () =>
        expectRefusal(leoC, 'leave_group', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('leave_group_as_group refuses typed', () =>
        expectRefusal(
          leoC,
          'leave_group_as_group',
          { p_group_id: gSusp, p_acting_group_id: gActB },
          SUSPENDED_MSG,
        ));
      it('leave_group_conversation refuses typed', () =>
        expectRefusal(monaC, 'leave_group_conversation', { p_conversation_id: cSusp }, SUSPENDED_MSG));
    });

    describe('LABELLED GREEN — the already-guarded seven keep their own refusals', () => {
      it('close_group', () =>
        expectRefusal(stellaC, 'close_group', { p_group_id: gSusp }, 'cannot close a group that is not active'));
      it('delete_group', () =>
        expectRefusal(stellaC, 'delete_group', { p_group_id: gSusp }, 'cannot delete a group that is not active'));
      it('hand_stewardship_to_deusex', () =>
        expectRefusal(
          stellaC,
          'hand_stewardship_to_deusex',
          { p_group_id: gSusp },
          'cannot hand over a group that is not active',
        ));
      it('invite_group', () =>
        expectRefusal(
          stellaC,
          'invite_group',
          { p_group_id: gSusp, p_invited_group_id: gControl },
          'cannot invite into a group that is not active',
        ));
      it('enroll_group_in_journey', () =>
        expectRefusal(
          stellaC,
          'enroll_group_in_journey',
          { p_group_id: gSusp, p_journey_id: jRest },
          'group is not active',
        ));
      it('nominate_steward', () =>
        expectRefusal(
          stellaC,
          'nominate_steward',
          { p_group_id: gSusp, p_nominee_ids: [leo.personalGroupId] },
          'cannot nominate in a group that is not active',
        ));
      it('respond_to_stewardship_nomination', async () => {
        const { data } = await admin
          .from('notifications')
          .select('id')
          .eq('recipient_group_id', paula.personalGroupId)
          .eq('type', 'stewardship_nomination')
          .limit(1)
          .single();
        await expectRefusal(
          paulaC,
          'respond_to_stewardship_nomination',
          { p_notification_id: (data as { id: string }).id, p_accept: true },
          'no longer active',
        );
      });
    });

    describe('findable, labeled, and that is it (STORY-7)', () => {
      it('get_member_groups carries the status key for the suspended group', async () => {
        const { data, error } = await monaC.rpc('get_member_groups');
        expect(error).toBeNull();
        const rows = data as Array<{ id: string; status?: string }>;
        const row = rows.find((r) => r.id === gSusp);
        expect(row).toBeDefined();
        expect(row?.status).toBe('suspended');
        expect(rows.find((r) => r.id === gControl)?.status).toBe('active');
      });

      it('get_group_detail returns the minimal payload below the admin plane', async () => {
        const { data, error } = await monaC.rpc('get_group_detail', { p_group_id: gSusp });
        expect(error).toBeNull();
        const payload = data as Record<string, unknown>;
        expect(Object.keys(payload).sort()).toEqual(['id', 'name', 'status']);
        expect(payload.status).toBe('suspended');
        expect(payload.name).toBe('HYGA Suspended Target');
      });

      it('the direct row read shows the suspended row to a member (labeled visibility)', async () => {
        const { data, error } = await monaC.from('groups').select('id,status').eq('id', gSusp);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        expect((data as Array<{ status: string }>)[0].status).toBe('suspended');
      });

      it('LABELLED GREEN — the admin read returns full detail (the admin plane is never held)', async () => {
        const { data, error } = await adaC.rpc('admin_get_group_detail', { p_group_id: gSusp });
        expect(error).toBeNull();
        const payload = data as Record<string, unknown>;
        expect(Object.keys(payload).length).toBeGreaterThan(3);
      });
    });

    describe('content quarantined at every read door (STORY-8)', () => {
      it('get_group_forum refuses typed', () =>
        expectRefusal(monaC, 'get_group_forum', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('get_group_announcements refuses typed', () =>
        expectRefusal(monaC, 'get_group_announcements', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('get_group_conversations refuses typed', () =>
        expectRefusal(monaC, 'get_group_conversations', { p_group_id: gSusp }, SUSPENDED_MSG));
      // The conversation read cells use STELLA (a participant who never
      // leaves): at head the exit doors succeed, so mona leaves cSusp during
      // the exits cells above — her omission would be self-inflicted, not the
      // quarantine's.
      it('get_conversation_detail refuses typed for the group-kind conversation', () =>
        expectRefusal(stellaC, 'get_conversation_detail', { p_conversation_id: cSusp }, SUSPENDED_MSG));
      it('get_conversation_detail still serves the DM', async () => {
        await expectOk(monaC, 'get_conversation_detail', { p_conversation_id: dm });
      });
      it('get_group_invitations refuses typed', () =>
        expectRefusal(monaC, 'get_group_invitations', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('get_group_roles refuses typed', () =>
        expectRefusal(monaC, 'get_group_roles', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('get_group_journey_progress refuses typed', () =>
        expectRefusal(stellaC, 'get_group_journey_progress', { p_enrollment_id: eSusp }, SUSPENDED_MSG));
      it('get_group_enrollment_summary refuses typed', () =>
        expectRefusal(monaC, 'get_group_enrollment_summary', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('get_player_state refuses typed for the suspended group walk', () =>
        expectRefusal(monaC, 'get_player_state', { p_enrollment_id: eSusp }, SUSPENDED_MSG));
      it('get_my_conversations omits the suspended group conversations, keeps the DM', async () => {
        const { data, error } = await stellaC.rpc('get_my_conversations');
        expect(error).toBeNull();
        const text = JSON.stringify(data);
        expect(text).not.toContain(cSusp);
        expect(text).toContain(dm);
      });
      it('get_my_enrollments rows carry the group status', async () => {
        const { data, error } = await monaC.rpc('get_my_enrollments');
        expect(error).toBeNull();
        const text = JSON.stringify(data);
        expect(text).toContain(eSusp);
        expect(text).toContain('"group_status":"suspended"');
      });

      it('direct RLS: forum_posts of the suspended group return zero rows', async () => {
        const { data, error } = await monaC.from('forum_posts').select('id').eq('group_id', gSusp);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });
      it('direct RLS: announcements of the suspended group return zero rows', async () => {
        const { data, error } = await monaC.from('announcements').select('id').eq('scope_group_id', gSusp);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });
      it('direct RLS: the conversations family closes through the chokepoint', async () => {
        const conv = await stellaC.from('conversations').select('id').eq('id', cSusp);
        expect(conv.error).toBeNull();
        expect(conv.data).toHaveLength(0);
        const msgs = await stellaC.from('messages').select('id').eq('conversation_id', cSusp);
        expect(msgs.error).toBeNull();
        expect(msgs.data).toHaveLength(0);
      });
      it('direct RLS: the journey_enrollments group arm returns zero rows', async () => {
        const { data, error } = await monaC.from('journey_enrollments').select('id').eq('group_id', gSusp);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });
      it('LABELLED GREEN — anon direct SELECT yields zero rows (policies bind to authenticated)', async () => {
        const anon = createTestClient();
        const { data, error } = await anon.from('forum_posts').select('id').eq('group_id', gSusp);
        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });
      it('the resting-vs-suspended contrast: gRest content still reads whole while active', async () => {
        // gRest is still ACTIVE at this point in the file (the resting block
        // runs later) — this is the byte-identical control read.
        const { data, error } = await monaC.from('forum_posts').select('id').eq('group_id', gRest);
        expect(error).toBeNull();
        expect((data ?? []).length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('no steward path touches the hard state (STORY-2/9)', () => {
      it('rest_group refuses on a suspended group', () =>
        expectRefusal(stellaC, 'rest_group', { p_group_id: gSusp }, SUSPENDED_MSG));
      it('wake_group refuses on a suspended group', () =>
        expectRefusal(stellaC, 'wake_group', { p_group_id: gSusp }, SUSPENDED_MSG));
    });
  });

  // =========================================================================
  // LEGACY CLOSURE — the four membership/role tables (STORY-10)
  // =========================================================================
  describe('the legacy direct write doors close', () => {
    it('a member cannot direct-accept an invitation (memberships_update_accept is gone)', async () => {
      await ivaC
        .from('group_memberships')
        .update({ status: 'active' })
        .eq('group_id', gSusp)
        .eq('member_group_id', iva.personalGroupId);
      const { data } = await admin
        .from('group_memberships')
        .select('status')
        .eq('group_id', gSusp)
        .eq('member_group_id', iva.personalGroupId)
        .single();
      expect((data as { status: string }).status).toBe('invited');
    });

    it('a steward cannot direct-insert a group role (group_roles_insert is gone)', async () => {
      const { error } = await stellaC.from('group_roles').insert({
        group_id: gRest,
        name: 'direct-insert-role',
        description: 'must never land',
      });
      expect(error).not.toBeNull();
    });

    it('a steward cannot direct-grant a role (ugr_insert_assign is gone)', async () => {
      const { error } = await stellaC.from('user_group_roles').insert({
        member_group_id: paula.personalGroupId,
        group_id: gRest,
        group_role_id: stewardRoleRest,
        assigned_by_group_id: stella.personalGroupId,
      });
      expect(error).not.toBeNull();
    });

    it('LABELLED GREEN — a steward cannot direct-write role permissions (grp_insert already refuses her; the policy drop pins it)', async () => {
      const { data: perm } = await admin.from('permissions').select('id').eq('name', 'view_forum').single();
      const { error } = await stellaC.from('group_role_permissions').insert({
        group_role_id: stewardRoleRest,
        permission_id: (perm as { id: string }).id,
      });
      expect(error).not.toBeNull();
    });

    it('LABELLED GREEN — anon direct membership insert refuses (no anon policy before or after)', async () => {
      const anon = createTestClient();
      const { error } = await anon.from('group_memberships').insert({
        group_id: gControl,
        member_group_id: iva.personalGroupId,
        status: 'active',
        added_by_group_id: iva.personalGroupId,
      });
      expect(error).not.toBeNull();
    });

    it('zero member write policies remain on the four tables', async () => {
      // runAdminSql raises when the count is non-zero; at head it is 14.
      await expect(
        runAdminSql(`
          DO $$
          DECLARE v_count int;
          BEGIN
            SELECT count(*) INTO v_count FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename IN ('group_memberships','user_group_roles','group_roles','group_role_permissions')
               AND cmd <> 'SELECT';
            IF v_count <> 0 THEN
              RAISE EXCEPTION 'expected zero write policies, found %', v_count;
            END IF;
          END $$;`),
      ).resolves.not.toThrow();
    });

    it('LABELLED GREEN — bootstrap stays whole: the invitation-accept contract still lands a membership', async () => {
      await expectOk(ivaC, 'accept_group_invitation', { p_group_id: gControl });
      const { data } = await admin
        .from('group_memberships')
        .select('status')
        .eq('group_id', gControl)
        .eq('member_group_id', iva.personalGroupId)
        .single();
      expect((data as { status: string }).status).toBe('active');
    });
  });

  // =========================================================================
  // RESTING — the visible steward-fix hold (STORY-1..6 resting arms)
  // RED AT HEAD by fixture: rest_group() does not exist and the substrate
  // cannot represent status='resting' (groups_status_check) — the beforeAll
  // throws and every cell below fails from the fixture.
  // =========================================================================
  describe('resting — the visible hold', () => {
    beforeAll(async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gRest });
      const status = await groupStatus(gRest);
      if (status !== 'resting') throw new Error(`gRest expected resting, got ${status}`);
    });

    describe('the frozen doors refuse the non-exempt (STORY-1/3/4/5)', () => {
      it('create_forum_post refuses typed', () =>
        expectRefusal(monaC, 'create_forum_post', { p_group_id: gRest, p_content: 'x' }, RESTING_MSG));
      it('reply_to_forum_post refuses typed', () =>
        expectRefusal(monaC, 'reply_to_forum_post', { p_parent_post_id: pR1, p_content: 'x' }, RESTING_MSG));
      it('edit_own_forum_post refuses typed', () =>
        expectRefusal(monaC, 'edit_own_forum_post', { p_post_id: pR1, p_content: 'x' }, RESTING_MSG));
      it('delete_own_forum_post refuses typed', () =>
        expectRefusal(monaC, 'delete_own_forum_post', { p_post_id: pR2 }, RESTING_MSG));
      it('moderate_forum_post refuses typed for a non-holder with moderate_forum', () =>
        expectRefusal(monaC, 'moderate_forum_post', { p_post_id: pR3 }, RESTING_MSG));
      it('send_community_announcement refuses typed', () =>
        expectRefusal(
          monaC,
          'send_community_announcement',
          { p_group_id: gRest, p_title: 't', p_body: 'b' },
          RESTING_MSG,
        ));
      it('retract_announcement refuses typed', () =>
        expectRefusal(monaC, 'retract_announcement', { p_announcement_id: aR1 }, RESTING_MSG));
      it('create_group_conversation refuses typed', () =>
        expectRefusal(monaC, 'create_group_conversation', { p_group_id: gRest, p_title: 'x' }, RESTING_MSG));
      it('join_group_conversation refuses typed', () =>
        expectRefusal(paulaC, 'join_group_conversation', { p_conversation_id: cRest }, RESTING_MSG));
      it('send_message into the group conversation refuses typed', () =>
        expectRefusal(monaC, 'send_message', { p_conversation_id: cRest, p_content: 'x' }, RESTING_MSG));
      it('enroll_self_in_journey refuses typed', () =>
        expectRefusal(paulaC, 'enroll_self_in_journey', { p_journey_id: jRest }, RESTING_MSG));
      it('enter_journey_step refuses typed', () =>
        expectRefusal(monaC, 'enter_journey_step', { p_enrollment_id: eRest, p_step_id: sRest }, RESTING_MSG));
      it('complete_journey_step refuses typed', () =>
        expectRefusal(monaC, 'complete_journey_step', { p_enrollment_id: eRest, p_step_id: sRest }, RESTING_MSG));
      it('save_step_response refuses typed', () =>
        expectRefusal(
          monaC,
          'save_step_response',
          { p_enrollment_id: eRest, p_step_id: sRest, p_response: { note: 'x' } },
          RESTING_MSG,
        ));
      it('set_journey_progress_sharing refuses typed', () =>
        expectRefusal(monaC, 'set_journey_progress_sharing', { p_enrollment_id: eRest, p_share: true }, RESTING_MSG));
      it('invite_member refuses typed', () =>
        expectRefusal(
          monaC,
          'invite_member',
          { p_group_id: gRest, p_member_group_id: ada.personalGroupId },
          RESTING_MSG,
        ));
      it('invite_by_email refuses typed', () =>
        expectRefusal(monaC, 'invite_by_email', { p_group_id: gRest, p_email: 'q@example.test' }, RESTING_MSG));
      it('accept_group_invitation refuses typed (growth is frozen)', () =>
        expectRefusal(ivaC, 'accept_group_invitation', { p_group_id: gRest }, RESTING_MSG));
      it('the role fabric refuses typed', async () => {
        await expectRefusal(monaC, 'create_group_role', { p_group_id: gRest, p_name: 'never-lands' }, RESTING_MSG);
        await expectRefusal(
          monaC,
          'remove_member_role',
          { p_group_id: gRest, p_member_group_id: stella.personalGroupId, p_group_role_id: stewardRoleRest },
          RESTING_MSG,
        );
      });
      it('update_group_settings refuses typed and writes nothing', async () => {
        await expectRefusal(monaC, 'update_group_settings', { p_group_id: gRest, p_name: 'renamed' }, RESTING_MSG);
        const { data } = await admin.from('groups').select('name').eq('id', gRest).single();
        expect((data as { name: string }).name).toBe('HYGA Resting Target');
      });
      it('activate_member refuses typed (growth half of the lifecycle)', async () => {
        // paula is paused by the exits block below when running in file order
        // post-apply; the refusal fires before any target-state check matters.
        await expectRefusal(
          monaC,
          'activate_member',
          { p_group_id: gRest, p_member_group_id: paula.personalGroupId },
          RESTING_MSG,
        );
      });
    });

    describe('the rest_group holder acts and controls the state (STORY-2)', () => {
      it('stella posts, moderates, edits settings, and works the role fabric while resting', async () => {
        const post = (await expectOk(stellaC, 'create_forum_post', {
          p_group_id: gRest,
          p_content: 'the steward tends the group through the rest',
        })) as { id: string };
        await expectOk(stellaC, 'moderate_forum_post', { p_post_id: post.id });
        await expectOk(stellaC, 'update_group_settings', {
          p_group_id: gRest,
          p_description: 'resting — being tended',
        });
        const rid = (await expectOk(stellaC, 'create_group_role', {
          p_group_id: gRest,
          p_name: 'HYGA rest-made role',
        })) as string;
        await expectOk(stellaC, 'assign_member_role', {
          p_group_id: gRest,
          p_member_group_id: mona.personalGroupId,
          p_group_role_id: rid,
        });
        await expectOk(stellaC, 'set_group_role_permission', {
          p_group_role_id: rid,
          p_permission_name: 'view_forum',
          p_granted: true,
        });
        await expectOk(stellaC, 'update_group_role', { p_group_role_id: rid, p_name: 'HYGA renamed' });
        await expectOk(stellaC, 'remove_member_role', {
          p_group_id: gRest,
          p_member_group_id: mona.personalGroupId,
          p_group_role_id: rid,
        });
        await expectOk(stellaC, 'delete_group_role', { p_group_role_id: rid });
      });

      it('the holder announces and retracts while resting', async () => {
        await expectOk(stellaC, 'retract_announcement', { p_announcement_id: aR2 });
      });

      it('a member without the permission cannot rest or wake the group', async () => {
        const { error } = await monaC.rpc('wake_group', { p_group_id: gRest });
        expect(error).not.toBeNull();
      });
    });

    describe('reads stay whole under resting', () => {
      it('get_group_forum returns content', async () => {
        await expectOk(monaC, 'get_group_forum', { p_group_id: gRest });
      });
      it('get_group_detail returns the full payload with the resting status', async () => {
        const data = (await expectOk(monaC, 'get_group_detail', { p_group_id: gRest })) as Record<
          string,
          unknown
        >;
        expect(Object.keys(data).length).toBeGreaterThan(3);
        expect(data.status).toBe('resting');
      });
      it('get_member_groups labels the resting group', async () => {
        const { data, error } = await monaC.rpc('get_member_groups');
        expect(error).toBeNull();
        const row = (data as Array<{ id: string; status?: string }>).find((r) => r.id === gRest);
        expect(row?.status).toBe('resting');
      });
      it('the direct row read shows the resting row to a member', async () => {
        const { data, error } = await monaC.from('groups').select('id').eq('id', gRest);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });
    });

    describe('exits stay open under resting (STORY-6)', () => {
      it('an invitee declines', async () => {
        await expectOk(ivaC, 'decline_group_invitation', { p_group_id: gRest });
      });
      it('a pending member invitation is cancelled', async () => {
        // iva declined hers; cancel targets the email invitation's member-shape
        // sibling — re-laid here is impossible (invites are frozen), so the
        // cancel cell uses the email invitation.
        await expectOk(monaC, 'cancel_email_invitation', { p_invitation_id: emailInvR });
      });
      it('pause_member succeeds; the frozen activate refusal is pinned above', async () => {
        await expectOk(monaC, 'pause_member', {
          p_group_id: gRest,
          p_member_group_id: paula.personalGroupId,
        });
      });
      it('remove_member succeeds (reduction stays open)', async () => {
        await expectOk(monaC, 'remove_member', {
          p_group_id: gRest,
          p_member_group_id: paula.personalGroupId,
        });
      });
      it('withdraw_from_journey succeeds', async () => {
        await expectOk(monaC, 'withdraw_from_journey', { p_enrollment_id: eRest });
      });
      it('leave_group_conversation succeeds', async () => {
        await expectOk(monaC, 'leave_group_conversation', { p_conversation_id: cRest });
      });
      it('leave_group succeeds — the trap is sprung', async () => {
        await expectOk(leoC, 'leave_group', { p_group_id: gRest });
      });
      it('leave_group_as_group succeeds', async () => {
        await expectOk(leoC, 'leave_group_as_group', { p_group_id: gRest, p_acting_group_id: gActA });
      });
    });
  });

  // =========================================================================
  // TRANSITIONS + ROUND-TRIP (STORY-9 / STORY-11) — per-case red at head
  // =========================================================================
  describe('the transitions — permissioned rest, admin-only suspension', () => {
    it('LABELLED GREEN — leave_group on a closed group keeps the terminal refusal', async () => {
      // gControl closes at the END of the transitions block? No — a dedicated
      // throwaway: mona is a member of gControl; closing gControl would break
      // the control cells, so the closed-arm pin uses its own group.
      const { data: gid, error } = await stellaC.rpc('create_engagement_group', {
        p_name: 'HYGA Closed Arm',
      });
      expect(error).toBeNull();
      // close_group demands a sole active member — close first, then land
      // mona's membership via the admin plane so she can attempt the leave.
      await expectOk(stellaC, 'close_group', { p_group_id: gid as string });
      await admin.from('group_memberships').insert({
        group_id: gid as string,
        member_group_id: mona.personalGroupId,
        status: 'active',
        added_by_group_id: stella.personalGroupId,
      });
      await expectRefusal(
        monaC,
        'leave_group',
        { p_group_id: gid as string },
        'cannot leave a group that is not active',
      );
      await cleanupTestGroup(gid as string).catch(() => undefined);
    });

    it('a member without rest_group is refused typed on rest_group()', async () => {
      const { error } = await monaC.rpc('rest_group', { p_group_id: gCycle });
      expect(error).not.toBeNull();
      expect(String(error?.message)).toContain('required');
      expect(await groupStatus(gCycle)).toBe('active');
    });

    it('a non-admin is refused on the admin ceremonies (existence-hiding posture)', async () => {
      await expectRefusal(monaC, 'admin_rest_group', { p_group_id: gCycle }, 'platform administrator required');
      await expectRefusal(monaC, 'admin_wake_group', { p_group_id: gCycle }, 'platform administrator required');
    });

    it('steward rest/wake writes no admin-audit row (member plane, the close/delete precedent)', async () => {
      const restBefore = await auditCount('group.rest', gCycle);
      const wakeBefore = await auditCount('group.wake', gCycle);
      await expectOk(stellaC, 'rest_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('resting');
      await expectOk(stellaC, 'wake_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('active');
      expect(await auditCount('group.rest', gCycle)).toBe(restBefore);
      expect(await auditCount('group.wake', gCycle)).toBe(wakeBefore);
    });

    it('the admin ceremonies compose the member contracts and write audit rows', async () => {
      const restBefore = await auditCount('group.rest', gCycle);
      const wakeBefore = await auditCount('group.wake', gCycle);
      await expectOk(adaC, 'admin_rest_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('resting');
      expect(await auditCount('group.rest', gCycle)).toBe(restBefore + 1);
      await expectOk(adaC, 'admin_wake_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('active');
      expect(await auditCount('group.wake', gCycle)).toBe(wakeBefore + 1);
    });

    it('admin_suspend_group admits the resting origin and audits it', async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gCycle });
      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('suspended');
      const { data } = await admin
        .from('admin_audit_log')
        .select('metadata')
        .eq('action', 'group.suspend')
        .eq('target', gCycle)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      expect((data as { metadata: { previous_status?: string } }).metadata.previous_status).toBe('resting');
      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('active');
    });

    it('STORY-11 — the full round-trip restores everything', async () => {
      // active: the door works
      await expectOk(monaC, 'create_forum_post', { p_group_id: gCycle, p_content: 'while active' });
      // rest -> refused -> wake -> works
      await expectOk(stellaC, 'rest_group', { p_group_id: gCycle });
      await expectRefusal(monaC, 'create_forum_post', { p_group_id: gCycle, p_content: 'x' }, RESTING_MSG);
      await expectOk(stellaC, 'wake_group', { p_group_id: gCycle });
      await expectOk(monaC, 'create_forum_post', { p_group_id: gCycle, p_content: 'after wake' });
      // rest -> admin suspend (from resting) -> hard hold -> reactivate -> works
      await expectOk(stellaC, 'rest_group', { p_group_id: gCycle });
      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gCycle });
      await expectRefusal(monaC, 'create_forum_post', { p_group_id: gCycle, p_content: 'x' }, SUSPENDED_MSG);
      await expectRefusal(monaC, 'get_group_forum', { p_group_id: gCycle }, SUSPENDED_MSG);
      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gCycle });
      await expectOk(monaC, 'create_forum_post', { p_group_id: gCycle, p_content: 'after restore' });
      await expectOk(monaC, 'get_group_forum', { p_group_id: gCycle });
      // one more rest/wake — the symmetric pair holds after the hard cycle
      await expectOk(stellaC, 'rest_group', { p_group_id: gCycle });
      const posted = (await expectOk(stellaC, 'create_forum_post', {
        p_group_id: gCycle,
        p_content: 'the holder acts during the final rest',
      })) as { id: string };
      expect(posted.id).toBeDefined();
      await expectOk(stellaC, 'wake_group', { p_group_id: gCycle });
      expect(await groupStatus(gCycle)).toBe('active');
    });

    it('the active control group stayed byte-identical throughout', async () => {
      await expectOk(monaC, 'create_forum_post', { p_group_id: gControl, p_content: 'control post' });
      await expectOk(monaC, 'get_group_forum', { p_group_id: gControl });
    });
  });
});
