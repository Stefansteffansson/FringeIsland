import Link from 'next/link';

/**
 * Custom 404 Not Found page
 * Shown when a route doesn't exist
 */
export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">🏝️</div>
                <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Island Not Found
                </h2>
                <p className="text-gray-600 mb-8">
                    Looks like you've ventured off the map! This page doesn't exist on FringeIsland.
                </p>

                <div className="flex gap-4 justify-center">
                    <Link
                        href="/"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/groups"
                        className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        My Groups
                    </Link>
                </div>
            </div>
        </div>
    );
}
