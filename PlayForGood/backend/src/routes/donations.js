import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { requireAuth } from "../middleware/auth.js";
import { ok, created, badRequest, serverError } from "../http/responses.js";

const router = Router();

const donationSchema = z.object({
  charityId: z.string().uuid(),
  amountRupees: z.number().positive(),
  referenceNote: z.string().max(400).optional(),
  paymentMode: z.enum(["record_only", "razorpay", "stripe"]).default("record_only")
});

router.post("/", async (req, res) => {
  try {
    const parsed = donationSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid donation payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const amountPaise = Math.round(parsed.data.amountRupees * 100);

    const { data, error } = await adminClient
      .from("independent_donations")
      .insert({
        user_id: req.auth?.user?.id || null,
        charity_id: parsed.data.charityId,
        amount_paise: amountPaise,
        currency_code: "INR",
        payment_mode: parsed.data.paymentMode,
        status: parsed.data.paymentMode === "record_only" ? "recorded" : "pending",
        reference_note: parsed.data.referenceNote || null
      })
      .select("id, amount_paise, payment_mode, status, created_at")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return created(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("independent_donations")
      .select("id, amount_paise, currency_code, payment_mode, status, reference_note, created_at, charities(name)")
      .eq("user_id", req.auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { items: data || [] });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("independent_donations")
      .select("id, amount_paise, currency_code, payment_mode, status, reference_note, created_at, charities(name)")
      .eq("user_id", req.auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { items: data || [] });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
