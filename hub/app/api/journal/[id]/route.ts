import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateJournalEntry,
  deleteJournalEntry,
} from '@/lib/journal/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H011 — PATCH/DELETE /api/journal/[id] (IDN-5, STORY-3).
 *
 * Private BFF plumbing over the FEAT-PD001 own-row contracts. SQLSTATE → HTTP:
 * P0002 (foreign OR nonexistent id — the substrate's no-existence-leak
 * refusal) → 404; 42501 (non-active account) → 403; 22023/23514 → 400; else
 * 500. Telemetry is content-free — bodies and titles never appear in events
 * or error payloads.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('journal.update_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
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
    emitTelemetry('journal.update_invalid', { actor: user.id });
    return NextResponse.json({ error: 'A journal entry needs a body' }, { status: 400 });
  }

  try {
    const entry = await updateJournalEntry(supabase, id, (title as string | null) ?? null, body);
    emitTelemetry('journal.update', { actor: user.id });
    return NextResponse.json({ entry });
  } catch (err) {
    return mapJournalWriteError(err, 'journal.update', user.id);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('journal.delete_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteJournalEntry(supabase, id);
    emitTelemetry('journal.delete', { actor: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapJournalWriteError(err, 'journal.delete', user.id);
  }
}

function mapJournalWriteError(err: unknown, event: string, actor: string) {
  const code = (err as { code?: string }).code;
  if (code === 'P0002') {
    emitTelemetry(`${event}_not_found`, { actor });
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }
  if (code === '42501') {
    emitTelemetry(`${event}_refused`, { actor, code });
    return NextResponse.json({ error: 'The journal is for members' }, { status: 403 });
  }
  if (code === '22023' || code === '23514') {
    emitTelemetry(`${event}_invalid`, { actor, code });
    return NextResponse.json({ error: 'Invalid journal entry' }, { status: 400 });
  }
  emitTelemetry(`${event}_failed`, { actor, code });
  return NextResponse.json({ error: 'Failed to update the entry' }, { status: 500 });
}
