import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdminClient } from "../../supabase/client.js";
import { requireAdmin } from "../../middleware/auth.js";
import { ok, badRequest, serverError } from "../../http/responses.js";

const router = Router();

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  role: z.enum(["admin", "subscriber"]).optional(),
  charityPercent: z.number().int().min(10).max(40).optional(),
  selectedCharityId: z.string().uuid().nullable().optional()
});

const subscriptionOverrideSchema = z.object({
  planType: z.enum(["monthly", "yearly"]),
  status: z.enum(["inactive", "active", "canceled", "past_due", "unpaid", "incomplete", "lapsed"]),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean().default(false)
});

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role, charity_percent, selected_charity_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return badRequest(res, error.message);
    }

    const profiles = data || [];
    if (!profiles.length) {
      return ok(res, { items: [] });
    }

    const userIds = profiles.map((profile) => profile.id);
    const { data: subscriptions, error: subscriptionsError } = await adminClient
      .from("subscriptions")
      .select("id, user_id, status, plan_type, current_period_start, current_period_end, cancel_at_period_end, updated_at")
      .in("user_id", userIds)
      .order("updated_at", { ascending: false });

    if (subscriptionsError) {
      return badRequest(res, subscriptionsError.message);
    }

    const latestByUser = new Map();
    for (const subscription of subscriptions || []) {
      if (!latestByUser.has(subscription.user_id)) {
        latestByUser.set(subscription.user_id, subscription);
      }
    }

    const items = profiles.map((profile) => ({
      ...profile,
      latest_subscription: latestByUser.get(profile.id) || null
    }));

    return ok(res, { items });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid user update payload", parsed.error.flatten());
    }

    const payload = {};
    if (typeof parsed.data.fullName !== "undefined") payload.full_name = parsed.data.fullName;
    if (typeof parsed.data.role !== "undefined") payload.role = parsed.data.role;
    if (typeof parsed.data.charityPercent !== "undefined") payload.charity_percent = parsed.data.charityPercent;
    if (typeof parsed.data.selectedCharityId !== "undefined") payload.selected_charity_id = parsed.data.selectedCharityId;
    payload.updated_at = new Date().toISOString();

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .update(payload)
      .eq("id", req.params.id)
      .select("id, email, full_name, role, charity_percent, selected_charity_id")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/:id/subscription", requireAdmin, async (req, res) => {
  try {
    const parsed = subscriptionOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid subscription override payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const amountPaise = parsed.data.planType === "monthly" ? 49900 : 499900;

    const { data: existing } = await adminClient
      .from("subscriptions")
      .select("id")
      .eq("user_id", req.params.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let query;

    if (existing?.id) {
      query = adminClient
        .from("subscriptions")
        .update({
          plan_type: parsed.data.planType,
          amount_paise: amountPaise,
          status: parsed.data.status,
          current_period_start: parsed.data.currentPeriodStart,
          current_period_end: parsed.data.currentPeriodEnd,
          cancel_at_period_end: parsed.data.cancelAtPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      query = adminClient.from("subscriptions").insert({
        user_id: req.params.id,
        plan_type: parsed.data.planType,
        amount_paise: amountPaise,
        status: parsed.data.status,
        current_period_start: parsed.data.currentPeriodStart,
        current_period_end: parsed.data.currentPeriodEnd,
        cancel_at_period_end: parsed.data.cancelAtPeriodEnd,
        updated_at: new Date().toISOString()
      });
    }

    const { data, error } = await query
      .select("id, user_id, status, plan_type, current_period_start, current_period_end, cancel_at_period_end")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
