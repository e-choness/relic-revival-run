import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CULTURES } from '../src/data/cultures';
import { MENU_PROFILE, type SoundProfile } from '../src/audio/music';
import { arrangementMix, composeScore, fifthDegree, instrumentsOf, levelFor, parseLine, scoreEvents } from '../src/audio/score';
import { STYLES } from '../src/audio/styles';

const manifest = JSON.parse(readFileSync('public/assets/audio/manifest.json', 'utf8'));
const all: [string, SoundProfile][] = [['menu', MENU_PROFILE], ...CULTURES.map((c): [string, SoundProfile] => [c.id, c.sound])];
const cycleEvents = (id: string, p: SoundProfile, intensity: number) => {
  const score = composeScore(p, id);
  return Array.from({ length: score.cycle }, (_, step) => scoreEvents(score, p, step, intensity));
};

describe('written arrangements', () => {
  it('exist for the menus and every culture, and every bar fills its meter', () => {
    for (const [id, p] of all) {
      expect(STYLES[id], id).toBeDefined();
      expect(() => composeScore(p, id)).not.toThrow();
    }
  });

  it('reject a bar that does not add up', () => {
    expect(() => parseLine('0:4 1:4 | 2:4', 8)).toThrow(/Bar 2/);
    expect(() => parseLine('0:4 x:4', 8)).toThrow(/Bad token/);
    expect(parseLine("R,:4 C:2 3~:2", 8)[0].map((t) => t.steps)).toEqual([4, 2, 2]);
  });

  it('only use instruments and drums that exist in the sample manifest', () => {
    for (const [id, p] of all) {
      const used = instrumentsOf(composeScore(p, id));
      for (const inst of used.melodic) expect(manifest.melodic[inst]?.length, `${id}: ${inst}`).toBeGreaterThan(0);
      for (const key of used.perc) expect(manifest.perc[key], `${id}: ${key}`).toBeDefined();
    }
  });

  it('play the same music every time', () => {
    const c = CULTURES[3];
    expect(cycleEvents(c.id, c.sound, 0.6)).toEqual(cycleEvents(c.id, c.sound, 0.6));
  });

  it('stay in the scale (microtones included) and in each instrument’s sampled range, with bounded voices', () => {
    for (const [id, p] of all) {
      let fractional = false;
      for (const events of cycleEvents(id, p, 1)) {
        expect(events.length).toBeLessThanOrEqual(10);
        for (const e of events) {
          expect(e.velocity).toBeGreaterThan(0);
          expect(e.velocity).toBeLessThan(0.7);
          expect(e.duration).toBeGreaterThan(0);
          expect(e.offset).toBeGreaterThanOrEqual(0);
          expect(e.offset).toBeLessThanOrEqual(0.5);
          if (e.midi === undefined) continue;
          expect(p.scale, `${id} ${e.midi}`).toContain(((e.midi - p.root) % 12 + 12) % 12);
          fractional ||= e.midi % 1 !== 0;
          if (e.layer === 'bass') {
            expect(e.midi).toBeGreaterThanOrEqual(38);
            continue;
          }
          // Repitching a sample more than a fifth past its range sounds artificial.
          const midis = manifest.melodic[e.instrument!].map((s: { midi: number }) => s.midi);
          expect(e.midi, `${id} ${e.instrument}`).toBeGreaterThanOrEqual(Math.min(...midis) - 7);
          expect(e.midi, `${id} ${e.instrument}`).toBeLessThanOrEqual(Math.max(...midis) + 7);
        }
      }
      if (id === 'iran') expect(fractional).toBe(true);
    }
  });
});

