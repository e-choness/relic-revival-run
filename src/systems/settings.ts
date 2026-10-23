// Player preferences that are not progress: volumes and tool hints. Kept apart from the save, so
// resetting progress never resets them. Storage may be unavailable; defaults apply then.

export type Volume = 'music' | 'sfx';

const VOLUME_KEY = (v: Volume) => `relic-revival-run:volume:${v}`;
const ASSIST_KEY = 'relic-revival-run:assist';
/** Volumes move in tenths, so menus can step them with left/right or ±. */
export const VOLUME_STEP = 0.1;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const clampVolume = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10) / 10;

export function loadVolume(v: Volume): number {
  const n = Number(read(VOLUME_KEY(v)) ?? NaN);
  return Number.isFinite(n) ? clampVolume(n) : 1;
}

export function saveVolume(v: Volume, value: number): number {
  const clamped = clampVolume(value);
  write(VOLUME_KEY(v), String(clamped));
  return clamped;
}

/** Tool hints pulse the slot of the tool the next damage needs. On by default. */
export const loadAssist = () => read(ASSIST_KEY) !== '0';
export const saveAssist = (on: boolean) => write(ASSIST_KEY, on ? '1' : '0');
