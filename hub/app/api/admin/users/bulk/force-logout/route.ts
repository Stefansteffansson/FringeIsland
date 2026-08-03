import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleBulkAuthed } from '@/lib/admin/bulk-route';
import { emitTelemetry } from '@/lib/observability/telemetry';

// FEAT-H039: bulk force sign-out — one admin_force_logout([id]) per member,
// so audit rows land per member (never the batch shape).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.bulk_force_logout_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return handleBulkAuthed(supabase, user.id, request, 'force-logout');
}
