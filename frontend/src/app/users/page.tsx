'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const res = await apiClient<any[]>('/users');
    if (res.success && res.data) {
      setUsers(res.data);
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    const res = await apiClient<any[]>('/roles');
    if (res.success && res.data) {
      setRoles(res.data);
      if (res.data.length > 0) {
        setSelectedRoleId(res.data[0].id);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchUsers();
      if (user.is_superuser) {
        fetchRoles();
      }
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    const orgId = user?.org_id || '6d7993dc-098d-48f1-8274-7e344aeb935d';
    const roleIds = selectedRoleId ? [selectedRoleId] : [];

    const res = await apiClient('/users', {
      method: 'POST',
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        org_id: orgId,
        role_ids: roleIds,
        is_active: true,
        mfa_enabled: false
      })
    });

    setSubmitting(false);

    if (res.success) {
      setInfo(`User ${email} created successfully. Verification email sent via SMTP.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setShowAddModal(false);
      fetchUsers();
    } else {
      setError(res.error || 'Failed to create user account.');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">User & RBAC Access Management</h1>
          <p className="text-xs text-slate-400">SOC Operator accounts, role assignments, and security permission boundaries</p>
        </div>

        {user?.is_superuser && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-md shadow flex items-center gap-1.5"
          >
            <span>+</span> Add User / Invite SOC Analyst
          </button>
        )}
      </div>

      {info && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
          {info}
        </div>
      )}
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
          {error}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Invite / Create New User (Super Admin)</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 uppercase font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@medsiem.org"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-medium mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="TemporaryP@ssword123!"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-medium mb-1">Role Assignment</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating User & Sending Email...' : 'Create & Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead className="bg-slate-950 uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Role</th>
              <th className="p-3">MFA Enabled</th>
              <th className="p-3">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {u.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{u.full_name}</td>
                  <td className="p-3 text-slate-300 font-mono">{u.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-rose-400 font-mono font-bold">
                      {u.is_superuser ? 'Super Admin' : (u.roles && u.roles[0] ? u.roles[0].name : 'SOC Analyst')}
                    </span>
                  </td>
                  <td className="p-3">{u.mfa_enabled ? 'Yes' : 'No'}</td>
                  <td className="p-3 text-slate-400">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

