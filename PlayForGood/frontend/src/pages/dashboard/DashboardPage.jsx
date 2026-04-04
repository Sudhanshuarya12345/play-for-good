import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [scores, setScores] = useState([]);
  const [winnings, setWinnings] = useState([]);

  useEffect(() => {
    void (async () => {
      try {
        const [subscription, scoreData, winningData] = await Promise.all([
          apiRequest("/subscriptions/status", { method: "GET" }),
          apiRequest("/scores", { method: "GET" }).catch(() => ({ items: [] })),
          apiRequest("/winnings/me", { method: "GET" }).catch(() => ({ items: [] }))
        ]);

        setSubscriptionStatus(subscription.latest?.status || "inactive");
        setScores(scoreData.items || []);
        setWinnings(winningData.items || []);
      } catch {
        // Dashboard should still render even if one of the optional widgets fails.
      }
    })();
  }, []);

  const totalWon = winnings.reduce((sum, row) => sum + (row.gross_win_amount_paise || 0), 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-12">
      <h1 className="text-3xl font-bold">Subscriber Dashboard</h1>

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Subscription</h2>
          <p className="mt-2 text-lg font-semibold">{subscriptionStatus}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Charity %</h2>
          <p className="mt-2 text-lg font-semibold">{profile?.charity_percent || 10}%</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Stored Scores</h2>
          <p className="mt-2 text-lg font-semibold">{scores.length}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Total Won</h2>
          <p className="mt-2 text-lg font-semibold">INR {(totalWon / 100).toFixed(2)}</p>
        </article>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <Link to="/dashboard/scores" className="rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black">Manage Scores</Link>
        <Link to="/dashboard/subscription" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">Subscription</Link>
        <Link to="/dashboard/charity" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">Charity Preference</Link>
        <Link to="/dashboard/donations" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">Donations</Link>
        <Link to="/dashboard/winnings" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm">Winnings</Link>
      </section>
    </main>
  );
}
