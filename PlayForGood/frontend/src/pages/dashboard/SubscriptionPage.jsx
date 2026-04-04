import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const MONTHLY_PRICE = 499;
const YEARLY_PRICE = 4999;

export default function SubscriptionPage() {
  const { profile } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const charityPercent = useMemo(() => profile?.charity_percent || 10, [profile]);
  const selectedCharityId = useMemo(() => profile?.selected_charity_id || null, [profile]);

  async function loadStatus() {
    try {
      const data = await apiRequest("/subscriptions/status", { method: "GET" });
      setStatus(data.latest || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load subscription status");
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function createCheckout(planType) {
    try {
      setLoading(planType);
      setError("");
      setMessage("");

      const data = await apiRequest("/subscriptions/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          planType,
          charityPercent,
          selectedCharityId
        })
      });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setMessage("Checkout session created.");
    } catch (checkoutError) {
      setError(checkoutError.message || "Unable to create checkout session");
    } finally {
      setLoading("");
    }
  }

  async function openPortal() {
    try {
      setLoading("portal");
      setError("");

      const data = await apiRequest("/subscriptions/create-portal-session", {
        method: "POST"
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (portalError) {
      setError(portalError.message || "Unable to open billing portal");
    } finally {
      setLoading("");
    }
  }

  async function cancelAtPeriodEnd() {
    try {
      setLoading("cancel");
      setError("");

      await apiRequest("/subscriptions/cancel", {
        method: "POST"
      });

      setMessage("Subscription will cancel at period end.");
      await loadStatus();
    } catch (cancelError) {
      setError(cancelError.message || "Unable to cancel subscription");
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <section className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Subscription Management</h1>
        <p className="mt-2 text-sm text-slate-300">Razorpay test mode is active. Prices are fixed in INR.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void createCheckout("monthly")}
            disabled={Boolean(loading)}
            className="rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading === "monthly" ? "Opening..." : `Subscribe Monthly (INR ${MONTHLY_PRICE})`}
          </button>
          <button
            type="button"
            onClick={() => void createCheckout("yearly")}
            disabled={Boolean(loading)}
            className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading === "yearly" ? "Opening..." : `Subscribe Yearly (INR ${YEARLY_PRICE})`}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={Boolean(loading)}
            className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading === "portal" ? "Checking..." : "Billing Portal (Not Available)"}
          </button>
          <button
            type="button"
            onClick={() => void cancelAtPeriodEnd()}
            disabled={Boolean(loading)}
            className="rounded-lg border border-rose-300/40 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
          >
            {loading === "cancel" ? "Cancelling..." : "Cancel at Period End"}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-200/20 p-4 text-sm">
          <p>Status: {status?.status || "inactive"}</p>
          <p>Plan: {status?.plan_type || "none"}</p>
          <p>Period End: {status?.current_period_end || "-"}</p>
          <p>Cancel at Period End: {String(status?.cancel_at_period_end || false)}</p>
        </div>

        {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </section>
    </main>
  );
}
