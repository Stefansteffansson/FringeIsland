/**
 * FEAT-H004 STORY-3 — the farewell ("say goodbye") seam (consumes FEAT-PC002).
 *
 * `explicitEraseMist` is the lib-behind-route wrapper over the platform
 * `explicit_erase_mist` RPC (the immediate Mist erasure cascade — the honest
 * counterpart to leaving silently, which the server-side reaper handles). It runs
 * SERVER-SIDE (the `/api/auth/farewell` route); RPCs never run from the browser
 * (ADR-U009 / Hub narrow-exception rule). The RPC authorizes by `auth.uid()` +
 * `is_temporary`, so only the owning Mist can erase its own session and a FIM is
 * refused (`42501`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function explicitEraseMist(
  supabase: SupabaseClient,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('explicit_erase_mist');
  return { error: error?.message ?? null };
}
