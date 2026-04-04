import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";

const SUBSCRIPTION_STATUSES = ["inactive", "active", "canceled", "past_due", "unpaid", "incomplete", "lapsed"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeInput(isoValue) {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoString(localValue) {
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function defaultSubscriptionDraft() {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    planType: "monthly",
    status: "inactive",
    currentPeriodStart: toLocalDateTimeInput(start.toISOString()),
    currentPeriodEnd: toLocalDateTimeInput(end.toISOString()),
    cancelAtPeriodEnd: false
  };
}

function makeProfileDraft(row) {
  return {
    fullName: row.full_name || "",
    role: row.role || "subscriber",
    charityPercent: row.charity_percent || 10,
    selectedCharityId: row.selected_charity_id || ""
  };
}

function makeSubscriptionDraft(row) {
  const latest = row.latest_subscription;
  if (!latest) {
    return defaultSubscriptionDraft();
  }

  return {
    planType: latest.plan_type || "monthly",
    status: latest.status || "inactive",
    currentPeriodStart: toLocalDateTimeInput(latest.current_period_start),
    currentPeriodEnd: toLocalDateTimeInput(latest.current_period_end),
    cancelAtPeriodEnd: Boolean(latest.cancel_at_period_end)
  };
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [charities, setCharities] = useState([]);
  const [search, setSearch] = useState("");
  const [profileEditUserId, setProfileEditUserId] = useState("");
  const [subscriptionEditUserId, setSubscriptionEditUserId] = useState("");
  const [profileDraft, setProfileDraft] = useState(makeProfileDraft({}));
  const [subscriptionDraft, setSubscriptionDraft] = useState(defaultSubscriptionDraft());
  const [savingProfileUserId, setSavingProfileUserId] = useState("");
  const [savingSubscriptionUserId, setSavingSubscriptionUserId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [usersData, charitiesData] = await Promise.all([
        apiRequest("/admin/users", { method: "GET" }),
        apiRequest("/admin/charities", { method: "GET" })
      ]);

      setRows(usersData.items || []);
      setCharities(charitiesData.items || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load admin user management data");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = `${row.full_name || ""} ${row.email || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  async function saveProfile(userId) {
    const trimmedName = profileDraft.fullName.trim();
    if (trimmedName.length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    try {
      setSavingProfileUserId(userId);
      setMessage("");
      setError("");

      await apiRequest(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: trimmedName,
          role: profileDraft.role,
          charityPercent: Number(profileDraft.charityPercent),
          selectedCharityId: profileDraft.selectedCharityId || null
        })
      });

      setProfileEditUserId("");
      setMessage("User profile updated.");
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Unable to update user profile");
    } finally {
      setSavingProfileUserId("");
    }
  }

  async function saveSubscription(userId) {
    const currentPeriodStart = toIsoString(subscriptionDraft.currentPeriodStart);
    const currentPeriodEnd = toIsoString(subscriptionDraft.currentPeriodEnd);

    if (!currentPeriodStart || !currentPeriodEnd) {
      setError("Start and end period must be valid date-time values.");
      return;
    }

    if (new Date(currentPeriodEnd).getTime() <= new Date(currentPeriodStart).getTime()) {
      setError("Subscription period end must be after period start.");
      return;
    }

    if (subscriptionDraft.status === "active" && new Date(currentPeriodEnd).getTime() <= Date.now()) {
      setError("Active subscriptions must have a future period end date.");
      return;
    }

    if (subscriptionDraft.cancelAtPeriodEnd && subscriptionDraft.status !== "active") {
      setError("Cancel at period end can only be enabled when status is active.");
      return;
    }

    try {
      setSavingSubscriptionUserId(userId);
      setMessage("");
      setError("");

      await apiRequest(`/admin/users/${userId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({
          planType: subscriptionDraft.planType,
          status: subscriptionDraft.status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(subscriptionDraft.cancelAtPeriodEnd)
        })
      });

      setSubscriptionEditUserId("");
      setMessage("Subscription override saved.");
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Unable to update subscription");
    } finally {
      setSavingSubscriptionUserId("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">User & Subscription Management</h1>
      <p className="mt-2 text-sm text-slate-300">
        Manage profile role, charity preferences, and manual subscription override from one screen.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-lg border border-cyan-200/30 px-4 py-2 text-xs"
        >
          Refresh
        </button>
      </div>

      <section className="mt-6 space-y-3">
        {filteredRows.map((row) => {
          const isProfileEditing = profileEditUserId === row.id;
          const isSubscriptionEditing = subscriptionEditUserId === row.id;

          return (
            <article key={row.id} className="glass rounded-xl p-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="font-semibold">{row.full_name || "No name"}</p>
                  <p className="text-sm text-slate-300">{row.email}</p>
                  <p className="text-xs text-slate-400">Role: {row.role}</p>
                  <p className="text-xs text-slate-400">Charity %: {row.charity_percent}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">
                    Plan: {row.latest_subscription?.plan_type || "none"} · Status: {row.latest_subscription?.status || "inactive"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Period: {row.latest_subscription?.current_period_start || "-"} to {row.latest_subscription?.current_period_end || "-"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Cancel at period end: {String(row.latest_subscription?.cancel_at_period_end || false)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileEditUserId(row.id);
                    setProfileDraft(makeProfileDraft(row));
                    setSubscriptionEditUserId("");
                  }}
                  className="rounded-lg border border-cyan-200/30 px-3 py-1 text-xs"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionEditUserId(row.id);
                    setSubscriptionDraft(makeSubscriptionDraft(row));
                    setProfileEditUserId("");
                  }}
                  className="rounded-lg border border-cyan-200/30 px-3 py-1 text-xs"
                >
                  Override Subscription
                </button>
              </div>

              {isProfileEditing ? (
                <div className="mt-4 rounded-lg border border-cyan-200/20 p-3">
                  <h2 className="text-sm font-semibold">Edit Profile</h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs">
                      Full Name
                      <input
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={profileDraft.fullName}
                        onChange={(event) => setProfileDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                      />
                    </label>

                    <label className="text-xs">
                      Role
                      <select
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={profileDraft.role}
                        onChange={(event) => setProfileDraft((prev) => ({ ...prev, role: event.target.value }))}
                      >
                        <option value="subscriber">subscriber</option>
                        <option value="admin">admin</option>
                      </select>
                    </label>

                    <label className="text-xs">
                      Charity Percent
                      <input
                        type="number"
                        min={10}
                        max={40}
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={profileDraft.charityPercent}
                        onChange={(event) =>
                          setProfileDraft((prev) => ({ ...prev, charityPercent: Number(event.target.value) }))
                        }
                      />
                    </label>

                    <label className="text-xs">
                      Selected Charity
                      <select
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={profileDraft.selectedCharityId}
                        onChange={(event) => setProfileDraft((prev) => ({ ...prev, selectedCharityId: event.target.value }))}
                      >
                        <option value="">None</option>
                        {charities.map((charity) => (
                          <option key={charity.id} value={charity.id}>
                            {charity.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={savingProfileUserId === row.id}
                      onClick={() => void saveProfile(row.id)}
                      className="rounded-lg bg-neon px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      {savingProfileUserId === row.id ? "Saving..." : "Save Profile"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileEditUserId("")}
                      className="rounded-lg border border-cyan-200/30 px-3 py-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {isSubscriptionEditing ? (
                <div className="mt-4 rounded-lg border border-cyan-200/20 p-3">
                  <h2 className="text-sm font-semibold">Manual Subscription Override</h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs">
                      Plan Type
                      <select
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={subscriptionDraft.planType}
                        onChange={(event) => setSubscriptionDraft((prev) => ({ ...prev, planType: event.target.value }))}
                      >
                        <option value="monthly">monthly</option>
                        <option value="yearly">yearly</option>
                      </select>
                    </label>

                    <label className="text-xs">
                      Status
                      <select
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={subscriptionDraft.status}
                        onChange={(event) => setSubscriptionDraft((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        {SUBSCRIPTION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs">
                      Current Period Start
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={subscriptionDraft.currentPeriodStart}
                        onChange={(event) =>
                          setSubscriptionDraft((prev) => ({ ...prev, currentPeriodStart: event.target.value }))
                        }
                      />
                    </label>

                    <label className="text-xs">
                      Current Period End
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-cyan-200/20 bg-slate-950/40 px-3 py-2 text-sm"
                        value={subscriptionDraft.currentPeriodEnd}
                        onChange={(event) =>
                          setSubscriptionDraft((prev) => ({ ...prev, currentPeriodEnd: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={subscriptionDraft.cancelAtPeriodEnd}
                      onChange={(event) =>
                        setSubscriptionDraft((prev) => ({ ...prev, cancelAtPeriodEnd: event.target.checked }))
                      }
                    />
                    Cancel At Period End
                  </label>

                  <p className="mt-2 text-xs text-slate-400">
                    Validation guard: active status requires a future period end date.
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={savingSubscriptionUserId === row.id}
                      onClick={() => void saveSubscription(row.id)}
                      className="rounded-lg bg-neon px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      {savingSubscriptionUserId === row.id ? "Saving..." : "Save Subscription"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionEditUserId("")}
                      className="rounded-lg border border-cyan-200/30 px-3 py-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {!filteredRows.length ? <p className="text-sm text-slate-400">No users found.</p> : null}
      </section>

      {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </main>
  );
}
