'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ProfileEditFormProps {
  initialFullName: string;
  initialBio: string | null;
  initialNickname: string;
  initialDisplayPreference: 'real_name' | 'nickname';
  initialShowRealName: boolean;
  userId: string;
  personalGroupId: string;
}

export default function ProfileEditForm({
  initialFullName,
  initialBio,
  initialNickname,
  initialDisplayPreference,
  initialShowRealName,
  userId,
  personalGroupId,
}: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [bio, setBio] = useState(initialBio || '');
  const [nickname, setNickname] = useState(initialNickname);
  const [displayPreference, setDisplayPreference] = useState<'real_name' | 'nickname'>(initialDisplayPreference);
  const [showRealName, setShowRealName] = useState(initialShowRealName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!fullName.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters');
      setLoading(false);
      return;
    }

    if (!nickname.trim()) {
      setError('Nickname is required');
      setLoading(false);
      return;
    }

    if (bio.length > 500) {
      setError('Bio must be less than 500 characters');
      setLoading(false);
      return;
    }

    try {
      // Update user profile in database
      // The sync_personal_group_display_name trigger automatically
      // updates the personal group name based on display_preference
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          nickname: nickname.trim(),
          display_preference: displayPreference,
          show_real_name: showRealName,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Refresh navigation to show updated profile
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNavigation'));
      }
      
      // Redirect back to profile page after short delay
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/profile');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Full Name Field */}
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Full Name *
        </label>
        <input
          type="text"
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter your full name"
          maxLength={100}
        />
        <p className="mt-1 text-sm text-gray-500">
          Your real name (only visible to others if you allow it)
        </p>
      </div>

      {/* Nickname Field */}
      <div>
        <label
          htmlFor="nickname"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nickname / Display Name *
        </label>
        <input
          type="text"
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter your nickname"
          maxLength={50}
        />
        <p className="mt-1 text-sm text-gray-500">
          This is how other users will see you on the platform
        </p>
      </div>

      {/* Display Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Display Name Preference
        </label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="displayPreference"
              value="nickname"
              checked={displayPreference === 'nickname'}
              onChange={() => setDisplayPreference('nickname')}
              disabled={loading}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Show my nickname</span>
              <p className="text-xs text-gray-500">Others will see &quot;{nickname.trim() || '...'}&quot; in forums, messages, and member lists</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="displayPreference"
              value="real_name"
              checked={displayPreference === 'real_name'}
              onChange={() => setDisplayPreference('real_name')}
              disabled={loading}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Show my real name</span>
              <p className="text-xs text-gray-500">Others will see &quot;{fullName.trim() || '...'}&quot; in forums, messages, and member lists</p>
            </div>
          </label>
        </div>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            Others will see you as: <span className="font-semibold">{displayPreference === 'nickname' ? (nickname.trim() || '...') : (fullName.trim() || '...')}</span>
          </p>
        </div>
      </div>

      {/* Profile Visibility */}
      <div>
        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div>
            <span className="text-sm font-medium text-gray-900">Allow others to see my real name</span>
            <p className="text-xs text-gray-500 mt-0.5">
              When turned off, only your nickname is visible to other users on your profile
            </p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={showRealName}
              onChange={(e) => setShowRealName(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
              id="showRealName"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </label>
      </div>

      {/* Bio Field */}
      <div>
        <label 
          htmlFor="bio" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          placeholder="Tell us a bit about yourself (optional)"
          maxLength={500}
        />
        <p className="mt-1 text-sm text-gray-500">
          {bio.length}/500 characters
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">
            Profile updated successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
