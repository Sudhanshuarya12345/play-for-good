function getDisplayName(profile, user) {
  const fullName = String(profile?.full_name || "").trim();
  if (fullName) {
    return fullName;
  }

  const email = profile?.email || user?.email || "";
  if (!email || !email.includes("@")) {
    return "PlayForGood Member";
  }

  return email.split("@")[0];
}

function formatShortId(value) {
  if (!value) {
    return "-";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function UserIdentityCard({ profile, user, context = "subscriber" }) {
  const isAdmin = profile?.role === "admin";
  const accountTypeLabel = isAdmin ? "Admin" : "Subscriber";
  const dashboardLabel = context === "admin" ? "Admin Console" : "Subscriber Console";
  const displayName = getDisplayName(profile, user);
  const email = profile?.email || user?.email || "-";

  const toneClass =
    context === "admin"
      ? "border-neon/35 bg-neon/5 shadow-[0_16px_40px_rgba(30,167,255,0.14)]"
      : "border-cyan-200/25 bg-white/5 shadow-[0_16px_40px_rgba(6,12,24,0.35)]";

  const badgeClass = isAdmin
    ? "border-neon/40 bg-neon/15 text-neonSoft"
    : "border-emerald-300/25 bg-emerald-500/10 text-emerald-300";

  return (
    <section className={`glass rounded-2xl border p-5 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Logged-In Account</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{displayName}</h2>
          <p className="mt-1 text-sm text-slate-300">{email}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeClass}`}>
          {accountTypeLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Dashboard Access</p>
          <p className="mt-2 text-sm font-semibold text-white">{dashboardLabel}</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Charity Contribution</p>
          <p className="mt-2 text-sm font-semibold text-white">{Number(profile?.charity_percent || 10)}%</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Account ID</p>
          <p className="mt-2 text-sm font-semibold text-white">{formatShortId(profile?.id || user?.id)}</p>
        </article>
      </div>
    </section>
  );
}