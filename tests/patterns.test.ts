import { describe, expect, it } from 'vitest';
import { DAMAGES } from '../src/data/conservation';
import { CULTURES } from '../src/data/cultures';
import { rng } from '../src/audio/music';
import { PatternSpawner } from '../src/systems/patterns';

const spawner = (index: number, seed = 1, pairs = false) =>
  new PatternSpawner({ damages: CULTURES[index].damages, lanes: index < 2 ? 3 : 4, level: index, rng: rng(seed), pairs });

describe('pattern spawner', () => {
  it('introduces each visible damage type three times on the ground lane before mixing', () => {
    const s = spawner(0);
    const first = Array.from({ length: 9 }, () => s.next());
    const visible = CULTURES[0].damages;
    visible.forEach((d, i) => first.slice(i * 3, i * 3 + 3).forEach((e) => expect(e).toMatchObject({ damage: d, lane: 0 })));
  });

  it('never introduces hidden damage, but still uses it later', () => {
    const egypt = CULTURES.findIndex((c) => c.id === 'egypt');
    const s = spawner(egypt, 7);
    const events = Array.from({ length: 200 }, () => s.next());
    const intro = events.slice(0, 9);
    expect(intro.some((e) => DAMAGES[e.damage].hiddenUntilUV)).toBe(false);
    expect(events.some((e) => DAMAGES[e.damage].hiddenUntilUV)).toBe(true);
  });

  it('keeps lanes in range and gaps positive', () => {
    for (let i = 0; i < CULTURES.length; i++) {
      const s = spawner(i, 3);
      for (let k = 0; k < 150; k++) {
        const e = s.next();
        expect(e.lane).toBeGreaterThanOrEqual(0);
        expect(e.lane).toBeLessThan(i < 2 ? 3 : 4);
        expect(e.gap).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for a seed (daily runs)', () => {
    const a = spawner(5, 42), b = spawner(5, 42);
    for (let k = 0; k < 50; k++) expect(a.next()).toEqual(b.next());
  });

  it('pairs mode answers every spot with the same damage', () => {
    const s = spawner(9, 2, true);
    for (let k = 0; k < 20; k++) expect(s.next().damage).toBe(s.next().damage);
  });
});
