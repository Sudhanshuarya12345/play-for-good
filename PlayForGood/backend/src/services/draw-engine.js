import { APP_CONSTANTS, DRAW_MODES } from "../constants/app.js";
import { calculateTierPools } from "../utils/money.js";
import { countDrawMatches, generateRandomDrawNumbers, generateWeightedDrawNumbers } from "../utils/draw.js";
import { getMonthBounds, getNextDrawMonth } from "../utils/date.js";

function groupLatestScores(scoresRows) {
  const grouped = new Map();

  for (const row of scoresRows) {
    if (!grouped.has(row.user_id)) {
      grouped.set(row.user_id, []);
    }

    const current = grouped.get(row.user_id);
    if (current.length < APP_CONSTANTS.maxStoredScores) {
      current.push(row.score_value);
    }
  }

  return grouped;
}

function getFrequencyMap(groupedScores) {
  const frequency = new Map();

  for (let score = APP_CONSTANTS.minStableford; score <= APP_CONSTANTS.maxStableford; score += 1) {
    frequency.set(score, 1);
  }

  groupedScores.forEach((scores) => {
    scores.forEach((value) => {
      frequency.set(value, (frequency.get(value) || 1) + 1);
    });
  });

  return frequency;
}

function pickDrawNumbers(mode, weightedStrategy, frequencyMap) {
  if (mode === DRAW_MODES.WEIGHTED) {
    return generateWeightedDrawNumbers(frequencyMap, weightedStrategy);
  }

  return generateRandomDrawNumbers();
}

export async function fetchEligibleEntries(adminClient) {
  const nowIso = new Date().toISOString();

  const { data: subscriptions, error: subscriptionError } = await adminClient
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .gt("current_period_end", nowIso);

  if (subscriptionError) {
    throw subscriptionError;
  }

  const userIds = [...new Set((subscriptions || []).map((item) => item.user_id))];

  if (!userIds.length) {
    return [];
  }

  const { data: scores, error: scoresError } = await adminClient
    .from("scores")
    .select("user_id, score_value, played_on, inserted_at")
    .in("user_id", userIds)
    .order("played_on", { ascending: false })
    .order("inserted_at", { ascending: false });

  if (scoresError) {
    throw scoresError;
  }

  const grouped = groupLatestScores(scores || []);
  const entries = [];

  grouped.forEach((scoresWindow, userId) => {
    if (scoresWindow.length === APP_CONSTANTS.maxStoredScores) {
      entries.push({ userId, scores: scoresWindow.slice().sort((a, b) => a - b) });
    }
  });

  return entries;
}

