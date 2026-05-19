export type AuthMode = 'legacy' | 'cognito';
export type CognitoProvider = 'Google' | 'SignInWithApple';

const authModeEnv = (import.meta.env.VITE_AUTH_MODE ?? 'legacy').toLowerCase();
export const AUTH_MODE: AuthMode = authModeEnv === 'cognito' ? 'cognito' : 'legacy';

const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/$/, '');
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID ?? '';
const COGNITO_REDIRECT_SIGN_IN = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN ?? '';
const COGNITO_REDIRECT_SIGN_OUT = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT ?? '';

const PKCE_VERIFIER_KEY = 'resource_ai_cognito_pkce_verifier';
const PKCE_STATE_KEY = 'resource_ai_cognito_state';
const RETURN_TO_KEY = 'resource_ai_cognito_return_to';

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64Url(digest);
}

function assertCognitoConfigured(): void {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID || !COGNITO_REDIRECT_SIGN_IN) {
    throw new Error(
      'Cognito is enabled but missing configuration. Set VITE_COGNITO_DOMAIN, VITE_COGNITO_APP_CLIENT_ID, and VITE_COGNITO_REDIRECT_SIGN_IN.'
    );
  }
}

export function isCognitoConfigured(): boolean {
  return Boolean(COGNITO_DOMAIN && COGNITO_CLIENT_ID && COGNITO_REDIRECT_SIGN_IN);
}

export async function startCognitoLogin(
  returnTo: string,
  provider?: CognitoProvider
): Promise<void> {
  assertCognitoConfigured();

  const verifier = randomString(96);
  const state = randomString(32);
  const challenge = await generatePkceChallenge(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
  sessionStorage.setItem(RETURN_TO_KEY, returnTo || '/');

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: COGNITO_REDIRECT_SIGN_IN,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });

  if (provider) {
    params.set('identity_provider', provider);
  }

  window.location.assign(`${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`);
}

export async function exchangeCognitoCodeForToken(
  code: string,
  state: string | null
): Promise<{ token: string; returnTo: string }> {
  assertCognitoConfigured();

  const storedVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const storedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/';

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);

  if (!storedVerifier || !storedState || !state || state !== storedState) {
    throw new Error('Invalid or missing Cognito PKCE state.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: COGNITO_REDIRECT_SIGN_IN,
    code_verifier: storedVerifier,
  });

  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Cognito authorization code (${response.status})`);
  }

  const payload = (await response.json()) as {
    id_token?: string;
    access_token?: string;
  };

  // ID token contains profile claims and works with User Pool authorizer.
  const token = payload.id_token ?? payload.access_token;
  if (!token) {
    throw new Error('Cognito token response did not include an ID or access token.');
  }

  return { token, returnTo };
}

export function buildCognitoLogoutUrl(): string | null {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID || !COGNITO_REDIRECT_SIGN_OUT) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: COGNITO_REDIRECT_SIGN_OUT,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}
