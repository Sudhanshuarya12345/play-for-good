import { Router } from "express";
import { z } from "zod";
import { getSupabaseAdminClient } from "../../supabase/client.js";
import { requireAdmin } from "../../middleware/auth.js";
import { ok, created, badRequest, serverError } from "../../http/responses.js";

const router = Router();

const charitySchema = z.object({
  name: z.string().min(2).max(180),
  slug: z.string().min(2).max(180),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(30),
  imageUrl: z.string().url().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const updateCharitySchema = z.object({
  name: z.string().min(2).max(180).optional(),
  slug: z.string().min(2).max(180).optional(),
  shortDescription: z.string().min(10).optional(),
  longDescription: z.string().min(30).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional()
});

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("charities")
      .select("id, name, slug, short_description, image_url, is_featured, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { items: data || [] });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = charitySchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid charity payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("charities")
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        short_description: parsed.data.shortDescription,
        long_description: parsed.data.longDescription,
        image_url: parsed.data.imageUrl || null,
        is_featured: parsed.data.isFeatured || false,
        is_active: parsed.data.isActive ?? true
      })
      .select("id, name, slug, short_description, image_url, is_featured, is_active")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return created(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = updateCharitySchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid charity update payload", parsed.error.flatten());
    }

    const payload = {};
    if (typeof parsed.data.name !== "undefined") payload.name = parsed.data.name;
    if (typeof parsed.data.slug !== "undefined") payload.slug = parsed.data.slug;
    if (typeof parsed.data.shortDescription !== "undefined") payload.short_description = parsed.data.shortDescription;
    if (typeof parsed.data.longDescription !== "undefined") payload.long_description = parsed.data.longDescription;
    if (typeof parsed.data.imageUrl !== "undefined") payload.image_url = parsed.data.imageUrl;
    if (typeof parsed.data.isFeatured !== "undefined") payload.is_featured = parsed.data.isFeatured;
    if (typeof parsed.data.isActive !== "undefined") payload.is_active = parsed.data.isActive;
    payload.updated_at = new Date().toISOString();

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("charities")
      .update(payload)
      .eq("id", req.params.id)
      .select("id, name, slug, short_description, image_url, is_featured, is_active")
      .single();

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, data);
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient.from("charities").delete().eq("id", req.params.id);

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, { deleted: true });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
