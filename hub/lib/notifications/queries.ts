import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H030 — server-side couriers over the FEAT-PD013 notification-routing
 * contracts (A-NTF Cycle N-A). Every read/mutation goes through the DS-5
 * routing RPCs — never a direct `notifications` table touch (ADR-U009/U038;
 * the N-A migration dropped the user-facing UPDATE/DELETE policies, so the
 * contracts are the only door). These run in BFF routes with the caller's
 * session client, so the substrate sees the real four-hop actor.
 */

/** The list payload. N-A shipped through `expires_at`; N-B (FEAT-PD014) adds
 *  `action_data` — the typed-action dispatch context (membership_id) and the
 *  convergence record (resolved_by_name / resolved_outcome). `action_taken_at`
 *  stays server-only (export). */
export interface NotificationRow {
  id: string;
  kind: string;
  category: string;
  title: string;
  body: string;
  group_id: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  action_type: string | null;
  action_data: Record<string, unknown> | null;
  action_taken: string | null;
  expires_at: string | null;
}

export interface NotificationCursor {
  created_at: string;
  id: string;
}

export async function fetchOwnNotifications(
  supabase: SupabaseClient,
  options?: { before?: NotificationCursor; limit?: number },
): Promise<NotificationRow[]> {
  const { data, error } = await supabase.rpc('get_own_notifications', {
    p_limit: options?.limit ?? 20,
    ...(options?.before
      ? {
          p_before_created_at: options.before.created_at,
          p_before_id: options.before.id,
        }
      : {}),
  });
  if (error) throw error;
  return (data as NotificationRow[]) ?? [];
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc('get_own_unread_notification_count');
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function markNotificationReadRpc(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
}

export async function markAllNotificationsReadRpc(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
  return (data as number) ?? 0;
}
