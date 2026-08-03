import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleBulkAuthed } from '@/lib/admin/bulk-route';
import { emitTelemetry } from '@/lib/observability/telemetry';

// FEAT-H039: bulk reactivate — serial loop over FEAT-PC021 admin_update_user_status(true).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.bulk_reactivate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return handleBulkAuthed(supabase, user.id, request, 'reactivate');
}
