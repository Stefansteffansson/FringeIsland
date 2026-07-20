import { describe, it, expect, jest } from '@jest/globals';
import { runAdminSql } from '@/tests/helpers/supabase';

jest.setTimeout(60_000); // real-substrate suite: one Management-API catalog query

/**
 * W3 — Internal-API inversion conformance gate (Cycle COR-A, ADR-U047).
 *
 * WRITTEN RED-FIRST. This is the permanent regression gate the 2026-07-02 retro
 * showed we were missing: it queries the LIVE catalog (`pg_proc`) and asserts
 * the anatomy's inner-ring direction rule mechanically — Platform Core is
 * domain-agnostic, so no Core object may name a DS-owned table.
 *
 * ADR-U047 rule 3 (the boundary rule this test enforces, verbatim):
 *   "core may invoke ds*_lifecycle_* functions and nothing else domain-side.
 *    No PC-owned function, trigger, or policy may reference a DS-owned table.
 *    Any function referencing DS tables must itself be DS-owned (explicit
 *    allowlist in the conformance test)."
 * ADR-U047 Amendment 2 (2026-07-19) adds one bounded carve-out: a platform
 * function fulfilling a cross-cutting VERTICAL obligation (ADR-U002) may
 * compose domain services' published READ contracts — read-only, contract-only,
 * never DS tables — declared by name in the vertical-composition allowlist
 * below (first entry: get_own_data_export, Privacy/GDPR export, COR-A W8).
 *
 * State at authoring (2026-07-19): RED. The COR-A W4/W5 relocation migration
 * has not landed, so the ten Core lifecycle functions still author DS-3
 * dispositions inline. When that migration lands (Core calls the four
 * ds3_lifecycle_* handlers instead of naming journeys/journey_enrollments), all
 * ten drop out and this test goes GREEN — and stays green forever as the gate.
 *
 * The tenth site — admin_hard_delete_user — was found by THIS gate during W4
 * (it reassigns journeys/journey_enrollments to the [Deleted User] sentinel);
 * the audit's AC-1 "nine" missed it. The migration relocates it too (ADR-U047
 * Amendment 1's fourth fact ds3_lifecycle_user_hard_deleted). No allowlist
 * exception ships — a standing exception is the "satisfied-now" pattern COR-A ends.
 *
 * ── Scope & sources ────────────────────────────────────────────────────────
 * DS-owned tables — audit Appendix B (ANATOMY-CONFORMANCE-AUDIT.md):
 *   journeys, journey_enrollments, journey_steps, journey_step_instances,
 *   step_kinds, content_families, journal_entries.
 * DS-owned function allowlist — the DS-3 Journeys + DS-7 Journal functions from
 *   the audit's ownership map (Appendix A route inventory + Appendix C code map;
 *   each name's DS ownership re-confirmed 2026-07-19 against its defining
 *   migration — the `feat_pd00x_*` domain migrations and `feat_pd001_journal_*`),
 *   PLUS any name matching /^ds\d+_lifecycle_/ (the ADR-U047 lifecycle-fact
 *   handlers themselves — DS-owned by the naming convention rule 1).
 *
 * ── Matching ───────────────────────────────────────────────────────────────
 * Source = `pg_proc.prosrc` (the function BODY; COMMENT ON text lives in
 * pg_description, not prosrc, so it is already out of scope). We strip block
 * (/* *​/) and line (--) comments so a table named only in a code comment is not
 * a false hit, then word-boundary-match each DS table SCHEMA-QUALIFIED:
 * /\bpublic\.<table>\b/i. Schema-qualified-only is the correct arm, not just a
 * sufficient one: `search_path=''` is mandatory in substrate code, so every
 * real relation reference is schema-qualified — while a bare-name arm
 * false-positives on jsonb KEY LITERALS that happen to equal a table name
 * (the COR-A W8 export composite's `'journeys'` document key in
 * get_own_data_export, PR #191, is exactly that shape). Tightened per
 * ADR-U047 Amendment 2. Word boundaries keep `public.journeys_x`-style
 * longer names from matching `public.journeys`.
 * CAVEAT (conservative): a `--`/`/* *​/` sequence *inside a string literal*
 * would be stripped too; no live function has that shape, so it does not bite.
 * Scanning every public `prokind='f'` row covers trigger functions as well
 * (they are ordinary pg_proc entries), so pg_trigger needs no separate pass.
 */

