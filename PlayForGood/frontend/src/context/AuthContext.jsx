import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    function handleAuthExpired() {
      localStorage.removeItem("playforgood_access_token");
      setUser(null);
      setProfile(null);
      setLoading(false);

      const currentPath = `${location.pathname}${location.search || ""}`;
      if (location.pathname === "/auth/login") {
        return;
      }

      navigate("/auth/login", {
        replace: true,
        state: { from: currentPath }
      });
    }

    window.addEventListener("playforgood:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("playforgood:auth-expired", handleAuthExpired);
    };
  }, [location.pathname, location.search, navigate]);

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
