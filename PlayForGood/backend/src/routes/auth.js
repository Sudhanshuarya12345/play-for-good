import { Router } from "express";
import { z } from "zod";
import dns from "node:dns/promises";
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

function getFieldFirstError(fieldErrors, fieldName) {
  const errors = fieldErrors?.[fieldName];
  if (!Array.isArray(errors) || errors.length === 0) {
    return "";
  }

  return String(errors[0] || "").trim();
}

function buildSignupValidationMessage(zodError) {
  const flattened = zodError.flatten();
  const fieldErrors = flattened.fieldErrors || {};

  const emailError = getFieldFirstError(fieldErrors, "email");
  const passwordError = getFieldFirstError(fieldErrors, "password");
  const fullNameError = getFieldFirstError(fieldErrors, "fullName");
  const charityPercentError = getFieldFirstError(fieldErrors, "charityPercent");

  const hints = [];
  if (emailError) {
    hints.push("enter a valid email address");
  }
  if (passwordError) {
    hints.push("use a password with at least 8 characters");
  }
  if (fullNameError) {
    hints.push("enter your full name (minimum 2 characters)");
  }
  if (charityPercentError) {
    hints.push(`choose charity contribution between ${APP_CONSTANTS.minCharityPercent}% and 40%`);
  }

  if (!hints.length) {
    return "Please check your signup details and try again.";
  }

  return `Please ${hints.join(", ")}.`;
}

function buildLoginValidationMessage(zodError) {
  const flattened = zodError.flatten();
  const fieldErrors = flattened.fieldErrors || {};

  const emailError = getFieldFirstError(fieldErrors, "email");
  const passwordError = getFieldFirstError(fieldErrors, "password");

  if (emailError && passwordError) {
    return "Please enter a valid email and a password with at least 8 characters.";
  }

  if (emailError) {
    return "Please enter a valid email address.";
  }

  if (passwordError) {
    return "Please enter a password with at least 8 characters.";
  }

  return "Please check your login details and try again.";
}

router.post("/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, buildSignupValidationMessage(parsed.error), parsed.error.flatten());
    }

    const domain = parsed.data.email.split("@")[1];
    if (!domain) {
      return badRequest(res, "Invalid email domain");
    }

    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) {
        return badRequest(res, "Invalid email address (domain does not accept emails).");
      }
    } catch (dnsError) {
      return badRequest(res, "Invalid email address (domain does not exist or rejects mail).");
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
      return badRequest(res, buildLoginValidationMessage(parsed.error), parsed.error.flatten());
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
