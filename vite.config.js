import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Custom domain (movieboyz.marcus-hill.com) → base is /
  base: '/',

  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        draft: resolve(__dirname, '2026.html'),
      },
      // Suppress "use of eval / global variable" warnings for CDN UMD globals
      // (Chart, Tabulator, bootstrap) loaded via <script src> in index.html
      onwarn(warning, warn) {
        if (warning.code === 'MISSING_GLOBAL_NAME') return;
        warn(warning);
      },
    },
  },
});
