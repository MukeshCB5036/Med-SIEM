'use client';

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import DataTable, { Column } from '@/components/DataTable';
import SearchFilterBar from '@/components/SearchFilterBar';
import DetailPanel from '@/components/DetailPanel';
import SeverityBadge from '@/components/SeverityBadge';
import { apiClient } from '@/lib/api';
import {
  Database,
  Server,
  Activity,
  Stethoscope,
  ShieldAlert,
  AlertTriangle,
  Hospital,
  HardDrive
} from 'lucide-react';

interface Asset {
  id: string;
  hostname: string;
  asset_name: string;
  asset_type: string;
  ip_address: string;
  department?: string;
  clinical_service?: string;
  operational_dependency?: string;
  potential_operational_impact?: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Online' | 'Offline' | 'Maintenance' | 'Revoked';
  last_seen: string | null;
  agent_version: string | null;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    try {
      const res = await apiClient<Asset[]>(`/assets${query}`);
      if (res.success && res.data) {
        setAssets(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search]);

  const filteredAssets = assets.filter(a => {
    const matchesCriticality =
      criticalityFilter === 'ALL' || a.criticality.toUpperCase() === criticalityFilter;
    return matchesCriticality;
  });

  const criticalCount = assets.filter(a => a.criticality === 'Critical').length;
  const onlineCount = assets.filter(a => a.status === 'Online').length;
  const offlineCount = assets.filter(a => a.status !== 'Online').length;

  const columns: Column<Asset>[] = [
    {
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      render: item => <SeverityBadge severity={item.criticality.toUpperCase()} size="sm" />
    },
    {
      key: 'hostname',
      header: 'Asset Identity',
      sortable: true,
      render: item => (
        <div className="flex flex-col">
          <span className="font-bold text-cyan-400 font-mono text-xs">{item.hostname}</span>
          <span className="text-[10px] text-slate-300 font-medium">{item.asset_name}</span>
        </div>
      )
    },
    {
      key: 'service',
      header: 'Clinical Service Context',
      render: item => (
        <div className="flex flex-col text-xs">
          <span className="font-bold text-slate-200">{item.clinical_service || 'General IT Infrastructure'}</span>
          <span className="text-[10px] text-slate-400 font-medium">{item.department || 'Central IT'}</span>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Device Type / IP',
      render: item => (
        <div className="flex flex-col font-mono text-[11px] text-slate-300">
          <span>{item.asset_type}</span>
          <span className="text-slate-400">{item.ip_address}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
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
      key: 'action',
      header: 'Clinical Impact',
      render: item => (
        <button
          onClick={e => {
            e.stopPropagation();
            setSelectedAsset(item);
          }}
          className="px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800 text-xs font-semibold transition-colors"
        >
          Inspect Impact
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
            <Database className="w-5 h-5 text-cyan-400" />
            Healthcare Asset Intelligence & Criticality
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Clinical device catalog, departmental service mapping, and patient care operational dependencies.
          </p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored Assets"
          value={assets.length}
          subtext="Hospital IT & medical devices"
          variant="cyan"
          icon={HardDrive}
        />
        <MetricCard
          title="Critical Tier Assets"
          value={criticalCount}
          subtext="Direct life-safety & EHR"
          variant="rose"
          icon={ShieldAlert}
        />
        <MetricCard
          title="Online Telemetry"
          value={onlineCount}
          subtext="Active heartbeat verified"
          variant="emerald"
          icon={Activity}
        />
        <MetricCard
          title="Offline Devices"
          value={offlineCount}
          subtext="Requiring network inspection"
          variant={offlineCount > 0 ? 'amber' : 'blue'}
          icon={AlertTriangle}
        />
      </div>

      {/* Search and Filters */}
      <SearchFilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        placeholder="Filter by hostname, device name, IP address..."
        filters={[
          {
            key: 'criticality',
            label: 'Criticality',
            value: criticalityFilter,
            onChange: setCriticalityFilter,
            options: [
              { label: 'All Criticalities', value: 'ALL' },
              { label: 'Critical Tier', value: 'CRITICAL' },
              { label: 'High Tier', value: 'HIGH' },
              { label: 'Medium Tier', value: 'MEDIUM' },
              { label: 'Low Tier', value: 'LOW' }
            ]
          }
        ]}
        onRefresh={fetchAssets}
        isRefreshing={loading}
      />

      {/* Asset Table */}
      <DataTable
        columns={columns}
        data={filteredAssets}
        keyExtractor={item => item.id}
        onRowClick={item => setSelectedAsset(item)}
        isLoading={loading}
        emptyTitle="No healthcare assets located"
        emptyDescription="Register hospital hosts or endpoint agents to establish asset telemetry."
      />

      {/* Clinical Service Context Detail Slide-Out Panel */}
      <DetailPanel
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title="Clinical Service Context & Operational Dependency"
        subtitle={selectedAsset ? `HOST: ${selectedAsset.hostname}` : ''}
        width="xl"
      >
        {selectedAsset && (
          <div className="space-y-6 text-xs">
            {/* Criticality Banner */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                  Healthcare Criticality Tier
                </span>
                <div className="text-xl font-mono font-bold text-slate-100 mt-0.5">
                  {selectedAsset.criticality.toUpperCase()} IMPACT
                </div>
              </div>
              <SeverityBadge severity={selectedAsset.criticality.toUpperCase()} size="md" />
            </div>

            {/* Department and Service */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono">Hospital Department</span>
                <p className="font-bold text-slate-100 text-xs mt-0.5">
                  {selectedAsset.department || 'Hospital Core IT'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono">Associated Clinical Service</span>
                <p className="font-bold text-cyan-400 text-xs mt-0.5">
                  {selectedAsset.clinical_service || 'Standard Hospital Server'}
                </p>
              </div>
            </div>

            {/* Operational Dependency */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                Operational Dependency
              </span>
              <p className="text-slate-200 text-xs font-medium leading-relaxed">
                {selectedAsset.operational_dependency || 'Standard administrative and medical documentation support.'}
              </p>
            </div>

            {/* Potential Operational Impact */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-200 space-y-1">
              <span className="text-[10px] font-mono text-rose-400 uppercase font-bold tracking-wider">
                Potential Clinical Impact Upon Compromise
              </span>
              <p className="text-xs font-medium leading-relaxed">
                {selectedAsset.potential_operational_impact || 'Degraded operational capability and delayed clinical reporting.'}
              </p>
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
