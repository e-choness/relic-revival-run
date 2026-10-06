import { defineConfig } from 'vite';

// Relative base so the same build works on itch.io (served from a subpath) and in Electron (file://).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
