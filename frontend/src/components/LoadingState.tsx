import React from 'react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export default function LoadingState({
  message = 'Synchronizing security telemetry...',
  rows = 5
}: LoadingStateProps) {
  return (
    <div className="w-full flex flex-col gap-3 py-6 px-4 bg-slate-900/30 border border-slate-800/80 rounded-xl">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono text-cyan-400 font-semibold">{message}</span>
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-10 w-full rounded-lg bg-slate-800/40 animate-pulse border border-slate-800/60"
          />
        ))}
      </div>
    </div>
  );
}
