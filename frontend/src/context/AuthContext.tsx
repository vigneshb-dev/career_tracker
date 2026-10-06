import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole, AuthResponse, SignupPayload } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (payload: SignupPayload) => Promise<AuthResponse>;
  verifyOtp: (email: string, otp: string) => Promise<AuthResponse>;
  resendOtp: (email: string) => Promise<{ message: string; demo_otp?: string }>;
  forgotPassword: (email: string) => Promise<{ message: string; demo_otp?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAuthUser(rawUser: AuthUser | null): AuthUser | null {
  if (!rawUser) return null;
  const normalized = { ...rawUser };
  const role = (normalized.role || '').toUpperCase();
  if (role === 'TRAINEE') {
    const name = (normalized.full_name || '').toLowerCase();
    const email = (normalized.email || '').toLowerCase();
    if (name.includes('priya sharma') || email.includes('priya.sharma')) {
      normalized.trainee_id = 'TRN-2024-001';
    } else if (name.includes('rajesh kumar') || email.includes('rajesh.kumar')) {
      normalized.trainee_id = 'TRN-2024-002';
    } else if (name.includes('sneha patel') || email.includes('sneha.patel')) {
      normalized.trainee_id = 'TRN-2024-003';
    } else if (name.includes('karthik venkataraman') || email.includes('karthik.v')) {
      normalized.trainee_id = 'TRN-2024-004';
    }
  }
  return normalized;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('skilltrace_auth_user');
      return saved ? normalizeAuthUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('skilltrace_auth_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('skilltrace_auth_token');
      if (savedToken) {
        try {
          const freshUser = await api.getMe();
          const normalized = normalizeAuthUser(freshUser);
          setUser(normalized);
          localStorage.setItem('skilltrace_auth_user', JSON.stringify(normalized));
        } catch {
          // Token expired or invalid
          localStorage.removeItem('skilltrace_auth_token');
          localStorage.removeItem('skilltrace_auth_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (res: AuthResponse) => {
    if (res.token) {
      setToken(res.token);
      localStorage.setItem('skilltrace_auth_token', res.token);
    }
    if (res.user) {
      const normalized = normalizeAuthUser(res.user);
      setUser(normalized);
      localStorage.setItem('skilltrace_auth_user', JSON.stringify(normalized));
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.login(email, password);
    handleAuthSuccess(res);
    return res;
  };

  const signup = async (payload: SignupPayload): Promise<AuthResponse> => {
    const res = await api.signup(payload);
    handleAuthSuccess(res);
    return res;
  };

  const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    const res = await api.verifyOtp(email, otp);
    handleAuthSuccess(res);
    return res;
  };

  const resendOtp = async (email: string) => {
    return await api.resendOtp(email);
  };

  const forgotPassword = async (email: string) => {
    return await api.forgotPassword(email);
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    return await api.resetPassword(email, otp, newPassword);
  };

  const logout = () => {
    api.logout().catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('skilltrace_auth_token');
    localStorage.removeItem('skilltrace_auth_user');
    localStorage.removeItem('skilltrace_auth'); // legacy
  };

  const refreshUser = async () => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      localStorage.setItem('skilltrace_auth_user', JSON.stringify(freshUser));
    } catch {
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    signup,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
