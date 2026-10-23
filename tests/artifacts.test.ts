import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { CULTURES } from '../src/data/cultures';

describe('museum artifact assets', () => {
  it('ships a documented master and optimized WebP for every exhibit', () => {
    const manifest = JSON.parse(readFileSync('art/artifacts/art-direction.json', 'utf8'));
    expect(manifest.assets.map((a: { id: string }) => a.id)).toEqual(CULTURES.map(c => c.id));
    for (const asset of manifest.assets) {
      expect(asset.prompt).toContain('Subject:');
      expect(statSync(asset.source).size).toBeGreaterThan(100_000);
      const image = readFileSync(asset.file);
      expect(image.subarray(8, 12).toString()).toBe('WEBP');
      expect(image.length).toBeLessThan(400_000);
    }
  });
});
