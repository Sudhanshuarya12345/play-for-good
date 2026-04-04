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
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

export function getApiUrl() {
  return API_URL;
}
