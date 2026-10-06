import { describe, expect, it } from 'vitest';
import { RunState } from '../src/systems/runState';
import { curatorTitle, dailyFor, isUnlocked, todayKey } from '../src/systems/save';

describe('RunState', () => {
  it('rewards correct treatment, combos and documentation', () => {
    const s = new RunState({ penalty: 0.1 });
    s.spawn(); s.spawn();
    expect(s.treat('salts', 'poultice')).toBe('restored');
    expect(s.treat('grime', 'brush', { documented: true })).toBe('restored');
    expect(s.combo).toBe(2);
    expect(s.documented).toBe(1);
    expect(s.score).toBe(110 + 120 + 50);
    expect(s.restoration).toBe(1);
    expect(s.stars).toBe(3);
  });

  it('wrong tools and misses damage the artifact and break the combo', () => {
    const s = new RunState({ penalty: 0.25 });
    s.spawn(); s.treat('grime', 'brush');
    expect(s.treat('crack', 'brush')).toBe('wrongTool');
    expect(s.combo).toBe(0);
    expect(s.integrity).toBeCloseTo(0.75);
    s.miss();
    expect(s.integrity).toBeCloseTo(0.625);
  });

  it('fails at zero integrity and gives no stars', () => {
    const s = new RunState({ penalty: 0.6 });
    s.spawn(); s.treat('grime', 'brush');
    s.treat('crack', 'brush');
    s.treat('crack', 'brush');
    expect(s.failed).toBe(true);
    expect(s.stars).toBe(0);
  });

  it('restoration is 0 before anything spawns (no divide by zero)', () => {
    expect(new RunState({ penalty: 0.1 }).restoration).toBe(0);
  });
});

describe('RunState rules', () => {
  it('perfect timing multiplies the points', () => {
    const s = new RunState({ penalty: 0.1 });
    s.spawn();
    s.treat('grime', 'brush', { perfect: true });
    expect(s.score).toBe(Math.round(110 * 1.5));
    expect(s.perfects).toBe(1);
  });

  it('fragile spots double both reward and damage', () => {
    const s = new RunState({ penalty: 0.1 });
    s.treat('grime', 'brush', { fragile: true });
    expect(s.score).toBe(220);
    s.treat('crack', 'brush', { fragile: true });
    expect(s.integrity).toBeCloseTo(0.8);
  });

  it('chill mode never damages the artifact but still breaks the combo', () => {
    const s = new RunState({ penalty: 0.5, chill: true });
    s.treat('grime', 'brush');
    s.treat('crack', 'brush');
    s.miss();
    expect(s.integrity).toBe(1);
    expect(s.combo).toBe(0);
    expect(s.failed).toBe(false);
  });

  it('bonus and setback adjust score and integrity', () => {
    const s = new RunState({ penalty: 0.1 });
    s.bonus(75);
    s.setback(0.25);
    expect(s.score).toBe(75);
    expect(s.integrity).toBeCloseTo(0.75);
  });
});

describe('unlocks', () => {
  it('unlocks in order, through all released cultures', () => {
    expect(isUnlocked({ stars: {} }, 0)).toBe(true);
    expect(isUnlocked({ stars: {} }, 1)).toBe(false);
    expect(isUnlocked({ stars: { mexico: 1 } }, 1)).toBe(true);
    const all = { stars: { mexico: 3, portugal: 3, china: 3, egypt: 3, greece: 3, peru: 3 } };
    expect(isUnlocked(all, 6)).toBe(true);
    expect(isUnlocked(all, 7)).toBe(false);
    expect(isUnlocked(all, 12)).toBe(false); // past the end
  });
});

describe('save helpers', () => {
  it('curator title climbs with stars', () => {
    expect(curatorTitle(0)).toEqual({ title: 'Volunteer', next: 6 });
    expect(curatorTitle(15).title).toBe('Conservator');
    expect(curatorTitle(36)).toEqual({ title: 'Chief Curator', next: null });
  });

  it('daily challenge is the same for everyone on a date and changes between days', () => {
    expect(dailyFor('2026-10-06')).toEqual(dailyFor('2026-10-06'));
    const days = ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((d) => dailyFor(d).seed);
    expect(new Set(days).size).toBe(4);
    expect(dailyFor('2026-10-06').index).toBeLessThan(12);
  });

  it('formats today as YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
