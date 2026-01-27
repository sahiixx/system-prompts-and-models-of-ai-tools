import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

import Home from '@/pages/Home';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ProtectedRoute from '@/components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/**
 * Ensures user data is fetched when an authentication token is present, then renders the provided children.
 *
 * @param children - React nodes to render after initialization
 * @returns The rendered `children`
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { fetchUser, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [fetchUser, token]);

  return <>{children}</>;
}

/**
 * Root application component that configures React Query, routing, authentication initialization, global toasts, and the application's public, protected, admin-only, and 404 routes.
 *
 * @returns The React element tree containing providers, route definitions, and the global Toaster.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />

            {/* Protected routes example */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-slate-900 p-8">
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400">Protected content goes here.</p>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Admin-only route example */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div className="min-h-screen bg-slate-900 p-8">
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-slate-400">Admin-only content goes here.</p>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* 404 route */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                    <p className="text-slate-400">Page not found</p>
                  </div>
                </div>
              }
            />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #334155',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#f1f5f9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}