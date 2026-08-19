'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'assets': 'Assets & Agents',
  'events': 'Log Explorer',
  'rules': 'Detection Rules',
  'alerts': 'Security Alerts',
  'incidents': 'Incidents',
  'threat-intelligence': 'Threat Intelligence',
  'reports': 'HIPAA Reports',
  'users': 'Users & Access',
  'settings': 'System Settings',
};

export default function SOCNavHeader() {
  const router = useRouter();
  const pathname = usePathname();

  // Do not display navigation header on auth or login routes
  if (!pathname || pathname === '/login' || pathname.startsWith('/verify-email')) {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="w-full bg-slate-900/80 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs backdrop-blur sticky top-0 z-40">
      {/* Left: Back button & Breadcrumb */}
      <div className="flex items-center gap-3 overflow-x-auto">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-medium transition-colors border border-slate-700/50 shadow-sm"
          title="Go to previous page"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Breadcrumb Navigation Trail */}
        <nav className="flex items-center gap-1.5 text-slate-400 font-medium truncate">
          <Link
            href="/"
            className={`hover:text-slate-200 transition-colors ${pathname === '/' ? 'text-slate-100 font-bold' : ''}`}
          >
            MedSIEM
          </Link>

          {segments.map((seg, idx) => {
            const path = `/${segments.slice(0, idx + 1).join('/')}`;
            const isLast = idx === segments.length - 1;
            const label = ROUTE_LABELS[seg] || seg;

            return (
              <React.Fragment key={path}>
                <span className="text-slate-600">/</span>
                {isLast ? (
                  <span className="text-slate-100 font-bold capitalize">{label}</span>
                ) : (
                  <Link href={path} className="hover:text-slate-200 transition-colors capitalize">
                    {label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Quick Dashboard Shortcut */}
      <div className="flex items-center gap-2">
        {pathname !== '/' && (
          <Link
            href="/"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 border border-rose-500/20 text-xs font-bold transition-colors"
          >
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
        )}
      </div>
    </div>
  );
}
