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
  /** FEAT-PD019 additive key (ADR-U041 §5), served by the shared
   *  `ds5_resolve_author_display`: present on resolvable identities
   *  ('person' | 'group', open set); absent on rung-3 'Unknown' and on
   *  pre-PD019 payloads — readers stay tolerant. */
  kind?: string;
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
  options?: { before?: string; limit?: number; acting?: string },
): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('get_group_announcements', {
    p_group_id: groupId,
    ...(options?.before ? { p_before: options.before } : {}),
    ...(options?.limit !== undefined ? { p_limit: options.limit } : {}),
    // FEAT-H048 over FEAT-PD019 T3: the wielded read — the two-limb gate
    // (limbs 1+2a) runs against the acting group substrate-side.
    ...(options?.acting ? { p_acting: options.acting } : {}),
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
  acting?: string,
): Promise<Announcement> {
  const { data, error } = await supabase.rpc('send_community_announcement', {
    p_group_id: groupId,
    p_title: title,
    p_body: body,
    // FEAT-H048: the group announces — `sent_by_group_id` and the dual actor
    // exclusion on the fan-out are platform facts, not surface work.
    ...(acting ? { p_acting: acting } : {}),
  });
  if (error) throw error;
  return data as Announcement;
}

export async function retractAnnouncementRpc(
  supabase: SupabaseClient,
  announcementId: string,
  acting?: string,
): Promise<AnnouncementRetraction> {
  const { data, error } = await supabase.rpc('retract_announcement', {
    p_announcement_id: announcementId,
    // FEAT-H048: the wielded correction. A PLATFORM row's scope group is NULL,
    // so limb 2a refuses by construction — the DeusEx plane is never wieldable.
    ...(acting ? { p_acting: acting } : {}),
  });
  if (error) throw error;
  return data as AnnouncementRetraction;
}
