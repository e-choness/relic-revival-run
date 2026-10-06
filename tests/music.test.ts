import { describe, expect, it } from 'vitest';
import { MENU_PROFILE, PATTERNS, degreeToMidi, midiToFreq, mix, phrase, rng, seedFrom } from '../src/audio/music';
import { CULTURES } from '../src/data/cultures';

describe('music theory helpers', () => {
  it('converts MIDI to frequency', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(81)).toBeCloseTo(880);
  });

  it('wraps scale degrees across octaves', () => {
    const p = { ...MENU_PROFILE, root: 60, scale: [0, 2, 4, 7, 9] };
    expect(degreeToMidi(p, 0)).toBe(60);
    expect(degreeToMidi(p, 5)).toBe(72);
    expect(degreeToMidi(p, -1)).toBe(57);
  });

  it('supports microtonal degrees (Persian shur)', () => {
    const iran = CULTURES.find((c) => c.id === 'iran')!.sound;
    expect(degreeToMidi(iran, 1) % 1).toBeCloseTo(0.5);
  });
});

describe('generative phrases', () => {
  it('are deterministic per seed and fill the bar exactly', () => {
    const a = phrase(seedFrom('egypt'));
    expect(phrase(seedFrom('egypt'))).toEqual(a);
    expect(a.reduce((n, x) => n + x.steps, 0)).toBe(16);
  });

  it('end on a stable degree when they end on a note', () => {
    for (let s = 1; s < 40; s++) {
      const last = phrase(s).at(-1)!;
      if (last.degree !== null) expect([0, 4]).toContain(last.degree);
    }
  });

  it('rng stays in [0, 1)', () => {
    const r = rng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('reactive mix', () => {
  it('builds with the combo and turns tense at low integrity', () => {
    const calm = mix(0, 1), hot = mix(1, 1), danger = mix(0, 0.1);
    expect(hot.perc).toBeGreaterThan(calm.perc);
    expect(hot.density).toBeGreaterThan(calm.density);
    expect(calm.tension).toBe(0);
    expect(danger.tension).toBeGreaterThan(0.5);
  });
});

describe('culture sound profiles', () => {
  it('every culture has a playable profile', () => {
    for (const c of CULTURES) {
      expect(c.sound.scale[0]).toBe(0);
      expect(c.sound.tempo).toBeGreaterThan(50);
      if (c.sound.perc !== 'none') expect(PATTERNS[c.sound.perc].low).toHaveLength(8);
    }
  });
});
