import type { AuthTokens, AuthUser, AuthOrganization } from "@/types/auth";

const ACCESS_TOKEN_KEY = "resolveai_access_token";
const REFRESH_TOKEN_KEY = "resolveai_refresh_token";
const USER_KEY = "resolveai_user";
const ORG_KEY = "resolveai_organization";

export function saveTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return;

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function saveUser(user: AuthUser) {
  if (typeof window === "undefined") return;

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveOrganization(organization: AuthOrganization | null) {
  if (typeof window === "undefined") return;

  if (!organization) {
    localStorage.removeItem(ORG_KEY);
    return;
  }
  localStorage.setItem(ORG_KEY, JSON.stringify(organization));
}

export function getOrganization(): AuthOrganization | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(ORG_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthOrganization;
  } catch {
    return null;
  }
}

export function clearUser() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
}

export function clearSession() {
  clearTokens();
  clearUser();
}