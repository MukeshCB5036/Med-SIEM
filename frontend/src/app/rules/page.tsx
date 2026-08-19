'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function DetectionRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    setLoading(true);
    const res = await apiClient<any[]>('/rules');
    if (res.success && res.data) {
      setRules(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (id: string, currentStatus: boolean) => {
    await apiClient(`/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !currentStatus })
    });
    fetchRules();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Detection Engine Rules</h1>
          <p className="text-xs text-slate-400">Rule-based detection conditions, threshold windows, and MITRE ATT&CK mapping</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Rule Name</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Category</th>
              <th className="p-3">MITRE ATT&CK</th>
              <th className="p-3">Condition Rule</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center">Loading detection rules...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center">No detection rules found.</td></tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-800/50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rule.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {rule.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{rule.name}</td>
                  <td className="p-3 font-bold text-rose-400">{rule.severity}</td>
                  <td className="p-3">{rule.event_category}</td>
                  <td className="p-3 font-mono text-amber-400">{rule.mitre_technique || 'N/A'}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">{rule.conditions}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleRule(rule.id, rule.enabled)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded"
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
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
