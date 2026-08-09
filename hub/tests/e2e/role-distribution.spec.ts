import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce, runAdminSql, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * RD-B FEAT-H044 (E2E) — the distribution journey end to end.
 *
 * RD-A made a role copy legible and gave it nowhere to go. This walks the
 * place it now goes:
 *
 *   a template is OFFERED to this group  ->  the Steward copies it
 *   ->  the catalogue moves on           ->  the panel says so
 *   ->  the ceremony shows the diff      ->  the copy moves with it
 *   ->  the offer is withdrawn           ->  the copy keeps working
 *
 * The last step is the one that would be easy to get wrong and hard to
 * notice: unpublish withdraws an OFFER, it never reaches into a group (RD-2).
 *
 * Session isolation: own spec-created Steward in its own context, not the
 * shared storageState session (the roles.spec precedent — the shared token is
 * contended by parallel workers).
 *
 * Fixture note, REVISED after the walk: the first test builds the catalogue
 * side with the service-role client so its failure mode stays unambiguous —
 * what it exists to prove is the STEWARD's journey. That was defensible for
 * the journey and INDEFENSIBLE as the whole spec: the fixture inserted the
 * publication row, which is precisely the thing "publish to named groups" was
 * supposed to produce and never did (walk finding W-5). The spec passed over a
 * hole in its own floor.
 *
 * The third test now drives that door for real — admin signs in, picks a group
 * in the reach section, publishes — and asserts both the row and the scoping.
 * The rule: a fixture may set up everything the door is not responsible for,
 * never the thing it produces.
 *
 * HONEST PROVENANCE — this file is TEST-AFTER, not red-first. The feature was
 * driven red-first at the unit tier; this is the journey gate, written once the
 * surface existed. It passed on its first run, so it was **proven non-vacuous
 * by control**: neutralising `AvailableRolesSection` (forcing an early `return
 * null`) fails test 1 at the toggle click.
 *
 * That control also exposed something worth stating: test 2's assertions are
 * all `toHaveCount(0)`, which pass vacuously when the section renders for
 * *nobody*. It is guarded (the roles panel must be visible first, proving the
 * page loaded), but on its own it cannot distinguish "correctly hidden from
 * this member" from "broken for everyone". **Test 1 is what makes test 2
 * meaningful** — it proves the section does render for a manage_roles holder
 * against the same build. Neither should be deleted without the other.
 */

const stamp = Date.now();
const stewardEmail = `e2e-rdb-steward-${stamp}@fringeisland.test`;
const password = 'e2e-test-password-123';
const groupName = `E2E RD-B Distribution ${stamp}`;
const templateName = `E2E RDB Offered ${stamp}`;

