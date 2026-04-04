import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function AdminDrawPage() {
  const [drawMonth, setDrawMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mode, setMode] = useState("random");
  const [weightedStrategy, setWeightedStrategy] = useState("hot");
  const [simulation, setSimulation] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await apiRequest("/admin/draw/config", { method: "GET" });
        if (config.mode) {
          setMode(config.mode);
        }
        if (config.weighted_strategy) {
          setWeightedStrategy(config.weighted_strategy);
        }
      } catch {
        // Keep defaults if config endpoint is unavailable.
      }
    })();
  }, []);

  async function saveConfig() {
    try {
      setLoading("config");
      setError("");
      await apiRequest("/admin/draw/config", {
        method: "PATCH",
        body: JSON.stringify({ mode, weightedStrategy })
      });
    } catch (configError) {
      setError(configError.message || "Unable to save draw config");
    } finally {
      setLoading("");
    }
  }

  async function runSimulation() {
    try {
      setLoading("simulate");
      setError("");
      const data = await apiRequest("/admin/draw/simulate", {
        method: "POST",
        body: JSON.stringify({ drawMonth, mode, weightedStrategy })
      });
      setSimulation(data);
    } catch (simulationError) {
      setError(simulationError.message || "Simulation failed");
    } finally {
      setLoading("");
    }
  }

  async function publishDraw() {
    try {
      setLoading("publish");
      setError("");
      const data = await apiRequest("/admin/draw/publish", {
        method: "POST",
        body: JSON.stringify({ drawMonth, mode, weightedStrategy })
      });
      setPublishResult(data);
    } catch (publishError) {
      setError(publishError.message || "Publish failed");
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Draw Management</h1>
      <p className="mt-2 text-sm text-slate-300">Simulate before publishing. Publishing notifies participants and winners.</p>

      <section className="glass mt-6 rounded-xl p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={drawMonth}
            onChange={(event) => setDrawMonth(event.target.value)}
            className="rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
            placeholder="YYYY-MM"
          />
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
          >
            <option value="random">Random</option>
            <option value="weighted">Weighted</option>
          </select>
          <select
            value={weightedStrategy}
            onChange={(event) => setWeightedStrategy(event.target.value)}
            className="rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2"
            disabled={mode !== "weighted"}
          >
            <option value="hot">Hot Frequency</option>
            <option value="cold">Cold Frequency</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveConfig()}
            className="rounded-xl border border-cyan-200/30 px-4 py-2 text-sm"
            disabled={Boolean(loading)}
          >
            {loading === "config" ? "Saving..." : "Save Config"}
          </button>
          <button
            type="button"
            onClick={() => void runSimulation()}
            className="rounded-xl bg-neon px-4 py-2 text-sm font-bold text-black"
            disabled={Boolean(loading)}
          >
            {loading === "simulate" ? "Simulating..." : "Run Simulation"}
          </button>
          <button
            type="button"
            onClick={() => void publishDraw()}
            className="rounded-xl border border-cyan-200/30 px-4 py-2 text-sm"
            disabled={Boolean(loading)}
          >
            {loading === "publish" ? "Publishing..." : "Publish Draw"}
          </button>
        </div>
      </section>

      {simulation ? (
        <section className="glass mt-4 rounded-xl p-4">
          <h2 className="text-lg font-semibold">Simulation Result</h2>
          <p className="mt-2 text-sm">Numbers: {simulation.proposed_numbers_json.join(", ")}</p>
          <p className="mt-1 text-sm">Participants: {simulation.analysis_json?.tierStats?.participants || 0}</p>
          <p className="mt-1 text-sm">3-Match: {simulation.analysis_json?.tierStats?.[3] || 0}</p>
          <p className="mt-1 text-sm">4-Match: {simulation.analysis_json?.tierStats?.[4] || 0}</p>
          <p className="mt-1 text-sm">5-Match: {simulation.analysis_json?.tierStats?.[5] || 0}</p>
        </section>
      ) : null}

      {publishResult ? (
        <section className="glass mt-4 rounded-xl p-4">
          <h2 className="text-lg font-semibold">Published Draw</h2>
          <p className="mt-2 text-sm">Numbers: {publishResult.draw?.numbers_json?.join(", ") || "-"}</p>
          <p className="mt-1 text-sm">Prize Pool: INR {((publishResult.totalPrizePool || 0) / 100).toFixed(2)}</p>
          <p className="mt-1 text-sm">5-Match Winners: {publishResult.winnersByTier?.[5] || 0}</p>
        </section>
      ) : null}

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </main>
  );
}
