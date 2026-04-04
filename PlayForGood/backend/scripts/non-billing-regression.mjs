const baseUrl = process.env.API_BASE_URL || "http://localhost:4000";

const results = [];

function addResult(name, response, expectedStatuses) {
  const expected = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
  const ok = expected.includes(response.status);
  const errorMessage = ok ? "" : response.json?.error?.message || response.text || "Unexpected response";

  results.push({
    name,
    status: response.status,
    expected: expected.join("|"),
    ok,
    error: errorMessage
  });
}

async function request(method, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, json, text };
}

function buildFutureMonth(existingMonths) {
  for (let year = 2099; year <= 2120; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const value = `${year}-${String(month).padStart(2, "0")}`;
      if (!existingMonths.has(value)) {
        return value;
      }
    }
  }

  throw new Error("Unable to find an unused draw month for regression test");
}

async function run() {
  const health = await request("GET", "/health");
  addResult("GET /health", health, 200);

  const publicHome = await request("GET", "/api/public/home");
  addResult("GET /api/public/home", publicHome, 200);

  const charities = await request("GET", "/api/charities");
  addResult("GET /api/charities", charities, 200);
  const charity = charities.json?.data?.items?.[0];
  if (!charity?.id || !charity?.slug) {
    throw new Error("No active charity available for regression flow");
  }

  const charityDetail = await request("GET", `/api/charities/${charity.slug}`);
  addResult("GET /api/charities/:slug", charityDetail, 200);

  const signupEmail = `endpoint-audit-${Date.now()}@example.com`;
  const signup = await request("POST", "/api/auth/signup", {
    body: {
      email: signupEmail,
      password: "User@12345",
      fullName: "Endpoint Audit User",
      selectedCharityId: charity.id,
      charityPercent: 10
    }
  });
  addResult("POST /api/auth/signup", signup, 201);

  const draws = await request("GET", "/api/draws");
  addResult("GET /api/draws", draws, 200);
  const existingDrawId = draws.json?.data?.items?.[0]?.id;
  if (existingDrawId) {
    const drawById = await request("GET", `/api/draws/${existingDrawId}`);
    addResult("GET /api/draws/:id", drawById, 200);
  }

  const userLogin = await request("POST", "/api/auth/login", {
    body: { email: "user@test.com", password: "User@123" }
  });
  addResult("POST /api/auth/login (user)", userLogin, 200);
  const userToken = userLogin.json?.data?.accessToken;

  const adminLogin = await request("POST", "/api/auth/login", {
    body: { email: "admin@golfplatform.com", password: "Admin@123" }
  });
  addResult("POST /api/auth/login (admin)", adminLogin, 200);
  const adminToken = adminLogin.json?.data?.accessToken;

  if (!userToken || !adminToken) {
    throw new Error("Login succeeded without access tokens; cannot continue regression test");
  }

  const userMe = await request("GET", "/api/auth/me", { token: userToken });
  addResult("GET /api/auth/me (user)", userMe, 200);
  const userId = userMe.json?.data?.user?.id;

  const adminMe = await request("GET", "/api/auth/me", { token: adminToken });
  addResult("GET /api/auth/me (admin)", adminMe, 200);

  if (!userId) {
    throw new Error("User profile id not found from /api/auth/me");
  }

  const userCharity = await request("GET", "/api/user/charity", { token: userToken });
  addResult("GET /api/user/charity", userCharity, 200);

  const patchUserCharity = await request("PATCH", "/api/user/charity", {
    token: userToken,
    body: {
      selectedCharityId: charity.id,
      charityPercent: 15
    }
  });
  addResult("PATCH /api/user/charity", patchUserCharity, 200);

  const createDonation = await request("POST", "/api/donations", {
    token: userToken,
    body: {
      charityId: charity.id,
      amountRupees: 101,
      referenceNote: "Non-billing regression",
      paymentMode: "record_only"
    }
  });
  addResult("POST /api/donations", createDonation, 201);

  const donations = await request("GET", "/api/donations", { token: userToken });
  addResult("GET /api/donations", donations, 200);

  const donationsMe = await request("GET", "/api/donations/me", { token: userToken });
  addResult("GET /api/donations/me", donationsMe, 200);

  const subscriptionStatus = await request("GET", "/api/subscriptions/status", { token: userToken });
  addResult("GET /api/subscriptions/status", subscriptionStatus, 200);

  const checkoutDisabled = await request("POST", "/api/subscriptions/create-checkout-session", {
    token: userToken,
    body: {
      planType: "monthly",
      charityPercent: 15,
      selectedCharityId: charity.id
    }
  });
  addResult("POST /api/subscriptions/create-checkout-session", checkoutDisabled, 400);

  const portalDisabled = await request("POST", "/api/subscriptions/create-portal-session", {
    token: userToken,
    body: {}
  });
  addResult("POST /api/subscriptions/create-portal-session", portalDisabled, 400);

  const cancelDisabled = await request("POST", "/api/subscriptions/cancel", {
    token: userToken,
    body: {}
  });
  addResult("POST /api/subscriptions/cancel", cancelDisabled, 400);

  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();

  const adminSubscriptionPatch = await request("PATCH", `/api/admin/users/${userId}/subscription`, {
    token: adminToken,
    body: {
      planType: "monthly",
      status: "active",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false
    }
  });
  addResult("PATCH /api/admin/users/:id/subscription", adminSubscriptionPatch, 200);

  const scoreValues = [11, 12, 13, 14, 15];
  const scoreDates = ["2099-12-31", "2099-12-30", "2099-12-29", "2099-12-28", "2099-12-27"];
  let createdScoreId = null;

  for (let index = 0; index < scoreValues.length; index += 1) {
    const scoreCreate = await request("POST", "/api/scores", {
      token: userToken,
      body: {
        scoreValue: scoreValues[index],
        playedOn: scoreDates[index]
      }
    });

    addResult(`POST /api/scores [${scoreValues[index]}]`, scoreCreate, 201);
    if (!createdScoreId) {
      createdScoreId = scoreCreate.json?.data?.score?.id || null;
    }
  }

  const scoresList = await request("GET", "/api/scores", { token: userToken });
  addResult("GET /api/scores", scoresList, 200);

  if (createdScoreId) {
    const scorePatch = await request("PATCH", `/api/scores/${createdScoreId}`, {
      token: userToken,
      body: {
        scoreValue: 15,
        playedOn: "2099-12-31"
      }
    });
    addResult("PATCH /api/scores/:id", scorePatch, 200);
  }

  const adminUsers = await request("GET", "/api/admin/users", { token: adminToken });
  addResult("GET /api/admin/users", adminUsers, 200);

  const adminUserPatch = await request("PATCH", `/api/admin/users/${userId}`, {
    token: adminToken,
    body: {
      fullName: "Test Subscriber",
      charityPercent: 20
    }
  });
  addResult("PATCH /api/admin/users/:id", adminUserPatch, 200);

  const adminCharities = await request("GET", "/api/admin/charities", { token: adminToken });
  addResult("GET /api/admin/charities", adminCharities, 200);

  const tempSlug = `regression-charity-${Math.floor(Math.random() * 1_000_000)}`;
  const adminCharityCreate = await request("POST", "/api/admin/charities", {
    token: adminToken,
    body: {
      name: "Regression Charity",
      slug: tempSlug,
      shortDescription: "Regression charity used for endpoint validation.",
      longDescription:
        "Regression charity used for endpoint validation in automated non-billing endpoint checks and then deleted.",
      imageUrl: "https://example.com/charity.png",
      isFeatured: false,
      isActive: true
    }
  });
  addResult("POST /api/admin/charities", adminCharityCreate, 201);
  const tempCharityId = adminCharityCreate.json?.data?.id;

  if (tempCharityId) {
    const adminCharityPatch = await request("PATCH", `/api/admin/charities/${tempCharityId}`, {
      token: adminToken,
      body: {
        shortDescription: "Updated regression charity description.",
        isActive: true
      }
    });
    addResult("PATCH /api/admin/charities/:id", adminCharityPatch, 200);

    const adminCharityDelete = await request("DELETE", `/api/admin/charities/${tempCharityId}`, {
      token: adminToken
    });
    addResult("DELETE /api/admin/charities/:id", adminCharityDelete, 200);
  }

  const drawConfig = await request("GET", "/api/admin/draw/config", { token: adminToken });
  addResult("GET /api/admin/draw/config", drawConfig, 200);

  const drawConfigPatch = await request("PATCH", "/api/admin/draw/config", {
    token: adminToken,
    body: {
      mode: "random",
      weightedStrategy: "hot"
    }
  });
  addResult("PATCH /api/admin/draw/config", drawConfigPatch, 200);

  const existingMonths = new Set((draws.json?.data?.items || []).map((item) => item.draw_month));
  const drawMonth = buildFutureMonth(existingMonths);

  const drawSimulate = await request("POST", "/api/admin/draw/simulate", {
    token: adminToken,
    body: {
      drawMonth,
      mode: "random",
      weightedStrategy: "hot"
    }
  });
  addResult("POST /api/admin/draw/simulate", drawSimulate, 200);

  const drawPublish = await request("POST", "/api/admin/draw/publish", {
    token: adminToken,
    body: {
      drawMonth,
      mode: "random",
      weightedStrategy: "hot",
      numbers: [11, 12, 13, 14, 15]
    }
  });
  addResult("POST /api/admin/draw/publish", drawPublish, 200);
  const drawId = drawPublish.json?.data?.draw?.id;

  const drawsAfterPublish = await request("GET", "/api/draws");
  addResult("GET /api/draws (post-publish)", drawsAfterPublish, 200);

  if (drawId) {
    const drawByIdUser = await request("GET", `/api/draws/${drawId}`, { token: userToken });
    addResult("GET /api/draws/:id (user personal result)", drawByIdUser, 200);
  }

  const winningsMe = await request("GET", "/api/winnings/me", { token: userToken });
  addResult("GET /api/winnings/me", winningsMe, 200);
  const winningId = winningsMe.json?.data?.items?.[0]?.id;

  if (winningId) {
    const proofUploadUrl = await request("POST", `/api/winnings/${winningId}/proof/upload-url`, {
      token: userToken,
      body: {}
    });
    addResult("POST /api/winnings/:id/proof/upload-url", proofUploadUrl, 200);

    const proofPath = proofUploadUrl.json?.data?.path || `proofs/${winningId}.png`;
    const proofSubmit = await request("POST", `/api/winnings/${winningId}/proof/submit`, {
      token: userToken,
      body: {
        proofFilePath: proofPath
      }
    });
    addResult("POST /api/winnings/:id/proof/submit", proofSubmit, 200);

    const adminWinnings = await request("GET", "/api/admin/winnings", { token: adminToken });
    addResult("GET /api/admin/winnings", adminWinnings, 200);

    const adminVerification = await request("PATCH", `/api/admin/winnings/${winningId}/verification`, {
      token: adminToken,
      body: {
        decision: "approved"
      }
    });
    addResult("PATCH /api/admin/winnings/:id/verification", adminVerification, 200);

    const adminPayment = await request("PATCH", `/api/admin/winnings/${winningId}/payment`, {
      token: adminToken,
      body: {
        paymentStatus: "paid"
      }
    });
    addResult("PATCH /api/admin/winnings/:id/payment", adminPayment, 200);
  }

  const reportsOverview = await request("GET", "/api/admin/reports/overview", { token: adminToken });
  addResult("GET /api/admin/reports/overview", reportsOverview, 200);

  const razorpayWebhookDisabled = await request("POST", "/api/webhooks/razorpay", {
    body: {}
  });
  addResult("POST /api/webhooks/razorpay", razorpayWebhookDisabled, 200);

  const stripeWebhookDeprecated = await request("POST", "/api/webhooks/stripe", {
    body: {}
  });
  addResult("POST /api/webhooks/stripe (deprecated)", stripeWebhookDeprecated, 200);

  const authLogout = await request("POST", "/api/auth/logout", {
    body: {}
  });
  addResult("POST /api/auth/logout", authLogout, 200);

  console.table(results);

  const failed = results.filter((row) => !row.ok);
  console.log(`TOTAL=${results.length}`);
  console.log(`FAILED=${failed.length}`);

  if (failed.length) {
    console.log("FAILED_CASES");
    console.table(failed);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("REGRESSION_SCRIPT_ERROR", error.message);
  process.exit(1);
});
