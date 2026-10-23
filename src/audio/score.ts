import { degreeToMidi, rng, seedFrom, type SoundProfile } from './music';
import { STYLES, type Counter, type Level, type Style } from './styles';

// Turns a culture's written style (styles.ts) into timed note and drum events. Pure, so it is unit tested
// and every playthrough of a culture plays the same music; AudioDirector schedules the events.
//
// Form: A, A again (more decorated), B, A (with the cadence bar), then round again. What changes with
// play is who joins in: the lead's tune is always complete; accompaniment, counter-voices, more drums
// and ornaments enter as the combo grows (see Level in styles.ts).

export type ScoreLayer = 'lead' | 'response' | 'harmony' | 'bass' | 'perc';
export type Ornament = 'roll' | 'grace' | 'slide';

export interface ScoreEvent {
  layer: ScoreLayer;
  /** Sampled instrument (melodic layers) or percussion sample key. */
  instrument?: string;
  midi?: number;
  /** Synthesized drum to use until the percussion sample loads. */
  part?: 'low' | 'high';
  /** Talking drum: semitones the stroke falls through. */
  bend?: number;
  ornament?: Ornament;
  /** Pitch a grace note or slide starts from. */
  from?: number;
  /** Steps. */
  duration: number;
  /** Steps after the current step (0–0.5): swing and a player's small lateness. */
  offset: number;
  velocity: number;
}

interface Token {
  degree: number | null;
  steps: number;
  ornament?: Ornament;
  chord?: { member: 'R' | 'T' | 'F' | 'O' | 'C'; octave: number };
}

/** A note placed on the cycle's step grid. */
interface Placed {
  layer: Exclude<ScoreLayer, 'perc'>;
  instrument: string;
  midi: number;
  steps: number;
  level: Level;
  gain: number;
  ornament?: Ornament;
  /** Ornaments marked in the score always play; added ones wait for this level. */
  ornamentLevel?: Level;
  from?: number;
  /** Heterophony trails the lead slightly. */
  lag?: number;
}

export interface Score {
  key: string;
  style: Style;
  seed: number;
  /** Steps per bar and per full form. */
  barSteps: number;
  cycle: number;
  /** Bars in each section, for phrase shaping. */
  sectionBars: number;
  notes: Map<number, Placed[]>;
  /** Percussion voices as per-step strings, cycling. */
  drums: { sample: string; part: 'low' | 'high'; level: Level; bend?: number; gain: number; hits: string }[];
}

const ORNAMENTS: Record<string, Ornament> = { '~': 'roll', '^': 'grace', '/': 'slide' };

