import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  createJournalEntry,
  fetchOwnJournalEntries,
} from '@/lib/journal/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H011 — GET /api/journal (IDN-5).
 *
 * The caller's own journal entries, newest-first, keyset-paginated
 * (`?limit=&before=`), via the FEAT-PD001 `get_own_journal_entries()`
 * contract. Private BFF plumbing per ADR-U038 — every privacy rule lives in
 * the substrate (revoked table grants + own-rows RPCs); this route only maps
 * session → 401 and failures → 500. Telemetry is content-free: entry bodies
 * and titles never appear in events or error payloads.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('journal.list_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const before = url.searchParams.get('before') ?? undefined;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const entries = await fetchOwnJournalEntries(supabase, {
      ...(limit !== undefined && Number.isFinite(limit) ? { limit } : {}),
      ...(before ? { before } : {}),
    });
    emitTelemetry('journal.list', { actor: userId, count: entries.length });
    return NextResponse.json({ entries });
  } catch (err) {
    emitTelemetry('journal.list_failed', {
      actor: userId,
      code: (err as { code?: string }).code,
    });
    return NextResponse.json({ error: 'Failed to load journal' }, { status: 500 });
  }
}

/**
 * FEAT-H011 — POST /api/journal (IDN-5, STORY-1).
 *
 * Creates an own entry via the FEAT-PD001 `create_journal_entry()` contract.
 * SQLSTATE → HTTP: 42501 (Mist / non-active account — the substrate's
 * FIM-only gate) → 403; 22023/23514 (missing/oversized body or title) → 400;
 * else 500. The gate itself is substrate-side and adversarially tested there
 * (journal-contract.test.ts) — this mapping is presentation only.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('journal.create_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { title?: unknown; body?: unknown }
    | null;
  const title = payload?.title;
  const body = payload?.body;

  if (
    typeof body !== 'string' ||
    body.trim() === '' ||
    (title !== undefined && title !== null && typeof title !== 'string')
  ) {
    emitTelemetry('journal.create_invalid', { actor: user.id });
    return NextResponse.json({ error: 'A journal entry needs a body' }, { status: 400 });
  }

  try {
    const entry = await createJournalEntry(supabase, (title as string | null) ?? null, body);
    emitTelemetry('journal.create', { actor: user.id });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('journal.create_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'The journal is for members' }, { status: 403 });
    }
    if (code === '22023' || code === '23514') {
      emitTelemetry('journal.create_invalid', { actor: user.id, code });
      return NextResponse.json({ error: 'Invalid journal entry' }, { status: 400 });
    }
    emitTelemetry('journal.create_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to save the entry' }, { status: 500 });
  }
}
