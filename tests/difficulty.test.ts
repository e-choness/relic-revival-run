import { describe, expect, it } from 'vitest';
import { CULTURES } from '../src/data/cultures';
import { rng } from '../src/audio/music';
import { difficultyFor, spacingBeats } from '../src/systems/difficulty';
import { PatternSpawner } from '../src/systems/patterns';
import { RunState } from '../src/systems/runState';

describe('playable pacing', () => {
  it('reserves landing time for steep descents, including thin air', () => {
    expect(spacingBeats(3, 0, 0.5, 1, 0.5) * 0.5).toBeGreaterThanOrEqual(1.31);
    expect(spacingBeats(3, 0, 0.5, 1, 0.5, true) * 0.5).toBeGreaterThanOrEqual(1.31 * 1.35);
    expect(spacingBeats(0, 0, 2, 3, 0.5)).toBe(6); // preserve authored breathers
  });

  it('keeps tool switches readable across every culture and its fastest tempo', () => {
    CULTURES.forEach((culture, level) => {
      const diff = difficultyFor(level);
      const beat = 60 / culture.sound.tempo;
      const fastest = beat / (culture.twist === 'crescendo' ? 1.3 : 1);
      const slots = Math.max(1, Math.round(diff.spawnInterval / beat));
      const patterns = new PatternSpawner({ damages: culture.damages, lanes: diff.lanes, level, rng: rng(42), pairs: culture.twist === 'pairs' });
      let previous = patterns.next();
      for (let i = 0; i < 200; i++) {
        const next = patterns.next();
        const spacing = spacingBeats(previous.lane, next.lane, previous.gap, slots, fastest, culture.twist === 'thinAir');
        expect(spacing * fastest).toBeGreaterThanOrEqual(0.5);
        expect(spacing * 2).toBe(Math.floor(spacing * 2));
        previous = next;
      }
    });
  });

  it('lets an 80% accurate player survive each seeded run with mixed mistakes', () => {
    CULTURES.forEach((culture, level) => {
      const diff = difficultyFor(level);
      const state = new RunState({ penalty: diff.mistakePenalty });
      const beat = 60 / culture.sound.tempo;
      const fastest = beat / (culture.twist === 'crescendo' ? 1.3 : 1);
      const slots = Math.max(1, Math.round(diff.spawnInterval / beat));
      const patterns = new PatternSpawner({ damages: culture.damages, lanes: diff.lanes, level, rng: rng(17), pairs: culture.twist === 'pairs' });
      let previous = patterns.next(), elapsed = 0, count = 0;
      while (elapsed < diff.duration) {
        state.spawn();
        if (count % 10 === 4) state.miss();
        else if (count % 10 === 9) state.treat('crack', 'brush', { fragile: culture.twist === 'fragile' });
        else state.treat('grime', 'brush');
        const next = patterns.next();
        elapsed += spacingBeats(previous.lane, next.lane, previous.gap, slots, fastest, culture.twist === 'thinAir') * fastest;
        previous = next;
        count++;
      }
      expect(state.failed, culture.id).toBe(false);
      expect(state.stars, culture.id).toBeGreaterThanOrEqual(2);
    });
  });
});
