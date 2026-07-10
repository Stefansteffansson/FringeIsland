import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  fetchGroupInvitations,
  inviteMember,
  inviteByEmail,
} from '@/lib/groups/invitations';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H015 — GET /api/groups/[id]/invitations (STORY-3 read).
 *
 * The FEAT-PC012 `get_group_invitations()` contract decides everything
 * (visibility, the invite_members gate — Open Q3 — and the honest
 * predicate-based expired flag); this route is presentation only. ADR-U037:
 * read-path identity via local JWT verification. SQLSTATE → HTTP: P0002 → 404
 * (private and absent indistinguishable); 42501 → 403. Telemetry id-only —
 * email addresses are third-party PII and never appear in events (STORY-6).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('invitations.list_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pending = await fetchGroupInvitations(supabase, id);
    emitTelemetry('invitations.list', { actor: userId, group: id });
    return NextResponse.json(pending);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('invitations.list_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('invitations.list_refused', { actor: userId, code });
      return NextResponse.json(
        { error: 'The pending list is for inviters' },
        { status: 403 },
      );
    }
    emitTelemetry('invitations.list_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }
}

/**
 * FEAT-H015 — POST /api/groups/[id]/invitations (STORY-1/2 invite).
 *
 * Body: `{ member_group_id }` XOR `{ email }` — mixed or empty is 400 with no
 * contract call. The contracts self-gate (invite_members, the target-invitable
 * P0002 no-leak, the existing-FIM conversion — Open Q2); the route relays the
 * `kind` so the panel renders what the re-read will show. NO email is sent
 * (D4 — the V3 dispatch seam). Mutation → per-request getUser.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('invitations.invite_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    member_group_id?: string;
    email?: string;
  };

  const hasMember = typeof body.member_group_id === 'string' && body.member_group_id !== '';
  const hasEmail = typeof body.email === 'string' && body.email !== '';
  if (hasMember === hasEmail) {
    emitTelemetry('invitations.invite_invalid_body', { actor: user.id });
    return NextResponse.json(
      { error: 'Provide exactly one of member_group_id or email' },
      { status: 400 },
    );
  }

  try {
    if (hasMember) {
      await inviteMember(supabase, id, body.member_group_id!);
      emitTelemetry('invitations.invite_member', { actor: user.id, group: id });
      return NextResponse.json({ kind: 'member_invitation' }, { status: 201 });
    }
    const result = await inviteByEmail(supabase, id, body.email!);
    emitTelemetry('invitations.invite_email', { actor: user.id, group: id });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('invitations.invite_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === '22023') {
      emitTelemetry('invitations.invite_invalid', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Invalid invitation' },
        { status: 400 },
      );
    }
    if (code === '23505') {
      emitTelemetry('invitations.invite_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Already invited' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('invitations.invite_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('invitations.invite_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to invite' }, { status: 500 });
  }
}
