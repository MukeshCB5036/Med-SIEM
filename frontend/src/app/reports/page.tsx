'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('Executive Summary');
  const [downloading, setDownloading] = useState(false);

  const handleExportCSV = async () => {
    setDownloading(true);
    // Simulate CSV generation export download
    setTimeout(() => {
      const element = document.createElement("a");
      const file = new Blob([`MedSIEM Compliance Report: ${reportType}\nGenerated At: ${new Date().toISOString()}\nStatus: COMPLIANT`], {type: 'text/csv'});
      element.href = URL.createObjectURL(file);
      element.download = `MedSIEM_Report_${reportType.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(element);
      element.click();
      setDownloading(false);
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Healthcare Security & Compliance Reporting</h1>
        <p className="text-xs text-slate-400">Automated report generation for HIPAA Security Rule, ISO 27001, NIST CSF, and GDPR</p>
      </div>

      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 space-y-4 max-w-xl">
        <h3 className="font-semibold text-slate-200 text-sm uppercase">Generate Compliance Report</h3>
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Report Template</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-100 focus:outline-none"
          >
            <option value="HIPAA Audit Summary">HIPAA Security Rule Audit Summary</option>
            <option value="Executive Security Summary">Executive SOC Security Summary</option>
            <option value="Alert Triage Report">Security Alerts & Incident Triage Report</option>
            <option value="Asset Compliance Inventory">Asset & Agent Compliance Inventory</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-md shadow"
          >
            {downloading ? 'Generating Report...' : 'Export Report (CSV)'}
          </button>
        </div>
      </div>
    </div>
  );
}
