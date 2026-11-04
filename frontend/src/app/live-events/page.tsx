'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/DataTable';
import DetailPanel from '@/components/DetailPanel';
import SeverityBadge from '@/components/SeverityBadge';
import CyberChart from '@/components/CyberChart';
import { apiClient } from '@/lib/api';
import {
  Radio,
  Play,
  Pause,
  Terminal,
  Shield,
  Layers,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface NormalizedEvent {
  id: string;
  raw_log_id: string;
  asset_id?: string;
  agent_id?: string;
  org_id?: string;
  timestamp: string;
  hostname: string;
  username?: string | null;
  event_type: string;
  event_category: string;
  severity: string;
  source: string;
  source_ip?: string | null;
  destination_ip?: string | null;
  process_name?: string | null;
  parent_process?: string | null;
  command_line?: string | null;
  file_path?: string | null;
  action?: string | null;
  result?: string | null;
  message?: string | null;
  normalized_json: Record<string, any>;
  created_at?: string;
}

export default function LiveEventsPage() {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [isLive, setIsLive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [rawLoading, setRawLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchEvents = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setErrorMsg(null);
    try {
      const skip = (page - 1) * pageSize;
      const params = new URLSearchParams();
      params.append('skip', skip.toString());
      params.append('limit', pageSize.toString());

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      if (severityFilter !== 'ALL') {
        params.append('severity', severityFilter);
      }
      if (categoryFilter !== 'ALL') {
        params.append('category', categoryFilter);
      }

      const res = await apiClient<NormalizedEvent[]>(`/events?${params.toString()}`);
      if (res.success && res.data) {
        setEvents(res.data);
        if (res.meta && typeof res.meta.total_count === 'number') {
          setTotalCount(res.meta.total_count);
        } else {
          setTotalCount(res.data.length);
        }
      } else {
        setErrorMsg(res.error || 'Failed to retrieve event telemetry from MedSIEM backend.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Network error connecting to /api/v1/events');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, severityFilter, categoryFilter]);

  useEffect(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  // Live streaming polling (only on page 1 and when no active modal)
  useEffect(() => {
    if (!isLive || page !== 1 || !!selectedEvent) return;
    const interval = setInterval(() => {
      fetchEvents(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive, page, selectedEvent, fetchEvents]);

  const handleSelectEvent = async (event: NormalizedEvent) => {
    setSelectedEvent(event);
    setRawContent(null);
    setRawLoading(true);
    setCopied(false);
    try {
      const res = await apiClient<any>(`/events/raw/${event.raw_log_id}`);
      if (res.success && res.data && res.data.raw_content) {
        setRawContent(res.data.raw_content);
      } else {
        setRawContent(JSON.stringify(event.normalized_json || event, null, 2));
      }
    } catch (e) {
      setRawContent(JSON.stringify(event.normalized_json || event, null, 2));
    } finally {
      setRawLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const columns: Column<NormalizedEvent>[] = [
    {
      key: 'timestamp',
      header: 'Time (UTC)',
      sortable: true,
      render: item => (
        <div className="flex flex-col text-[11px] font-mono leading-tight">
          <span className="text-slate-200 font-semibold">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-slate-500 text-[10px]">
            {new Date(item.timestamp).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: item => <SeverityBadge severity={item.severity} size="sm" />
    },
    {
      key: 'hostname',
      header: 'Host / Asset',
      sortable: true,
      render: item => (
        <span className="font-mono font-bold text-cyan-400 text-xs">
          {item.hostname}
        </span>
      )
    },
    {
      key: 'category',
      header: 'Category / Source',
      render: item => (
        <div className="flex flex-col text-[11px]">
          <span className="text-slate-200 font-medium">{item.event_category}</span>
          <span className="text-slate-400 font-mono text-[10px] truncate max-w-[140px]">{item.source}</span>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Event Signature',
      render: item => (
        <span className="font-mono text-xs text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/80">
          {item.event_type}
        </span>
      )
    },
    {
      key: 'telemetry',
      header: 'IP / Telemetry',
      render: item => (
        <div className="flex flex-col text-[11px] font-mono text-slate-400">
          <span>Src: {item.source_ip || 'Internal'}</span>
          {item.destination_ip && <span className="text-slate-500 text-[10px]">Dst: {item.destination_ip}</span>}
        </div>
      )
    },
    {
      key: 'message',
      header: 'Event Message / Abstract',
      render: item => (
        <span className="text-slate-300 font-mono text-[11px] truncate max-w-xs block" title={item.message || ''}>
          {item.message || 'Canonical telemetry ingested'}
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
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            Live Security Event Stream & Log Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time canonical normalization, PostgreSQL event persistence, and OpenSearch log queries from hospital endpoints.
          </p>
        </div>

        {/* Live Streaming Toggle & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all ${
              isLive
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-amber-950/40 text-amber-400 border-amber-500/40'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}</span>
          </button>

          <button
            onClick={() => fetchEvents(true)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Refresh current page"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by hostname, event type, message, IP, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> Severity:
            </span>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Application">Application</option>
              <option value="Network">Network</option>
              <option value="Process_Creation">Process Creation</option>
              <option value="System">System</option>
              <option value="Endpoint_Telemetry">Endpoint Telemetry</option>
            </select>
          </div>
        </div>

        {/* Operational Telemetry Summary */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
          <div className="flex items-center gap-4">
            <span>Total Ingested Events: <strong className="text-cyan-400">{totalCount.toLocaleString()}</strong></span>
            {debouncedSearch && <span>Filtered by: <span className="text-slate-200">"{debouncedSearch}"</span></span>}
          </div>
          <div>
            <span>Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong></span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => fetchEvents(true)}
            className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Events Table */}
      <DataTable
        columns={columns}
        data={events}
        keyExtractor={item => item.id}
        onRowClick={item => handleSelectEvent(item)}
        isLoading={isLoading}
        emptyTitle="No security events matching filters"
        emptyDescription="Ensure endpoint agents are running or adjust search parameters to view telemetry."
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <div className="text-xs text-slate-400 font-mono">
          Showing {events.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} events
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono text-slate-300 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Event Details Slide-Out Panel */}
      <DetailPanel
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Security Telemetry Inspection"
        subtitle={selectedEvent ? `ID: ${selectedEvent.id}` : ''}
        width="xl"
      >
        {selectedEvent && (
          <div className="space-y-6 text-xs font-mono">
            {/* Top Quick Attributes */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Event Severity</span>
                <SeverityBadge severity={selectedEvent.severity} size="sm" />
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Timestamp (UTC)</span>
                <span className="text-slate-200 font-bold">{selectedEvent.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Host Machine</span>
                <span className="text-cyan-400 font-bold">{selectedEvent.hostname}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Telemetry Source</span>
                <span className="text-slate-200">{selectedEvent.source}</span>
              </div>
            </div>

            {/* Network & Process Details */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 uppercase text-[11px] block border-b border-slate-800 pb-1">
                Contextual Attributes
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-500">Source IP:</span> <span className="text-slate-200">{selectedEvent.source_ip || 'None'}</span></div>
                <div><span className="text-slate-500">Destination IP:</span> <span className="text-slate-200">{selectedEvent.destination_ip || 'None'}</span></div>
                <div><span className="text-slate-500">Target User:</span> <span className="text-slate-200">{selectedEvent.username || 'SYSTEM'}</span></div>
                <div><span className="text-slate-500">Process Name:</span> <span className="text-slate-200">{selectedEvent.process_name || 'N/A'}</span></div>
                <div><span className="text-slate-500">Raw Log ID:</span> <span className="text-slate-400 text-[10px]">{selectedEvent.raw_log_id}</span></div>
                <div><span className="text-slate-500">Agent ID:</span> <span className="text-slate-400 text-[10px]">{selectedEvent.agent_id || 'Direct'}</span></div>
              </div>
              {selectedEvent.command_line && (
                <div className="pt-2">
                  <span className="text-slate-500 block text-[10px]">Command Line:</span>
                  <code className="text-amber-300 text-[11px] block p-2 bg-slate-950 rounded border border-slate-800 mt-1">
                    {selectedEvent.command_line}
                  </code>
                </div>
              )}
            </div>

            {/* Canonical Normalized JSON Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Canonical Normalized Object
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedEvent.normalized_json, null, 2))}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 overflow-x-auto text-[11px] leading-relaxed max-h-64">
                <pre>{JSON.stringify(selectedEvent.normalized_json, null, 2)}</pre>
              </div>
            </div>

            {/* Preserved Raw Ingestion Payload */}
            <div className="space-y-2">
              <span className="font-bold text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Preserved Raw Ingestion Payload
              </span>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 overflow-x-auto text-[11px] leading-relaxed max-h-64">
                {rawLoading ? (
                  <span className="text-slate-500 italic">Fetching raw payload from storage...</span>
                ) : (
                  <pre>{rawContent || 'No raw payload available'}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
