import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function WinningsPage() {
  const [rows, setRows] = useState([]);
  const [uploadingId, setUploadingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRows() {
    try {
      const data = await apiRequest("/winnings/me", { method: "GET" });
      setRows(data.items || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load winnings");
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function uploadProof(winningId, file) {
    setUploadingId(winningId);
    setMessage("");
    setError("");

    try {
      const uploadData = await apiRequest(`/winnings/${winningId}/proof/upload-url`, {
        method: "POST"
      });

      const uploadResponse = await fetch(uploadData.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Unable to upload proof file");
      }

      await apiRequest(`/winnings/${winningId}/proof/submit`, {
        method: "POST",
        body: JSON.stringify({ proofFilePath: uploadData.path })
      });

      setMessage("Proof uploaded and submitted for verification.");
      await loadRows();
    } catch (uploadError) {
      setError(uploadError.message || "Proof upload failed");
    } finally {
      setUploadingId("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">Winnings & Verification</h1>
      <p className="mt-2 text-sm text-slate-300">Upload screenshot proof for winning entries pending verification.</p>

      <section className="mt-6 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="glass rounded-xl p-4">
            <p className="text-sm">Tier: {row.match_tier || "N/A"}</p>
            <p className="text-sm">Match Count: {row.match_count}</p>
            <p className="text-sm">Amount: INR {(row.gross_win_amount_paise / 100).toFixed(2)}</p>
            <p className="text-xs text-slate-400">
              Verification: {row.verification_status} · Payment: {row.payment_status}
            </p>

            <div className="mt-3">
              <label className="text-xs text-slate-300">Upload proof screenshot</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-1 block text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadProof(row.id, file);
                  }
                }}
                disabled={uploadingId === row.id}
              />
            </div>
          </article>
        ))}

        {!rows.length ? <p className="text-sm text-slate-400">No winnings found.</p> : null}
      </section>

      {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </main>
  );
}
