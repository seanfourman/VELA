const STORAGE_KEYS = {
  session: "vela:cognito:session",
  pkceVerifier: "vela:cognito:pkce_verifier",
  pkceState: "vela:cognito:pkce_state",
};

const DEFAULTS = {
  domain: "https://us-east-1wpltpxn8i.auth.us-east-1.amazoncognito.com",
  clientId: "60s12hrb2i7iapj56ag4lm7q6i",
  scopes: ["email", "openid"],
};

function normalizeDomain(domain) {
  if (!domain) return "";
  return String(domain).replace(/\/+$/, "");
}

export function getCognitoConfig() {
  const domain = normalizeDomain(
    import.meta.env.VITE_COGNITO_DOMAIN || DEFAULTS.domain
  );
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || DEFAULTS.clientId;

  const redirectUri =
    import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin;
  const logoutUri =
    import.meta.env.VITE_COGNITO_LOGOUT_URI || `${window.location.origin}/`;

  const scopesRaw = import.meta.env.VITE_COGNITO_SCOPES;
  const scopes = scopesRaw
    ? String(scopesRaw)
        .split(/[,\s]+/)
        .map((scope) => scope.trim())
        .filter(Boolean)
    : DEFAULTS.scopes;

  return {
    domain,
    clientId,
    redirectUri,
    logoutUri,
    scopes,
  };
}

function base64UrlEncodeArrayBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createRandomString(length) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  let result = "";
  for (const value of values) {
    result += alphabet[value % alphabet.length];
  }
  return result;
}

async function sha256(plainText) {
  const data = new TextEncoder().encode(plainText);
  return await crypto.subtle.digest("SHA-256", data);
}

async function createCodeChallenge(codeVerifier) {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncodeArrayBuffer(hashed);
}

export function decodeJwtPayload(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isSessionValid(session, { skewSeconds = 60 } = {}) {
  if (!session) return false;

  const expiresAtMs = session.expires_at;
  if (Number.isFinite(expiresAtMs)) {
    return Date.now() + skewSeconds * 1000 < expiresAtMs;
  }

  const payload = decodeJwtPayload(session.id_token);
  if (!payload?.exp) return false;

  return Date.now() / 1000 + skewSeconds < payload.exp;
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object") return null;

    return session;
  } catch {
    return null;
  }
}

function storeSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function clearPkceSession() {
  sessionStorage.removeItem(STORAGE_KEYS.pkceVerifier);
  sessionStorage.removeItem(STORAGE_KEYS.pkceState);
}

export function buildLoginUrl({ codeChallenge, state } = {}) {
  const { domain, clientId, redirectUri, scopes } = getCognitoConfig();
  const url = new URL(`${domain}/login`);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));

  if (state) {
    url.searchParams.set("state", state);
  }
  if (codeChallenge) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

export function buildLogoutUrl() {
  const { domain, clientId, logoutUri } = getCognitoConfig();
  const url = new URL(`${domain}/logout`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("logout_uri", logoutUri);
  return url.toString();
}

export async function beginLogin() {
  const codeVerifier = createRandomString(64);
  const state = createRandomString(32);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  sessionStorage.setItem(STORAGE_KEYS.pkceVerifier, codeVerifier);
  sessionStorage.setItem(STORAGE_KEYS.pkceState, state);

  const url = buildLoginUrl({ codeChallenge, state });
  window.location.assign(url);
}

async function exchangeAuthCodeForTokens({ code, codeVerifier }) {
  const { domain, clientId, redirectUri } = getCognitoConfig();
  const tokenUrl = `${domain}/oauth2/token`;

  const bodyParams = new URLSearchParams();
  bodyParams.set("grant_type", "authorization_code");
  bodyParams.set("client_id", clientId);
  bodyParams.set("code", code);
  bodyParams.set("redirect_uri", redirectUri);
  if (codeVerifier) {
    bodyParams.set("code_verifier", codeVerifier);
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data?.error_description ||
      data?.error ||
      `Token exchange failed (${response.status})`;
    throw new Error(message);
  }

  if (!data?.access_token || !data?.id_token) {
    throw new Error("Token exchange failed: missing tokens in response");
  }

  const expiresInSeconds = Number(data.expires_in);
  const expiresAtMs = Number.isFinite(expiresInSeconds)
    ? Date.now() + expiresInSeconds * 1000
    : null;

  return {
    ...data,
    expires_at: expiresAtMs,
    obtained_at: Date.now(),
  };
}

async function refreshSessionWithRefreshToken(refreshToken) {
  const { domain, clientId } = getCognitoConfig();
  const tokenUrl = `${domain}/oauth2/token`;

  const bodyParams = new URLSearchParams();
  bodyParams.set("grant_type", "refresh_token");
  bodyParams.set("client_id", clientId);
  bodyParams.set("refresh_token", refreshToken);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data?.error_description ||
      data?.error ||
      `Token refresh failed (${response.status})`;
    throw new Error(message);
  }

  const expiresInSeconds = Number(data?.expires_in);
  const expiresAtMs = Number.isFinite(expiresInSeconds)
    ? Date.now() + expiresInSeconds * 1000
    : null;

  return {
    ...data,
    refresh_token: data?.refresh_token || refreshToken,
    expires_at: expiresAtMs,
    obtained_at: Date.now(),
  };
}

function cleanAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  const paramsToRemove = ["code", "state", "error", "error_description", "iss"];

  let changed = false;
  for (const key of paramsToRemove) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (!changed) return;

  const newPath = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, newPath);
}

export async function completeLoginFromRedirect() {
  const url = new URL(window.location.href);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  if (error) {
    clearPkceSession();
    cleanAuthParamsFromUrl();
    return {
      status: "error",
      error: errorDescription || error,
    };
  }

  if (!code) {
    return { status: "no_redirect" };
  }

  const expectedState = sessionStorage.getItem(STORAGE_KEYS.pkceState);
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.pkceVerifier);

  if (expectedState && expectedState !== returnedState) {
    clearPkceSession();
    cleanAuthParamsFromUrl();
    return {
      status: "error",
      error: "Login state mismatch. Please try again.",
    };
  }

  try {
    const session = await exchangeAuthCodeForTokens({ code, codeVerifier });
    storeSession(session);
    return { status: "authenticated", session };
  } finally {
    clearPkceSession();
    cleanAuthParamsFromUrl();
  }
}

export async function ensureValidSession() {
  const session = getStoredSession();
  if (!session) return null;

  if (isSessionValid(session)) {
    return session;
  }

  if (!session.refresh_token) {
    clearStoredSession();
    return null;
  }

  try {
    const refreshed = await refreshSessionWithRefreshToken(
      session.refresh_token
    );
    const merged = { ...session, ...refreshed };
    storeSession(merged);
    return merged;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function signOutToCognito() {
  clearPkceSession();
  clearStoredSession();
  window.location.assign(buildLogoutUrl());
}
