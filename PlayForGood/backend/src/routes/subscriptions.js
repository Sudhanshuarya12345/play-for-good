import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { getRazorpayClient, isRazorpayEnabled } from "../services/razorpay.js";
import { upsertSubscriptionFromRazorpay } from "../services/subscription-sync.js";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { getActiveSubscription } from "../subscriptions/access.js";
import { requireAuth } from "../middleware/auth.js";
import { ok, badRequest, serverError } from "../http/responses.js";

const router = Router();

const createCheckoutSchema = z.object({
  planType: z.enum(["monthly", "yearly"]),
  charityPercent: z.number().int().min(10).max(40),
  selectedCharityId: z.string().uuid().optional().nullable()
});

function ensureRazorpayEnabled(res) {
  if (isRazorpayEnabled()) {
    return true;
  }

  badRequest(res, "Razorpay billing is disabled in this environment.");
  return false;
}

function extractProviderErrorMessage(error, fallbackMessage) {
  return (
    error?.error?.description ||
    error?.error?.reason ||
    error?.message ||
    error?.description ||
    fallbackMessage
  );
}

function isClientProviderError(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  return Number.isFinite(status) && status >= 400 && status < 500;
}

router.post("/create-checkout-session", requireAuth, async (req, res) => {
  try {
    if (!ensureRazorpayEnabled(res)) {
      return;
    }

    const parsed = createCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid checkout payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const razorpay = getRazorpayClient();
    const planId = parsed.data.planType === "monthly" ? env.RAZORPAY_MONTHLY_PLAN_ID : env.RAZORPAY_YEARLY_PLAN_ID;
    const totalCount = parsed.data.planType === "monthly" ? 120 : 10;

    if (!planId) {
      return badRequest(res, `Missing Razorpay plan configuration for ${parsed.data.planType} plan.`);
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, selected_charity_id")
      .eq("id", req.auth.user.id)
      .single();

    await adminClient
      .from("profiles")
      .update({
        charity_percent: parsed.data.charityPercent,
        selected_charity_id: parsed.data.selectedCharityId ?? profile?.selected_charity_id ?? null
      })
      .eq("id", req.auth.user.id);

    let razorpaySubscription;
    try {
      razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: req.auth.user.id,
          user_email: req.auth.user.email || profile?.email || "",
          charity_percent: String(parsed.data.charityPercent),
          selected_charity_id: parsed.data.selectedCharityId || "",
          plan_type: parsed.data.planType
        }
      });
    } catch (providerError) {
      const message = extractProviderErrorMessage(providerError, "Unable to create Razorpay checkout session.");
      if (isClientProviderError(providerError)) {
        return badRequest(res, message);
      }

      return serverError(res, message);
    }

    await upsertSubscriptionFromRazorpay({
      adminClient,
      razorpaySubscription,
      userId: req.auth.user.id,
      razorpayCustomerId: razorpaySubscription.customer_id || null
    });

    return ok(res, {
      checkoutUrl: razorpaySubscription.short_url || null,
      sessionId: razorpaySubscription.id,
      keyId: env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/create-portal-session", requireAuth, async (req, res) => {
  try {
    if (!ensureRazorpayEnabled(res)) {
      return;
    }

    return badRequest(
      res,
      "Razorpay does not provide a hosted billing portal. Use cancel/subscription controls in this dashboard."
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get("/status", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    let { data: latest } = await adminClient
      .from("subscriptions")
      .select("id, stripe_subscription_id, status, plan_type, current_period_start, current_period_end, cancel_at_period_end")
      .eq("user_id", req.auth.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let active = await getActiveSubscription({ adminClient, userId: req.auth.user.id });

    // Fallback sync: if webhook update is delayed/missed, refresh latest subscription from Razorpay.
    if (!active && latest?.stripe_subscription_id && isRazorpayEnabled()) {
      try {
        const razorpay = getRazorpayClient();
        const liveSubscription = await razorpay.subscriptions.fetch(latest.stripe_subscription_id);

        await upsertSubscriptionFromRazorpay({
          adminClient,
          razorpaySubscription: liveSubscription,
          userId: req.auth.user.id,
          razorpayCustomerId: liveSubscription.customer_id || null
        });

        const { data: refreshedLatest } = await adminClient
          .from("subscriptions")
          .select("id, stripe_subscription_id, status, plan_type, current_period_start, current_period_end, cancel_at_period_end")
          .eq("user_id", req.auth.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        latest = refreshedLatest || latest;
        active = await getActiveSubscription({ adminClient, userId: req.auth.user.id });
      } catch (_syncError) {
        // Keep response non-blocking when provider sync is temporarily unavailable.
      }
    }

    const latestForDisplay = active || latest || null;

    return ok(res, {
      latest: latestForDisplay,
      active: Boolean(active)
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/cancel", requireAuth, async (req, res) => {
  try {
    if (!ensureRazorpayEnabled(res)) {
      return;
    }

    const adminClient = getSupabaseAdminClient();

    const { data: subscription } = await adminClient
      .from("subscriptions")
      .select("id, stripe_subscription_id")
      .eq("user_id", req.auth.user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return badRequest(res, "No active subscription found");
    }

    const razorpay = getRazorpayClient();
    let canceled;

    try {
      canceled = await razorpay.subscriptions.cancel(subscription.stripe_subscription_id, true);
    } catch (providerError) {
      const message = extractProviderErrorMessage(providerError, "Unable to cancel Razorpay subscription.");
      if (isClientProviderError(providerError)) {
        return badRequest(res, message);
      }

      return serverError(res, message);
    }

    const status = canceled?.status === "cancelled" ? "canceled" : "active";

    await adminClient
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.id);

    return ok(res, {
      canceledAtPeriodEnd: true,
      providerStatus: canceled?.status || null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
