import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authService } from '@/services/auth';

type VerificationStatus = 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<VerificationStatus>('verifying');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };

    verifyEmail();
  }, [token]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">Verifying your email...</h2>
            <p className="mt-2 text-slate-400">Please wait while we verify your email address.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-slate-400 mb-4">
              Your email has been successfully verified. You can now access all features of AI Tools Hub.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Continue to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
          <p className="text-slate-400 mb-4">
            This verification link is invalid or has expired. Please request a new verification email.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            to="/login"
            className="block text-indigo-400 hover:text-indigo-300"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
