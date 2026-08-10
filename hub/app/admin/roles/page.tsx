'use client';

import { Suspense } from 'react';
import { AdminRolesView } from '@/components/admin/AdminRolesView';

// FEAT-H040: the role-template list + read-only catalogue (ADM-17, RB-4).
//
// FEAT-H045 STORY-2: the view reads `?deleted=` to name what was just removed,
// and `useSearchParams()` opts a client component out of static prerendering
// unless it sits under a Suspense boundary — `next build` fails the export
// otherwise. The fallback is the same skeleton shape the view paints while its
// own read is in flight (B6), so the boundary never flashes bare.
export default function AdminRolesPage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading role templates" className="space-y-2 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      }
    >
      <AdminRolesView />
    </Suspense>
  );
}
