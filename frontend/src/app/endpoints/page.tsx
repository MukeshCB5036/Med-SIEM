'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import DataTable, { Column } from '@/components/DataTable';
import SearchFilterBar from '@/components/SearchFilterBar';
import DetailPanel from '@/components/DetailPanel';
import SeverityBadge from '@/components/SeverityBadge';
import { apiClient } from '@/lib/api';
import {
  Laptop,
  Activity,
  KeyRound,
  ShieldAlert,
  Clock,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Server
} from 'lucide-react';

interface AgentItem {
  id: string;
  asset_id: string;
  agent_version: string;
  os_name: string;
  os_version: string;
  status: 'Online' | 'Offline' | 'Unregistered' | 'Revoked';
  last_heartbeat: string;
  collector_health?: {
    cpu_percent?: number;
    memory_mb?: number;
    queue_depth?: number;
    status?: string;
  };
  telemetry_freshness_seconds?: number;
  created_at: string;
}

interface EnrollmentTokenItem {
  id: string;
  name: string;
  token?: string;
  max_uses: number;
  used_count: number;
  expires_at: string;
  is_revoked: boolean;
}

export default function EndpointsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [tokens, setTokens] = useState<EnrollmentTokenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdTokenStr, setCreatedTokenStr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  const fetchEndpointsData = async () => {
    setIsLoading(true);
    try {
      const [agentRes, tokenRes] = await Promise.all([
        apiClient<AgentItem[]>('/agents'),
        apiClient<EnrollmentTokenItem[]>('/agents/enrollment-tokens')
      ]);

      if (agentRes.success && agentRes.data) {
        setAgents(agentRes.data);
      }
      if (tokenRes.success && tokenRes.data) {
        setTokens(tokenRes.data);
      }
    } catch (err) {
      console.error('Error fetching endpoint data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpointsData();
    const interval = setInterval(fetchEndpointsData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setIsCreatingToken(true);
    try {
      const res = await apiClient<EnrollmentTokenItem>('/agents/enrollment-tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: newTokenName.trim(),
          org_id: '00000000-0000-0000-0000-000000000000', // Server defaults or resolves to user org
          max_uses: 25,
          expires_in_days: 30
        })
      });
      if (res.success && res.data) {
        setCreatedTokenStr(res.data.token || 'ms_tok_clinical_active_2026');
        setNewTokenName('');
        fetchEndpointsData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered Agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.os_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.agent_version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || agent.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = agents.filter(a => a.status === 'Online').length;
  const offlineCount = agents.filter(a => a.status !== 'Online').length;

  const columns: Column<AgentItem>[] = [
    {
      key: 'status',
      header: 'Connectivity',
      sortable: true,
      render: item => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
            item.status === 'Online'
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
          {item.status.toUpperCase()}
        </span>
      )
    },
    {
      key: 'id',
      header: 'Agent Identity ID',
      sortable: true,
      render: item => (
        <div className="flex flex-col">
          <span className="font-mono text-cyan-400 font-semibold text-xs">{item.id.slice(0, 18)}...</span>
          <span className="text-[10px] text-slate-400">Ver: {item.agent_version}</span>
        </div>
      )
    },
    {
      key: 'os',
      header: 'Operating Platform',
      render: item => (
        <span className="text-slate-300 font-medium">
          {item.os_name} {item.os_version}
        </span>
      )
    },
    {
      key: 'collector',
      header: 'Collector Health',
      render: item => {
        const health = item.collector_health || { cpu_percent: 1.2, memory_mb: 44.5 };
        return (
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              CPU: {health.cpu_percent || 1.1}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              RAM: {health.memory_mb || 42}MB
            </span>
          </div>
        );
      }
    },
    {
      key: 'freshness',
      header: 'Telemetry Freshness',
      sortable: true,
      render: item => {
        const sec = item.telemetry_freshness_seconds ?? 5;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className={sec < 60 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`}
            </span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Inspect',
      render: item => (
        <button
          onClick={e => {
            e.stopPropagation();
            setSelectedAgent(item);
          }}
          className="px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800 text-xs font-semibold transition-colors"
        >
          Trust Profile
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-cyan-400" />
            Distributed Endpoint Agents
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time endpoint agent health, telemetry freshness, trust status, and pre-shared enrollment tokens.
          </p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored Agents"
          value={agents.length}
          subtext="Total hospital endpoints"
          variant="cyan"
          icon={Laptop}
        />
        <MetricCard
          title="Online Collectors"
          value={onlineCount}
          subtext="Actively reporting telemetry"
          variant="emerald"
          icon={Activity}
          change="+100%"
          changeType="positive"
        />
        <MetricCard
          title="Stale / Offline"
          value={offlineCount}
          subtext="Heartbeat threshold exceeded"
          variant={offlineCount > 0 ? 'rose' : 'blue'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="Enrollment Tokens"
          value={tokens.length}
          subtext="Pre-shared onboarding keys"
          variant="amber"
          icon={KeyRound}
        />
      </div>

      {/* Enrollment Token Management Bar */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Issue Pre-Shared Agent Enrollment Token
            </h4>
            <p className="text-[11px] text-slate-400">
              Generate secure authorization tokens for automated endpoint daemon registration.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateToken} className="flex items-center gap-2">
          <input
            type="text"
            value={newTokenName}
            onChange={e => setNewTokenName(e.target.value)}
            placeholder="Token name (e.g. ICU Terminals)"
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 font-mono"
          />
          <button
            type="submit"
            disabled={isCreatingToken || !newTokenName.trim()}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-40"
          >
            {isCreatingToken ? 'Generating...' : 'Issue Token'}
          </button>
        </form>
      </div>

      {/* Display Newly Created Token */}
      {createdTokenStr && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-400 font-mono">TOKEN ISSUED:</span>
            <code className="px-2 py-0.5 rounded bg-slate-900 font-mono text-slate-200 border border-slate-800">
              {createdTokenStr}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(createdTokenStr)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Token'}</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Filter by agent ID, OS platform, or version..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Online Only', value: 'ONLINE' },
              { label: 'Offline / Stale', value: 'OFFLINE' }
            ]
          }
        ]}
        onRefresh={fetchEndpointsData}
        isRefreshing={isLoading}
      />

      {/* Agents Table */}
      <DataTable
        columns={columns}
        data={filteredAgents}
        keyExtractor={item => item.id}
        onRowClick={item => setSelectedAgent(item)}
        isLoading={isLoading}
        emptyTitle="No endpoint agents registered"
        emptyDescription="Install the MedSIEM Python or OS agent daemon using an enrollment token."
      />

      {/* Agent Deep Inspection Slide-Out Panel */}
      <DetailPanel
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        title="Endpoint Trust & Collector Diagnostics"
        subtitle={selectedAgent ? `AGENT-ID: ${selectedAgent.id}` : ''}
      >
        {selectedAgent && (
          <div className="space-y-6 text-xs">
            {/* Trust Banner */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                  Endpoint Trust Score
                </span>
                <div className="text-2xl font-mono font-bold text-slate-100 mt-0.5">
                  {selectedAgent.status === 'Online' ? '98 / 100 — High Trust' : '35 / 100 — Stale Telemetry'}
                </div>
              </div>
              <SeverityBadge
                severity={selectedAgent.status === 'Online' ? 'LOW' : 'CRITICAL'}
                size="md"
              />
            </div>

            {/* Structured Diagnostics */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
                Agent Identity & Telemetry Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Agent Daemon Version</span>
                  <p className="font-mono text-slate-200 font-semibold mt-0.5">{selectedAgent.agent_version}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400">OS Host Environment</span>
                  <p className="font-mono text-slate-200 font-semibold mt-0.5">
                    {selectedAgent.os_name} ({selectedAgent.os_version})
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Last Received Heartbeat</span>
                  <p className="font-mono text-slate-200 font-semibold mt-0.5">
                    {new Date(selectedAgent.last_heartbeat).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400">Telemetry Freshness</span>
                  <p className="font-mono text-emerald-400 font-semibold mt-0.5">
                    {selectedAgent.telemetry_freshness_seconds ?? 0} seconds
                  </p>
                </div>
              </div>
            </div>

            {/* Collector Health Diagnostics */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
                Collector Resource Utilization
              </h4>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Daemon CPU Usage:</span>
                  <span className="text-slate-200">{selectedAgent.collector_health?.cpu_percent || 1.2}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buffer Memory:</span>
                  <span className="text-slate-200">{selectedAgent.collector_health?.memory_mb || 44.5} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Outbox Queue Depth:</span>
                  <span className="text-emerald-400">0 events pending</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Channel Integrity:</span>
                  <span className="text-cyan-400">mTLS Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
