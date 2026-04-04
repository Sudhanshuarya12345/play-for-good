import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { requireAuth } from "../middleware/auth.js";
import { ok, badRequest, serverError } from "../http/responses.js";

const router = Router();
const WINNER_PROOF_BUCKET = "winner-proofs";

const submitProofSchema = z.object({
  proofFilePath: z.string().min(5)
});

async function ensureWinnerProofBucket(adminClient) {
  const { error } = await adminClient.storage.createBucket(WINNER_PROOF_BUCKET, {
    public: false
  });

  if (!error) {
    return;
  }

  const message = String(error.message || "").toLowerCase();
  if (message.includes("already exists") || message.includes("duplicate")) {
    return;
  }

  throw new Error(error.message || "Unable to initialize winner proofs bucket");
}

router.get("/me", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("winnings")
      .select("id, draw_id, match_count, match_tier, gross_win_amount_paise, verification_status, payment_status, proof_file_path, created_at")
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

router.post("/:id/proof/upload-url", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();

    await ensureWinnerProofBucket(adminClient);

    const { data: winning, error } = await adminClient
      .from("winnings")
      .select("id")
      .eq("id", req.params.id)
      .eq("user_id", req.auth.user.id)
      .maybeSingle();

    if (error || !winning) {
      return badRequest(res, "Winning record not found");
    }

    const objectPath = `${req.auth.user.id}/${req.params.id}-${Date.now()}.png`;
    const { data: signed, error: signedError } = await adminClient.storage
      .from(WINNER_PROOF_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signedError) {
      return badRequest(res, signedError.message);
    }

    return ok(res, {
      path: objectPath,
      token: signed.token,
      signedUrl: signed.signedUrl
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/:id/proof/submit", requireAuth, async (req, res) => {
  try {
    const parsed = submitProofSchema.safeParse(req.body);

    if (!parsed.success) {
      return badRequest(res, "Invalid proof submission payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("winnings")
      .update({
        proof_file_path: parsed.data.proofFilePath,
        verification_status: "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", req.params.id)
      .eq("user_id", req.auth.user.id)
      .select("id, verification_status, payment_status, proof_file_path")
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
