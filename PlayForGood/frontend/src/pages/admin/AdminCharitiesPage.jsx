import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const defaultForm = {
  name: "",
  slug: "",
  shortDescription: "",
  longDescription: "",
  imageUrl: "",
  isFeatured: false,
  isActive: true
};

export default function AdminCharitiesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await apiRequest("/admin/charities", { method: "GET" });
      setItems(data.items || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load charities");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCharity(event) {
    event.preventDefault();
    setError("");

    try {
      await apiRequest("/admin/charities", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          imageUrl: form.imageUrl || null
        })
      });
      setForm(defaultForm);
      await load();
    } catch (createError) {
      setError(createError.message || "Unable to create charity");
    }
  }

  async function deleteCharity(id) {
    try {
      setError("");
      await apiRequest(`/admin/charities/${id}`, {
        method: "DELETE"
      });
      await load();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete charity");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="grid gap-4 xl:grid-cols-2">
        <form className="glass rounded-xl p-5" onSubmit={createCharity}>
          <h1 className="text-2xl font-bold">Add Charity</h1>

          <div className="mt-4 space-y-3">
            <input
              placeholder="Name"
              className="w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              placeholder="Slug"
              className="w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              required
            />
            <textarea
              placeholder="Short description"
              className="w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
              value={form.shortDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
              required
            />
            <textarea
              placeholder="Long description"
              className="w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
              value={form.longDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, longDescription: event.target.value }))}
              required
            />
            <input
              placeholder="Image URL"
              className="w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
              value={form.imageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Active
            </label>

            <button type="submit" className="w-full rounded-xl bg-neon px-4 py-2 font-bold text-black">
              Create Charity
            </button>
          </div>
        </form>

        <section className="glass rounded-xl p-5">
          <h2 className="text-2xl font-bold">Existing Charities</h2>
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-cyan-200/20 p-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-slate-300">{item.slug}</p>
                <p className="text-xs text-slate-400">Featured: {String(item.is_featured)}</p>
                <p className="text-xs text-slate-400">Active: {String(item.is_active)}</p>

                <button
                  type="button"
                  onClick={() => void deleteCharity(item.id)}
                  className="mt-2 rounded-lg border border-rose-300/40 px-2 py-1 text-xs text-rose-200"
                >
                  Delete
                </button>
              </article>
            ))}

            {!items.length ? <p className="text-sm text-slate-400">No charities found.</p> : null}
          </div>
        </section>
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </main>
  );
}
