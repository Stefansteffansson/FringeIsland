'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface ProfileData {
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      if (!userProfile) return;

      try {
        // Profile page needs bio + created_at beyond what's cached in userProfile
        const { data, error } = await supabase
          .from('users')
          .select('full_name, bio, avatar_url, created_at')
          .eq('id', userProfile.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchProfile();
    }
  }, [user, userProfile, authLoading, router, supabase]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header with Avatar, Name, and Buttons */}
          <div className="flex items-start gap-6 mb-8 pb-6 border-b border-gray-200">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile?.avatar_url ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-200">
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200">
                  <span className="text-4xl">👤</span>
                </div>
              )}
            </div>

            {/* Name and Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {profile?.full_name || 'User'}
              </h2>
              <p className="text-gray-500 text-sm">
                Member since {profile ? new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                }) : ''}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleEditProfile}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg">
                {profile?.full_name || 'Not set'}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg">
                {user.email}
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              {profile?.bio ? (
                <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-gray-400 bg-gray-50 px-4 py-3 rounded-lg italic">
                  No bio added yet. Click &quot;Edit Profile&quot; to add one!
                </p>
              )}
            </div>

            {/* Account Created */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Created
              </label>
              <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Coming Soon
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">📸</div>
                <h4 className="font-medium text-gray-800 mb-1">Profile Avatar</h4>
                <p className="text-sm text-gray-600">Upload a profile picture</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">👥</div>
                <h4 className="font-medium text-gray-800 mb-1">Groups</h4>
                <p className="text-sm text-gray-600">View your group memberships</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="text-2xl mb-2">🗺️</div>
                <h4 className="font-medium text-gray-800 mb-1">Journeys</h4>
                <p className="text-sm text-gray-600">Track your enrolled journeys</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
