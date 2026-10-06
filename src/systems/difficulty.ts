export interface Difficulty {
  /** World scroll speed, px/s. */
  scrollSpeed: number;
  /** Seconds between damage spawns. */
  spawnInterval: number;
  /** Vertical lanes damage can appear in. */
  lanes: number;
  /** Artifact condition lost per wrong tool or missed damage (0–1 scale). */
  mistakePenalty: number;
  /** Run length in seconds. */
  duration: number;
}

/** Smooth ramp across all 12 levels; level is 0-based. */
export function difficultyFor(level: number): Difficulty {
  const t = Math.min(Math.max(level, 0), 11) / 11;
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    scrollSpeed: Math.round(lerp(220, 420)),
    spawnInterval: +lerp(1.6, 0.75).toFixed(2),
    lanes: level < 2 ? 3 : 4,
    mistakePenalty: +lerp(0.04, 0.1).toFixed(3),
    duration: Math.round(lerp(60, 90)),
  };
}
