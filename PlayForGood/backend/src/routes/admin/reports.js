import { Router } from "express";
import { getSupabaseAdminClient } from "../../supabase/client.js";
import { requireAdmin } from "../../middleware/auth.js";
import { ok, serverError } from "../../http/responses.js";

const router = Router();

router.get("/overview", requireAdmin, async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const [usersRes, ledgerRes, donationsRes, drawsRes, winningsRes] = await Promise.all([
      adminClient.from("profiles").select("id", { count: "exact", head: true }),
      adminClient.from("payment_ledger").select("prize_pool_amount_paise, charity_amount_paise"),
      adminClient.from("independent_donations").select("amount_paise"),
      adminClient.from("draws").select("id", { count: "exact", head: true }),
      adminClient.from("winnings").select("gross_win_amount_paise, payment_status")
    ]);

    const prizePoolPaise = (ledgerRes.data || []).reduce((sum, row) => sum + (row.prize_pool_amount_paise || 0), 0);
    const charityFromSubscriptionsPaise = (ledgerRes.data || []).reduce(
      (sum, row) => sum + (row.charity_amount_paise || 0),
      0
    );
    const charityIndependentPaise = (donationsRes.data || []).reduce((sum, row) => sum + (row.amount_paise || 0), 0);
    const paidOutPaise = (winningsRes.data || [])
      .filter((row) => row.payment_status === "paid")
      .reduce((sum, row) => sum + (row.gross_win_amount_paise || 0), 0);

    return ok(res, {
      totalUsers: usersRes.count || 0,
      totalDraws: drawsRes.count || 0,
      totalPrizePoolPaise: prizePoolPaise,
      totalCharityPaise: charityFromSubscriptionsPaise + charityIndependentPaise,
      totalPaidOutPaise: paidOutPaise
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
