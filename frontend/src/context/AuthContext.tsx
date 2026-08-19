'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface UserProfile {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
  roles: Array<{ name: string; permissions: Array<{ name: string }> }>;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const res = await apiClient<UserProfile>('/auth/me');
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('medsiem_access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('medsiem_access_token', accessToken);
    localStorage.setItem('medsiem_refresh_token', refreshToken);
    await fetchProfile();
  };

  const logout = () => {
    localStorage.removeItem('medsiem_access_token');
    localStorage.removeItem('medsiem_refresh_token');
    setUser(null);
  };

  const hasPermission = (permissionName: string): boolean => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return user.roles.some(role =>
      role.permissions.some(perm => perm.name === permissionName)
    );
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
