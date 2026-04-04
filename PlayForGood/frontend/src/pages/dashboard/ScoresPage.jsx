import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function ScoresPage() {
  const [scores, setScores] = useState([]);
  const [form, setForm] = useState({ scoreValue: 20, playedOn: new Date().toISOString().slice(0, 10) });
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadScores() {
    try {
      const data = await apiRequest("/scores", { method: "GET" });
      setScores(data.items || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load scores");
    }
  }

  useEffect(() => {
    void loadScores();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await apiRequest(`/scores/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ scoreValue: Number(form.scoreValue), playedOn: form.playedOn })
        });
        setMessage("Score updated.");
      } else {
        await apiRequest("/scores", {
          method: "POST",
          body: JSON.stringify({ scoreValue: Number(form.scoreValue), playedOn: form.playedOn })
        });
        setMessage("Score added. If this is your 6th score, oldest one was auto-removed.");
      }

      setEditingId("");
      await loadScores();
    } catch (submitError) {
      setError(submitError.message || "Unable to save score");
    }
  }

  function startEdit(score) {
    setEditingId(score.id);
    setForm({ scoreValue: score.score_value, playedOn: score.played_on });
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <form className="glass rounded-xl p-6" onSubmit={onSubmit}>
        <h1 className="text-2xl font-bold">Score Management</h1>
        <p className="mt-2 text-sm text-slate-300">Range: 1-45 Stableford. Exactly latest 5 scores are retained.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="number" min={1} max={45} className="rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2" value={form.scoreValue} onChange={(event) => setForm((prev) => ({ ...prev, scoreValue: event.target.value }))} required />
          <input type="date" className="rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2" value={form.playedOn} onChange={(event) => setForm((prev) => ({ ...prev, playedOn: event.target.value }))} required />
        </div>

        {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <button type="submit" className="mt-5 rounded-xl bg-neon px-4 py-2 text-sm font-bold text-black">{editingId ? "Update Score" : "Add Score"}</button>
      </form>

      <section className="mt-5 space-y-2">
        {scores.map((score) => (
          <article key={score.id} className="glass flex items-center justify-between rounded-lg p-3">
            <div>
              <p className="font-semibold">Score: {score.score_value}</p>
              <p className="text-xs text-slate-400">Date: {score.played_on}</p>
            </div>
            <button type="button" onClick={() => startEdit(score)} className="rounded-lg border border-cyan-200/30 px-3 py-1 text-xs">Edit</button>
          </article>
        ))}
      </section>
    </main>
  );
}
