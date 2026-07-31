import { describe, it, expect, jest } from '@jest/globals';
import { runAdminSql } from '@/tests/helpers/supabase';
import {
  loadOwnershipManifest,
  functionOwner,
  tableOwner,
} from '@/tests/helpers/ownership';

jest.setTimeout(60_000); // one catalog query

/**
 * COR-C W7 — trigger-edge awareness for the inner-ring gate (Audit III GC-8;
 * Stefan's ruling 2026-07-31: ADD; legitimised by ADR-U048 Amendment 1).
 *
 * WRITTEN RED-FIRST. N-D mounted DS-5's preference suppression as a BEFORE
 * INSERT trigger on `public.notifications` — every tier's obligation write now
 * executes DS-5 code in its own transaction, and the inner-ring gate could not
 * see the edge (it reads function BODIES for table references; a trigger mount
 * is a catalog edge, not a body reference). U048A1 rules the mechanism
 * legitimate WITH bounds; this gate pins the bounds:
 *
 *   a DS-owned function mounted as a trigger on a table its service does not
 *   own must carry a cited license in the manifest's exceptions.triggerMounts
 *   — otherwise red. Same-owner mounts and CORE plumbing stay free.
 *
 * State at authoring: RED — exceptions.triggerMounts does not exist, so the
 * ds5_apply_notification_preference mount on notifications (DS-5 →
 * vertical:notifications) reports unlicensed. The license entry turns it
 * green; the next substrate-mounted edge fails until canon speaks.
 */

type TriggerEdge = { trigger: string; table: string; fn: string };

async function liveTriggerEdges(): Promise<TriggerEdge[]> {
  const rows = (await runAdminSql(`
    select t.tgname as trigger, c.relname as table, p.proname as fn
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = t.tgfoid
     where n.nspname = 'public'
       and not t.tgisinternal
     order by c.relname, t.tgname;
  `)) as unknown as TriggerEdge[];
  return rows;
}

type TriggerMountLicense = { function: string; table: string; citation: string };

function triggerMounts(): TriggerMountLicense[] {
  const m = loadOwnershipManifest() as unknown as {
    exceptions: { triggerMounts?: TriggerMountLicense[] };
  };
  return m.exceptions.triggerMounts ?? [];
}

describe('Trigger-mount conformance (COR-C W7, GC-8 / ADR-U048 Amendment 1)', () => {
  it('every cross-owner DS trigger mount carries a cited license', async () => {
    const edges = await liveTriggerEdges();
    expect(edges.length).toBeGreaterThan(0); // sanity: catalog reachable

    const licensed = triggerMounts();
    const violations: string[] = [];

    for (const e of edges) {
      const fnOwner = functionOwner(e.fn);
      if (!/^DS-\d$/.test(fnOwner)) continue; // CORE plumbing is the platform's own
      const tOwner = tableOwner(e.table);
      if (tOwner === fnOwner) continue; // a service triggering its own substrate

      const license = licensed.find((l) => l.function === e.fn && l.table === e.table);
      if (!license || !license.citation?.trim()) {
        violations.push(
          `${e.trigger}: ${e.fn} (${fnOwner}) mounted on ${e.table} (${tOwner ?? 'unclassified'}) — unlicensed`,
        );
      }
    }

    // RED pre-license: the N-D suppression mount reports here. A future
    // substrate-mounted edge fails until an ADR (or rider) speaks and the
    // license cites it — U048A1 bound (b): no service mounts triggers on
    // tables it does not own without canon.
    expect(violations).toEqual([]);
  });

  it('the license list stays honest — every entry names a live mounted edge', async () => {
    const edges = await liveTriggerEdges();
    const stale = triggerMounts().filter(
      (l) => !edges.some((e) => e.fn === l.function && e.table === l.table),
    );
    expect(stale.map((l) => `${l.function} on ${l.table}`)).toEqual([]);
  });
});
