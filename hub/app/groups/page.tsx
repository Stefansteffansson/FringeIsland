'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { CreateGroupPanel } from '@/components/groups/CreateGroupPanel';
import { MyInvitations } from '@/components/groups/MyInvitations';
import { emitTelemetry } from '@/lib/observability/telemetry';
import type { GroupSummary } from '@/lib/groups/queries';

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setError(null);
    try {
      // API-first: the frontend fetches /api/groups — never a direct table call.
      const res = await fetch('/api/groups');
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { groups: GroupSummary[] };
      setGroups(data.groups ?? []);
    } catch (err) {
      setError('Failed to load your groups.');
      emitTelemetry('groups.client_load_failed', { message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    // Client-side auth guard: send unauthenticated visitors to sign-in,
    // preserving the destination.
    if (!user) {
      router.replace('/login?redirect=/groups');
      return;
    }

    setLoading(true);
    void loadGroups();
  }, [user, authLoading, router, loadGroups]);

  return (
    <AppShell title="My Groups">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">My Groups</h1>

      {/* FEAT-H013 STORY-1 (GRP-1): create a group and land in it. Only offered
          to a FIM — a Mist's list is empty and creation is contract-refused. */}
      {!authLoading && user && (
        <CreateGroupPanel onCreated={(id) => router.push(`/groups/${id}`)} />
      )}

      {/* FEAT-H015 STORY-4 (MEM-3): pending invitations live where the groups
          live — accepting re-reads the list (the group appears as the
          invitation leaves). Absent entirely when there are none. */}
      {!authLoading && user && <MyInvitations onAnswered={() => void loadGroups()} />}

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
                {/* FEAT-H013: row → detail navigation (GRP-4 completion). */}
                <h2 className="text-lg font-semibold text-gray-800">
                  <Link href={`/groups/${g.id}`} className="hover:underline">
                    {g.name}
                  </Link>
                </h2>
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
