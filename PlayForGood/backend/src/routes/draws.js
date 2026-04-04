import { Router } from "express";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { ok, badRequest, serverError } from "../http/responses.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 12), 24);

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("draws")
      .select("id, draw_month, mode, numbers_json, status, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { items: data || [] });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data: draw, error } = await adminClient
      .from("draws")
      .select("id, draw_month, mode, numbers_json, status, published_at")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) {
      return badRequest(res, error.message);
    }

    if (!draw) {
      return badRequest(res, "Draw not found");
    }

    let personalResult = null;
    if (req.auth?.user) {
      const { data: winning } = await adminClient
        .from("winnings")
        .select("id, match_count, match_tier, gross_win_amount_paise, verification_status, payment_status")
        .eq("draw_id", draw.id)
        .eq("user_id", req.auth.user.id)
        .maybeSingle();

      personalResult = winning || null;
    }

    return ok(res, { draw, personalResult });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
