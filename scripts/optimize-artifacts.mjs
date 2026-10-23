import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Format conversion only. Keep full-resolution generated masters and prompts in art/artifacts.
const { assets } = JSON.parse(readFileSync('art/artifacts/art-direction.json', 'utf8'));
mkdirSync('public/assets/artifacts', { recursive: true });
let total = 0;
for (const asset of assets) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', asset.source,
    '-vf', 'scale=1024:-2', '-c:v', 'libwebp', '-quality', '87', '-compression_level', '6', asset.file]);
  total += statSync(asset.file).size;
}
console.log(`${assets.length} artifact illustrations: ${(total / 1e6).toFixed(2)} MB runtime WebP`);
