import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import { runAdminSql } from '@/tests/helpers/supabase';
import {
  classifyReferences,
  classifyInvocations,
  formatViolation,
  formatInvocationViolation,
  functionOwner,
  dsTables,
  type Violation,
  type InvocationViolation,
} from '@/tests/helpers/ownership';

jest.setTimeout(60_000); // real-substrate suite: one Management-API catalog query

/**
 * Inner-ring conformance gate — the anatomy's domain/core boundary, enforced
 * against the LIVE catalog (`pg_proc`).
 *
 * ORIGIN (COR-A W3, ADR-U047): written red-first as the permanent regression
 * gate the 2026-07-02 retro showed we were missing. It asserted rule 3:
 *
 *   "core may invoke ds*_lifecycle_* functions and nothing else domain-side.
 *    No PC-owned function, trigger, or policy may reference a DS-owned table.
 *    Any function referencing DS tables must itself be DS-owned (explicit
 *    allowlist in the conformance test)."
 *
 * It went green when the COR-A W4/W5 inversion migration landed (2026-07-19),
 * relocating all ten Core author-sites behind `ds3_lifecycle_*` handlers.
 *
 * EXTENDED (COR-B W1+W2, audit AC2-1 + AC2-2). Two structural gaps closed:
 *
 *  - AC2-2: `DS_TABLES` and the three DS function lists used to be hand-edited
 *    arrays in this file, with nothing binding them to the catalog. A new DS
 *    table shipped ungated by default. They now come from
 *    `supabase/ownership.manifest.json`, whose completeness is itself gated by
 *    `ownership-manifest-conformance.test.ts` — an unclassified table fails
 *    red there before it can go unwatched here. (The per-area NAMED DEFERRAL
 *    history those arrays carried now lives in the manifest's `note` fields.)
 *
 *  - AC2-1: the old exemption was a single flat set, so membership excused a
 *    function from the ENTIRE table check rather than from its own service's
 *    tables. A DS-5 function reading `public.journey_enrollments`, or anything
 *    reading `public.journal_entries`, stayed green — meaning the anatomy's
 *    acyclicity rule ("DS-1 at the bottom, DS-7 at the top; nothing depends on
 *    DS-7") had no enforcement at all. Ownership is now resolved per service
 *    and direction is checked, via `@/tests/helpers/ownership`.
 *
 * The rule's red/green behaviour is specified and demonstrated on fixtures in
 * `tests/unit/platform/ownership-direction-rule.test.ts` — the live substrate
 * is clean on the DS-to-DS axis, so this file can only ever show green for it
 * and proves nothing about the rule's teeth on its own. The two suites are
 * halves of one gate.
 *
 * `public.notifications` is deliberately absent from the DS set: ADR-U048 and
 * ruling R-1 make it the Notifications-vertical delivery substrate, so writes
 * from any tier are obligation-fulfilment, never boundary crossings
 * (ADR-U047 rule 5).
 *
 * Scanning every public `prokind='f'` row covers trigger functions as well
 * (they are ordinary pg_proc entries), so pg_trigger needs no separate pass.
 */

// The ten Core lifecycle functions COR-A W4/W5 relocated (ADR-U047 §"the live
// relocation set" + Amendment 1). Retained purely to annotate the report: if
// any reappears as an offender, the inversion has regressed rather than a new
// crossing having been introduced — a materially different diagnosis.
const COR_A_W4_RELOCATION_TARGETS = new Set<string>([
  'leave_group',
  'remove_member',
  '_transfer_stewardship_to_deusex',
  'respond_to_stewardship_nomination',
  'close_group',
  'delete_group',
  'leave_group_as_group',
  'admin_exit_user_from_platform',
  '_erase_mist',
  'admin_hard_delete_user',
]);

type FnRow = { name: string; args: string; body: string };

