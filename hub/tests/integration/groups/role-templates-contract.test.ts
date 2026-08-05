import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * COR-B W4 (audit II AC2-4) — the role-template catalogue is a PLATFORM
 * CONTRACT, not a BFF table read.
 *
 * WRITTEN RED-FIRST: `get_role_templates()` does not exist until the W4
 * migration lands, so every assertion here fails against the current
 * substrate (PostgREST answers PGRST202, "function not found").
 *
 * Why this exists. Audit II found one surviving direct table read in the
 * server lib — `fetchRoleTemplates` calling `.from('role_templates')` — while
 * every one of its ~90 siblings goes through an RPC. It was never an
 * enforcement hole: `role_templates` carries a SELECT policy
 * (`auth_read_role_templates`, `TO authenticated`, qual TRUE), so the rule
 * lives in the substrate and ADR-U038 clause 1 is satisfied either way. It is
 * a uniformity item, and ADR-U038 tranche 2 relocated `get_member_groups()`
 * for exactly this shape — this one was simply not swept up.
 *
 * The contract this pins (behaviour-preserving, deliberately):
 *   - any authenticated member reads the whole catalogue (qual TRUE today);
 *   - anon cannot execute it (EXECUTE revoked — the anon-lockdown posture);
 *   - rows are ordered by name, and carry exactly id / name / description.
 *
 * SECURITY INVOKER, not DEFINER — the one design choice worth stating. The
 * existing RLS policy stays the enforcement point, so this relocation adds no
 * new privilege surface and moves no rule; it only changes the door the Hub
 * knocks on. A DEFINER function would have taken enforcement over from RLS,
 * which is a change of security posture that a uniformity fix has no business
 * making. Sibling Surfaces (the Gimbal) get the same contract either way.
 */
describe('COR-B W4 / AC2-4 — get_role_templates contract', () => {
  let member: TestUser;

  beforeAll(async () => {
    member = await createTestUser({ displayName: 'Template Reader' });
  });

  afterAll(async () => {
    if (member) await cleanupTestUser(member.user.id);
  });

  it('an authenticated member reads the template catalogue', async () => {
    const client = createTestClient();
    await signInWithRetry(client, member.email, member.password);

    const { data, error } = await client.rpc('get_role_templates');

    expect(error).toBeNull();
    const rows = data as { id: string; name: string; description: string | null }[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    for (const r of rows) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(Object.keys(r).sort()).toEqual(['description', 'id', 'name']);
    }
  });

  it('returns the catalogue ordered by name (the picker relies on it)', async () => {
    const client = createTestClient();
    await signInWithRetry(client, member.email, member.password);

    const { data, error } = await client.rpc('get_role_templates');
    expect(error).toBeNull();

    const names = (data as { name: string }[]).map((r) => r.name);
    // Collation adaptation (2026-08-05, found at the WA-6 close sweep —
    // labelled, found-not-caused): the contract orders by the DB's linguistic
    // collation, which is case-insensitive ("Steward clone" precedes
    // "Steward Role Template" — the order a human picker expects). The bare
    // JS .sort() this cell used is code-unit order (uppercase first) and
    // agreed with the DB only while every template name was identically
    // cased; the first clone exposed the divergence. The contract is
    // unchanged — the comparator now states the actual law.
    expect(names).toEqual(
      [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    );
  });

  it('anon cannot execute the contract', async () => {
    const anon = createTestClient(); // no session

    const { error } = await anon.rpc('get_role_templates');

    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  });
});
