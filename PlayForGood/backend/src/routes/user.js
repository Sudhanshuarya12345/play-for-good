import { Router } from "express";
import { z } from "zod";
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

export default router;
