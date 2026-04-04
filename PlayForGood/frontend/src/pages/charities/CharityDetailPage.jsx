import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";

function HeroImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Charity Profile</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

export default function CharityDetailPage() {
  const { slug } = useParams();
  const [charity, setCharity] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest(`/charities/${slug}`, { method: "GET" });
        setCharity(data);
      } catch (loadError) {
        setError(loadError.message || "Unable to load charity");
      }
    })();
  }, [slug]);

  if (error) {
    return <main className="mx-auto max-w-4xl px-6 py-10 text-danger">{error}</main>;
  }

  if (!charity) {
    return <main className="mx-auto max-w-4xl px-6 py-10">Loading...</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 md:px-12">
      <Link to="/charities" className="text-sm font-semibold text-neonSoft">Back to charities</Link>
      <section className="glass mt-4 overflow-hidden rounded-3xl">
        <div className="h-60 w-full bg-slate-800">
          <HeroImage src={charity.image_url} alt={charity.name} />
        </div>
        <div className="p-6">
          {charity.is_featured ? (
            <p className="mb-2 inline-block rounded-full border border-cyan-200/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
              Featured Charity
            </p>
          ) : null}
          <h1 className="text-3xl font-bold">{charity.name}</h1>
          <p className="mt-2 text-slate-300">{charity.short_description}</p>
          <p className="mt-4 text-sm leading-7 text-slate-200">{charity.long_description}</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Upcoming Events</h2>
        {charity.events?.length ? (
          <div className="mt-3 space-y-3">
            {charity.events.map((event) => (
              <article key={event.id} className="glass rounded-xl p-4">
                <p className="text-sm uppercase tracking-wider text-neonSoft">{event.event_date || "TBA"}</p>
                <h3 className="mt-1 text-lg font-semibold">{event.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{event.details}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No events published yet.</p>
        )}
      </section>
    </main>
  );
}
