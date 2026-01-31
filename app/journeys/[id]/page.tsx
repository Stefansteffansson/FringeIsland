'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Journey, JourneyStep } from '@/lib/types/journey';
import { useAuth } from '@/lib/auth/AuthContext';
import EnrollmentModal from '@/components/journeys/EnrollmentModal';

interface EnrollmentInfo {
  isEnrolled: boolean;
  enrollmentType: 'individual' | 'group' | null;
  groupName?: string;
}

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo>({
    isEnrolled: false,
    enrollmentType: null,
  });
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  
  const supabase = createClient();
  const journeyId = params.id as string;

  useEffect(() => {
    if (journeyId) {
      fetchJourney();
    }
  }, [journeyId]);

  useEffect(() => {
    if (user && journeyId) {
      checkEnrollmentStatus();
    }
  }, [user, journeyId]);

  const checkEnrollmentStatus = async () => {
    try {
      setCheckingEnrollment(true);

      // Get user's database ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user!.id)
        .single();

      if (userError) throw userError;

      // Check individual enrollment
      const { data: individualEnrollment } = await supabase
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', journeyId)
        .eq('user_id', userData.id)
        .maybeSingle();

      if (individualEnrollment) {
        setEnrollmentInfo({
          isEnrolled: true,
          enrollmentType: 'individual',
        });
        return;
      }

      // Check group enrollment
      const { data: groupEnrollments } = await supabase
        .from('journey_enrollments')
        .select(`
          id,
          groups!inner(id, name)
        `)
        .eq('journey_id', journeyId)
        .not('group_id', 'is', null)
        .in('group_id',
          supabase
            .from('group_memberships')
            .select('group_id')
            .eq('user_id', userData.id)
            .eq('status', 'active')
        );

      if (groupEnrollments && groupEnrollments.length > 0) {
        const enrollment = groupEnrollments[0] as any;
        setEnrollmentInfo({
          isEnrolled: true,
          enrollmentType: 'group',
          groupName: enrollment.groups.name,
        });
        return;
      }

      // Not enrolled
      setEnrollmentInfo({
        isEnrolled: false,
        enrollmentType: null,
      });
    } catch (err) {
      console.error('Error checking enrollment:', err);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const fetchJourney = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Journey not found');
        return;
      }

      // Check if journey is published and public
      if (!data.is_published || !data.is_public) {
        setError('This journey is not available');
        return;
      }

      setJourney(data);
    } catch (err) {
      console.error('Error fetching journey:', err);
      setError('Failed to load journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getDifficultyColor = (difficulty: string | null): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepIcon = (type: string): string => {
    switch (type) {
      case 'content':
        return '📖';
      case 'activity':
        return '✏️';
      case 'assessment':
        return '✅';
      default:
        return '📝';
    }
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return 'Duration not specified';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTotalSteps = (): number => {
    return journey?.content?.steps?.length || 0;
  };

  const getRequiredSteps = (): number => {
    return journey?.content?.steps?.filter((step: JourneyStep) => step.required).length || 0;
  };

  const handleEnroll = () => {
    if (!user) {
      router.push(`/login?redirect=/journeys/${journeyId}`);
      return;
    }

    if (enrollmentInfo.isEnrolled) {
      // Navigate to My Journeys page
      router.push('/my-journeys');
      return;
    }

    // Open enrollment modal
    setEnrollmentModalOpen(true);
  };

  const handleEnrollmentSuccess = () => {
    // Refresh enrollment status
    checkEnrollmentStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading journey...</p>
        </div>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">😞</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Journey Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The journey you are looking for does not exist.'}</p>
            <Link
              href="/journeys"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Back to Journey Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/journeys" className="text-blue-600 hover:text-blue-700 font-medium">
              Journeys
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">{journey.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {journey.difficulty_level && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold border ${getDifficultyColor(
                    journey.difficulty_level
                  )}`}
                >
                  {journey.difficulty_level.charAt(0).toUpperCase() + journey.difficulty_level.slice(1)}
                </span>
              )}
              {journey.journey_type && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  {journey.journey_type === 'predefined' ? 'Platform Journey' : journey.journey_type}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">{journey.title}</h1>
            <p className="text-xl text-blue-100 mb-6">{journey.description}</p>

            <div className="flex flex-wrap items-center gap-6 text-sm mb-8">
              {journey.estimated_duration_minutes && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{formatDuration(journey.estimated_duration_minutes)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span>{getTotalSteps()} steps</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{getRequiredSteps()} required</span>
              </div>
            </div>

            {enrollmentInfo.isEnrolled ? (
              enrollmentInfo.enrollmentType === 'individual' ? (
                <button
                  onClick={handleEnroll}
                  className="bg-green-600 text-white hover:bg-green-700 px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enrolled - View My Journeys
                </button>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Enrolled via {enrollmentInfo.groupName}
                  </div>
                </div>
              )
            ) : (
              <button
                onClick={handleEnroll}
                disabled={checkingEnrollment}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingEnrollment ? 'Checking...' : 'Enroll in Journey'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex gap-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('curriculum')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'curriculum'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Curriculum ({getTotalSteps()} steps)
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Journey</h3>
                      <p className="text-gray-700 leading-relaxed">{journey.description}</p>
                    </div>

                    {journey.tags && journey.tags.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Topics Covered</h3>
                        <div className="flex flex-wrap gap-2">
                          {journey.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                            >
                              {tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">What You'll Learn</h3>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        This {journey.difficulty_level || 'comprehensive'} journey will guide you through{' '}
                        {getTotalSteps()} carefully designed steps, including interactive activities, engaging
                        content, and assessments to reinforce your learning.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-3">
                          <div className="text-2xl">💡</div>
                          <div>
                            <p className="text-sm text-blue-900 font-medium mb-1">Perfect for:</p>
                            <p className="text-sm text-blue-800">
                              {journey.difficulty_level === 'beginner' &&
                                'Those new to this topic who want to build a strong foundation'}
                              {journey.difficulty_level === 'intermediate' &&
                                'Learners with some experience looking to deepen their knowledge'}
                              {journey.difficulty_level === 'advanced' &&
                                'Experienced professionals seeking advanced strategies and frameworks'}
                              {!journey.difficulty_level && 'Learners at any level'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Journey Curriculum</h3>
                    <p className="text-gray-600 mb-6">
                      Click on each step to see more details about what you'll learn and do.
                    </p>

                    <div className="space-y-3">
                      {journey.content?.steps?.map((step: JourneyStep, index: number) => {
                        const isExpanded = expandedSteps.has(step.id);
                        return (
                          <div
                            key={step.id}
                            className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                          >
                            <button
                              onClick={() => toggleStep(step.id)}
                              className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getStepIcon(step.type)}</span>
                                  <h4 className="font-semibold text-gray-900">{step.title}</h4>
                                  {step.required && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="capitalize">{step.type}</span>
                                  <span>•</span>
                                  <span>{step.duration_minutes} min</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <svg
                                  className={`w-5 h-5 text-gray-400 transition-transform ${
                                    isExpanded ? 'transform rotate-180' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-0 ml-12 border-t border-gray-100">
                                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                                  <p className="text-sm text-gray-700">
                                    {step.type === 'content' &&
                                      'This step provides essential knowledge and concepts through reading materials, videos, or presentations.'}
                                    {step.type === 'activity' &&
                                      "This is a hands-on exercise where you'll apply what you've learned through practical tasks and challenges."}
                                    {step.type === 'assessment' &&
                                      "Test your understanding and reflect on what you've learned in this assessment."}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">Journey Details</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Duration</p>
                    <p className="text-sm text-gray-600">
                      {formatDuration(journey.estimated_duration_minutes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Difficulty</p>
                    <p className="text-sm text-gray-600 capitalize">{journey.difficulty_level || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Steps</p>
                    <p className="text-sm text-gray-600">
                      {getTotalSteps()} total ({getRequiredSteps()} required)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Type</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {journey.journey_type === 'predefined' ? 'Platform Journey' : journey.journey_type}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                {enrollmentInfo.isEnrolled ? (
                  enrollmentInfo.enrollmentType === 'individual' ? (
                    <button
                      onClick={handleEnroll}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      View My Journeys
                    </button>
                  ) : (
                    <div className="text-center py-3 px-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        Enrolled via {enrollmentInfo.groupName}
                      </p>
                    </div>
                  )
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={checkingEnrollment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingEnrollment ? 'Checking...' : 'Enroll Now'}
                  </button>
                )}
                <p className="mt-3 text-xs text-center text-gray-500">
                  Free to enroll • Start anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {journey && (
        <EnrollmentModal
          isOpen={enrollmentModalOpen}
          onClose={() => setEnrollmentModalOpen(false)}
          journeyId={journey.id}
          journeyTitle={journey.title}
          onSuccess={handleEnrollmentSuccess}
        />
      )}
    </div>
  );
}
