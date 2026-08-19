'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System & Platform Settings</h1>
        <p className="text-xs text-slate-400">Configure global SIEM options, OpenSearch index lifecycle, and security policies</p>
      </div>

      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 space-y-6 max-w-2xl">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="font-semibold text-slate-200 text-sm">Log Retention & OpenSearch Indexing</h3>
          <p className="text-xs text-slate-400 mt-1">Automatic log index rotation for HIPAA 7-year audit retention requirement.</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-xs text-slate-300">Retention Period:</span>
            <select className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100">
              <option>7 Years (HIPAA Compliant Standard)</option>
              <option>1 Year</option>
              <option>90 Days</option>
            </select>
          </div>
        </div>

        <div className="border-b border-slate-800 pb-4">
          <h3 className="font-semibold text-slate-200 text-sm">Account Lockout Policy</h3>
          <p className="text-xs text-slate-400 mt-1">Automatically lock user account after 5 consecutive failed authentication attempts.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold">Policy Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
