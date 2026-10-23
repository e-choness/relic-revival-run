import { defineConfig } from 'vite';
import { workshopPlugin } from './tools/workshop/plugin.ts';

// Relative base so the same build works on itch.io (served from a subpath) and in Electron (file://).
// The avatar workshop (tools/workshop) is dev-only: it is not a build input and its plugin only runs in serve mode.
export default defineConfig({
  base: './',
  // Phaser alone is ~1.2 MB minified (~350 kB gzipped); warn only if the bundle grows well past it.
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
  plugins: [workshopPlugin()],
  // Lets the containerised browser used for playtesting reach the dev server.
  // Polling: file events don't cross the Windows → Docker bind mount.
  server: { allowedHosts: ['host.docker.internal'], watch: { usePolling: true, interval: 300 } },
  preview: { allowedHosts: ['host.docker.internal'] },
});
