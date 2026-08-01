'use client';

import { use } from 'react';
import { AdminMemberDetail } from '@/components/admin/AdminMemberDetail';

// FEAT-H036: admin member detail with the state-honest action rail
// (ADM-3/4/5/6/12/18).
export default function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminMemberDetail userId={id} />;
}
