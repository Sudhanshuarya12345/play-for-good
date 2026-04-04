import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/routes/ProtectedRoute";
import AdminRoute from "./components/routes/AdminRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import CharitiesPage from "./pages/charities/CharitiesPage";
import CharityDetailPage from "./pages/charities/CharityDetailPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ScoresPage from "./pages/dashboard/ScoresPage";
import SubscriptionPage from "./pages/dashboard/SubscriptionPage";
import CharityPreferencePage from "./pages/dashboard/CharityPreferencePage";
import DonationsPage from "./pages/dashboard/DonationsPage";
import WinningsPage from "./pages/dashboard/WinningsPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminDrawPage from "./pages/admin/AdminDrawPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminCharitiesPage from "./pages/admin/AdminCharitiesPage";
import AdminWinningsPage from "./pages/admin/AdminWinningsPage";

function Header() {
  const { isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4 md:px-10">
      <Link to="/" className="rounded-lg border border-cyan-200/30 px-3 py-2 text-sm font-semibold">
        PlayForGood
      </Link>
      <Link to="/charities" className="rounded-lg px-3 py-2 text-sm hover:bg-cyan-100/10">
        Charities
      </Link>

      {isAuthenticated ? (
        <>
          <Link to="/dashboard" className="rounded-lg px-3 py-2 text-sm hover:bg-cyan-100/10">
            Dashboard
          </Link>
          {isAdmin ? (
            <Link to="/admin" className="rounded-lg px-3 py-2 text-sm hover:bg-cyan-100/10">
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="ml-auto rounded-lg border border-cyan-200/30 px-3 py-2 text-sm"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/auth/login" className="ml-auto rounded-lg px-3 py-2 text-sm hover:bg-cyan-100/10">
            Login
          </Link>
          <Link to="/auth/signup" className="rounded-lg bg-neon px-3 py-2 text-sm font-semibold text-black">
            Sign Up
          </Link>
        </>
      )}
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/charities" element={<CharitiesPage />} />
        <Route path="/charities/:slug" element={<CharityDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/scores" element={<ScoresPage />} />
          <Route path="/dashboard/subscription" element={<SubscriptionPage />} />
          <Route path="/dashboard/charity" element={<CharityPreferencePage />} />
          <Route path="/dashboard/donations" element={<DonationsPage />} />
          <Route path="/dashboard/winnings" element={<WinningsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/draw" element={<AdminDrawPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/charities" element={<AdminCharitiesPage />} />
          <Route path="/admin/winnings" element={<AdminWinningsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
