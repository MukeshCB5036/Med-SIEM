'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    setLoading(true);
    const res = await apiClient<any[]>('/incidents');
    if (res.success && res.data) {
      setIncidents(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleResolve = async (id: string) => {
    await apiClient(`/incidents/${id}/resolve`, { method: 'POST' });
    fetchIncidents();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Security Incident Lifecycle Management</h1>
          <p className="text-xs text-slate-400">Escalated breach cases, containment workflows, and analyst collaboration</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-3">Severity</th>
              <th className="p-3">Incident Title</th>
              <th className="p-3">Status</th>
              <th className="p-3">Linked Alerts</th>
              <th className="p-3">Created Date</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center">Loading security incidents...</td></tr>
            ) : incidents.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center">No security incidents created.</td></tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-800/50">
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {inc.severity}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{inc.title}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {inc.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-emerald-400">{inc.alerts ? inc.alerts.length : 0} Alerts</td>
                  <td className="p-3 text-slate-400">{new Date(inc.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    {inc.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolve(inc.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded"
                      >
                        Resolve Incident
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
