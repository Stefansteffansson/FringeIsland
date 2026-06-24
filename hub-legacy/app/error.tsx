'use client';

import { useEffect } from 'react';

/**
 * Next.js Error Page - catches errors in route segments
 * This file must be a Client Component
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to console (in production, send to error tracking)
        console.error('Route error:', error);

        // TODO: Send to error tracking service
        // Example: Sentry.captureException(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">🚨</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Oops! Something went wrong
                </h1>
                <p className="text-gray-600 mb-6">
                    We encountered an unexpected error while loading this page.
                    Don't worry, your data is safe.
                </p>

                {/* Show error details in development */}
                {process.env.NODE_ENV === 'development' && (
                    <details className="text-left mb-6 bg-red-50 border border-red-200 rounded p-4">
                        <summary className="cursor-pointer font-semibold text-red-800 mb-2">
                            Error Details (Development Only)
                        </summary>
                        <pre className="text-xs text-red-700 overflow-auto whitespace-pre-wrap break-words">
                            {error.message}
                            {error.digest && `\n\nDigest: ${error.digest}`}
                        </pre>
                    </details>
                )}

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => reset()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}