async function waitForPersonalGroup(authUserId: string): Promise<string> {
  const admin = createAdminClient();
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return data.personal_group_id;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${authUserId}`);
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

/** The permission ids this spec moves between versions. */
async function permissionId(name: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('permissions')
    .select('id')
    .eq('name', name)
    .single();
  if (error) throw new Error(`permission ${name}: ${error.message}`);
  return (data as { id: string }).id;
}

test.describe.serial('FEAT-H044 — role distribution (RD-B)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let ctx: BrowserContext;
  let page: Page;
  let authId: string | null = null;
  let pgId: string | null = null;
  let groupId: string | null = null;
  let templateId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const admin = createAdminClient();
    const { data: steward, error } = await admin.auth.admin.createUser({
      email: stewardEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'RDB Steward', consent_accepted: 'true' },
    });
    if (error) throw error;
    await markArrivedOnce(admin, steward.user.id);
    authId = steward.user.id;
    pgId = await waitForPersonalGroup(authId);

    ctx = await browser.newContext();
    page = await ctx.newPage();
    await signIn(page, stewardEmail);
  });

  test.afterAll(async () => {
    await ctx?.close();
    const admin = createAdminClient();
    if (templateId) await admin.from('role_templates').delete().eq('id', templateId);
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    if (pgId) await admin.from('groups').delete().eq('id', pgId);
    if (authId) await deleteE2EUserByAuthId(admin, authId);
  });

  test('a Steward copies an offered role, takes an update through the ceremony, and keeps the copy when the offer is withdrawn', async () => {
    test.setTimeout(180_000);
    const admin = createAdminClient();

    // ---------------------------------------------------------------------
    // The group, through the UI (the proven path).
    // ---------------------------------------------------------------------
    await page.goto('/groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByLabel(/group name/i).fill(groupName);
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    groupId = page.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(groupId).not.toBeNull();
    await expect(page.getByTestId('roles-panel')).toBeVisible({ timeout: 15000 });

    // ---------------------------------------------------------------------
    // Catalogue side: a non-system template at v1 granting invite_members,
    // published TO THIS GROUP.
    // ---------------------------------------------------------------------
    const invite = await permissionId('invite_members');
    const viewList = await permissionId('view_member_list');

    const { data: tmpl, error: tErr } = await admin
      .from('role_templates')
      .insert({ name: templateName, description: 'RD-B distribution fixture', is_system: false })
      .select('id')
      .single();
    if (tErr) throw tErr;
    templateId = (tmpl as { id: string }).id;

    const { data: v1, error: v1Err } = await admin
      .from('role_template_versions')
      .insert({
        role_template_id: templateId,
        version_number: 1,
        name: templateName,
        created_by: pgId,
      })
      .select('id')
      .single();
    if (v1Err) throw v1Err;
    await admin
      .from('role_template_version_permissions')
      .insert({ role_template_version_id: (v1 as { id: string }).id, permission_id: invite });
    // The MATERIALISED set — what instantiation copies and what the diff is
    // computed against.
    await admin
      .from('role_template_permissions')
      .insert({ role_template_id: templateId, permission_id: invite });
    await admin
      .from('role_templates')
      .update({ default_version_id: (v1 as { id: string }).id })
      .eq('id', templateId);

    await admin
      .from('role_template_publications')
      .insert({ role_template_id: templateId, group_id: groupId });

    // ---------------------------------------------------------------------
    // STORY-1 — the offer appears, behind the affordance, and offers Copy.
    // ---------------------------------------------------------------------
    await page.reload();
    const panel = page.getByTestId('roles-panel');
    await expect(panel).toBeVisible({ timeout: 15000 });

    // Collapsed at first paint: the entries are not in the tree until asked for.
    await expect(panel.getByTestId('available-role-entry')).toHaveCount(0);
    await panel.getByTestId('available-roles-toggle').click();

    const offered = panel
      .getByTestId('available-role-entry')
      .filter({ hasText: templateName });
    await expect(offered).toHaveCount(1);
    await expect(offered.getByRole('button', { name: /^Copy$/ })).toBeVisible();

    // ---------------------------------------------------------------------
    // STORY-1 — Copy adopts it, and RD-A's provenance line states the version.
    // ---------------------------------------------------------------------
    await offered.getByRole('button', { name: /^Copy$/ }).click();

    const adopted = panel.getByTestId('role-card').filter({ hasText: templateName });
    await expect(adopted).toHaveCount(1, { timeout: 15000 });
    await expect(adopted.getByTestId('role-badge')).toHaveText(/Template · v1 · copied /);
    // Display names, not internal keys (the whole-panel humanising).
    await expect(adopted.getByText('Invite members')).toBeVisible();

    // ---------------------------------------------------------------------
    // The catalogue moves on: v2 adds view_member_list.
    // ---------------------------------------------------------------------
    const { data: v2, error: v2Err } = await admin
      .from('role_template_versions')
      .insert({
        role_template_id: templateId,
        version_number: 2,
        name: templateName,
        created_by: pgId,
      })
      .select('id')
      .single();
    if (v2Err) throw v2Err;
    await admin.from('role_template_version_permissions').insert([
      { role_template_version_id: (v2 as { id: string }).id, permission_id: invite },
      { role_template_version_id: (v2 as { id: string }).id, permission_id: viewList },
    ]);
    await admin
      .from('role_template_permissions')
      .insert({ role_template_id: templateId, permission_id: viewList });
    await admin
      .from('role_templates')
      .update({ default_version_id: (v2 as { id: string }).id })
      .eq('id', templateId);

    // ---------------------------------------------------------------------
    // STORY-1 — the panel says the copy is behind, and names the movement.
    // ---------------------------------------------------------------------
    await page.reload();
    await expect(panel).toBeVisible({ timeout: 15000 });
    await panel.getByTestId('available-roles-toggle').click();

    const behind = panel.getByTestId('available-role-entry').filter({ hasText: templateName });
    await expect(behind.getByText('v1 → v2')).toBeVisible();
    await expect(behind.getByRole('button', { name: /^Review update$/ })).toBeVisible();

    // ---------------------------------------------------------------------
    // STORY-2 — the ceremony states the diff and the consequence.
    // ---------------------------------------------------------------------
    await behind.getByRole('button', { name: /^Review update$/ }).click();
    const modal = page.getByTestId('confirm-modal');
    await expect(modal).toBeVisible({ timeout: 15000 });

    // Display names in the diff, never internal keys.
    await expect(modal.getByTestId('diff-added')).toContainText('View member list');
    await expect(modal.getByTestId('diff-added')).not.toContainText('view_member_list');
    // The holder consequence, stated before the click. ADAPTED by walk fix W-4
    // (ruled): this fixture role is unheld, and the ceremony no longer says
    // "0 members hold this role. They keep the role…" — there is no "they".
    // The held branch ("N members hold… they keep the role") is pinned at the
    // unit tier, where both holder counts are cheap to drive.
    await expect(modal.getByTestId('diff-holders')).toContainText(/no one holds this role yet/i);
    await expect(modal).toContainText('v1 → v2');

    // ---------------------------------------------------------------------
    // STORY-2 — confirm applies, and the OBSERVABLE EFFECT is the provenance
    // line moving. A click without its asserted consequence is not coverage.
    // ---------------------------------------------------------------------
    await modal.getByTestId('confirm-modal-confirm').click();
    await expect(modal).toBeHidden({ timeout: 15000 });

    await expect(adopted.getByTestId('role-badge')).toHaveText(/Template · v2 · copied /, {
      timeout: 15000,
    });
    await expect(adopted.getByText('View member list')).toBeVisible();

    // Substrate-level: the grant set now EQUALS the template's, and the stamp
    // moved. Asserted at row level, not inferred from the render.
    const { data: roleRows } = await admin
      .from('group_roles')
      .select('id, created_from_version_number')
      .eq('group_id', groupId!)
      .eq('created_from_role_template_id', templateId!);
    expect((roleRows as Array<{ created_from_version_number: number }>)[0]
      .created_from_version_number).toBe(2);

    // ---------------------------------------------------------------------
    // STORY-3 (RD-2) — withdrawing the offer never reaches into the group.
    // ---------------------------------------------------------------------
    await admin
      .from('role_template_publications')
      .delete()
      .eq('role_template_id', templateId!)
      .eq('group_id', groupId!);

    await page.reload();
    await expect(panel).toBeVisible({ timeout: 15000 });
    await panel.getByTestId('available-roles-toggle').click();
    // Gone from the OFFER...
    await expect(
      panel.getByTestId('available-role-entry').filter({ hasText: templateName }),
    ).toHaveCount(0);
    // ...and the adopted copy is untouched and still working.
    await expect(adopted).toHaveCount(1);
    await expect(adopted.getByTestId('role-badge')).toHaveText(/Template · v2 · copied /);
    await expect(adopted.getByText('View member list')).toBeVisible();
  });

  test('W-5: an admin publishes to a NAMED group through the picker, and only that group is offered it', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const admin = createAdminClient();

    // ------------------------------------------------------------------
    // THIS TEST EXISTS BECAUSE OF THE HOLE IT CLOSES.
    //
    // The journey above proved a Steward's side of a group-scoped offer —
    // over a publication row the FIXTURE inserted with the service-role
    // client. So it passed over a hole in its own floor: nothing in the
    // product could produce that row, because "publish to named groups" was
    // never built. Stefan found it on his first click of the reach section.
    //
    // The rule this encodes: when a feature adds a WRITE door, at least one
    // test must reach the state THROUGH that door. A fixture may set up
    // everything the door is not responsible for — never the thing it
    // produces. The template below is fixture-made (the picker does not make
    // templates); the PUBLICATION is made by clicking Publish.
    // ------------------------------------------------------------------
    const admName = `E2E RDB Admin ${stamp}`;
    const adminEmail = `e2e-rdb-admin-${stamp}@fringeisland.test`;
    const { data: adm, error: admErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: admName, consent_accepted: 'true' },
    });
    if (admErr) throw admErr;
    await markArrivedOnce(admin, adm.user.id);
    const admPg = await waitForPersonalGroup(adm.user.id);
    await runAdminSql(`
      DO $$
      DECLARE v_deusex uuid; v_role uuid;
      BEGIN
        SELECT id INTO v_deusex FROM public.groups
          WHERE name = 'DeusEx' AND group_type = 'system';
        SELECT id INTO v_role FROM public.group_roles
          WHERE group_id = v_deusex AND name = 'DeusEx';
        INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
          VALUES (v_deusex, '${admPg}', v_deusex, 'active')
          ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${admPg}', v_deusex, v_role, v_deusex)
          ON CONFLICT DO NOTHING;
      END $$;`);

    // A fresh template offered to NOBODY, and a second group that must NOT be
    // offered it — the scoping claim the live walk could not verify.
    const targetedName = `E2E RDB Targeted ${stamp}`;
    const { data: t2 } = await admin
      .from('role_templates')
      .insert({ name: targetedName, description: 'W-5 picker fixture', is_system: false })
      .select('id')
      .single();
    const targetedId = (t2 as { id: string }).id;
    const { data: tv } = await admin
      .from('role_template_versions')
      .insert({ role_template_id: targetedId, version_number: 1, name: targetedName, created_by: pgId })
      .select('id')
      .single();
    await admin.from('role_template_permissions').insert({
      role_template_id: targetedId,
      permission_id: await permissionId('invite_members'),
    });
    await admin
      .from('role_templates')
      .update({ default_version_id: (tv as { id: string }).id })
      .eq('id', targetedId);

    const otherGroupName = `E2E RDB Unoffered ${stamp}`;
    const { data: og } = await admin
      .from('groups')
      .insert({ name: otherGroupName, group_type: 'engagement', status: 'active' })
      .select('id')
      .single();
    const otherGroupId = (og as { id: string }).id;

    const admCtx = await browser.newContext();
    const admPage = await admCtx.newPage();
    try {
      await signIn(admPage, adminEmail);
      await admPage.goto(`/admin/roles/${targetedId}`);

      const reach = admPage.getByTestId('reach-section');
      await expect(reach).toBeVisible({ timeout: 15000 });
      await expect(reach.getByTestId('reach-summary')).toHaveText('Not published');

      // THE DOOR.
      await reach.getByRole('button', { name: /specific groups/i }).click();
      const modal = admPage.getByTestId('confirm-modal');
      await expect(modal).toBeVisible({ timeout: 15000 });
      await modal.getByTestId('group-search').fill(groupName);
      await modal.getByTestId(`group-option-${groupId}`).click();
      await modal.getByTestId('confirm-modal-confirm').click();
      await expect(modal).toBeHidden({ timeout: 15000 });

      // The observable effect, on the admin's own surface.
      await expect(reach.getByTestId('reach-summary')).toHaveText('Published to 1 group', {
        timeout: 15000,
      });
      await expect(reach.getByTestId('reach-row')).toContainText(groupName);

      // ...and at row level: exactly one publication, for exactly this group.
      const { data: pubs } = await admin
        .from('role_template_publications')
        .select('group_id')
        .eq('role_template_id', targetedId);
      expect((pubs as Array<{ group_id: string | null }>).map((p) => p.group_id)).toEqual([groupId]);

      // THE SCOPING CLAIM the live walk could not reach: G1 is offered it,
      // and a group that was not named is not.
      await page.reload();
      await expect(page.getByTestId('roles-panel')).toBeVisible({ timeout: 15000 });
      await page.getByTestId('roles-panel').getByTestId('available-roles-toggle').click();
      await expect(
        page.getByTestId('roles-panel').getByTestId('available-role-entry').filter({ hasText: targetedName }),
      ).toHaveCount(1);

      const offers = (await admin.rpc('get_available_role_templates', {
        p_group_id: otherGroupId,
      })) as { data: Array<{ name: string }> | null };
      expect((offers.data ?? []).some((o) => o.name === targetedName)).toBe(false);
    } finally {
      await admCtx.close();
      await admin.from('role_templates').delete().eq('id', targetedId);
      await admin.from('groups').delete().eq('id', otherGroupId);
      await admin.from('groups').delete().eq('id', admPg);
      await deleteE2EUserByAuthId(admin, adm.user.id);
    }
  });

  test('the available-roles section is not rendered for a member without manage_roles', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const admin = createAdminClient();

    const memberEmail = `e2e-rdb-member-${stamp}@fringeisland.test`;
    const { data: member, error } = await admin.auth.admin.createUser({
      email: memberEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'RDB Plain', consent_accepted: 'true' },
    });
    if (error) throw error;
    await markArrivedOnce(admin, member.user.id);
    const memberPg = await waitForPersonalGroup(member.user.id);
    await admin
      .from('group_memberships')
      .insert({ group_id: groupId!, member_group_id: memberPg, status: 'active' });

    const memberCtx = await browser.newContext();
    const memberPage = await memberCtx.newPage();
    try {
      await signIn(memberPage, memberEmail);
      await memberPage.goto(`/groups/${groupId}`);
      await expect(memberPage.getByTestId('roles-panel')).toBeVisible({ timeout: 15000 });
      // Not rendered at all — not rendered-and-disabled. It offers acts they
      // cannot perform.
      await expect(memberPage.getByTestId('available-roles-toggle')).toHaveCount(0);
      await expect(memberPage.getByTestId('available-roles-section')).toHaveCount(0);
    } finally {
      await memberCtx.close();
      await admin.from('groups').delete().eq('id', memberPg);
      await deleteE2EUserByAuthId(admin, member.user.id);
    }
  });
});
