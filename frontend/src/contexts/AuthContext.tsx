import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserProfile, LoginResponse } from '@resource-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const TOKEN_KEY = 'resource_ai_token';
const DEV_AUTH_BYPASS = import.meta.env.DEV;
const DEV_USER: UserProfile = {
  userId: 'local-dev-user',
  email: 'local@resource-ai.dev',
  displayName: 'Local Preview',
  role: 'user',
  createdAt: new Date(0).toISOString(),
};

export interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(DEV_AUTH_BYPASS ? DEV_USER : null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!DEV_AUTH_BYPASS);

  const isAuthenticated = DEV_AUTH_BYPASS ? true : !!user && !!token;

  const clearAuth = useCallback(() => {
    if (DEV_AUTH_BYPASS) {
      setToken(null);
      setUser(DEV_USER);
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    window.location.href = DEV_AUTH_BYPASS ? '/' : '/login';
  }, [clearAuth]);

  // Listen for auth:expired events dispatched by the API layer on 401 responses
  useEffect(() => {
    const handleExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => {
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, [logout]);

  // On mount: validate existing token by calling GET /auth/profile
  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      setIsLoading(false);
      setUser(DEV_USER);
      setToken(null);
      return;
    }

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        Authorization: `Bearer ${storedToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Token expired or invalid');
        }
        return res.json();
      })
      .then((profile: UserProfile) => {
        setUser(profile);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message =
        response.status === 401
          ? 'Invalid credentials'
          : errorBody?.error?.message ?? `Login failed (${response.status})`;
      throw new Error(message);
    }

    const data: LoginResponse = await response.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ email, password, displayName }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error?.message ?? `Registration failed (${response.status})`;
        throw new Error(message);
      }

      const data: LoginResponse = await response.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const updateProfile = useCallback(
    async (displayName: string) => {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName }),
      });

      if (response.status === 401) {
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error?.message ?? `Profile update failed (${response.status})`;
        throw new Error(message);
      }

      const updatedProfile: UserProfile = await response.json();
      setUser(updatedProfile);
    },
    [token]
  );

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
