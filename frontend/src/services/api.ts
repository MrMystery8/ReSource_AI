import type {
  CreateSessionRequest,
  CreateSessionResponse,
  PollSessionResponse,
  ErrorResponse,
} from '@resource-ai/shared';

/**
 * Submits a new triage session to the backend API.
 * POSTs to /sessions with the form data and returns the session ID.
 */
export async function submitSession(
  apiUrl: string,
  apiKey: string,
  data: CreateSessionRequest
): Promise<string> {
  const response = await fetch(`${apiUrl}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = `Submission failed (${response.status})`;
    try {
      const errorBody: ErrorResponse = await response.json();
      message = errorBody.error.message;
    } catch {
      // Use default message if response body isn't parseable
    }
    throw new Error(message);
  }

  const result: CreateSessionResponse = await response.json();
  return result.sessionId;
}

/**
 * Polls the session status from the backend API.
 * GETs /sessions/{sessionId} and returns the current session state.
 */
export async function pollSession(
  apiUrl: string,
  apiKey: string,
  sessionId: string
): Promise<PollSessionResponse> {
  const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    let message = `Polling failed (${response.status})`;
    try {
      const errorBody: ErrorResponse = await response.json();
      message = errorBody.error.message;
    } catch {
      // Use default message if response body isn't parseable
    }
    throw new Error(message);
  }

  const result: PollSessionResponse = await response.json();
  return result;
}