// DS-owned tables (audit Appendix B). Order-independent — each gets its own regex.
const DS_TABLES = [
  'journeys',
  'journey_enrollments',
  'journey_steps',
  'journey_step_instances',
  'step_kinds',
  'content_families',
  'journal_entries',
  // DS-5 Communication (C-A, FEAT-PD008): the conversation model.
  // NAMED DEFERRAL: forum_posts joins at C-B — admin_hard_delete_user (Core)
  // textually UPDATEs public.forum_posts (the sentinel reassignment, re-issued
  // in 20260719190205); that crossing relocates to ds5_lifecycle_* in the
  // forum cycle, and forum_posts enters this list in the same change.
  'conversations',
  'messages',
  'conversation_participants',
  'conversation_kinds',
  // DS-5 Communication (C-B, FEAT-PD009): the group forum. Joins here in the
  // SAME change that relocates admin_hard_delete_user's inline forum_posts
  // UPDATE into ds5_lifecycle_user_hard_deleted and allowlists
  // enforce_flat_threading — pre-apply this line is RED (the live Core body
  // still names public.forum_posts); post-apply it is green.
  'forum_posts',
  // DS-5 Communication (C-D, FEAT-PD011): the ADR-U049 durable announcements
  // home + the CB-4 report store. Join in the SAME PR as migration
  // 20260720200000 (contracts-only doors; notifications stays OUT by design —
  // ADR-U048: the delivery substrate is vertical-owned, writes are
  // obligation-fulfilment, never crossings).
  'announcements',
  'content_reports',
] as const;

// DS-3 Journeys functions — legitimately own/reference the journey tables.
// (`is_enrolled_in_journey`/`is_journey_enrollable` are the sprint0-era journey
//  RLS predicates; DS-3 by concept. `_enrollment_traveller_*`, `_migrate_*` are
//  DS-3 internal helpers. The rest are the DS-3 RPCs from the route inventory.)
const DS3_JOURNEY_FUNCTIONS = [
  '_enrollment_traveller_read_standing',
  '_enrollment_traveller_standing',
  '_migrate_journey_content_steps',
  'complete_journey_step',
  'enroll_group_in_journey',
  'enroll_self_in_journey',
  'enter_journey_step',
  'get_group_enrollment_summary',
  'get_group_journey_progress',
  'get_journey_catalog',
  'get_journey_detail',
  'get_my_enrollments',
  'get_onboarding_status',
  'get_own_step_instances_export',
  'get_player_state',
  'is_enrolled_in_journey',
  'is_journey_enrollable',
  'save_step_response',
  'set_journey_progress_sharing',
  'withdraw_from_journey',
];

// DS-7 Journal functions — legitimately own/reference journal_entries.
const DS7_JOURNAL_FUNCTIONS = [
  'create_journal_entry',
  'delete_journal_entry',
  'get_own_journal_entries',
  'get_own_journal_export',
  'update_journal_entry',
];

// DS-5 Communication functions — legitimately own/reference the conversation
// and forum tables. (`is_conversation_participant` is the RLS predicate,
// reshaped over the junction; `update_conversation_last_message_at` is the
// last-message trigger; `ds5_require_fim_actor` is the CB-1 actor gate;
// `enforce_flat_threading` is the forum flat-threading trigger, referencing
// public.forum_posts; `ds5_resolve_author_display` is the COM-14 attribution
// ladder; the rest are the C-A conversation contracts + the C-B forum contracts.
// ds5_lifecycle_* is auto-allowed by the /^ds\d+_lifecycle_/ prefix rule.)
const DS5_COMMUNICATION_FUNCTIONS = [
  // Legacy pair-column read-state guard (D15 rebuild) — DS-5-owned; DROPPED by
  // the C-A migration (20260719230500). Listed so the pre-apply window stays
  // truthful; the entry goes inert once the function leaves pg_proc.
  'can_update_conversation',
  'create_group_conversation',
  'ds5_require_fim_actor',
  'get_conversation_detail',
  'get_group_conversations',
  'get_my_conversations',
  'get_or_create_dm_conversation',
  'is_conversation_participant',
  'join_group_conversation',
  'leave_group_conversation',
  'mark_conversation_read',
  'send_message',
  'update_conversation_last_message_at',
  // C-B (FEAT-PD009) — forum contracts + the attribution ladder + the
  // flat-threading trigger. All reference public.forum_posts.
  'create_forum_post',
  'ds5_resolve_author_display',
  'enforce_flat_threading',
  'get_group_forum',
  'moderate_forum_post',
  'reply_to_forum_post',
  // C-C (FEAT-PD010) — the realtime hint-emission trigger fn that fans out per
  // active participant references public.conversation_participants. The emit
  // helper (ds5_emit_hint) and the two forum trigger fns reference no DS table
  // (NEW.* only), so they need no entry.
  'ds5_emit_message_hint',
  // C-D (FEAT-PD011) — announcement + window + report contracts (reference
  // public.announcements / public.forum_posts / public.content_reports /
  // public.messages). ds5_is_fim_actor is the boolean RLS sibling of
  // ds5_require_fim_actor (users only, listed for the same reason).
  'send_community_announcement',
  'send_platform_announcement',
  'retract_announcement',
  'get_group_announcements',
  'get_platform_announcements',
  'edit_own_forum_post',
  'delete_own_forum_post',
  'submit_content_report',
  'ds5_is_fim_actor',
];

