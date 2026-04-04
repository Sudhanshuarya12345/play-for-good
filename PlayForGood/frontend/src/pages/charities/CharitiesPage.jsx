import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";

function CharityImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Impact Story</span>
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

export default function CharitiesPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError("");

          const params = new URLSearchParams();
          if (query.trim()) {
            params.set("query", query.trim());
          }
          if (featuredOnly) {
            params.set("featured", "true");
          }

          const path = params.toString() ? `/charities?${params.toString()}` : "/charities";
          const data = await apiRequest(path, { method: "GET" });

          if (!isCancelled) {
            setItems(data.items || []);
          }
        } catch (loadError) {
          if (!isCancelled) {
            setError(loadError.message || "Unable to load charities");
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      })();
    }, 180);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [featuredOnly, query]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-12">
      <h1 className="text-3xl font-bold">Charities</h1>
      <p className="mt-2 text-slate-300">Choose where your impact goes.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by charity name or mission"
          className="w-full max-w-md rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setFeaturedOnly((prev) => !prev)}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
            featuredOnly
              ? "border-cyan-100/60 bg-cyan-300/15 text-cyan-100"
              : "border-cyan-200/30 text-slate-200"
          }`}
        >
          {featuredOnly ? "Showing Featured" : "All Active Charities"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mt-3 text-sm text-slate-400">Loading charities...</p> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((charity) => (
          <article key={charity.id} className="glass overflow-hidden rounded-2xl">
            <div className="h-40 w-full bg-slate-800">
              <CharityImage src={charity.image_url} alt={charity.name} />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold">{charity.name}</h2>
              <p className="mt-2 text-sm text-slate-300">{charity.short_description}</p>
              <Link to={`/charities/${charity.slug}`} className="mt-3 inline-block text-sm font-semibold text-neonSoft">View profile</Link>
            </div>
          </article>
        ))}
      </div>

      {!loading && !items.length ? <p className="mt-6 text-sm text-slate-400">No charities match this filter yet.</p> : null}
    </main>
  );
}
