import { getSupabaseAdminClient, getSupabaseAnonClient } from "../supabase/client.js";
import { unauthorized, forbidden, serverError } from "../http/responses.js";

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return req.cookies?.access_token || null;
}

export async function attachUser(req, _res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      req.auth = { user: null, token: null };
      return next();
    }

    const supabaseAnon = getSupabaseAnonClient(token);
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data?.user) {
      req.auth = { user: null, token: null };
      return next();
    }

    req.auth = { user: data.user, token };
    return next();
  } catch (error) {
    return serverError(_res, error.message);
  }
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return unauthorized(res);
  }

  return next();
}

export async function requireAdmin(req, res, next) {
  if (!req.auth?.user) {
    return unauthorized(res);
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", req.auth.user.id)
      .single();

    if (error || data?.role !== "admin") {
      return forbidden(res);
    }

    req.auth.role = "admin";
    return next();
  } catch (error) {
    return serverError(res, error.message);
  }
}
