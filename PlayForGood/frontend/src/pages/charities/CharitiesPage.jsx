import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";

export default function CharitiesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest("/charities", { method: "GET" });
        setItems(data.items || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load charities");
      }
    })();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-12">
      <h1 className="text-3xl font-bold">Charities</h1>
      <p className="mt-2 text-slate-300">Choose where your impact goes.</p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((charity) => (
          <article key={charity.id} className="glass overflow-hidden rounded-2xl">
            <div className="h-40 w-full bg-slate-800">
              {charity.image_url ? (
                <img
                  src={charity.image_url}
                  alt={charity.name}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold">{charity.name}</h2>
              <p className="mt-2 text-sm text-slate-300">{charity.short_description}</p>
              <Link to={`/charities/${charity.slug}`} className="mt-3 inline-block text-sm font-semibold text-neonSoft">View profile</Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
