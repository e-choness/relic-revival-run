import { defineConfig } from 'vite';

// Relative base so the same build works on itch.io (served from a subpath) and in Electron (file://).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  // Lets the containerised browser used for playtesting reach the dev server.
  // Polling: file events don't cross the Windows → Docker bind mount.
  server: { allowedHosts: ['host.docker.internal'], watch: { usePolling: true, interval: 300 } },
});
