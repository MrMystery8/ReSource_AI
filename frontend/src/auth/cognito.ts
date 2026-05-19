export type AuthMode = 'legacy' | 'cognito';
export type CognitoProvider = 'Google' | 'SignInWithApple';
export interface StartCognitoLoginOptions {
  provider?: CognitoProvider;
  loginHint?: string;
  screenHint?: 'signup';
}

const authModeEnv = (import.meta.env.VITE_AUTH_MODE ?? 'legacy').toLowerCase();
export const AUTH_MODE: AuthMode = authModeEnv === 'cognito' ? 'cognito' : 'legacy';

const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/$/, '');
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID ?? '';
const COGNITO_REDIRECT_SIGN_IN_ENV = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN ?? '';
const COGNITO_REDIRECT_SIGN_OUT_ENV = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT ?? '';

const PKCE_VERIFIER_KEY = 'resource_ai_cognito_pkce_verifier';
const PKCE_STATE_KEY = 'resource_ai_cognito_state';
const RETURN_TO_KEY = 'resource_ai_cognito_return_to';

function getBrowserOrigin(): string | null {
  if (typeof window === 'undefined' || !window.location?.origin) return null;
  return window.location.origin;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}

function resolveSignInRedirectUri(): string {
  const origin = getBrowserOrigin();
  if (!origin) return COGNITO_REDIRECT_SIGN_IN_ENV;

  const dynamic = `${origin}/auth/callback`;
  if (!COGNITO_REDIRECT_SIGN_IN_ENV) return dynamic;

  if (isLocalhostUrl(COGNITO_REDIRECT_SIGN_IN_ENV) && !isLocalhostUrl(origin)) {
    return dynamic;
  }

  return COGNITO_REDIRECT_SIGN_IN_ENV;
}

function resolveSignOutRedirectUri(): string {
  const origin = getBrowserOrigin();
  if (!origin) return COGNITO_REDIRECT_SIGN_OUT_ENV;

  const dynamic = `${origin}/login`;
  if (!COGNITO_REDIRECT_SIGN_OUT_ENV) return dynamic;

  if (isLocalhostUrl(COGNITO_REDIRECT_SIGN_OUT_ENV) && !isLocalhostUrl(origin)) {
    return dynamic;
  }

  return COGNITO_REDIRECT_SIGN_OUT_ENV;
}

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
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID || !resolveSignInRedirectUri()) {
    throw new Error(
      'Cognito is enabled but missing configuration. Set VITE_COGNITO_DOMAIN, VITE_COGNITO_APP_CLIENT_ID, and VITE_COGNITO_REDIRECT_SIGN_IN.'
    );
  }
}

export function isCognitoConfigured(): boolean {
  return Boolean(COGNITO_DOMAIN && COGNITO_CLIENT_ID && resolveSignInRedirectUri());
}

export async function startCognitoLogin(
  returnTo: string,
  options?: StartCognitoLoginOptions
): Promise<void> {
  assertCognitoConfigured();
  const redirectSignIn = resolveSignInRedirectUri();

  const verifier = randomString(96);
  const state = randomString(32);
  const challenge = await generatePkceChallenge(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
  sessionStorage.setItem(RETURN_TO_KEY, returnTo || '/triage');

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectSignIn,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });

  if (options?.provider) {
    params.set('identity_provider', options.provider);
  }

  if (options?.loginHint) {
    const trimmed = options.loginHint.trim();
    if (trimmed) {
      params.set('login_hint', trimmed);
    }
  }

  if (options?.screenHint) {
    params.set('screen_hint', options.screenHint);
  }

  window.location.assign(`${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`);
}

export async function exchangeCognitoCodeForToken(
  code: string,
  state: string | null
): Promise<{ token: string; returnTo: string }> {
  assertCognitoConfigured();
  const redirectSignIn = resolveSignInRedirectUri();

  const storedVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const storedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/triage';

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
    redirect_uri: redirectSignIn,
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
  const redirectSignOut = resolveSignOutRedirectUri();
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID || !redirectSignOut) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: redirectSignOut,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}
