'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export default function DetailPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'lg'
}: DetailPanelProps) {
  if (!isOpen) return null;

  const widthClass = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl'
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex pl-10">
        <div
          className={`w-screen ${widthClass} transform bg-[#090e1c] border-l border-slate-800 shadow-2xl transition-all duration-300 animate-in slide-in-from-right flex flex-col`}
        >
          {/* Header */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
            <div className="flex flex-col min-w-0 pr-4">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider truncate">{title}</h2>
              {subtitle && <p className="text-[11px] font-mono text-cyan-400 truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
