import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CULTURES } from '../src/data/cultures';

describe('museum artifact assets', () => {
  it('ships an optimized WebP for every exhibit', () => {
    for (const c of CULTURES) {
      // Same path as artifactFile() in src/ui/artifacts.ts, served from public/.
      const image = readFileSync(`public/assets/artifacts/${c.id}-v1.webp`);
      expect(image.subarray(8, 12).toString()).toBe('WEBP');
      expect(image.length).toBeLessThan(400_000);
    }
  });
});
