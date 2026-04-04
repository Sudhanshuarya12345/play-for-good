import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function AdminWinningsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function loadRows() {
    try {
      const data = await apiRequest("/admin/winnings", { method: "GET" });
      setRows(data.items || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load winnings");
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function updateVerification(id, decision) {
    try {
      setError("");
      await apiRequest(`/admin/winnings/${id}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ decision })
      });
      await loadRows();
    } catch (saveError) {
      setError(saveError.message || "Unable to update verification");
    }
  }

  async function markPaid(id) {
    try {
      setError("");
      await apiRequest(`/admin/winnings/${id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "paid" })
      });
      await loadRows();
    } catch (saveError) {
      setError(saveError.message || "Unable to update payment");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Winner Verification & Payouts</h1>

      <section className="mt-6 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="glass rounded-xl p-4">
            <p className="text-sm">Winning ID: {row.id}</p>
            <p className="text-sm">User: {row.user_id}</p>
            <p className="text-sm">Tier: {row.match_tier}</p>
            <p className="text-sm">Amount: INR {(row.gross_win_amount_paise / 100).toFixed(2)}</p>
            <p className="text-xs text-slate-400">
              Verification: {row.verification_status} · Payment: {row.payment_status}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void updateVerification(row.id, "approved")}
                className="rounded-lg bg-success/80 px-3 py-1 text-xs font-semibold text-black"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => void updateVerification(row.id, "rejected")}
                className="rounded-lg bg-danger/80 px-3 py-1 text-xs font-semibold text-black"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => void markPaid(row.id)}
                className="rounded-lg border border-cyan-200/30 px-3 py-1 text-xs"
              >
                Mark Paid
              </button>
            </div>
          </article>
        ))}

        {!rows.length ? <p className="text-sm text-slate-400">No winnings found.</p> : null}
      </section>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </main>
  );
}
