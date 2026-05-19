import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserProfile, LoginResponse } from '@resource-ai/shared';
import {
  AUTH_MODE,
  type AuthMode,
  type CognitoProvider,
  buildCognitoLogoutUrl,
  exchangeCognitoCodeForToken,
  startCognitoLogin,
} from '../auth/cognito';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const TOKEN_KEY = 'resource_ai_token';

export interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  authMode: AuthMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithProvider: (provider?: CognitoProvider, returnTo?: string) => Promise<void>;
  completeCognitoCallback: (code: string, state: string | null) => Promise<string>;
  logout: () => void;
  updateProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Token expired or invalid');
  }

  return response.json() as Promise<UserProfile>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearAuth();

    if (AUTH_MODE === 'cognito') {
      const cognitoLogout = buildCognitoLogoutUrl();
      if (cognitoLogout) {
        window.location.assign(cognitoLogout);
        return;
      }
    }

    window.location.href = '/login';
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
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    fetchProfile(storedToken)
      .then((profile) => {
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

  const loginWithProvider = useCallback(
    async (provider?: CognitoProvider, returnTo: string = '/') => {
      if (AUTH_MODE !== 'cognito') {
        throw new Error('Social sign-in is only available when VITE_AUTH_MODE=cognito.');
      }
      await startCognitoLogin(returnTo, { provider });
    },
    []
  );

  const completeCognitoCallback = useCallback(async (code: string, state: string | null) => {
    if (AUTH_MODE !== 'cognito') {
      throw new Error('Cognito callback is not available in legacy auth mode.');
    }

    const { token: exchangedToken, returnTo } = await exchangeCognitoCodeForToken(code, state);
    const profile = await fetchProfile(exchangedToken);

    localStorage.setItem(TOKEN_KEY, exchangedToken);
    setToken(exchangedToken);
    setUser(profile);

    return returnTo;
  }, []);

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
    authMode: AUTH_MODE,
    isAuthenticated,
    isLoading,
    login,
    register,
    loginWithProvider,
    completeCognitoCallback,
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
