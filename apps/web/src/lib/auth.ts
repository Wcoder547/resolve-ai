import type { AuthTokens, AuthUser, AuthOrganization } from "@/types/auth";

const ACCESS_TOKEN_KEY = "resolveai_access_token";
const REFRESH_TOKEN_KEY = "resolveai_refresh_token";
const USER_KEY = "resolveai_user";
const ORG_KEY = "resolveai_organization";
const PERSIST_KEY = "resolveai_persist_session";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  const persist = localStorage.getItem(PERSIST_KEY);
  // Default to localStorage for existing sessions; sessionStorage when remember is off
  if (persist === "0") return sessionStorage;
  return localStorage;
}

function bothStorages(): Storage[] {
  if (typeof window === "undefined") return [];
  return [localStorage, sessionStorage];
}

export function saveTokens(tokens: AuthTokens, remember = true) {
  if (typeof window === "undefined") return;

  localStorage.setItem(PERSIST_KEY, remember ? "1" : "0");
  // Clear the other store so tokens don't leak across persistence modes
  for (const store of bothStorages()) {
    store.removeItem(ACCESS_TOKEN_KEY);
    store.removeItem(REFRESH_TOKEN_KEY);
  }

  const store = storage();
  store?.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  store?.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ??
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  for (const store of bothStorages()) {
    store.removeItem(ACCESS_TOKEN_KEY);
    store.removeItem(REFRESH_TOKEN_KEY);
  }
  localStorage.removeItem(PERSIST_KEY);
}

export function saveUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  const store = storage() ?? localStorage;
  // Mirror user into the active persistence store only
  for (const s of bothStorages()) s.removeItem(USER_KEY);
  store.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveOrganization(organization: AuthOrganization | null) {
  if (typeof window === "undefined") return;
  for (const s of bothStorages()) s.removeItem(ORG_KEY);
  if (!organization) return;
  const store = storage() ?? localStorage;
  store.setItem(ORG_KEY, JSON.stringify(organization));
}

export function getOrganization(): AuthOrganization | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ORG_KEY) ?? sessionStorage.getItem(ORG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthOrganization;
  } catch {
    return null;
  }
}

export function clearUser() {
  if (typeof window === "undefined") return;
  for (const store of bothStorages()) {
    store.removeItem(USER_KEY);
    store.removeItem(ORG_KEY);
  }
}

export function clearSession() {
  clearTokens();
  clearUser();
}
