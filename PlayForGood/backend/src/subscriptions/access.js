export async function getActiveSubscription({ adminClient, userId }) {
  const nowIso = new Date().toISOString();

  const { data, error } = await adminClient
    .from("subscriptions")
    .select(
      "id, stripe_subscription_id, status, plan_type, current_period_start, current_period_end, cancel_at_period_end, updated_at"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("current_period_end", nowIso)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function hasActiveSubscription({ adminClient, userId }) {
  const subscription = await getActiveSubscription({ adminClient, userId });
  return Boolean(subscription);
}
