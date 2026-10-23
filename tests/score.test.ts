import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CULTURES } from '../src/data/cultures';
import { MENU_PROFILE } from '../src/audio/music';
import { ARRANGEMENTS, arrangementMix, composeScore, fifthDegree, scoreEvents, voiceLead } from '../src/audio/score';

describe('structured composition', () => {
  it('develops a repeatable motif into four exact two-bar phrases with a tonic close', () => {
    for (const c of CULTURES) {
      const score = composeScore(c.sound, c.id);
      expect(composeScore(c.sound, c.id)).toEqual(score);
      expect(score.phrases).toHaveLength(4);
      for (const phrase of score.phrases) expect(phrase.reduce((sum, n) => sum + n.steps, 0)).toBe(16);
      expect(score.phrases[1].slice(0, 3)).toEqual(score.phrases[0].slice(0, 3));
      expect(score.phrases[2]).not.toEqual(score.phrases[0]);
      expect(score.phrases[3].at(-1)?.degree).toBe(0);
    }
  });

  it('finds a fifth using intervals rather than assuming a seven-note scale', () => {
    expect(fifthDegree(MENU_PROFILE)).toBe(3);
    expect(fifthDegree(CULTURES[0].sound)).toBe(4);
  });

  it('keeps generated pitches in the profile scale, including microtones, with bounded voices', () => {
    for (const c of CULTURES) {
      const score = composeScore(c.sound, c.id);
      let fractional = false;
      for (let step = 0; step < 256; step++) {
        const events = scoreEvents(score, c.sound, step, 1);
        expect(events.length).toBeLessThanOrEqual(8);
        for (const event of events) {
          expect(event.velocity).toBeGreaterThan(0);
          expect(event.velocity).toBeLessThan(0.7);
          expect(event.duration).toBeGreaterThan(0);
          expect(event.offset).toBeGreaterThanOrEqual(0);
          expect(event.offset).toBeLessThanOrEqual(0.5);
          if (event.midi === undefined) continue;
          expect(event.midi).toBeGreaterThanOrEqual(33);
          expect(event.midi).toBeLessThanOrEqual(90);
          expect(c.sound.scale).toContain(((event.midi - c.sound.root) % 12 + 12) % 12);
          fractional ||= event.midi % 1 !== 0;
        }
      }
      if (c.id === 'iran') expect(fractional).toBe(true);
    }
  });

  it('keeps the complete melody at low combo and puts responses only in composed rests', () => {
    const c = CULTURES[9], score = composeScore(c.sound, c.id);
    for (let step = 0; step < 64; step++) {
      const calm = scoreEvents(score, c.sound, step, 0);
      const full = scoreEvents(score, c.sound, step, 1);
      expect(calm.filter(e => e.layer === 'lead')).toEqual(full.filter(e => e.layer === 'lead'));
      if (full.some(e => e.layer === 'response')) {
        let at = 0;
        const note = score.phrases[Math.floor(step / 16)].find(n => {
          const contains = step % 16 >= at && step % 16 < at + n.steps;
          at += n.steps;
          return contains;
        });
        expect(note?.degree).toBeNull();
      }
    }
  });

  it('uses compact inversions and retains open drone harmony across phrases', () => {
    expect(voiceLead([60, 64, 67], [55, 60, 64])).toEqual([55, 60, 64]);
    for (const id of ['egypt', 'india', 'iran']) {
      const c = CULTURES.find(c => c.id === id)!;
      const score = composeScore(c.sound, c.id);
      score.chords.forEach(chord => expect(chord).toEqual(score.chords[0]));
    }
  });

  it('has complete arrangements and real companion samples for every culture', () => {
    const manifest = JSON.parse(readFileSync('public/assets/audio/manifest.json', 'utf8'));
    for (const id of ['menu', ...CULTURES.map(c => c.id)]) {
      expect(ARRANGEMENTS[id]).toBeDefined();
      expect(manifest.melodic[ARRANGEMENTS[id].companion]?.length).toBeGreaterThan(0);
    }
  });

  it('builds support layers, changes over sections, and reserves tension for low condition', () => {
    expect(arrangementMix(0, 1, 0).lead).toBeGreaterThan(0.5);
    expect(arrangementMix(1, 1, 0).harmony).toBeGreaterThan(arrangementMix(0, 1, 0).harmony);
    expect(arrangementMix(1, 1, 32).harmony).not.toBe(arrangementMix(1, 1, 0).harmony);
    expect(arrangementMix(1, 1, 0).tension).toBe(0);
    expect(arrangementMix(0, 0.1, 0).tension).toBeGreaterThan(0);
  });
});
