import React from 'react';
import { Search, X, RefreshCw, Filter } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (val: string) => void;
  }[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Search by keyword, host, IP, or ID...',
  filters = [],
  onRefresh,
  isRefreshing = false
}: SearchFilterBarProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl backdrop-blur-sm">
      {/* Search Input Box */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns and Actions */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {filters.map(filter => (
          <div key={filter.key} className="relative flex-shrink-0">
            <select
              value={filter.value}
              onChange={e => filter.onChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        ))}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/60 text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
            title="Refresh stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
}
