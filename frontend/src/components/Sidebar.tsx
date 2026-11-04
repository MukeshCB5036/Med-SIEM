'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Laptop,
  Radio,
  BellRing,
  Flame,
  Database,
  ShieldCheck,
  FileSearch,
  HeartPulse,
  FileBarChart,
  Users,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Activity,
  HeartCrack
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  aliases?: string[];
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/', icon: LayoutDashboard, aliases: ['/overview'] },
  { id: 'endpoints', label: 'Endpoints', href: '/endpoints', icon: Laptop, badge: 'Active', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'live-events', label: 'Live Events', href: '/live-events', icon: Radio, badge: 'Live', badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'alerts', label: 'Alerts', href: '/alerts', icon: BellRing, badge: '3', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { id: 'incidents', label: 'Incidents', href: '/incidents', icon: Flame },
  { id: 'assets', label: 'Assets', href: '/assets', icon: Database },
  { id: 'rules', label: 'Detection Rules', href: '/rules', icon: ShieldCheck },
  { id: 'log-explorer', label: 'Log Explorer', href: '/log-explorer', icon: FileSearch, aliases: ['/events'] },
  { id: 'healthcare-intel', label: 'Healthcare Intelligence', href: '/healthcare-intelligence', icon: HeartPulse, aliases: ['/threat-intelligence'] },
  { id: 'reports', label: 'Reports', href: '/reports', icon: FileBarChart },
  { id: 'administration', label: 'Administration', href: '/administration', icon: Users, aliases: ['/users'] },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Sliders },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ collapsed: externalCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Skip rendering sidebar on auth routes
  if (pathname === '/login' || pathname.startsWith('/verify-email')) {
    return null;
  }

  const isRouteActive = (item: NavItem) => {
    if (item.href === '/') {
      return pathname === '/' || pathname === '/overview';
    }
    if (pathname.startsWith(item.href)) {
      return true;
    }
    if (item.aliases && item.aliases.some(alias => pathname.startsWith(alias))) {
      return true;
    }
    return false;
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-[#070b14] border-r border-slate-800/80 transition-all duration-300 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-[#0a0f1d]/60">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-slate-100 via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                  MedSIEM
                </span>
                <span className="text-[10px] font-semibold tracking-widest px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 uppercase">
                  SOC
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 tracking-tight">Healthcare Cyber Defense</span>
            </div>
          )}
        </Link>
        <button
          onClick={toggleCollapse}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800/60 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items List (1-12) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Operations & Telemetry
          </div>
        )}
        {PRIMARY_NAV_ITEMS.map((item, index) => {
          const active = isRouteActive(item);
          const Icon = item.icon;

          return (
            <React.Fragment key={item.id}>
              {/* Subtle section divider between core operations and system administration */}
              {!isCollapsed && index === 10 && (
                <div className="pt-3 pb-1 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-t border-slate-800/60 mt-2">
                  Governance & Config
                </div>
              )}
              <Link
                href={item.href}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 relative ${
                  active
                    ? 'bg-slate-800/90 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700/50 border border-transparent'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Active Indicator Bar */}
                {active && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate tracking-wide">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none tracking-tight ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Hospital SOC Status Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0a0f1d]/60">
        {!isCollapsed ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SOC Pipeline
              </span>
              <span className="font-mono text-emerald-400 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
              <span>HIPAA Sentinel</span>
              <span className="text-cyan-400">Enforced</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="SOC Pipeline Active">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          </div>
        )}
      </div>
    </aside>
  );
}
