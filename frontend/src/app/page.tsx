'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/MetricCard';
import SeverityBadge from '@/components/SeverityBadge';
import CyberChart from '@/components/CyberChart';
import { apiClient } from '@/lib/api';
import {
  ShieldAlert,
  BellRing,
  Activity,
  HardDrive,
  Laptop,
  Flame,
  ArrowRight,
  Stethoscope,
  Radio,
  CheckCircle2
} from 'lucide-react';

export default function SOCDashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [assetCount, setAssetCount] = useState<number>(4);
  const [agentCount, setAgentCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [alertsRes, alertStatsRes, assetsRes, agentsRes] = await Promise.all([
        apiClient<any[]>('/alerts?deduplicate=true&limit=6'),
        apiClient<any>('/alerts/stats'),
        apiClient<any[]>('/assets'),
        apiClient<any[]>('/agents')
      ]);

      if (alertsRes.success && alertsRes.data) {
        setAlerts(alertsRes.data);
      }
      if (alertStatsRes.success && alertStatsRes.data) {
        setStats(alertStatsRes.data);
      }
      if (assetsRes.success && assetsRes.data) {
        setAssetCount(assetsRes.data.length);
      }
      if (agentsRes.success && agentsRes.data) {
        setAgentCount(agentsRes.data.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartData = [
    { time: '09:00', count: 18 },
    { time: '10:00', count: 42 },
    { time: '11:00', count: 68 },
    { time: '12:00', count: 55 },
    { time: '13:00', count: 91 },
    { time: '14:00', count: 114 },
    { time: '15:00', count: 135 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Greeting & Operational State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            Security Operations Center (SOC) Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centralized healthcare cyber defense telemetry, real-time clinical threat correlation, and endpoint trust monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/live-events"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-mono transition-colors"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Open Live Stream</span>
          </Link>
        </div>
      </div>

      {/* Primary SOC Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Active Alerts"
          value={stats?.total_active_alerts ?? (stats?.total_alerts ?? alerts.length)}
          subtext="Active correlation detections"
          variant="cyan"
          icon={BellRing}
        />
        <MetricCard
          title="Critical Alerts"
          value={stats?.critical_alerts ?? (stats?.severity_breakdown?.CRITICAL ?? 0)}
          subtext="High-risk clinical threats"
          variant="rose"
          icon={Flame}
          change={stats?.critical_alerts ? "Urgent Triage" : "Guarded"}
          changeType={stats?.critical_alerts ? "negative" : "neutral"}
        />
        <MetricCard
          title="Active Incidents"
          value={stats?.active_incidents ?? 2}
          subtext="Ongoing clinical investigations"
          variant="amber"
          icon={Activity}
        />
        <MetricCard
          title="Monitored Assets"
          value={stats?.monitored_assets ?? assetCount}
          subtext="Hospital endpoints & servers"
          variant="blue"
          icon={HardDrive}
        />
      </div>

      {/* Telemetry Ingestion Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CyberChart
            title="Hospital Telemetry Events Ingested (Hourly Volume)"
            data={chartData}
            height={220}
            color="#06b6d4"
          />
        </div>

        {/* Clinical Service Risk Status Box */}
        <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-cyan-400" />
                Clinical Threat Posture
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                EHR Threat Active
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">EMR Core Production:</span>
                <SeverityBadge severity="CRITICAL" size="sm" />
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">PACS Image Archive:</span>
                <SeverityBadge severity="MEDIUM" size="sm" />
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">ICU Telemetry Station:</span>
                <SeverityBadge severity="LOW" size="sm" />
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Hospital Active Directory:</span>
                <SeverityBadge severity="HIGH" size="sm" />
              </div>
            </div>
          </div>

          <Link
            href="/healthcare-intelligence"
            className="mt-4 flex items-center justify-between text-xs font-bold text-cyan-400 hover:text-cyan-300 font-mono pt-3 border-t border-slate-800 transition-colors"
          >
            <span>Review Departmental Impact Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Real-Time Security Alerts Stream */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Correlated Security Alerts Feed
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live threat correlation triggered across hospital IT hosts and clinical subnets.
            </p>
          </div>
          <Link
            href="/alerts"
            className="flex items-center gap-1 text-xs font-bold font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View All ({alerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#090e1c] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Detection Title</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">MITRE Technique</th>
                <th className="py-3 px-3">Source IP</th>
                <th className="py-3 px-3">First Detected</th>
                <th className="py-3 px-3">Last Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No active threat alerts detected.
                  </td>
                </tr>
              ) : (
                alerts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <SeverityBadge severity={a.severity} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Link href="/alerts" className="font-bold text-slate-100 hover:text-cyan-300 transition-colors">
                          {a.title}
                        </Link>
                        {(a.occurrence_count && a.occurrence_count > 1) ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                            x{a.occurrence_count}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        a.status === 'OPEN' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                          : a.status === 'INVESTIGATING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-400 font-semibold">
                      {a.mitre_technique || 'N/A'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {a.source_ip || 'Internal'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {a.first_seen ? new Date(a.first_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(a.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                      {a.last_seen ? new Date(a.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(a.updated_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
