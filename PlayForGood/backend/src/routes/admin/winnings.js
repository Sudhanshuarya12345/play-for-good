import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdminClient } from "../../supabase/client.js";
import { sendTransactionalEmail } from "../../services/email.js";
import { requireAdmin } from "../../middleware/auth.js";
import { ok, badRequest, serverError } from "../../http/responses.js";

const router = Router();

const verificationSchema = z.object({
  decision: z.enum(["approved", "rejected"])
});

const paymentSchema = z.object({
  paymentStatus: z.enum(["pending", "paid"])
});

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("winnings")
      .select("id, draw_id, user_id, match_count, match_tier, gross_win_amount_paise, verification_status, payment_status, proof_file_path, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { items: data || [] });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/:id/verification", requireAdmin, async (req, res) => {
  try {
    const parsed = verificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid verification payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("winnings")
      .update({
        verification_status: parsed.data.decision,
        updated_at: new Date().toISOString()
      })
      .eq("id", req.params.id)
      .select("id, user_id, verification_status, payment_status")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    const { data: profile } = await adminClient.from("profiles").select("email").eq("id", data.user_id).maybeSingle();

    if (profile?.email) {
      await sendTransactionalEmail({
        to: profile.email,
        subject: `Winner Verification ${parsed.data.decision.toUpperCase()}`,
        html: `<p>Your winner verification request has been ${parsed.data.decision}.</p>`
      });
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/:id/payment", requireAdmin, async (req, res) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid payout payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data: existing } = await adminClient
      .from("winnings")
      .select("id, user_id, verification_status")
      .eq("id", req.params.id)
      .single();

    if (!existing) {
      return badRequest(res, "Winning record not found");
    }

    if (parsed.data.paymentStatus === "paid" && existing.verification_status !== "approved") {
      return badRequest(res, "Cannot mark paid before winner verification is approved.");
    }

    const { data, error } = await adminClient
      .from("winnings")
      .update({
        payment_status: parsed.data.paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", req.params.id)
      .select("id, user_id, verification_status, payment_status")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    if (parsed.data.paymentStatus === "paid") {
      const { data: profile } = await adminClient.from("profiles").select("email").eq("id", data.user_id).maybeSingle();
      if (profile?.email) {
        await sendTransactionalEmail({
          to: profile.email,
          subject: "Prize Payout Completed",
          html: "<p>Your prize payout status is now marked as paid.</p>"
        });
      }
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
