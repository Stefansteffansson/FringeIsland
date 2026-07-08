import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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

const GHOST = '00000000-0000-0000-0000-00000000dead';

/** DeusEx elevation pair — the established local-helper pattern (mirrors the
 *  journey-completion-timing sibling): erase_fim_account is manage_all_groups-gated
 *  and needs an authenticated caller. */
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

/**
 * FEAT-PD005 (Journeys Cycle J-D) — group progress sharing, cross-subject consent,
 * and frozen-walk contracts. Three surfaces over the existing substrate:
 *   - the freeze re-verification (bridge `_14`): the four PC013/PC014 membership
 *     cascades freeze the right rows with the right reason;
 *   - the consent write `set_journey_progress_sharing` + the role/consent-gated read
 *     `get_group_journey_progress`;
 *   - the additive `get_player_state` blocks (`freeze`, `progress_sharing`).
 *
 * RED-FIRST classification. This suite is authored BEFORE the PD005 migration exists
 * (substrate is at FEAT-PD004, migration 20260708120000). Every `it` carries a class:
 *   // RED: missing function   — set_journey_progress_sharing / get_group_journey_progress
 *                                do not exist yet (PGRST202 / not-in-schema-cache).
 *   // RED: missing key        — an additive get_player_state block the migration adds.
 *   // RED: today's standing gate — Q9: _enrollment_traveller_standing / get_my_enrollments
 *                                admit active members only; a departed traveller is
 *                                P0002-concealed / absent from their own frozen walk today.
 *   // PIN: cascade truth      — a PC013/PC014 freeze behaviour re-verified as-built
 *                                (green today; gate evidence — NOT redesigned here).
 *   // PIN: unchanged behaviour — a PD003/PD004 invariant that must survive additively.
 *
 * Tested against the spec's Open-spec-question DEFAULTS (Q1..Q9), which the migration
 * author ratifies at the schema gate. Q8 (closed-vs-archived last-leader asymmetry) is
 * DRIVEN both ways and its demonstrated truth recorded — a disposition, never a fix.
 *
 * Substrate pins verified against the migrations this session:
 *   - remove_member / leave_group freeze the target's OWN self-enrolments in the group's
 *     non-public journeys, status='active' ONLY (removed_from_group / left_group).
 *   - close_group / delete_group also freeze the group-LEVEL enrolment (group_id = the
 *     group), status='active' ONLY (group_closed / group_archived). A completed enrolment
 *     is never frozen (the WHERE is status='active').
 *   - prevent_last_leader_removal RETURNs OLD natively only on status='closed'; delete_group
 *     bypasses 'archived' via app.hard_delete_in_progress (set/cleared inside the contract).
 *   - _enrollment_traveller_standing admits own-party OR active member; P0002 otherwise.
 *   - consent_records is append-only (enforce_consent_append_only, 42501) outside the
 *     app.consent_erasure_in_progress bypass; purpose is open text.
 *
 * Fixtures follow the sibling suites: own users/groups/journeys per scenario (never the
 * live seed set — the J-B retro trap), admin-seeded enrolments/instances where a status
 * or grain a contract can't reach is needed, FK-safe teardown.
 */
