import { defineConfig } from 'vite';
import tauri from './src-tauri/plugins/vite-plugin-tauri';

export default defineConfig({
  root: 'src/frontend',
  plugins: [tauri()],
  clearScreen: false,
  server: {
    open: false,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
