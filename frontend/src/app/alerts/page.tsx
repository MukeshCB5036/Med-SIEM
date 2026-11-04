'use client';

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import DataTable, { Column } from '@/components/DataTable';
import SearchFilterBar from '@/components/SearchFilterBar';
import DetailPanel from '@/components/DetailPanel';
import SeverityBadge from '@/components/SeverityBadge';
import { apiClient } from '@/lib/api';
import {
  BellRing,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  Code,
  Layers,
  FileText
} from 'lucide-react';

interface AlertItem {
  id: string;
  rule_id?: string;
  asset_id?: string;
  event_id?: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  mitre_technique?: string;
  source_ip?: string;
  destination_ip?: string;
  username?: string;
  matched_conditions?: Record<string, any>;
  supporting_events?: any[];
  detection_timestamp?: string;
  severity_rationale?: string;
  resolution_notes?: string;
  correlation_key?: string;
  occurrence_count?: number;
  first_seen?: string;
  last_seen?: string;
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deduplicate, setDeduplicate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    const params = [];
    if (severityFilter) params.push(`severity=${severityFilter}`);
    if (statusFilter) params.push(`status_val=${statusFilter}`);
    if (deduplicate) params.push(`deduplicate=true`);
    const query = params.length ? `?${params.join('&')}` : '';

    try {
      const res = await apiClient<AlertItem[]>(`/alerts${query}`);
      if (res.success && res.data) {
        setAlerts(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter, deduplicate]);

  const handleResolve = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiClient(`/alerts/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_notes: 'Resolved by SOC Analyst' })
      });
      fetchAlerts();
      if (selectedAlert && selectedAlert.id === id) {
        setSelectedAlert(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.mitre_technique && a.mitre_technique.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.source_ip && a.source_ip.includes(searchQuery)) ||
      (a.username && a.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const openCount = alerts.filter(a => a.status === 'OPEN').length;
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length;

  const columns: Column<AlertItem>[] = [
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: item => <SeverityBadge severity={item.severity} size="sm" />
    },
    {
      key: 'title',
      header: 'Security Alert Signature',
      sortable: true,
      render: item => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-100 text-xs">{item.title}</span>
            {item.occurrence_count && item.occurrence_count > 1 ? (
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                x{item.occurrence_count}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-md">{item.description}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Triage Status',
      sortable: true,
      render: item => (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {item.status}
        </span>
      )
    },
    {
      key: 'mitre',
      header: 'MITRE ATT&CK',
      sortable: true,
      render: item => (
        <span className="font-mono text-xs text-rose-400 font-semibold">
          {item.mitre_technique || 'N/A'}
        </span>
      )
    },
    {
      key: 'telemetry',
      header: 'Host / User / IP',
      render: item => (
        <div className="flex flex-col text-[11px] font-mono text-slate-400">
          {item.source_ip && <span>IP: {item.source_ip}</span>}
          {item.username && <span className="text-slate-300">User: {item.username}</span>}
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Detected',
      sortable: true,
      render: item => (
        <span className="font-mono text-xs text-slate-400">
          {new Date(item.created_at).toLocaleString()}
        </span>
      )
    },
    {
      key: 'action',
      header: 'Triage',
      render: item => (
        <div className="flex items-center gap-2">
          {item.status !== 'RESOLVED' && (
            <button
              onClick={e => handleResolve(item.id, e)}
              className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-400" />
            Security Alert Management & Explainable Detection
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time correlation, explainable detection rationales, and clinical triage workflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeduplicate(!deduplicate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              deduplicate
                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            <span>{deduplicate ? '✓ Correlated Alerts View' : 'Raw Incident Feed'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Alerts"
          value={alerts.length}
          subtext="Processed detections"
          variant="cyan"
          icon={BellRing}
        />
        <MetricCard
          title="Critical Breaches"
          value={criticalCount}
          subtext="EHR / Domain Controller risks"
          variant="rose"
          icon={ShieldAlert}
        />
        <MetricCard
          title="Active Triage"
          value={openCount}
          subtext="Awaiting analyst resolution"
          variant="amber"
          icon={Flame}
        />
        <MetricCard
          title="Resolved"
          value={resolvedCount}
          subtext="Closed security alerts"
          variant="emerald"
          icon={CheckCircle2}
        />
      </div>

      {/* Search and Filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Filter by title, MITRE technique, IP, user..."
        filters={[
          {
            key: 'severity',
            label: 'Severity',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { label: 'All Severities', value: '' },
              { label: 'Critical', value: 'CRITICAL' },
              { label: 'High', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' }
            ]
          },
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: '' },
              { label: 'Open', value: 'OPEN' },
              { label: 'Investigating', value: 'INVESTIGATING' },
              { label: 'Resolved', value: 'RESOLVED' }
            ]
          }
        ]}
        onRefresh={fetchAlerts}
        isRefreshing={loading}
      />

      {/* Alerts Data Table */}
      <DataTable
        columns={columns}
        data={filteredAlerts}
        keyExtractor={item => item.id}
        onRowClick={item => setSelectedAlert(item)}
        isLoading={loading}
        emptyTitle="No security alerts found"
        emptyDescription="All telemetry events are currently within normal baseline parameters."
      />

      {/* Explainable Detection Detail Slide-Out Panel */}
      <DetailPanel
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Explainable Detection Analysis"
        subtitle={selectedAlert ? `ALERT-ID: ${selectedAlert.id}` : ''}
        width="xl"
      >
        {selectedAlert && (
          <div className="space-y-6 text-xs">
            {/* Severity Banner with Rationale */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">
                  Clinical Severity Evaluation
                </span>
                <SeverityBadge severity={selectedAlert.severity} size="md" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">{selectedAlert.title}</h3>
              {selectedAlert.severity_rationale ? (
                <div className="p-3 rounded-lg bg-black/40 border border-rose-900/60 text-rose-200 font-sans leading-relaxed">
                  <span className="font-mono text-[10px] text-rose-400 block font-bold uppercase mb-1">
                    Explainable Detection Rationale:
                  </span>
                  {selectedAlert.severity_rationale}
                </div>
              ) : (
                <p className="text-slate-400 italic">No custom clinical rationale assigned.</p>
              )}
            </div>

            {/* Matched Conditions */}
            <div className="space-y-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                Detection Rule Matched Conditions
              </span>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 overflow-x-auto font-mono text-[11px]">
                <pre>
                  {selectedAlert.matched_conditions
                    ? JSON.stringify(selectedAlert.matched_conditions, null, 2)
                    : '// Standard signature match: event_type, frequency threshold'}
                </pre>
              </div>
            </div>

            {/* Supporting Telemetry Evidence */}
            <div className="space-y-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Supporting Telemetry Evidence
              </span>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto font-mono text-[11px]">
                <pre>
                  {selectedAlert.supporting_events
                    ? JSON.stringify(selectedAlert.supporting_events, null, 2)
                    : `// Correlated Source: ${selectedAlert.source_ip || 'Internal Host'}, MITRE: ${selectedAlert.mitre_technique || 'None'}`}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              {selectedAlert.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolve(selectedAlert.id)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                >
                  Mark Alert Resolved
                </button>
              )}
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
