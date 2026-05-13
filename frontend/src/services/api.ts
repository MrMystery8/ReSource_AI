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
  const url = `${apiUrl}/sessions`;
  console.log('[API] POST', url, data);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(data),
  });

  console.log('[API] POST response status:', response.status);

  if (!response.ok) {
    let message = `Submission failed (${response.status})`;
    try {
      const errorBody: ErrorResponse = await response.json();
      message = errorBody.error.message;
      console.error('[API] POST error body:', errorBody);
    } catch {
      console.error('[API] POST error - could not parse response body');
    }
    throw new Error(message);
  }

  const result: CreateSessionResponse = await response.json();
  console.log('[API] POST success, sessionId:', result.sessionId);
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
  const url = `${apiUrl}/sessions/${sessionId}`;
  console.log('[API] GET', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });

  console.log('[API] GET response status:', response.status);

  if (!response.ok) {
    let message = `Polling failed (${response.status})`;
    try {
      const errorBody: ErrorResponse = await response.json();
      message = errorBody.error.message;
      console.error('[API] GET error body:', errorBody);
    } catch {
      console.error('[API] GET error - could not parse response body');
    }
    throw new Error(message);
  }

  const result: PollSessionResponse = await response.json();
  console.log('[API] GET success:', {
    status: result.status,
    currentStage: result.currentStage,
    stagesWithData: Object.entries(result.stages)
      .filter(([, v]) => v != null)
      .map(([k]) => k),
  });
  return result;
}
