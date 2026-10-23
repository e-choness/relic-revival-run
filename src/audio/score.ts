import { PATTERNS, degreeToMidi, rng, seedFrom, type Note, type SoundProfile } from './music';

export type ScoreLayer = 'lead' | 'response' | 'harmony' | 'bass' | 'perc';
export interface ScoreEvent {
  layer: ScoreLayer;
  midi?: number;
  part?: 'low' | 'high';
  /** Eighth notes, relative to the current step. */
  duration: number;
  offset: number;
  velocity: number;
}

interface Arrangement {
  harmony: 'tonal' | 'open' | 'drone';
  roots: number[];
  companion: string;
  /** Which eighth notes receive the broken-chord accompaniment. */
  pulse: number[];
  room: number;
}

// Game arrangements inspired by the existing profiles, not reconstructions of traditional practice.
export const ARRANGEMENTS: Record<string, Arrangement> = {
  menu: { harmony: 'open', roots: [0, 0, 1, 0], companion: 'folkHarp', pulse: [0, 4], room: 0.12 },
  mexico: { harmony: 'tonal', roots: [0, 3, 4, 0], companion: 'altoRecorder', pulse: [0, 3, 6], room: 0.1 },
  portugal: { harmony: 'tonal', roots: [0, 3, 4, 0], companion: 'folkHarp', pulse: [0, 2, 4, 6], room: 0.16 },
  china: { harmony: 'open', roots: [0, 1, 3, 0], companion: 'altoRecorder', pulse: [0, 4, 6], room: 0.16 },
  egypt: { harmony: 'drone', roots: [0, 0, 0, 0], companion: 'strumstick', pulse: [0, 3, 6], room: 0.2 },
  greece: { harmony: 'open', roots: [0, 3, 1, 0], companion: 'altoRecorder', pulse: [0, 3, 4, 6], room: 0.12 },
  peru: { harmony: 'open', roots: [0, 2, 3, 0], companion: 'folkHarp', pulse: [0, 2, 5], room: 0.14 },
  japan: { harmony: 'open', roots: [0, 0, 2, 0], companion: 'altoRecorder', pulse: [0, 5], room: 0.18 },
  india: { harmony: 'drone', roots: [0, 0, 0, 0], companion: 'strumstick', pulse: [0, 3, 5, 6], room: 0.14 },
  iran: { harmony: 'drone', roots: [0, 0, 0, 0], companion: 'folkHarp', pulse: [0, 2, 5, 6], room: 0.16 },
  nigeria: { harmony: 'open', roots: [0, 0, 3, 0], companion: 'marimba', pulse: [0, 3, 6], room: 0.09 },
  cambodia: { harmony: 'open', roots: [0, 1, 3, 0], companion: 'vibraphone', pulse: [0, 2, 4, 6], room: 0.15 },
  mali: { harmony: 'open', roots: [0, 3, 4, 0], companion: 'kalimba', pulse: [0, 3, 5, 6], room: 0.1 },
};

export interface Score {
  seed: number;
  phrases: Note[][];
  chords: number[][];
  arrangement: Arrangement;
}

/** Unlike degree 4, this works for five-, seven-, and microtonal-note scales. */
export function fifthDegree(p: SoundProfile) {
  return p.scale.reduce((best, value, i) => Math.abs(value - 7) < Math.abs(p.scale[best] - 7) ? i : best, 0);
}

/** Choose a compact inversion with the least movement from the previous harmony. */
export function voiceLead(pitches: number[], previous: number[]): number[] {
  const candidates: number[][] = [];
  for (let inversion = 0; inversion < pitches.length; inversion++) {
    const notes = pitches.map((m, i) => m + (i < inversion ? 12 : 0)).sort((a, b) => a - b);
    for (const octave of [-12, 0, 12]) {
      const shifted = notes.map(m => m + octave);
      if (shifted[0] >= 43 && shifted.at(-1)! <= 78) candidates.push(shifted);
    }
  }
  const movement = (notes: number[]) => notes.reduce((sum, m, i) => sum + Math.abs(m - (previous[i] ?? 60 + i * 4)), 0);
  return candidates.sort((a, b) => movement(a) - movement(b))[0] ?? pitches;
}