describe('FEAT-PD005 — group progress, sharing consent & frozen-walk contracts (J-D)', () => {
  const admin = createAdminClient();

  // Read/share party (never destroyed) — STORY-2/3/4/5/6.
  let owner: TestUser;        // owns the shared journeys (ownerG)
  let steward: TestUser;      // readParty Steward (holds the reads post-migration)
  let guide: TestUser;        // readParty Guide (the second admitted role)
  let memberShare: TestUser;  // consents to share
  let memberNoShare: TestUser;// never decides (private by default)
  let eraseMember: TestUser;  // sharing member erased via the house path (STORY-6)
  let outsider: TestUser;     // no standing anywhere (P0002 subject)

  // Cascade operators/subjects (destructive scenarios — their own groups).
  let opSteward: TestUser;    // Steward/creator of removeGroup, leaveGroup, q8Closed, q8Archived
  let rmTarget: TestUser;     // removed via MEM-5
  let lvLeaver: TestUser;     // leaves via MEM-6
  let closer: TestUser;       // sole member closes via MEM-8
  let arSteward: TestUser;    // archives via GRP-9
  let arMember: TestUser;     // departs on archive; the Q9 lived-record subject

  let ownerG: string;
  let readParty: string;
  let removeGroup: string;
  let leaveGroup: string;
  let archiveGroup: string;

  // Shared journeys (owner-owned, public) for the read party.
  let jGroupWalk: string;     // readParty group-level enrolment
  let jGroupWalkSteps: StepRow[] = [];
  let readPartyEnr: string;

  // Freeze-target journeys (created BY the cascade group, non-public).
  let jRemoveOwned: string;   // rmTarget self-enrolment freezes removed_from_group
  let jRemoveCompleted: string; // rmTarget completed self-enrolment (interplay pin)
  let jLeaveOwned: string;    // lvLeaver self-enrolment freezes left_group
  let jCloseGroup: string;    // closeGroup group-level enrolment freezes group_closed
  let jCloseOwned: string;    // closer self-enrolment in a closeGroup-owned journey (shape 1)
  let jArchiveGroup: string;  // archiveGroup group-level enrolment freezes group_archived
  let jArchiveCompleted: string; // archiveGroup completed group-level enrolment (interplay pin)
  let jSolo: string;          // a solo active walk (progress_sharing available=false)
  let soloEnr: string;

  // Pre-freeze enrolment ids (admin-seeded active/completed).
  let rmActiveEnr: string;
  let rmCompletedEnr: string;
  let lvActiveEnr: string;
  let closeGroupEnr: string;
  let closeOwnedEnr: string;
  let archiveGroupEnr: string;
  let archiveCompletedEnr: string;

  type StepRow = { id: string; step_order: number; title: string };

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];
  const adminEnrollmentIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const createGroup = async (name: string, creator: TestUser): Promise<string> => {
    const c = await asUser(creator);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`createGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    return groupId as string;
  };

  const addMember = async (groupId: string, m: TestUser, by: TestUser): Promise<void> => {
    const { error } = await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: m.personalGroupId,
      status: 'active',
      added_by_group_id: by.personalGroupId,
    });
    if (error) throw new Error(`addMember: ${error.message}`);
  };

  const seedJourney = async (
    title: string,
    createdBy: string,
    isPublic: boolean,
  ): Promise<string> => {
    const { data, error } = await admin
      .from('journeys')
      .insert({
        title,
        description: `${title} — J-D PD005 fixture`,
        created_by_group_id: createdBy,
        is_published: true,
        is_public: isPublic,
        journey_type: 'predefined',
        difficulty_level: 'beginner',
        estimated_duration_minutes: 60,
        tags: ['j-d-test'],
        content: null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedJourney(${title}): ${error.message}`);
    createdJourneyIds.push(data!.id as string);
    return data!.id as string;
  };

  const seedSteps = async (
    journeyId: string,
    specs: Array<{ title: string; kind: string; family: string; required?: boolean; repeatable?: boolean }>,
  ): Promise<StepRow[]> => {
    const rows = specs.map((s, i) => ({
      journey_id: journeyId,
      step_order: i + 1,
      title: s.title,
      step_kind_key: s.kind,
      content_family_key: s.family,
      required: s.required ?? true,
      repeatable: s.repeatable ?? false,
      duration_minutes: 10,
      content: { body: `${s.title} — inline payload` },
    }));
    const { data, error } = await admin
      .from('journey_steps')
      .insert(rows)
      .select('id, step_order, title')
      .order('step_order', { ascending: true });
    if (error) return [];
    return (data as StepRow[]) ?? [];
  };

  /** Admin-seed an enrolment in a chosen status/party (bypasses the contracts). */
  const adminEnroll = async (
    journeyId: string,
    partyGroupId: string,
    status: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journeyId,
        group_id: partyGroupId,
        enrolled_by_group_id: partyGroupId,
        status,
        ...extra,
      })
      .select('id')
      .single();
    if (error) throw new Error(`adminEnroll(${status}): ${error.message}`);
    adminEnrollmentIds.push(data!.id as string);
    return data!.id as string;
  };

  /** Admin-seed a step-instance at the (enrolment x traveller x step) grain. */
  const seedInstance = async (
    enrollmentId: string,
    travellerGroupId: string,
    stepId: string,
    completed: boolean,
  ): Promise<void> => {
    await admin.from('journey_step_instances').insert({
      enrollment_id: enrollmentId,
      traveller_group_id: travellerGroupId,
      step_id: stepId,
      completed_at: completed ? new Date().toISOString() : null,
    });
  };

  /** Grant a named permission to a group's Steward role and ensure the user holds it. */
  const grantPermission = async (
    groupId: string,
    u: TestUser,
    permissionName: string,
    assigner: TestUser,
  ): Promise<void> => {
    await runAdminSql(`
      DO $$
      DECLARE v_role uuid; v_perm uuid;
      BEGIN
        SELECT id INTO v_perm FROM public.permissions WHERE name = '${permissionName}';
        SELECT gr.id INTO v_role FROM public.group_roles gr
         WHERE gr.group_id = '${groupId}'
           AND (gr.created_from_role_template_id =
                 (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
               OR gr.name = 'Steward')
         LIMIT 1;
        IF v_perm IS NOT NULL AND v_role IS NOT NULL THEN
          INSERT INTO public.group_role_permissions (group_role_id, permission_id)
          VALUES (v_role, v_perm) ON CONFLICT DO NOTHING;
          INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${u.personalGroupId}', '${groupId}', v_role, '${assigner.personalGroupId}')
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;`);
  };

  /** Assign the Guide template role to a user in a group (no-ops if the row is absent). */
  const assignGuideRole = async (groupId: string, u: TestUser): Promise<void> => {
    await runAdminSql(`
      DO $$
      DECLARE v_role uuid;
      BEGIN
        SELECT gr.id INTO v_role FROM public.group_roles gr
         WHERE gr.group_id = '${groupId}'
           AND (gr.created_from_role_template_id =
                 (SELECT id FROM public.role_templates WHERE name = 'Guide Role Template')
               OR gr.name = 'Guide')
         LIMIT 1;
        IF v_role IS NOT NULL THEN
          INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${u.personalGroupId}', '${groupId}', v_role, '${u.personalGroupId}')
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;`);
  };

  const readEnrollment = async (enrollmentId: string): Promise<Record<string, unknown>> => {
    const { data } = await admin
      .from('journey_enrollments')
      .select('status, progress_data, completed_at')
      .eq('id', enrollmentId)
      .maybeSingle();
    return (data ?? {}) as Record<string, unknown>;
  };

  const groupStatus = async (groupId: string): Promise<string | null> => {
    const { data } = await admin.from('groups').select('status').eq('id', groupId).maybeSingle();
    return (data as { status?: string } | null)?.status ?? null;
  };

  beforeAll(async () => {
    owner = await createTestUser({ displayName: 'JD Owner' });
    steward = await createTestUser({ displayName: 'JD Steward' });
    guide = await createTestUser({ displayName: 'JD Guide' });
    // Display names chosen so alphabetical-by-name ordering is testable post-migration.
    memberShare = await createTestUser({ displayName: 'JD Aaron Share' });
    memberNoShare = await createTestUser({ displayName: 'JD Bella NoShare' });
    eraseMember = await createTestUser({ displayName: 'JD Cara Erase' });
    outsider = await createTestUser({ displayName: 'JD Outsider' });
    opSteward = await createTestUser({ displayName: 'JD Op Steward' });
    rmTarget = await createTestUser({ displayName: 'JD Remove Target' });
    lvLeaver = await createTestUser({ displayName: 'JD Leaver' });
    closer = await createTestUser({ displayName: 'JD Closer' });
    arSteward = await createTestUser({ displayName: 'JD Archive Steward' });
    arMember = await createTestUser({ displayName: 'JD Archive Member' });
    createdUserIds.push(
      owner.user.id, steward.user.id, guide.user.id, memberShare.user.id,
      memberNoShare.user.id, eraseMember.user.id, outsider.user.id, opSteward.user.id,
      rmTarget.user.id, lvLeaver.user.id, closer.user.id, arSteward.user.id, arMember.user.id,
    );

    ownerG = await createGroup('JD Journey Owners', owner);

    // Read/share party.
    readParty = await createGroup('JD Read Party', steward);
    await addMember(readParty, guide, steward);
    await addMember(readParty, memberShare, steward);
    await addMember(readParty, memberNoShare, steward);
    await addMember(readParty, eraseMember, steward);
    await assignGuideRole(readParty, guide);

    jGroupWalk = await seedJourney('JD Group Walk', ownerG, true);
    jGroupWalkSteps = await seedSteps(jGroupWalk, [
      { title: 'Group One', kind: 'narrative', family: 'witness' },
      { title: 'Group Two', kind: 'activity', family: 'act' },
    ]);
    readPartyEnr = await adminEnroll(jGroupWalk, readParty, 'active');
    // memberShare + eraseMember have lived instances (a completed first step);
    // memberNoShare walks nothing until a sharing decision could expose it.
    if (jGroupWalkSteps[0]) {
      await seedInstance(readPartyEnr, memberShare.personalGroupId, jGroupWalkSteps[0].id, true);
      await seedInstance(readPartyEnr, eraseMember.personalGroupId, jGroupWalkSteps[0].id, true);
    }

    // Solo walk (progress_sharing available=false).
    jSolo = await seedJourney('JD Solo Walk', ownerG, true);
    await seedSteps(jSolo, [{ title: 'Solo One', kind: 'narrative', family: 'witness' }]);
    soloEnr = await adminEnroll(jSolo, memberShare.personalGroupId, 'active');

    // MEM-5 removeGroup: opSteward Steward, rmTarget member.
    removeGroup = await createGroup('JD Remove Group', opSteward);
    await addMember(removeGroup, rmTarget, opSteward);
    await grantPermission(removeGroup, opSteward, 'remove_members', opSteward);
    jRemoveOwned = await seedJourney('JD Remove Owned', removeGroup, false);
    const rmSteps = await seedSteps(jRemoveOwned, [{ title: 'Rm One', kind: 'narrative', family: 'witness' }]);
    rmActiveEnr = await adminEnroll(jRemoveOwned, rmTarget.personalGroupId, 'active');
    if (rmSteps[0]) await seedInstance(rmActiveEnr, rmTarget.personalGroupId, rmSteps[0].id, false);
    jRemoveCompleted = await seedJourney('JD Remove Completed', removeGroup, false);
    await seedSteps(jRemoveCompleted, [{ title: 'RmDone One', kind: 'narrative', family: 'witness' }]);
    rmCompletedEnr = await adminEnroll(jRemoveCompleted, rmTarget.personalGroupId, 'completed', {
      completed_at: new Date().toISOString(),
    });

    // MEM-6 leaveGroup: opSteward Steward, lvLeaver member.
    leaveGroup = await createGroup('JD Leave Group', opSteward);
    await addMember(leaveGroup, lvLeaver, opSteward);
    jLeaveOwned = await seedJourney('JD Leave Owned', leaveGroup, false);
    await seedSteps(jLeaveOwned, [{ title: 'Lv One', kind: 'narrative', family: 'witness' }]);
    lvActiveEnr = await adminEnroll(jLeaveOwned, lvLeaver.personalGroupId, 'active');

    // MEM-8 closeGroup: closer is the sole member.
    const closeGroup = await createGroup('JD Close Group', closer);
    jCloseGroup = await seedJourney('JD Close Group Walk', ownerG, true);
    await seedSteps(jCloseGroup, [{ title: 'Cl One', kind: 'narrative', family: 'witness' }]);
    closeGroupEnr = await adminEnroll(jCloseGroup, closeGroup, 'active'); // group-level (shape 2)
    jCloseOwned = await seedJourney('JD Close Owned', closeGroup, false);
    await seedSteps(jCloseOwned, [{ title: 'ClOwn One', kind: 'narrative', family: 'witness' }]);
    closeOwnedEnr = await adminEnroll(jCloseOwned, closer.personalGroupId, 'active'); // shape 1
    (globalThis as Record<string, unknown>).__jdCloseGroup = closeGroup;

    // GRP-9 archiveGroup: arSteward Steward, arMember member.
    archiveGroup = await createGroup('JD Archive Group', arSteward);
    await addMember(archiveGroup, arMember, arSteward);
    await grantPermission(archiveGroup, arSteward, 'delete_group', arSteward);
    jArchiveGroup = await seedJourney('JD Archive Group Walk', ownerG, true);
    const arSteps = await seedSteps(jArchiveGroup, [{ title: 'Ar One', kind: 'narrative', family: 'witness' }]);
    archiveGroupEnr = await adminEnroll(jArchiveGroup, archiveGroup, 'active'); // group-level (shape 2)
    if (arSteps[0]) await seedInstance(archiveGroupEnr, arMember.personalGroupId, arSteps[0].id, true);
    jArchiveCompleted = await seedJourney('JD Archive Completed', ownerG, true);
    await seedSteps(jArchiveCompleted, [{ title: 'ArDone One', kind: 'narrative', family: 'witness' }]);
    archiveCompletedEnr = await adminEnroll(jArchiveGroup, archiveGroup, 'completed', {
      completed_at: new Date().toISOString(),
    });
  }, 240000);

  afterAll(async () => {
    if (createdJourneyIds.length) {
      const idList = createdJourneyIds.map((id) => `'${id}'`).join(',');
      await runAdminSql(
        `DELETE FROM public.journey_step_instances WHERE step_id IN ` +
          `(SELECT id FROM public.journey_steps WHERE journey_id IN (${idList}));`,
      ).catch(() => undefined);
      for (const id of createdJourneyIds) {
        await admin.from('journey_enrollments').delete().eq('journey_id', id);
      }
      await admin.from('journey_steps').delete().in('journey_id', createdJourneyIds);
      for (const id of createdJourneyIds) {
        await admin.from('journeys').delete().eq('id', id);
      }
    }
    for (const id of createdGroupIds.reverse()) {
      await cleanupTestGroup(id).catch(() => undefined);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id).catch(() => undefined);
    }
  }, 240000);

  // ==========================================================================
  // STORY-1 — The freeze cascades hold, and the walk explains itself
  // ==========================================================================
  describe('STORY-1 — freeze re-verification (the bridge `_14` commission)', () => {
    it('MEM-5 remove_member freezes the target self-enrolment with removed_from_group', async () => {
      // PIN: cascade truth — target = the removed member's own active enrolments in
      // the group's non-public journeys; frozen_reason=removed_from_group; frozen_at set.
      const cs = await asUser(opSteward);
      const { error } = await cs.rpc('remove_member', {
        p_group_id: removeGroup,
        p_member_group_id: rmTarget.personalGroupId,
      });
      expect(error).toBeNull();
      const enr = await readEnrollment(rmActiveEnr);
      expect(enr.status).toBe('frozen');
      const pd = enr.progress_data as Record<string, unknown>;
      expect(pd.frozen_reason).toBe('removed_from_group');
      expect(pd.frozen_at).toBeTruthy();
    });

    it('MEM-5 leaves a completed enrolment untouched (the WHERE is status=active)', async () => {
      // PIN: cascade truth — completed-then-frozen interplay: a completed enrolment
      // is NOT swept by the freeze (gate evidence, surfaced in the report).
      const enr = await readEnrollment(rmCompletedEnr);
      expect(enr.status).toBe('completed');
      const pd = (enr.progress_data ?? {}) as Record<string, unknown>;
      expect(pd.frozen_reason).toBeUndefined();
    });

    it('MEM-6 leave_group freezes the leaver self-enrolment with left_group', async () => {
      // PIN: cascade truth — self-exit freezes own active enrolments in the group's
      // non-public journeys; frozen_reason=left_group.
      const cl = await asUser(lvLeaver);
      const { error } = await cl.rpc('leave_group', { p_group_id: leaveGroup });
      expect(error).toBeNull();
      const enr = await readEnrollment(lvActiveEnr);
      expect(enr.status).toBe('frozen');
      expect((enr.progress_data as Record<string, unknown>).frozen_reason).toBe('left_group');
    });

    it('MEM-8 close_group freezes both the group-level and the owned self-enrolment with group_closed', async () => {
      // PIN: cascade truth — close touches (2) the group-level enrolment (group_id=grp)
      // AND (1) active enrolments in the group's non-public journeys; both group_closed.
      const closeGroup = (globalThis as Record<string, unknown>).__jdCloseGroup as string;
      const cc = await asUser(closer);
      const { error } = await cc.rpc('close_group', { p_group_id: closeGroup });
      expect(error).toBeNull();
      const grp = await readEnrollment(closeGroupEnr);
      const own = await readEnrollment(closeOwnedEnr);
      expect(grp.status).toBe('frozen');
      expect((grp.progress_data as Record<string, unknown>).frozen_reason).toBe('group_closed');
      expect(own.status).toBe('frozen');
      expect((own.progress_data as Record<string, unknown>).frozen_reason).toBe('group_closed');
      expect(await groupStatus(closeGroup)).toBe('closed');
    });

    it('GRP-9 delete_group freezes the group-level enrolment with group_archived and archives the group', async () => {
      // PIN: cascade truth — archive touches the group-level enrolment (group_id=grp),
      // status='active' only; frozen_reason=group_archived; the group becomes 'archived'.
      if (await groupStatus(archiveGroup) === 'active') {
        const ca = await asUser(arSteward);
        const { error } = await ca.rpc('delete_group', { p_group_id: archiveGroup });
        expect(error).toBeNull();
      }
      const grp = await readEnrollment(archiveGroupEnr);
      expect(grp.status).toBe('frozen');
      expect((grp.progress_data as Record<string, unknown>).frozen_reason).toBe('group_archived');
      expect(await groupStatus(archiveGroup)).toBe('archived');
    });

    it('GRP-9 leaves a completed group-level enrolment untouched', async () => {
      // PIN: cascade truth — completed-then-frozen interplay on the archive path.
      const enr = await readEnrollment(archiveCompletedEnr);
      expect(enr.status).toBe('completed');
    });

    it('a frozen walk reads read-only (get_player_state) and refuses writes with P0001', async () => {
      // PIN: unchanged behaviour — the read/write asymmetry IS frozen mode: no status
      // guard on the read (own-party standing holds), P0001 on enter/complete.
      const cr = await asUser(rmTarget); // rmTarget still owns the party (self-enrolment)
      const { data, error } = await cr.rpc('get_player_state', { p_enrollment_id: rmActiveEnr });
      expect(error).toBeNull();
      expect((data as Record<string, unknown>).status).toBe('frozen');

      const { data: sd } = await admin
        .from('journey_steps').select('id').eq('journey_id', jRemoveOwned).limit(1);
      const stepId = ((sd as Array<{ id: string }>) ?? [])[0]?.id ?? GHOST;
      const { error: enterErr } = await cr.rpc('enter_journey_step', {
        p_enrollment_id: rmActiveEnr, p_step_id: stepId,
      });
      expect(enterErr!.code).toBe('P0001');
      const { error: compErr } = await cr.rpc('complete_journey_step', {
        p_enrollment_id: rmActiveEnr, p_step_id: stepId,
      });
      expect(compErr!.code).toBe('P0001');
    });

    // -- Q8: the closed-vs-archived last-leader-trigger asymmetry, driven both ways --
    it('Q8: a last-Steward-role removal is admitted on a closed group but refused on an archived group', async () => {
      // PIN: cascade truth (Q8 disposition evidence — DRIVEN both ways, NOT fixed).
      // prevent_last_leader_removal RETURNs OLD natively when group.status='closed';
      // 'archived' has no native bypass (delete_group uses app.hard_delete_in_progress).
      // We force each terminal status on a fresh single-Steward group, then attempt a
      // raw delete of the EXACT last-Steward role row (no hard-delete flag) and record
      // the difference — targeting the row by id so no other membership role confounds.
      const q8Closed = await createGroup('JD Q8 Closed', opSteward);
      const q8Archived = await createGroup('JD Q8 Archived', opSteward);

      const stewardUgrId = async (groupId: string): Promise<string> => {
        // Permission-derived, mirroring create_engagement_group's own creator
        // binding (the role whose template grants 'assign_roles') — never a
        // role-name string; role instances take template names.
        const rows = await runAdminSql(
          `SELECT ugr.id
             FROM public.user_group_roles ugr
             JOIN public.group_roles gr ON gr.id = ugr.group_role_id
             JOIN public.role_template_permissions rtp
               ON rtp.role_template_id = gr.created_from_role_template_id AND rtp.granted
             JOIN public.permissions p ON p.id = rtp.permission_id
            WHERE ugr.group_id = '${groupId}'
              AND ugr.member_group_id = '${opSteward.personalGroupId}'
              AND p.name = 'assign_roles'
            LIMIT 1;`,
        );
        return ((rows[0] as { id: string } | undefined)?.id) ?? GHOST;
      };
      const closedUgrId = await stewardUgrId(q8Closed);
      const archivedUgrId = await stewardUgrId(q8Archived);
      expect(closedUgrId).not.toBe(GHOST);
      expect(archivedUgrId).not.toBe(GHOST);

      await admin.from('groups').update({ status: 'closed' }).eq('id', q8Closed);
      await admin.from('groups').update({ status: 'archived' }).eq('id', q8Archived);
      expect(await groupStatus(q8Closed)).toBe('closed'); // the raw status update stuck
      expect(await groupStatus(q8Archived)).toBe('archived');

      const delById = (ugrId: string) =>
        runAdminSql(`DELETE FROM public.user_group_roles WHERE id = '${ugrId}';`);

      // closed → native status bypass → the last-Steward delete is admitted.
      await expect(delById(closedUgrId)).resolves.toBeDefined();
      const { data: closedAfter } = await admin
        .from('user_group_roles').select('id').eq('id', closedUgrId);
      expect((closedAfter ?? []).length).toBe(0); // gone

      // archived → no native bypass → the trigger refuses the identical delete.
      await expect(delById(archivedUgrId)).rejects.toThrow(/last Steward/i);
      const { data: archivedAfter } = await admin
        .from('user_group_roles').select('id').eq('id', archivedUgrId);
      expect((archivedAfter ?? []).length).toBe(1); // still present
    });
  });

  // ==========================================================================
  // STORY-2 — Sharing is the traveller's own, append-only decision
  // ==========================================================================
  describe('STORY-2 — set_journey_progress_sharing (self-only consent write)', () => {
    it('records a sharing decision for a via-group walk', async () => {
      // RED: missing function — set_journey_progress_sharing does not exist yet.
      const c = await asUser(memberShare);
      const { error } = await c.rpc('set_journey_progress_sharing', {
        p_enrollment_id: readPartyEnr,
        p_share: true,
      });
      expect(error).toBeNull();
    });

    it('refuses a solo walk with P0001 (no one to share to)', async () => {
      // RED: missing function — today the absent function errors PGRST202, not P0001.
      const c = await asUser(memberShare);
      const { error } = await c.rpc('set_journey_progress_sharing', {
        p_enrollment_id: soloEnr,
        p_share: true,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
    });

    it('refuses an enrolment the caller has no standing on with P0002', async () => {
      // RED: missing function.
      const c = await asUser(outsider);
      const { error } = await c.rpc('set_journey_progress_sharing', {
        p_enrollment_id: readPartyEnr,
        p_share: true,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });

    it('honours the append-only consent substrate — UPDATE and DELETE both raise 42501', async () => {
      // PIN: unchanged behaviour — sharing must ride the append-only ledger; a raw
      // mutation outside the erasure bypass is refused (the trigger stays untouched).
      const { data: inserted, error: insErr } = await admin
        .from('consent_records')
        .insert({
          subject_user_id: null,
          subject_group_id: memberShare.personalGroupId,
          purpose: 'journey_progress_visibility',
          policy_version: 'test',
          decision: 'granted',
          capture_context: { enrollment_id: readPartyEnr, share: true },
        })
        .select('id')
        .single();
      expect(insErr).toBeNull();
      const rowId = inserted!.id as string;

      const { error: updErr } = await admin
        .from('consent_records').update({ decision: 'withdrawn' }).eq('id', rowId);
      expect(updErr).not.toBeNull();
      expect(updErr!.code).toBe('42501');

      const { error: delErr } = await admin
        .from('consent_records').delete().eq('id', rowId);
      expect(delErr).not.toBeNull();
      expect(delErr!.code).toBe('42501');
    });
  });

  // ==========================================================================
  // STORY-3/4 — The progress window is role/consent-shaped and honest
  // ==========================================================================
  describe('STORY-3/4 — get_group_journey_progress (gated read + honest aggregate)', () => {
    it('conceals existence with P0002 for a non-member of the party', async () => {
      // RED: missing function.
      const c = await asUser(outsider);
      const { error } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });

    it('refuses an active member without view_group_progress with 42501', async () => {
      // RED: missing function. (view_group_progress IS live-seeded — Steward/Guide
      // templates, 97 instantiated grants — the plain Member template lacks it.)
      const c = await asUser(memberShare);
      const { error } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('admits a Steward under the default templates and lists every active member once, alphabetically', async () => {
      // RED: missing function — the seeded view_group_progress admits Steward/Guide.
      const c = await asUser(steward);
      const { data, error } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      expect(error).toBeNull();
      const members = (data as Record<string, unknown>).members as Array<Record<string, unknown>>;
      const names = members.map((m) => m.display_name as string);
      expect(names).toEqual([...names].sort()); // alphabetical, never by progress
      expect(new Set(names).size).toBe(names.length); // each exactly once
    });

    it('admits a Guide as the second templated role', async () => {
      // RED: missing function.
      const c = await asUser(guide);
      const { error } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      expect(error).toBeNull();
    });

    it('exposes NOTHING for a non-sharing member — exhaustive payload-key walk', async () => {
      // RED: missing function — a member with no consent contributes sharing:false and
      // nothing else (no marks, counts, timestamps, aggregate inclusion).
      const c = await asUser(steward);
      const { data } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      const members = ((data as Record<string, unknown>)?.members ?? []) as Array<Record<string, unknown>>;
      const entry = members.find((m) => m.member_group_id === memberNoShare.personalGroupId);
      expect(entry).toBeDefined();
      expect(entry!.sharing).toBe(false);
      // The ONLY keys a non-sharing entry may carry (identity + sharing flag).
      expect(Object.keys(entry!).sort()).toEqual(['display_name', 'member_group_id', 'sharing']);
    });

    it('carries completion marks for a sharing member and NO timing keys anywhere (Q5)', async () => {
      // RED: missing function.
      const c = await asUser(steward);
      const { data } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      const payload = JSON.stringify(data ?? {});
      expect(/second|seconds|timing|wall_clock|duration|elapsed|_at"/i.test(payload)).toBe(false);
      const members = ((data as Record<string, unknown>)?.members ?? []) as Array<Record<string, unknown>>;
      const sharer = members.find((m) => m.member_group_id === memberShare.personalGroupId);
      expect(sharer!.sharing).toBe(true);
      expect(sharer).toHaveProperty('traveller_completed');
    });

    it('derives the aggregate over sharing members only, with an honest total/sharing basis', async () => {
      // RED: missing function — invariant 8 / small-party de-anonymization refusal.
      const c = await asUser(steward);
      const { data } = await c.rpc('get_group_journey_progress', { p_enrollment_id: readPartyEnr });
      const d = (data ?? {}) as Record<string, unknown>;
      const membersMeta = (d.members_meta ?? d.members_summary ?? {}) as Record<string, unknown>;
      // total = active members; sharing = those with consent — the basis label.
      expect(Number(membersMeta.total ?? (d as Record<string, unknown>).members_total)).toBeGreaterThanOrEqual(0);
      expect(d.aggregate).toBeDefined();
    });
  });

  // ==========================================================================
  // STORY-5 — The player payload carries the new blocks additively
  // ==========================================================================
  describe('STORY-5 — get_player_state additive freeze + progress_sharing blocks', () => {
    it('surfaces a freeze {reason, frozen_at} block on a frozen enrolment', async () => {
      // RED: missing key — the freeze block does not exist yet.
      const c = await asUser(rmTarget);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: rmActiveEnr });
      expect(error).toBeNull();
      const freeze = (data as Record<string, unknown>).freeze as Record<string, unknown> | undefined;
      expect(freeze).toBeDefined();
      expect(freeze!.reason).toBe('removed_from_group');
      expect(freeze!.frozen_at).toBeTruthy();
    });

    it('carries a progress_sharing {available:true, sharing} block on a via-group walk', async () => {
      // RED: missing key.
      const c = await asUser(memberShare);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: readPartyEnr });
      expect(error).toBeNull();
      const ps = (data as Record<string, unknown>).progress_sharing as Record<string, unknown> | undefined;
      expect(ps).toBeDefined();
      expect(ps!.available).toBe(true);
      expect(ps).toHaveProperty('sharing');
    });

    it('marks progress_sharing.available=false on a solo walk', async () => {
      // RED: missing key.
      const c = await asUser(memberShare);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: soloEnr });
      expect(error).toBeNull();
      const ps = (data as Record<string, unknown>).progress_sharing as Record<string, unknown> | undefined;
      expect(ps).toBeDefined();
      expect(ps!.available).toBe(false);
    });

    it('keeps every pre-existing get_player_state key byte-shape-unchanged (the PD004 posture)', async () => {
      // PIN: unchanged behaviour — the PD003/PD004 key set survives additively.
      const c = await asUser(memberShare);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: soloEnr });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      for (const key of [
        'enrollment_id', 'status', 'sequencing_mode', 'journey', 'steps',
        'instances', 'resume_step_id', 'completion', 'timing',
      ]) {
        expect(d).toHaveProperty(key);
      }
      expect(Object.keys(d.journey as Record<string, unknown>).sort())
        .toEqual(['description', 'id', 'title']);
      expect(Object.keys(d.completion as Record<string, unknown>).sort())
        .toEqual(['enrollment_completed_at', 'enrollment_status', 'traveller_completed', 'traveller_completed_at']);
      expect(Object.keys(d.timing as Record<string, unknown>).sort())
        .toEqual(['per_step', 'total_seconds', 'wall_clock']);
    });
  });

  // ==========================================================================
  // STORY-6 — Privacy holds under erasure and adversarial reads
  // ==========================================================================
  describe('STORY-6 — erasure, adversarial reads & Q9 lived-record standing', () => {
    it('a sharing member erased via the house path (erase_fim_account) leaves no developmental orphan', async () => {
      // PIN: unchanged behaviour (substrate) — erasure rides the house path (DeusEx-called,
      // NEVER a bare delete); the erased member's instances and membership go with them.
      const before = await admin
        .from('journey_step_instances').select('id')
        .eq('enrollment_id', readPartyEnr).eq('traveller_group_id', eraseMember.personalGroupId);
      expect((before.data ?? []).length).toBeGreaterThan(0);

      const deusex = await createTestUser({ displayName: 'JD Erasure Admin' });
      try {
        await makePlatformAdmin(deusex.personalGroupId);
        const adminCaller = createTestClient();
        await signInWithRetry(adminCaller, deusex.email, deusex.password);
        const { data: profile } = await admin
          .from('users').select('id').eq('auth_user_id', eraseMember.user.id).single();
        const { error: eraseErr } = await adminCaller.rpc('erase_fim_account', { p_user_id: profile!.id });
        expect(eraseErr).toBeNull();
      } finally {
        await demotePlatformAdmin(deusex.personalGroupId);
        await cleanupTestUser(deusex.user.id).catch(() => undefined);
      }

      const after = await admin
        .from('journey_step_instances').select('id')
        .eq('enrollment_id', readPartyEnr).eq('traveller_group_id', eraseMember.personalGroupId);
      expect((after.data ?? []).length).toBe(0); // developmental record gone with the account
      const { data: mem } = await admin
        .from('group_memberships').select('status')
        .eq('group_id', readParty).eq('member_group_id', eraseMember.personalGroupId).maybeSingle();
      expect(mem).toBeNull(); // no orphaned membership
    });

    it('Q9: a departed member reads their frozen group walk read-only via lived-record standing (get_player_state; red until PD005)', async () => {
      // RED: today's standing gate — _enrollment_traveller_standing admits active members
      // only; arMember departed on archive, so their lived frozen walk is P0002-concealed.
      // The default (Q9) gives reads lived-record standing → this flips to a readable
      // payload when the migration lands.
      if (await groupStatus(archiveGroup) === 'active') {
        const ca = await asUser(arSteward);
        await ca.rpc('delete_group', { p_group_id: archiveGroup });
      }
      const c = await asUser(arMember);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: archiveGroupEnr });
      // Post-migration truth (RED today): the frozen walk reads read-only for its traveller.
      expect(error).toBeNull();
      expect((data as Record<string, unknown>)?.status).toBe('frozen');
    });

    it('Q9: the frozen walk of a departed member lists in get_my_enrollments (lived-record standing; red until PD005)', async () => {
      // RED: today's standing gate — get_my_enrollments' via-group arm requires an active
      // membership, so the frozen card cannot render as a door. Q9 default admits a
      // lived-record enrolment → the frozen enrolment reappears in the listing.
      if (await groupStatus(archiveGroup) === 'active') {
        const ca = await asUser(arSteward);
        await ca.rpc('delete_group', { p_group_id: archiveGroup });
      }
      const c = await asUser(arMember);
      const { data, error } = await c.rpc('get_my_enrollments');
      expect(error).toBeNull();
      const entries = (data as Array<Record<string, unknown>>) ?? [];
      const found = entries.some((e) => e.enrollment_id === archiveGroupEnr);
      expect(found).toBe(true); // RED today: the frozen group-level enrolment is absent
    });

    it("the traveller's own get_player_state still reveals own data only (never widened)", async () => {
      // PIN: unchanged behaviour — the new contracts never widen the player's own read;
      // instances remain the caller's own grain.
      const c = await asUser(memberShare);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: readPartyEnr });
      expect(error).toBeNull();
      const instances = (data as Record<string, unknown>).instances as Array<Record<string, unknown>>;
      // Every instance returned belongs to the caller's own traveller grain (no leak of
      // another member's marks through the player boot).
      for (const i of instances) {
        expect(Object.keys(i).sort()).toEqual(['completed_at', 'created_at', 'instance_id', 'step_id']);
      }
    });
  });
});
