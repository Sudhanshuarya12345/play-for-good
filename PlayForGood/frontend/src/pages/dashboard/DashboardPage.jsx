import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [scores, setScores] = useState([]);
  const [winnings, setWinnings] = useState([]);
  const [participation, setParticipation] = useState({
    drawsEntered: 0,
    winsCount: 0,
    totalWonPaise: 0,
    pendingVerificationCount: 0,
    pendingPayoutCount: 0,
    lastEnteredDrawMonth: null,
    upcomingDrawMonth: null
  });
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setError("");

        const [subscriptionData, scoreData, winningData, participationData] = await Promise.all([
          apiRequest("/subscriptions/status", { method: "GET" }),
          apiRequest("/scores", { method: "GET" }).catch(() => ({ items: [] })),
          apiRequest("/winnings/me", { method: "GET" }).catch(() => ({ items: [] })),
          apiRequest("/user/participation-summary", { method: "GET" }).catch(() => null)
        ]);

        setSubscription(subscriptionData.latest || null);
        setScores(scoreData.items || []);
        setWinnings(winningData.items || []);

        if (participationData) {
          setParticipation({
            drawsEntered: participationData.drawsEntered || 0,
            winsCount: participationData.winsCount || 0,
            totalWonPaise: participationData.totalWonPaise || 0,
            pendingVerificationCount: participationData.pendingVerificationCount || 0,
            pendingPayoutCount: participationData.pendingPayoutCount || 0,
            lastEnteredDrawMonth: participationData.lastEnteredDrawMonth || null,
            upcomingDrawMonth: participationData.upcomingDrawMonth || null
          });
        }
      } catch (loadError) {
        setError(loadError.message || "Some dashboard widgets could not be loaded.");
      }
    })();
  }, []);

  const statusLabel = subscription?.status || "inactive";
  const renewalDate = subscription?.current_period_end ? formatDate(subscription.current_period_end) : "-";
  const totalWon = participation.totalWonPaise || winnings.reduce((sum, row) => sum + (row.gross_win_amount_paise || 0), 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-12">
      <h1 className="text-3xl font-bold">Subscriber Dashboard</h1>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Subscription</h2>
          <p className="mt-2 text-lg font-semibold">{statusLabel}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Renewal Date</h2>
          <p className="mt-2 text-lg font-semibold">{renewalDate}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Selected Charity</h2>
          <p className="mt-2 text-lg font-semibold">{profile?.selected_charity_id ? "Configured" : "Not Selected"}</p>
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
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Draws Entered</h2>
          <p className="mt-2 text-lg font-semibold">{participation.drawsEntered}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Upcoming Draw</h2>
          <p className="mt-2 text-lg font-semibold">{participation.upcomingDrawMonth || "-"}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Total Won</h2>
          <p className="mt-2 text-lg font-semibold">INR {(totalWon / 100).toFixed(2)}</p>
        </article>
        <article className="glass rounded-xl p-4">
          <h2 className="text-sm uppercase tracking-wider text-neonSoft">Pending Payouts</h2>
          <p className="mt-2 text-lg font-semibold">{participation.pendingPayoutCount}</p>
        </article>
      </section>

      <section className="mt-5 rounded-xl border border-cyan-200/20 bg-panel/40 p-4 text-sm text-slate-300">
        <p>
          Participation summary: entered {participation.drawsEntered} draw(s), won {participation.winsCount} time(s),
          last draw entered {participation.lastEnteredDrawMonth || "-"}.
        </p>
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
