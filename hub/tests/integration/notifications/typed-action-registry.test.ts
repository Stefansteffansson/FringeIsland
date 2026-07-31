import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(120_000);

/**
 * COR-C W3 — the typed-action registry lives platform-side
 * (Anatomy Audit III: AC3-5 Major, AC3-9 · GC-9, GC-4; shape per ADR-U051
 * Amendment 1 — the boolean accept/decline family stays).
 *
 * RED AT HEAD (pre-W3 migration 20260731140000):
 *  - notification_action_types does not exist (42P01)
 *  - notification_kinds has no dispatch_segment column (42703)
 *  - get_own_notifications carries neither dispatch_segment nor responses
 *  - respond_to_acting_invitation has no expiry guard: an expired acting
 *    invitation answers P0002 (membership-missing fallthrough) instead of the
 *    sibling's P0001 'expired' refusal (AC3-9)
 * GC-9 (the gate this suite leaves behind): an actionable row whose kind has
 * no dispatch target is a FORGOTTEN REGISTRATION and fails here — passive
 * render and forgotten kind are now distinguishable. The Hub half asserts a
 * mounted BFF route for every registered segment.
 */

const HUB_ROOT = path.resolve(__dirname, '../../..');

describe('COR-C W3 — typed-action registry platform-side (AC3-5)', () => {
  describe('the registry substrate', () => {
    it('notification_action_types exists and carries the Ferd accept/decline family (U051A1)', async () => {
      // RED at HEAD: 42P01 — the table does not exist.
      const rows = await runAdminSql(
        `SELECT action_type, responses FROM public.notification_action_types
          WHERE action_type = 'accept_decline';`,
      );
      expect(rows.length).toBe(1);
      const responses = rows[0].responses as Array<Record<string, unknown>>;
      expect(Array.isArray(responses)).toBe(true);
      const keys = responses.map((r) => r.key).sort();
      expect(keys).toEqual(['accept', 'decline']);
      for (const r of responses) {
        expect(typeof r.label).toBe('string');
        expect(typeof r.accept).toBe('boolean');
      }
    });

    it('the two answerable Ferd kinds carry their dispatch segments as data', async () => {
      // RED at HEAD: 42703 — dispatch_segment does not exist.
      const rows = await runAdminSql(
        `SELECT kind, dispatch_segment FROM public.notification_kinds
          WHERE kind IN ('stewardship_nomination', 'acting_invitation')
          ORDER BY kind;`,
      );
      expect(rows).toEqual([
        { kind: 'acting_invitation', dispatch_segment: 'acting-response' },
        { kind: 'stewardship_nomination', dispatch_segment: 'nomination-response' },
      ]);
    });
  });

  describe('GC-9 — forgotten registrations are red, and registered targets are reachable', () => {
    it('no actionable row exists whose kind has no dispatch target', async () => {
      // RED at HEAD: 42703. Post-apply: an actionable emission for a kind
      // nobody registered a target for fails HERE, instead of rendering a
      // dead passive row (the AC3-5 failure mode made mechanical).
      const rows = await runAdminSql(
        `SELECT count(*)::int AS n
           FROM public.notifications n
           JOIN public.notification_kinds k ON k.kind = n.type
          WHERE n.action_type IS NOT NULL
            AND k.dispatch_segment IS NULL;`,
      );
      expect(rows[0].n).toBe(0);
    });

    it('every registered dispatch segment has a mounted Hub BFF route', async () => {
      // RED at HEAD: 42703. The cross-layer half: a segment registered in
      // platform data must resolve to a real route directory —
      // app/api/notifications/[id]/<segment>/route.ts.
      const rows = (await runAdminSql(
        `SELECT DISTINCT dispatch_segment AS seg FROM public.notification_kinds
          WHERE dispatch_segment IS NOT NULL ORDER BY 1;`,
      )) as unknown as { seg: string }[];
      expect(rows.length).toBeGreaterThan(0);
      const missing = rows
        .map((r) => r.seg)
        .filter(
          (seg) =>
            !fs.existsSync(
              path.join(HUB_ROOT, 'app', 'api', 'notifications', '[id]', seg, 'route.ts'),
            ),
        );
      expect(missing).toEqual([]);
    });
  });

  describe('the list contract carries the registry (rulings 1-2 as data)', () => {
    let rhea: TestUser;

    beforeAll(async () => {
      rhea = await createTestUser({ displayName: 'Rhea Registry' });
      // Fixture emission: the read contract is under test, not the producers
      // (the nomination/acting producers have their own suites).
      await runAdminSql(
        `INSERT INTO public.notifications
           (recipient_group_id, type, title, body, action_type)
         SELECT '${rhea.personalGroupId}', 'stewardship_nomination',
                'W3 fixture', 'carry the registry', 'accept_decline';`,
      );
    });
    afterAll(async () => {
      await runAdminSql(
        `DELETE FROM public.notifications WHERE recipient_group_id = '${rhea.personalGroupId}';`,
      ).catch(() => undefined);
      if (rhea) await cleanupTestUser(rhea.user.id);
    });

    it('an actionable row rides with its dispatch_segment and platform response set', async () => {
      const c: SupabaseClient = createTestClient();
      await signInWithRetry(c, rhea.email, rhea.password);
      const { data, error } = await c.rpc('get_own_notifications');
      expect(error).toBeNull();
      const row = (data as Array<Record<string, unknown>>).find(
        (n) => n.title === 'W3 fixture',
      );
      expect(row).toBeDefined();
      // RED at HEAD: neither key exists on the payload.
      expect(row).toHaveProperty('dispatch_segment', 'nomination-response');
      const responses = row!.responses as Array<Record<string, unknown>>;
      expect(Array.isArray(responses)).toBe(true);
      expect(responses.map((r) => r.key).sort()).toEqual(['accept', 'decline']);
      await c.auth.signOut();
    });
  });

  describe('AC3-9 — the acting responder refuses an expired row contract-side', () => {
    let elin: TestUser;
    let notifId: string;

    beforeAll(async () => {
      elin = await createTestUser({ displayName: 'Elin Expired' });
      const rows = await runAdminSql(
        `INSERT INTO public.notifications
           (recipient_group_id, type, title, body, action_type, action_data, expires_at)
         VALUES ('${elin.personalGroupId}', 'acting_invitation',
                 'W3 expired fixture', 'the guard under test', 'accept_decline',
                 jsonb_build_object('membership_id', gen_random_uuid()),
                 now() - interval '1 hour')
         RETURNING id;`,
      );
      notifId = rows[0].id as string;
    });
    afterAll(async () => {
      await runAdminSql(
        `DELETE FROM public.notifications WHERE recipient_group_id = '${elin.personalGroupId}';`,
      ).catch(() => undefined);
      if (elin) await cleanupTestUser(elin.user.id);
    });

    it('an expired acting invitation answers the P0001 expiry refusal, mirroring the nomination sibling', async () => {
      const c: SupabaseClient = createTestClient();
      await signInWithRetry(c, elin.email, elin.password);
      const { error } = await c.rpc('respond_to_acting_invitation', {
        p_notification_id: notifId,
        p_accept: true,
      });
      expect(error).not.toBeNull();
      // RED at HEAD: no guard — the dispatch falls through to the missing
      // membership and answers P0002 'notification not found'. The sibling
      // (respond_to_stewardship_nomination, 20260728190000:230-232) answers
      // P0001 'expired'; after W3 this contract does too.
      expect(error!.code).toBe('P0001');
      expect(error!.message).toMatch(/expired/i);
      await c.auth.signOut();
    });
  });
});
