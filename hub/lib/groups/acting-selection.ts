/**
 * FEAT-H046 STORY-4 — hat revalidation after an acting-contexts re-read.
 *
 * Pure and browser-safe by design: `lib/groups/acting.ts` holds the
 * server-side RPC couriers (outer-ring rule, ADR-U009 — a browser-reachable
 * module must not carry rpc() calls), so the page-side selection logic lives
 * here. The shape matches `ActingContext` structurally without importing it.
 */
export interface ActingContextLike {
  group_id: string;
  name: string;
  is_member_of_context?: boolean | null;
}

/**
 * A selected hat survives only if the fresh read still lists it WITH standing
 * in the context (`is_member_of_context` true); anything else falls back to
 * "Myself", carrying the dropped hat's name so the surface can say so
 * honestly. "Myself" (selected = null) always survives.
 */
export function revalidateHat(
  selected: { id: string; name: string } | null,
  contexts: ActingContextLike[],
): { keep: boolean; droppedName: string | null } {
  if (!selected) return { keep: true, droppedName: null };
  const stillStanding = contexts.some(
    (c) => c.group_id === selected.id && c.is_member_of_context === true,
  );
  return stillStanding
    ? { keep: true, droppedName: null }
    : { keep: false, droppedName: selected.name };
}
