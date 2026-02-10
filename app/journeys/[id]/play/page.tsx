'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Journey, PlayerEnrollment } from '@/lib/types/journey';
import { useAuth } from '@/lib/auth/AuthContext';
import JourneyPlayer from '@/components/journeys/JourneyPlayer';

export default function JourneyPlayPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [enrollment, setEnrollment] = useState<PlayerEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeyCompleted, setJourneyCompleted] = useState(false);

  const supabase = createClient();
  const journeyId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/journeys/${journeyId}/play`);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (user && journeyId) {
      loadPlayerData();
    }
  }, [user, journeyId]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's database profile ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user!.id)
        .single();

      if (userError) throw userError;

      // Fetch journey
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .single();

      if (journeyError) throw journeyError;
      if (!journeyData) {
        setError('Journey not found.');
        return;
      }

      // Check individual enrollment
      const { data: individualEnrollment } = await supabase
        .from('journey_enrollments')
        .select('id, journey_id, user_id, group_id, status, progress_data, last_accessed_at, completed_at')
        .eq('journey_id', journeyId)
        .eq('user_id', userData.id)
        .maybeSingle();

      if (individualEnrollment) {
        setJourney(journeyData);
        setEnrollment(individualEnrollment as PlayerEnrollment);
        return;
      }

      // Check group enrollment
      const { data: userGroups } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', userData.id)
        .eq('status', 'active');

      const groupIds = userGroups?.map((g: { group_id: string }) => g.group_id) || [];

      if (groupIds.length > 0) {
        const { data: groupEnrollment } = await supabase
          .from('journey_enrollments')
          .select('id, journey_id, user_id, group_id, status, progress_data, last_accessed_at, completed_at')
          .eq('journey_id', journeyId)
          .in('group_id', groupIds)
          .maybeSingle();

        if (groupEnrollment) {
          setJourney(journeyData);
          setEnrollment(groupEnrollment as PlayerEnrollment);
          return;
        }
      }

      // Not enrolled — redirect to detail page
      router.push(`/journeys/${journeyId}`);
    } catch (err: any) {
      console.error('Error loading player data:', err);
      setError('Failed to load journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJourneyComplete = () => {
    setJourneyCompleted(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading journey...</p>
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
            <Link
              href="/journeys"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Journeys
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!journey || !enrollment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/journeys" className="text-blue-600 hover:text-blue-700 font-medium">
              Journeys
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={`/journeys/${journeyId}`} className="text-blue-600 hover:text-blue-700 font-medium truncate max-w-[200px]">
              {journey.title}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">
              {enrollment.status === 'completed' ? 'Review' : 'Playing'}
            </span>
          </nav>

          <div className="flex items-center gap-3">
            {enrollment.status === 'completed' && !journeyCompleted && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
            )}
            <Link
              href="/my-journeys"
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              My Journeys
            </Link>
          </div>
        </div>
      </div>

      {/* Player — full remaining height */}
      <div className="flex-1 flex overflow-hidden">
        <JourneyPlayer
          journey={journey}
          enrollment={enrollment}
          onJourneyComplete={handleJourneyComplete}
        />
      </div>
    </div>
  );
}
