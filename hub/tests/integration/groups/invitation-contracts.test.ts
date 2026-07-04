import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  generateTestEmail,
  runAdminSql,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/** One hit in the search_invitable_members payload. */
type SearchHit = {
  member_group_id: string;
  display_name: string;
  membership_status: string | null;
};

/** get_group_invitations payload shape asserted by this suite. */
type PendingShape = {
  group_id: string;
  member_invitations: Array<{
    member_group_id: string;
    display_name: string;
    invited_at: string;
    invited_by_display_name: string | null;
  }>;
  email_invitations: Array<{
    id: string;
    invited_email: string;
    created_at: string;
    expires_at: string;
    expired: boolean;
  }>;
};

/** One entry in the get_my_invitations payload. */
type MyInvitation = {
  group_id: string;
  group_name: string;
  group_description: string | null;
  is_public: boolean;
  invited_at: string;
  invited_by_display_name: string | null;
};

const GHOST = '00000000-0000-0000-0000-00000000dead';

/** Promote a personal group to platform admin (the fim-account-erasure suite's
 *  pattern, reused): active DeusEx member + DeusEx role — Tier-1 grants
 *  manage_all_groups context-free. Direct active insert bypasses
 *  auto_assign_deusex_role_on_accept, so the role is inserted explicitly. */
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
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
    END $$;`).catch(() => undefined);
}

/**
 * FEAT-PC012 (Groups Cycle G-C) — invitation & joining contracts.
 * Red-first: every new-contract rpc() test fails PGRST202 (functions absent)
 * until the migration lands. STORY-6's erasure asserts are red-first too —
 * pending email invitation rows SURVIVE erase_fim_account until the amendment.
 *
 * Labelled honestly (not red-first):
 *  - STORY-7's direct-path asserts — the story verifies the EXISTING RLS
 *    refuses what the contracts refuse ("verified, not assumed"), so most are
 *    green-before-migration by design. The TRUNCATE revokes are verified by
 *    SQL audit at the schema gate (PostgREST exposes no TRUNCATE verb).
 *  - The auto-claim substrate asserts inside STORY-3/5 — handle_new_user
 *    Step 8 is existing PC-2 substrate; the arc test exercises it end-to-end,
 *    it does not introduce it.
 */
describe('FEAT-PC012 — group invitation & joining contracts (G-C)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let inviter: TestUser; // holds invite_members ONLY (admin-seeded custom role)
  let plainMember: TestUser; // active member, no role, no permissions
  let invitee: TestUser; // FIM, not a member — the search/invite target
  let invitee2: TestUser; // FIM — decline/re-invite + direct self-accept flows
  let outsider: TestUser; // FIM, never a member
  let suspendedInviter: TestUser; // invite_members holder, then is_active=false

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Steward bootstraps a PRIVATE group; plainMember, inviter, suspendedInviter
   *  join active; 'GC Inviter' role (invite_members only — the minimal-permission
   *  persona; no matching '... Role Template' exists, so the auto-link path stays
   *  cold) is bound to inviter + suspendedInviter. */
  const seedGroup = async (name: string) => {
    const c = await asUser(steward);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);

    for (const member of [plainMember, inviter, suspendedInviter]) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }

    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'invite_members')
      .single();
    const { data: role, error: rErr } = await admin
      .from('group_roles')
      .insert({ group_id: groupId, name: 'GC Inviter' })
      .select('id')
      .single();
    if (rErr) throw new Error(`seedGroup inviter role: ${rErr.message}`);
    const { error: gErr } = await admin
      .from('group_role_permissions')
      .insert({ group_role_id: role!.id, permission_id: perm!.id });
    if (gErr) throw new Error(`seedGroup inviter grant: ${gErr.message}`);
    for (const holder of [inviter, suspendedInviter]) {
      const { error: bErr } = await admin.from('user_group_roles').insert({
        member_group_id: holder.personalGroupId,
        group_id: groupId,
        group_role_id: role!.id,
        assigned_by_group_id: steward.personalGroupId,
      });
      if (bErr) throw new Error(`seedGroup inviter binding: ${bErr.message}`);
    }
    return groupId as string;
  };

  beforeAll(async () => {
    // Single-token display names: the substrate's display identity (the
    // personal-group name) is the FIRST WORD of display_name (handle_new_user
    // nickname default) — multi-word names would all collapse to 'GC'.
    steward = await createTestUser({ displayName: 'GCSteward' });
    inviter = await createTestUser({ displayName: 'GCInviterPerson' });
    plainMember = await createTestUser({ displayName: 'GCPlainMember' });
    invitee = await createTestUser({ displayName: 'GCFindmeTarget' });
    invitee2 = await createTestUser({ displayName: 'GCFindmeSecond' });
    outsider = await createTestUser({ displayName: 'GCOutsider' });
    suspendedInviter = await createTestUser({ displayName: 'GCFindmeSuspended' });
    for (const u of [steward, inviter, plainMember, invitee, invitee2, outsider, suspendedInviter]) {
      createdUserIds.push(u.user.id);
    }
    await admin.from('users').update({ is_active: false }).eq('auth_user_id', suspendedInviter.user.id);
  }, 120_000);

  afterAll(async () => {
    for (const g of createdGroupIds) await cleanupTestGroup(g);
    for (const id of createdUserIds) await cleanupTestUser(id);
  }, 120_000);

  // -------------------------------------------------------------------------
  // STORY-1 — search_invitable_members (the D3 / DS-6 re-home seam)
  // -------------------------------------------------------------------------
  describe('STORY-1: find a member to invite', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup('GC S1 Search Group');
    });

    it('name-partial match returns invitable FIMs with status, capped, no emails', async () => {
      const c = await asUser(inviter);
      const { data, error } = await c.rpc('search_invitable_members', {
        p_group_id: groupId,
        p_query: 'GCFindme',
      });
      expect(error).toBeNull();
      const hits = data as SearchHit[];
      expect(Array.isArray(hits)).toBe(true);
      expect(hits.length).toBeLessThanOrEqual(8);
      const names = hits.map((h) => h.display_name);
      expect(names).toContain('GCFindmeTarget');
      // Suspended accounts never appear (spec STORY-1 AC-3)
      expect(names).not.toContain('GCFindmeSuspended');
      for (const h of hits) {
        expect(Object.keys(h).sort()).toEqual(
          ['display_name', 'member_group_id', 'membership_status'].sort(),
        );
      }
      const target = hits.find((h) => h.member_group_id === invitee.personalGroupId);
      expect(target?.membership_status).toBeNull();
    });

    it('membership status rides the hit: active member shows active', async () => {
      const c = await asUser(inviter);
      const { data, error } = await c.rpc('search_invitable_members', {
        p_group_id: groupId,
        p_query: 'GCPlainMember',
      });
      expect(error).toBeNull();
      const hit = (data as SearchHit[]).find(
        (h) => h.member_group_id === plainMember.personalGroupId,
      );
      expect(hit?.membership_status).toBe('active');
    });

    it('exact email matches; partial email does not (enumeration-hardening, Open Q1)', async () => {
      const c = await asUser(inviter);
      const exact = await c.rpc('search_invitable_members', {
        p_group_id: groupId,
        p_query: invitee.email.toUpperCase(),
      });
      expect(exact.error).toBeNull();
      expect(
        (exact.data as SearchHit[]).some((h) => h.member_group_id === invitee.personalGroupId),
      ).toBe(true);

      const partial = await c.rpc('search_invitable_members', {
        p_group_id: groupId,
        p_query: invitee.email.slice(0, invitee.email.indexOf('@')),
      });
      expect(partial.error).toBeNull();
      // The local-part is unique to the generated address — a name it can match
      // is none; a partial-email match would surface the invitee here.
      expect(
        (partial.data as SearchHit[]).some((h) => h.member_group_id === invitee.personalGroupId),
      ).toBe(false);
    });

    it('gates: plain member 42501, non-member P0002 (private), Mist 42501, empty query 22023', async () => {
      const cm = await asUser(plainMember);
      const denied = await cm.rpc('search_invitable_members', { p_group_id: groupId, p_query: 'x' });
      expect(denied.error?.code).toBe('42501');

      const co = await asUser(outsider);
      const hidden = await co.rpc('search_invitable_members', { p_group_id: groupId, p_query: 'x' });
      expect(hidden.error?.code).toBe('P0002');

      const cmist = createTestClient();
      const { error: anonErr } = await withAnonRateLimitRetry(() => cmist.auth.signInAnonymously());
      expect(anonErr).toBeNull();
      const mistDenied = await cmist.rpc('search_invitable_members', {
        p_group_id: groupId,
        p_query: 'x',
      });
      expect(mistDenied.error?.code).toBe('42501');

      const ci = await asUser(inviter);
      const empty = await ci.rpc('search_invitable_members', { p_group_id: groupId, p_query: '  ' });
      expect(empty.error?.code).toBe('22023');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-2 — invite_member
  // -------------------------------------------------------------------------
  describe('STORY-2: invite an existing FIM', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup('GC S2 Invite Group');
    });

    it('invite_members holder invites a FIM: invited row + provenance + durable notification', async () => {
      const c = await asUser(inviter);
      const { error } = await c.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: invitee.personalGroupId,
      });
      expect(error).toBeNull();

      const { data: row } = await admin
        .from('group_memberships')
        .select('status, added_by_group_id')
        .eq('group_id', groupId)
        .eq('member_group_id', invitee.personalGroupId)
        .single();
      expect(row?.status).toBe('invited');
      expect(row?.added_by_group_id).toBe(inviter.personalGroupId);

      const { data: notif } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', invitee.personalGroupId)
        .eq('group_id', groupId)
        .eq('type', 'invitation_received');
      expect((notif ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it('duplicate invite and already-active member both refuse 23505', async () => {
      const c = await asUser(inviter);
      const dup = await c.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: invitee.personalGroupId,
      });
      expect(dup.error?.code).toBe('23505');
      const activeDup = await c.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
      });
      expect(activeDup.error?.code).toBe('23505');
    });

    it('non-invitable targets are P0002, indistinguishably (ghost, engagement group, Mist proto-group)', async () => {
      const c = await asUser(inviter);
      const ghost = await c.rpc('invite_member', { p_group_id: groupId, p_member_group_id: GHOST });
      expect(ghost.error?.code).toBe('P0002');

      // an engagement group id is not a personal group
      const asGroup = await c.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: groupId,
      });
      expect(asGroup.error?.code).toBe('P0002');

      const cmist = createTestClient();
      const { data: anonData, error: anonErr } = await withAnonRateLimitRetry(() =>
        cmist.auth.signInAnonymously(),
      );
      expect(anonErr).toBeNull();
      // wait for the Mist's proto personal group to materialise
      let mistGroupId: string | undefined;
      for (let i = 0; i < 12 && !mistGroupId; i++) {
        const { data: mu } = await admin
          .from('users')
          .select('personal_group_id')
          .eq('auth_user_id', anonData.user!.id)
          .maybeSingle();
        mistGroupId = (mu?.personal_group_id as string) ?? undefined;
        if (!mistGroupId) await new Promise((r) => setTimeout(r, 500));
      }
      expect(mistGroupId).toBeDefined();
      const mistTarget = await c.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: mistGroupId,
      });
      expect(mistTarget.error?.code).toBe('P0002');
    });

    it('gates: plain member 42501; suspended inviter 42501; ghost group P0002', async () => {
      const cm = await asUser(plainMember);
      const denied = await cm.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: invitee2.personalGroupId,
      });
      expect(denied.error?.code).toBe('42501');

      const cs = await asUser(suspendedInviter);
      const suspended = await cs.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: invitee2.personalGroupId,
      });
      expect(suspended.error?.code).toBe('42501');

      const ci = await asUser(inviter);
      const ghostGroup = await ci.rpc('invite_member', {
        p_group_id: GHOST,
        p_member_group_id: invitee2.personalGroupId,
      });
      expect(ghostGroup.error?.code).toBe('P0002');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-3 — invite_by_email (durable, claimable, undispatched — D4)
  // -------------------------------------------------------------------------
  describe('STORY-3: invite by email', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup('GC S3 Email Group');
    });

    it('fresh email: durable pending row, ~30-day expiry, inviter provenance', async () => {
      const email = generateTestEmail('gc-s3-fresh');
      const c = await asUser(inviter);
      const { data, error } = await c.rpc('invite_by_email', {
        p_group_id: groupId,
        p_email: email,
      });
      expect(error).toBeNull();
      expect((data as { kind: string }).kind).toBe('email_invitation');

      const { data: row } = await admin
        .from('pending_email_invitations')
        .select('status, invited_by_group_id, expires_at')
        .eq('group_id', groupId)
        .eq('invited_email', email.toLowerCase())
        .single();
      expect(row?.status).toBe('pending');
      expect(row?.invited_by_group_id).toBe(inviter.personalGroupId);
      const days = (new Date(row!.expires_at as string).getTime() - new Date().getTime()) / 86400000;
      expect(days).toBeGreaterThan(29);
      expect(days).toBeLessThan(31);
    });

    it('duplicate (case-insensitive) 23505; malformed email 22023', async () => {
      const email = generateTestEmail('gc-s3-dup');
      const c = await asUser(inviter);
      await c.rpc('invite_by_email', { p_group_id: groupId, p_email: email });
      const dup = await c.rpc('invite_by_email', {
        p_group_id: groupId,
        p_email: email.toUpperCase(),
      });
      expect(dup.error?.code).toBe('23505');

      const bad = await c.rpc('invite_by_email', { p_group_id: groupId, p_email: 'not-an-email' });
      expect(bad.error?.code).toBe('22023');
    });

    it('existing-FIM email converts server-side to a membership invitation (Open Q2)', async () => {
      const c = await asUser(inviter);
      const { data, error } = await c.rpc('invite_by_email', {
        p_group_id: groupId,
        p_email: outsider.email.toUpperCase(),
      });
      expect(error).toBeNull();
      expect((data as { kind: string }).kind).toBe('member_invitation');

      const { data: membership } = await admin
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId)
        .eq('member_group_id', outsider.personalGroupId)
        .single();
      expect(membership?.status).toBe('invited');

      const { data: emailRows } = await admin
        .from('pending_email_invitations')
        .select('id')
        .eq('group_id', groupId)
        .ilike('invited_email', outsider.email);
      expect((emailRows ?? []).length).toBe(0);
    });

    it('gates: plain member 42501; suspended 42501; Mist 42501', async () => {
      const email = generateTestEmail('gc-s3-gates');
      const cm = await asUser(plainMember);
      expect(
        (await cm.rpc('invite_by_email', { p_group_id: groupId, p_email: email })).error?.code,
      ).toBe('42501');
      const cs = await asUser(suspendedInviter);
      expect(
        (await cs.rpc('invite_by_email', { p_group_id: groupId, p_email: email })).error?.code,
      ).toBe('42501');
      const cmist = createTestClient();
      await withAnonRateLimitRetry(() => cmist.auth.signInAnonymously());
      expect(
        (await cmist.rpc('invite_by_email', { p_group_id: groupId, p_email: email })).error?.code,
      ).toBe('42501');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-4 — get_group_invitations + cancels
  // -------------------------------------------------------------------------
  describe('STORY-4: see and tend the pending list', () => {
    let groupId: string;
    let pendingEmail: string;
    beforeAll(async () => {
      groupId = await seedGroup('GC S4 Pending Group');
      const c = await asUser(inviter);
      await c.rpc('invite_member', { p_group_id: groupId, p_member_group_id: invitee.personalGroupId });
      pendingEmail = generateTestEmail('gc-s4-pending');
      await c.rpc('invite_by_email', { p_group_id: groupId, p_email: pendingEmail });
      // an already-expired email invitation, seeded directly (predicate-based expiry)
      await admin.from('pending_email_invitations').insert({
        group_id: groupId,
        invited_email: generateTestEmail('gc-s4-expired').toLowerCase(),
        invited_by_group_id: inviter.personalGroupId,
        expires_at: new Date(new Date().getTime() - 86400000).toISOString(),
      });
    });

    it('both kinds render with their fields; expiry is an honest payload flag', async () => {
      const c = await asUser(inviter);
      const { data, error } = await c.rpc('get_group_invitations', { p_group_id: groupId });
      expect(error).toBeNull();
      const payload = data as PendingShape;
      expect(payload.group_id).toBe(groupId);

      const member = payload.member_invitations.find(
        (m) => m.member_group_id === invitee.personalGroupId,
      );
      expect(member?.display_name).toBe('GCFindmeTarget');
      expect(member?.invited_by_display_name).toBe('GCInviterPerson');
      expect(member?.invited_at).toBeTruthy();

      const fresh = payload.email_invitations.find((e) => e.invited_email === pendingEmail.toLowerCase());
      expect(fresh?.expired).toBe(false);
      const stale = payload.email_invitations.find((e) => e.invited_email.includes('gc-s4-expired'));
      expect(stale?.expired).toBe(true);
    });

    it('gates: plain member 42501 (third-party emails — Open Q3); non-member P0002', async () => {
      const cm = await asUser(plainMember);
      expect((await cm.rpc('get_group_invitations', { p_group_id: groupId })).error?.code).toBe('42501');
      const co = await asUser(outsider);
      expect((await co.rpc('get_group_invitations', { p_group_id: groupId })).error?.code).toBe('P0002');
    });

    it('cancel_member_invitation and cancel_email_invitation delete; ghosts P0002', async () => {
      const c = await asUser(inviter);
      const { error: cmErr } = await c.rpc('cancel_member_invitation', {
        p_group_id: groupId,
        p_member_group_id: invitee.personalGroupId,
      });
      expect(cmErr).toBeNull();
      const { data: gone } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_group_id', invitee.personalGroupId);
      expect((gone ?? []).length).toBe(0);

      const { data: emailRow } = await admin
        .from('pending_email_invitations')
        .select('id')
        .eq('group_id', groupId)
        .eq('invited_email', pendingEmail.toLowerCase())
        .single();
      const { error: ceErr } = await c.rpc('cancel_email_invitation', {
        p_invitation_id: emailRow!.id,
      });
      expect(ceErr).toBeNull();

      expect(
        (await c.rpc('cancel_member_invitation', { p_group_id: groupId, p_member_group_id: GHOST }))
          .error?.code,
      ).toBe('P0002');
      expect(
        (await c.rpc('cancel_email_invitation', { p_invitation_id: GHOST })).error?.code,
      ).toBe('P0002');
    });

    it('cancel gates: plain member 42501 on both shapes', async () => {
      const ci = await asUser(inviter);
      await ci.rpc('invite_member', { p_group_id: groupId, p_member_group_id: invitee.personalGroupId });
      const cm = await asUser(plainMember);
      expect(
        (
          await cm.rpc('cancel_member_invitation', {
            p_group_id: groupId,
            p_member_group_id: invitee.personalGroupId,
          })
        ).error?.code,
      ).toBe('42501');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-5 — get_my_invitations + accept/decline
  // -------------------------------------------------------------------------
  describe('STORY-5: answer an invitation', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup('GC S5 Answer Group');
      const c = await asUser(inviter);
      await c.rpc('invite_member', { p_group_id: groupId, p_member_group_id: invitee.personalGroupId });
      await c.rpc('invite_member', { p_group_id: groupId, p_member_group_id: invitee2.personalGroupId });
    });

    it('get_my_invitations: the invitation context, nothing more', async () => {
      const c = await asUser(invitee);
      const { data, error } = await c.rpc('get_my_invitations');
      expect(error).toBeNull();
      const mine = (data as MyInvitation[]).find((i) => i.group_id === groupId);
      expect(mine).toBeDefined();
      expect(mine!.group_name).toBe('GC S5 Answer Group');
      expect(mine!.is_public).toBe(false);
      expect(mine!.invited_by_display_name).toBe('GCInviterPerson');
      expect(mine!.invited_at).toBeTruthy();
      expect(Object.keys(mine!).sort()).toEqual(
        [
          'group_id',
          'group_name',
          'group_description',
          'is_public',
          'invited_at',
          'invited_by_display_name',
        ].sort(),
      );
    });

    it('accept: invited→active, Member role auto-bound, group appears in get_member_groups', async () => {
      const c = await asUser(invitee);
      const { error } = await c.rpc('accept_group_invitation', { p_group_id: groupId });
      expect(error).toBeNull();

      const { data: row } = await admin
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId)
        .eq('member_group_id', invitee.personalGroupId)
        .single();
      expect(row?.status).toBe('active');

      const { data: bindings } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_group_id', invitee.personalGroupId);
      expect((bindings ?? []).length).toBeGreaterThanOrEqual(1);

      const { data: groups } = await c.rpc('get_member_groups');
      expect((groups as Array<{ id: string }>).some((g) => g.id === groupId)).toBe(true);

      const { data: notif } = await admin
        .from('notifications')
        .select('id')
        .eq('group_id', groupId)
        .eq('type', 'invitation_accepted');
      expect((notif ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it('decline deletes the row; re-invitation afterwards succeeds', async () => {
      const c = await asUser(invitee2);
      const { error } = await c.rpc('decline_group_invitation', { p_group_id: groupId });
      expect(error).toBeNull();
      const { data: gone } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_group_id', invitee2.personalGroupId);
      expect((gone ?? []).length).toBe(0);

      const ci = await asUser(inviter);
      const reinvite = await ci.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: invitee2.personalGroupId,
      });
      expect(reinvite.error).toBeNull();
    });

    it('no pending invitation → P0002; Mist → 42501', async () => {
      const c = await asUser(outsider);
      expect((await c.rpc('accept_group_invitation', { p_group_id: groupId })).error?.code).toBe('P0002');
      expect((await c.rpc('decline_group_invitation', { p_group_id: groupId })).error?.code).toBe('P0002');

      const cmist = createTestClient();
      await withAnonRateLimitRetry(() => cmist.auth.signInAnonymously());
      expect((await cmist.rpc('get_my_invitations')).error?.code).toBe('42501');
      expect((await cmist.rpc('accept_group_invitation', { p_group_id: groupId })).error?.code).toBe('42501');
    });

    it('the auto-claim arc: email-invited person signs up, the invitation waits, accepting joins (MEM-2 → MEM-3)', async () => {
      const email = generateTestEmail('gc-s5-newcomer');
      const ci = await asUser(inviter);
      const { error: invErr } = await ci.rpc('invite_by_email', {
        p_group_id: groupId,
        p_email: email,
      });
      expect(invErr).toBeNull();

      // sign-up with the matching email — handle_new_user Step 8 auto-claims
      const newcomer = await createTestUser({ email, displayName: 'GCNewcomer' });
      createdUserIds.push(newcomer.user.id);

      const { data: claimed } = await admin
        .from('pending_email_invitations')
        .select('status, claimed_at')
        .eq('group_id', groupId)
        .eq('invited_email', email.toLowerCase())
        .single();
      expect(claimed?.status).toBe('claimed');
      expect(claimed?.claimed_at).toBeTruthy();

      const cn = await asUser(newcomer);
      const { data: mine } = await cn.rpc('get_my_invitations');
      expect((mine as MyInvitation[]).some((i) => i.group_id === groupId)).toBe(true);

      const { error: acceptErr } = await cn.rpc('accept_group_invitation', { p_group_id: groupId });
      expect(acceptErr).toBeNull();
      const { data: groups } = await cn.rpc('get_member_groups');
      expect((groups as Array<{ id: string }>).some((g) => g.id === groupId)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // STORY-6 — erasure closes over invitation rows (red-first: rows SURVIVE
  // erase_fim_account until the PC012 amendment lands)
  // -------------------------------------------------------------------------
  describe('STORY-6: erasure reaches invitation rows', () => {
    let groupId: string;
    let eraser: TestUser;
    let erasureTarget: TestUser;

    beforeAll(async () => {
      groupId = await seedGroup('GC S6 Erasure Group');
      eraser = await createTestUser({ displayName: 'GCEraserAdmin' });
      createdUserIds.push(eraser.user.id);
      await makePlatformAdmin(eraser.personalGroupId);
      erasureTarget = await createTestUser({ displayName: 'GCErasureTarget' });
      // NOT pushed to createdUserIds — erased below; cleanup would double-delete
    }, 60_000);

    afterAll(async () => {
      await demotePlatformAdmin(eraser.personalGroupId);
      // retained-consent rows of the erased target (anonymised) — purge by the
      // fim-account-erasure suite's pattern
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records WHERE subject_group_id IS NULL AND subject_user_id IS NULL ` +
          `AND created_at > NOW() - INTERVAL '1 hour'; END $$;`,
      ).catch(() => undefined);
    });

    it('pending email invitations addressed to the erased email are deleted; sent-by links null out', async () => {
      // an invitation ADDRESSED TO the target's email would have converted
      // (existing FIM) — so seed the addressed-to row directly, the shape a
      // pre-signup invitation has after the person transcended elsewhere.
      await admin.from('pending_email_invitations').insert({
        group_id: groupId,
        invited_email: erasureTarget.email.toLowerCase(),
        invited_by_group_id: inviter.personalGroupId,
      });
      // and one SENT BY the target (they hold no invite_members in this group,
      // so seed via admin — provenance is what's under test, not the gate)
      const bystander = generateTestEmail('gc-s6-bystander');
      await admin.from('pending_email_invitations').insert({
        group_id: groupId,
        invited_email: bystander.toLowerCase(),
        invited_by_group_id: erasureTarget.personalGroupId,
      });

      const ce = await asUser(eraser);
      const { data: profile } = await admin
        .from('users')
        .select('id')
        .eq('auth_user_id', erasureTarget.user.id)
        .single();
      const { error: eraseErr } = await ce.rpc('erase_fim_account', { p_user_id: profile!.id });
      expect(eraseErr).toBeNull();

      const { data: addressed } = await admin
        .from('pending_email_invitations')
        .select('id')
        .eq('invited_email', erasureTarget.email.toLowerCase());
      expect((addressed ?? []).length).toBe(0);

      const { data: sentBy } = await admin
        .from('pending_email_invitations')
        .select('invited_by_group_id')
        .eq('invited_email', bystander.toLowerCase())
        .single();
      expect(sentBy?.invited_by_group_id).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // STORY-7 — no path around the contracts (ADR-U038; green-by-design asserts
  // labelled: the point is that the EXISTING RLS refuses what the contracts
  // refuse — verified, not assumed)
  // -------------------------------------------------------------------------
  describe('STORY-7: adversarial direct paths', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup('GC S7 Direct Group');
      const c = await asUser(inviter);
      await c.rpc('invite_member', { p_group_id: groupId, p_member_group_id: invitee2.personalGroupId });
    });

    it('plain member cannot direct-INSERT an invite; Mist cannot either', async () => {
      const cm = await asUser(plainMember);
      const { error } = await cm.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: outsider.personalGroupId,
        status: 'invited',
        added_by_group_id: plainMember.personalGroupId,
      });
      expect(error).not.toBeNull();

      const cmist = createTestClient();
      await withAnonRateLimitRetry(() => cmist.auth.signInAnonymously());
      const { error: mistErr } = await cmist.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: outsider.personalGroupId,
        status: 'invited',
        added_by_group_id: outsider.personalGroupId,
      });
      expect(mistErr).not.toBeNull();
    });

    it('a third party cannot accept or delete someone else\'s invitation via the direct path', async () => {
      const cm = await asUser(plainMember);
      await cm
        .from('group_memberships')
        .update({ status: 'active' })
        .eq('group_id', groupId)
        .eq('member_group_id', invitee2.personalGroupId);
      await cm
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('member_group_id', invitee2.personalGroupId);

      const { data: still } = await admin
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId)
        .eq('member_group_id', invitee2.personalGroupId)
        .single();
      expect(still?.status).toBe('invited'); // untouched — RLS filtered both writes
    });

    it('pending_email_invitations: invisible and unwritable without invite_members', async () => {
      const cm = await asUser(plainMember);
      const { data: rows } = await cm.from('pending_email_invitations').select('id');
      expect((rows ?? []).length).toBe(0); // RLS: select gated on invite_members

      const { error: insErr } = await cm.from('pending_email_invitations').insert({
        group_id: groupId,
        invited_email: 'direct-path@fringeisland.test',
        invited_by_group_id: plainMember.personalGroupId,
      });
      expect(insErr).not.toBeNull();
    });

    it('direct self-accept and self-decline remain RLS-permitted (substrate-consistent — the contracts compose them)', async () => {
      const c = await asUser(invitee2);
      const { error } = await c
        .from('group_memberships')
        .update({ status: 'active' })
        .eq('group_id', groupId)
        .eq('member_group_id', invitee2.personalGroupId)
        .select()
        .single();
      expect(error).toBeNull();
    });
  });
});
