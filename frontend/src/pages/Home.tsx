import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">AI Tools Hub</h1>
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-slate-300">Welcome, {user?.name || user?.username}</span>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Discover the Best AI Coding Tools
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Compare, rate, and review AI-powered development tools. Find the perfect
            tools to boost your productivity.
          </p>
          {!isAuthenticated && (
            <div className="flex justify-center gap-4">
              <Link
                to="/register"
                className="px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 text-lg font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {isAuthenticated && !user?.emailVerified && (
          <div className="mt-8 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-yellow-400 text-center">
              Please verify your email address to access all features.
              Check your inbox for the verification link.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
