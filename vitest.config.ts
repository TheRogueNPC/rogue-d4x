import { defineConfig } from 'vitest/config';

// Test runner config for the deterministic D4X simulation core.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
