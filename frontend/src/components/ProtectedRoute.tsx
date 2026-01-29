import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerified?: boolean;
  allowedRoles?: Array<'user' | 'admin' | 'moderator'>;
}

/**
 * Restricts rendering of its children to authenticated users, with optional email verification and role checks.
 *
 * @param requireEmailVerified - If true, requires the authenticated user's email to be verified before granting access.
 * @param allowedRoles - Optional list of roles allowed to access the route; users whose role is not in this list are denied.
 * @returns The element to render for the protected route: `children` when access is granted, otherwise a loading indicator, an email verification notice, an access denied view, or a navigation to the login page.
 */
export default function ProtectedRoute({
  children,
  requireEmailVerified = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchUser();
    }
  }, [isAuthenticated, isLoading, fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireEmailVerified && user && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Email Verification Required</h2>
            <p className="text-slate-400 mb-4">
              Please verify your email address to access this page.
              Check your inbox for the verification link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-4">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}