'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { emitTelemetry } from '@/lib/observability/telemetry';
import type { GroupSummary } from '@/lib/groups/queries';

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // Client-side auth guard: send unauthenticated visitors to sign-in,
    // preserving the destination.
    if (!user) {
      router.replace('/login?redirect=/groups');
      return;
    }

    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // API-first: the frontend fetches /api/groups — never a direct table call.
        const res = await fetch('/api/groups');
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as { groups: GroupSummary[] };
        if (active) setGroups(data.groups ?? []);
      } catch (err) {
        if (active) {
          setError('Failed to load your groups.');
          emitTelemetry('groups.client_load_failed', { message: (err as Error).message });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading, router]);

  return (
    <AppShell title="My Groups">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">My Groups</h1>

      {authLoading || loading ? (
        <LoadingState label="Loading your groups..." />
      ) : error ? (
        <InlineError message={error} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="You're not an active member of any groups yet."
        />
      ) : (
        <ul data-testid="groups-list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-gray-800">{g.name}</h2>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    g.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {g.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              {g.description && <p className="mt-2 text-sm text-gray-600">{g.description}</p>}
              <p className="mt-4 text-xs text-gray-500">
                {g.member_count} {g.member_count === 1 ? 'member' : 'members'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
