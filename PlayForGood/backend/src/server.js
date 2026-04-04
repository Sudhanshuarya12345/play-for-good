import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import charitiesRoutes from "./routes/charities.js";
import scoresRoutes from "./routes/scores.js";
import subscriptionsRoutes from "./routes/subscriptions.js";
import drawsRoutes from "./routes/draws.js";
import donationsRoutes from "./routes/donations.js";
import userRoutes from "./routes/user.js";
import winningsRoutes from "./routes/winnings.js";
import webhooksRoutes from "./routes/webhooks.js";
import adminDrawRoutes from "./routes/admin/draw.js";
import adminUsersRoutes from "./routes/admin/users.js";
import adminCharitiesRoutes from "./routes/admin/charities.js";
import adminWinningsRoutes from "./routes/admin/winnings.js";
import adminReportsRoutes from "./routes/admin/reports.js";

const app = express();

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function originMatchesPattern(origin, pattern) {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedPattern = normalizeOrigin(pattern);

  if (!normalizedPattern.includes("*")) {
    return normalizedOrigin === normalizedPattern;
  }

  const escaped = normalizedPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(normalizedOrigin);
}

const allowedOrigins = [
  env.FRONTEND_URL,
  ...env.FRONTEND_URLS.split(",")
]
  .map((value) => normalizeOrigin(value))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowed = allowedOrigins.some((pattern) => originMatchesPattern(origin, pattern));
      return callback(null, allowed);
    },
    credentials: true
  })
);

app.use(helmet());
app.use(cookieParser());
app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);

app.use("/api/webhooks/razorpay", express.raw({ type: "application/json" }));
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/api", express.json({ limit: "1mb" }));
app.use("/api", express.urlencoded({ extended: true }));
app.use(attachUser);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "playforgood-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/charities", charitiesRoutes);
app.use("/api/scores", scoresRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/draws", drawsRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/winnings", winningsRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use("/api/admin/draw", adminDrawRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/charities", adminCharitiesRoutes);
app.use("/api/admin/winnings", adminWinningsRoutes);
app.use("/api/admin/reports", adminReportsRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`PlayForGood backend running on port ${env.PORT}`);
});
