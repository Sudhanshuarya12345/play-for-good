import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const [emailArg, planArg] = process.argv.slice(2);
const targetEmail = String(emailArg || "").trim().toLowerCase();
const targetPlan = String(planArg || "yearly").trim().toLowerCase();

const supportedPlans = new Set(["monthly", "yearly"]);

function usageAndExit(message) {
  console.error(message);
  console.error("Usage: node scripts/normalize-subscription-period.mjs <email> [monthly|yearly]");
  process.exit(1);
}

if (!targetEmail) {
  usageAndExit("Missing required email argument.");
}

if (!supportedPlans.has(targetPlan)) {
  usageAndExit(`Invalid plan type: ${targetPlan}. Use monthly or yearly.`);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

function toMillis(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function addPlanDurationIso(startIso, planType) {
  const parsed = new Date(startIso);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  if (planType === "monthly") {
    parsed.setUTCMonth(parsed.getUTCMonth() + 1);
    return parsed.toISOString();
  }

  if (planType === "yearly") {
    parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
    return parsed.toISOString();
  }

  return "";
}

function pickActiveRowsWithFutureEnd(rows) {
  const nowMs = Date.now();

  return rows
    .filter((row) => row.status === "active" && toMillis(row.current_period_end) > nowMs)
    .sort((left, right) => toMillis(right.current_period_end) - toMillis(left.current_period_end));
}

async function run() {
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("email", targetEmail)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Profile query failed: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error(`Profile not found for email: ${targetEmail}`);
  }

  const { data: subscriptions, error: subscriptionsError } = await adminClient
    .from("subscriptions")
    .select("id, status, plan_type, current_period_start, current_period_end")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });

  if (subscriptionsError) {
    throw new Error(`Subscription query failed: ${subscriptionsError.message}`);
  }

  const rows = Array.isArray(subscriptions) ? subscriptions : [];
  if (!rows.length) {
    throw new Error(`No subscriptions found for email: ${targetEmail}`);
  }

  const activeRows = pickActiveRowsWithFutureEnd(rows);
  if (!activeRows.length) {
    throw new Error(`No active subscriptions with future period end found for email: ${targetEmail}`);
  }

  const targetRows = activeRows.filter((row) => row.plan_type === targetPlan);
  if (!targetRows.length) {
    throw new Error(`No active ${targetPlan} rows found to normalize for email: ${targetEmail}`);
  }

  const primaryTargetRow = targetRows[0];
  const baseRow = activeRows.find((row) => row.id !== primaryTargetRow.id) || null;

  const normalizedStart = baseRow?.current_period_end || primaryTargetRow.current_period_start || new Date().toISOString();
  const normalizedEnd = addPlanDurationIso(normalizedStart, targetPlan);

  if (!normalizedEnd) {
    throw new Error(`Invalid normalized period start: ${normalizedStart}`);
  }

  const { error: primaryUpdateError } = await adminClient
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: normalizedStart,
      current_period_end: normalizedEnd,
      updated_at: new Date().toISOString()
    })
    .eq("id", primaryTargetRow.id);

  if (primaryUpdateError) {
    throw new Error(`Primary ${targetPlan} update failed: ${primaryUpdateError.message}`);
  }

  const duplicateTargetIds = targetRows.slice(1).map((row) => row.id);

  if (duplicateTargetIds.length) {
    const { error: duplicateCleanupError } = await adminClient
      .from("subscriptions")
      .update({
        status: "lapsed",
        updated_at: new Date().toISOString()
      })
      .in("id", duplicateTargetIds);

    if (duplicateCleanupError) {
      throw new Error(`Duplicate ${targetPlan} cleanup failed: ${duplicateCleanupError.message}`);
    }
  }

  console.log("Normalized subscription extension data");
  console.log(
    JSON.stringify(
      {
        email: targetEmail,
        targetPlan,
        primaryTargetSubscriptionId: primaryTargetRow.id,
        baseSubscriptionId: baseRow?.id || null,
        normalizedStart,
        normalizedEnd,
        duplicateTargetsLapsed: duplicateTargetIds.length,
        activeSubscriptionsScanned: activeRows.length,
        targetPlanSubscriptionsScanned: targetRows.length
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
