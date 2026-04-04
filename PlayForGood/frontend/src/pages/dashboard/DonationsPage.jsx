import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function DonationsPage() {
  const [charities, setCharities] = useState([]);
  const [donations, setDonations] = useState([]);
  const [form, setForm] = useState({
    charityId: "",
    amountRupees: 1000,
    referenceNote: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [charityData, donationData] = await Promise.all([
        apiRequest("/charities", { method: "GET" }),
        apiRequest("/donations/me", { method: "GET" })
      ]);

      const charityItems = charityData.items || [];
      setCharities(charityItems);
      setDonations(donationData.items || []);
      setForm((prev) => {
        if (!prev.charityId && charityItems.length) {
          return { ...prev, charityId: charityItems[0].id };
        }
        return prev;
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load donations");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiRequest("/donations", {
        method: "POST",
        body: JSON.stringify({
          charityId: form.charityId,
          amountRupees: Number(form.amountRupees),
          referenceNote: form.referenceNote,
          paymentMode: "record_only"
        })
      });

      setMessage("Donation recorded successfully.");
      setForm((prev) => ({ ...prev, referenceNote: "" }));
      await loadData();
    } catch (submitError) {
      setError(submitError.message || "Unable to record donation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="glass rounded-2xl p-6" onSubmit={onSubmit}>
          <h1 className="text-2xl font-bold">Independent Donation</h1>
          <p className="mt-2 text-sm text-slate-300">Record additional direct donations to your preferred charity.</p>

          <label className="mt-5 block text-sm">Charity</label>
          <select
            className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
            value={form.charityId}
            onChange={(event) => setForm((prev) => ({ ...prev, charityId: event.target.value }))}
            required
          >
            <option value="">Select charity</option>
            {charities.map((charity) => (
              <option key={charity.id} value={charity.id}>
                {charity.name}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm">Amount (INR)</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
            value={form.amountRupees}
            onChange={(event) => setForm((prev) => ({ ...prev, amountRupees: event.target.value }))}
            required
          />

          <label className="mt-4 block text-sm">Reference Note (optional)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
            value={form.referenceNote}
            onChange={(event) => setForm((prev) => ({ ...prev, referenceNote: event.target.value }))}
            rows={3}
          />

          {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Donation"}
          </button>
        </form>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold">Donation History</h2>
          <div className="mt-4 space-y-2">
            {donations.length ? (
              donations.map((donation) => (
                <article key={donation.id} className="rounded-lg border border-cyan-200/20 p-3">
                  <p className="text-sm font-semibold">INR {(donation.amount_paise / 100).toFixed(2)}</p>
                  <p className="text-xs text-slate-300">{donation.charities?.name || "Unknown charity"}</p>
                  <p className="text-xs text-slate-400">{donation.status}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">No donations recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
