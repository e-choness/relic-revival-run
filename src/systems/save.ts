import { CULTURES } from '../data/cultures';

export interface SaveData {
  /** Best stars per culture id. */
  stars: Record<string, number>;
}

const KEY = 'relic-revival-run:save:v1';

// Storage can be unavailable (private mode, blocked site data); the game still runs, just without persistence.
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { stars: {}, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { stars: {} };
}

export function recordStars(save: SaveData, cultureId: string, stars: number): SaveData {
  const next = { ...save, stars: { ...save.stars, [cultureId]: Math.max(save.stars[cultureId] ?? 0, stars) } };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** A culture unlocks once the previous one has at least one star. */
export function isUnlocked(save: SaveData, index: number): boolean {
  const culture = CULTURES[index];
  if (!culture?.v1) return false;
  return index === 0 || (save.stars[CULTURES[index - 1].id] ?? 0) > 0;
}
