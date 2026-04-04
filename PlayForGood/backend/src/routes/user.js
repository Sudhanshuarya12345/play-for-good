import { Router } from "express";
import { z } from "zod";
import { getCurrentDrawMonth, getNextDrawMonth } from "../utils/date.js";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { requireAuth } from "../middleware/auth.js";
import { ok, badRequest, serverError } from "../http/responses.js";

const router = Router();

const charityPreferenceSchema = z.object({
  selectedCharityId: z.string().uuid(),
  charityPercent: z.number().int().min(10).max(40)
});

router.get("/charity", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("selected_charity_id, charity_percent")
      .eq("id", req.auth.user.id)
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/charity", requireAuth, async (req, res) => {
  try {
    const parsed = charityPreferenceSchema.safeParse(req.body);

    if (!parsed.success) {
      return badRequest(res, "Invalid charity preference payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .update({
        selected_charity_id: parsed.data.selectedCharityId,
        charity_percent: parsed.data.charityPercent,
        updated_at: new Date().toISOString()
      })
      .eq("id", req.auth.user.id)
      .select("selected_charity_id, charity_percent")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get("/participation-summary", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const userId = req.auth.user.id;

    const [entriesCountRes, latestEntryRes, latestPublishedDrawRes, winningsRes] = await Promise.all([
      adminClient.from("draw_entries_snapshot").select("id", { count: "exact", head: true }).eq("user_id", userId),
      adminClient
        .from("draw_entries_snapshot")
        .select("draw_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("draws")
        .select("draw_month")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("winnings")
        .select("gross_win_amount_paise, verification_status, payment_status")
        .eq("user_id", userId)
    ]);

    if (entriesCountRes.error) {
      return badRequest(res, entriesCountRes.error.message);
    }

    if (latestEntryRes.error) {
      return badRequest(res, latestEntryRes.error.message);
    }

    if (latestPublishedDrawRes.error) {
      return badRequest(res, latestPublishedDrawRes.error.message);
    }

    if (winningsRes.error) {
      return badRequest(res, winningsRes.error.message);
    }

    let lastEnteredDrawMonth = null;
    if (latestEntryRes.data?.draw_id) {
      const { data: lastDraw, error: lastDrawError } = await adminClient
        .from("draws")
        .select("draw_month")
        .eq("id", latestEntryRes.data.draw_id)
        .maybeSingle();

      if (lastDrawError) {
        return badRequest(res, lastDrawError.message);
      }

      lastEnteredDrawMonth = lastDraw?.draw_month || null;
    }

    const latestPublishedMonth = latestPublishedDrawRes.data?.draw_month || null;
    const upcomingDrawMonth = latestPublishedMonth ? getNextDrawMonth(latestPublishedMonth) : getCurrentDrawMonth();
    const winningRows = winningsRes.data || [];

    const totalWonPaise = winningRows.reduce((sum, row) => sum + (row.gross_win_amount_paise || 0), 0);
    const pendingVerificationCount = winningRows.filter((row) => row.verification_status === "pending").length;
    const pendingPayoutCount = winningRows.filter(
      (row) => row.verification_status === "approved" && row.payment_status === "pending"
    ).length;

    return ok(res, {
      drawsEntered: entriesCountRes.count || 0,
      winsCount: winningRows.length,
      totalWonPaise,
      pendingVerificationCount,
      pendingPayoutCount,
      lastEnteredDrawMonth,
      lastPublishedDrawMonth: latestPublishedMonth,
      upcomingDrawMonth
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
