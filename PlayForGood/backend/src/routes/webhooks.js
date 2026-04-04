import { Router } from "express";
import { env } from "../config/env.js";
import crypto from "crypto";
import { getRazorpayClient, isRazorpayEnabled } from "../services/razorpay.js";
import { getSupabaseAdminClient } from "../supabase/client.js";
import {
  isWebhookAlreadyProcessed,
  markWebhookEventProcessed,
  recordInvoiceLedger,
  upsertSubscriptionFromRazorpay
} from "../services/subscription-sync.js";
import { sendTransactionalEmail } from "../services/email.js";

const router = Router();

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }

  return String(value || "");
}

function buildEventId(event, rawBody, headerEventId) {
  const normalizedHeaderEventId = normalizeHeaderValue(headerEventId);
  if (normalizedHeaderEventId) {
    return normalizedHeaderEventId;
  }

  const subscriptionId = event?.payload?.subscription?.entity?.id || "";
  const paymentId = event?.payload?.payment?.entity?.id || "";
  const invoiceId = event?.payload?.invoice?.entity?.id || "";
  const createdAt = event?.created_at || "";

  const joined = [event?.event || "unknown", createdAt, subscriptionId, paymentId, invoiceId]
    .filter(Boolean)
    .join(":");

  if (joined) {
    return joined;
  }

  return crypto.createHash("sha1").update(rawBody).digest("hex");
}

function verifyRazorpaySignature(rawBody, signature) {
  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const provided = normalizeHeaderValue(signature);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

router.post("/razorpay", async (req, res) => {
  if (!isRazorpayEnabled()) {
    return res.status(200).json({ success: true, ignored: true, reason: "Razorpay is disabled" });
  }

  const razorpay = getRazorpayClient();
  const adminClient = getSupabaseAdminClient();
  const signature = req.headers["x-razorpay-signature"];
  const eventIdHeader = req.headers["x-razorpay-event-id"];
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body || {});

  if (!signature) {
    return res.status(400).json({ success: false, error: "Missing Razorpay webhook signature" });
  }

  if (!verifyRazorpaySignature(rawBody, signature)) {
    return res.status(400).json({ success: false, error: "Webhook signature validation failed" });
  }

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    return res.status(400).json({ success: false, error: `Invalid webhook payload: ${error.message}` });
  }

  try {
    const eventId = buildEventId(event, rawBody, eventIdHeader);
    const alreadyProcessed = await isWebhookAlreadyProcessed({ adminClient, eventId });
    if (alreadyProcessed) {
      return res.status(200).json({ success: true, duplicate: true });
    }

    const eventType = event?.event;
    const subscriptionPayload = event?.payload?.subscription?.entity || null;

    if (subscriptionPayload) {
      const userId = subscriptionPayload?.notes?.user_id;
      if (userId) {
        await upsertSubscriptionFromRazorpay({
          adminClient,
          razorpaySubscription: subscriptionPayload,
          userId,
          razorpayCustomerId: subscriptionPayload.customer_id || null
        });

        const charityPercent = Number(subscriptionPayload?.notes?.charity_percent || 10);
        const selectedCharityId = subscriptionPayload?.notes?.selected_charity_id || null;

        await adminClient
          .from("profiles")
          .update({
            charity_percent: charityPercent,
            selected_charity_id: selectedCharityId || null
          })
          .eq("id", userId);

        if (eventType === "subscription.activated") {
          const { data: profile } = await adminClient.from("profiles").select("email").eq("id", userId).maybeSingle();
          if (profile?.email) {
            await sendTransactionalEmail({
              to: profile.email,
              subject: "Subscription Confirmed - PlayForGood",
              html: "<p>Your Razorpay subscription is active. You are now eligible for draw participation once you submit 5 scores.</p>"
            });
          }
        }
      }
    }

    if (eventType === "payment.captured") {
      const payment = event?.payload?.payment?.entity;
      if (payment?.subscription_id) {
        let { data: localSubscription } = await adminClient
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_subscription_id", payment.subscription_id)
          .maybeSingle();

        if (!localSubscription?.user_id) {
          const liveSubscription = await razorpay.subscriptions.fetch(payment.subscription_id);
          const liveUserId = liveSubscription?.notes?.user_id;
          if (liveUserId) {
            const localSubscriptionId = await upsertSubscriptionFromRazorpay({
              adminClient,
              razorpaySubscription: liveSubscription,
              userId: liveUserId,
              razorpayCustomerId: liveSubscription.customer_id || null
            });
            localSubscription = { id: localSubscriptionId, user_id: liveUserId };
          }
        }

        if (localSubscription?.user_id) {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("charity_percent")
            .eq("id", localSubscription.user_id)
            .maybeSingle();

          await recordInvoiceLedger({
            adminClient,
            userId: localSubscription.user_id,
            subscriptionId: localSubscription.id,
            providerPaymentId: payment.id,
            grossAmountPaise: Number(payment.amount || 0),
            charityPercent: Number(profile?.charity_percent || 10)
          });
        }
      }
    }

    if (eventType === "payment.failed") {
      const failedPayment = event?.payload?.payment?.entity;
      if (failedPayment?.subscription_id) {
        const liveSubscription = await razorpay.subscriptions.fetch(failedPayment.subscription_id);
        const liveUserId = liveSubscription?.notes?.user_id;
        if (liveUserId) {
          await upsertSubscriptionFromRazorpay({
            adminClient,
            razorpaySubscription: liveSubscription,
            userId: liveUserId,
            razorpayCustomerId: liveSubscription.customer_id || null
          });
        }
      }
    }

    await markWebhookEventProcessed({
      adminClient,
      eventId,
      eventType: eventType || "unknown"
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/stripe", (_req, res) => {
  return res.status(200).json({
    success: true,
    ignored: true,
    reason: "Stripe webhook endpoint is deprecated. Use /api/webhooks/razorpay."
  });
});

export default router;
