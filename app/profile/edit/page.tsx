'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import AvatarUpload from '@/components/profile/AvatarUpload';

interface EditableProfile {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
}

export default function EditProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Fetch user profile data (needs bio beyond cached profile)
    const fetchProfile = async () => {
      if (!userProfile) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, full_name, bio, avatar_url')
          .eq('id', userProfile.id)
          .single();

        if (fetchError) throw fetchError;

        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchProfile();
    }
  }, [user, userProfile, authLoading, router, supabase]);

  const handleAvatarUploadComplete = (url: string) => {
    // Update local state with new avatar URL
    if (profile) {
      setProfile({ ...profile, avatar_url: url || null });
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Error Loading Profile
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'Could not load your profile data'}
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Edit Profile
          </h1>
          <p className="text-gray-600">
            Update your profile information and avatar
          </p>
        </div>

        {/* Avatar Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Profile Picture
          </h2>
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            onUploadComplete={handleAvatarUploadComplete}
          />
        </div>

        {/* Profile Information Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Profile Information
          </h2>
          <ProfileEditForm
            initialFullName={profile.full_name}
            initialBio={profile.bio}
            userId={profile.id}
          />
        </div>
      </div>
    </div>
  );
}
