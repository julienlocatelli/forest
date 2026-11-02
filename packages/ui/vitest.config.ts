import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // happy-dom resolves CSS custom properties, so tests see the theme's real colors.
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
