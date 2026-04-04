import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiRequest("/auth/me", { method: "GET" });
      setUser(data.user || null);
      setProfile(data.profile || null);
    } catch {
      setUser(null);
      setProfile(null);
      localStorage.removeItem("playforgood_access_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (data.accessToken) {
      localStorage.setItem("playforgood_access_token", data.accessToken);
    }

    await refreshAuth();
    return data;
  }, [refreshAuth]);

  const signup = useCallback(async (payload) => {
    return apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("/auth/logout", {
      method: "POST"
    });
    localStorage.removeItem("playforgood_access_token");
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: profile?.role === "admin",
      login,
      signup,
      logout,
      refreshAuth
    }),
    [user, profile, loading, login, signup, logout, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
