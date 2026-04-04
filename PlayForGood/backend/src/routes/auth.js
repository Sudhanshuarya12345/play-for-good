import { Router } from "express";
import { z } from "zod";
import { APP_CONSTANTS } from "../constants/app.js";
import { env } from "../config/env.js";
import { getSupabaseAdminClient, getSupabaseAnonClient } from "../supabase/client.js";
import { created, ok, badRequest, unauthorized, serverError } from "../http/responses.js";
import { buildWelcomeEmailHtml, sendTransactionalEmail } from "../services/email.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(120).optional(),
  selectedCharityId: z.string().uuid().optional(),
  charityPercent: z
    .number()
    .int()
    .min(APP_CONSTANTS.minCharityPercent)
    .max(40)
    .optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post("/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid signup payload", parsed.error.flatten());
    }

    const adminClient = getSupabaseAdminClient();

    // Validate core schema availability before creating an auth user.
    const { error: profileTableError } = await adminClient.from("profiles").select("id").limit(1);
    if (profileTableError) {
      return badRequest(res, profileTableError.message);
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName || null
      }
    });

    if (error || !data.user) {
      return badRequest(res, error?.message || "Could not create user");
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: data.user.id,
        email: parsed.data.email,
        full_name: parsed.data.fullName || null,
        selected_charity_id: parsed.data.selectedCharityId || null,
        charity_percent: parsed.data.charityPercent || APP_CONSTANTS.minCharityPercent,
        currency_code: "INR",
        country_code: "IN"
      })
      .select("id")
      .single();

    if (profileError) {
      await adminClient.auth.admin.deleteUser(data.user.id);
      return badRequest(res, profileError.message);
    }

    await sendTransactionalEmail({
      to: parsed.data.email,
      subject: "Welcome to PlayForGood",
      html: buildWelcomeEmailHtml({
        dashboardUrl: `${env.APP_URL.replace(/\/$/, "")}/dashboard`
      })
    });

    return created(res, {
      userId: data.user.id,
      email: data.user.email,
      confirmationSent: true
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Invalid login payload", parsed.error.flatten());
    }

    const anonClient = getSupabaseAnonClient();
    const { data, error } = await anonClient.auth.signInWithPassword(parsed.data);

    if (error || !data.session) {
      return badRequest(res, error?.message || "Invalid credentials");
    }

    res.cookie("access_token", data.session.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return ok(res, {
      userId: data.user?.id,
      email: data.user?.email,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  return ok(res, { loggedOut: true });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role, selected_charity_id, charity_percent, currency_code")
      .eq("id", req.auth.user.id)
      .maybeSingle();

    if (!req.auth.user) {
      return unauthorized(res);
    }

    return ok(res, {
      user: req.auth.user,
      profile: profile || null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
