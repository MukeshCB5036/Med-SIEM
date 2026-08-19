'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function ThreatIntelligencePage() {
  const [iocs, setIocs] = useState<any[]>([
    { id: '1', ioc: '185.220.101.5', type: 'IP Address', reputation: 'Malicious', source: 'MISP / VirusTotal', confidence: '98%', first_seen: '2026-08-01', count: 14 },
    { id: '2', ioc: 'bad-phishing-ehr.com', type: 'Domain', reputation: 'Suspicious', source: 'ThreatIntel Exchange', confidence: '85%', first_seen: '2026-08-05', count: 3 },
    { id: '3', ioc: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', type: 'File Hash (SHA256)', reputation: 'Malware', source: 'VirusTotal', confidence: '100%', first_seen: '2026-07-28', count: 1 },
  ]);

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Threat Intelligence & IOC Reputation Engine</h1>
        <p className="text-xs text-slate-400">Integration with VirusTotal, MISP, and automated IOC matching for healthcare security</p>
      </div>

      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-3">Indicator of Compromise (IOC)</th>
              <th className="p-3">Type</th>
              <th className="p-3">Reputation</th>
              <th className="p-3">Source Engine</th>
              <th className="p-3">Confidence</th>
              <th className="p-3">Matched Events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {iocs.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/50">
                <td className="p-3 font-mono font-semibold text-slate-200">{item.ioc}</td>
                <td className="p-3">{item.type}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.reputation === 'Malicious' || item.reputation === 'Malware' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.reputation}
                  </span>
                </td>
                <td className="p-3 text-slate-300">{item.source}</td>
                <td className="p-3 font-mono text-emerald-400">{item.confidence}</td>
                <td className="p-3 font-bold text-rose-400">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
