import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  variant?: 'cyan' | 'blue' | 'rose' | 'amber' | 'emerald';
}

const VARIANT_STYLES = {
  cyan: {
    border: 'border-cyan-500/30 hover:border-cyan-500/50',
    bg: 'from-cyan-950/20 to-slate-900/40',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    accent: 'text-cyan-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
  },
  blue: {
    border: 'border-blue-500/30 hover:border-blue-500/50',
    bg: 'from-blue-950/20 to-slate-900/40',
    iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    accent: 'text-blue-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]'
  },
  rose: {
    border: 'border-rose-500/30 hover:border-rose-500/50',
    bg: 'from-rose-950/20 to-slate-900/40',
    iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    accent: 'text-rose-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]'
  },
  amber: {
    border: 'border-amber-500/30 hover:border-amber-500/50',
    bg: 'from-amber-950/20 to-slate-900/40',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    accent: 'text-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  emerald: {
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    bg: 'from-emerald-950/20 to-slate-900/40',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    accent: 'text-emerald-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
  }
};

export default function MetricCard({
  title,
  value,
  subtext,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'cyan'
}: MetricCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${styles.bg} ${styles.border} p-5 transition-all duration-300 ${styles.glow} backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{title}</span>
          <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-100 font-mono">
            {value}
          </span>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${styles.iconBg} flex-shrink-0 transition-transform group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtext || change) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
          {subtext && <span className="text-slate-400 truncate">{subtext}</span>}
          {change && (
            <span
              className={`flex items-center gap-1 font-mono font-medium ${
                changeType === 'positive'
                  ? 'text-emerald-400'
                  : changeType === 'negative'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {changeType === 'positive' && <TrendingUp className="w-3.5 h-3.5" />}
              {changeType === 'negative' && <TrendingDown className="w-3.5 h-3.5" />}
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
