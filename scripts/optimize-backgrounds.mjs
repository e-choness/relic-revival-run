import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Format conversion only: preserve the generated PNG masters and ship compact WebP.
const manifest = JSON.parse(readFileSync('art/backgrounds/parallax-art-direction.json', 'utf8'));
mkdirSync('public/assets/backgrounds', { recursive: true });
let sourceBytes = 0, outputBytes = 0;
for (const asset of manifest.assets) {
  const source = asset.source;
  const output = asset.file;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-c:v', 'libwebp', '-quality', '88', '-compression_level', '6', output]);
  sourceBytes += statSync(source).size;
  outputBytes += statSync(output).size;
}
console.log(`${manifest.assets.length} landscapes: ${(sourceBytes / 1e6).toFixed(1)} MB PNG → ${(outputBytes / 1e6).toFixed(1)} MB WebP`);
