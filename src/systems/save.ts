import type { DamageId } from '../data/conservation';
import { CULTURES } from '../data/cultures';

export interface SaveData {
  /** Best stars per culture id. */
  stars: Record<string, number>;
  /** Best restoration (0–1) per culture id; the museum shows each artifact this clean. */
  best: Record<string, number>;
  /** Damage types met so far: their conservation facts are unlocked in the museum. */
  learned: DamageId[];
  /** Best daily-challenge score per date (YYYY-MM-DD). */
  daily: Record<string, number>;
  /** Chill mode: mistakes never damage the artifact. */
  chill: boolean;
}

const KEY = 'relic-revival-run:save:v1';
const EMPTY: SaveData = { stars: {}, best: {}, learned: [], daily: {}, chill: false };

// Storage can be unavailable (private mode, blocked site data); the game still runs, just without persistence.
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(EMPTY), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return structuredClone(EMPTY);
}

function persist(save: SaveData): SaveData {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
  return save;
}

export function recordStars(save: SaveData, cultureId: string, stars: number): SaveData {
  return persist({ ...save, stars: { ...save.stars, [cultureId]: Math.max(save.stars[cultureId] ?? 0, stars) } });
}

/** Records a finished run: best stars and restoration, plus newly learned damage types. */
export function recordRun(save: SaveData, cultureId: string, stars: number, restoration: number, seen: DamageId[]): SaveData {
  return persist({
    ...save,
    stars: { ...save.stars, [cultureId]: Math.max(save.stars[cultureId] ?? 0, stars) },
    best: { ...save.best, [cultureId]: Math.max(save.best[cultureId] ?? 0, restoration) },
    learned: [...new Set([...save.learned, ...seen])],
  });
}

export function recordDaily(save: SaveData, date: string, score: number): SaveData {
  return persist({ ...save, daily: { ...save.daily, [date]: Math.max(save.daily[date] ?? 0, score) } });
}

export function setChill(save: SaveData, on: boolean): SaveData {
  return persist({ ...save, chill: on });
}

/** A culture unlocks once the previous one has at least one star. */
export function isUnlocked(save: Pick<SaveData, 'stars'>, index: number): boolean {
  const culture = CULTURES[index];
  if (!culture?.released) return false;
  return index === 0 || (save.stars[CULTURES[index - 1].id] ?? 0) > 0;
}

export const totalStars = (save: Pick<SaveData, 'stars'>) => Object.values(save.stars).reduce((a, b) => a + b, 0);

/** Museum rank from total stars (36 possible). */
export function curatorTitle(stars: number): { title: string; next: number | null } {
  const ranks: [number, string][] = [[0, 'Volunteer'], [6, 'Intern'], [15, 'Conservator'], [27, 'Senior Conservator'], [36, 'Chief Curator']];
  let i = ranks.length - 1;
  while (ranks[i][0] > stars) i--;
  return { title: ranks[i][1], next: ranks[i + 1]?.[0] ?? null };
}

/** Today's daily challenge: the same culture and seed for everyone on that date. */
export function dailyFor(date: string): { index: number; seed: number } {
  let h = 2166136261;
  for (const ch of `daily-${date}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const seed = h >>> 0;
  return { index: seed % CULTURES.length, seed };
}

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
