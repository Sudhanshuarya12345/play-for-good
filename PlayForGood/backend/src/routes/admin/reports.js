import { Router } from "express";
import { getSupabaseAdminClient } from "../../supabase/client.js";
import { requireAdmin } from "../../middleware/auth.js";
import { ok, serverError } from "../../http/responses.js";

const router = Router();

router.get("/overview", requireAdmin, async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const [usersRes, ledgerRes, donationsRes, drawsRes, winningsRes, activeSubscriptionsRes, rolloversRes] = await Promise.all([
      adminClient.from("profiles").select("id", { count: "exact", head: true }),
      adminClient.from("payment_ledger").select("prize_pool_amount_paise, charity_amount_paise"),
      adminClient.from("independent_donations").select("amount_paise"),
      adminClient.from("draws").select("id", { count: "exact", head: true }),
      adminClient.from("winnings").select("gross_win_amount_paise, payment_status, verification_status"),
      adminClient
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("current_period_end", nowIso),
      adminClient.from("jackpot_rollovers").select("carry_amount_paise").eq("settled", false)
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
    const pendingVerificationCount = (winningsRes.data || []).filter((row) => row.verification_status === "pending").length;
    const pendingPayoutCount = (winningsRes.data || []).filter(
      (row) => row.verification_status === "approved" && row.payment_status === "pending"
    ).length;
    const unsettledRolloverPaise = (rolloversRes.data || []).reduce((sum, row) => sum + (row.carry_amount_paise || 0), 0);

    return ok(res, {
      totalUsers: usersRes.count || 0,
      totalDraws: drawsRes.count || 0,
      activeSubscribers: activeSubscriptionsRes.count || 0,
      totalPrizePoolPaise: prizePoolPaise,
      totalCharityPaise: charityFromSubscriptionsPaise + charityIndependentPaise,
      totalPaidOutPaise: paidOutPaise,
      pendingVerificationCount,
      pendingPayoutCount,
      unsettledRolloverPaise
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