export async function simulateDraw({ adminClient, drawMonth, mode, weightedStrategy }) {
  const entries = await fetchEligibleEntries(adminClient);
  const groupedScores = new Map(entries.map((entry) => [entry.userId, entry.scores]));
  const frequencyMap = getFrequencyMap(groupedScores);
  const numbers = pickDrawNumbers(mode, weightedStrategy, frequencyMap);
  const tierStats = { 5: 0, 4: 0, 3: 0, participants: entries.length };

  entries.forEach((entry) => {
    const matches = countDrawMatches(entry.scores, numbers);
    if (matches >= 3) {
      tierStats[matches] += 1;
    }
  });

  const analysis = {
    numbers,
    tierStats,
    weightedStrategy,
    mode
  };

  const { data, error } = await adminClient
    .from("draw_simulations")
    .insert({
      draw_month: drawMonth,
      mode,
      proposed_numbers_json: numbers,
      analysis_json: analysis
    })
    .select("id, draw_month, mode, proposed_numbers_json, analysis_json, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function publishDraw({ adminClient, drawMonth, mode, weightedStrategy, numbers }) {
  const existingPublished = await adminClient
    .from("draws")
    .select("id")
    .eq("draw_month", drawMonth)
    .eq("status", "published")
    .maybeSingle();

  if (existingPublished.data) {
    throw new Error(`Published draw already exists for ${drawMonth}.`);
  }

  const entries = await fetchEligibleEntries(adminClient);
  const groupedScores = new Map(entries.map((entry) => [entry.userId, entry.scores]));
  const frequencyMap = getFrequencyMap(groupedScores);
  const drawNumbers = numbers || pickDrawNumbers(mode, weightedStrategy, frequencyMap);

  const { data: draw, error: drawError } = await adminClient
    .from("draws")
    .insert({
      draw_month: drawMonth,
      mode,
      numbers_json: drawNumbers,
      status: "published",
      simulated_at: new Date().toISOString(),
      published_at: new Date().toISOString()
    })
    .select("id, draw_month, numbers_json, mode, published_at")
    .single();

  if (drawError) {
    throw drawError;
  }

  if (entries.length) {
    const snapshotRows = entries.map((entry) => ({
      draw_id: draw.id,
      user_id: entry.userId,
      scores_snapshot_json: entry.scores
    }));

    const { error: snapshotError } = await adminClient.from("draw_entries_snapshot").insert(snapshotRows);
    if (snapshotError) {
      throw snapshotError;
    }
  }

  const { start, end } = getMonthBounds(drawMonth);
  const { data: ledgerRows, error: ledgerError } = await adminClient
    .from("payment_ledger")
    .select("prize_pool_amount_paise")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString());

  if (ledgerError) {
    throw ledgerError;
  }

  const { data: carryRows, error: carryError } = await adminClient
    .from("jackpot_rollovers")
    .select("id, carry_amount_paise")
    .eq("target_draw_month", drawMonth)
    .eq("settled", false);

  if (carryError) {
    throw carryError;
  }

  const monthPrizePool = (ledgerRows || []).reduce((sum, row) => sum + (row.prize_pool_amount_paise || 0), 0);
  const carryPrizePool = (carryRows || []).reduce((sum, row) => sum + (row.carry_amount_paise || 0), 0);
  const totalPrizePool = monthPrizePool + carryPrizePool;
  const tierPools = calculateTierPools(totalPrizePool);

  const winnersByTier = { 5: [], 4: [], 3: [] };

  entries.forEach((entry) => {
    const matches = countDrawMatches(entry.scores, drawNumbers);
    if (matches >= 3) {
      winnersByTier[matches].push({ userId: entry.userId, matches });
    }
  });

  const winningRows = [];

  [5, 4, 3].forEach((tier) => {
    const winners = winnersByTier[tier];
    const each = winners.length ? Math.floor((tierPools[tier] || 0) / winners.length) : 0;

    winners.forEach((winner) => {
      winningRows.push({
        draw_id: draw.id,
        user_id: winner.userId,
        match_count: winner.matches,
        match_tier: tier,
        gross_win_amount_paise: each,
        verification_status: "pending",
        payment_status: "pending"
      });
    });
  });

  if (winningRows.length) {
    const { error: winningsError } = await adminClient.from("winnings").insert(winningRows);
    if (winningsError) {
      throw winningsError;
    }
  }

  if ((winnersByTier[5] || []).length === 0 && tierPools[5] > 0) {
    const { error: rolloverError } = await adminClient.from("jackpot_rollovers").insert({
      source_draw_id: draw.id,
      target_draw_month: getNextDrawMonth(drawMonth),
      carry_amount_paise: tierPools[5],
      settled: false
    });

    if (rolloverError) {
      throw rolloverError;
    }
  }

  if (carryRows?.length) {
    const carryIds = carryRows.map((row) => row.id);
    const { error: settleError } = await adminClient.from("jackpot_rollovers").update({ settled: true }).in("id", carryIds);
    if (settleError) {
      throw settleError;
    }
  }

  return {
    draw,
    totalPrizePool,
    tierPools,
    winnersByTier: {
      5: winnersByTier[5].length,
      4: winnersByTier[4].length,
      3: winnersByTier[3].length
    }
  };
}
