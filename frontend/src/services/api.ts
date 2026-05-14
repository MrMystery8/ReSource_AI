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
  StructuredUserContext,
  ImplementationGuide,
  ProjectsListResponse,
} from '@resource-ai/shared';

// ─── Guide API types ───

export interface GenerateGuideRequest {
  ideaTitle: string;
  ideaDescription: string;
  requiredComponents: string[];
  additionalMaterials: string[];
  userContext: StructuredUserContext;
  sessionId: string;
}

export interface GenerateGuideResponse {
  guide: ImplementationGuide;
  projectId: string;
}

// ─── Chat API types ───

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ProjectContext {
  ideaTitle: string;
  materials: string[];
  steps: string[];
  deviceInfo: string;
}

export interface SendChatMessageRequest {
  message: string;
  projectContext: ProjectContext;
  conversationHistory: ChatMessage[];
}

export interface SendChatMessageResponse {
  reply: string;
}

// ─── Project Submission API types ───

export interface GuideContext {
  ideaTitle: string;
  expectedOutcome: string;
  steps: string[];
}

export interface SubmitProjectRequest {
  projectId: string;
  photoFileIds: string[];
  guideContext: GuideContext;
}

export interface SubmitProjectResponse {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  points: number;
  feedback: string;
}

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

  private isProtectedPath(path: string): boolean {
    return (
      path === '/upload' ||
      path === '/leaderboard' ||
      path === '/auth/profile' ||
      path === '/auth/stats' ||
      path.startsWith('/sessions') ||
      path.startsWith('/admin')
    );
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
    } else if (response.status === 403 && token && this.isProtectedPath(path)) {
      // API Gateway authorizer denials surface as 403. Treat those like
      // expired/invalid auth so the app can recover via re-login.
      let shouldExpire = false;
      const contentType = response.headers.get('content-type') ?? '';

      if (!contentType.includes('application/json')) {
        shouldExpire = true;
      } else {
        try {
          const body = await response.clone().json() as
            | { message?: string }
            | ErrorResponse;
          const message =
            ('error' in body && body.error?.message) ||
            ('message' in body ? body.message : undefined);

          if (message === 'Forbidden' || message === 'Unauthorized') {
            shouldExpire = true;
          }
        } catch {
          shouldExpire = true;
        }
      }

      if (shouldExpire) {
        window.dispatchEvent(new Event('auth:expired'));
      }
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

  // ─── Guide Endpoints ───

  async generateGuide(
    data: GenerateGuideRequest,
    signal?: AbortSignal
  ): Promise<GenerateGuideResponse> {
    const response = await this.request('/guide/generate', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
    return this.parseResponse<GenerateGuideResponse>(response);
  }

  async sendChatMessage(
    data: SendChatMessageRequest,
    signal?: AbortSignal
  ): Promise<SendChatMessageResponse> {
    const response = await this.request('/guide/chat', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
    return this.parseResponse<SendChatMessageResponse>(response);
  }

  // ─── Project Submission Endpoints ───

  async submitProject(
    data: SubmitProjectRequest,
    signal?: AbortSignal
  ): Promise<SubmitProjectResponse> {
    const response = await this.request('/project/submit', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
    return this.parseResponse<SubmitProjectResponse>(response);
  }

  /**
   * Reloads Second Life Ideas by re-submitting the session with the same inputs.
   * The pipeline will regenerate all stages including secondLifeIdeas with fresh AI output.
   * Returns the new sessionId which can be polled for updated results.
   */
  async reloadIdeas(data: CreateSessionRequest): Promise<string> {
    const response = await this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await this.parseResponse<CreateSessionResponse>(response);
    return result.sessionId;
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

  // ─── Project Endpoints ───

  async getProjects(limit?: number, offset?: number): Promise<ProjectsListResponse> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const query = params.toString();
    const path = `/projects${query ? `?${query}` : ''}`;

    const response = await this.request(path, {
      method: 'GET',
    });
    return this.parseResponse<ProjectsListResponse>(response);
  }

  async updateProject(
    projectId: string,
    action: 'abandon' | 'delete'
  ): Promise<void> {
    const response = await this.request(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    await this.parseResponse<unknown>(response);
  }

  async getProject(projectId: string): Promise<import('@resource-ai/shared').Project> {
    const response = await this.request(`/projects/${projectId}`, {
      method: 'GET',
    });
    return this.parseResponse<import('@resource-ai/shared').Project>(response);
  }

  // ─── Community Endpoints ───

  async createCommunityPost(
    data: import('@resource-ai/shared').CreateCommunityPostRequest
  ): Promise<import('@resource-ai/shared').CreateCommunityPostResponse> {
    const response = await this.request('/community/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.parseResponse<import('@resource-ai/shared').CreateCommunityPostResponse>(response);
  }

  async getCommunityFeed(
    options?: { limit?: number; cursor?: string; cursorId?: string; sort?: 'recent' | 'top' }
  ): Promise<import('@resource-ai/shared').CommunityFeedResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.cursorId) params.set('cursorId', options.cursorId);
    if (options?.sort) params.set('sort', options.sort);
    const query = params.toString();
    const path = `/community/posts${query ? `?${query}` : ''}`;

    const response = await this.request(path, { method: 'GET' });
    return this.parseResponse<import('@resource-ai/shared').CommunityFeedResponse>(response);
  }

  async voteCommunityPost(
    postId: string,
    vote: import('@resource-ai/shared').VoteType
  ): Promise<import('@resource-ai/shared').VoteResponse> {
    const response = await this.request(`/community/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote }),
    });
    return this.parseResponse<import('@resource-ai/shared').VoteResponse>(response);
  }

  async getCommunityComments(
    postId: string
  ): Promise<import('@resource-ai/shared').CommentsListResponse> {
    const response = await this.request(`/community/posts/${postId}/comments`, {
      method: 'GET',
    });
    return this.parseResponse<import('@resource-ai/shared').CommentsListResponse>(response);
  }

  async createCommunityComment(
    postId: string,
    text: string
  ): Promise<import('@resource-ai/shared').CreateCommentResponse> {
    const response = await this.request(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return this.parseResponse<import('@resource-ai/shared').CreateCommentResponse>(response);
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
