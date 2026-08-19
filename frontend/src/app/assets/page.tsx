'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface Agent {
  id: string;
  asset_id: string;
  agent_version: string;
  os_name: string;
  os_version: string;
  status: 'Online' | 'Offline' | 'Unregistered' | 'Revoked';
  last_heartbeat: string;
  revoked_at: string | null;
  created_at: string;
  asset?: {
    hostname: string;
    ip_address: string;
    criticality: string;
  };
}

interface Asset {
  id: string;
  hostname: string;
  asset_name: string;
  asset_type: string;
  ip_address: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Online' | 'Offline' | 'Maintenance' | 'Revoked';
  last_seen: string | null;
  agent_version: string | null;
  agent?: Agent;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<'assets' | 'agents'>('assets');

  const fetchAssetsAndAgents = async () => {
    setLoading(true);
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const [assetRes, agentRes] = await Promise.all([
      apiClient<Asset[]>(`/assets${query}`),
      apiClient<Agent[]>('/agents')
    ]);

    if (assetRes.success && assetRes.data) {
      setAssets(assetRes.data);
    }
    if (agentRes.success && agentRes.data) {
      setAgents(agentRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssetsAndAgents();
  }, [search]);

  const handleRevokeAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to revoke this agent? It will immediately stop log ingestion and heartbeat.')) return;
    setActionLoading(true);
    const res = await apiClient(`/agents/${agentId}/revoke`, { method: 'POST' });
    setActionLoading(false);
    if (res.success) {
      alert('Agent credentials revoked successfully.');
      fetchAssetsAndAgents();
    } else {
      alert(res.error || 'Failed to revoke agent.');
    }
  };

  const onlineCount = assets.filter(a => a.status === 'Online').length;
  const offlineCount = assets.filter(a => a.status === 'Offline').length;

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Healthcare Asset & Endpoint Agent Management</h1>
          <p className="text-xs text-slate-400">Centralized monitoring, telemetry, and security revocation for MedSIEM Agents</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('assets')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'assets' ? 'bg-rose-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            Asset Inventory ({assets.length})
          </button>
          <button
            onClick={() => setTab('agents')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'agents' ? 'bg-rose-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            Endpoint Agents ({agents.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase">Monitored Assets</span>
          <div className="mt-2 text-3xl font-bold text-slate-100">{assets.length}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase">Agents Online</span>
          <div className="mt-2 text-3xl font-bold text-emerald-400">{onlineCount}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase">Agents Offline</span>
          <div className="mt-2 text-3xl font-bold text-rose-400">{offlineCount}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase">Revoked Credentials</span>
          <div className="mt-2 text-3xl font-bold text-amber-400">
            {agents.filter(a => a.status === 'Revoked').length}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-lg border border-slate-800">
        <input
          type="text"
          placeholder="Search by hostname, IP address, OS, or version..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-96 px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
        />
        <div className="text-xs text-slate-400">
          Showing {tab === 'assets' ? assets.length : agents.length} items
        </div>
      </div>

      {/* ASSETS TABLE */}
      {tab === 'assets' && (
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Hostname</th>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">Criticality</th>
                <th className="p-3">Agent Version</th>
                <th className="p-3">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="p-4 text-center">Loading inventory...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-center">No endpoints found matching search.</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asset.status === 'Online' ? 'bg-emerald-500/20 text-emerald-400' :
                        asset.status === 'Revoked' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-200 font-medium">{asset.hostname}</td>
                    <td className="p-3">{asset.asset_name}</td>
                    <td className="p-3 text-slate-300">{asset.asset_type}</td>
                    <td className="p-3 font-mono">{asset.ip_address}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asset.criticality === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                        asset.criticality === 'High' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {asset.criticality}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">{asset.agent_version || 'N/A'}</td>
                    <td className="p-3 text-slate-400">
                      {asset.last_seen ? new Date(asset.last_seen).toLocaleTimeString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ENDPOINT AGENTS TABLE */}
      {tab === 'agents' && (
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-3">Agent Status</th>
                <th className="p-3">Agent ID</th>
                <th className="p-3">OS Platform</th>
                <th className="p-3">OS Version</th>
                <th className="p-3">Agent Version</th>
                <th className="p-3">Last Heartbeat</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center">Loading agents...</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center">No endpoint agents registered.</td></tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        agent.status === 'Online' ? 'bg-emerald-500/20 text-emerald-400' :
                        agent.status === 'Revoked' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-200">{agent.id}</td>
                    <td className="p-3 text-slate-300">{agent.os_name}</td>
                    <td className="p-3">{agent.os_version}</td>
                    <td className="p-3 font-mono">{agent.agent_version}</td>
                    <td className="p-3 text-slate-400">
                      {agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="p-3">
                      {agent.status !== 'Revoked' ? (
                        <button
                          onClick={() => handleRevokeAgent(agent.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/30 text-[10px] font-bold rounded transition-colors"
                        >
                          Revoke Credential
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
