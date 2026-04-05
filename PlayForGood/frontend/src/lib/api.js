const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("playforgood_access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.success) {
    const isUnauthorized = response.status === 401;
    const isAuthEndpoint = String(path || "").startsWith("/auth/");

    if (isUnauthorized && !isAuthEndpoint && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("playforgood:auth-expired", {
          detail: {
            path,
            status: response.status
          }
        })
      );
    }

    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload.data;
}

export function getApiUrl() {
  return API_URL;
}
