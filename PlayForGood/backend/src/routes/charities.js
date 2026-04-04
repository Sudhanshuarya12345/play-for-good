import { Router } from "express";
import { getSupabaseAdminClient } from "../supabase/client.js";
import { ok, badRequest, serverError } from "../http/responses.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const page = Number(req.query.page || 1);
    const pageSize = Math.min(Number(req.query.pageSize || 12), 24);

    if (page < 1 || pageSize < 1) {
      return badRequest(res, "Invalid pagination params");
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const adminClient = getSupabaseAdminClient();

    let dbQuery = adminClient
      .from("charities")
      .select("id, name, slug, short_description, image_url, is_featured", { count: "exact" })
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true })
      .range(from, to);

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,short_description.ilike.%${query}%`);
    }

    const { data, count, error } = await dbQuery;

    if (error) {
      return badRequest(res, error.message);
    }

    return ok(res, {
      items: data || [],
      page,
      pageSize,
      total: count || 0
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data: charity, error } = await adminClient
      .from("charities")
      .select("id, name, slug, short_description, long_description, image_url, is_featured")
      .eq("slug", req.params.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return badRequest(res, error.message);
    }

    if (!charity) {
      return badRequest(res, "Charity not found");
    }

    const { data: events } = await adminClient
      .from("charity_events")
      .select("id, title, details, event_date, location, image_url")
      .eq("charity_id", charity.id)
      .order("event_date", { ascending: true });

    return ok(res, {
      ...charity,
      events: events || []
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
