import { Router } from "express";
import { z } from "zod";
import { APP_CONSTANTS } from "../constants/app.js";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { hasActiveSubscription } from "../subscriptions/access.js";
import { ok, created, badRequest, forbidden, serverError } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const scoreSchema = z.object({
  scoreValue: z.number().int().min(APP_CONSTANTS.minStableford).max(APP_CONSTANTS.maxStableford),
  playedOn: z.string().date()
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const active = await hasActiveSubscription({ adminClient, userId: req.auth.user.id });

    if (!active) {
      return forbidden(res, "An active subscription is required to access score management");
    }

    const { data, error } = await adminClient
      .from("scores")
      .select("id, score_value, played_on, inserted_at")
      .eq("user_id", req.auth.user.id)
      .order("played_on", { ascending: false })
      .order("inserted_at", { ascending: false })
      .limit(APP_CONSTANTS.maxStoredScores);

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { items: data || [] });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid score payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const active = await hasActiveSubscription({ adminClient, userId: req.auth.user.id });

    if (!active) {
      return forbidden(res, "An active subscription is required to submit scores");
    }

    const { data, error } = await adminClient
      .from("scores")
      .insert({
        user_id: req.auth.user.id,
        score_value: parsed.data.scoreValue,
        played_on: parsed.data.playedOn
      })
      .select("id, score_value, played_on, inserted_at")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return created(res, { score: data });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid score update payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const active = await hasActiveSubscription({ adminClient, userId: req.auth.user.id });

    if (!active) {
      return forbidden(res, "An active subscription is required to edit scores");
    }

    const { data: existing, error: existingError } = await adminClient
      .from("scores")
      .select("id, user_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (existingError || !existing) {
      return badRequest(res, "Score not found");
    }

    if (existing.user_id !== req.auth.user.id) {
      return forbidden(res, "You can edit only your own scores");
    }

    const { data, error } = await adminClient
      .from("scores")
      .update({
        score_value: parsed.data.scoreValue,
        played_on: parsed.data.playedOn
      })
      .eq("id", req.params.id)
      .eq("user_id", req.auth.user.id)
      .select("id, score_value, played_on, inserted_at")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { score: data });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
