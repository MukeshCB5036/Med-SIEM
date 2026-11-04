'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import DataTable, { Column } from '@/components/DataTable';
import SearchFilterBar from '@/components/SearchFilterBar';
import DetailPanel from '@/components/DetailPanel';
import { apiClient } from '@/lib/api';
import {
  Users,
  Shield,
  KeyRound,
  FileText,
  UserPlus,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  is_locked: boolean;
  last_login_at?: string;
  roles: Array<{ name: string }>;
}

interface AuditLogItem {
  id: string;
  user_email?: string;
  user_full_name?: string;
  action: string;
  ip_address?: string;
  details?: string;
  created_at: string;
}

export default function AdministrationPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        apiClient<UserItem[]>('/users'),
        apiClient<{ items: AuditLogItem[] }>('/audit-logs?page=1&page_size=50')
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setAuditLogs(logsRes.data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const userColumns: Column<UserItem>[] = [
    {
      key: 'user',
      header: 'Identity / Email',
      sortable: true,
      render: item => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-100">{item.full_name}</span>
          <span className="font-mono text-cyan-400 text-[11px]">{item.email}</span>
        </div>
      )
    },
    {
      key: 'roles',
      header: 'RBAC Role',
      render: item => {
        const roleName = item.is_superuser
          ? 'Super Admin'
          : item.roles && item.roles.length > 0
          ? item.roles[0].name
          : 'Viewer';
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
            {roleName}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Account State',
      render: item => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
            item.is_locked
              ? 'bg-rose-950/40 text-rose-400 border-rose-500/30'
              : item.is_active
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {item.is_locked ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
          {item.is_locked ? 'LOCKED (5 FAILS)' : item.is_active ? 'ACTIVE' : 'DISABLED'}
        </span>
      )
    },
    {
      key: 'last_login',
      header: 'Last Authenticated (UTC)',
      sortable: true,
      render: item => (
        <span className="font-mono text-xs text-slate-400">
          {item.last_login_at ? new Date(item.last_login_at).toLocaleString() : 'Never logged in'}
        </span>
      )
    }
  ];

  const auditColumns: Column<AuditLogItem>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: item => (
        <span className="font-mono text-xs text-slate-300">
          {new Date(item.created_at).toLocaleString()}
        </span>
      )
    },
    {
      key: 'action',
      header: 'Action / Event',
      sortable: true,
      render: item => (
        <span
          className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
            item.action === 'LOGIN_SUCCESS'
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              : item.action === 'LOGIN_FAILED'
              ? 'bg-rose-950/40 text-rose-400 border-rose-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {item.action}
        </span>
      )
    },
    {
      key: 'user',
      header: 'Operator / Subject',
      render: item => (
        <span className="font-mono text-xs text-cyan-400">
          {item.user_email || 'Unauthenticated'}
        </span>
      )
    },
    {
      key: 'ip',
      header: 'Client IP',
      render: item => (
        <span className="font-mono text-xs text-slate-400">
          {item.ip_address || '127.0.0.1'}
        </span>
      )
    },
    {
      key: 'details',
      header: 'Audit Rationale / Description',
      render: item => (
        <span className="text-slate-300 text-xs">
          {item.details || 'System authentication event'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Security Administration & Access Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage users, role-based access control (RBAC), and review immutable authentication audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & RBAC ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log Stream ({auditLogs.length})</span>
        </button>
      </div>

      {/* Content depending on tab */}
      {activeTab === 'users' ? (
        <div className="space-y-4">
          <DataTable
            columns={userColumns}
            data={users}
            keyExtractor={item => item.id}
            isLoading={isLoading}
            emptyTitle="No users found"
            emptyDescription="User accounts can be registered by administrators."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            keyExtractor={item => item.id}
            isLoading={isLoading}
            emptyTitle="No audit logs recorded"
            emptyDescription="Authentication and security actions will be logged here."
          />
        </div>
      )}
    </div>
  );
}
