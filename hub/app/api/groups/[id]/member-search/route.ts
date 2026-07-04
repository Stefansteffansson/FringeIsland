import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { searchInvitableMembers } from '@/lib/groups/invitations';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): the typeahead is an interactive hot read — Edge runtime,
// pinned to `dub1` (ADR-U035). Debounce lives client-side.
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H015 — GET /api/groups/[id]/member-search?q= (STORY-1 typeahead; the
 * D3 / DS-6 re-home seam Surface-side).
 *
 * The FEAT-PC012 `search_invitable_members()` contract decides everything
 * (invite_members gate, name-partial + exact-email matching — Open Q1 — cap 8,
 * no emails in the payload); this route relays `q` verbatim. THE QUERY IS
 * MEMBER CONTENT and never enters telemetry (STORY-6). ADR-U037 read identity.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('invitations.search_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q === '') {
    emitTelemetry('invitations.search_empty', { actor: userId, group: id });
    return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
  }

  try {
    const hits = await searchInvitableMembers(supabase, id, q);
    emitTelemetry('invitations.search', { actor: userId, group: id, hits: hits.length });
    return NextResponse.json(hits);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '22023') {
      emitTelemetry('invitations.search_invalid', { actor: userId, code });
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }
    if (code === '42501') {
      emitTelemetry('invitations.search_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Search is for inviters' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('invitations.search_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    emitTelemetry('invitations.search_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
