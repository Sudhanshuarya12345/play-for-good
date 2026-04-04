export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

function isMissingPublicTableMessage(message) {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("could not find the table 'public.") && normalized.includes("schema cache");
}

export function badRequest(res, message, details = null) {
  if (isMissingPublicTableMessage(message)) {
    return res.status(503).json({
      success: false,
      error: {
        code: "SETUP_REQUIRED",
        message: "Supabase schema is not initialized. Run backend/supabase/schema.sql, then backend/supabase/seed.sql in your Supabase project.",
        details
      }
    });
  }

  return res.status(400).json({
    success: false,
    error: {
      code: "BAD_REQUEST",
      message,
      details
    }
  });
}

export function unauthorized(res, message = "Authentication required") {
  return res.status(401).json({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message
    }
  });
}

export function forbidden(res, message = "Access denied") {
  return res.status(403).json({
    success: false,
    error: {
      code: "FORBIDDEN",
      message
    }
  });
}

export function serverError(res, message = "Unexpected server error") {
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message
    }
  });
}
