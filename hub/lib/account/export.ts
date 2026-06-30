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
 * sections; Domain-owned data (journey enrolments, …) and the Journal (IDN-5)
 * are forward-seam sections added by their areas later (§L3 scopes IDN-8 to
 * PC-4 — it does not read Domain tables). Consumers treat the document as data.
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

/**
 * The complete export document. `schema_version` lets a consumer branch; new
 * personal-data areas (the Journal; Domain-owned sections) are added under a
 * version bump, never by reshaping existing sections.
 */
export interface DataExport {
  schema_version: number;
  exported_at: string;
  subject: DataExportSubject;
  profile: DataExportProfile;
  account_state: DataExportAccountState;
  consent: DataExportConsentEntry[];
  memberships: DataExportMembership[];
}

/**
 * Assemble the caller's own complete data via the FEAT-PC008 SECURITY DEFINER
 * contract. The function returns the full document and writes the durable
 * export-event record as part of the same call. Throws the underlying
 * `PostgrestError` on failure so the route can surface it (500) rather than
 * hand back a partial document.
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
