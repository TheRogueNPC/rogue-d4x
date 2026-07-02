import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/frontend',
  clearScreen: false,
  server: {
    open: true,
  },
  build: {
    outDir: '../dist-browser',
    emptyOutDir: true,
  },
});
