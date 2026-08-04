'use client';

import { use } from 'react';
import { AdminRoleTemplateDetail } from '@/components/admin/AdminRoleTemplateDetail';

// FEAT-H040: template detail — version history, draft editor (non-seeds),
// clone / save-draft / apply-and-rollback ceremonies (ADM-17, RB-4).
export default function AdminRoleTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminRoleTemplateDetail templateId={id} />;
}
