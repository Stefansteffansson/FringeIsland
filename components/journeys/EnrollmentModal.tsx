'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  journeyId: string;
  journeyTitle: string;
  onSuccess: () => void;
}

interface Group {
  id: string;
  name: string;
}

export default function EnrollmentModal({
  isOpen,
  onClose,
  journeyId,
  journeyTitle,
  onSuccess,
}: EnrollmentModalProps) {
  const { userProfile } = useAuth();
  const [enrollmentType, setEnrollmentType] = useState<'individual' | 'group'>('individual');
  const [leaderGroups, setLeaderGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  // Fetch groups where user has enroll_group_in_journey permission
  useEffect(() => {
    if (isOpen && enrollmentType === 'group' && userProfile) {
      fetchEnrollableGroups();
    }
  }, [isOpen, enrollmentType, userProfile]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEnrollmentType('individual');
      setSelectedGroupId('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  const fetchEnrollableGroups = async () => {
    if (!userProfile) return;
    try {
      setLoadingGroups(true);
      setError(null);

      // Get all groups the user is an active member of
      const { data: memberships, error: membershipError } = await supabase
        .from('group_memberships')
        .select('group_id, groups!inner(id, name)')
        .eq('member_group_id', userProfile.personal_group_id)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      // Check enroll_group_in_journey permission for each group
      const enrollableGroups: Group[] = [];

      for (const membership of memberships || []) {
        const { data: hasEnrollPerm } = await supabase.rpc('has_permission', {
          p_acting_group_id: userProfile.personal_group_id,
          p_context_group_id: membership.group_id,
          p_permission_name: 'enroll_group_in_journey',
        });

        if (hasEnrollPerm) {
          const group = membership.groups as any;
          enrollableGroups.push({
            id: group.id,
            name: group.name,
          });
        }
      }

      setLeaderGroups(enrollableGroups);
    } catch (err: any) {
      console.error('Error fetching enrollable groups:', err);
      setError('Failed to load your groups. Please try again.');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleEnroll = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      setError(null);

      if (enrollmentType === 'individual') {
        // First, get user's group IDs
        const { data: userGroups } = await supabase
          .from('group_memberships')
          .select('group_id')
          .eq('member_group_id', userProfile.personal_group_id)
          .eq('status', 'active');

        const groupIds = userGroups?.map(g => g.group_id) || [];

        // Check if user is already enrolled via a group
        let existingGroupEnrollment = null;
        if (groupIds.length > 0) {
          const { data } = await supabase
            .from('journey_enrollments')
            .select('id, groups!inner(name)')
            .eq('journey_id', journeyId)
            .in('group_id', groupIds)
            .maybeSingle();

          existingGroupEnrollment = data;
        }

        if (existingGroupEnrollment) {
          throw new Error(`You are already enrolled via your group: ${(existingGroupEnrollment as any).groups.name}`);
        }

        // Enroll individual (personal group = the user)
        const { error: enrollError } = await supabase
          .from('journey_enrollments')
          .insert({
            journey_id: journeyId,
            group_id: userProfile.personal_group_id,
            enrolled_by_group_id: userProfile.personal_group_id,
            status: 'active',
            progress_data: {},
          });

        if (enrollError) {
          if (enrollError.code === '23505') {
            throw new Error('You are already enrolled in this journey.');
          }
          throw enrollError;
        }
      } else {
        // Group enrollment
        if (!selectedGroupId) {
          throw new Error('Please select a group.');
        }

        // Check if group is already enrolled
        const { data: existingEnrollment } = await supabase
          .from('journey_enrollments')
          .select('id')
          .eq('journey_id', journeyId)
          .eq('group_id', selectedGroupId)
          .maybeSingle();

        if (existingEnrollment) {
          throw new Error('This group is already enrolled in this journey.');
        }

        // Enroll group
        const { error: enrollError } = await supabase
          .from('journey_enrollments')
          .insert({
            journey_id: journeyId,
            group_id: selectedGroupId,
            enrolled_by_group_id: userProfile.personal_group_id,
            status: 'active',
            progress_data: {},
          });

        if (enrollError) {
          if (enrollError.code === '23505') {
            throw new Error('This group is already enrolled in this journey.');
          }
          throw enrollError;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error enrolling:', err);
      const errorMessage = err.message || err.error_description || err.hint || 'Failed to enroll. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
        {success ? (
          // Success State
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Enrolled Successfully!
            </h2>
            <p className="text-gray-600">
              {enrollmentType === 'individual'
                ? "You've been enrolled in this journey."
                : "Your group has been enrolled in this journey."}
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🗺️</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Enroll in Journey
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {journeyTitle}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Enrollment Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Enrollment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEnrollmentType('individual')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    enrollmentType === 'individual'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-2xl mb-1">👤</div>
                  <div className="font-semibold text-sm">Myself</div>
                  <div className="text-xs text-gray-500 mt-1">Individual enrollment</div>
                </button>
                <button
                  onClick={() => setEnrollmentType('group')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    enrollmentType === 'group'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-2xl mb-1">👥</div>
                  <div className="font-semibold text-sm">A Group</div>
                  <div className="text-xs text-gray-500 mt-1">Group enrollment</div>
                </button>
              </div>
            </div>

            {/* Group Selection (only if group enrollment) */}
            {enrollmentType === 'group' && (
              <div className="mb-6">
                <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Group
                </label>
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : leaderGroups.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      You don't have permission to enroll any of your groups in journeys.
                    </p>
                  </div>
                ) : (
                  <select
                    id="group-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a group...</option>
                    {leaderGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={loading || (enrollmentType === 'group' && (!selectedGroupId || leaderGroups.length === 0))}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enrolling...
                  </>
                ) : (
                  'Enroll'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
