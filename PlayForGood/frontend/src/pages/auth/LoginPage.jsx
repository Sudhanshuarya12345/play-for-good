import { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function normalizeLoginError(message) {
  const value = String(message || "").trim();

  if (!value) {
    return "Unable to login right now. Please try again.";
  }

  if (value.toLowerCase().includes("invalid login payload")) {
    return "Please enter a valid email and password (minimum 8 characters).";
  }

  return value;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Please enter a password with at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      const target = location.state?.from || "/dashboard";
      navigate(target, { replace: true });
    } catch (submitError) {
      setError(normalizeLoginError(submitError.message || "Unable to login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl items-center px-6">
      <form className="glass w-full rounded-2xl p-6" onSubmit={onSubmit}>
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-300">Sign in to manage your subscription, scores, and winnings.</p>

        <label className="mt-5 block text-sm">Email</label>
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label className="mt-4 block text-sm">Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black disabled:opacity-50">
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="mt-4 text-sm text-slate-300">
          New here? <Link to="/auth/signup" className="text-neonSoft">Create account</Link>
        </p>
      </form>
    </main>
  );
}
