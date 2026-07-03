/**
 * FEAT-PD001 — personal Journal contracts (IDN-5, DS-7 Intelligence).
 *
 * Typed wrappers over the five journal RPCs — the Platform API surface for
 * the Journal primitive (PostgREST RPC per ADR-U038). All enforcement is
 * substrate-side (SECURITY DEFINER + revoked table grants): these wrappers
 * carry no rule of their own and throw the underlying `PostgrestError` so a
 * route can map SQLSTATE → HTTP (42501 → 403, P0002 → 404, 22023/23514 → 400).
 *
 * Error payloads must never echo `body` content downstream (FEAT-PD001
 * Observability no-go) — the substrate's messages are content-free.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface JournalEntry {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Versioned own-subject export section — composed with the PC008 document
 *  at the surface (`journal` key), never merged platform-side. */
export interface JournalExport {
  schema_version: number;
  exported_at: string;
  entries: JournalEntry[];
}

export async function createJournalEntry(
  supabase: SupabaseClient,
  title: string | null,
  body: string,
): Promise<JournalEntry> {
  const { data, error } = await supabase.rpc('create_journal_entry', {
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return data as unknown as JournalEntry;
}

export async function updateJournalEntry(
  supabase: SupabaseClient,
  entryId: string,
  title: string | null,
  body: string,
): Promise<JournalEntry> {
  const { data, error } = await supabase.rpc('update_journal_entry', {
    p_entry_id: entryId,
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return data as unknown as JournalEntry;
}

export async function deleteJournalEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<void> {
  const { error } = await supabase.rpc('delete_journal_entry', {
    p_entry_id: entryId,
  });
  if (error) throw error;
}

export async function fetchOwnJournalEntries(
  supabase: SupabaseClient,
  options?: { limit?: number; before?: string },
): Promise<JournalEntry[]> {
  const { data, error } = await supabase.rpc('get_own_journal_entries', {
    ...(options?.limit !== undefined ? { p_limit: options.limit } : {}),
    ...(options?.before !== undefined ? { p_before: options.before } : {}),
  });
  if (error) throw error;
  return data as unknown as JournalEntry[];
}

export async function fetchOwnJournalExport(
  supabase: SupabaseClient,
): Promise<JournalExport> {
  const { data, error } = await supabase.rpc('get_own_journal_export');
  if (error) throw error;
  return data as unknown as JournalExport;
}
