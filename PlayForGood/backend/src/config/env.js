import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const parseEnvBoolean = z.string().optional().transform((value) => {
  const normalized = (value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
});

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  FRONTEND_URLS: z.string().default(""),
  APP_URL: z.string().url().default("http://localhost:4000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RAZORPAY_ENABLED: parseEnvBoolean,
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_MONTHLY_PLAN_ID: z.string().optional(),
  RAZORPAY_YEARLY_PLAN_ID: z.string().optional(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  APP_CURRENCY: z.string().default("INR"),
  APP_PRIZE_POOL_PERCENT: z.coerce.number().int().min(1).max(100).default(60),
  APP_MIN_CHARITY_PERCENT: z.coerce.number().int().min(1).max(100).default(10)
}).superRefine((value, ctx) => {
  if (!value.RAZORPAY_ENABLED) {
    return;
  }

  const required = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "RAZORPAY_MONTHLY_PLAN_ID",
    "RAZORPAY_YEARLY_PLAN_ID"
  ];

  for (const key of required) {
    if (!value[key] || !String(value[key]).trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required when RAZORPAY_ENABLED=true`
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const reasons = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${reasons}`);
}

export const env = parsed.data;
