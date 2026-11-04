import React from 'react';
import { LucideIcon, DatabaseZap } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = 'No telemetry records located',
  description = 'No matching events, alerts, or assets found for the specified filters.',
  icon: Icon = DatabaseZap,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div className="w-full py-16 px-6 flex flex-col items-center justify-center text-center bg-slate-900/40 border border-slate-800/80 rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-base font-bold text-slate-200 tracking-wide">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.1)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
