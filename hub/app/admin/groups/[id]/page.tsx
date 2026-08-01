'use client';

import { use } from 'react';
import { AdminGroupDetail } from '@/components/admin/AdminGroupDetail';

// FEAT-H035: admin group detail with the ADM-9 actions and the RW-05 exit.
export default function AdminGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminGroupDetail groupId={id} />;
}
