import { Router } from "express";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { ok, serverError } from "../http/responses.js";

const router = Router();

router.get("/home", async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();

    const [{ data: featured }, { data: draw }, { data: stats }] = await Promise.all([
      adminClient
        .from("charities")
        .select("id, name, slug, short_description, image_url")
        .eq("is_featured", true)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("draws")
        .select("id, draw_month, numbers_json, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("payment_ledger")
        .select("prize_pool_amount_paise, charity_amount_paise")
    ]);

    const totals = (stats || []).reduce(
      (acc, row) => {
        acc.prizePoolPaise += row.prize_pool_amount_paise || 0;
        acc.charityPaise += row.charity_amount_paise || 0;
        return acc;
      },
      { prizePoolPaise: 0, charityPaise: 0 }
    );

    return ok(res, {
      featuredCharity: featured || null,
      latestDraw: draw || null,
      totals
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
