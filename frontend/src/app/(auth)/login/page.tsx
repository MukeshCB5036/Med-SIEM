'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    const res = await apiClient<{
      mfa_required?: boolean;
      mfa_token?: string;
      email_verification_required?: boolean;
      tokens?: { access_token: string; refresh_token: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (res.success && res.data) {
      if (res.data.mfa_required && res.data.mfa_token) {
        setMfaToken(res.data.mfa_token);
        setInfo('MFA Required: We have sent a 6-digit verification passcode to your email.');
      } else if (res.data.email_verification_required) {
        setEmailVerificationRequired(true);
        setError('Your email address is unverified. Please check your inbox or resend verification link.');
      } else if (res.data.tokens) {
        await login(res.data.tokens.access_token, res.data.tokens.refresh_token);
        router.push('/');
      }
    } else {
      setError(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    const res = await apiClient<{ access_token: string; refresh_token: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mfa_token: mfaToken, otp }),
    });

    setSubmitting(false);

    if (res.success && res.data) {
      await login(res.data.access_token, res.data.refresh_token);
      router.push('/');
    } else {
      setError(res.error || 'Invalid or expired OTP passcode.');
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);

    const res = await apiClient<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);
    if (res.success) {
      setInfo('Verification link sent successfully. Please check your email.');
    } else {
      setError(res.error || 'Failed to resend verification email.');
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: MFA OTP INPUT STEP
  // ---------------------------------------------------------------------------
  if (mfaToken) {
    return (
      <form onSubmit={handleOtpSubmit} className="mt-6 space-y-6">
        {info && (
          <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
            {info}
          </div>
        )}
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Enter 6-Digit Email Passcode (MFA)
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-md text-center tracking-[0.5em] font-mono text-lg text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-rose-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || otp.length !== 6}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-md transition-colors shadow-lg shadow-emerald-600/20"
        >
          {submitting ? 'Verifying Passcode...' : 'Verify & Enter SOC Dashboard'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMfaToken(null);
            setOtp('');
          }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Back to Password Login
        </button>
      </form>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: PASSWORD LOGIN / EMAIL VERIFICATION REQUIRED
  // ---------------------------------------------------------------------------
  return (
    <form onSubmit={handleLoginSubmit} className="mt-6 space-y-6">
      {info && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
          {info}
        </div>
      )}
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Work Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="analyst@medsiem.org"
          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
        />
      </div>

      {emailVerificationRequired && (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={submitting}
          className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
        >
          Resend Verification Email
        </button>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-sm rounded-md transition-colors shadow-lg shadow-rose-600/20"
      >
        {submitting ? 'Authenticating...' : 'Sign In to SOC Dashboard'}
      </button>
    </form>
  );
}
