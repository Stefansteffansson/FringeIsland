/**
 * FEAT-PC009 — session inventory & targeted revocation contracts (IDN-11).
 *
 * Typed wrappers over the two session RPCs — the Platform API surface for
 * per-device session management (PostgREST RPC per ADR-U038). All enforcement
 * is substrate-side (SECURITY DEFINER over auth.sessions; FIM-only 42501;
 * P0002 no-existence-leak): these wrappers carry no rule of their own and
 * throw the underlying `PostgrestError` so a route can map SQLSTATE → HTTP.
 *
 * Session PII discipline (V2): `user_agent` / `ip` are rendered to the member
 * and must never be echoed into telemetry or error payloads downstream.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeviceSession {
  id: string;
  created_at: string;
  last_active: string;
  user_agent: string | null;
  ip: string | null;
  is_current: boolean;
}

export async function fetchOwnSessions(supabase: SupabaseClient): Promise<DeviceSession[]> {
  const { data, error } = await supabase.rpc('get_own_sessions');
  if (error) throw error;
  return data as unknown as DeviceSession[];
}

export async function revokeOwnSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase.rpc('revoke_own_session', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}
