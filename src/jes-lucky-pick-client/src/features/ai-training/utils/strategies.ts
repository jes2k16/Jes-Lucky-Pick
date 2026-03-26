import type { Expert, GameSettings, TryResult } from "../types/game";

// ── Shared Helpers ──

/** Pick `count` numbers from range, excluding `exclude`, weighted by confidence */
export function pickTopConfidence(
  expert: Expert,
  settings: GameSettings,
  count: number,
  exclude: number[] = []
): number[] {
  const candidates: { num: number; score: number }[] = [];
  for (let n = settings.numberRangeMin; n <= settings.numberRangeMax; n++) {
    if (!exclude.includes(n)) {
      candidates.push({ num: n, score: expert.confidenceMap[n] ?? 0 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, count).map((c) => c.num);
}

/** Pick `count` random unique numbers from range, excluding `exclude` */
export function pickRandom(
  settings: GameSettings,
  count: number,
  exclude: number[] = []
): number[] {
  const pool: number[] = [];
  for (let n = settings.numberRangeMin; n <= settings.numberRangeMax; n++) {
    if (!exclude.includes(n)) pool.push(n);
  }
  const result: number[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

/** Update confidence map after a try result */
export function updateConfidenceMap(
  expert: Expert,
  tryResult: TryResult
): void {
  const { guess, stars } = tryResult;
  const delta = stars >= 3 ? 0.3 : stars === 0 ? -0.2 : 0.05;
  for (const num of guess) {
    expert.confidenceMap[num] = (expert.confidenceMap[num] ?? 0) + delta;
  }
}

/** Score a guess against a secret combination */
export function scoreGuess(guess: number[], secret: number[]): number {
  const secretSet = new Set(secret);
  return guess.filter((n) => secretSet.has(n)).length;
}

/** Generate a secret combination of unique random numbers */
export function generateSecretCombination(settings: GameSettings): number[] {
  return pickRandom(settings, settings.combinationSize);
}

// ── Personality Strategies ──

type StrategyFn = (
  expert: Expert,
  settings: GameSettings,
  tryNumberInRound: number
) => number[];

/** Scanner: maximize coverage, test many unique numbers across tries */
function scannerStrategy(
  expert: Expert,
  settings: GameSettings,
  tryNumberInRound: number
): number[] {
  const { combinationSize } = settings;

  if (tryNumberInRound <= 2) {
    // Explore: pick numbers not yet tested this round
    const testedThisRound = new Set(
      expert.roundHistory.flatMap((t) => t.guess)
    );
    const untested = pickRandom(
      settings,
      combinationSize,
      [...testedThisRound]
    );
    if (untested.length >= combinationSize) return untested;
    // Fill with random if not enough untested
    const needed = combinationSize - untested.length;
    const fill = pickRandom(settings, needed, untested);
    return [...untested, ...fill];
  }

  if (tryNumberInRound <= 4) {
    // Refine: keep numbers from high-scoring tries, fill with untested
    const bestTry = getBestTryThisRound(expert);
    if (bestTry && bestTry.stars >= 2) {
      const keep = bestTry.guess.slice(0, bestTry.stars);
      const fill = pickRandom(settings, combinationSize - keep.length, keep);
      return [...keep, ...fill];
    }
    return pickRandom(settings, combinationSize);
  }

  // Exploit: use top confidence + best round data
  const bestTry = getBestTryThisRound(expert);
  if (bestTry && bestTry.stars >= 3) {
    const keep = bestTry.guess.slice(0, Math.min(bestTry.stars, combinationSize - 1));
    const fill = pickTopConfidence(expert, settings, combinationSize - keep.length, keep);
    return [...keep, ...fill];
  }
  return pickTopConfidence(expert, settings, combinationSize);
}

/** Sticky: lock high-scoring numbers, swap remaining slots */
function stickyStrategy(
  expert: Expert,
  settings: GameSettings,
  tryNumberInRound: number
): number[] {
  const { combinationSize } = settings;

  if (tryNumberInRound === 1) {
    // First try: use top confidence or random
    const topConf = pickTopConfidence(expert, settings, combinationSize);
    const hasConfidence = topConf.some(
      (n) => (expert.confidenceMap[n] ?? 0) > 0
    );
    return hasConfidence ? topConf : pickRandom(settings, combinationSize);
  }

  // Lock numbers from the best try so far, swap the rest
  const bestTry = getBestTryThisRound(expert);
  if (bestTry && bestTry.stars >= 1) {
    // Keep all numbers from best try, swap a few
    const swapCount = Math.max(1, combinationSize - bestTry.stars);
    const keep = bestTry.guess.slice(0, combinationSize - swapCount);
    const fill = pickRandom(settings, swapCount, keep);
    return [...keep, ...fill];
  }

  return pickRandom(settings, combinationSize);
}

/** Gambler: large random swaps, high variance */
function gamblerStrategy(
  expert: Expert,
  settings: GameSettings,
  tryNumberInRound: number
): number[] {
  const { combinationSize } = settings;

  if (tryNumberInRound <= 4) {
    // Keep 0-2 random numbers from best try, randomize rest
    const bestTry = getBestTryThisRound(expert);
    if (bestTry && bestTry.stars >= 1) {
      const keepCount = Math.floor(Math.random() * 3); // 0, 1, or 2
      const shuffled = [...bestTry.guess].sort(() => Math.random() - 0.5);
      const keep = shuffled.slice(0, keepCount);
      const fill = pickRandom(settings, combinationSize - keep.length, keep);
      return [...keep, ...fill];
    }
    return pickRandom(settings, combinationSize);
  }

  // Tries 5-6: 50/50 random vs confidence
  if (Math.random() > 0.5) {
    return pickTopConfidence(expert, settings, combinationSize);
  }
  const bestTry = getBestTryThisRound(expert);
  if (bestTry) {
    const keep = bestTry.guess.slice(0, Math.floor(combinationSize / 2));
    const fill = pickRandom(settings, combinationSize - keep.length, keep);
    return [...keep, ...fill];
  }
  return pickRandom(settings, combinationSize);
}

/** Analyst: divide range into sections, test methodically */
function analystStrategy(
  expert: Expert,
  settings: GameSettings,
  tryNumberInRound: number
): number[] {
  const { numberRangeMin, numberRangeMax, combinationSize } = settings;
  const rangeSize = numberRangeMax - numberRangeMin + 1;
  const sectionSize = Math.ceil(rangeSize / combinationSize);

  if (tryNumberInRound <= 2) {
    // Pick one number from each section
    const guess: number[] = [];
    for (let i = 0; i < combinationSize; i++) {
      const sectionStart = numberRangeMin + i * sectionSize;
      const sectionEnd = Math.min(sectionStart + sectionSize - 1, numberRangeMax);
      const num =
        sectionStart + Math.floor(Math.random() * (sectionEnd - sectionStart + 1));
      guess.push(num);
    }
    return [...new Set(guess)].length === combinationSize
      ? guess
      : pickRandom(settings, combinationSize);
  }

  if (tryNumberInRound <= 4) {
    // Narrow: keep numbers from high-scoring sections
    const bestTry = getBestTryThisRound(expert);
    if (bestTry && bestTry.stars >= 2) {
      // Keep high-scoring numbers, try different numbers from same sections for the rest
      const keep = bestTry.guess.slice(0, bestTry.stars);
      const fill: number[] = [];
      for (const kept of keep) {
        const section = Math.floor((kept - numberRangeMin) / sectionSize);
        const sectionStart = numberRangeMin + section * sectionSize;
        const sectionEnd = Math.min(sectionStart + sectionSize - 1, numberRangeMax);
        // Try a different number from the same section
        const alt = sectionStart + Math.floor(Math.random() * (sectionEnd - sectionStart + 1));
        if (!keep.includes(alt) && !fill.includes(alt)) fill.push(alt);
      }
      const remaining = combinationSize - keep.length;
      const randomFill = pickRandom(settings, remaining, [...keep, ...fill]);
      return [...keep, ...randomFill].slice(0, combinationSize);
    }
    return pickRandom(settings, combinationSize);
  }

  // Tries 5-6: exploit best data
  return pickTopConfidence(expert, settings, combinationSize);
}

// ── Strategy Map ──

const strategies: Record<string, StrategyFn> = {
  Scanner: scannerStrategy,
  Sticky: stickyStrategy,
  Gambler: gamblerStrategy,
  Analyst: analystStrategy,
};

/** Execute the strategy for an expert's personality */
export function executeStrategy(
  expert: Expert,
  settings: GameSettings,
  tryNumberInRound: number
): number[] {
  const strategyFn = strategies[expert.personality] ?? scannerStrategy;
  const guess = strategyFn(expert, settings, tryNumberInRound);

  // Safety: ensure uniqueness and correct count
  const unique = [...new Set(guess)].filter(
    (n) => n >= settings.numberRangeMin && n <= settings.numberRangeMax
  );
  if (unique.length < settings.combinationSize) {
    const fill = pickRandom(
      settings,
      settings.combinationSize - unique.length,
      unique
    );
    return [...unique, ...fill].sort((a, b) => a - b);
  }
  return unique.slice(0, settings.combinationSize).sort((a, b) => a - b);
}

// ── Helpers ──

function getBestTryThisRound(expert: Expert): TryResult | null {
  if (expert.roundHistory.length === 0) return null;
  return expert.roundHistory.reduce((best, t) =>
    t.stars > best.stars ? t : best
  );
}
