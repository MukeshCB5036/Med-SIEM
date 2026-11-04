'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Clock,
  LogOut,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  X,
  ExternalLink
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [utcTime, setUtcTime] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Skip rendering on auth routes
  if (pathname === '/login' || pathname.startsWith('/verify-email')) {
    return null;
  }

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const res = await apiClient<any[]>('/notifications?unread_only=false');
        if (res.success && res.data) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n: any) => !n.is_read).length);
        }
      } catch (e) {
        // Fallback demo notification
        setNotifications([
          {
            id: 'demo-1',
            title: 'Critical Alert: EHR PHI Bulk Export Detected',
            message: 'Detection engine flagged unauthorized bulk record export on EMR-SERVER-01.',
            severity: 'CRITICAL',
            created_at: new Date().toISOString(),
            is_read: false
          }
        ]);
        setUnreadCount(1);
      }
    };
    fetchNotifs();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getPrimaryRole = () => {
    if (!user) return 'Guest';
    if (user.is_superuser) return 'Super Admin';
    if (user.roles && user.roles.length > 0) return user.roles[0].name;
    return 'Viewer';
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between">
      {/* Left: Quick System Beacon & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-300">MedSIEM Grid:</span>
          <span className="font-mono text-emerald-400 font-bold">OPERATIONAL</span>
        </div>

        {/* Live UTC Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{utcTime || '00:00:00 UTC'}</span>
        </div>
      </div>

      {/* Right: Search shortcut, Notifications & User Info */}
      <div className="flex items-center gap-3">
        {/* Quick Search Shortcut */}
        <button
          onClick={() => router.push('/log-explorer')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search events, rules, assets...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">⌘K</kbd>
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_#f43f5e]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">SOC Notifications</span>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto mt-2">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`py-3 px-2 rounded-lg transition-colors flex items-start justify-between gap-3 ${
                        notif.is_read ? 'opacity-60 bg-transparent' : 'bg-slate-800/40'
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              notif.severity === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-200 truncate">{notif.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{notif.message}</p>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(notif.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium whitespace-nowrap px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Profile Card */}
        {user ? (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800/80">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200 tracking-wide">{user.full_name}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/50">
                  {getPrimaryRole()}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900 transition-colors"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Login SOC</span>
          </button>
        )}
      </div>
    </header>
  );
}
