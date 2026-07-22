'use client';

import { useEffect, useRef } from 'react';
import { realtimeManager } from '@/lib/realtime/manager';

/**
 * FEAT-H027 (TASK-CC-05) — the page-scoped forum tenant.
 *
 * `GroupForumSection` registers `group:<G>:forum` while it is mounted and tears
 * it down on unmount; navigating between groups swaps the subscription (never
 * both, never neither), because the effect is keyed on the group id. A page
 * without the section calls nothing, so it holds no forum subscription.
 *
 * The tenant only signals "something changed" — the section re-reads its loaded
 * window through the forum contract. The hint's `post_id` is correlation only;
 * nothing here patches the list from a payload (the refetch-don't-patch fence).
 */

export function forumTopic(groupId: string): string {
  return `group:${groupId}:forum`;
}

export function useForumTenant(groupId: string | null, onHint: () => void): void {
  // Keep the latest callback in a ref so a fresh `onHint` each render never
  // churns the subscription — only a group change re-subscribes.
  const onHintRef = useRef(onHint);
  useEffect(() => {
    onHintRef.current = onHint;
  }, [onHint]);

  useEffect(() => {
    if (!groupId) return;
    return realtimeManager.registerTenant({
      topic: forumTopic(groupId),
      // forum_post_edited: RIDER-3 (A-COM walk 2026-07-22) — the C-D edit
      // window postdates this tenant; without the event an edit stayed stale
      // on other members' open pages until reload.
      events: ['forum_post_created', 'forum_post_moderated', 'forum_post_edited'],
      onHint: () => onHintRef.current(),
    });
  }, [groupId]);
}
