'use client';

import { use } from 'react';
import { AdminReportDetail } from '@/components/admin/AdminReportDetail';

// FEAT-H037: report detail + the resolve ceremony (ADM-11).
export default function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminReportDetail reportId={id} />;
}
