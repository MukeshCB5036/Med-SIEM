import { create } from 'zustand';
import { UserProfile } from '../types';
import { tokenStorage } from '../services/api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  mfaToken: string | null;
  mfaRequired: boolean;
  emailVerificationRequired: boolean;
  
  setAuth: (token: string, user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  setMfaRequired: (mfaToken: string) => void;
  clearMfa: () => void;
  setEmailVerificationRequired: (val: boolean) => void;
  logout: () => void;
  
  hasPermission: (perm: string) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  mfaToken: null,
  mfaRequired: false,
  emailVerificationRequired: false,

  setAuth: (token: string, user: UserProfile) => {
    tokenStorage.setToken(token);
    set({
      token,
      user,
      isAuthenticated: true,
      mfaToken: null,
      mfaRequired: false,
      emailVerificationRequired: false
    });
  },

  setUser: (user: UserProfile) => {
    set({ user });
  },

  setMfaRequired: (mfaToken: string) => {
    set({ mfaToken, mfaRequired: true });
  },

  clearMfa: () => {
    set({ mfaToken: null, mfaRequired: false });
  },

  setEmailVerificationRequired: (val: boolean) => {
    set({ emailVerificationRequired: val });
  },

  logout: () => {
    tokenStorage.setToken('');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      mfaToken: null,
      mfaRequired: false,
      emailVerificationRequired: false
    });
  },

  hasPermission: (perm: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.is_superuser) return true;
    if (user.permissions && user.permissions.includes(perm)) return true;
    if (user.roles) {
      for (const role of user.roles) {
        if (role.permissions && role.permissions.some(p => p.name === perm)) {
          return true;
        }
      }
    }
    return false;
  },

  isSuperAdmin: () => {
    const { user } = get();
    return !!user?.is_superuser;
  }
}));
