import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H028 — server-side couriers over the FEAT-PD011 announcement contracts
 * (Cycle C-D; ADR-U049). Every read and write goes through the platform RPCs —
 * never a direct table touch (ADR-U009/U038). These run in BFF routes with the
 * caller's session client, so the substrate sees the real actor and applies the
 * scope-separated gates (community: `send_announcements`; platform:
 * `manage_all_groups`). Reads are membership/FIM-gated and exclude retracted
 * rows platform-side — there is nothing for the surface to filter.
 */

/** COM-14 attribution ladder, resolved platform-side (ADR-U021). The surface
 *  renders `display_name` styled by `attribution`; it never computes membership.
 *  Same shape as the forum/messages couriers. */
export interface AuthorDisplay {
  display_name: string;
  attribution: 'active' | 'former' | 'unknown';
}

/** A read/send announcement row-doc — the FEAT-PD011 shape shared by
 *  `get_group_announcements`, `get_platform_announcements`, and
 *  `send_community_announcement`. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_group_id: string | null;
  author: AuthorDisplay;
}

/** The `retract_announcement` result — the row's terminal retraction pointer. */
export interface AnnouncementRetraction {
  id: string;
  retracted_at: string;
}

export async function fetchGroupAnnouncements(
  supabase: SupabaseClient,
  groupId: string,
  options?: { before?: string; limit?: number },
): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('get_group_announcements', {
    p_group_id: groupId,
    ...(options?.before ? { p_before: options.before } : {}),
    ...(options?.limit !== undefined ? { p_limit: options.limit } : {}),
  });
  if (error) throw error;
  return (data as { announcements: Announcement[] }).announcements;
}

export async function fetchPlatformAnnouncements(
  supabase: SupabaseClient,
  options?: { before?: string; limit?: number },
): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('get_platform_announcements', {
    ...(options?.before ? { p_before: options.before } : {}),
    ...(options?.limit !== undefined ? { p_limit: options.limit } : {}),
  });
  if (error) throw error;
  return (data as { announcements: Announcement[] }).announcements;
}

export async function sendCommunityAnnouncementRpc(
  supabase: SupabaseClient,
  groupId: string,
  title: string,
  body: string,
): Promise<Announcement> {
  const { data, error } = await supabase.rpc('send_community_announcement', {
    p_group_id: groupId,
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return data as Announcement;
}

export async function retractAnnouncementRpc(
  supabase: SupabaseClient,
  announcementId: string,
): Promise<AnnouncementRetraction> {
  const { data, error } = await supabase.rpc('retract_announcement', {
    p_announcement_id: announcementId,
  });
  if (error) throw error;
  return data as AnnouncementRetraction;
}
