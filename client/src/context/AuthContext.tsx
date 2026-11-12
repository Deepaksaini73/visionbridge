import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '@shared/types';
import { apiRequest, getAuthToken } from '@/services/api';

export type { UserRole };

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  registerUser: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    storeName?: string;
    phone?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  loginAsDemo: (role: UserRole) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Verified demo account defaults for instant fallback
const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; defaultUser: UserProfile }> = {
  ADMIN: {
    email: 'admin@visionbridge.org',
    pass: 'VisionBridgeAdmin2026!',
    defaultUser: {
      id: 'usr_admin_01',
      name: 'Dr. Vikram Malhotra',
      email: 'admin@visionbridge.org',
      role: 'ADMIN',
      phone: '+91 90000 00000',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  },
  STORE_OPERATOR: {
    email: 'operator@visionbridge.org',
    pass: 'OperatorPass123!',
    defaultUser: {
      id: 'usr_operator_01',
      name: 'Ramesh Patel',
      email: 'operator@visionbridge.org',
      role: 'STORE_OPERATOR',
      storeId: 'ST-AP-CHITTOOR-01',
      storeName: 'VisionPoint Chittoor Center',
      phone: '+91 98765 43210',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  },
  OPTOMETRIST: {
    email: 'dr.ananya@visionbridge.org',
    pass: 'OptometristPass123!',
    defaultUser: {
      id: 'usr_optometrist_01',
      name: 'Dr. Ananya Sharma, M.Optom',
      email: 'dr.ananya@visionbridge.org',
      role: 'OPTOMETRIST',
      licenseNumber: 'OPT-IN-2024-8841',
      phone: '+91 94455 66778',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('vb_current_user');
      const token = localStorage.getItem('vb_auth_token');
      if (saved && token && token.startsWith('eyJ')) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return DEMO_CREDENTIALS.STORE_OPERATOR.defaultUser;
  });

  const [token, setToken] = useState<string | null>(() => {
    const savedToken = getAuthToken();
    return savedToken && savedToken.startsWith('eyJ') ? savedToken : null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Helper to persist auth data to both localStorage and cookies
  const persistSession = (newToken: string | null, newUser: UserProfile | null) => {
    if (newToken && newUser) {
      localStorage.setItem('vb_auth_token', newToken);
      localStorage.setItem('vb_current_user', JSON.stringify(newUser));
      document.cookie = `vb_auth_token=${newToken}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `vb_user_role=${newUser.role}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `vb_user_name=${encodeURIComponent(newUser.name)}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      localStorage.removeItem('vb_auth_token');
      localStorage.removeItem('vb_current_user');
      document.cookie = 'vb_auth_token=; path=/; max-age=0;';
      document.cookie = 'vb_user_role=; path=/; max-age=0;';
      document.cookie = 'vb_user_name=; path=/; max-age=0;';
    }
  };

  // If token is missing on startup, auto-seed the demo session with a real signed JWT from backend
  useEffect(() => {
    const currentToken = getAuthToken();
    if (!currentToken || !currentToken.startsWith('eyJ')) {
      // Request initial real JWT for current active demo persona
      const initialRole = user?.role || 'STORE_OPERATOR';
      loginAsDemo(initialRole);
    }
  }, []);

  const refreshUser = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) return;
    try {
      const res = await apiRequest<UserProfile>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('vb_current_user', JSON.stringify(res.data));
      }
    } catch {
      // Quiet fallback
    }
  };

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ user: UserProfile; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (res.success && res.data?.token) {
        setUser(res.data.user);
        setToken(res.data.token);
        persistSession(res.data.token, res.data.user);
        setIsLoading(false);
        return { success: true, message: res.message || 'Signed in successfully' };
      } else {
        setIsLoading(false);
        return { success: false, message: res.error?.message || 'Invalid credentials' };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Network error during login' };
    }
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    storeName?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ user: UserProfile; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, role: 'STORE_OPERATOR' }),
      });

      if (res.success && res.data?.token) {
        setUser(res.data.user);
        setToken(res.data.token);
        persistSession(res.data.token, res.data.user);
        setIsLoading(false);
        return { success: true, message: res.message || 'Registration successful' };
      } else {
        setIsLoading(false);
        return { success: false, message: res.error?.message || 'Registration failed' };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Network error during registration' };
    }
  };

  const loginAsDemo = async (role: UserRole): Promise<boolean> => {
    const creds = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.STORE_OPERATOR;
    setUser(creds.defaultUser);

    try {
      const res = await apiRequest<{ user: UserProfile; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          demoRole: role,
          email: creds.email,
          password: creds.pass,
        }),
      });

      if (res.success && res.data?.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        persistSession(res.data.token, res.data.user);
        return true;
      }
    } catch (err) {
      console.warn('[Auth] Demo login backend request failed, using cached fallback:', err);
    }

    return false;
  };

  const logout = () => {
    apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setToken(null);
    persistSession(null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user && !!token,
        isLoading,
        token,
        login,
        registerUser,
        loginAsDemo,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