/** A two-bar idea becomes a related eight-bar statement, variation, answer, and return. */
export function composeScore(p: SoundProfile, key: string): Score {
  const seed = seedFrom(key), random = rng(seed);
  const arrangement = ARRANGEMENTS[key] ?? ARRANGEMENTS.menu;
  const rhythms = [[2, 1, 1, 2, 2, 1, 1, 2, 2, 2], [2, 2, 1, 1, 2, 2, 1, 1, 2, 2], [1, 1, 2, 2, 2, 2, 2, 2, 2]];
  const rhythm = rhythms[Math.floor(random() * rhythms.length)];
  let degree = 0;
  const motif = rhythm.map((steps, i): Note => {
    if (i === rhythm.length - 1) return { degree: null, steps }; // an intentional answering space
    if (i > 0) degree = Math.max(-1, Math.min(p.scale.length, degree + (random() < 0.45 ? -1 : 1)));
    return { degree, steps };
  });
  const variation = motif.map((n, i) => ({ ...n, degree: n.degree === null ? null : i < 3 ? n.degree : Math.max(-1, Math.min(p.scale.length, n.degree + (i % 3 === 0 ? 1 : 0))) }));
  const answer = motif.map(n => ({ ...n, degree: n.degree === null ? null : Math.max(-1, Math.min(p.scale.length + 1, fifthDegree(p) - n.degree)) }));
  const returning = motif.map(n => ({ ...n }));
  returning[returning.length - 2].degree = 1;
  returning[returning.length - 1].degree = 0;
  let previous = [p.root - 12, p.root - 5, p.root];
  const chords = arrangement.roots.map(root => {
    const degrees = arrangement.harmony === 'tonal' ? [root, root + 2, root + 4]
      : arrangement.harmony === 'drone' ? [0, fifthDegree(p), p.scale.length]
      : [root, root + fifthDegree(p), root + p.scale.length];
    previous = voiceLead(degrees.map(d => degreeToMidi(p, d) - 12), previous);
    return previous;
  });
  return { seed, arrangement, phrases: [motif, variation, answer, returning], chords };
}

/** Pure event generation: no playback-time randomness and no discarded melody notes. */
export function scoreEvents(score: Score, p: SoundProfile, step: number, intensity: number): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  const phIndex = Math.floor(step / 16) % 4, pos = step % 16, beat = step % 8;
  const cycle = Math.floor(step / 64);
  const random = rng(score.seed ^ Math.imul(step + 1, 7919));
  const expression = 0.92 + random() * 0.16;
  const chord = score.chords[phIndex];
  const push = (layer: ScoreLayer, midi: number, duration: number, velocity: number, offset = 0) =>
    events.push({ layer, midi, duration, offset, velocity: velocity * expression });

  let at = 0, resting = false;
  for (const n of score.phrases[phIndex]) {
    if (pos >= at && pos < at + n.steps) resting = n.degree === null;
    if (at === pos && n.degree !== null) {
      let midi = degreeToMidi(p, n.degree);
      // Strong beats in tonal arrangements lean on the current chord; the cadence stays tonic.
      if (score.arrangement.harmony === 'tonal' && pos % 4 === 0 && !(phIndex === 3 && pos >= 12)) {
        const tones = chord.flatMap(m => [m, m + 12, m + 24]);
        midi = tones.sort((a, b) => Math.abs(a - midi) - Math.abs(b - midi))[0];
      }
      push('lead', midi, n.steps * 0.88, pos % 4 === 0 ? 0.48 : 0.39);
    }
    at += n.steps;
  }
  if (resting && (pos % 2 === 0 || intensity > 0.65)) {
    const degree = pos % 2 === 0 ? fifthDegree(p) : 1;
    push('response', degreeToMidi(p, degree), 0.8, 0.24, 0.025);
  }

  const root = score.arrangement.roots[phIndex];
  if (beat === 0) push('bass', degreeToMidi(p, root) - 24, 3.5, 0.36);
  if (beat === 4) push('bass', degreeToMidi(p, root + fifthDegree(p)) - 24, 2.8, 0.25);
  // Long, quiet voicings plus a different broken-chord pattern for each arrangement.
  if (pos === 0) chord.forEach(midi => push('harmony', midi, 6.5, 0.1));
  if (score.arrangement.pulse.includes(beat)) {
    const index = score.arrangement.pulse.indexOf(beat);
    push('harmony', chord[(index + (cycle % 2)) % chord.length] + 12, 1.5, 0.15, beat === 0 ? 0 : 0.02);
  }

  if (p.perc !== 'none') {
    const pattern = PATTERNS[p.perc];
    for (const part of ['low', 'high'] as const) {
      const accent = pattern[part][beat];
      if (accent) events.push({ layer: 'perc', part, duration: 1, offset: 0, velocity: (accent === 2 ? 0.58 : 0.32) * expression });
    }
    // A small pickup at a structural boundary, not a roll at every phrase ending.
    if (intensity > 0.55 && step % 32 === 31)
      events.push({ layer: 'perc', part: 'high', duration: 0.5, offset: 0.5, velocity: 0.22 });
  }
  return events;
}

export function arrangementMix(intensity: number, integrity: number, step: number) {
  const energy = Math.max(0, Math.min(1, intensity));
  const arc = [0.8, 1, 0.9, 0.72][Math.floor(step / 32) % 4];
  return {
    lead: 0.72,
    response: (0.32 + energy * 0.35) * arc,
    harmony: (0.4 + energy * 0.26) * arc,
    bass: 0.54,
    perc: 0.32 + energy * 0.48,
    tension: Math.max(0, Math.min(1, (0.4 - integrity) / 0.4)) * 0.14,
  };
}
