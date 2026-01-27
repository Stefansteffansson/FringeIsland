'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';

// Add event listener for navigation refresh
export const refreshNavigation = () => {
  window.dispatchEvent(new CustomEvent('refreshNavigation'));
};

export default function Navigation() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [userData, setUserData] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();

  // Don't show nav on login/signup pages
  const hideNav = pathname === '/login' || pathname === '/signup';

  // Close user menu when pathname changes (user navigates)
  useEffect(() => {
    setShowUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!user || hideNav) return;

    const fetchUserData = async () => {
      try {
        // Get user profile data
        const { data: profile } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('auth_user_id', user.id)
          .single();

        if (profile) {
          setUserData(profile);

          // Get invitation count
          const { count } = await supabase
            .from('group_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('status', 'invited');

          setInvitationCount(count || 0);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();

    // Close user menu when user changes
    setShowUserMenu(false);

    // Listen for refresh events
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('refreshNavigation', handleRefresh);

    return () => {
      window.removeEventListener('refreshNavigation', handleRefresh);
    };
  }, [user, hideNav, supabase, refreshKey]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Don't render anything on login/signup pages
  if (hideNav) return null;

  // Show simplified nav for logged-out users
  if (!user) {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <span className="text-2xl">🏝️</span>
              FringeIsland
            </Link>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const navItems = [
    { href: '/groups', label: 'My Groups', icon: '👥' },
    { href: '/journeys', label: 'Journeys', icon: '🗺️' },
    { href: '/invitations', label: 'Invitations', icon: '📬', badge: invitationCount },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (href: string) => {
    if (href === '/groups' && pathname.startsWith('/groups')) return true;
    if (href === '/journeys' && pathname.startsWith('/journeys')) return true;
    if (href === '/profile' && pathname.startsWith('/profile')) return true;
    return pathname === href;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link
            href="/groups"
            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <span className="text-2xl">🏝️</span>
            FringeIsland
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-all"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
                {userData?.avatar_url ? (
                  <Image
                    src={userData.avatar_url}
                    alt={userData.full_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                    {userData?.full_name.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <span className="hidden md:inline text-gray-700 font-medium">
                {userData?.full_name || 'User'}
              </span>
              <span className="text-gray-400">▼</span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-40">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{userData?.full_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>

                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 View Profile
                  </Link>

                  <Link
                    href="/profile/edit"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    ✏️ Edit Profile
                  </Link>

                  <div className="border-t border-gray-100 my-2" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
