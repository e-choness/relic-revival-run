// Pure musical primitives. The arrangements live in styles.ts; score.ts turns them into events.
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
  /** Open (CC0) instrument samples from public/assets/audio/manifest.json; the synth timbres above are the fallback. */
  samples?: { lead: string; low?: string; high?: string };
}

/** One pitched sample in the audio manifest. */
export interface PitchedSample {
  midi: number;
  file: string;
}

/** Instruments whose samples are held notes (wind, bowed): cut them at the note's end instead of letting them ring. */
export const SUSTAINED = new Set(['altoRecorder', 'sopranoRecorder', 'tenorRecorder', 'bowedPsaltery']);

/** The sample closest in pitch, and the playback rate that tunes it to `midi` (microtones included). */
export function nearestSample<T extends PitchedSample>(samples: T[], midi: number): { sample: T; rate: number } | null {
  let best: T | null = null;
  for (const s of samples) if (!best || Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
  return best && { sample: best, rate: Math.pow(2, (midi - best.midi) / 12) };
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

/** Menus: a gentle music-box loop. */
export const MENU_PROFILE: SoundProfile = { root: 62, scale: [0, 2, 4, 7, 9], tempo: 84, lead: 'mallet', perc: 'none', drone: 0, samples: { lead: 'vibraphone' } };
