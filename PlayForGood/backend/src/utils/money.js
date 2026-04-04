import { APP_CONSTANTS, PRIZE_TIER_DISTRIBUTION } from "../constants/app.js";

export function rupeesToPaise(amountRupees) {
  return Math.round(Number(amountRupees) * 100);
}

export function paiseToRupees(amountPaise) {
  return Number(amountPaise) / 100;
}

export function calculateAllocation({ grossAmountPaise, charityPercent }) {
  if (!Number.isInteger(grossAmountPaise) || grossAmountPaise < 0) {
    throw new Error("grossAmountPaise must be a non-negative integer.");
  }

  if (!Number.isInteger(charityPercent) || charityPercent < APP_CONSTANTS.minCharityPercent || charityPercent > 40) {
    throw new Error("charityPercent must be an integer between 10 and 40.");
  }

  const prizePoolAmountPaise = Math.floor((grossAmountPaise * APP_CONSTANTS.prizePoolPercent) / 100);
  const charityAmountPaise = Math.floor((grossAmountPaise * charityPercent) / 100);
  const platformAmountPaise = grossAmountPaise - prizePoolAmountPaise - charityAmountPaise;

  if (platformAmountPaise < 0) {
    throw new Error("Allocation generated negative platform amount.");
  }

  return {
    prizePoolAmountPaise,
    charityAmountPaise,
    platformAmountPaise
  };
}

export function calculateTierPools(totalPrizePoolPaise) {
  if (!Number.isInteger(totalPrizePoolPaise) || totalPrizePoolPaise < 0) {
    throw new Error("totalPrizePoolPaise must be a non-negative integer.");
  }

  const fiveMatch = Math.floor(totalPrizePoolPaise * PRIZE_TIER_DISTRIBUTION[5]);
  const fourMatch = Math.floor(totalPrizePoolPaise * PRIZE_TIER_DISTRIBUTION[4]);
  const threeMatch = totalPrizePoolPaise - fiveMatch - fourMatch;

  return {
    5: fiveMatch,
    4: fourMatch,
    3: threeMatch
  };
}
