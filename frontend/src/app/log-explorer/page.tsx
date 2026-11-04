'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import DataTable, { Column } from '@/components/DataTable';
import DetailPanel from '@/components/DetailPanel';
import SeverityBadge from '@/components/SeverityBadge';
import { apiClient } from '@/lib/api';
import {
  FileSearch,
  Search,
  Terminal,
  Database,
  Sparkles,
  Clock,
  Layers,
  Code
} from 'lucide-react';

interface SearchHit {
  id: string;
  timestamp: string;
  hostname: string;
  event_type: string;
  severity: string;
  source: string;
  message?: string;
  [key: string]: any;
}

export default function LogExplorerPage() {
  const [query, setQuery] = useState('*');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SearchHit | null>(null);
  const [totalFound, setTotalFound] = useState<number | null>(null);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    const q = customQuery !== undefined ? customQuery : query;
    try {
      const res = await apiClient<any[]>(`/events/search?q=${encodeURIComponent(q)}&limit=50`);
      if (res.success && res.data) {
        setHits(res.data);
        setTotalFound(res.data.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(undefined, '*');
  }, []);

  const columns: Column<SearchHit>[] = [
    {
      key: 'timestamp',
      header: 'Indexed Timestamp (UTC)',
      sortable: true,
      render: item => (
        <span className="font-mono text-xs text-slate-300">
          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: item => <SeverityBadge severity={item.severity || 'INFO'} size="sm" />
    },
    {
      key: 'hostname',
      header: 'Hospital Host',
      sortable: true,
      render: item => (
        <span className="font-mono font-bold text-cyan-400 text-xs">
          {item.hostname || 'Unknown'}
        </span>
      )
    },
    {
      key: 'event_type',
      header: 'Normalized Signature',
      render: item => (
        <span className="font-mono text-xs text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
          {item.event_type || 'RAW_EVENT'}
        </span>
      )
    },
    {
      key: 'details',
      header: 'Log Abstract / Message',
      render: item => (
        <span className="text-slate-400 font-mono text-[11px] truncate max-w-sm block">
          {item.message || JSON.stringify(item)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-cyan-400" />
            OpenSearch Log Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Distributed full-text query engine across high-velocity hospital audit logs and clinical telemetry.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Terminal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search OpenSearch query syntax (e.g. hostname:EMR* OR severity:CRITICAL)..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono transition-all disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{isLoading ? 'Querying...' : 'Execute Query'}</span>
        </button>
      </form>

      {/* Quick Filter Queries */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
        <span className="text-slate-400 text-[11px]">Quick filters:</span>
        <button
          onClick={() => { setQuery('severity:CRITICAL'); }}
          className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/60"
        >
          severity:CRITICAL
        </button>
        <button
          onClick={() => { setQuery('PACS_PORT_SCAN'); handleSearch(undefined, 'PACS_PORT_SCAN'); }}
          className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 hover:bg-cyan-900/60"
        >
          PACS_PORT_SCAN
        </button>
        <button
          onClick={() => { setQuery('EHR_BULK_EXPORT'); handleSearch(undefined, 'EHR_BULK_EXPORT'); }}
          className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 hover:bg-cyan-900/60"
        >
          EHR_BULK_EXPORT
        </button>
        <button
          onClick={() => { setQuery('*'); handleSearch(undefined, '*'); }}
          className="px-2 py-0.5 rounded bg-slate-800/40 text-slate-300 border border-slate-700/40 hover:bg-slate-700/60"
        >
          All Logs (*)
        </button>
      </div>

      {/* Results Header */}
      {totalFound !== null && (
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span>OpenSearch Cluster Hits: <strong className="text-cyan-400">{totalFound}</strong> records matching query</span>
        </div>
      )}

      {/* Hits Table */}
      <DataTable
        columns={columns}
        data={hits}
        keyExtractor={(item, idx) => item.id || `hit-${idx}`}
        onRowClick={item => setSelectedLog(item)}
        isLoading={isLoading}
        emptyTitle="Execute a query to inspect logs"
        emptyDescription="Type an OpenSearch query in the search bar above or click one of the quick filter buttons."
      />

      {/* Detail Slide-out */}
      <DetailPanel
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="OpenSearch Indexed Document"
        subtitle={selectedLog ? `ID: ${selectedLog.id || 'N/A'}` : ''}
        width="xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Index Target:</span>
              <span className="text-cyan-400 font-bold">medsiem-events</span>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                Document JSON Representation
              </span>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 overflow-x-auto text-[11px]">
                <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
