'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    let params = [];
    if (severityFilter) params.push(`severity=${severityFilter}`);
    if (statusFilter) params.push(`status_val=${statusFilter}`);
    const query = params.length ? `?${params.join('&')}` : '';

    const res = await apiClient<any[]>(`/alerts${query}`);
    if (res.success && res.data) {
      setAlerts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const handleResolve = async (id: string) => {
    await apiClient(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: 'Resolved via SOC Portal' })
    });
    fetchAlerts();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Security Alerts Management</h1>
          <p className="text-xs text-slate-400">Real-time threat detections, severity classification, and analyst triage</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-lg border border-slate-800">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>

        <div className="text-xs text-slate-400 ml-auto">
          Displaying {alerts.length} alerts
        </div>
      </div>

      {/* Alert Table */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-3">Severity</th>
              <th className="p-3">Alert Title</th>
              <th className="p-3">Status</th>
              <th className="p-3">MITRE ATT&CK</th>
              <th className="p-3">Source IP</th>
              <th className="p-3">User</th>
              <th className="p-3">Created Time</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center">Loading security alerts...</td></tr>
            ) : alerts.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center">No alerts matching filter criteria.</td></tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      alert.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{alert.title}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {alert.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-rose-400">{alert.mitre_technique || 'N/A'}</td>
                  <td className="p-3 font-mono">{alert.source_ip || 'Internal'}</td>
                  <td className="p-3">{alert.username || 'N/A'}</td>
                  <td className="p-3 text-slate-400">{new Date(alert.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
