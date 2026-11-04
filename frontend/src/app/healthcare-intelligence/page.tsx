'use client';

import React from 'react';
import MetricCard from '@/components/MetricCard';
import SeverityBadge from '@/components/SeverityBadge';
import {
  HeartPulse,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Hospital,
  Stethoscope,
  Database,
  ExternalLink
} from 'lucide-react';

interface ClinicalThreatContext {
  department: string;
  associatedService: string;
  assetCriticality: 'Critical' | 'High' | 'Medium' | 'Low';
  operationalDependency: string;
  potentialOperationalImpact: string;
  currentThreatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  activeAlertCount: number;
}

const CLINICAL_SERVICE_PROFILES: ClinicalThreatContext[] = [
  {
    department: 'Inpatient Informatics & Wards',
    associatedService: 'Electronic Health Record (EHR) Core Engine',
    assetCriticality: 'Critical',
    operationalDependency: 'Direct Patient Life-Safety & Clinical Documentation',
    potentialOperationalImpact: 'Total halt of inpatient medication orders and physician charting',
    currentThreatLevel: 'CRITICAL',
    activeAlertCount: 2
  },
  {
    department: 'Radiology & Medical Imaging',
    associatedService: 'PACS Diagnostic Imaging & Radiologic Archiving',
    assetCriticality: 'Critical',
    operationalDependency: 'Diagnostic Workflow & Surgical Planning',
    potentialOperationalImpact: 'Delayed MRI/CT review causing diverted emergency surgeries',
    currentThreatLevel: 'MEDIUM',
    activeAlertCount: 1
  },
  {
    department: 'Intensive Care Unit (ICU)',
    associatedService: 'Bedside Patient Telemetry Station',
    assetCriticality: 'Medium',
    operationalDependency: 'Real-time Patient Monitoring',
    potentialOperationalImpact: 'Loss of bedside telemetry alarms for critically ill cardiac patients',
    currentThreatLevel: 'LOW',
    activeAlertCount: 0
  },
  {
    department: 'Hospital IT Infrastructure',
    associatedService: 'Hospital Identity & Access Directory (AD)',
    assetCriticality: 'Critical',
    operationalDependency: 'Hospital-Wide Single Sign-On & Medical Device Auth',
    potentialOperationalImpact: 'System-wide lockout of all clinical terminals and medical devices',
    currentThreatLevel: 'HIGH',
    activeAlertCount: 1
  }
];

const KNOWN_HEALTHCARE_IOCS = [
  {
    indicator: '185.220.101.5',
    type: 'IPv4 Address',
    malwareFamily: 'BlackCat / ALPHV Healthcare Ransomware C2',
    clinicalTarget: 'DICOM Archive & EMR Databases',
    confidence: '99%',
    firstSeen: '2026-10-14'
  },
  {
    indicator: '192.168.1.45',
    type: 'Internal IP',
    malwareFamily: 'Compromised Radiology Workstation',
    clinicalTarget: 'Domain Controller Password Spraying',
    confidence: '95%',
    firstSeen: '2026-11-01'
  },
  {
    indicator: 'powershell -enc JABjAGw...',
    type: 'Process Signature',
    malwareFamily: 'Obfuscated PowerShell Telemetry Infiltrator',
    clinicalTarget: 'EHR Export Scripting',
    confidence: '90%',
    firstSeen: '2026-10-28'
  }
];

export default function HealthcareIntelligencePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            Healthcare Threat Intelligence & Clinical Impact
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Clinical service context, departmental operational dependencies, and healthcare-focused threat indicators.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored Clinical Units"
          value={4}
          subtext="EHR, PACS, ICU, Directory"
          variant="cyan"
          icon={Hospital}
        />
        <MetricCard
          title="Critical Care Risk"
          value="Elevated"
          subtext="EHR exfiltration active"
          variant="rose"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Active Healthcare IOCs"
          value={3}
          subtext="Targeting hospital infrastructure"
          variant="amber"
          icon={ShieldAlert}
        />
        <MetricCard
          title="HIPAA Sentinel Status"
          value="ENFORCED"
          subtext="Zero PHI data exposure permitted"
          variant="emerald"
          icon={Activity}
        />
      </div>

      {/* Clinical Service Context & Operational Dependency Matrix */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              Hospital Department Operational Impact Analysis
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured mapping of cyber threats to clinical services and potential operational consequences.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CLINICAL_SERVICE_PROFILES.map((profile, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-800/90 bg-[#090e1c] hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{profile.department}</span>
                  <SeverityBadge severity={profile.currentThreatLevel} size="sm" />
                </div>
                <h4 className="text-sm font-mono font-bold text-cyan-400 mt-1">{profile.associatedService}</h4>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Operational Dependency:
                    </span>
                    <p className="text-slate-200 font-medium mt-0.5">{profile.operationalDependency}</p>
                  </div>

                  <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300">
                    <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-bold">
                      Potential Clinical Impact:
                    </span>
                    <p className="font-medium mt-0.5">{profile.potentialOperationalImpact}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>Asset Criticality: <strong className="text-slate-200">{profile.assetCriticality}</strong></span>
                <span>Active Alerts: <strong className="text-rose-400">{profile.activeAlertCount}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Healthcare Sector Threat IOC Indicators */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Healthcare Sector Threat Feed (Correlated IOCs)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-2.5 px-3">Indicator / IP</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Malware / Threat Family</th>
                <th className="py-2.5 px-3">Targeted Clinical Asset</th>
                <th className="py-2.5 px-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {KNOWN_HEALTHCARE_IOCS.map((ioc, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 text-cyan-400 font-bold">{ioc.indicator}</td>
                  <td className="py-3 px-3 text-slate-400">{ioc.type}</td>
                  <td className="py-3 px-3 text-rose-400 font-semibold">{ioc.malwareFamily}</td>
                  <td className="py-3 px-3 text-slate-300">{ioc.clinicalTarget}</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">{ioc.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
