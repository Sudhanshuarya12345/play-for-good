import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function CharityPreferencePage() {
  const [charities, setCharities] = useState([]);
  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [charityPercent, setCharityPercent] = useState(10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [charityData, preferenceData] = await Promise.all([
          apiRequest("/charities", { method: "GET" }),
          apiRequest("/user/charity", { method: "GET" })
        ]);

        setCharities(charityData.items || []);
        const currentCharity = preferenceData.selected_charity_id || charityData.items?.[0]?.id || "";
        setSelectedCharityId(currentCharity);
        setCharityPercent(preferenceData.charity_percent || 10);
      } catch (loadError) {
        setError(loadError.message || "Unable to load charity preference");
      }
    })();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiRequest("/user/charity", {
        method: "PATCH",
        body: JSON.stringify({
          selectedCharityId,
          charityPercent: Number(charityPercent)
        })
      });
      setMessage("Charity preference updated.");
    } catch (submitError) {
      setError(submitError.message || "Unable to update charity preference");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <form className="glass rounded-2xl p-6" onSubmit={onSubmit}>
        <h1 className="text-2xl font-bold">Charity Preference</h1>
        <p className="mt-2 text-sm text-slate-300">Set your selected charity and contribution percentage.</p>

        <label className="mt-5 block text-sm">Selected Charity</label>
        <select
          value={selectedCharityId}
          onChange={(event) => setSelectedCharityId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          required
        >
          <option value="">Select charity</option>
          {charities.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm">Contribution Percentage (10-40)</label>
        <input
          type="number"
          min={10}
          max={40}
          className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          value={charityPercent}
          onChange={(event) => setCharityPercent(event.target.value)}
          required
        />

        {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Preference"}
        </button>
      </form>
    </main>
  );
}
