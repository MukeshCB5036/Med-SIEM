'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface DataPoint {
  time: string;
  count: number;
  [key: string]: any;
}

interface CyberChartProps {
  data: DataPoint[];
  dataKey?: string;
  xAxisKey?: string;
  height?: number;
  title?: string;
  color?: string;
}

export default function CyberChart({
  data,
  dataKey = 'count',
  xAxisKey = 'time',
  height = 200,
  title,
  color = '#06b6d4'
}: CyberChartProps) {
  const gradientId = `cyber-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="w-full flex flex-col gap-2 p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm shadow-xl">
      {title && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">{title}</span>
          <span className="text-[10px] font-mono text-cyan-400">Live Telemetry Flow</span>
        </div>
      )}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
            <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090e1c',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#f8fafc'
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
