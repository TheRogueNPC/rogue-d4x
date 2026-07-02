import { defineConfig } from 'vite';
import tauri from './src-tauri/plugins/vite-plugin-tauri';

export default defineConfig({
  plugins: [tauri()],
  clearScreen: false,
  server: {
    open: false,
  },
});
