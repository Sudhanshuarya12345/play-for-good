import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest("/admin/reports/overview", { method: "GET" });
        setOverview(data);
      } catch (loadError) {
        setError(loadError.message || "Unable to load admin overview");
      }
    })();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-slate-300">Control users, draws, charity content, and payout lifecycle.</p>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Users</p>
          <p className="mt-2 text-2xl font-bold">{overview?.totalUsers || 0}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Active Subscribers</p>
          <p className="mt-2 text-2xl font-bold">{overview?.activeSubscribers || 0}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Draws</p>
          <p className="mt-2 text-2xl font-bold">{overview?.totalDraws || 0}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Prize Pool</p>
          <p className="mt-2 text-2xl font-bold">INR {((overview?.totalPrizePoolPaise || 0) / 100).toFixed(2)}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Charity Total</p>
          <p className="mt-2 text-2xl font-bold">INR {((overview?.totalCharityPaise || 0) / 100).toFixed(2)}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Paid Out</p>
          <p className="mt-2 text-2xl font-bold">INR {((overview?.totalPaidOutPaise || 0) / 100).toFixed(2)}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Pending Verification</p>
          <p className="mt-2 text-2xl font-bold">{overview?.pendingVerificationCount || 0}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Pending Payout</p>
          <p className="mt-2 text-2xl font-bold">{overview?.pendingPayoutCount || 0}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-neonSoft">Unsettled Jackpot</p>
          <p className="mt-2 text-2xl font-bold">INR {((overview?.unsettledRolloverPaise || 0) / 100).toFixed(2)}</p>
        </article>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <Link to="/admin/draw" className="rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black">
          Draw Management
        </Link>
        <Link to="/admin/users" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">
          User Management
        </Link>
        <Link to="/admin/charities" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">
          Charities
        </Link>
        <Link to="/admin/winnings" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">
          Winnings
        </Link>
      </section>
    </main>
  );
}