describe('reactive arrangement', () => {
  const tune = (events: ReturnType<typeof scoreEvents>) => events.filter((e) => e.layer === 'lead').map((e) => [e.midi, e.offset, e.duration]);

  it('keeps the whole tune at any combo; players and drums join as the combo grows', () => {
    for (const [id, p] of all) {
      const calm = cycleEvents(id, p, 0), hot = cycleEvents(id, p, 1);
      calm.forEach((events, step) => expect(tune(events), `${id} step ${step}`).toEqual(tune(hot[step])));
      const count = (cycle: ReturnType<typeof cycleEvents>) => cycle.flat().length;
      expect(count(hot), id).toBeGreaterThan(count(calm));
    }
  });

  it('decorates long notes only once the music has energy (unless the score writes the ornament)', () => {
    const c = CULTURES.find((c) => c.id === 'china')!;
    const ornaments = (intensity: number) => cycleEvents(c.id, c.sound, intensity).flat().filter((e) => e.ornament).length;
    expect(ornaments(1)).toBeGreaterThan(ornaments(0));
    expect(ornaments(0)).toBeGreaterThan(0); // the written slides and tremolos
  });

  it('puts answers and fills only where the lead is silent', () => {
    for (const id of ['portugal', 'nigeria', 'mali']) {
      const c = CULTURES.find((c) => c.id === id)!, score = composeScore(c.sound, id);
      const sounding = new Set<number>();
      for (const [at, notes] of score.notes) for (const n of notes) if (n.layer === 'lead') for (let i = 0; i < n.steps; i++) sounding.add(at + i);
      const style = STYLES[id];
      const silentOnly = style.counters.filter((v) => v.mode === 'answer' || v.mode === 'fill').map((v) => v.instrument);
      for (const [at, notes] of score.notes)
        for (const n of notes) if (n.layer === 'response' && silentOnly.includes(n.instrument)) expect(sounding.has(at), `${id} step ${at}`).toBe(false);
    }
  });

  it('chooses entries per bar from the combo', () => {
    expect([0, 0.25, 0.6, 0.9].map(levelFor)).toEqual([0, 1, 2, 3]);
  });

  it('builds support layers, changes over sections, and reserves tension for low condition', () => {
    expect(arrangementMix(0, 1, 0).lead).toBeGreaterThan(0.5);
    expect(arrangementMix(1, 1, 0).harmony).toBeGreaterThan(arrangementMix(0, 1, 0).harmony);
    expect(arrangementMix(1, 1, 64).harmony).not.toBe(arrangementMix(1, 1, 0).harmony);
    expect(arrangementMix(1, 1, 0).tension).toBe(0);
    expect(arrangementMix(0, 0.1, 0).tension).toBeGreaterThan(0);
  });
});

describe('each tradition’s patterns', () => {
  const drum = (id: string, sample: string) => STYLES[id].perc.find((v) => v.sample === sample)!.pattern;

  it('compound meters count beats in threes (6/8, 12/8)', () => {
    for (const id of ['mexico', 'iran', 'nigeria', 'mali']) expect(STYLES[id].meter.sub).toBe(3);
    expect(STYLES.nigeria.meter.beats * STYLES.nigeria.meter.sub).toBe(12);
  });

  it('Nigeria keeps the standard bell pattern; Egypt the maqsum', () => {
    expect(drum('nigeria', 'agogoHigh').replace(/X/g, 'x')).toBe('x.x.xx.x.x.x');
    expect(drum('egypt', 'darbukaLow')).toBe('X.......X.......'); // dum on 1 and 3
    expect(drum('egypt', 'darbukaHigh')).toBe('..X...X.....X...'); // tek tek … tek
  });

  it('India plays teental: sixteen beats, the khali quarter without the bass drum', () => {
    const bayan = drum('india', 'congaLow').split('|');
    expect(bayan).toHaveLength(4);
    expect(bayan[2]).toBe('................');
    expect(bayan[0][0]).toBe('X'); // sam
  });

  it('Cambodia elaborates its core melody in running eighths, with the core underneath', () => {
    const c = CULTURES.find((c) => c.id === 'cambodia')!, score = composeScore(c.sound, c.id);
    const lead = [...score.notes.values()].flat().filter((n) => n.layer === 'lead');
    expect(lead.every((n) => n.steps === 2)).toBe(true);
    expect(STYLES.cambodia.counters[0].mode).toBe('core');
  });

  it('drone traditions hold one harmony throughout', () => {
    for (const id of ['egypt', 'india', 'iran']) {
      const { A, B } = STYLES[id].harmony;
      expect(new Set([...A, ...B])).toEqual(new Set([0]));
    }
  });

  it('finds a fifth using intervals rather than assuming a seven-note scale', () => {
    expect(fifthDegree(MENU_PROFILE)).toBe(3);
    expect(fifthDegree(CULTURES[0].sound)).toBe(4);
  });
});
