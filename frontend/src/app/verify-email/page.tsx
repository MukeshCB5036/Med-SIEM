'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address with MedSIEM SOC...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in URL.');
      return;
    }

    const verifyToken = async () => {
      const res = await apiClient<{ message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      if (res.success) {
        setStatus('success');
        setMessage('Your email address has been verified successfully!');
      } else {
        setStatus('error');
        setMessage(res.error || 'Verification token is invalid or has expired.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-xl sm:px-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white text-xl mb-4">
            M
          </div>
          <h2 className="text-xl font-bold text-slate-100">MedSIEM Account Verification</h2>

          {status === 'loading' && (
            <div className="mt-6 space-y-4">
              <div className="animate-spin w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-slate-400">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-sm">
                {message}
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm rounded-md transition-colors shadow-lg shadow-rose-600/20"
              >
                Proceed to Sign In
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md text-sm">
                {message}
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-md transition-colors"
              >
                Return to Login Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