const DS_OWNED_ALLOWLIST = new Set<string>([
  ...DS3_JOURNEY_FUNCTIONS,
  ...DS7_JOURNAL_FUNCTIONS,
  ...DS5_COMMUNICATION_FUNCTIONS,
]);

// ADR-U047 Amendment 2 — vertical-composition allowlist (a DISTINCT category,
// never merged into the DS-owned list, so every carve-out use stays visible).
// A platform function fulfilling a cross-cutting VERTICAL obligation (ADR-U002)
// may compose domain services' published READ contracts: read-only,
// contract-only (never a DS table, never a lifecycle mutation), each dataset
// keeping its one substrate home (the composite calls, never inlines). Every
// entry cites its vertical + obligation (Amendment 2 bound a).
const VERTICAL_COMPOSITION_ALLOWLIST = new Set<string>([
  // Privacy/GDPR — whole-account export completeness (Art. 15/20; audit AC-4,
  // COR-A W8, PR #191): get_own_data_export composes get_own_journal_export()
  // and get_own_step_instances_export() platform-side so one RPC returns the
  // complete document on every surface.
  'get_own_data_export',
]);

// The ten Core lifecycle functions COR-A W4/W5 relocates (ADR-U047 §"the live
// relocation set" + Amendment 1). NOT allowlisted — they are the demonstrated-red
// now and must drop out when the inversion migration lands. Listed only to
// annotate the report. admin_hard_delete_user is the tenth site the W3 gate found
// during W4 (the audit's AC-1 "nine" missed it) — relocated via the fourth fact
// ds3_lifecycle_user_hard_deleted, NOT carried as a standing exception.
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

function stripComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlock
    .split('\n')
    .map((line) => {
      const i = line.indexOf('--');
      return i >= 0 ? line.slice(0, i) : line;
    })
    .join('\n');
}

function referencedDsTables(body: string): string[] {
  const clean = stripComments(body);
  // Schema-qualified only (ADR-U047 A2): search_path='' makes every real
  // relation reference `public.<table>`; bare names in a body are key literals
  // or identifiers, not relations (the PR #191 'journeys' jsonb key).
  return DS_TABLES.filter((t) =>
    new RegExp(`\\bpublic\\.${t}\\b`, 'i').test(clean),
  );
}

type FnRow = { name: string; args: string; body: string };

describe('Internal-API inversion conformance (ADR-U047 rule 3, COR-A W3)', () => {
  it('no Core function references a DS-owned table (only DS-owned functions may)', async () => {
    const rows = (await runAdminSql(`
      select p.proname as name,
             pg_get_function_identity_arguments(p.oid) as args,
             p.prosrc as body
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prokind = 'f'
       order by p.proname;
    `)) as unknown as FnRow[];

    expect(rows.length).toBeGreaterThan(0); // sanity: catalog reachable

    const offenders = rows
      .map((r) => ({ name: r.name, args: r.args, tables: referencedDsTables(r.body ?? '') }))
      .filter((r) => r.tables.length > 0)
      .filter(
        (r) =>
          !DS_OWNED_ALLOWLIST.has(r.name) &&
          !VERTICAL_COMPOSITION_ALLOWLIST.has(r.name) &&
          !/^ds\d+_lifecycle_/.test(r.name),
      );

    const fmt = (o: { name: string; args: string; tables: string[] }) =>
      `  - ${o.name}(${o.args})  ->  ${o.tables.join(', ')}`;
    const inScope = offenders.filter((o) => COR_A_W4_RELOCATION_TARGETS.has(o.name));
    const unexpected = offenders.filter((o) => !COR_A_W4_RELOCATION_TARGETS.has(o.name));

    // Print the full breakdown so the red evidence is complete.
    // eslint-disable-next-line no-console
    console.error(
      [
        '',
        'Internal-API inversion conformance (ADR-U047 rule 3):',
        `  Core functions referencing DS-owned tables: ${offenders.length}`,
        '',
        `  COR-A W4/W5 relocation targets — expected RED until the inversion migration lands (${inScope.length}):`,
        ...inScope.map(fmt),
        ...(unexpected.length
          ? ['', `  UNEXPECTED crossings — NOT a known COR-A target, investigate (${unexpected.length}):`, ...unexpected.map(fmt)]
          : []),
        '',
      ].join('\n'),
    );

    // The gate: no Core function outside the DS-owned allowlist may reference a
    // DS-owned table. RED now (all ten); GREEN once COR-A W4/W5 relocates them all.
    const report = offenders.map(fmt).join('\n');
    expect(report).toBe('');
  });
});
