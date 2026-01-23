import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Begin Your Journey
          </h1>
          <p className="text-gray-600">
            Create an account to start exploring
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <AuthForm mode="signup" />
        </div>

        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}