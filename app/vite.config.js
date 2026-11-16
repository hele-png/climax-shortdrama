import { defineConfig } from 'vite';
// base './' => funciona en cualquier subruta (GitHub Pages, Netlify, etc.)
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
