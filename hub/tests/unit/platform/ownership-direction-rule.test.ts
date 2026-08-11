import { describe, it, expect } from '@jest/globals';
import {
  classifyReferences,
  classifyInvocations,
  functionOwner,
  dsTables,
  loadOwnershipManifest,
} from '@/tests/helpers/ownership';

/**
 * W2 — DS-to-DS direction rule (Cycle COR-B, audit AC2-1).
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/ownership` — because the rule it specifies has no
 * implementation anywhere. That absence IS finding AC2-1.
 *
 * The predecessor inner-ring gate asserts only ONE direction: no *Core*
 * function may reference a DS-owned table. Its exemption is a single flat set:
 *
 *     !DS_OWNED_ALLOWLIST.has(r.name) && !VERTICAL_COMPOSITION_ALLOWLIST.has(...)
 *
 * `DS_OWNED_ALLOWLIST` merges the DS-3, DS-5 and DS-7 function lists, so
 * membership exempts a function from the ENTIRE `DS_TABLES` check — not just
 * from its own service's tables. Under that logic a DS-5 function reading
 * `public.journey_enrollments`, or anything reading `public.journal_entries`,
 * stays green.
 *
 * So the anatomy's other inner-ring rule —
 *
 *   "Dependency direction inside Domain is acyclic and explicit — DS-1 at the
 *    bottom, DS-7 at the top; nothing depends on DS-7."
 *   (ARCHITECTURE_ANATOMY.md, Domain Services)
 *
 * — has no mechanical enforcement whatsoever, while its sibling rule has a
 * permanent gate. This suite makes it executable for the first time.
 *
 * WHY FIXTURES, NOT THE LIVE CATALOG: audit II found the live substrate clean
 * on this axis (no DS-to-DS reference exists today), so the live gate can only
 * ever show green and would prove nothing about the rule's teeth. These
 * synthetic bodies exercise the classifier directly — real red, real green,
 * no throwaway migration. The live half runs in
 * `tests/integration/platform/internal-api-conformance.test.ts`.
 *
 * The rule, stated once:
 *   - a function may always reference its OWN service's tables;
 *   - Core may reference NO DS table (ADR-U047 rule 3), except a cited
 *     vertical-composition carve-out (Amendment 2);
 *   - a DS-N function may reference a DS-M table only when M < N (downward)
 *     AND the pair is cited in `exceptions.crossServiceReads`;
 *   - upward references (M > N) are never allowed — that is the acyclicity
 *     rule, and "nothing depends on DS-7" is its sharpest case;
 *   - `public.notifications` is never a crossing (ADR-U048 / R-1).
 */

const fixture = (table: string) => `
  begin
    update public.${table} set updated_at = now() where id = p_id;
    return;
  end;
`;

describe('ownership manifest wiring', () => {
  it('resolves DS tables from the manifest, not a literal array', () => {
    const t = dsTables();
    expect(t).toEqual(expect.arrayContaining(['journeys', 'journal_entries', 'forum_posts']));
    // notifications is the Notifications-vertical delivery substrate (ADR-U048
    // / ruling R-1) — writes to it are obligation-fulfilment, never crossings.
    expect(t).not.toContain('notifications');
  });

  it('resolves a function owner by explicit entry, by lifecycle prefix, or Core', () => {
    expect(functionOwner('get_player_state')).toBe('DS-3');
    expect(functionOwner('get_group_forum')).toBe('DS-5');
    expect(functionOwner('create_journal_entry')).toBe('DS-7');
    // ADR-U047 rule 1 — the prefix carries the owning service in its digit.
    expect(functionOwner('ds3_lifecycle_group_closed')).toBe('DS-3');
    expect(functionOwner('ds5_lifecycle_user_hard_deleted')).toBe('DS-5');
    // Since the ADM-A four-way split (TASK-ADMA-01, GC-13), classified core
    // functions resolve to their PC area, not flat CORE.
    expect(functionOwner('close_group')).toBe('PC-3');
    expect(functionOwner('admin_hard_delete_user')).toBe('PC-4');
    expect(functionOwner('reap_expired_mists')).toBe('PC-2');
    // Audit IV AC4-9 (COR-D W9): the governance predicate lives with the
    // governance area it backs, not with the infrastructure that hosts it.
    expect(functionOwner('is_platform_admin')).toBe('PC-4');
    // Anything unclassified still falls back to Core — the strict default
    // (and the completeness gate fails red on it, so it cannot persist).
    expect(functionOwner('some_function_nobody_declared')).toBe('CORE');
  });
});

