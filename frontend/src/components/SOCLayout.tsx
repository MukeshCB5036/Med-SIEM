'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface SOCLayoutProps {
  children: React.ReactNode;
}

export default function SOCLayout({ children }: SOCLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Authentication pages render without the SOC chrome
  const isAuthPage = pathname === '/login' || pathname.startsWith('/verify-email');

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#070b14] text-slate-100">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex">
      {/* Persistent Left Sidebar */}
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      {/* Main Viewport Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'ml-18' : 'ml-64'
        }`}
      >
        <Header />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
