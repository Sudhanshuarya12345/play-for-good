export const APP_CONSTANTS = {
  currency: "INR",
  monthlyPriceRupees: 499,
  yearlyPriceRupees: 4999,
  prizePoolPercent: 60,
  minCharityPercent: 10,
  drawSize: 5,
  minStableford: 1,
  maxStableford: 45,
  maxStoredScores: 5
};

export const PRIZE_TIER_DISTRIBUTION = {
  5: 0.4,
  4: 0.35,
  3: 0.25
};

export const DRAW_MODES = {
  RANDOM: "random",
  WEIGHTED: "weighted"
};

export const SUBSCRIPTION_PLANS = {
  monthly: {
    key: "monthly",
    priceRupees: APP_CONSTANTS.monthlyPriceRupees
  },
  yearly: {
    key: "yearly",
    priceRupees: APP_CONSTANTS.yearlyPriceRupees
  }
};
