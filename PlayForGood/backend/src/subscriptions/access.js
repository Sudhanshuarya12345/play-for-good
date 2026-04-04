export async function getActiveSubscription({ adminClient, userId }) {
  const { data, error } = await adminClient
    .from("subscriptions")
    .select("id, status, plan_type, current_period_end")
    .eq("user_id", userId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
  const activeByStatus = data.status === "active";
  const activeByDate = currentPeriodEnd ? currentPeriodEnd.getTime() > Date.now() : false;

  if (activeByStatus && activeByDate) {
    return data;
  }

  return null;
}

export async function hasActiveSubscription({ adminClient, userId }) {
  const subscription = await getActiveSubscription({ adminClient, userId });
  return Boolean(subscription);
}
