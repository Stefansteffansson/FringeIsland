'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ProfileEditFormProps {
  initialFullName: string;
  initialBio: string | null;
  userId: string;
}

export default function ProfileEditForm({ 
  initialFullName, 
  initialBio, 
  userId 
}: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [bio, setBio] = useState(initialBio || '');
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

    if (bio.length > 500) {
      setError('Bio must be less than 500 characters');
      setLoading(false);
      return;
    }

    try {
      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess(true);
      
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
          This is how others will see your name
        </p>
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
