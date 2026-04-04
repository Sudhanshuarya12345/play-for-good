import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Win Monthly",
    text: "Enter your last 5 Stableford scores and participate in monthly draw tiers."
  },
  {
    title: "Fund Change",
    text: "Choose a charity and allocate part of every subscription to meaningful causes."
  },
  {
    title: "Verified Payouts",
    text: "Transparent winner verification and payout tracking from pending to paid."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-12 lg:px-20">
      <section className="mx-auto max-w-6xl rounded-3xl border border-cyan-200/20 bg-[linear-gradient(120deg,rgba(30,167,255,0.18),rgba(23,214,146,0.08),rgba(255,176,32,0.08))] p-8 shadow-neon md:p-12">
        <p className="mb-4 inline-block rounded-full border border-cyan-200/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neonSoft">
          Digital Heroes x PlayForGood
        </p>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-ink md:text-5xl">
          Play Your Game. Power a Cause. Win Life-Changing Rewards.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
          A subscription platform where your golf performance helps fund charities while unlocking monthly draw rewards.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/auth/signup" className="rounded-xl bg-neon px-6 py-3 text-sm font-bold text-black transition hover:opacity-90">
            Subscribe Now
          </Link>
          <Link to="/charities" className="rounded-xl border border-cyan-200/30 px-6 py-3 text-sm font-semibold text-neonSoft transition hover:border-cyan-100/50">
            Explore Charities
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-neonSoft">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
