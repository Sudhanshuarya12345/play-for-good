import { APP_CONSTANTS } from "../constants/app.js";
import { calculateAllocation } from "../utils/money.js";
import { env } from "../config/env.js";

const EXTENSION_BASE_STATUSES = ["active", "canceled"];

function mapRazorpaySubscriptionStatus(status) {
  if (["active", "authenticated"].includes(status)) {
    return "active";
  }

  if (status === "cancelled") {
    return "canceled";
  }

  if (status === "halted") {
    return "past_due";
  }

  if (["pending", "created"].includes(status)) {
    return "incomplete";
  }

  if (["completed", "expired"].includes(status)) {
    return "lapsed";
  }

  return "inactive";
}

function getPlanTypeByPlanId(planId) {
  if (planId === env.RAZORPAY_MONTHLY_PLAN_ID) {
    return "monthly";
  }

  if (planId === env.RAZORPAY_YEARLY_PLAN_ID) {
    return "yearly";
  }

  throw new Error("Unknown Razorpay plan id in subscription data.");
}

function toIsoFromUnixSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return new Date(numeric * 1000).toISOString();
}

function resolveSubscriptionAmountPaise(razorpaySubscription, planType) {
  const fromPlan = Number(razorpaySubscription?.plan?.item?.amount);
  if (Number.isFinite(fromPlan) && fromPlan > 0) {
    return fromPlan;
  }

  return planType === "monthly" ? 49900 : 499900;
}

function resolveCancelAtPeriodEnd(razorpaySubscription) {
  if (typeof razorpaySubscription?.cancel_at_cycle_end === "boolean") {
    return razorpaySubscription.cancel_at_cycle_end;
  }

  if (typeof razorpaySubscription?.has_scheduled_changes === "boolean") {
    return razorpaySubscription.has_scheduled_changes;
  }

  return false;
}

function addPlanDurationFromIso(isoValue, planType) {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (planType === "monthly") {
    parsed.setUTCMonth(parsed.getUTCMonth() + 1);
    return parsed.toISOString();
  }

  if (planType === "yearly") {
    parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
    return parsed.toISOString();
  }

  return null;
}

function toMillisFromIso(isoValue) {
  const parsed = new Date(isoValue).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function pickLaterIso(leftIso, rightIso) {
  const leftMs = toMillisFromIso(leftIso);
  const rightMs = toMillisFromIso(rightIso);

  if (!Number.isFinite(leftMs) && !Number.isFinite(rightMs)) {
    return null;
  }

  if (!Number.isFinite(leftMs)) {
    return rightIso || null;
  }

  if (!Number.isFinite(rightMs)) {
    return leftIso || null;
  }

  return leftMs >= rightMs ? leftIso : rightIso;
}

async function normalizeActiveEntitlementPeriod({ adminClient, payload, userId }) {
  if (!["monthly", "yearly"].includes(payload.plan_type)) {
    return payload;
  }

  if (payload.status !== "active") {
    return payload;
  }

  const nowIso = new Date().toISOString();

  const { data: priorEntitlement } = await adminClient
    .from("subscriptions")
    .select("stripe_subscription_id, current_period_end")
    .eq("user_id", userId)
    .in("status", EXTENSION_BASE_STATUSES)
    .gt("current_period_end", nowIso)
    .neq("stripe_subscription_id", payload.stripe_subscription_id)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const providerStartIso = payload.current_period_start;
  const priorEntitlementEndIso = priorEntitlement?.current_period_end || null;

  // Use the later boundary to avoid accidental backdating when provider and local boundaries differ.
  let normalizedStart =
    pickLaterIso(priorEntitlementEndIso, providerStartIso) || priorEntitlementEndIso || providerStartIso;

  if (!normalizedStart || Number.isNaN(new Date(normalizedStart).getTime())) {
    normalizedStart = nowIso;
  }

  const normalizedEnd = addPlanDurationFromIso(normalizedStart, payload.plan_type);
  if (!normalizedEnd) {
    return payload;
  }

  const resolvedEnd = pickLaterIso(normalizedEnd, payload.current_period_end) || normalizedEnd;

  return {
    ...payload,
    current_period_start: normalizedStart,
    current_period_end: resolvedEnd
  };
}

export async function upsertSubscriptionFromRazorpay({
  adminClient,
  razorpaySubscription,
  userId,
  razorpayCustomerId
}) {
  const planId = razorpaySubscription.plan_id || razorpaySubscription?.plan?.id;
  if (!planId) {
    throw new Error("Missing Razorpay plan id in subscription data.");
  }

  const resolvedUserId = userId || razorpaySubscription?.notes?.user_id;
  if (!resolvedUserId) {
    throw new Error("Missing user_id in Razorpay subscription metadata.");
  }

  const planType = getPlanTypeByPlanId(planId);
  const amountPaise = resolveSubscriptionAmountPaise(razorpaySubscription, planType);
  const status = mapRazorpaySubscriptionStatus(razorpaySubscription.status);

  const payload = {
    user_id: resolvedUserId,
    stripe_customer_id: razorpayCustomerId || razorpaySubscription.customer_id || null,
    stripe_subscription_id: razorpaySubscription.id,
    plan_type: planType,
    amount_paise: amountPaise,
    status,
    current_period_start: toIsoFromUnixSeconds(razorpaySubscription.current_start),
    current_period_end: toIsoFromUnixSeconds(razorpaySubscription.current_end),
    cancel_at_period_end: resolveCancelAtPeriodEnd(razorpaySubscription),
    updated_at: new Date().toISOString()
  };

  const normalizedPayload = await normalizeActiveEntitlementPeriod({
    adminClient,
    payload,
    userId: resolvedUserId
  });

  const { data, error } = await adminClient
    .from("subscriptions")
    .upsert(normalizedPayload, { onConflict: "stripe_subscription_id" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function recordInvoiceLedger({
  adminClient,
  userId,
  subscriptionId,
  providerPaymentId,
  grossAmountPaise,
  charityPercent
}) {
  const { prizePoolAmountPaise, charityAmountPaise, platformAmountPaise } = calculateAllocation({
    grossAmountPaise,
    charityPercent
  });

  const { error } = await adminClient.from("payment_ledger").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    stripe_invoice_id: providerPaymentId,
    gross_amount_paise: grossAmountPaise,
    prize_pool_amount_paise: prizePoolAmountPaise,
    charity_amount_paise: charityAmountPaise,
    platform_amount_paise: platformAmountPaise,
    currency_code: APP_CONSTANTS.currency,
    status: "paid"
  });

  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    throw error;
  }
}

export async function markWebhookEventProcessed({ adminClient, eventId, eventType }) {
  const { error } = await adminClient.from("stripe_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType
  });

  if (error) {
    throw error;
  }
}

export async function isWebhookAlreadyProcessed({ adminClient, eventId }) {
  const { data, error } = await adminClient
    .from("stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
