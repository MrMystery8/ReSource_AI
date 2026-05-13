import type {
  CreateSessionRequest,
  CreateSessionResponse,
  PollSessionResponse,
  ErrorResponse,
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  UserProfile,
  ProfileUpdateRequest,
  UserStatsResponse,
  LeaderboardResponse,
  UserSessionsResponse,
  UsersListResponse,
  SessionsListResponse,
  UserRole,
  UploadFileResponse,
} from '@resource-ai/shared';

/**
 * Class-based API client that handles auth headers, API key inclusion,
 * and 401 expiry detection for all requests.
 */
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private getToken: () => string | null;

  constructor(baseUrl: string, apiKey: string, getToken: () => string | null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.getToken = getToken;
  }

  /**
   * Central fetch wrapper that:
   * - Includes x-api-key on all requests
   * - Includes Authorization: Bearer <token> when a token is available
   * - Dispatches 'auth:expired' event on 401 responses
   */
  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:expired'));
    }

    return response;
  }

  /**
   * Helper to parse JSON response and throw on non-OK status.
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const errorBody: ErrorResponse = await response.json();
        message = errorBody.error.message;
      } catch {
        // Could not parse error body
      }
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }

  // ─── Auth Endpoints (no JWT needed, but x-api-key still included) ───

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.parseResponse<LoginResponse>(response);
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.parseResponse<LoginResponse>(response);
  }

  // ─── Protected Endpoints ───

  async getProfile(): Promise<UserProfile> {
    const response = await this.request('/auth/profile', {
      method: 'GET',
    });
    return this.parseResponse<UserProfile>(response);
  }

  async updateProfile(data: ProfileUpdateRequest): Promise<UserProfile> {
    const response = await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return this.parseResponse<UserProfile>(response);
  }

  async getStats(): Promise<UserStatsResponse> {
    const response = await this.request('/auth/stats', {
      method: 'GET',
    });
    return this.parseResponse<UserStatsResponse>(response);
  }

  async getLeaderboard(): Promise<LeaderboardResponse> {
    const response = await this.request('/leaderboard', {
      method: 'GET',
    });
    return this.parseResponse<LeaderboardResponse>(response);
  }

  async getUserSessions(limit?: number, offset?: number): Promise<UserSessionsResponse> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const query = params.toString();
    const path = `/sessions${query ? `?${query}` : ''}`;

    const response = await this.request(path, {
      method: 'GET',
    });
    return this.parseResponse<UserSessionsResponse>(response);
  }

  async getSession(sessionId: string): Promise<PollSessionResponse> {
    const response = await this.request(`/sessions/${sessionId}`, {
      method: 'GET',
    });
    return this.parseResponse<PollSessionResponse>(response);
  }

  // ─── Triage Session Endpoints (existing functionality) ───

  async submitSession(data: CreateSessionRequest): Promise<string> {
    const response = await this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await this.parseResponse<CreateSessionResponse>(response);
    return result.sessionId;
  }

  async pollSession(sessionId: string): Promise<PollSessionResponse> {
    return this.getSession(sessionId);
  }

  async uploadEvidenceFile(
    fileBase64: string,
    contentType: string,
    fileName: string,
    sessionId?: string
  ): Promise<UploadFileResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }

    const response = await this.request('/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file: fileBase64,
        contentType,
        fileName,
      }),
    });
    return this.parseResponse<UploadFileResponse>(response);
  }

  // ─── Admin Endpoints ───

  async getAdminUsers(limit?: number, offset?: number): Promise<UsersListResponse> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const query = params.toString();
    const path = `/admin/users${query ? `?${query}` : ''}`;

    const response = await this.request(path, {
      method: 'GET',
    });
    return this.parseResponse<UsersListResponse>(response);
  }

  async updateUserRole(userId: string, role: UserRole): Promise<UserProfile> {
    const response = await this.request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return this.parseResponse<UserProfile>(response);
  }

  async getAdminSessions(limit?: number, offset?: number, userId?: string): Promise<SessionsListResponse> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    if (userId) params.set('userId', userId);
    const query = params.toString();
    const path = `/admin/sessions${query ? `?${query}` : ''}`;

    const response = await this.request(path, {
      method: 'GET',
    });
    return this.parseResponse<SessionsListResponse>(response);
  }
}

// ─── Default Instance & Legacy Compatibility ───

/**
 * Creates an ApiClient instance. Used by AuthContext to provide a configured client.
 */
export function createApiClient(
  baseUrl: string,
  apiKey: string,
  getToken: () => string | null
): ApiClient {
  return new ApiClient(baseUrl, apiKey, getToken);
}

/**
 * Legacy function exports for backward compatibility with useTriageSession hook.
 * These maintain the same signature as the original api.ts exports.
 */
export async function submitSession(
  apiUrl: string,
  apiKey: string,
  data: CreateSessionRequest
): Promise<string> {
  const client = new ApiClient(apiUrl, apiKey, () => null);
  return client.submitSession(data);
}

export async function pollSession(
  apiUrl: string,
  apiKey: string,
  sessionId: string
): Promise<PollSessionResponse> {
  const client = new ApiClient(apiUrl, apiKey, () => null);
  return client.pollSession(sessionId);
}
