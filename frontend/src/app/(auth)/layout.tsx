import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-lg bg-rose-600 items-center justify-center font-bold text-xl text-white mb-3">
            M
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">MedSIEM Platform</h2>
          <p className="mt-1 text-xs text-rose-400 font-mono">Healthcare SOC Portal</p>
        </div>
        {children}
      </div>
    </div>
  )
}
