import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const MONTHLY_PRICE = 499;
const YEARLY_PRICE = 4999;
const CHECKOUT_PENDING_KEY = "playforgood_checkout_pending";

function formatPeriodEnd(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function SubscriptionPage() {
  const { profile } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const [hasAutoRefreshAttempted, setHasAutoRefreshAttempted] = useState(false);

  const charityPercent = useMemo(() => profile?.charity_percent || 10, [profile]);
  const selectedCharityId = useMemo(() => profile?.selected_charity_id || null, [profile]);

  const loadStatus = useCallback(async ({ silentErrors = false } = {}) => {
    try {
      if (!silentErrors) {
        setError("");
      }

      const data = await apiRequest("/subscriptions/status", { method: "GET" });
      const latest = data.latest || null;
      setStatus(latest);
      return latest;
    } catch (loadError) {
      if (!silentErrors) {
        setError(loadError.message || "Unable to load subscription status");
      }

      throw loadError;
    }
  }, []);

  useEffect(() => {
    void loadStatus().catch(() => {});
  }, [loadStatus]);

  useEffect(() => {
    function syncReturnBanner() {
      const hasPendingCheckout = Boolean(localStorage.getItem(CHECKOUT_PENDING_KEY));
      setShowReturnBanner(hasPendingCheckout);
      if (hasPendingCheckout) {
        setHasAutoRefreshAttempted(false);
      }
    }

    syncReturnBanner();
    window.addEventListener("pageshow", syncReturnBanner);

    return () => {
      window.removeEventListener("pageshow", syncReturnBanner);
    };
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
        localStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify({ planType, startedAt: Date.now() }));
        setMessage("Redirecting to Razorpay checkout...");
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

  const refreshStatus = useCallback(async ({ auto = false } = {}) => {
    try {
      if (showReturnBanner && !auto) {
        setHasAutoRefreshAttempted(true);
      }

      setLoading("status");
      setError("");
      setMessage("");
      const latest = await loadStatus();

      if (showReturnBanner && latest?.status === "active") {
        localStorage.removeItem(CHECKOUT_PENDING_KEY);
        setShowReturnBanner(false);
        setHasAutoRefreshAttempted(false);
        setMessage(`Subscription is active. Updated period end: ${formatPeriodEnd(latest.current_period_end)}.`);
        return;
      }

      if (showReturnBanner) {
        if (auto) {
          setMessage("Payment is still processing. Auto-check completed; you can click Refresh Now.");
        } else {
          setMessage("Payment is still processing. Please wait a few seconds and refresh again.");
        }
        return;
      }

      setMessage("Subscription status refreshed.");
    } catch (statusError) {
      setError(statusError.message || "Unable to refresh subscription status");
    } finally {
      setLoading("");
    }
  }, [loadStatus, showReturnBanner]);

  useEffect(() => {
    if (!showReturnBanner || hasAutoRefreshAttempted) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setHasAutoRefreshAttempted(true);
      void refreshStatus({ auto: true });
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showReturnBanner, hasAutoRefreshAttempted, refreshStatus]);

  async function cancelAtPeriodEnd() {
    const confirmed = window.confirm(
      "Your subscription will stay active until your current billing period ends, then access to score entry and draw participation will stop. Continue?\n\nTechnical note: this sets cancel_at_period_end=true for your active Razorpay subscription."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading("cancel");
      setError("");
      setMessage("");

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

  const statusLabel = status?.status || "inactive";
  const statusToneClass =
    statusLabel === "active"
      ? "border-success/40 bg-success/10 text-success"
      : statusLabel === "canceled" || statusLabel === "cancelled"
        ? "border-danger/40 bg-danger/10 text-danger"
        : "border-cyan-200/30 bg-cyan-500/10 text-cyan-100";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Subscription Management</h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusToneClass}`}>
            {statusLabel}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Razorpay test mode is active. Billing portal is not supported, so subscription updates are handled directly here.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-cyan-200/20 bg-panel/50 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Monthly Plan</p>
            <p className="mt-2 text-2xl font-bold">INR {MONTHLY_PRICE}</p>
            <p className="mt-1 text-xs text-slate-300">Billed every month</p>
            <button
              type="button"
              onClick={() => void createCheckout("monthly")}
              disabled={Boolean(loading)}
              className="mt-4 w-full rounded-xl bg-neon px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {loading === "monthly" ? "Opening..." : "Choose Monthly"}
            </button>
          </article>

          <article className="rounded-xl border border-cyan-200/20 bg-panel/50 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Yearly Plan</p>
            <p className="mt-2 text-2xl font-bold">INR {YEARLY_PRICE}</p>
            <p className="mt-1 text-xs text-slate-300">Best value for long-term support</p>
            <button
              type="button"
              onClick={() => void createCheckout("yearly")}
              disabled={Boolean(loading)}
              className="mt-4 w-full rounded-xl border border-cyan-200/30 px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading === "yearly" ? "Opening..." : "Choose Yearly"}
            </button>
          </article>
        </div>

        <div className="mt-5 rounded-lg border border-cyan-200/20 bg-cyan-500/5 px-4 py-3 text-sm text-slate-200">
          Razorpay does not provide a hosted billing portal. After payment, use browser back and then Refresh Subscription Status.
        </div>

        {showReturnBanner ? (
          <div className="mt-4 rounded-lg border border-neon/30 bg-neon/10 px-4 py-3 text-sm text-cyan-50">
            <p>Returned from Razorpay? Click Refresh Now to fetch your latest subscription period.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refreshStatus()}
                disabled={Boolean(loading)}
                className="rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {loading === "status" ? "Refreshing..." : "Refresh Now"}
              </button>
              <Link
                to="/dashboard"
                className="rounded-lg border border-cyan-200/40 px-4 py-2 text-sm font-semibold text-cyan-100"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={Boolean(loading)}
            className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading === "status" ? "Refreshing..." : "Refresh Subscription Status"}
          </button>
          <button
            type="button"
            onClick={() => void cancelAtPeriodEnd()}
            disabled={Boolean(loading)}
            className="rounded-lg border border-rose-300/40 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
          >
            {loading === "cancel" ? "Cancelling..." : "Cancel at Period End"}
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-200/20 bg-panel/40 p-4 text-sm">
          <p>Status: {statusLabel}</p>
          <p>Plan: {status?.plan_type || "none"}</p>
          <p>Period End: {formatPeriodEnd(status?.current_period_end)}</p>
          <p>Cancel at Period End: {String(status?.cancel_at_period_end || false)}</p>
        </div>

        {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </section>
    </main>
  );
}