describe('Internal-API conformance (ADR-U047 rule 3 + DS acyclicity, COR-A W3 / COR-B W2 / COR-D W2)', () => {
  let rows: FnRow[] = [];

  beforeAll(async () => {
    rows = (await runAdminSql(`
      select p.proname as name,
             pg_get_function_identity_arguments(p.oid) as args,
             p.prosrc as body
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prokind = 'f'
       order by p.proname;
    `)) as unknown as FnRow[];
  });

  it('no function references a DS-owned table outside its ownership rule', () => {
    expect(rows.length).toBeGreaterThan(0); // sanity: catalog reachable
    expect(dsTables().length).toBeGreaterThan(0); // sanity: manifest loaded

    const offenders = rows
      .map((r) => ({
        name: r.name,
        args: r.args,
        owner: functionOwner(r.name),
        violations: classifyReferences(r.name, r.body ?? ''),
      }))
      .filter((r) => r.violations.length > 0);

    const lines = (o: (typeof offenders)[number]) =>
      o.violations.map((v: Violation) => formatViolation(o.name, o.args, v));

    const byKind = (k: string) =>
      offenders.flatMap((o) =>
        o.violations.filter((v) => v.kind === k).map((v) => formatViolation(o.name, o.args, v)),
      );

    const coreToDomain = byKind('core-to-domain');
    const upward = byKind('upward-cross-service');
    const uncited = byKind('uncited-cross-service');
    const regressed = offenders
      .filter((o) => COR_A_W4_RELOCATION_TARGETS.has(o.name))
      .map((o) => o.name);

    // Print the full breakdown so the evidence is complete either way.
    // eslint-disable-next-line no-console
    console.error(
      [
        '',
        'Internal-API conformance (ADR-U047 rule 3 + DS acyclicity):',
        `  Core -> domain crossings:            ${coreToDomain.length}`,
        ...coreToDomain,
        `  Upward DS -> DS crossings:           ${upward.length}`,
        ...upward,
        `  Uncited downward DS -> DS reads:     ${uncited.length}`,
        ...uncited,
        ...(regressed.length
          ? ['', `  REGRESSION — COR-A relocation targets reappeared (${regressed.length}): ${regressed.join(', ')}`]
          : []),
        '',
      ].join('\n'),
    );

    const report = offenders.flatMap(lines).join('\n');
    expect(report).toBe('');
  });

  it('no function invokes a DS-owned function outside ADR-U047 rule 3 (COR-D W2, GC-15)', () => {
    // The invocation axis. The table half above went green while four
    // undeclared PC-4 -> ds5_moderation_* calls and PC-1 -> ds3_stats_snapshot
    // shipped (AC4-2/AC4-3) — rule 3's call clause had no gate. Candidate
    // callees are every live function name; ownership resolves through the
    // manifest, so an undeclared composition fails red here by construction.
    expect(rows.length).toBeGreaterThan(0);
    const names = rows.map((r) => r.name);

    const offenders = rows
      .map((r) => ({
        name: r.name,
        args: r.args,
        owner: functionOwner(r.name),
        violations: classifyInvocations(r.name, r.body ?? '', names),
      }))
      .filter((r) => r.violations.length > 0);

    const byKind = (k: string) =>
      offenders.flatMap((o) =>
        o.violations
          .filter((v) => v.kind === k)
          .map((v) => formatInvocationViolation(o.name, o.args, v)),
      );

    const undeclaredCore = byKind('undeclared-core-composition');
    const unregisteredFacts = byKind('unregistered-lifecycle-fact');
    const upwardCalls = byKind('upward-cross-service-call');
    const uncitedCalls = byKind('uncited-cross-service-call');

    // eslint-disable-next-line no-console
    console.error(
      [
        '',
        'Internal-API invocation conformance (ADR-U047 rule 3 call clause, COR-D W2):',
        `  Undeclared core -> domain compositions: ${undeclaredCore.length}`,
        ...undeclaredCore,
        `  Unregistered lifecycle facts:           ${unregisteredFacts.length}`,
        ...unregisteredFacts,
        `  Upward DS -> DS calls:                  ${upwardCalls.length}`,
        ...upwardCalls,
        `  Uncited downward DS -> DS calls:        ${uncitedCalls.length}`,
        ...uncitedCalls,
        '',
      ].join('\n'),
    );

    const report = offenders
      .flatMap((o) =>
        o.violations.map((v: InvocationViolation) =>
          formatInvocationViolation(o.name, o.args, v),
        ),
      )
      .join('\n');
    expect(report).toBe('');
  });
});
