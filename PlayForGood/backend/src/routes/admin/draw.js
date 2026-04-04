import { Router } from "express";
import { z } from "zod";
import { getCurrentDrawMonth } from "../../utils/date.js";
import { getSupabaseAdminClient } from "../../supabase/client.js";
import { requireAdmin } from "../../middleware/auth.js";
import { publishDraw, simulateDraw } from "../../services/draw-engine.js";
import { sendTransactionalEmail } from "../../services/email.js";
import { ok, badRequest, serverError } from "../../http/responses.js";

const router = Router();

const configSchema = z.object({
  mode: z.enum(["random", "weighted"]),
  weightedStrategy: z.enum(["hot", "cold", "hybrid"]).default("hot")
});

const simulateSchema = z.object({
  drawMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  mode: z.enum(["random", "weighted"]).optional(),
  weightedStrategy: z.enum(["hot", "cold", "hybrid"]).optional()
});

const publishSchema = z.object({
  drawMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  mode: z.enum(["random", "weighted"]).optional(),
  weightedStrategy: z.enum(["hot", "cold", "hybrid"]).optional(),
  numbers: z
    .array(z.number().int().min(1).max(45))
    .length(5)
    .optional()
});

router.get("/config", requireAdmin, async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("draw_config")
      .select("id, mode, weighted_strategy, updated_at")
      .eq("id", 1)
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/config", requireAdmin, async (req, res) => {
  try {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid draw config payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("draw_config")
      .upsert({
        id: 1,
        mode: parsed.data.mode,
        weighted_strategy: parsed.data.weightedStrategy,
        updated_by: req.auth.user.id,
        updated_at: new Date().toISOString()
      })
      .select("id, mode, weighted_strategy, updated_at")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/simulate", requireAdmin, async (req, res) => {
  try {
    const parsed = simulateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return badRequest(res, "Invalid simulation payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data: config } = await adminClient
      .from("draw_config")
      .select("mode, weighted_strategy")
      .eq("id", 1)
      .single();

    const result = await simulateDraw({
      adminClient,
      drawMonth: parsed.data.drawMonth || getCurrentDrawMonth(),
      mode: parsed.data.mode || config?.mode || "random",
      weightedStrategy: parsed.data.weightedStrategy || config?.weighted_strategy || "hot"
    });

    return ok(res, result);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/publish", requireAdmin, async (req, res) => {
  try {
    const parsed = publishSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return badRequest(res, "Invalid publish payload", parsed.error.flatten());
    }

    if (parsed.data.numbers) {
      const unique = new Set(parsed.data.numbers);
      if (unique.size !== 5) {
        return badRequest(res, "Draw numbers must be 5 unique integers.");
      }
    }

    const adminClient = getSupabaseAdminClient();
    const { data: config } = await adminClient
      .from("draw_config")
      .select("mode, weighted_strategy")
      .eq("id", 1)
      .single();

    const result = await publishDraw({
      adminClient,
      drawMonth: parsed.data.drawMonth || getCurrentDrawMonth(),
      mode: parsed.data.mode || config?.mode || "random",
      weightedStrategy: parsed.data.weightedStrategy || config?.weighted_strategy || "hot",
      numbers: parsed.data.numbers
    });

    const { data: entries } = await adminClient.from("draw_entries_snapshot").select("user_id").eq("draw_id", result.draw.id);
    const participantIds = [...new Set((entries || []).map((entry) => entry.user_id))];

    if (participantIds.length) {
      const { data: participants } = await adminClient.from("profiles").select("id, email").in("id", participantIds);

      for (const participant of participants || []) {
        if (!participant.email) {
          continue;
        }

        await sendTransactionalEmail({
          to: participant.email,
          subject: `Draw Results Published - ${result.draw.draw_month}`,
          html: `<p>Draw numbers: ${result.draw.numbers_json.join(", ")}.</p><p>Check your dashboard for your personal match result.</p>`
        });
      }
    }

    const { data: winningRows } = await adminClient
      .from("winnings")
      .select("user_id, match_tier, gross_win_amount_paise")
      .eq("draw_id", result.draw.id);

    const winnerIds = [...new Set((winningRows || []).map((row) => row.user_id))];
    if (winnerIds.length) {
      const { data: winnerProfiles } = await adminClient.from("profiles").select("id, email").in("id", winnerIds);

      for (const winner of winnerProfiles || []) {
        if (!winner.email) {
          continue;
        }

        const winnerRows = (winningRows || []).filter((row) => row.user_id === winner.id);
        const total = winnerRows.reduce((sum, row) => sum + (row.gross_win_amount_paise || 0), 0);

        await sendTransactionalEmail({
          to: winner.email,
          subject: "You Won on PlayForGood",
          html: `<p>Congratulations! You won INR ${(total / 100).toFixed(2)}. Please upload your proof screenshot in dashboard for verification.</p>`
        });
      }
    }

    return ok(res, result);
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
