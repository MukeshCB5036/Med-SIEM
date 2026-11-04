import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  details?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Telemetry synchronization failed',
  details = 'Unable to establish connection with MedSIEM backend services.',
  onRetry
}: ErrorStateProps) {
  return (
    <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-rose-950/10 border border-rose-500/20 rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-rose-400 tracking-wide uppercase">{message}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-md">{details}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
