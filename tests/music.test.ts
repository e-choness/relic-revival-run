import { describe, expect, it } from 'vitest';
import { MENU_PROFILE, degreeToMidi, midiToFreq, nearestSample, rng } from '../src/audio/music';
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

describe('seeded randomness', () => {
  it('rng stays in [0, 1)', () => {
    const r = rng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('culture sound profiles', () => {
  it('every culture has a playable profile', () => {
    for (const c of CULTURES) {
      expect(c.sound.scale[0]).toBe(0);
      expect(c.sound.tempo).toBeGreaterThan(50);
    }
  });
});

describe('sampled instruments', () => {
  const samples = [{ midi: 60, file: 'a' }, { midi: 67, file: 'b' }, { midi: 72, file: 'c' }];

  it('picks the closest sample and tunes it', () => {
    const hit = nearestSample(samples, 62)!;
    expect(hit.sample.file).toBe('a');
    expect(hit.rate).toBeCloseTo(Math.pow(2, 2 / 12));
  });

  it('handles microtones', () => {
    expect(nearestSample(samples, 67.5)!.rate).toBeCloseTo(Math.pow(2, 0.5 / 12));
  });

  it('returns null when nothing is loaded', () => {
    expect(nearestSample([], 60)).toBeNull();
  });

  it('every culture names instruments that exist in the audio manifest', async () => {
    const { readFileSync } = await import('node:fs');
    const m = JSON.parse(readFileSync('public/assets/audio/manifest.json', 'utf8'));
    for (const c of CULTURES) {
      const s = c.sound.samples!;
      expect(m.melodic[s.lead]?.length).toBeGreaterThan(2);
      for (const k of [s.low, s.high]) if (k) expect(m.perc[k]).toBeTruthy();
    }
    expect(m.melodic[MENU_PROFILE.samples!.lead]).toBeTruthy();
  });
});
