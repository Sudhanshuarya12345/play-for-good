import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const defaultForm = {
  fullName: "",
  email: "",
  password: "",
  charityPercent: 10
};

function normalizeSignupError(message) {
  const value = String(message || "").trim();

  if (!value) {
    return "Unable to sign up right now. Please try again.";
  }

  if (value.toLowerCase().includes("invalid signup payload")) {
    return "Please check your details: valid email, full name (2+ chars), password (8+ chars), and charity contribution between 10% and 40%.";
  }

  if (value.toLowerCase().includes("already registered") || value.toLowerCase().includes("already exists")) {
    return "This email is already registered. Please log in instead.";
  }

  return value;
}

function validateSignupForm(form) {
  const fullName = String(form.fullName || "").trim();
  const email = String(form.email || "").trim();
  const password = String(form.password || "");
  const charityPercent = Number(form.charityPercent);

  if (fullName.length < 2) {
    return "Please enter your full name (minimum 2 characters).";
  }

  if (!email || !email.includes("@")) {
    return "Please enter a valid email address.";
  }

  if (password.length < 8) {
    return "Please use a password with at least 8 characters.";
  }

  if (!Number.isFinite(charityPercent) || charityPercent < 10 || charityPercent > 40) {
    return "Please choose charity contribution between 10% and 40%.";
  }

  return "";
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    const validationMessage = validateSignupForm(form);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);

    try {
      await signup(form);
      navigate("/auth/login", { replace: true });
    } catch (submitError) {
      setError(normalizeSignupError(submitError.message || "Unable to sign up"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl items-center px-6">
      <form className="glass w-full rounded-2xl p-6" onSubmit={onSubmit}>
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="mt-2 text-sm text-slate-300">Start your journey by joining PlayForGood.</p>

        <label className="mt-5 block text-sm">Full Name</label>
        <input
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={form.fullName}
          onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          minLength={2}
          required
        />

        <label className="mt-4 block text-sm">Email</label>
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />

        <label className="mt-4 block text-sm">Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          minLength={8}
          required
        />

        <label className="mt-4 block text-sm">Charity Contribution %</label>
        <input
          type="number"
          min={10}
          max={40}
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={form.charityPercent}
          onChange={(event) => setForm((prev) => ({ ...prev, charityPercent: Number(event.target.value) }))}
          required
        />

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black disabled:opacity-50">
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="mt-4 text-sm text-slate-300">
          Already have an account? <Link to="/auth/login" className="text-neonSoft">Login</Link>
        </p>
      </form>
    </main>
  );
}
