'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface EventItem {
  id: string;
  timestamp: string;
  hostname: string;
  username: string | null;
  event_type: string;
  event_category: string;
  severity: string;
  source: string;
  message: string | null;
  process_name: string | null;
}

export default function EventExplorerPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const endpoint = query ? `/events/search?q=${encodeURIComponent(query)}` : '/events';
    const res = await apiClient<EventItem[]>(endpoint);
    if (res.success && res.data) {
      setEvents(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const viewRawLog = async (rawLogId: string) => {
    const res = await apiClient<{ raw_content: string }>(`/events/raw/${rawLogId}`);
    if (res.success && res.data) {
      setSelectedRaw(res.data.raw_content);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Live Event Explorer & OpenSearch Log Engine</h1>
        <p className="text-xs text-slate-400">Canonical ECS event stream, raw log inspector, and high-performance search</p>
      </div>

      {/* OpenSearch Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
        <input
          type="text"
          placeholder="Search logs by keyword, process name, hostname, or user (e.g. Sysmon, cmd.exe, admin)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-md shadow"
        >
          Search OpenSearch
        </button>
      </form>

      {/* Raw Log Modal */}
      {selectedRaw && (
        <div className="p-4 bg-slate-900 border border-rose-500/30 rounded-lg space-y-2">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-rose-400 uppercase">Preserved Raw Log Content</span>
            <button onClick={() => setSelectedRaw(null)} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
          </div>
          <pre className="p-3 bg-slate-950 rounded text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
            {selectedRaw}
          </pre>
        </div>
      )}

      {/* Events Table */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-3">Severity</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Hostname</th>
              <th className="p-3">User</th>
              <th className="p-3">Event Type</th>
              <th className="p-3">Category</th>
              <th className="p-3">Source</th>
              <th className="p-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center">Loading event stream...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center">No logs found matching query criteria.</td></tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.severity === 'HIGH' || evt.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                      evt.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-mono text-[11px]">
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 text-slate-200 font-medium">{evt.hostname}</td>
                  <td className="p-3">{evt.username || 'SYSTEM'}</td>
                  <td className="p-3 font-mono text-rose-400">{evt.event_type}</td>
                  <td className="p-3">{evt.event_category}</td>
                  <td className="p-3 text-slate-400">{evt.source}</td>
                  <td className="p-3 max-w-xs truncate font-mono text-[11px] text-slate-300" title={evt.message || ''}>
                    {evt.message}
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
