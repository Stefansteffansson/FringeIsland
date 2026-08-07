import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * The role-template catalogue as a PLATFORM CONTRACT, not a BFF table read.
 *
 * ORIGIN — COR-B W4 (audit II AC2-4). Audit II found one surviving direct
 * table read in the server lib, `fetchRoleTemplates` calling
 * `.from('role_templates')`, while every one of its ~90 siblings went through
 * an RPC. It was never an enforcement hole: `role_templates` carries a SELECT
 * policy (`auth_read_role_templates`, `TO authenticated`, qual TRUE), so the
 * rule lived in the substrate and ADR-U038 clause 1 was satisfied either way.
 * It was a uniformity item, and W4 relocated it to `get_role_templates()`.
 *
 * ADAPTED BY RD-B / FEAT-PC028 (RDB-1) — REPOINTED, NOT WEAKENED.
 * `get_role_templates()` is DROPPED. Scoping the catalogue to a group needs
 * `p_group_id`; a signature change cannot be a COR-A re-issue (that discipline
 * exists so create-or-replace preserves the ACL), and an overload would have
 * let a caller that omitted the argument silently receive the UNSCOPED
 * catalogue — the same footgun RD-B exists to close at the write door. So the
 * zero-arg contract is replaced by `get_available_role_templates(p_group_id)`
 * and this suite follows it.
 *
 * What carries over unchanged: a catalogue read is a contract, it is ordered
 * by name because the picker relies on it, and anon cannot execute it.
 *
 * What legitimately changed, and why each is a real behaviour difference
 * rather than a relaxed assertion:
 *   - the read is now GROUP-SCOPED, so it takes a group and requires
 *     `manage_roles` in it. "Any authenticated member reads the whole
 *     catalogue" is no longer the contract — that was precisely the problem
 *     (every clone was offered to every group on the platform).
 *   - the row shape gained three adoption keys, so the surface can render
 *     not-adopted / current / update-available from one read.
 *   - SECURITY DEFINER, not INVOKER. W4 deliberately chose INVOKER so the RLS
 *     policy stayed the enforcement point and the relocation added no
 *     privilege surface. RD-B must read `role_template_publications` and
 *     resolve the caller's permission, which INVOKER cannot do under that
 *     table's deliberately narrow SELECT policy. The posture change is
 *     intentional and is stated here rather than discovered later.
 */
describe('FEAT-PC028 / RDB-1 — get_available_role_templates contract', () => {
  let steward: TestUser;
  let plainMember: TestUser;
  let groupId: string;
  const createdGroupIds: string[] = [];

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'Template Reader' });
    plainMember = await createTestUser({ displayName: 'Plain Reader' });

    const c = createTestClient();
    await signInWithRetry(c, steward.email, steward.password);
    const { data, error } = await c.rpc('create_engagement_group', {
      p_name: 'Template Catalogue Group',
    });
    if (error) throw new Error(`create_engagement_group: ${error.message}`);
    groupId = data as string;
    createdGroupIds.push(groupId);
  }, 180_000);

  afterAll(async () => {
    for (const g of createdGroupIds) await cleanupTestGroup(g);
    for (const u of [steward, plainMember]) {
      if (u) await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  }, 180_000);

  it('a Steward reads the templates offered to their group', async () => {
    const client = createTestClient();
    await signInWithRetry(client, steward.email, steward.password);

    const { data, error } = await client.rpc('get_available_role_templates', {
      p_group_id: groupId,
    });

    expect(error).toBeNull();
    const rows = data as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBe(true);
    // The four system templates are always offered — the floor every group is
    // built on is never subject to distribution.
    expect(rows.length).toBeGreaterThan(0);

    for (const r of rows) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(Object.keys(r).sort()).toEqual([
        'adopted_group_role_id',
        'adopted_version_number',
        'current_version_number',
        'description',
        'id',
        'name',
      ]);
    }
  }, 180_000);

  it('returns the offer ordered by name (the picker relies on it)', async () => {
    const client = createTestClient();
    await signInWithRetry(client, steward.email, steward.password);

    const { data, error } = await client.rpc('get_available_role_templates', {
      p_group_id: groupId,
    });
    expect(error).toBeNull();

    const names = (data as Array<{ name: string }>).map((r) => r.name);
    // Collation adaptation (2026-08-05, found at the WA-6 close sweep —
    // labelled, found-not-caused): the contract orders by the DB's linguistic
    // collation, which is case-insensitive ("Steward clone" precedes "Steward
    // Role Template" — the order a human picker expects). The bare JS .sort()
    // this cell used is code-unit order (uppercase first) and agreed with the
    // DB only while every template name was identically cased; the first
    // clone exposed the divergence. Carried forward verbatim through RD-B —
    // the ordering law did not change, only the door.
    expect(names).toEqual(
      [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    );
  }, 180_000);

  it('a member without manage_roles cannot read the offer', async () => {
    // NEW under RD-B, and not a tightening of the old cell: the old contract
    // was group-agnostic, so there was no permission in whose context to ask.
    // The offer names acts (copy, update) only a role-manager can perform.
    const client = createTestClient();
    await signInWithRetry(client, plainMember.email, plainMember.password);

    const { error } = await client.rpc('get_available_role_templates', {
      p_group_id: groupId,
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  }, 180_000);

  it('anon cannot execute the contract', async () => {
    const anon = createTestClient(); // no session

    const { error } = await anon.rpc('get_available_role_templates', {
      p_group_id: groupId,
    });

    expect(error).not.toBeNull();
    // Carried over from the W4 suite unchanged: the anon-lockdown posture.
    expect(error!.code).toBe('42501');
  }, 180_000);

  it('the dropped zero-arg contract is gone, not shadowed', async () => {
    // RDB-1's whole point: ONE door onto offerability. An overload left
    // standing would serve the unscoped catalogue to any caller that omitted
    // the argument, which is the footgun this cycle closes at the write door.
    const client = createTestClient();
    await signInWithRetry(client, steward.email, steward.password);

    const { error } = await client.rpc('get_role_templates');
    expect(error).not.toBeNull();
    expect(error!.code).toBe('PGRST202');
  }, 180_000);
});