/** Parse one written line into bars of tokens, checking every bar fills the meter exactly. */
export function parseLine(text: string, barSteps: number): Token[][] {
  return text.split('|').map((bar, i) => {
    const tokens = bar.trim().split(/\s+/).filter(Boolean).map((t): Token => {
      const m = t.match(/^(-?\d+|-|[RTFOC])([,']*)([~^/]?):(\d+)$/);
      if (!m) throw new Error(`Bad token "${t}" in "${text}"`);
      const [, head, octaves, orn, len] = m;
      const steps = Number(len);
      if (head === '-') return { degree: null, steps };
      if (/[RTFOC]/.test(head)) {
        const octave = [...octaves].reduce((o, c) => o + (c === "'" ? 1 : -1), 0);
        return { degree: null, steps, chord: { member: head as 'R', octave } };
      }
      return { degree: Number(head), steps, ornament: orn ? ORNAMENTS[orn] : undefined };
    });
    const total = tokens.reduce((n, t) => n + t.steps, 0);
    if (total !== barSteps) throw new Error(`Bar ${i + 1} of "${text}" has ${total} steps, not ${barSteps}`);
    return tokens;
  });
}

/** The scale degree nearest a perfect fifth above the tonic; works for five-, seven- and microtonal scales. */
export function fifthDegree(p: SoundProfile) {
  return p.scale.reduce((best, value, i) => Math.abs(value - 7) < Math.abs(p.scale[best] - 7) ? i : best, 0);
}

/** Degrees above `root` for a chord member, measured in semitones so it works in any scale. */
function memberOffset(p: SoundProfile, root: number, member: 'R' | 'T' | 'F' | 'O'): number {
  const n = p.scale.length;
  if (member === 'R') return 0;
  if (member === 'O') return n;
  if (n === 7) return member === 'T' ? 2 : 4;
  const target = member === 'T' ? 3.5 : 7;
  let best = 1;
  for (let k = 1; k < n; k++) {
    const d = degreeToMidi(p, root + k) - degreeToMidi(p, root);
    if (Math.abs(d - target) < Math.abs(degreeToMidi(p, root + best) - degreeToMidi(p, root) - target)) best = k;
  }
  return best;
}

function chordMembers(kind: Style['harmony']['kind']): ('R' | 'T' | 'F' | 'O')[] {
  return kind === 'triad' ? ['R', 'T', 'F'] : kind === 'open' ? ['R', 'F', 'O'] : ['R', 'F'];
}

/** Pinpeat elaboration: each core note becomes running eighths that leap to its octave and lean into the next. */
function elaborate(bars: Token[][], p: SoundProfile, sub: number): Token[][] {
  const flat = bars.flat();
  const eighth = sub === 4 ? 2 : 1;
  let index = 0;
  return bars.map((bar) => bar.flatMap((t) => {
    const next = flat.slice(index + 1).find((n) => n.degree !== null)?.degree ?? t.degree;
    index++;
    if (t.degree === null) return [t];
    const count = t.steps / eighth, out: Token[] = [];
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      const toward = next! > t.degree ? next! - 1 : next! < t.degree ? next! + 1 : t.degree + p.scale.length;
      out.push({ degree: i === 0 ? t.degree : last ? toward : i % 2 ? t.degree + p.scale.length : t.degree, steps: eighth });
    }
    return out;
  }));
}

/** Compose the full cycle for a culture (or the menus). */
export function composeScore(p: SoundProfile, key: string): Score {
  const style = STYLES[key] ?? STYLES.menu;
  const { beats, sub } = style.meter;
  const barSteps = beats * sub;
  const themes = { A: parseLine(style.themes.A, barSteps), B: parseLine(style.themes.B, barSteps) };
  const cadence = style.themes.cadence ? parseLine(style.themes.cadence, barSteps)[0] : undefined;
  if (themes.B.length !== themes.A.length) throw new Error(`${key}: A and B must have the same number of bars`);
  const sectionBars = themes.A.length;
  const form: { name: 'A' | 'B'; decorated: boolean; last: boolean }[] = [
    { name: 'A', decorated: false, last: false }, { name: 'A', decorated: true, last: false },
    { name: 'B', decorated: true, last: false }, { name: 'A', decorated: false, last: true },
  ];
  const notes = new Map<number, Placed[]>();
  const place = (at: number, n: Placed) => (notes.get(at) ?? notes.set(at, []).get(at)!).push(n);
  const midiOf = (degree: number, octave = 0) => degreeToMidi(p, degree) + 12 * octave;
  const leadOctave = style.lead.octave ?? 0;
  const bass = style.bass && parseLine(style.bass.pattern, barSteps);
  const comp = style.comp && parseLine(style.comp.pattern, barSteps);
  const answers = Object.fromEntries(style.counters.filter((c) => c.lines).map((c) => [c.instrument + c.mode, { A: parseLine(c.lines!.A, barSteps), B: parseLine(c.lines!.B, barSteps) }]));

  form.forEach((section, s) => {
    const written = themes[section.name].map((bar, b) => (section.last && cadence && b === sectionBars - 1 ? cadence : bar));
    const lead = style.lead.elaborate ? elaborate(written, p, sub) : written;
    const roots = style.harmony[section.name];
    const sectionStart = s * sectionBars * barSteps;

    // The lead's tune, with its written ornaments, plus idiomatic ones on long notes once the music has energy.
    let at = sectionStart;
    const rests: { at: number; steps: number; bar: number }[] = [];
    lead.forEach((bar, b) => bar.forEach((t) => {
      if (t.degree === null) rests.push({ at, steps: t.steps, bar: b });
      else {
        const long = t.steps >= sub;
        const ornament = t.ornament ?? (long && style.lead.ornament !== 'none' ? style.lead.ornament : undefined);
        const from = ornament === 'grace' ? midiOf(t.degree + 1, leadOctave) : ornament === 'slide' ? midiOf(t.degree - 1, leadOctave) : undefined;
        place(at, {
          layer: 'lead', instrument: style.lead.instrument, midi: midiOf(t.degree, leadOctave), steps: t.steps, level: 0, gain: style.lead.gain ?? 1,
          ornament, from, ornamentLevel: t.ornament ? 0 : section.decorated ? 1 : 2,
        });
      }
      at += t.steps;
    }));

    for (const counter of style.counters) placeCounter(counter, written, rests, roots, sectionStart, section.name);

    // Harmony: bass and accompaniment follow each bar's chord.
    roots.forEach((root, b) => {
      const barStart = sectionStart + b * barSteps;
      const chordNotes = (t: Token, octave: number): number[] => {
        if (t.chord) {
          const members = t.chord.member === 'C' ? chordMembers(style.harmony.kind) : [t.chord.member];
          return members.map((m) => midiOf(root + memberOffset(p, root, m), octave + t.chord!.octave));
        }
        return t.degree === null ? [] : [midiOf(t.degree, octave)];
      };
      if (bass && style.bass) {
        let x = barStart;
        for (const t of bass[(s * sectionBars + b) % bass.length]) {
          // Two octaves down, but never below D2, where a small speaker loses the note.
          for (const midi of chordNotes(t, -2)) place(x, { layer: 'bass', instrument: 'bass', midi: midi < 38 ? midi + 12 : midi, steps: t.steps, level: style.bass.level, gain: 1 });
          x += t.steps;
        }
      }
      if (comp && style.comp) {
        let x = barStart;
        for (const t of comp[(s * sectionBars + b) % comp.length]) {
          for (const midi of chordNotes(t, style.comp.octave ?? -1)) place(x, { layer: 'harmony', instrument: style.comp.instrument, midi, steps: t.steps, level: style.comp.level, gain: style.comp.gain ?? 1 });
          x += t.steps;
        }
      }
    });
  });

  function placeCounter(counter: Counter, written: Token[][], rests: { at: number; steps: number; bar: number }[], roots: number[], sectionStart: number, name: 'A' | 'B') {
    const octave = leadOctave + (counter.octave ?? 0);
    const base = { layer: 'response' as const, instrument: counter.instrument, level: counter.level, gain: counter.gain ?? 1 };
    let at = sectionStart;
    if (counter.mode === 'answer') {
      for (const bar of answers[counter.instrument + counter.mode][name])
        for (const t of bar) {
          if (t.degree !== null) place(at, { ...base, midi: midiOf(t.degree, octave), steps: t.steps });
          at += t.steps;
        }
      return;
    }
    if (counter.mode === 'fill') {
      // Quick runs down the chord, starting high, in every rest of a beat or more.
      for (const r of rests) {
        if (r.steps < sub) continue;
        const root = roots[r.bar];
        const run = [...chordMembers(style.harmony.kind === 'drone' ? 'open' : style.harmony.kind), 'O' as const]
          .map((m) => root + memberOffset(p, root, m)).sort((a, b) => b - a);
        const tones = [...run, ...run.slice(1).map((d) => d - p.scale.length)];
        for (let i = 0; i < Math.min(r.steps, tones.length); i++)
          place(r.at + i, { ...base, midi: midiOf(tones[i], octave), steps: 1 });
      }
      return;
    }
    const flat = written.flat();
    if (counter.mode === 'heterophony') {
      // A second player's version: one note per beat (or held), a touch behind.
      for (const t of flat) {
        if (t.degree !== null && (at % sub === 0 || t.steps >= sub))
          place(at, { ...base, midi: midiOf(t.degree, octave), steps: Math.max(t.steps, sub), lag: 0.12 });
        at += t.steps;
      }
      return;
    }
    const down = p.scale.length === 7 ? 2 : 1;
    for (const t of flat) {
      if (t.degree !== null) place(at, { ...base, midi: midiOf(counter.mode === 'thirds' ? t.degree - down : t.degree, octave), steps: t.steps });
      at += t.steps;
    }
  }

  const cycle = form.length * sectionBars * barSteps;
  const drums = style.perc.map((v) => {
    const bars = v.pattern.split('|');
    for (const bar of bars) if (bar.length !== barSteps) throw new Error(`${key}: drum bar "${bar}" is not ${barSteps} steps`);
    return { sample: v.sample, part: v.part, level: v.level, bend: v.bend, gain: v.gain ?? 1, hits: bars.join('') };
  });
  return { key, style, seed: seedFrom(key), barSteps, cycle, sectionBars, notes, drums };
}

/** Energy level from the combo intensity (0–1). */
export function levelFor(intensity: number): Level {
  return intensity >= 0.85 ? 3 : intensity >= 0.5 ? 2 : intensity >= 0.2 ? 1 : 0;
}

const LAYER_VELOCITY: Record<ScoreLayer, number> = { lead: 0.5, response: 0.4, harmony: 0.32, bass: 0.38, perc: 1 };
const STROKE: Record<string, number> = { X: 0.6, x: 0.36, o: 0.2 };
/** Phrase shape across a four-bar section: rise to the second bar, ease at the close. */
const ARC = [0.93, 1, 0.97, 0.88];

/** Events starting at `step`, with energy-dependent entries, metric accents and a player's timing. */
export function scoreEvents(score: Score, p: SoundProfile, step: number, intensity: number): ScoreEvent[] {
  void p;
  const level = levelFor(intensity);
  const { style, barSteps } = score;
  const { sub } = style.meter;
  const s = ((step % score.cycle) + score.cycle) % score.cycle;
  const random = rng(score.seed ^ Math.imul(step + 1, 7919));
  const onBar = s % barSteps === 0, onBeat = s % sub === 0;
  const accent = onBar ? 1 : onBeat ? 0.9 : 0.78;
  const bar = Math.floor(s / barSteps) % score.sectionBars;
  const arc = ARC[Math.round((bar / Math.max(1, score.sectionBars - 1)) * 3)];
  // Off-beat sixteenths swing a little; everything but the beat itself can sit a touch late.
  const timing = () => Math.min(0.5, (sub === 4 && s % 2 === 1 ? style.swing : 0) + (onBeat ? 0 : random() * style.humanize));
  const events: ScoreEvent[] = [];

  for (const n of score.notes.get(s) ?? []) {
    if (n.level > level) continue;
    const ornament = n.ornament && (n.ornamentLevel ?? 0) <= level ? n.ornament : undefined;
    const velocity = Math.min(0.68, LAYER_VELOCITY[n.layer] * n.gain * accent * arc * (0.94 + random() * 0.12));
    events.push({
      layer: n.layer, instrument: n.instrument, midi: n.midi, duration: n.steps * (n.layer === 'lead' ? 0.92 : 0.85),
      offset: Math.min(0.5, (n.lag ?? 0) + (n.layer === 'bass' && onBeat ? 0 : timing())), velocity,
      ...(ornament ? { ornament, from: n.from } : {}),
    });
  }
  for (const d of score.drums) {
    if (d.level > level) continue;
    const stroke = STROKE[d.hits[s % d.hits.length]];
    if (!stroke) continue;
    events.push({
      layer: 'perc', instrument: d.sample, part: d.part, bend: d.bend, duration: 1,
      offset: d.part === 'low' && onBeat ? 0 : timing(), velocity: Math.min(0.68, stroke * d.gain * (0.92 + random() * 0.16)),
    });
  }
  return events;
}

/** Every sampled instrument a score can play, so they can load before they are needed. */
export function instrumentsOf(score: Score): { melodic: string[]; perc: string[] } {
  const melodic = new Set<string>();
  for (const list of score.notes.values()) for (const n of list) if (n.layer !== 'bass') melodic.add(n.instrument);
  return { melodic: [...melodic], perc: [...new Set(score.drums.map((d) => d.sample))] };
}

/**
 * Layer gains. Entries are decided per bar by level (scoreEvents); these keep the balance and let the
 * texture swell with the combo. Low condition brings in the tension drone.
 */
export function arrangementMix(intensity: number, integrity: number, step: number) {
  const energy = Math.max(0, Math.min(1, intensity));
  const arc = [0.9, 1, 0.95, 0.85][Math.floor(step / 64) % 4];
  // Levels measured with scripts/review-museum-music.cjs: about −26 to −30 dBFS RMS with peaks well clear of clipping.
  return {
    lead: 1.25,
    response: (0.85 + energy * 0.3) * arc,
    harmony: (0.8 + energy * 0.3) * arc,
    bass: 0.85,
    perc: 0.7 + energy * 0.5,
    tension: Math.max(0, Math.min(1, (0.4 - integrity) / 0.4)) * 0.14,
  };
}
