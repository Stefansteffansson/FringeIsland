'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted on client side
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Through Journey
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Embark on transformative learning experiences designed for personal development,
            leadership training, and team growth. Take journeys solo or collaborate with others.
          </p>

          {user ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Welcome back, <span className="font-semibold">{user.user_metadata?.display_name || user.email}</span>!
              </p>
              <Link
                href="/profile"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Go to Your Profile
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Your Journey
              </Link>
              <Link
                href="/login"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg text-lg font-medium border-2 border-gray-200 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Personal Growth</h3>
            <p className="text-gray-600">
              Structured learning experiences designed to help you develop new skills and perspectives
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Team Development</h3>
            <p className="text-gray-600">
              Collaborate with others on journeys that strengthen teams and build leadership
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Flexible Paths</h3>
            <p className="text-gray-600">
              Choose from predefined journeys or create your own unique learning experiences
            </p>
          </div>
        </div>

        {!user && (
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-4">
              Ready to begin your transformation?
            </p>
            <Link
              href="/signup"
              className="text-blue-600 hover:text-blue-700 font-medium text-lg"
            >
              Create your free account →
            </Link>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2026 FringeIsland. Built for transformative learning experiences.
          </p>
        </div>
      </footer>
    </div>
  );
}