describe('DS-to-DS direction rule (COR-B W2, audit AC2-1)', () => {
  it('allows a service to reference its own tables', () => {
    expect(classifyReferences('get_player_state', fixture('journey_steps'))).toEqual([]);
    expect(classifyReferences('get_group_forum', fixture('forum_posts'))).toEqual([]);
  });

  it('flags a Core function referencing any DS table (ADR-U047 rule 3)', () => {
    const v = classifyReferences('close_group', fixture('journey_enrollments'));
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ table: 'journey_enrollments', kind: 'core-to-domain' });
  });

  it('flags a DOWNWARD cross-service reference that is not cited', () => {
    // DS-5 reaching DS-3: permitted in principle (3 < 5) but only with a
    // cited entry in exceptions.crossServiceReads. Uncited is a violation.
    // The predecessor flat allowlist returned GREEN here — this is AC2-1.
    const v = classifyReferences('get_group_forum', fixture('journey_enrollments'));
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ table: 'journey_enrollments', kind: 'uncited-cross-service' });
  });

  it('flags an UPWARD cross-service reference — the acyclicity rule', () => {
    // DS-3 reaching DS-5 inverts the dependency direction. Never allowed,
    // citation or not.
    const v = classifyReferences('get_player_state', fixture('forum_posts'));
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ table: 'forum_posts', kind: 'upward-cross-service' });
  });

  it('flags anything outside DS-7 touching journal_entries ("nothing depends on DS-7")', () => {
    expect(classifyReferences('get_group_forum', fixture('journal_entries'))[0]).toMatchObject({
      kind: 'upward-cross-service',
    });
    expect(classifyReferences('close_group', fixture('journal_entries'))[0]).toMatchObject({
      kind: 'core-to-domain',
    });
    // DS-7 itself is free to use its own store.
    expect(classifyReferences('create_journal_entry', fixture('journal_entries'))).toEqual([]);
  });

  it('honours the vertical-composition carve-out for Core (ADR-U047 A2)', () => {
    // get_own_data_export composes domain READ contracts for the Privacy/GDPR
    // obligation. It is cited in the manifest, so it is not a crossing.
    expect(classifyReferences('get_own_data_export', fixture('journal_entries'))).toEqual([]);
    // ...but the carve-out is per-function, not a blanket Core exemption.
    expect(classifyReferences('get_own_profile', fixture('journal_entries'))).toHaveLength(1);
  });

  it('never treats public.notifications as a crossing (ADR-U048 / R-1)', () => {
    expect(classifyReferences('close_group', fixture('notifications'))).toEqual([]);
    expect(classifyReferences('complete_journey_step', fixture('notifications'))).toEqual([]);
  });

  it('ignores references inside comments (the audit II false-positive trap)', () => {
    const body = `
      begin
        -- historical note: this used to update public.journal_entries
        /* and public.forum_posts too */
        return;
      end;
    `;
    expect(classifyReferences('close_group', body)).toEqual([]);
  });

  it('matches only schema-qualified references (ADR-U047 A2)', () => {
    // search_path='' makes every real relation reference public.<table>; a
    // bare name is a jsonb key or identifier, not a relation (PR #191).
    const body = `begin return jsonb_build_object('journeys', '[]'::jsonb); end;`;
    expect(classifyReferences('close_group', body)).toEqual([]);
  });

  it('the manifest carries no uncited cross-service entry', () => {
    const m = loadOwnershipManifest();
    const uncited = m.exceptions.crossServiceReads.filter((e) => !e.citation?.trim());
    expect(uncited).toEqual([]);
  });
});

/**
 * W2 — the INVOCATION axis of ADR-U047 rule 3 (Cycle COR-D, audit GC-15).
 *
 * WRITTEN RED-FIRST, the COR-B W2 pattern: at authoring, the declared-pair and
 * registered-fact cases below FAIL — the manifest has no
 * `declaredCompositions` and no `lifecycleFacts` registry, because the class
 * they encode does not exist in canon yet (ADR-U047 A3 lands in the same
 * cycle). Their red run is recorded in the COR-D PR; they go green when the
 * amendment and its manifest declarations land.
 *
 * Why this suite exists: the table rule above went green while four undeclared
 * PC-4 -> ds5_moderation_* calls and PC-1 -> ds3_stats_snapshot() shipped
 * (AC4-2/AC4-3) — "core may invoke ds*_lifecycle_* and nothing else
 * domain-side" had a gate for its table half only. The live half runs in
 * `tests/integration/platform/internal-api-conformance.test.ts`.
 */
