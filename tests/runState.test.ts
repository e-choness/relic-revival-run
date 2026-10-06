import { describe, expect, it } from 'vitest';
import { RunState } from '../src/systems/runState';
import { isUnlocked } from '../src/systems/save';

describe('RunState', () => {
  it('rewards correct treatment, combos and documentation', () => {
    const s = new RunState(0.1);
    s.spawn(); s.spawn();
    expect(s.treat('salts', 'poultice', false)).toBe('restored');
    expect(s.treat('grime', 'brush', true)).toBe('restored');
    expect(s.combo).toBe(2);
    expect(s.documented).toBe(1);
    expect(s.score).toBe(110 + 120 + 50);
    expect(s.restoration).toBe(1);
    expect(s.stars).toBe(3);
  });

  it('wrong tools and misses damage the artifact and break the combo', () => {
    const s = new RunState(0.25);
    s.spawn(); s.treat('grime', 'brush', false);
    expect(s.treat('crack', 'brush', false)).toBe('wrongTool');
    expect(s.combo).toBe(0);
    expect(s.integrity).toBeCloseTo(0.75);
    s.miss();
    expect(s.integrity).toBeCloseTo(0.625);
  });

  it('fails at zero integrity and gives no stars', () => {
    const s = new RunState(0.6);
    s.spawn(); s.treat('grime', 'brush', false);
    s.treat('crack', 'brush', false);
    s.treat('crack', 'brush', false);
    expect(s.failed).toBe(true);
    expect(s.stars).toBe(0);
  });

  it('restoration is 0 before anything spawns (no divide by zero)', () => {
    expect(new RunState(0.1).restoration).toBe(0);
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
