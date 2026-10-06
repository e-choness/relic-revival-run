import { describe, expect, it } from 'vitest';
import { DAMAGES, TOOLS, isCorrectTool, toolsFor } from '../src/data/conservation';
import { CULTURES, V1_CULTURES } from '../src/data/cultures';
import { difficultyFor } from '../src/systems/difficulty';

describe('conservation rules', () => {
  it('every damage is treated by a real treatment tool', () => {
    for (const d of Object.values(DAMAGES)) expect(TOOLS[d.treatedBy]).toBeDefined();
  });

  it('matches tools by rule, not position', () => {
    expect(isCorrectTool('salts', 'poultice')).toBe(true);
    expect(isCorrectTool('insects', 'anoxia')).toBe(true);
    expect(isCorrectTool('crack', 'brush')).toBe(false);
    expect(isCorrectTool('oldRepair', 'uvLamp')).toBe(false);
  });
});

describe('cultures', () => {
  it('has 12 cultures, 6 in v1, unique ids', () => {
    expect(CULTURES).toHaveLength(12);
    expect(V1_CULTURES).toHaveLength(6);
    expect(new Set(CULTURES.map((c) => c.id)).size).toBe(12);
  });

  it('tool count never decreases by more than one between levels and starts at 3', () => {
    const counts = CULTURES.map((c) => toolsFor(c.damages).length);
    expect(counts[0]).toBe(3);
    counts.slice(1).forEach((n, i) => expect(n).toBeGreaterThanOrEqual(counts[i] - 1));
  });

  it('UV-hidden damage only appears from level 4 on', () => {
    CULTURES.slice(0, 3).forEach((c) => expect(c.damages.some((d) => DAMAGES[d].hiddenUntilUV)).toBe(false));
  });
});

describe('difficulty', () => {
  it('ramps monotonically', () => {
    for (let i = 1; i < 12; i++) {
      const a = difficultyFor(i - 1), b = difficultyFor(i);
      expect(b.scrollSpeed).toBeGreaterThanOrEqual(a.scrollSpeed);
      expect(b.spawnInterval).toBeLessThanOrEqual(a.spawnInterval);
    }
  });
});
