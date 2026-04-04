import { randomInt } from "node:crypto";
import { APP_CONSTANTS } from "../constants/app.js";

function secureRandomInt(min, max) {
  return randomInt(min, max + 1);
}

export function generateRandomDrawNumbers() {
  const picked = new Set();

  while (picked.size < APP_CONSTANTS.drawSize) {
    picked.add(secureRandomInt(APP_CONSTANTS.minStableford, APP_CONSTANTS.maxStableford));
  }

  return [...picked].sort((a, b) => a - b);
}

export function generateWeightedDrawNumbers(frequencyMap, mode = "hot") {
  const entries = [];

  for (let score = APP_CONSTANTS.minStableford; score <= APP_CONSTANTS.maxStableford; score += 1) {
    const baseFrequency = frequencyMap.get(score) || 1;
    let weight;

    if (mode === "cold") {
      weight = 1 / baseFrequency;
    } else if (mode === "hybrid") {
      weight = baseFrequency * 0.7 + (1 / baseFrequency) * 0.3;
    } else {
      weight = baseFrequency;
    }

    entries.push({ score, weight });
  }

  const selected = new Set();

  while (selected.size < APP_CONSTANTS.drawSize) {
    const totalWeight = entries.reduce((acc, item) => acc + item.weight, 0);
    const target = Math.random() * totalWeight;
    let cumulative = 0;

    for (const item of entries) {
      cumulative += item.weight;
      if (cumulative >= target) {
        selected.add(item.score);
        break;
      }
    }
  }

  return [...selected].sort((a, b) => a - b);
}

export function countDrawMatches(userScores, drawNumbers) {
  const userSet = new Set(userScores);
  const drawSet = new Set(drawNumbers);
  let matches = 0;

  userSet.forEach((score) => {
    if (drawSet.has(score)) {
      matches += 1;
    }
  });

  return matches;
}