describe('invocation rule (ADR-U047 rule 3 call clause + A3, COR-D W2)', () => {
  const call = (callee: string) => `
    begin
      perform public.${callee}(p_id);
      return;
    end;
  `;

  // Candidate callee pool — live function names plus one deliberately
  // unregistered lifecycle-fact name (prefix-owned DS-3 by rule 1).
  const CALLEES = [
    'ds3_lifecycle_group_closed',
    'ds3_lifecycle_not_a_registered_fact',
    'ds5_moderation_list_reports',
    'ds3_stats_snapshot',
    'get_own_journal_export',
    'get_group_forum',
    'get_player_state',
    'create_journal_entry',
  ];

  it('allows core to call a REGISTERED lifecycle fact', () => {
    expect(
      classifyInvocations('close_group', call('ds3_lifecycle_group_closed'), CALLEES),
    ).toEqual([]);
  });

  it('flags a core call to a lifecycle-fact name absent from the registry (AC4-4 class)', () => {
    const v = classifyInvocations(
      'close_group',
      call('ds3_lifecycle_not_a_registered_fact'),
      CALLEES,
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({
      callee: 'ds3_lifecycle_not_a_registered_fact',
      kind: 'unregistered-lifecycle-fact',
    });
  });

  it('flags an UNDECLARED core -> domain composition (AC4-2 class)', () => {
    // The declaration is per (caller, callee) pair — close_group calling the
    // moderation read is undeclared no matter what admin_get_content_reports
    // declares.
    const v = classifyInvocations('close_group', call('ds5_moderation_list_reports'), CALLEES);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({
      callee: 'ds5_moderation_list_reports',
      kind: 'undeclared-core-composition',
    });
  });

  it('honours a DECLARED composition pair (ADR-U047 A3 — the rider ownership split)', () => {
    expect(
      classifyInvocations(
        'admin_get_content_reports',
        call('ds5_moderation_list_reports'),
        CALLEES,
      ),
    ).toEqual([]);
    expect(
      classifyInvocations('get_platform_statistics', call('ds3_stats_snapshot'), CALLEES),
    ).toEqual([]);
  });

  it('honours the A2 composes list, per-function not blanket', () => {
    expect(
      classifyInvocations('get_own_data_export', call('get_own_journal_export'), CALLEES),
    ).toEqual([]);
    expect(
      classifyInvocations('get_own_profile', call('get_own_journal_export'), CALLEES),
    ).toHaveLength(1);
  });

  it('flags an UPWARD DS -> DS call — the acyclicity rule on the call axis', () => {
    const v = classifyInvocations('get_player_state', call('get_group_forum'), CALLEES);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ callee: 'get_group_forum', kind: 'upward-cross-service-call' });
  });

  it('flags a DOWNWARD DS -> DS call that is not cited', () => {
    const v = classifyInvocations('get_group_forum', call('get_player_state'), CALLEES);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ callee: 'get_player_state', kind: 'uncited-cross-service-call' });
  });

  it('allows own-service calls', () => {
    expect(
      classifyInvocations('get_group_forum', call('ds5_moderation_list_reports'), CALLEES),
    ).toEqual([]);
  });

  it('ignores calls inside comments', () => {
    const body = `
      begin
        -- used to perform public.ds5_moderation_list_reports(p_id)
        /* and public.ds3_stats_snapshot() */
        return;
      end;
    `;
    expect(classifyInvocations('close_group', body, CALLEES)).toEqual([]);
  });

  it('every declared composition and registered fact carries a citation (registry hygiene)', () => {
    const m = loadOwnershipManifest();
    const compositions = m.exceptions.declaredCompositions ?? [];
    const facts = m.exceptions.lifecycleFacts ?? [];
    // The A3 class exists in canon => the registry must not be empty, and
    // every entry must cite its declaring decision.
    expect(compositions.length).toBeGreaterThan(0);
    expect(facts.length).toBeGreaterThan(0);
    expect(compositions.filter((e) => !e.citation?.trim())).toEqual([]);
    expect(facts.filter((e) => !e.citation?.trim())).toEqual([]);
  });
});
