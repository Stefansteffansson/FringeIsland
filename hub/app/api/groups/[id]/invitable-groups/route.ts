import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { searchInvitableGroups } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

// The typeahead debounce lives client-side.

/**
 * FEAT-H018 — GET /api/groups/[id]/invitable-groups?q= (STORY-2 typeahead;
 * the D3 / DS-6 re-home seam applied to groups).
 *
 * The FEAT-PC015 `search_invitable_groups()` contract decides everything
 * (invite_members gate, public active engagement groups, cap 8, self +
 * existing + cycle-candidate exclusion); this route relays `q` verbatim.
 * THE QUERY IS MEMBER CONTENT and never enters telemetry.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('acting.group_search_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q === '') {
    emitTelemetry('acting.group_search_empty', { actor: userId, group: id });
    return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
  }

  try {
    const hits = await searchInvitableGroups(supabase, id, q);
    emitTelemetry('acting.group_search', { actor: userId, group: id, hits: hits.length });
    return NextResponse.json(hits);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '22023') {
      emitTelemetry('acting.group_search_invalid', { actor: userId, code });
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }
    if (code === '42501') {
      emitTelemetry('acting.group_search_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Search is for inviters' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('acting.group_search_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    emitTelemetry('acting.group_search_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
