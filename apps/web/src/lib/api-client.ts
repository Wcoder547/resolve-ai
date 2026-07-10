const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("resolveai_access_token") ||
    localStorage.getItem("token")
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = options.token ?? getStoredAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      "Request failed. Please try again.";

    throw new Error(message);
  }

  return data as T;
}