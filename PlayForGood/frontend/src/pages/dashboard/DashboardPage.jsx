import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import UserIdentityCard from "../../components/dashboard/UserIdentityCard";

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const MotionDiv = motion.div;
const MotionSection = motion.section;
const MotionArticle = motion.article;

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [scores, setScores] = useState([]);
  const [winnings, setWinnings] = useState([]);
  const [participation, setParticipation] = useState({
    drawsEntered: 0, winsCount: 0, totalWonPaise: 0,
    pendingVerificationCount: 0, pendingPayoutCount: 0,
    lastEnteredDrawMonth: null, upcomingDrawMonth: null
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

  const statCards = [
    { label: "Subscription", value: statusLabel, highlight: statusLabel === "active" },
    { label: "Renewal Date", value: renewalDate },
    { label: "Selected Charity", value: profile?.selected_charity_id ? "Configured" : "Not Selected" },
    { label: "Charity %", value: `${profile?.charity_percent || 10}%` },
    { label: "Stored Scores", value: scores.length },
    { label: "Draws Entered", value: participation.drawsEntered },
    { label: "Upcoming Draw", value: participation.upcomingDrawMonth || "-" },
    { label: "Total Won", value: `INR ${(totalWon / 100).toFixed(2)}`, highlight: totalWon > 0 },
    { label: "Pending Payouts", value: participation.pendingPayoutCount }
  ];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-12 md:px-12 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[50%] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />

      <MotionDiv initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neon to-accent drop-shadow-sm">
          Subscriber Dashboard
        </h1>
        {error && <p className="mt-3 text-sm text-danger bg-danger/10 p-3 rounded-lg border border-danger/20">{error}</p>}
      </MotionDiv>

      <MotionSection
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="mt-6"
      >
        <UserIdentityCard
          profile={profile}
          user={user}
          context="subscriber"
          subscriptionStatus={subscription?.status || "inactive"}
        />
      </MotionSection>

      <MotionSection 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="mt-10 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {statCards.map((stat, idx) => (
          <MotionArticle 
            key={idx} 
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-5 shadow-lg transition-colors
              ${stat.highlight ? 'border-neon/40 bg-neon/5 shadow-neon/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{stat.label}</h2>
            <p className={`mt-3 text-2xl font-bold tracking-tight ${stat.highlight ? 'text-neon' : 'text-white'}`}>
              {stat.value}
            </p>
          </MotionArticle>
        ))}
      </MotionSection>

      <MotionSection 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 rounded-2xl border border-accent/20 bg-accent/5 backdrop-blur-md p-6 text-sm text-slate-300 shadow-xl"
      >
        <p className="flex items-center gap-3">
          <span className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">ℹ</span>
          <span>Participation summary: entered <strong className="text-white">{participation.drawsEntered}</strong> draw(s), won <strong className="text-white">{participation.winsCount}</strong> time(s), last draw entered <strong className="text-white">{participation.lastEnteredDrawMonth || "Never"}</strong>.</span>
        </p>
      </MotionSection>

      <MotionSection 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="mt-10 flex flex-wrap gap-4"
      >
        <MotionDiv variants={itemVariants}>
          <Link to="/dashboard/scores" className="inline-flex rounded-xl bg-neon hover:bg-neon/90 hover:scale-105 transition-all text-black px-6 py-3 text-sm font-bold shadow-[0_0_20px_rgba(30,167,255,0.4)]">
            Manage Scores
          </Link>
        </MotionDiv>
        
        {[
          { label: "Subscription", path: "/dashboard/subscription" },
          { label: "Charity Preference", path: "/dashboard/charity" },
          { label: "Donations", path: "/dashboard/donations" },
          { label: "Winnings", path: "/dashboard/winnings" }
        ].map((btn, idx) => (
          <MotionDiv variants={itemVariants} key={idx}>
            <Link to={btn.path} className="inline-flex rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm px-6 py-3 text-sm transition-all focus:ring-2 focus:ring-neon/50">
              {btn.label}
            </Link>
          </MotionDiv>
        ))}
      </MotionSection>
    </main>
  );
}
