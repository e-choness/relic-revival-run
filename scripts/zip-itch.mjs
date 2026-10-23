// Zips dist/ into an itch.io HTML5 upload (index.html at the zip root).
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('release', { recursive: true });
execSync('cd dist && zip -qr ../release/relic-revival-run-web.zip .', { stdio: 'inherit' });
console.log('Wrote release/relic-revival-run-web.zip');
