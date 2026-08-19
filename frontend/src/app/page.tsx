'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function SOCDashboardHome() {
  const { user, logout, hasPermission } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    const alertsRes = await apiClient<any[]>('/alerts?limit=5');
    if (alertsRes.success && alertsRes.data) {
      setAlerts(alertsRes.data);
    }
    
    const alertStatsRes = await apiClient<any>('/alerts/stats');
    if (alertStatsRes.success && alertStatsRes.data) {
      setStats(alertStatsRes.data);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const primaryRole = user?.roles[0]?.name || (user?.is_superuser ? 'Super Admin' : 'SOC Analyst');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Enterprise Multi-Section Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800 mb-4">
            <div className="w-8 h-8 rounded bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-600/30">
              M
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none text-slate-50">MedSIEM</h1>
              <span className="text-[10px] text-rose-400 font-mono tracking-wider uppercase">Healthcare SOC</span>
            </div>
          </div>

          <nav className="space-y-4 text-xs font-medium">
            {/* OVERVIEW */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Overview</div>
              <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-md bg-rose-600/10 text-rose-400 font-bold border border-rose-500/20">
                <span>📊 Dashboard</span>
              </a>
            </div>

            {/* MONITORING */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Monitoring</div>
              <div className="space-y-1">
                <a href="/events" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                  <span>🔍 Log Explorer</span>
                </a>
                {hasPermission('alerts.read') && (
                  <a href="/alerts" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                    <span>🚨 Security Alerts</span>
                  </a>
                )}
                {hasPermission('incidents.manage') && (
                  <a href="/incidents" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                    <span>🛡️ Incidents</span>
                  </a>
                )}
              </div>
            </div>

            {/* SECURITY */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Security</div>
              <div className="space-y-1">
                {hasPermission('settings.manage') && (
                  <a href="/rules" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                    <span>⚙️ Detection Rules</span>
                  </a>
                )}
                <a href="/threat-intelligence" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                  <span>🎯 Threat Intelligence</span>
                </a>
                <a href="/assets" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                  <span>💻 Assets & Agents</span>
                </a>
              </div>
            </div>

            {/* OPERATIONS */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Operations</div>
              <a href="/reports" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                <span>📋 HIPAA Reports</span>
              </a>
            </div>

            {/* ADMINISTRATION */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Administration</div>
              <div className="space-y-1">
                {hasPermission('users.read') && (
                  <a href="/users" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                    <span>👥 Users & Access</span>
                  </a>
                )}
                <a href="/settings" className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                  <span>🛠️ System Settings</span>
                </a>
              </div>
            </div>
          </nav>
        </div>

        <div className="p-3 border-t border-slate-800 text-xs text-slate-500 space-y-1 bg-slate-950/40 rounded-lg mt-4">
          <div>Operator: <span className="text-slate-200 font-medium">{user?.full_name || 'SOC Analyst'}</span></div>
          <div>Role: <span className="text-rose-400 font-mono">{primaryRole}</span></div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Security Operations Command Center</h2>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Pipeline Active (10s Refresh)
            </span>
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Top SOC Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Active Alerts</span>
              <div className="mt-2 text-3xl font-bold text-rose-500">
                {stats ? stats.total_alerts : 0}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Alerts</span>
              <div className="mt-2 text-3xl font-bold text-rose-400">
                {stats?.severity_breakdown?.CRITICAL || 0}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">High Alerts</span>
              <div className="mt-2 text-3xl font-bold text-amber-400">
                {stats?.severity_breakdown?.HIGH || 0}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">HIPAA Risk Level</span>
              <div className="mt-2 text-3xl font-bold text-emerald-400">LOW</div>
            </div>
          </div>

          {/* Live Recent Alerts Feed */}
          <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-base text-slate-200">Real-Time Triggered Healthcare Security Alerts</h3>
              <a href="/alerts" className="text-xs text-rose-400 hover:underline font-medium">View All Alerts →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Alert Title</th>
                    <th className="p-3">MITRE ATT&CK</th>
                    <th className="p-3">Source IP</th>
                    <th className="p-3">Target User</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {alerts.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center">No active threat alerts detected.</td></tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/50">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="p-3 text-slate-200 font-semibold">{a.title}</td>
                        <td className="p-3 font-mono text-rose-400">{a.mitre_technique || 'N/A'}</td>
                        <td className="p-3 font-mono">{a.source_ip || '127.0.0.1'}</td>
                        <td className="p-3">{a.username || 'SYSTEM'}</td>
                        <td className="p-3 text-slate-400">{new Date(a.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
