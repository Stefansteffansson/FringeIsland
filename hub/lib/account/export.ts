/**
 * FEAT-PC008 — member data export contract (IDN-8).
 *
 * The platform-tier own-subject assembly of the caller's complete personal data
 * into one versioned document. Surfaced API-first at `GET /api/account/export`
 * and consumed by the Hub (FEAT-H010). It CANNOT be a set of plain RLS-scoped
 * `.from(...)` reads: the export reaches across Core-owned substrate (`users`,
 * `consent_records`, `group_memberships`) and records a durable export-event,
 * which needs the `get_own_data_export()` SECURITY DEFINER function. That
 * function resolves the caller via `auth.uid()` (so a suspended member can still
 * exercise their right of access) and projects the caller's OWN rows only — no
 * target parameter.
 *
 * The document is carried under an integer `schema_version` with named, open
 * sections. Since COR-A W8 (audit finding AC-4) export COMPLETENESS is the
 * platform's contract: the former forward-seam sections — the Journal
 * (FEAT-PD001) and the walks/step-instances dataset (FEAT-PD007) — are
 * composed PLATFORM-side by `get_own_data_export()` itself (which calls the
 * owning Domain contracts under the same caller identity), so one RPC returns
 * the full GDPR export on every surface. Consumers treat the document as data;
 * the section interfaces below are deliberately declared locally (no TS import
 * from the journal/journeys area modules — the AC-5 plumbing rule).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DataExportSubject {
  user_id: string;
  personal_group_id: string | null;
  email: string;
}

export interface DataExportProfile {
  full_name: string;
  nickname: string;
  display_preference: string;
  show_real_name: boolean;
  avatar_url: string | null;
  bio: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataExportAccountState {
  is_active: boolean;
  is_decommissioned: boolean;
  /** Derived label — 'active' | 'suspended' | 'decommissioned' (open data). */
  state: string;
}

export interface DataExportConsentEntry {
  purpose: string;
  decision: string;
  policy_version: string;
  captured_at: string;
  capture_context: Record<string, unknown> | null;
}

export interface DataExportMembership {
  group_id: string;
  group_name: string | null;
  status: string;
  added_at: string;
}

/** One journal entry in the platform-composed `journal` section (FEAT-PD001). */
export interface DataExportJournalEntry {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/** The versioned journal section — `get_own_journal_export()`'s document,
 *  composed platform-side since COR-A W8 (present-and-empty, never absent). */
export interface DataExportJournal {
  schema_version: number;
  exported_at: string;
  entries: DataExportJournalEntry[];
}

/** One of the caller's own instance rows in an exported walk (FEAT-PD007). */
export interface DataExportWalkStep {
  step_id: string;
  step_title: string;
  kind: string;
  created_at: string;
  completed_at: string | null;
  response: Record<string, unknown> | null;
  response_updated_at: string | null;
}

/** One exported walk — an enrolment the caller travelled, with their own
 *  instances only. The `journeys` section is `get_own_step_instances_export()`'s
 *  fixed shape, composed platform-side since COR-A W8. */
export interface DataExportWalk {
  enrollment_id: string;
  journey_id: string;
  journey_title: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  steps: DataExportWalkStep[];
}

/**
 * The complete export document. `schema_version` lets a consumer branch;
 * additive keys extend the document in place (the PC-3 §7 shape — COR-A W8
 * added `journal` + `journeys` without a bump because the delivered download
 * already carried them); existing sections are never reshaped.
 */
export interface DataExport {
  schema_version: number;
  exported_at: string;
  subject: DataExportSubject;
  profile: DataExportProfile;
  account_state: DataExportAccountState;
  consent: DataExportConsentEntry[];
  memberships: DataExportMembership[];
  journal: DataExportJournal;
  journeys: DataExportWalk[];
}

/**
 * Assemble the caller's own complete data via the FEAT-PC008 SECURITY DEFINER
 * contract (extended platform-side by COR-A W8 to include the journal and
 * walks sections — completeness is the platform's, not the caller's, concern).
 * The function returns the full document and writes the durable export-event
 * record as part of the same call. Throws the underlying `PostgrestError` on
 * failure so the route can surface it (500) rather than hand back a partial
 * document.
 */
export async function fetchOwnDataExport(
  supabase: SupabaseClient,
): Promise<DataExport> {
  const { data, error } = await supabase.rpc('get_own_data_export');
  if (error) throw error;
  // supabase-js types `.rpc()` loosely; narrow through `unknown` so `next build`
  // type-checks (the same posture as lib/consent/queries.ts).
  return data as unknown as DataExport;
}
