// Pure music logic for the PLACEHOLDER synthesized soundtrack: scales, patterns and generative phrases.
// No Web Audio here so it can be unit tested; AudioDirector turns these into sound.

/** Instrument family the lead voice imitates. */
export type Timbre = 'pluck' | 'mallet' | 'wind' | 'bowed';
/** Percussion character. */
export type Perc = 'none' | 'hand' | 'frame' | 'taiko' | 'gong';

export interface SoundProfile {
  /** MIDI note of the tonic. */
  root: number;
  /** Scale degrees in semitones above the root; fractional values are microtones (e.g. 1.5 = three-quarter tone). */
  scale: number[];
  tempo: number;
  lead: Timbre;
  perc: Perc;
  /** Sustained tonic + fifth (tanpura, bagpipe-like drones). 0–1. */
  drone: number;
}

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** MIDI value of a scale degree; degrees beyond the scale wrap into higher or lower octaves. */
export function degreeToMidi(p: SoundProfile, degree: number): number {
  const n = p.scale.length;
  const octave = Math.floor(degree / n);
  return p.root + octave * 12 + p.scale[((degree % n) + n) % n];
}

/** Small deterministic PRNG (mulberry32), so each culture always gets the same tunes. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** One step of a phrase: a scale degree or a rest, with a length in steps. */
export interface Note {
  degree: number | null;
  steps: number;
}

/**
 * Generative phrase of `steps` eighth-notes: a stepwise random walk that mostly moves by
 * neighbouring degrees, leans back toward the tonic, and ends on a stable degree.
 */
export function phrase(seed: number, steps = 16, range = 7): Note[] {
  const r = rng(seed);
  const out: Note[] = [];
  let degree = 0, used = 0;
  while (used < steps) {
    const len = Math.min(steps - used, r() < 0.65 ? 1 : r() < 0.8 ? 2 : 3);
    if (r() < 0.18 && used > 0) out.push({ degree: null, steps: len });
    else {
      const leap = r() < 0.75 ? (r() < 0.5 ? -1 : 1) : Math.round((r() - 0.5) * 6);
      degree = Math.max(-2, Math.min(range, degree + leap - (degree > 4 && r() < 0.4 ? 1 : 0)));
      out.push({ degree, steps: len });
    }
    used += len;
  }
  const last = out[out.length - 1];
  if (last.degree !== null) last.degree = r() < 0.5 ? 0 : 4;
  return out;
}

/** 8-step percussion patterns: 2 = accent, 1 = soft hit, 0 = rest. */
export const PATTERNS: Record<Exclude<Perc, 'none'>, { low: number[]; high: number[] }> = {
  hand: { low: [2, 0, 0, 1, 0, 0, 2, 0], high: [0, 1, 1, 0, 1, 1, 0, 1] },
  frame: { low: [2, 0, 0, 0, 1, 0, 0, 0], high: [0, 1, 0, 1, 0, 1, 1, 1] },
  taiko: { low: [2, 0, 0, 0, 2, 0, 1, 0], high: [0, 0, 1, 0, 0, 0, 0, 1] },
  gong: { low: [2, 0, 0, 0, 0, 0, 0, 0], high: [0, 0, 1, 0, 1, 0, 1, 0] },
};

/**
 * Layer mix from play state: calm music that builds with the combo and turns tense as the artifact suffers.
 * intensity 0–1 (combo), integrity 0–1 (artifact condition).
 */
export function mix(intensity: number, integrity: number) {
  const i = Math.max(0, Math.min(1, intensity));
  return {
    bass: 0.55,
    perc: 0.2 + 0.8 * i,
    lead: 0.35 + 0.65 * i,
    /** Probability each lead note actually plays: sparse when calm, full when on a streak. */
    density: 0.45 + 0.55 * i,
    tension: integrity < 0.4 ? (0.4 - integrity) / 0.4 : 0,
  };
}

/** Menus: a gentle music-box loop. */
export const MENU_PROFILE: SoundProfile = { root: 62, scale: [0, 2, 4, 7, 9], tempo: 84, lead: 'mallet', perc: 'none', drone: 0 };
