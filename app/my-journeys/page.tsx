'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface JourneyEnrollment {
  id: string;
  journey_id: string;
  status: string;
  enrolled_at: string;
  progress_data: {
    current_step_id?: string;
    completed_steps?: string[];
    total_steps?: number;
  };
  journey: {
    id: string;
    title: string;
    description: string | null;
    difficulty_level: string | null;
    estimated_duration_minutes: number | null;
  };
}

interface GroupJourneyEnrollment extends JourneyEnrollment {
  group: {
    id: string;
    name: string;
  };
}

export default function MyJourneysPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [individualJourneys, setIndividualJourneys] = useState<JourneyEnrollment[]>([]);
  const [groupJourneys, setGroupJourneys] = useState<GroupJourneyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchEnrollments();
    }
  }, [user, authLoading]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's database ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user!.id)
        .single();

      if (userError) throw userError;

      // Fetch individual enrollments
      const { data: individualData, error: individualError } = await supabase
        .from('journey_enrollments')
        .select(`
          id,
          journey_id,
          status,
          enrolled_at,
          progress_data,
          journeys (
            id,
            title,
            description,
            difficulty_level,
            estimated_duration_minutes
          )
        `)
        .eq('user_id', userData.id)
        .not('journeys', 'is', null)
        .order('enrolled_at', { ascending: false });

      if (individualError) throw individualError;

      // Get user's group IDs first
      const { data: userGroups } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', userData.id)
        .eq('status', 'active');

      const groupIds = userGroups?.map(g => g.group_id) || [];

      // Fetch group enrollments (only if user belongs to groups)
      let groupData = null;
      if (groupIds.length > 0) {
        const { data, error: groupError } = await supabase
          .from('journey_enrollments')
          .select(`
            id,
            journey_id,
            status,
            enrolled_at,
            progress_data,
            journeys (
              id,
              title,
              description,
              difficulty_level,
              estimated_duration_minutes
            ),
            groups (
              id,
              name
            )
          `)
          .in('group_id', groupIds)
          .not('journeys', 'is', null)
          .not('groups', 'is', null)
          .order('enrolled_at', { ascending: false });

        if (groupError) throw groupError;
        groupData = data;
      }

      // Map the data to match our interface (journeys -> journey, groups -> group)
      const mappedIndividual = (individualData || [])
        .filter((e: any) => e.journeys)
        .map((e: any) => ({
          ...e,
          journey: e.journeys,
        }));

      const mappedGroup = (groupData || [])
        .filter((e: any) => e.journeys && e.groups)
        .map((e: any) => ({
          ...e,
          journey: e.journeys,
          group: e.groups,
        }));

      setIndividualJourneys(mappedIndividual);
      setGroupJourneys(mappedGroup);
    } catch (err: any) {
      console.error('Error fetching enrollments:', err);
      setError('Failed to load your journeys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string; icon: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '✅' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏸️' },
      frozen: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '❄️' },
    };

    const style = statusStyles[status] || statusStyles.active;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <span>{style.icon}</span>
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    if (!difficulty) return null;

    const difficultyStyles: Record<string, string> = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyStyles[difficulty]}`}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </span>
    );
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPlayButtonLabel = (enrollment: JourneyEnrollment): string => {
    if (enrollment.status === 'completed') return 'Review Journey';
    if (enrollment.progress_data?.current_step_id) return 'Continue';
    return 'Start Journey';
  };

  const JourneyCard = ({ enrollment, groupName }: { enrollment: JourneyEnrollment; groupName?: string }) => {
    if (!enrollment.journey) return null;

    const completedCount = enrollment.progress_data?.completed_steps?.length || 0;
    const totalSteps = enrollment.progress_data?.total_steps;
    const showProgress = totalSteps && totalSteps > 0 && enrollment.status === 'active';
    const progressPercent = showProgress ? Math.round((completedCount / totalSteps) * 100) : 0;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {enrollment.journey.title}
            </h3>
            {enrollment.journey.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {enrollment.journey.description}
              </p>
            )}
          </div>
          <div className="ml-4">
            {getStatusBadge(enrollment.status)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-500">
          {enrollment.journey.difficulty_level && getDifficultyBadge(enrollment.journey.difficulty_level)}
          {enrollment.journey.estimated_duration_minutes && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(enrollment.journey.estimated_duration_minutes)}
            </span>
          )}
          <span>Enrolled {formatDate(enrollment.enrolled_at)}</span>
        </div>

        {/* Progress bar (only when in-progress and total_steps is known) */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{completedCount} of {totalSteps} steps complete</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-blue-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {groupName && (
          <div className="mb-4 flex items-center gap-2 text-sm text-blue-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>via {groupName}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/journeys/${enrollment.journey_id}/play`}
            className="flex-1 text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {getPlayButtonLabel(enrollment)}
          </Link>
          <Link
            href={`/journeys/${enrollment.journey_id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Details
          </Link>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your journeys...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">😞</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchEnrollments}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Journeys</h1>
          <p className="text-gray-600">Track your learning progress and continue your journeys</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('individual')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'individual'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Individual Journeys ({individualJourneys.length})
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'group'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Group Journeys ({groupJourneys.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'individual' ? (
          individualJourneys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {individualJourneys.map((enrollment) => (
                <JourneyCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Individual Journeys Yet</h3>
              <p className="text-gray-600 mb-6">
                Start your learning journey by enrolling in one of our courses
              </p>
              <Link
                href="/journeys"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Browse Journey Catalog
              </Link>
            </div>
          )
        ) : (
          groupJourneys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupJourneys.map((enrollment) => (
                <JourneyCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  groupName={(enrollment as GroupJourneyEnrollment).group.name}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Group Journeys Yet</h3>
              <p className="text-gray-600 mb-6">
                Your groups haven't enrolled in any journeys. Group Leaders can enroll groups from the journey catalog.
              </p>
              <Link
                href="/journeys"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Browse Journey Catalog
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}
