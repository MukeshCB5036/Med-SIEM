import React from 'react';

export type SeverityType = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | string;

interface SeverityBadgeProps {
  severity: SeverityType;
  size?: 'sm' | 'md';
  showPulse?: boolean;
}

export default function SeverityBadge({
  severity,
  size = 'md',
  showPulse = true
}: SeverityBadgeProps) {
  const normalized = (severity || 'INFO').toUpperCase();

  let colors = {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
    pulse: false
  };

  switch (normalized) {
    case 'CRITICAL':
      colors = {
        bg: 'bg-rose-950/40',
        text: 'text-rose-400',
        border: 'border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
        dot: 'bg-rose-500',
        pulse: true
      };
      break;
    case 'HIGH':
      colors = {
        bg: 'bg-orange-950/40',
        text: 'text-orange-400',
        border: 'border-orange-500/40',
        dot: 'bg-orange-400',
        pulse: false
      };
      break;
    case 'MEDIUM':
      colors = {
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        dot: 'bg-amber-400',
        pulse: false
      };
      break;
    case 'LOW':
      colors = {
        bg: 'bg-cyan-950/40',
        text: 'text-cyan-400',
        border: 'border-cyan-500/40',
        dot: 'bg-cyan-400',
        pulse: false
      };
      break;
    case 'INFO':
    default:
      colors = {
        bg: 'bg-slate-900/60',
        text: 'text-slate-400',
        border: 'border-slate-800',
        dot: 'bg-slate-500',
        pulse: false
      };
      break;
  }

  const paddingClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold font-mono tracking-wider rounded-md border ${colors.bg} ${colors.text} ${colors.border} ${paddingClass} select-none`}
    >
      <span className="relative flex h-2 w-2">
        {colors.pulse && showPulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`} />
      </span>
      <span>{normalized}</span>
    </span>
  );
}
